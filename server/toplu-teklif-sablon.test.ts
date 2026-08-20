import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { topluTeklifSablonuOlustur } from "../client/src/utils/toplu-teklif-excel";

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

  assert.deepEqual(workbook.SheetNames, ["Teklif Listesi", "Kullanım Kılavuzu"]);
  const teklifListesi = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets["Teklif Listesi"], { header: 1 });
  assert.deepEqual(teklifListesi[0], [
    "Ad Soyad", "Telefon", "Son Eğitim", "Son Kur",
    "Teklif Edilecek Kur", "Ödeme 1", "Ödeme 2", "Kampanya",
  ]);

  const kilavuz = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets["Kullanım Kılavuzu"], { header: 1 });
  const tumMetin = kilavuz.flat().map(String).join("\n");
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