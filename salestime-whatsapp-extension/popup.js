const $ = (id) => document.getElementById(id);
const request = (message) => new Promise((resolve, reject) => {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
    if (!response?.ok) return reject(new Error(response?.error || "İşlem başarısız"));
    resolve(response.data);
  });
});

function showError(message) {
  $("errorBox").textContent = message;
  $("errorBox").hidden = !message;
}

function render(state) {
  const paired = Boolean(state.grant);
  $("pairSection").hidden = paired;
  $("dashboard").hidden = !paired;
  if (!paired) return;
  $("statusText").textContent = state.status || "Hazır";
  $("expiryText").textContent = state.expiresAt ? `Yetki: ${new Date(state.expiresAt).toLocaleString("tr-TR")}` : "";
  $("sentCount").textContent = state.sentCount || 0;
  $("errorCount").textContent = state.errorCount || 0;
  $("candidate").hidden = !state.current?.teklif;
  $("candidate").textContent = state.current?.teklif ? `Sıradaki: ${state.current.teklif.ogrenciAdi}` : "";
  showError(state.lastError);
  const key = state.current?.idempotencyKey || (state.current?.teklif?.id ? `toplu-teklif-${state.current.teklif.id}` : null);
  $("manualBox").hidden = !(key && state.history?.[key]?.status === "sending");
  $("pauseButton").textContent = state.paused ? "Devam et" : "Duraklat";
  $("statusDot").style.background = state.paused ? "#9aa3b2" : state.lastError ? "#e04b4b" : "#1ca66a";
}

async function refresh() { try { render(await request({ type: "GET_STATE" })); } catch (e) { showError(e.message); } }

$("pairButton").addEventListener("click", async () => {
  showError("");
  $("pairButton").disabled = true;
  try { render(await request({ type: "PAIR", pairingCode: $("pairingCode").value })); }
  catch (e) { showError(e.message); }
  finally { $("pairButton").disabled = false; }
});
$("whatsappButton").addEventListener("click", () => request({ type: "OPEN_WHATSAPP" }).catch((e) => showError(e.message)));
$("pauseButton").addEventListener("click", async () => {
  const state = await request({ type: "GET_STATE" });
  render(await request({ type: state.paused ? "RESUME" : "PAUSE" }));
});
$("disconnectButton").addEventListener("click", async () => { if (confirm("Eşleştirme kaldırılsın mı?")) render(await request({ type: "DISCONNECT" })); });
$("markSent").addEventListener("click", async () => render(await request({ type: "RESOLVE_AMBIGUOUS", durum: "gonderildi" })));
$("markFailed").addEventListener("click", async () => render(await request({ type: "RESOLVE_AMBIGUOUS", durum: "hata" })));
chrome.runtime.onMessage.addListener((message) => { if (message.type === "STATE_CHANGED") render(message.state); });
refresh();
