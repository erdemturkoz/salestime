/**
 * computeOffer — hediye fiyatı ve hediyeIndirimi testleri (Task #15)
 *
 * Toggle kapalı → hediyeler fiyata eklenir ama indirilmez (müşteriye maliyeti var).
 * Toggle açık  → hediyeler önce eklenir, ardından hediyeEdildi ile düşülür → net 0 etki.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { computeOffer } from "../client/src/hooks/useOfferCalculator";

// ─── Sabit test verisi ───────────────────────────────────────────────────────

const KAMPANYA = {
  id: "99",
  kampanyaAdi: "Test Kampanya",
  egitimTipi: "Genel İngilizce",
  kurSayisi: 4,
  toplamDersSaati: 40,
  listeFiyati: 100_000,
  nakitFiyati: 65_000,
  faizOrani: 0,
  kitapFiyati: 1_000,
  kitapSetSayisi: 1,
  maxKrediKartiTaksit: 6,
  maxSenetTaksit: 6,
  hediyeler: [
    { isim: "Türkçe Seti", fiyat: 5_000 },
    { isim: "Online Paket", fiyat: 10_000 },
  ],
};

// nakitFiyati=65_000, kitap=1_000, hediyeler toplam=15_000
// → genelToplam (ham) = 65_000 + 1_000 + 15_000 = 81_000

const FORM = {
  egitimTipi: "Genel İngilizce",
  kampanyaId: "99",
  kurSayisi: 4,
  toplamDersSaati: 40,
  odemeTipi: "nakit" as const,
  taksitSayisi: 1,
  pesinat: 0,
  kitapDahil: true,
  mudurIndirimTipi: "yuzde" as const,
  mudurIndirimDegeri: 0,
  gecerlilikGunu: 2,
};

// ─── Testler ─────────────────────────────────────────────────────────────────

test("hediyeEdildi boşken hediyeIndirimi sıfır; hediyelerToplam doğru döner", () => {
  const result = computeOffer(FORM, KAMPANYA, { id: "t1", title: "Teklif 1" });

  assert.equal(result.hediyelerToplam, 15_000, "hediyelerToplam kampanya hediye fiyatlarının toplamı olmalı");
  assert.equal(result.hediyeIndirimi, 0, "hiçbir hediye işaretlenmediğinde indirim sıfır olmalı");
  // ozelFiyat = 65_000 + 1_000 + 15_000 − 0 = 81_000
  assert.equal(result.ozelFiyat, 81_000, "hediyeEdildi boşken hediyeler fiyata dahil kalmalı");
});

test("tumHediyelerUcretsiz açıkken hediyeIndirimi hediye toplamına eşit; nihai fiyat düşer", () => {
  const result = computeOffer(
    FORM,
    KAMPANYA,
    { id: "t1", title: "Teklif 1", hediyeEdildi: { "Türkçe Seti": true, "Online Paket": true } },
  );

  assert.equal(result.hediyeIndirimi, 15_000, "tüm hediyeler işaretlendiğinde hediyeIndirimi = hediyelerToplam");
  assert.equal(result.hediyelerToplam, 15_000);
  // ozelFiyat = 65_000 + 1_000 + 15_000 − 15_000 = 66_000
  assert.equal(result.ozelFiyat, 66_000, "nihai fiyat yalnızca nakit + kitap içermeli");
});

test("hediyeEdildi kısmen true iken yalnızca işaretli hediyeler düşülür", () => {
  const result = computeOffer(
    FORM,
    KAMPANYA,
    { id: "t1", title: "Teklif 1", hediyeEdildi: { "Türkçe Seti": true } },
  );

  assert.equal(result.hediyeIndirimi, 5_000, "yalnızca 'Türkçe Seti' indirilmeli");
  // ozelFiyat = 65_000 + 1_000 + 15_000 − 5_000 = 76_000
  assert.equal(result.ozelFiyat, 76_000);
});

test("hediyesiz kampanyada hediyelerToplam ve hediyeIndirimi sıfır", () => {
  const kampanyaSade = { ...KAMPANYA, hediyeler: [] };
  const result = computeOffer(FORM, kampanyaSade, { id: "t1", title: "Teklif 1" });

  assert.equal(result.hediyelerToplam, 0);
  assert.equal(result.hediyeIndirimi, 0);
  // ozelFiyat = 65_000 + 1_000 = 66_000
  assert.equal(result.ozelFiyat, 66_000);
});

test("toggle açık/kapalı fark: toggle açıkken ozelFiyat hediye tutarı kadar düşer", () => {
  const kapali = computeOffer(FORM, KAMPANYA, { id: "t1", title: "T1" });
  const acik = computeOffer(
    FORM,
    KAMPANYA,
    { id: "t1", title: "T1", hediyeEdildi: { "Türkçe Seti": true, "Online Paket": true } },
  );

  const fark = kapali.ozelFiyat - acik.ozelFiyat;
  assert.equal(fark, 15_000, "toggle açıldığında fiyat tam hediye toplamı kadar düşmeli");
});
