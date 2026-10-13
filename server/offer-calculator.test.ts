/**
 * computeOffer — campaign discount, gifts, commission, and exact payment plan.
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
// → general total before free-gift toggles = 65_000 + 1_000 + 15_000 = 81_000

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

// ─── Toplu Teklif toggle tam açık (hediyeEdildi + kitapHediyeEdildi) ─────────

test("Toplu Teklif toggle tam açık: hediyeEdildi + kitapHediyeEdildi → ozelFiyat = nakitFiyati", () => {
  const result = computeOffer(
    FORM,
    KAMPANYA,
    {
      id: "t1",
      title: "T1",
      hediyeEdildi: { "Türkçe Seti": true, "Online Paket": true },
      kitapHediyeEdildi: true,
    },
  );
  // ozelFiyat = 65_000 + 1_000 + 15_000 − 15_000 − 1_000 = 65_000 = nakitFiyati
  assert.equal(result.ozelFiyat, 65_000, "tüm hediyeler + kitap ücretsizken ozelFiyat = nakitFiyati olmalı");
  assert.equal(result.toplamHediyeIndirimi, 16_000, "toplamHediyeIndirimi = hediyelerToplam + kitapFiyati");
  assert.equal(result.hediyesizFiyat, 81_000, "hediyesizFiyat hediyesiz kampanya fiyatını göstermeli");
  assert.equal(result.kitapHediyeIndirimi, 1_000, "kitapHediyeIndirimi = kitapFiyati");
  assert.equal(result.indirimTutari, 35_000, "kampanya indirimi yalnızca liste ve nakit eğitim fiyatı farkı olmalı");
  assert.equal(result.indirimYuzdesi, 35);
  assert.equal(
    result.listeFiyati - result.indirimTutari,
    KAMPANYA.nakitFiyati,
    "liste fiyatı − kampanya indirimi = nakit kampanya fiyatı olmalı",
  );
});

// ─── Yeni alanlar: hediyesizFiyat, toplamHediyeIndirimi, toplamOdeme ─────────

test("hediye toggle kapalıyken: hediyesizFiyat = ozelFiyat ve toplamHediyeIndirimi sıfır", () => {
  const result = computeOffer(FORM, KAMPANYA, { id: "t1", title: "T1" });
  assert.equal(result.hediyesizFiyat, 81_000, "toggle kapalıyken hediyesizFiyat = genelToplam");
  assert.equal(result.toplamHediyeIndirimi, 0);
  assert.equal(result.kitapHediyeIndirimi, 0);
  // nakit: toplamOdeme = ozelFiyat
  assert.equal(result.toplamOdeme, result.ozelFiyat);
});

test("kredi kartı taksit: toplamOdeme peşinat ve gerçek taksit tutarlarının toplamıdır", () => {
  const krediForm = { ...FORM, odemeTipi: "kredi-karti" as const, taksitSayisi: 4 };
  const result = computeOffer(krediForm, KAMPANYA, { id: "t1", title: "T1" });
  assert.equal(
    result.toplamOdeme,
    result.pesinat + result.taksitTutarlari.reduce((sum, amount) => sum + amount, 0),
    "toplamOdeme peşinat + taksit planı olmalı",
  );
  assert.equal(result.toplamOdeme, result.ozelFiyat, "taksit yuvarlaması toplamı değiştirmemeli");
});

test("nakit kampanya indirimi liste fiyatı ile nakit kampanya fiyatı farkıdır", () => {
  const campaign = {
    ...KAMPANYA,
    listeFiyati: 65_000,
    nakitFiyati: 48_750,
    kitapFiyati: 5_000,
    hediyeler: [{ isim: "Online eğitim", fiyat: 10_000 }],
  };
  const result = computeOffer(
    { ...FORM, kitapDahil: true },
    campaign,
    {
      id: "kampanya-25",
      title: "Nakit",
      kitapHediyeEdildi: true,
      hediyeEdildi: { "Online eğitim": true },
    },
  );

  assert.equal(result.indirimTutari, 16_250);
  assert.equal(result.indirimYuzdesi, 25);
  assert.equal(result.toplamOdeme, 48_750);
});

test("senet peşinatı sonrası son taksit yuvarlama farkını tam kapatır", () => {
  const campaign = { ...KAMPANYA, nakitFiyati: 48_750, faizOrani: 60 };
  const result = computeOffer(
    {
      ...FORM,
      odemeTipi: "senet",
      taksitSayisi: 6,
      pesinat: 5_000,
      kitapDahil: false,
    },
    campaign,
    {
      id: "senet-6",
      title: "Senet",
      kitapHediyeEdildi: true,
      hediyeEdildi: { "Türkçe Seti": true, "Online Paket": true },
    },
  );

  assert.equal(result.kampanyaliFiyat, 63_375);
  assert.equal(result.pesinat, 5_000);
  assert.deepEqual(result.taksitTutarlari, [9_729, 9_729, 9_729, 9_729, 9_729, 9_730]);
  assert.equal(result.toplamOdeme, 63_375);
});

test("kredi kartı komisyonu kampanyaya göre değişir ve senet komisyonsuz kalır", () => {
  const campaign = {
    ...KAMPANYA,
    listeFiyati: 65_000,
    nakitFiyati: 48_750,
    faizOrani: 60,
    krediKartiKomisyonOrani: 10,
  };
  const form = { ...FORM, odemeTipi: "kredi-karti" as const, taksitSayisi: 4, kitapDahil: false };
  const withCommission = computeOffer(form, campaign, { id: "fee-on", title: "Komisyonlu" });
  const withoutCommission = computeOffer(
    form,
    { ...campaign, krediKartiKomisyonOrani: 0 },
    { id: "fee-off", title: "Komisyonsuz" },
  );
  const senet = computeOffer(
    { ...form, odemeTipi: "senet" },
    campaign,
    { id: "senet", title: "Senet" },
  );

  assert.equal(withCommission.kampanyaliFiyat, 64_350);
  assert.equal(withCommission.krediKartiKomisyonTutari, 4_875);
  assert.equal(withCommission.taksitFaizTutari, 10_725);
  assert.equal(withCommission.indirimTutari, 650);
  assert.equal(withCommission.indirimYuzdesi, 1);
  assert.equal(withoutCommission.kampanyaliFiyat, 58_500);
  assert.equal(withoutCommission.krediKartiKomisyonTutari, 0);
  assert.equal(withoutCommission.indirimTutari, 6_500);
  assert.equal(withoutCommission.indirimYuzdesi, 10);
  assert.equal(senet.krediKartiKomisyonTutari, 0);
  assert.equal(senet.indirimTutari, 6_500);
  assert.equal(senet.indirimYuzdesi, 10);
});

test("Ücret Hesaplama ↔ Toplu Teklif parite: toggle ON için aynı fiyatı üretir", () => {
  // Ücret Hesaplama akışı: tüm hediyeler + kitap işaretli
  const ucretHesaplama = computeOffer(
    FORM,
    KAMPANYA,
    {
      id: "uc",
      title: "Ücret Hesaplama",
      hediyeEdildi: { "Türkçe Seti": true, "Online Paket": true },
      kitapHediyeEdildi: true,
    },
  );
  // Toplu Teklif akışı: tumHediyelerUcretsiz = true
  const topluTeklif = computeOffer(
    FORM,
    KAMPANYA,
    {
      id: "tt",
      title: "Toplu Teklif",
      hediyeEdildi: { "Türkçe Seti": true, "Online Paket": true },
      kitapHediyeEdildi: true,
    },
  );
  assert.equal(ucretHesaplama.ozelFiyat, topluTeklif.ozelFiyat, "her iki akış toggle ON için aynı nakit fiyatı üretmeli");
  assert.equal(ucretHesaplama.toplamOdeme, topluTeklif.toplamOdeme);
  assert.equal(ucretHesaplama.hediyesizFiyat, topluTeklif.hediyesizFiyat);
});
