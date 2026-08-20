import assert from "node:assert/strict";
import { test } from "node:test";
import { KOLONLAR, topluTeklifSablonuOlustur } from "../client/src/utils/toplu-teklif-excel";

test("toplu teklif şablonu aktif şubenin tüm kampanya, kur ve ödeme alternatiflerini yazar", () => {
  const workbook = topluTeklifSablonuOlustur({
    subeAdi: "Kadıköy",
    kampanyalar: [
      {
        id: 21,
        kampanyaAdi: "YOĞUN İNGİLİZCE",
        egitimTipi: "Genel İngilizce",
        kurSayisi: 3,
        maxKrediKartiTaksit: 3,
        maxSenetTaksit: 2,
        kitapFiyati: 500,
        kitapSetSayisi: 2,
        hediyeler: [{ isim: "Konuşma Kulübü", fiyat: 0 }],
      },
      {
        id: 22,
        kampanyaAdi: "SINAV HAZIRLIK",
        egitimTipi: "IELTS",
        kurSayisi: 5,
        maxKrediKartiTaksit: 6,
        maxSenetTaksit: 0,
        kitapFiyati: 0,
        hediyeler: [],
      },
    ],
  });

  assert.deepEqual(workbook.getSheetNames(), ["Teklif Listesi", "Kullanım Kılavuzu"]);
  const teklifListesi = workbook.getSheet("Teklif Listesi")!;
  assert.deepEqual(KOLONLAR.map((_, index) => teklifListesi.getCell(1, index + 1).value), [
    "Ad Soyad", "Telefon", "Son Eğitim", "Son Kur",
    "Teklif Edilecek Kur", "Ödeme 1", "Ödeme 2", "Kampanya",
  ]);

  const kilavuz = workbook.getSheet("Kullanım Kılavuzu")!;
  const tumMetin = kilavuz.readAllCells().map(({ cell }) => String(cell.value ?? "")).join("\n");
  assert.match(tumMetin, /Kadıköy/);
  assert.match(tumMetin, /YOĞUN İNGİLİZCE/);
  assert.match(tumMetin, /SINAV HAZIRLIK/);
  assert.match(tumMetin, /Kredi Kartı - 3 Taksit/);
  assert.match(tumMetin, /Kredi Kartı - 6 Taksit/);
  assert.match(tumMetin, /Senet - 2 Taksit/);
  assert.match(tumMetin, /1 · 2 · 3/);
  assert.match(tumMetin, /1 · 2 · 3 · 4 · 5/);
  assert.doesNotMatch(tumMetin, /Senet - 3 Taksit/);
});