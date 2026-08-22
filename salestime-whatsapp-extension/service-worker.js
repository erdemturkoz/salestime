import {
  API_BASE, DEFAULT_STATE, POLL_ALARM, authHeader, historyKey, isExpired,
  maySend, normalizePhone, randomDelay, requiresManualResolution, safeError,
  shouldOnlyReport, validPairingCode
} from "./core.js";

const STORAGE_KEY = "salesTimeState";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadState() {
  const saved = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] || {};
  return { ...DEFAULT_STATE, ...saved, history: { ...DEFAULT_STATE.history, ...(saved.history || {}) } };
}

async function saveState(patch) {
  const state = { ...(await loadState()), ...patch };
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  chrome.runtime.sendMessage({ type: "STATE_CHANGED", state }).catch(() => {});
  return state;
}

async function api(path, options = {}, stateOverride) {
  const state = stateOverride || await loadState();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.grant) headers.Authorization = authHeader(state.grant);
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "omit",
    cache: "no-store",
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!response.ok) {
    const error = new Error(body.message || body.error || `API ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function pair(pairingCode) {
  const code = String(pairingCode || "").trim();
  if (!validPairingCode(code)) throw new Error("Eşleştirme kodu 43 karakter olmalıdır.");
  const data = await api("/api/toplu-eklenti-eslestirmeleri/exchange", {
    method: "POST", body: JSON.stringify({ pairingCode: code })
  }, { ...DEFAULT_STATE, grant: null });
  await chrome.alarms.create(POLL_ALARM, { periodInMinutes: 0.5 });
  const state = await saveState({
    grant: data.extensionGrant,
    gonderimId: data.gonderimId,
    subeId: data.subeId,
    expiresAt: data.expiresAt,
    enabled: true,
    paused: false,
    status: "Eşleştirildi — kuyruk bekleniyor",
    lastError: null,
    current: null
  });
  setTimeout(() => void poll(), 0);
  return state;
}

async function findWhatsAppTab() {
  const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
  return tabs[0] || null;
}

async function ensureWhatsAppTab(state) {
  let tab = state.whatsappTabId ? await chrome.tabs.get(state.whatsappTabId).catch(() => null) : null;
  if (!tab) tab = await findWhatsAppTab();
  if (!tab) tab = await chrome.tabs.create({ url: "https://web.whatsapp.com/", active: true });
  await saveState({ whatsappTabId: tab.id });
  return tab;
}

async function sendToWhatsApp(tabId, teklif) {
  const phone = normalizePhone(teklif.ogrenciTelefon);
  if (phone.length < 10) throw new Error("Telefon numarası geçersiz.");
  const url = `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(teklif.mesaj)}`;
  await chrome.tabs.update(tabId, { url, active: true });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await sleep(1500);
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "SEND_SALESTIME_MESSAGE", message: teklif.mesaj
      });
      if (response?.ok) return response;
      if (response?.fatal) throw new Error(response.error);
    } catch (error) {
      if (/Telefon|geçersiz|WhatsApp hesabı/i.test(error?.message || "")) throw error;
    }
  }
  throw new Error("WhatsApp Web hazır olmadı. Oturumun açık olduğunu kontrol edin.");
}

async function reportResult(state, current, durum, hataMesaji) {
  const body = { durum, claimToken: current.claimToken };
  if (hataMesaji) body.hataMesaji = safeError(hataMesaji);
  return api(`/api/toplu-teklifler/${current.teklif.id}/sonuc`, {
    method: "PATCH", body: JSON.stringify(body)
  }, state);
}

async function processCurrent(state) {
  const current = state.current;
  const key = historyKey({ ...current.teklif, idempotencyKey: current.idempotencyKey });
  const entry = state.history[key];

  if (requiresManualResolution(entry)) {
    await saveState({ paused: true, status: "Manuel kontrol gerekli", lastError: "Gönderim sırasında Chrome kapanmış olabilir. Mesajı kontrol edip sonucu seçin." });
    return;
  }

  if (shouldOnlyReport(entry)) {
    await reportResult(state, current, "gonderildi");
    const history = { ...state.history, [key]: { ...entry, status: "reported", reportedAt: new Date().toISOString() } };
    await saveState({ history, current: null, sentCount: state.sentCount + 1, status: "Gönderildi — sıradaki bekleniyor" });
    return;
  }

  if (!maySend(entry)) {
    await saveState({ paused: true, status: "Tekrar gönderim engellendi", lastError: `${key} daha önce işlendi.` });
    return;
  }

  await api(`/api/toplu-teklifler/${current.teklif.id}/kuyruk/heartbeat`, {
    method: "PATCH", body: JSON.stringify({ claimToken: current.claimToken })
  }, state);

  let history = { ...state.history, [key]: {
    status: "sending", teklifId: current.teklif.id, claimToken: current.claimToken,
    startedAt: new Date().toISOString(), candidate: current.teklif.ogrenciAdi
  } };
  state = await saveState({ history, status: `${current.teklif.ogrenciAdi} gönderiliyor` });

  try {
    const tab = await ensureWhatsAppTab(state);
    await sendToWhatsApp(tab.id, current.teklif);
    history = { ...state.history, [key]: { ...history[key], status: "sent_unreported", sentAt: new Date().toISOString() } };
    state = await saveState({ history, status: "Mesaj gönderildi — SalesTime'a bildiriliyor" });
    await reportResult(state, current, "gonderildi");
    history = { ...state.history, [key]: { ...history[key], status: "reported", reportedAt: new Date().toISOString() } };
    await saveState({ history, current: null, sentCount: state.sentCount + 1, status: "Gönderildi — sıradaki bekleniyor", lastError: null });
    await sleep(randomDelay());
  } catch (error) {
    const message = safeError(error);
    history = { ...state.history, [key]: { ...history[key], status: "failed", error: message, failedAt: new Date().toISOString() } };
    try { await reportResult(state, current, "hata", message); } catch (reportError) {
      history[key].reportError = safeError(reportError);
    }
    await saveState({ history, current: null, errorCount: state.errorCount + 1, status: "Gönderim hatası", lastError: message });
  }
}

async function poll() {
  let state = await loadState();
  if (!state.enabled || state.paused || state.busy || !state.grant) return;
  if (isExpired(state.expiresAt)) {
    await saveState({ enabled: false, status: "Eşleştirme süresi doldu", lastError: "SalesTime'dan yeni eşleştirme kodu alın." });
    return;
  }
  await saveState({ busy: true });
  try {
    state = await loadState();
    if (state.current) return await processCurrent(state);
    const data = await api(`/api/toplu-gonderimler/${state.gonderimId}/kuyruk/siradaki`, {}, state);
    if (!data?.teklif) {
      await saveState({ status: "Kuyruk boş veya gönderim henüz başlatılmadı" });
      return;
    }
    const current = {
      teklif: data.teklif,
      claimToken: data.claimToken,
      idempotencyKey: data.idempotencyKey,
      leaseExpiresAt: data.leaseExpiresAt
    };
    state = await saveState({ current, status: `${data.teklif.ogrenciAdi} sıraya alındı` });
    await processCurrent(state);
  } catch (error) {
    const status = error.status;
    if (status === 401) await saveState({ enabled: false, status: "Eşleştirme geçersiz", lastError: "SalesTime'dan yeni kodla eşleştirin." });
    else if (status === 409 || status === 404) await saveState({ status: "SalesTime'da Başlat düğmesi bekleniyor", lastError: null });
    else await saveState({ status: "Bağlantı bekleniyor", lastError: safeError(error) });
  } finally {
    await saveState({ busy: false });
  }
}

async function resolveAmbiguous(durum) {
  let state = await loadState();
  if (!state.current) throw new Error("Çözülecek belirsiz gönderim yok.");
  const key = historyKey({ ...state.current.teklif, idempotencyKey: state.current.idempotencyKey });
  const entry = state.history[key];
  if (!requiresManualResolution(entry)) throw new Error("Bu kayıt manuel çözüm beklemiyor.");
  await reportResult(state, state.current, durum, durum === "hata" ? "Kullanıcı WhatsApp Web üzerinden gönderilmedi olarak işaretledi." : undefined);
  const history = { ...state.history, [key]: { ...entry, status: durum === "gonderildi" ? "reported" : "failed", resolvedAt: new Date().toISOString() } };
  await saveState({ history, current: null, paused: false, status: "Manuel kontrol tamamlandı", sentCount: state.sentCount + (durum === "gonderildi" ? 1 : 0), errorCount: state.errorCount + (durum === "hata" ? 1 : 0) });
  poll();
}

chrome.runtime.onInstalled.addListener(async () => {
  const state = await loadState();
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  await chrome.alarms.create(POLL_ALARM, { periodInMinutes: 0.5 });
});
chrome.runtime.onStartup.addListener(() => chrome.alarms.create(POLL_ALARM, { periodInMinutes: 0.5 }));
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === POLL_ALARM) poll(); });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === "GET_STATE") return loadState();
    if (message.type === "PAIR") return pair(message.pairingCode);
    if (message.type === "PAUSE") return saveState({ paused: true, status: "Eklenti duraklatıldı" });
    if (message.type === "RESUME") { const s = await saveState({ paused: false, enabled: true, status: "Devam ediyor", lastError: null }); poll(); return s; }
    if (message.type === "DISCONNECT") return saveState({ ...DEFAULT_STATE, history: (await loadState()).history });
    if (message.type === "OPEN_WHATSAPP") return ensureWhatsAppTab(await loadState());
    if (message.type === "RESOLVE_AMBIGUOUS") return resolveAmbiguous(message.durum);
    throw new Error("Bilinmeyen işlem.");
  })().then((data) => sendResponse({ ok: true, data })).catch((error) => sendResponse({ ok: false, error: safeError(error) }));
  return true;
});
