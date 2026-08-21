/**
 * topluMesajOlustur — WhatsApp mesaj şablon testleri (Task #15)
 *
 * Test kapsamı:
 *  - sonKur dolu  → kişiselleştirilmiş selamlama
 *  - sonKur boş   → genel selamlama fallback
 *  - hediyeEdildi → "HEDİYE" satırı + hediyeIndirimi satırı
 *  - fiyat eşitliği: mesajdaki Ödenecek = teklif.ozelFiyat
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { topluMesajOlustur } from "./toplu-mesaj-utils";

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
    hediyeIndirimi: 0,
    hediyeEdildi: {},
    ozelFiyat: 81_000,
    pesinat: 0,
    aylikOdeme: 81_000,
    odemeTipiText: "Nakit",
    form: { odemeTipi: "nakit", taksitSayisi: 1, gecerlilikGunu: 2 },
    ...overrides,
  };
}

const DANISMAN = { adi: "Ali", soyadi: "Yılmaz", telefon: "05321112233" };

// ─── Testler ─────────────────────────────────────────────────────────────────

test("sonKur dolu iken selamlama kişiselleştirilmiş kur ifadesini içerir", () => {
  const satir = { ogrenciAdi: "Ayşe Demir", sonKur: "B1" };
  const mesaj = topluMesajOlustur(satir, mockTeklif(), mockTeklif(), "Kadıköy", DANISMAN);

  assert.match(mesaj, /Son aldığınız B1 seviyesinin ardından/);
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

test("hediyeEdildi set iken mesajda HEDİYE satırı ve hediyeIndirimi görünür", () => {
  const teklif = mockTeklif({
    hediyeEdildi: { "Türkçe Seti": true },
    hediyeIndirimi: 5_000,
    ozelFiyat: 76_000,
  });
  const mesaj = topluMesajOlustur({ ogrenciAdi: "Can Arslan", sonKur: "A2" }, teklif, mockTeklif(), "Üsküdar", DANISMAN);

  assert.match(mesaj, /🎁 Türkçe Seti.*HEDİYE/);
  assert.match(mesaj, /Hediye İndirimi: -5\.000 TL/);
  assert.match(mesaj, /Ödenecek: 76\.000 TL/);
});

test("hediyeEdildi boşken HEDİYE satırı ve Hediye İndirimi mesajda bulunmaz", () => {
  const mesaj = topluMesajOlustur({ ogrenciAdi: "Can Arslan", sonKur: "A2" }, mockTeklif(), mockTeklif(), "Üsküdar", DANISMAN);

  assert.doesNotMatch(mesaj, /HEDİYE/);
  assert.doesNotMatch(mesaj, /Hediye İndirimi/);
});

test("mesajdaki Ödenecek değeri teklif.ozelFiyat ile örtüşür", () => {
  const ozelFiyat = 66_000;
  const teklif = mockTeklif({ ozelFiyat });
  const mesaj = topluMesajOlustur({ ogrenciAdi: "Test Aday", sonKur: "A1" }, teklif, mockTeklif(), "Test Şube", DANISMAN);

  assert.match(mesaj, new RegExp(`Ödenecek: ${ozelFiyat.toLocaleString("tr-TR")} TL`));
});

test("liste fiyatı ve kampanya indirimi mesajda ayrı satırlarda yer alır", () => {
  const teklif = mockTeklif({ listeFiyati: 100_000, indirimTutari: 35_000, indirimYuzdesi: 35 });
  const mesaj = topluMesajOlustur({ ogrenciAdi: "Test", sonKur: "A1" }, teklif, mockTeklif(), "Şube", DANISMAN);

  assert.match(mesaj, /Liste Fiyatı: 100\.000 TL/);
  assert.match(mesaj, /Kampanya İndirimi: -35\.000 TL \(%35\)/);
});

test("danışman telefonu null olduğunda mesaj telefon satırı içermez", () => {
  const danismanTelefonsuz = { adi: "Ali", soyadi: "Yılmaz" };
  const mesaj = topluMesajOlustur({ ogrenciAdi: "Test", sonKur: "B2" }, mockTeklif(), mockTeklif(), "Şube", danismanTelefonsuz as any);

  assert.doesNotMatch(mesaj, /05\d{9}/);
});
