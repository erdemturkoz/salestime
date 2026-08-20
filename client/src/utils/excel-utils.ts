import { Workbook } from "@node-projects/excelforge";
import { Kampanya } from "@/types";
import { loadSafeXlsx, safeSpreadsheetText, worksheetRowsAsRecords } from "./excel-security";

const KAMPANYA_KOLONLARI = [
  "Kampanya Adı",
  "Eğitim Tipi",
  "Kur Sayısı",
  "Toplam Ders Saati",
  "Liste Fiyatı",
  "Nakit Fiyatı",
  "İndirim Oranı (%)",
  "Faiz Oranı (%)",
  "Kitap Fiyatı",
  "Kitap Set Sayısı",
  "Maks. Kredi Kartı Taksiti",
  "Maks. Senet Taksiti",
  "Hediyeler",
] as const;

function downloadXlsx(buffer: ArrayBuffer | Uint8Array, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function numberInRange(value: string, field: string, min: number, max: number): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error(`${field} geçerli bir sayı olmalıdır.`);
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new Error(`${field} ${min} ile ${max} arasında olmalıdır.`);
  }
  return numeric;
}

export const exportToExcel = async (kampanyalar: Kampanya[]): Promise<void> => {
  const workbook = new Workbook();
  const worksheet = workbook.addSheet("Kampanyalar");
  [24, 20, 12, 20, 15, 15, 20, 18, 15, 20, 28, 24, 36].forEach((width, index) => worksheet.setColumnWidth(index + 1, width));
  worksheet.writeRow(1, 1, [...KAMPANYA_KOLONLARI]);
  KAMPANYA_KOLONLARI.forEach((_, index) => worksheet.setStyle(1, index + 1, {
    font: { bold: true, color: "#FFFFFF" }, fill: { type: "pattern", pattern: "solid", fgColor: "#1F4E78" },
  }));

  kampanyalar.forEach((kampanya, index) => {
    worksheet.writeRow(index + 2, 1, [
      safeSpreadsheetText(kampanya.kampanyaAdi), safeSpreadsheetText(kampanya.egitimTipi), kampanya.kurSayisi,
      kampanya.toplamDersSaati, kampanya.listeFiyati, kampanya.nakitFiyati, kampanya.indirimOrani, kampanya.faizOrani,
      kampanya.kitapFiyati, kampanya.kitapSetSayisi, kampanya.maxKrediKartiTaksit, kampanya.maxSenetTaksit,
      safeSpreadsheetText(kampanya.hediyeler.map((hediye) => `${hediye.isim} (${hediye.fiyat} TL)`).join(", ")),
    ]);
  });
  downloadXlsx(await workbook.build(), "kampanyalar.xlsx");
};

export const importFromExcel = async (file: File): Promise<Partial<Kampanya>[]> => {
  const workbook = await loadSafeXlsx(file, KAMPANYA_KOLONLARI);
  const rows = worksheetRowsAsRecords(workbook.getSheetByIndex(0)!, KAMPANYA_KOLONLARI);
  return rows.map((row) => {
    const gifts = row.Hediyeler
      ? row.Hediyeler.split(",").map((gift) => {
          const match = gift.trim().match(/^(.{1,160}?)\s*\((\d+(?:[.,]\d+)?)\s*TL\)$/i);
          if (!match) throw new Error("Hediyeler alanı \"Ad (Fiyat TL)\" biçiminde olmalıdır.");
          return { isim: match[1].trim(), fiyat: numberInRange(match[2], "Hediye fiyatı", 0, 1_000_000) };
        })
      : [];
    if (gifts.length > 50) throw new Error("Bir kampanyada en fazla 50 hediye olabilir.");

    const kampanyaAdi = row["Kampanya Adı"].trim();
    const egitimTipi = row["Eğitim Tipi"].trim();
    if (!kampanyaAdi || kampanyaAdi.length > 150 || !egitimTipi || egitimTipi.length > 120) {
      throw new Error("Kampanya adı ve eğitim tipi zorunludur ve izin verilen uzunluğu aşamaz.");
    }
    return {
      kampanyaAdi,
      egitimTipi,
      kurSayisi: numberInRange(row["Kur Sayısı"], "Kur sayısı", 1, 99),
      toplamDersSaati: numberInRange(row["Toplam Ders Saati"], "Toplam ders saati", 1, 10_000),
      listeFiyati: numberInRange(row["Liste Fiyatı"], "Liste fiyatı", 0, 10_000_000),
      nakitFiyati: numberInRange(row["Nakit Fiyatı"], "Nakit fiyatı", 0, 10_000_000),
      indirimOrani: numberInRange(row["İndirim Oranı (%)"], "İndirim oranı", 0, 100),
      faizOrani: numberInRange(row["Faiz Oranı (%)"], "Faiz oranı", 0, 100),
      kitapFiyati: numberInRange(row["Kitap Fiyatı"], "Kitap fiyatı", 0, 10_000_000),
      kitapSetSayisi: numberInRange(row["Kitap Set Sayısı"], "Kitap set sayısı", 1, 99),
      maxKrediKartiTaksit: numberInRange(row["Maks. Kredi Kartı Taksiti"], "Kart taksiti", 1, 24),
      maxSenetTaksit: numberInRange(row["Maks. Senet Taksiti"], "Senet taksiti", 1, 24),
      hediyeler: gifts,
    };
  });
};