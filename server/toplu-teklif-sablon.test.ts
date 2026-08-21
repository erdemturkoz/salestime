import assert from "node:assert/strict";
import { test } from "node:test";
import { Workbook } from "@node-projects/excelforge";
import {
  KOLONLAR,
  topluTeklifExceliniOku,
  topluTeklifSablonuOlustur,
} from "../client/src/utils/toplu-teklif-excel";

// ---------------------------------------------------------------------------
// Yardımcı: verilen satır dizisinden minimal bir Excel dosyası oluşturur ve
// topluTeklifExceliniOku'nun beklediği Upload nesnesine dönüştürür.
// ---------------------------------------------------------------------------
async function mockExcelDosyasi(
  satirlar: Record<string, string>[],
): Promise<{ name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }> {
  const wb = new Workbook();
  const ws = wb.addSheet("Teklif Listesi");
  ws.writeRow(1, 1, [...KOLONLAR]);
  satirlar.forEach((satir, i) => {
    ws.writeRow(
      i + 2,
      1,
      KOLONLAR.map((k) => satir[k] ?? ""),
    );
  });
  const buffer = await wb.build();
  const ab = buffer instanceof ArrayBuffer ? buffer : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return {
    name: "test.xlsx",
    size: (ab as ArrayBuffer).byteLength,
    arrayBuffer: async () => ab as ArrayBuffer,
  };
}

const ORNEK_KAMPANYALAR = [
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
];

const ORNEK_EGITIM_TIPLERI = ["Genel İngilizce", "Genel Almanca", "Junior İngilizce"];

test("toplu teklif şablonu aktif şubenin tüm kampanya, kur ve ödeme alternatiflerini yazar", () => {
  const workbook = topluTeklifSablonuOlustur({
    subeAdi: "Kadıköy",
    kampanyalar: ORNEK_KAMPANYALAR,
    egitimTipleri: ORNEK_EGITIM_TIPLERI,
  });

  assert.deepEqual(workbook.getSheetNames(), ["Teklif Listesi", "Kullanım Kılavuzu"]);
  const teklifListesi = workbook.getSheet("Teklif Listesi")!;
  assert.deepEqual(KOLONLAR.map((_, index) => teklifListesi.getCell(1, index + 1).value), [
    "Ad Soyad", "Telefon", "Son Eğitim", "Son Kur",
    "Teklif Edilecek Kur", "Ödeme 1", "Ödeme 2", "Kampanya",
  ]);

  // Örnek satır: Son Eğitim hücresi eğitim tiplerinden ilkini göstermeli, "Lise" gibi
  // sabit bir okul düzeyi değil.
  assert.equal(teklifListesi.getCell(2, 3).value, ORNEK_EGITIM_TIPLERI[0]);

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

  // Kullanım kılavuzu Son Eğitim satırı güncel eğitim tiplerini listelemiş olmalı.
  assert.match(tumMetin, /Genel İngilizce/);
  assert.match(tumMetin, /Genel Almanca/);
  assert.match(tumMetin, /Junior İngilizce/);
  // "Lise" gibi sabit okul düzeyi değeri kılavuzda bulunmamalı.
  assert.doesNotMatch(tumMetin, /\bLise\b/);
});

test("şablon eğitim tipi listesi olmadan oluşturulduğunda Son Eğitim hücresi boş kalır", () => {
  const workbook = topluTeklifSablonuOlustur({
    subeAdi: "Test",
    kampanyalar: ORNEK_KAMPANYALAR,
    // egitimTipleri verilmedi
  });
  const teklifListesi = workbook.getSheet("Teklif Listesi")!;
  // Eğitim tipi verilmediğinde örnek hücre boş olmalı; asla sabit "Lise" yazmamalı.
  assert.notEqual(teklifListesi.getCell(2, 3).value, "Lise");
});

// ---------------------------------------------------------------------------
// Son Eğitim zorunluluk ve boş satır testleri
// ---------------------------------------------------------------------------

const ORNEK_KAMPANYA_OBJ = {
  id: 21,
  kampanyaAdi: "YOĞUN İNGİLİZCE",
  egitimTipi: "Genel İngilizce",
  kurSayisi: 3,
  maxKrediKartiTaksit: 3,
  maxSenetTaksit: 2,
  kitapFiyati: 0,
  hediyeler: [],
};
const EGITIM_TIPLERI = ["Genel İngilizce", "Genel Almanca", "Junior İngilizce"];

test("veri içeren satırda Son Eğitim boşsa kayıt duzeltmeli olarak reddedilir", async () => {
  const dosya = await mockExcelDosyasi([
    {
      "Ad Soyad": "Ayşe Demir",
      "Telefon": "05321234567",
      "Son Eğitim": "",           // boş — zorunlu
      "Son Kur": "A2",
      "Teklif Edilecek Kur": "1",
      "Ödeme 1": "Nakit",
      "Ödeme 2": "Kredi Kartı - 3 Taksit",
      "Kampanya": "YOĞUN İNGİLİZCE",
    },
  ]);
  const sonuc = await topluTeklifExceliniOku(dosya as any, [ORNEK_KAMPANYA_OBJ], EGITIM_TIPLERI);
  assert.equal(sonuc.length, 1);
  assert.equal(sonuc[0].durum, "duzeltmeli");
  assert.ok(
    sonuc[0].hatalar.some((h) => h.includes("Son Eğitim zorunludur")),
    `Beklenen hata bulunamadı. Hatalar: ${sonuc[0].hatalar.join(", ")}`,
  );
});

test("tamamen boş satırlar sonuca dahil edilmez", async () => {
  const dosya = await mockExcelDosyasi([
    {
      "Ad Soyad": "Ayşe Demir",
      "Telefon": "05321234567",
      "Son Eğitim": "Genel İngilizce",
      "Son Kur": "A2",
      "Teklif Edilecek Kur": "1",
      "Ödeme 1": "Nakit",
      "Ödeme 2": "Kredi Kartı - 3 Taksit",
      "Kampanya": "YOĞUN İNGİLİZCE",
    },
    // Tamamen boş satır (kullanılmamış)
    {
      "Ad Soyad": "", "Telefon": "", "Son Eğitim": "", "Son Kur": "",
      "Teklif Edilecek Kur": "", "Ödeme 1": "", "Ödeme 2": "", "Kampanya": "",
    },
    // Bir başka tamamen boş satır
    {
      "Ad Soyad": "", "Telefon": "", "Son Eğitim": "", "Son Kur": "",
      "Teklif Edilecek Kur": "", "Ödeme 1": "", "Ödeme 2": "", "Kampanya": "",
    },
  ]);
  const sonuc = await topluTeklifExceliniOku(dosya as any, [ORNEK_KAMPANYA_OBJ], EGITIM_TIPLERI);
  // Yalnızca veri içeren satır döner; boş satırlar yok sayılır.
  assert.equal(sonuc.length, 1);
});

test("geçerli eğitim tipiyle dolu satır hazır kabul edilir", async () => {
  const dosya = await mockExcelDosyasi([
    {
      "Ad Soyad": "Ayşe Demir",
      "Telefon": "05321234567",
      "Son Eğitim": "Genel İngilizce",
      "Son Kur": "A2",
      "Teklif Edilecek Kur": "1",
      "Ödeme 1": "Nakit",
      "Ödeme 2": "Kredi Kartı - 3 Taksit",
      "Kampanya": "YOĞUN İNGİLİZCE",
    },
  ]);
  const sonuc = await topluTeklifExceliniOku(dosya as any, [ORNEK_KAMPANYA_OBJ], EGITIM_TIPLERI);
  assert.equal(sonuc.length, 1);
  assert.equal(sonuc[0].durum, "hazir");
  assert.equal(sonuc[0].hatalar.length, 0);
});