/**
 * topluMesajOlustur — WhatsApp mesaj şablon testleri
 *
 * Test kapsamı:
 *  - sonKur dolu  → kişiselleştirilmiş selamlama
 *  - sonKur boş   → genel selamlama fallback
 *  - toggle kapalı → Satış Fiyatı, HEDİYE satırı yok
 *  - toggle açık  → Hediyesiz Son Fiyat, HEDİYE satırları, Toplam Hediye İndirimi
 *  - topluOdemeDetayi → nakit ve taksit formatı
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { topluMesajOlustur, topluOdemeDetayi } from "./toplu-mesaj-utils";

// ─── Sabit mock teklif ───────────────────────────────────────────────────────

function mockTeklif(overrides: Partial<any> = {}): any {
  return {
    egitimTipi: "Genel İngilizce",
    kurSayisi: 4,
    dersSaati: 40,
    listeFiyati: 100_000,
    indirimTutari: 35_000,
    indirimYuzdesi: 35,
    hediyeler: [{ isim: "Türkçe Seti", fiyat: 5_000 }],
    hediyeEdildi: {},
    hediyeIndirimi: 0,
    hediyesizFiyat: 81_000,
    toplamHediyeIndirimi: 0,
    kitapHediyeEdildi: false,
    kitapUcreti: 1_000,
    ozelFiyat: 81_000,
    toplamOdeme: 81_000,
    pesinat: 0,
    aylikOdeme: 81_000,
    odemeTipiText: "Nakit",
    form: { odemeTipi: "nakit", taksitSayisi: 1, gecerlilikGunu: 2 },
    ...overrides,
  };
}

const DANISMAN = { adi: "Ali", soyadi: "Yılmaz", telefon: "05321112233" };

// ─── Selamlama testleri ───────────────────────────────────────────────────────

test("sonKur dolu iken selamlama kişiselleştirilmiş kur ifadesini içerir", () => {
  const satir = { ogrenciAdi: "Ayşe Demir", sonEgitim: "Genel Almanca", sonKur: "B1" };
  const mesaj = topluMesajOlustur(satir, mockTeklif(), mockTeklif(), "Kadıköy", DANISMAN);

  assert.match(mesaj, /Son aldığınız B1 seviyesinin ardından/);
  assert.match(mesaj, /Geçmiş eğitiminiz: Genel Almanca/);
  assert.match(mesaj, /Teklif Eğitimi: Genel İngilizce/);
  assert.doesNotMatch(mesaj, /Mevcut eğitim durumunuza göre/);
});

test("sonKur boş iken genel selamlama fallback'i kullanılır", () => {
  const satir = { ogrenciAdi: "Mehmet Çelik", sonKur: "" };
  const mesaj = topluMesajOlustur(satir, mockTeklif(), mockTeklif(), "Beşiktaş", DANISMAN);

  assert.match(mesaj, /Mevcut eğitim durumunuza göre/);
  assert.doesNotMatch(mesaj, /son aldığınız/i);
});

test("sonKur null iken genel selamlama fallback'i kullanılır", () => {
  const satir = { ogrenciAdi: "Zeynep Kaya", sonKur: null };
  const mesaj = topluMesajOlustur(satir as any, mockTeklif(), mockTeklif(), "Şişli", DANISMAN);

  assert.match(mesaj, /Mevcut eğitim durumunuza göre/);
});

// ─── Toggle kapalı (hediye yok) ───────────────────────────────────────────────

test("toggle kapalıyken mesajda HEDİYE satırı ve Toplam Hediye İndirimi bulunmaz", () => {
  const mesaj = topluMesajOlustur(
    { ogrenciAdi: "Can Arslan", sonKur: "A2" },
    mockTeklif(),
    mockTeklif(),
    "Üsküdar",
    DANISMAN,
  );

  assert.doesNotMatch(mesaj, /HEDİYE/);
  assert.doesNotMatch(mesaj, /Toplam Hediye İndirimi/);
  assert.doesNotMatch(mesaj, /Hediyesiz Son Fiyat/);
});

test("toggle kapalıyken mesajda Satış Fiyatı ve Liste Fiyatı görünür", () => {
  const teklif = mockTeklif({ ozelFiyat: 81_000, toplamOdeme: 81_000 });
  const mesaj = topluMesajOlustur(
    { ogrenciAdi: "Test", sonKur: "A1" },
    teklif,
    mockTeklif(),
    "Şube",
    DANISMAN,
  );

  assert.match(mesaj, /Liste Fiyatı: 100\.000 TL/);
  assert.match(mesaj, /Satış Fiyatı: 81\.000 TL/);
});

// ─── Toggle açık (hediyeler ücretsiz) ────────────────────────────────────────

test("toggle açıkken mesajda Hediyesiz Son Fiyat, HEDİYE satırı ve Toplam Hediye İndirimi görünür", () => {
  const teklif = mockTeklif({
    hediyeEdildi: { "Türkçe Seti": true },
    hediyeIndirimi: 5_000,
    hediyesizFiyat: 81_000,
    toplamHediyeIndirimi: 6_000,   // 5_000 hediye + 1_000 kitap
    kitapHediyeEdildi: true,
    kitapUcreti: 1_000,
    ozelFiyat: 75_000,
    toplamOdeme: 75_000,
  });
  const mesaj = topluMesajOlustur(
    { ogrenciAdi: "Can Arslan", sonKur: "A2" },
    teklif,
    mockTeklif(),
    "Üsküdar",
    DANISMAN,
  );

  assert.match(mesaj, /Hediyesiz Son Fiyat: 81\.000 TL/);
  assert.match(mesaj, /🎁 Türkçe Seti \(5\.000 TL\) — HEDİYE/);
  assert.match(mesaj, /🎁 Kitap Seti \(1\.000 TL\) — HEDİYE/);
  assert.match(mesaj, /Toplam Hediye İndirimi: -6\.000 TL/);
  assert.match(mesaj, /Satış Fiyatı: 75\.000 TL/);
});

test("toggle açıkken Hediyesiz Son Fiyat - Toplam Hediye İndirimi = Satış Fiyatı", () => {
  const hediyesizFiyat = 81_000;
  const toplamHediyeIndirimi = 16_000;
  const ozelFiyat = hediyesizFiyat - toplamHediyeIndirimi; // 65_000
  const teklif = mockTeklif({
    hediyeEdildi: { "Türkçe Seti": true, "Online Paket": true },
    hediyeler: [{ isim: "Türkçe Seti", fiyat: 5_000 }, { isim: "Online Paket", fiyat: 10_000 }],
    hediyeIndirimi: 15_000,
    hediyesizFiyat,
    toplamHediyeIndirimi,
    kitapHediyeEdildi: true,
    kitapUcreti: 1_000,
    ozelFiyat,
    toplamOdeme: ozelFiyat,
  });
  const mesaj = topluMesajOlustur(
    { ogrenciAdi: "Test", sonKur: "B1" },
    teklif,
    mockTeklif(),
    "Merkez",
    DANISMAN,
  );

  assert.match(mesaj, /Hediyesiz Son Fiyat: 81\.000 TL/);
  assert.match(mesaj, /Toplam Hediye İndirimi: -16\.000 TL/);
  assert.match(mesaj, /Satış Fiyatı: 65\.000 TL/);
});

// ─── Ödeme detay formatı ─────────────────────────────────────────────────────

test("topluOdemeDetayi: nakit → 'Nakit · X TL'", () => {
  const teklif = mockTeklif({ toplamOdeme: 81_000 });
  const detay = topluOdemeDetayi(teklif);
  assert.match(detay, /Nakit · 81\.000 TL/);
});

test("topluOdemeDetayi: kredi kartı taksit → 'X × Y TL = Z TL' formatı", () => {
  const teklif = mockTeklif({
    odemeTipiText: "Kredi Kartı",
    form: { odemeTipi: "kredi-karti", taksitSayisi: 4, gecerlilikGunu: 2 },
    aylikOdeme: 20_250,
    toplamOdeme: 81_000,
    pesinat: 0,
  });
  const detay = topluOdemeDetayi(teklif);
  assert.match(detay, /Kredi Kartı · 4 × 20\.250 TL = 81\.000 TL/);
});

test("topluOdemeDetayi: peşinatlı senet → peşinat satırı dahil", () => {
  const teklif = mockTeklif({
    odemeTipiText: "Senet",
    form: { odemeTipi: "senet", taksitSayisi: 3, gecerlilikGunu: 2 },
    pesinat: 10_000,
    aylikOdeme: 24_000,
    toplamOdeme: 82_000,
  });
  const detay = topluOdemeDetayi(teklif);
  assert.match(detay, /10\.000 TL peşinat/);
  assert.match(detay, /3 × 24\.000 TL = 82\.000 TL/);
});

test("danışman telefonu null olduğunda mesaj telefon satırı içermez", () => {
  const danismanTelefonsuz = { adi: "Ali", soyadi: "Yılmaz" };
  const mesaj = topluMesajOlustur(
    { ogrenciAdi: "Test", sonKur: "B2" },
    mockTeklif(),
    mockTeklif(),
    "Şube",
    danismanTelefonsuz as any,
  );

  assert.doesNotMatch(mesaj, /05\d{9}/);
});
