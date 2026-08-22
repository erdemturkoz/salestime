import assert from "node:assert/strict";
import { test } from "node:test";
import { Workbook } from "@node-projects/excelforge";
import { loadSafeXlsx } from "../client/src/utils/excel-security";
import { KOLONLAR, topluTeklifExceliniOku, topluTeklifSablonuOlustur } from "../client/src/utils/toplu-teklif-excel";

const headers = ["Ad Soyad", "Telefon"] as const;

async function fileFromWorkbook(workbook: Workbook, name = "guvenli.xlsx"): Promise<File> {
  const bytes = await workbook.build();
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as File;
}

test("güvenli Excel okuyucu formül hücrelerini reddeder", async () => {
  const workbook = new Workbook();
  const worksheet = workbook.addSheet("Teklif Listesi");
  worksheet.writeRow(1, 1, [...headers]);
  worksheet.setFormula(2, 1, "1+1");
  worksheet.setValue(2, 2, "05321234567");
  const file = await fileFromWorkbook(workbook);
  await assert.rejects(() => loadSafeXlsx(file, headers), /formül/i);
});

test("güvenli Excel okuyucu beklenmeyen sayfa ve bozuk arşivi reddeder", async () => {
  const workbook = new Workbook();
  ["Teklif Listesi", "İkinci", "Üçüncü"].forEach((name) => {
    const worksheet = workbook.addSheet(name);
    worksheet.writeRow(1, 1, [...headers]);
  });
  const file = await fileFromWorkbook(workbook);
  await assert.rejects(() => loadSafeXlsx(file, headers), /sayfa sınırını/i);

  const malformed = {
    name: "bozuk.xlsx",
    size: 4,
    arrayBuffer: async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
  } as File;
  await assert.rejects(() => loadSafeXlsx(malformed, headers), /geçerli/i);
});

test("indirilen iki sayfalı toplu teklif şablonu tekrar yüklenebilir", async () => {
  const kampanya = {
    kampanyaAdi: "GENEL İNGİLİZCE",
    egitimTipi: "Genel İngilizce",
    kurSayisi: 3,
    maxKrediKartiTaksit: 3,
    maxSenetTaksit: 2,
    hediyeler: [],
  };
  const egitimTipleri = ["Genel İngilizce"];
  // Şablona egitimTipleri geçilmeli; böylece örnek "Son Eğitim" hücresi
  // boş kalmaz ve "Son Eğitim zorunludur" doğrulamasını geçer.
  const file = await fileFromWorkbook(topluTeklifSablonuOlustur({ kampanyalar: [kampanya], egitimTipleri }));
  const satirlar = await topluTeklifExceliniOku(file, [kampanya], egitimTipleri);
  assert.equal(satirlar.length, 1);
  assert.equal(satirlar[0].durum, "hazir");
});

test("Kampanya listesi aynı satırdaki Teklif Eğitimi seçimine bağlıdır", async () => {
  const kampanyalar = [
    { kampanyaAdi: "1+1 İNGİLİZCE", egitimTipi: "Genel İngilizce", kurSayisi: 2, hediyeler: [] },
    { kampanyaAdi: "1+1 ALMANCA", egitimTipi: "Genel Almanca", kurSayisi: 2, hediyeler: [] },
    { kampanyaAdi: "KIŞ OKULU", egitimTipi: "Junior İngilizce", kurSayisi: 1, hediyeler: [] },
  ];
  const workbook = topluTeklifSablonuOlustur({
    kampanyalar,
    egitimTipleri: ["Genel İngilizce", "Genel Almanca", "Junior İngilizce"],
  });
  const validation = workbook.getSheet("Teklif Listesi")!.getDataValidations().get("I2:I1001") as any;
  assert.match(validation.formula1, /INDIRECT\(VLOOKUP\(\$E2/);
  assert.match(validation.formula1, /SalesTime_Egitim_Kampanya_Eslestirme/);
  assert.doesNotMatch(validation.formula1, /Kullanım Kılavuzu/);

  const guide = workbook.getSheet("Kullanım Kılavuzu")!;
  assert.equal(guide.getCell(2, 12).value, "1+1 İNGİLİZCE");
  assert.equal(guide.getCell(3, 12).value, "1+1 ALMANCA");
  assert.equal(guide.getCell(4, 12).value, "KIŞ OKULU");
  const namedRanges = workbook.getNamedRanges();
  assert.equal(namedRanges.length, 4);
  assert.ok(namedRanges.some((range: any) =>
    range.name === "SalesTime_Egitim_Kampanya_Eslestirme"
      && range.ref === "'Kullanım Kılavuzu'!$J$2:$K$4"
  ));

  // Üretilen dosya gerçek .xlsx turundan sonra da aynı bağımlı doğrulamayı korumalıdır.
  const bytes = await workbook.build();
  const roundTrip = await Workbook.fromBytes(bytes);
  const savedValidation = roundTrip.getSheet("Teklif Listesi")!.getDataValidations().get("I2:I1001") as any;
  assert.match(savedValidation.formula1, /INDIRECT\(VLOOKUP\(\$E2/);
});

test("eski sekiz sütunlu toplu teklif şablonu güncel şablon uyarısıyla reddedilir", async () => {
  const workbook = new Workbook();
  const worksheet = workbook.addSheet("Teklif Listesi");
  worksheet.writeRow(1, 1, [
    "Ad Soyad", "Telefon", "Son Eğitim", "Son Kur", "Teklif Edilecek Kur", "Ödeme 1", "Ödeme 2", "Kampanya",
  ]);
  worksheet.writeRow(2, 1, ["Ayşe Demir", "05321234567", "Genel İngilizce", "A2", "1", "Nakit", "Kredi Kartı - 3 Taksit", "GENEL İNGİLİZCE"]);
  const file = await fileFromWorkbook(workbook);
  await assert.rejects(
    () => topluTeklifExceliniOku(file, [], []),
    /Teklif Eğitimi.*güncel şablonu indirin/i,
  );
  assert.equal(KOLONLAR.length, 9);
});
