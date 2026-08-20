import assert from "node:assert/strict";
import { test } from "node:test";
import { Workbook } from "@node-projects/excelforge";
import { loadSafeXlsx } from "../client/src/utils/excel-security";
import { topluTeklifExceliniOku, topluTeklifSablonuOlustur } from "../client/src/utils/toplu-teklif-excel";

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
    kurSayisi: 3,
    maxKrediKartiTaksit: 3,
    maxSenetTaksit: 2,
    hediyeler: [],
  };
  const file = await fileFromWorkbook(topluTeklifSablonuOlustur({ kampanyalar: [kampanya] }));
  const satirlar = await topluTeklifExceliniOku(file, [kampanya]);
  assert.equal(satirlar.length, 1);
  assert.equal(satirlar[0].durum, "hazir");
});