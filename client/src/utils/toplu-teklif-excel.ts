import * as XLSX from "xlsx";

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

const KOLONLAR = [
  "Ad Soyad",
  "Telefon",
  "Son Eğitim",
  "Son Kur",
  "Teklif Edilecek Kur",
  "Ödeme 1",
  "Ödeme 2",
  "Kampanya",
];

const metin = (deger: unknown) => String(deger ?? "").trim();

function telefonuNormalizeEt(deger: string): string {
  let rakamlar = deger.replace(/\D/g, "");
  if (rakamlar.startsWith("00")) rakamlar = rakamlar.slice(2);
  if (rakamlar.length === 10) return `90${rakamlar}`;
  if (rakamlar.length === 11 && rakamlar.startsWith("0")) return `90${rakamlar.slice(1)}`;
  return rakamlar;
}

function kuruAyikla(deger: string): number | null {
  const match = deger.replace(",", ".").match(/\d+/);
  if (!match) return null;
  const kur = Number(match[0]);
  return Number.isInteger(kur) && kur > 0 ? kur : null;
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

export function topluTeklifSablonuIndir(): void {
  const ornekler = [
    {
      "Ad Soyad": "Ayşe Demir",
      Telefon: "0532 123 45 67",
      "Son Eğitim": "Lise",
      "Son Kur": "A2",
      "Teklif Edilecek Kur": "4",
      "Ödeme 1": "Nakit",
      "Ödeme 2": "Kredi Kartı - 6 Taksit",
      Kampanya: "Kampanya adını buraya yazın",
    },
  ];
  const veriSayfasi = XLSX.utils.json_to_sheet(ornekler, { header: KOLONLAR });
  veriSayfasi["!cols"] = [
    { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 13 },
    { wch: 20 }, { wch: 28 }, { wch: 28 }, { wch: 34 },
  ];
  veriSayfasi["!autofilter"] = { ref: "A1:H2" };

  const rehber = XLSX.utils.aoa_to_sheet([
    ["TOPLU TEKLİFLER — KULLANIM KILAVUZU"],
    [""],
    ["Sütun", "Açıklama / Geçerli örnek"],
    ["Ad Soyad", "Zorunlu. En az ad ve soyad olacak şekilde yazın. Örn: Ayşe Demir"],
    ["Telefon", "Zorunlu. Türkiye numarası 05xx xxx xx xx veya 90xxxxxxxxxx biçiminde yazılabilir."],
    ["Son Eğitim", "Zorunlu. Örn: Lise, Üniversite, Mezun"],
    ["Son Kur", "Zorunlu. Örn: A2, B1, Başlangıç"],
    ["Teklif Edilecek Kur", "Zorunlu. Pozitif tam sayı. Örn: 4 veya 4 Kur"],
    ["Ödeme 1", "Zorunlu. Nakit | Kredi Kartı - 3 Taksit | Senet - 6 Taksit"],
    ["Ödeme 2", "Zorunlu. Ödeme 1'den farklı ikinci alternatif. Aynı biçimler geçerlidir."],
    ["Kampanya", "Zorunlu. Seçili şubedeki kampanya adıyla birebir eşleşmelidir."],
    [""],
    ["Önemli", "Fiyat sütunu eklemeyin. Tutarlar SalesTime'daki güncel kampanya ve taksit kurallarıyla hesaplanır."],
    ["Önemli", "Aynı telefon numarası aynı dosyada yalnızca bir kez bulunabilir. Mükerrer ve hatalı satırlar gönderime alınmaz."],
  ]);
  rehber["!cols"] = [{ wch: 24 }, { wch: 105 }];
  rehber["!rows"] = [{ hpt: 26 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, veriSayfasi, "Teklif Listesi");
  XLSX.utils.book_append_sheet(workbook, rehber, "Kullanım Kılavuzu");
  XLSX.writeFile(workbook, "toplu-teklifler-sablonu.xlsx");
}

export async function topluTeklifExceliniOku(file: File, kampanyalar: any[]): Promise<TopluTeklifSatiri[]> {
  const veri = await file.arrayBuffer();
  const workbook = XLSX.read(veri, { type: "array" });
  const ilkSayfa = workbook.Sheets[workbook.SheetNames[0]];
  if (!ilkSayfa) throw new Error("Excel dosyasında okunabilir bir sayfa bulunamadı.");
  const satirlar = XLSX.utils.sheet_to_json<Record<string, unknown>>(ilkSayfa, { defval: "" });

  const sonuc: TopluTeklifSatiri[] = satirlar.map((ham, index) => {
    const adSoyad = metin(ham["Ad Soyad"]);
    const telefon = telefonuNormalizeEt(metin(ham.Telefon));
    const sonEgitim = metin(ham["Son Eğitim"]);
    const sonKur = metin(ham["Son Kur"]);
    const teklifKur = kuruAyikla(metin(ham["Teklif Edilecek Kur"]));
    const odeme1Raw = metin(ham["Ödeme 1"]);
    const odeme2Raw = metin(ham["Ödeme 2"]);
    const kampanyaAdi = metin(ham.Kampanya);
    const kampanya = kampanyalar.find(
      (k) => String(k.kampanyaAdi).trim().toLocaleLowerCase("tr") === kampanyaAdi.toLocaleLowerCase("tr")
    );
    const odeme1 = odemePlaniniAyikla(odeme1Raw);
    const odeme2 = odemePlaniniAyikla(odeme2Raw);
    const hatalar: string[] = [];
    const beklenen: string[] = [];

    if (adSoyad.split(/\s+/).length < 2) {
      hatalar.push("Ad soyad eksik.");
      beklenen.push("En az ad ve soyad yazın.");
    }
    if (telefon.length < 12 || telefon.length > 15 || !telefon.startsWith("90")) {
      hatalar.push("Telefon geçersiz.");
      beklenen.push("05xx xxx xx xx veya 90xxxxxxxxxx biçimi.");
    }
    if (!sonEgitim) { hatalar.push("Son eğitim boş."); beklenen.push("Örn: Lise veya Üniversite."); }
    if (!sonKur) { hatalar.push("Son kur boş."); beklenen.push("Örn: A2 veya B1."); }
    if (!teklifKur) { hatalar.push("Teklif edilecek kur geçersiz."); beklenen.push("Pozitif tam sayı; örn: 4 Kur."); }
    if (!kampanya) { hatalar.push("Kampanya bulunamadı."); beklenen.push("Seçili şubedeki kampanya adını birebir yazın."); }
    if (!odeme1) { hatalar.push("Ödeme 1 geçersiz."); beklenen.push("Nakit, Kredi Kartı - 6 Taksit veya Senet - 6 Taksit."); }
    if (!odeme2) { hatalar.push("Ödeme 2 geçersiz."); beklenen.push("Nakit, Kredi Kartı - 6 Taksit veya Senet - 6 Taksit."); }
    if (odeme1 && odeme2 && odeme1.etiket === odeme2.etiket) {
      hatalar.push("İki ödeme alternatifi aynı.");
      beklenen.push("Ödeme 1 ve Ödeme 2 farklı olmalı.");
    }
    if (kampanya && teklifKur && teklifKur > Number(kampanya.kurSayisi)) {
      hatalar.push("Teklif kur sayısı kampanya limitini aşıyor.");
      beklenen.push(`Bu kampanya için en fazla ${kampanya.kurSayisi} kur kullanın.`);
    }
    if (kampanya && odeme1 && odeme1.odemeTipi === "kredi-karti" && odeme1.taksitSayisi > Number(kampanya.maxKrediKartiTaksit)) {
      hatalar.push("Ödeme 1 kart taksit limiti aşıyor.");
      beklenen.push(`En fazla ${kampanya.maxKrediKartiTaksit} kart taksiti.`);
    }
    if (kampanya && odeme2 && odeme2.odemeTipi === "kredi-karti" && odeme2.taksitSayisi > Number(kampanya.maxKrediKartiTaksit)) {
      hatalar.push("Ödeme 2 kart taksit limiti aşıyor.");
      beklenen.push(`En fazla ${kampanya.maxKrediKartiTaksit} kart taksiti.`);
    }
    if (kampanya && odeme1 && odeme1.odemeTipi === "senet" && odeme1.taksitSayisi > Number(kampanya.maxSenetTaksit)) {
      hatalar.push("Ödeme 1 senet taksit limiti aşıyor.");
      beklenen.push(`En fazla ${kampanya.maxSenetTaksit} senet taksiti.`);
    }
    if (kampanya && odeme2 && odeme2.odemeTipi === "senet" && odeme2.taksitSayisi > Number(kampanya.maxSenetTaksit)) {
      hatalar.push("Ödeme 2 senet taksit limiti aşıyor.");
      beklenen.push(`En fazla ${kampanya.maxSenetTaksit} senet taksiti.`);
    }

    return {
      id: `excel-${index + 2}`,
      sira: index + 2,
      adSoyad, telefon, sonEgitim, sonKur, teklifKur, odeme1Raw, odeme2Raw, kampanyaAdi,
      kampanya, odeme1: odeme1 || undefined, odeme2: odeme2 || undefined, hatalar, beklenen,
      durum: hatalar.length ? "duzeltmeli" : "hazir",
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