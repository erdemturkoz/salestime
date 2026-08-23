export const API_BASE = "https://salestime.onrender.com";
export const EXTENSION_ID = "olilhnenhdhjcdbdgcejhimpndflbele";
export const POLL_ALARM = "salestime-poll";

export const DEFAULT_STATE = Object.freeze({
  grant: null,
  gonderimId: null,
  subeId: null,
  expiresAt: null,
  enabled: false,
  paused: false,
  busy: false,
  status: "Eşleştirme bekleniyor",
  current: null,
  sentCount: 0,
  errorCount: 0,
  lastError: null,
  history: {},
  whatsappTabId: null
});

export function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = `90${digits.slice(1)}`;
  if (digits.length === 10) digits = `90${digits}`;
  return digits;
}

export function validPairingCode(value) {
  return /^[A-Za-z0-9_-]{43}$/.test(String(value || "").trim());
}

export function authHeader(grant) {
  return `Extension-Grant ${grant}`;
}

export function isExpired(expiresAt, now = Date.now()) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= now + 30_000;
}

export function randomDelay(min = 8_000, max = 12_000, random = Math.random) {
  return Math.floor(min + random() * (max - min + 1));
}

export function safeError(value, fallback = "Bilinmeyen hata") {
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 500);
  if (value?.message) return String(value.message).slice(0, 500);
  return fallback;
}

export function historyKey(teklif) {
  return teklif?.idempotencyKey || `toplu-teklif-${teklif?.id || "bilinmeyen"}`;
}

export function maySend(historyEntry) {
  return !historyEntry;
}

export function requiresManualResolution(historyEntry) {
  return historyEntry?.status === "sending";
}

export function shouldOnlyReport(historyEntry) {
  return historyEntry?.status === "sent_unreported";
}
