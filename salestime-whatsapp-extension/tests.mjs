import assert from "node:assert/strict";
import { authHeader, historyKey, isExpired, maySend, normalizePhone, randomDelay, requiresManualResolution, shouldOnlyReport, validPairingCode } from "./core.js";

assert.equal(normalizePhone("0532 123 45 67"), "905321234567");
assert.equal(normalizePhone("+90 532 123 45 67"), "905321234567");
assert.equal(validPairingCode("a".repeat(43)), true);
assert.equal(validPairingCode("a".repeat(42)), false);
assert.equal(authHeader("abc"), "Extension-Grant abc");
assert.equal(isExpired("2020-01-01T00:00:00Z"), true);
assert.equal(historyKey({ id: 12 }), "toplu-teklif-12");
assert.equal(maySend(undefined), true);
assert.equal(maySend({ status: "reported" }), false);
assert.equal(requiresManualResolution({ status: "sending" }), true);
assert.equal(shouldOnlyReport({ status: "sent_unreported" }), true);
assert.equal(randomDelay(10, 18, () => 0), 10);
assert.equal(randomDelay(10, 18, () => 0.999), 18);
console.log("SalesTime extension tests: OK");
