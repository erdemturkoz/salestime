import { Workbook, type Worksheet } from "@node-projects/excelforge";
import { loadSafeXlsx, safeSpreadsheetText, worksheetRowsAsRecords } from "./excel-security";

export type OdemePlani = {
  odemeTipi: "nakit" | "kredi-karti" | "senet";
  taksitSayisi: number;
  etiket: string;
};

export type TopluTeklifSatiri = {
  id: string;
  sira: number;
  adSoyad: string;
  telefon: string;
  sonEgitim: string;
  sonKur: string;
  teklifEgitimi: string;
  teklifKur: number | null;
  odeme1Raw: string;
  odeme2Raw: string;
  kampanyaAdi: string;
  kampanya?: any;
  odeme1?: OdemePlani;
  odeme2?: OdemePlani;
  durum: "hazir" | "duzeltmeli" | "mukerrer";
  hatalar: string[];
  beklenen: string[];
};

export const KOLONLAR = [
  "Ad Soyad",
  "Telefon",
  "Öğrencinin Son Eğitimi (Geçmiş)",
  "Son Kur",
  "Teklif Eğitimi",
  "Teklif Edilecek Kur",
  "Ödeme 1",
  "Ödeme 2",
  "Kampanya",
] as const;

const metin = (deger: unknown) => String(deger ?? "").trim();

function telefonuNormalizeEt(deger: string): string {
  let rakamlar = deger.replace(/\D/g, "");
  if (rakamlar.startsWith("00")) rakamlar = rakamlar.slice(2);
  if (rakamlar.length === 10) return `90${rakamlar}`;
  if (rakamlar.length === 11 && rakamlar.startsWith("0")) return `90${rakamlar.slice(1)}`;
  return rakamlar;
}

function kuruAyikla(deger: string): number | null {
  if (!/^\s*\d{1,2}(?:\s*kur)?\s*$/i.test(deger)) return null;
  const kur = Number(deger.replace(/\D/g, ""));
  return Number.isInteger(kur) && kur > 0 && kur <= 24 ? kur : null;
}

export function odemePlaniniAyikla(deger: string): OdemePlani | null {
  const temiz = deger.trim().replace(/\s+/g, " ");
  if (/^nakit$/i.test(temiz)) return { odemeTipi: "nakit", taksitSayisi: 1, etiket: "Nakit" };
  const eslesme = temiz.match(/^(kredi\s*kart[ıi]|senet)\s*[-–]?\s*(\d{1,2})\s*(?:taksit|ay)?$/i);
  if (!eslesme) return null;
  const taksitSayisi = Number(eslesme[2]);
  if (!Number.isInteger(taksitSayisi) || taksitSayisi < 1 || taksitSayisi > 24) return null;
  const krediKarti = /kredi/i.test(eslesme[1]);
  return {
    odemeTipi: krediKarti ? "kredi-karti" : "senet",
    taksitSayisi,
    etiket: `${krediKarti ? "Kredi Kartı" : "Senet"} - ${taksitSayisi} Taksit`,
  };
}

export type TopluTeklifSablonuBaglami = {
  subeAdi?: string;
  kampanyalar?: any[];
  /** Eğitim Tipleri Yönetimi'nden alınan güncel eğitim tipi adları. */
  egitimTipleri?: string[];
};

const sayiyiSinirla = (deger: unknown, ustSinir: number) =>
  Math.max(0, Math.min(ustSinir, Math.floor(Number(deger) || 0)));
const aralik = (son: number) => Array.from({ length: son }, (_, index) => index + 1);
const benzersiz = (degerler: string[]) => Array.from(new Set(degerler.filter(Boolean)));
const teklifeAcikKurler = (kampanya: any) => aralik(sayiyiSinirla(kampanya?.kurSayisi, 24));
const krediKartiEtiketleri = (kampanya: any) =>
  aralik(sayiyiSinirla(kampanya?.maxKrediKartiTaksit, 24)).map((taksit) => `Kredi Kartı - ${taksit} Taksit`);
const senetEtiketleri = (kampanya: any) =>
  aralik(sayiyiSinirla(kampanya?.maxSenetTaksit, 24)).map((taksit) => `Senet - ${taksit} Taksit`);
const egitimAnahtari = (deger: unknown) => metin(deger).toLocaleLowerCase("tr");

function styleRow(
  sheet: Worksheet,
  row: number,
  color: string,
  fontColor = "#1F1F1F",
  bold = false,
  columnCount = 8,
) {
  for (let column = 1; column <= columnCount; column += 1) {
    sheet.setStyle(row, column, {
      fill: { type: "pattern", pattern: "solid", fgColor: color },
      font: { bold, color: fontColor },
      alignment: { vertical: "center", wrapText: true },
    });
  }
}

function kampanyaHesaplamaNotu(kampanya: any): string {
  const notlar: string[] = [];
  if (Number(kampanya?.kitapFiyati) > 0) notlar.push(`Kitap: ${Number(kampanya?.kitapSetSayisi) || 1} set × ${kampanya.kitapFiyati} TL`);
  const hediyeler = Array.isArray(kampanya?.hediyeler) ? kampanya.hediyeler : [];
  if (hediyeler.length) notlar.push(`Hediyeler: ${hediyeler.map((hediye: any) => hediye.isim).filter(Boolean).join(", ")}`);
  return notlar.length ? notlar.join(" · ") : "Ek kitap/hediye notu yok.";
}

export function topluTeklifSablonuOlustur({ subeAdi, kampanyalar = [], egitimTipleri = [] }: TopluTeklifSablonuBaglami = {}) {
  const workbook = new Workbook();
  workbook.coreProperties = { creator: "SalesTime" };
  const veriSayfasi = workbook.addSheet("Teklif Listesi");
  [24, 18, 31, 13, 22, 20, 28, 28, 38].forEach((width, index) => veriSayfasi.setColumnWidth(index + 1, width));
  veriSayfasi.writeRow(1, 1, [...KOLONLAR]).freeze(1, 0);
  const guncelKampanyalar = [...kampanyalar].sort((a, b) =>
    String(a.kampanyaAdi || "").localeCompare(String(b.kampanyaAdi || ""), "tr"),
  );
  const ilkKampanya = guncelKampanyalar[0];
  const ornekOdeme2 = krediKartiEtiketleri(ilkKampanya)[0] || senetEtiketleri(ilkKampanya)[0] || "Kredi Kartı - 1 Taksit";
  // Geçmiş eğitim teklif fiyatını belirlemez; örnek için ilk güncel eğitim tipi kullanılır.
  const ornekSonEgitim = egitimTipleri[0] || "";
  const ornekTeklifEgitimi = ilkKampanya?.egitimTipi || "";
  veriSayfasi.writeRow(2, 1, [
    "Ayşe Demir", "0532 123 45 67", ornekSonEgitim, "A2", ornekTeklifEgitimi, "1", "Nakit", ornekOdeme2,
    safeSpreadsheetText(ilkKampanya?.kampanyaAdi || "Aktif şubedeki kampanya adını birebir yazın"),
  ]);
  styleRow(veriSayfasi, 1, "#F26207", "#FFFFFF", true, 9);
  veriSayfasi.setRowHeight(1, 24).setRowHeight(2, 34);

  // Geçmiş eğitim (C) ve zorunlu teklif eğitimi (E), güncel Eğitim Tipleri
  // Yönetimi listesinden seçilir. Liste Excel sınırına sığmazsa parser/server
  // doğrulaması yine zorunludur.
  if (egitimTipleri.length > 0) {
    const listeMetni = egitimTipleri.join(",");
    if (listeMetni.length <= 255) {
      [
        ["C2:C1001", "Geçmiş eğitim zorunludur", "Öğrencinin geçmiş eğitim bilgisini listeden seçin."],
        ["E2:E1001", "Teklif Eğitimi zorunludur", "Teklif eğitimini güncel listeden seçin."],
      ].forEach(([range, errorTitle, error]) => {
        veriSayfasi.addDataValidation(range, {
          type: "list",
          list: egitimTipleri,
          showDropDown: true,
          allowBlank: false,
          showErrorAlert: true,
          errorTitle,
          error,
        } as any);
      });
    }
  }
  const sonEgitimKurali = egitimTipleri.length > 0
    ? `Listeden seçin: ${egitimTipleri.join(" · ")}`
    : "Eğitim tiplerini yönetim ekranından ekleyin.";
  const tumKurler = benzersiz(guncelKampanyalar.flatMap(teklifeAcikKurler).map(String));
  const tumOdemeSecenekleri = ["Nakit", ...benzersiz(guncelKampanyalar.flatMap(krediKartiEtiketleri)), ...benzersiz(guncelKampanyalar.flatMap(senetEtiketleri))];
  const rehberSatirlari: (string | number)[][] = [
    ["TOPLU TEKLİFLER — KULLANIM KILAVUZU"],
    [`Bu dosya indirildiği anda ${subeAdi ? `"${safeSpreadsheetText(subeAdi)}"` : "seçili şube"} için güncel kampanyalarla oluşturuldu.`],
    [],
    ["NASIL KULLANILIR?"],
    ["1", "Şube seçimini kontrol edin; ilk sayfadaki sütun adlarını değiştirmeyin."],
    ["2", "Teklif Eğitimi'ni seçin; Kampanya hücresinde yalnızca bu eğitime ait seçenekler gösterilir."],
    ["3", "Son sütundaki Kampanya listesinden seçim yapın; fiyatı elle yazmayın."],
    ["4", "Fiyat, ödeme sınırı ve hediyeler doğrulanmış kampanyadan gelir."],
    ["5", "Aynı telefon numarasını dosyada yalnızca bir kez kullanın."],
    [],
    ["SÜTUN KURALLARI"],
    ["Sütun adı", "Durum", "Kural", "Geçerli örnek"],
    ["Ad Soyad", "Zorunlu", "En az iki kelime.", "Ayşe Demir"],
    ["Telefon", "Zorunlu", "90XXXXXXXXXX biçimine normalize edilir.", "0532 123 45 67"],
    ["Öğrencinin Son Eğitimi (Geçmiş)", "Zorunlu", `Yalnız geçmiş bilgi ve kişiselleştirme içindir. ${sonEgitimKurali}`, ornekSonEgitim || "—"],
    ["Son Kur", "Zorunlu", "Serbest metin.", "A2"],
    ["Teklif Eğitimi", "Zorunlu", `Fiyatın eğitim tipi; kampanyayla birebir aynı olmalıdır. ${sonEgitimKurali}`, ornekTeklifEgitimi || "—"],
    ["Teklif Edilecek Kur", "Zorunlu", `İzinli değerler: ${tumKurler.join(" · ") || "Kampanya yok"}`, "3"],
    ["Ödeme 1", "Zorunlu", tumOdemeSecenekleri.join(" · ") || "Kampanya yok", "Nakit"],
    ["Ödeme 2", "Zorunlu", "Ödeme 1'den farklı olmalı.", "Kredi Kartı - 6 Taksit"],
    ["Kampanya", "Zorunlu", "Aktif şubedeki kampanyadan seçin; Teklif Eğitimi ile eşleşmelidir.", ilkKampanya?.kampanyaAdi || "—"],
    [],
    ["GEÇMİŞ EĞİTİM VE TEKLİF EĞİTİMİ AYRIMI"],
    ["Geçmiş eğitim", "Öğrencinin daha önce aldığı eğitimdir; fiyatı veya teklif eğitimini belirlemez."],
    ["Teklif eğitimi", "Sunulan programın eğitim tipidir; kampanya ve tüm fiyat kuralları bununla doğrulanır."],
    ["Genel Almanca örneği", "Geçmiş eğitim Genel Almanca olsun veya olmasın, Teklif Eğitimi Genel Almanca ise 1+1 KUR ALMANCA kampanyasını seçin."],
    ["Genel İngilizce örneği", "Teklif Eğitimi Genel İngilizce ise 1+1 KAMPANYASI kampanyasını seçin."],
    [],
    ["GÜNCEL KAMPANYALAR VE GEÇERLİ ALTERNATİFLER"],
    ["Kampanya adı", "Eğitim tipi", "Toplam kur", "Kullanılabilecek kur", "Nakit", "Kredi kartı", "Senet", "Teklif notu"],
    ...(guncelKampanyalar.length
      ? guncelKampanyalar.map((kampanya) => [
          safeSpreadsheetText(kampanya.kampanyaAdi), safeSpreadsheetText(kampanya.egitimTipi), Number(kampanya.kurSayisi || 0),
          teklifeAcikKurler(kampanya).join(" · ") || "Yok", "Var — Nakit",
          krediKartiEtiketleri(kampanya).join(" · ") || "Yok", senetEtiketleri(kampanya).join(" · ") || "Yok",
          safeSpreadsheetText(kampanyaHesaplamaNotu(kampanya)),
        ])
      : [["Aktif şubede güncel kampanya bulunamadı.", "", "", "", "", "", "", "Şubeyi ve kampanyaları kontrol edin."]]),
    [],
    ["ÖNEMLİ UYARILAR"],
    ["Fiyat", "Fiyat/liste fiyatı/tutar sütunu eklemeyin."],
    ["Kampanya uyumu", "Teklif Eğitimi, kur ve ödeme seçeneği aynı satırdaki kampanyanın eğitim tipi ve sınırlarına uymalıdır."],
    ["Mükerrer telefon", "Aynı normalize telefon numarası birden fazla olamaz."],
  ];

  const rehber = workbook.addSheet("Kullanım Kılavuzu");
  [30, 18, 42, 58, 30, 52, 52, 48].forEach((width, index) => rehber.setColumnWidth(index + 1, width));
  rehberSatirlari.forEach((row, index) => rehber.writeRow(index + 1, 1, row));
  rehber.merge(1, 1, 1, 8).merge(2, 1, 2, 8).freeze(22, 0);
  rehberSatirlari
    .map((row, index) => row.length === 1 ? index + 1 : 0)
    .filter(Boolean)
    .forEach((rowNumber) => {
    rehber.merge(rowNumber, 1, rowNumber, 8);
    styleRow(rehber, rowNumber, "#2F75B5", "#FFFFFF", true);
  });
  styleRow(rehber, 1, "#1F4E78", "#FFFFFF", true);
  styleRow(rehber, 2, "#D9EAF7");
  styleRow(rehber, 11, "#F26207", "#FFFFFF", true);
  styleRow(rehber, 22, "#F26207", "#FFFFFF", true);
  rehber.setRowHeight(1, 30).setRowHeight(2, 34);

  // Kampanya listesini Teklif Eğitimi (E) hücresine bağlayan yardımcı alan.
  // Yardımcı listeler aynı görünür rehber sayfasında tutulur; böylece yükleme
  // güvenliği için gizli sayfa kullanmadan Excel'in bağımlı liste özelliğinden
  // yararlanılır.
  const egitimAdlari = benzersiz([
    ...egitimTipleri.map(metin),
    ...guncelKampanyalar.map((kampanya) => metin(kampanya?.egitimTipi)),
  ]);
  if (egitimAdlari.length > 0) {
    const mappingColumn = 10; // J
    const rangeNameColumn = 11; // K
    const listColumn = 12; // L
    let nextListRow = 2;
    rehber.writeRow(1, mappingColumn, ["Teklif Eğitimi", "Kampanya liste adı"]);
    rehber.writeRow(1, listColumn, ["Eğitime bağlı kampanya seçenekleri", "Teklif Eğitimi"]);
    egitimAdlari.forEach((egitimAdi, index) => {
      const row = index + 2;
      const rangeName = `SalesTime_Kampanya_${index + 1}`;
      const kampanyaAdlari = benzersiz(
        guncelKampanyalar
          .filter((kampanya) => egitimAnahtari(kampanya?.egitimTipi) === egitimAnahtari(egitimAdi))
          .map((kampanya) => metin(kampanya?.kampanyaAdi)),
      );
      rehber.setValue(row, mappingColumn, safeSpreadsheetText(egitimAdi));
      rehber.setValue(row, rangeNameColumn, rangeName);
      const values = kampanyaAdlari.length ? kampanyaAdlari : [""];
      const listStartRow = nextListRow;
      values.forEach((kampanyaAdi) => {
        rehber.setValue(nextListRow, listColumn, safeSpreadsheetText(kampanyaAdi));
        rehber.setValue(nextListRow, listColumn + 1, safeSpreadsheetText(egitimAdi));
        nextListRow += 1;
      });
      workbook.addNamedRange({
        name: rangeName,
        ref: `'Kullanım Kılavuzu'!$L$${listStartRow}:$L$${nextListRow - 1}`,
      });
    });
    const mappingEndRow = egitimAdlari.length + 1;
    veriSayfasi.addDataValidation("I2:I1001", {
      type: "list",
      formula1: `INDIRECT(VLOOKUP($E2,'Kullanım Kılavuzu'!$J$2:$K$${mappingEndRow},2,FALSE))`,
      showDropDown: true,
      allowBlank: false,
      showErrorAlert: true,
      errorTitle: "Kampanya eğitimle uyuşmuyor",
      error: "Önce Teklif Eğitimi'ni seçin, ardından bu eğitime ait kampanyalardan birini seçin.",
    } as any);
  }
  return workbook;
}

export async function topluTeklifSablonuIndir(baglami: TopluTeklifSablonuBaglami = {}): Promise<void> {
  const workbook = topluTeklifSablonuOlustur(baglami);
  const blob = new Blob([await workbook.build()], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "toplu-teklifler-sablonu.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function topluTeklifExceliniOku(file: File, kampanyalar: any[], egitimTipleri: string[] = []): Promise<TopluTeklifSatiri[]> {
  const workbook = await loadSafeXlsx(file, KOLONLAR, {
    headerMismatchMessage: "Eksik veya eski Toplu Teklifler şablonu. “Teklif Eğitimi” sütunu zorunludur; güncel şablonu indirin.",
  });
  const satirlar = worksheetRowsAsRecords(workbook.getSheetByIndex(0)!, KOLONLAR);
  if (satirlar.length > 1_000) throw new Error("Bir dosyada en fazla 1.000 teklif satırı olabilir.");

  // Doğrulama için eğitim tipi adlarını küçük harfle normalize et (Türkçe locale).
  const gecerliEgitimTipleri = egitimTipleri.map((t) => t.trim().toLocaleLowerCase("tr"));

  const sonuc: TopluTeklifSatiri[] = satirlar
    .filter((ham) => {
      // Tüm anlamlı alanları boş olan satırlar kullanılmamış/boş satırlardır; atla.
      return KOLONLAR.some((kolon) => metin(ham[kolon as keyof typeof ham]).length > 0);
    })
    .map((ham, index) => {
    const adSoyad = metin(ham["Ad Soyad"]);
    const telefon = telefonuNormalizeEt(metin(ham.Telefon));
    const sonEgitim = metin(ham["Öğrencinin Son Eğitimi (Geçmiş)"]);
    const sonKur = metin(ham["Son Kur"]);
    const teklifEgitimi = metin(ham["Teklif Eğitimi"]);
    const teklifKur = kuruAyikla(metin(ham["Teklif Edilecek Kur"]));
    const odeme1Raw = metin(ham["Ödeme 1"]);
    const odeme2Raw = metin(ham["Ödeme 2"]);
    const kampanyaAdi = metin(ham.Kampanya);
    const kampanya = kampanyalar.find((k) =>
      String(k.kampanyaAdi).trim().toLocaleLowerCase("tr") === kampanyaAdi.toLocaleLowerCase("tr"),
    );
    const odeme1 = odemePlaniniAyikla(odeme1Raw);
    const odeme2 = odemePlaniniAyikla(odeme2Raw);
    const hatalar: string[] = [];
    const beklenen: string[] = [];
    if (adSoyad.split(/\s+/).length < 2 || adSoyad.length > 150) { hatalar.push("Ad soyad geçersiz."); beklenen.push("En az ad ve soyad yazın."); }
    if (telefon.length < 12 || telefon.length > 15 || !telefon.startsWith("90")) { hatalar.push("Telefon geçersiz."); beklenen.push("05xx xxx xx xx veya 90xxxxxxxxxx biçimi."); }
    if (!sonEgitim) {
      hatalar.push("Öğrencinin Son Eğitimi (Geçmiş) zorunludur."); beklenen.push(`İzinli değerler: ${egitimTipleri.length ? egitimTipleri.join(", ") : "eğitim tiplerini yönetim ekranından ekleyin"}`);
    } else if (sonEgitim.length > 120) {
      hatalar.push("Son eğitim geçersiz."); beklenen.push("En fazla 120 karakter yazın.");
    } else if (gecerliEgitimTipleri.length > 0 && !gecerliEgitimTipleri.includes(sonEgitim.toLocaleLowerCase("tr"))) {
      hatalar.push(`Öğrencinin geçmiş eğitimi "${sonEgitim}" tanımlı eğitim tiplerinden biri değil.`);
      beklenen.push(`İzinli değerler: ${egitimTipleri.join(", ")}`);
    }
    if (!teklifEgitimi) {
      hatalar.push("Teklif Eğitimi zorunludur.");
      beklenen.push(`İzinli değerler: ${egitimTipleri.length ? egitimTipleri.join(", ") : "eğitim tiplerini yönetim ekranından ekleyin"}`);
    } else if (teklifEgitimi.length > 120) {
      hatalar.push("Teklif Eğitimi geçersiz.");
      beklenen.push("En fazla 120 karakter yazın.");
    } else if (gecerliEgitimTipleri.length > 0 && !gecerliEgitimTipleri.includes(teklifEgitimi.toLocaleLowerCase("tr"))) {
      hatalar.push(`Teklif Eğitimi "${teklifEgitimi}" tanımlı eğitim tiplerinden biri değil.`);
      beklenen.push(`İzinli değerler: ${egitimTipleri.join(", ")}`);
    }
    if (!sonKur || sonKur.length > 60) { hatalar.push("Son kur geçersiz."); beklenen.push("En fazla 60 karakter yazın."); }
    if (!teklifKur) { hatalar.push("Teklif edilecek kur geçersiz."); beklenen.push("1–24 arası pozitif tam sayı yazın."); }
    if (!kampanya) { hatalar.push("Kampanya bulunamadı."); beklenen.push("Seçili şubedeki kampanya adını birebir yazın."); }
    if (kampanya && teklifEgitimi && String(kampanya.egitimTipi).trim().toLocaleLowerCase("tr") !== teklifEgitimi.toLocaleLowerCase("tr")) {
      hatalar.push(`Teklif Eğitimi ${teklifEgitimi} ancak seçilen ${kampanya.kampanyaAdi} ${kampanya.egitimTipi} içindir.`);
      beklenen.push(`${kampanya.egitimTipi} kampanyası seçin veya Teklif Eğitimi'ni ${kampanya.egitimTipi} yapın.`);
    }
    if (!odeme1) { hatalar.push("Ödeme 1 geçersiz."); beklenen.push("Nakit, Kredi Kartı - 6 Taksit veya Senet - 6 Taksit."); }
    if (!odeme2) { hatalar.push("Ödeme 2 geçersiz."); beklenen.push("Nakit, Kredi Kartı - 6 Taksit veya Senet - 6 Taksit."); }
    if (odeme1 && odeme2 && odeme1.etiket === odeme2.etiket) { hatalar.push("İki ödeme alternatifi aynı."); beklenen.push("Ödeme 1 ve Ödeme 2 farklı olmalı."); }
    for (const [odeme, alan] of [[odeme1, "Ödeme 1"], [odeme2, "Ödeme 2"]] as const) {
      const limit = odeme?.odemeTipi === "kredi-karti" ? Number(kampanya?.maxKrediKartiTaksit) : odeme?.odemeTipi === "senet" ? Number(kampanya?.maxSenetTaksit) : 1;
      if (kampanya && odeme && odeme.taksitSayisi > limit) { hatalar.push(`${alan} taksit limiti aşıyor.`); beklenen.push(`En fazla ${limit} taksit.`); }
    }
    if (kampanya && teklifKur && teklifKur > Number(kampanya.kurSayisi)) { hatalar.push("Teklif kur sayısı kampanya limitini aşıyor."); beklenen.push(`En fazla ${kampanya.kurSayisi} kur kullanın.`); }
    return {
      id: `excel-${index + 2}`, sira: index + 2, adSoyad, telefon, sonEgitim, sonKur, teklifEgitimi, teklifKur, odeme1Raw, odeme2Raw, kampanyaAdi,
      kampanya, odeme1: odeme1 || undefined, odeme2: odeme2 || undefined, hatalar, beklenen,
      durum: hatalar.length ? "duzeltmeli" as const : "hazir" as const,
    };
  });

  const telefonSayilari = new Map<string, number>();
  sonuc.forEach((satir) => {
    if (satir.telefon.length >= 12) telefonSayilari.set(satir.telefon, (telefonSayilari.get(satir.telefon) || 0) + 1);
  });
  sonuc.forEach((satir) => {
    if (telefonSayilari.get(satir.telefon)! > 1) {
      satir.durum = "mukerrer";
      satir.hatalar.push("Bu telefon numarası dosyada birden fazla kez yer alıyor.");
      satir.beklenen.push("Her telefon için yalnızca bir satır bırakın.");
    }
  });
  return sonuc;
}
