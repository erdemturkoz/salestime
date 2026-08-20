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

export type TopluTeklifSablonuBaglami = {
  subeAdi?: string;
  kampanyalar?: any[];
};

const sayiyiSinirla = (deger: unknown, ustSinir: number) =>
  Math.max(0, Math.min(ustSinir, Math.floor(Number(deger) || 0)));

const aralik = (son: number) => Array.from({ length: son }, (_, index) => index + 1);

const teklifeAcikKurler = (kampanya: any) => aralik(sayiyiSinirla(kampanya?.kurSayisi, 99));

const krediKartiEtiketleri = (kampanya: any) =>
  aralik(sayiyiSinirla(kampanya?.maxKrediKartiTaksit, 24)).map((taksit) => `Kredi Kartı - ${taksit} Taksit`);

const senetEtiketleri = (kampanya: any) =>
  aralik(sayiyiSinirla(kampanya?.maxSenetTaksit, 24)).map((taksit) => `Senet - ${taksit} Taksit`);

const benzersiz = (degerler: string[]) => Array.from(new Set(degerler.filter(Boolean)));

function kampanyaHesaplamaNotu(kampanya: any): string {
  const notlar: string[] = [];
  const kitapFiyati = Number(kampanya?.kitapFiyati || 0);
  const kitapSetSayisi = Number(kampanya?.kitapSetSayisi || 0);
  if (kitapFiyati > 0) notlar.push(`Kitap: ${kitapSetSayisi || 1} set × ${kitapFiyati} TL`);
  const hediyeler = Array.isArray(kampanya?.hediyeler) ? kampanya.hediyeler : [];
  if (hediyeler.length) notlar.push(`Hediyeler: ${hediyeler.map((hediye: any) => hediye.isim).filter(Boolean).join(", ")}`);
  return notlar.length ? notlar.join(" · ") : "Ek kitap/hediye notu yok.";
}

function satiriStille(sheet: XLSX.WorkSheet, satir: number, sutunSayisi: number, style: any) {
  for (let sutun = 0; sutun < sutunSayisi; sutun++) {
    const adres = XLSX.utils.encode_cell({ r: satir, c: sutun });
    if (!sheet[adres]) sheet[adres] = { t: "s", v: "" };
    sheet[adres].s = style;
  }
}

function sutunBasliklariniStille(sheet: XLSX.WorkSheet, satir: number, sutunSayisi: number) {
  satiriStille(sheet, satir, sutunSayisi, {
    fill: { fgColor: { rgb: "F26207" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { vertical: "center", wrapText: true },
  });
}

export function topluTeklifSablonuOlustur({ subeAdi, kampanyalar = [] }: TopluTeklifSablonuBaglami = {}) {
  const guncelKampanyalar = [...kampanyalar].sort((a, b) =>
    String(a.kampanyaAdi || "").localeCompare(String(b.kampanyaAdi || ""), "tr")
  );
  const ilkKampanya = guncelKampanyalar[0];
  const ilkKartSecenegi = ilkKampanya ? krediKartiEtiketleri(ilkKampanya)[0] : "";
  const ilkSenetSecenegi = ilkKampanya ? senetEtiketleri(ilkKampanya)[0] : "";
  const ornekOdeme2 = ilkKartSecenegi || ilkSenetSecenegi || "Kredi Kartı - 1 Taksit";
  const ornekler = [{
    "Ad Soyad": "Ayşe Demir",
    Telefon: "0532 123 45 67",
    "Son Eğitim": "Lise",
    "Son Kur": "A2",
    "Teklif Edilecek Kur": "1",
    "Ödeme 1": "Nakit",
    "Ödeme 2": ornekOdeme2,
    Kampanya: ilkKampanya?.kampanyaAdi || "Aktif şubedeki kampanya adını birebir yazın",
  }];
  const veriSayfasi = XLSX.utils.json_to_sheet(ornekler, { header: KOLONLAR });
  veriSayfasi["!cols"] = [
    { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 13 },
    { wch: 20 }, { wch: 28 }, { wch: 28 }, { wch: 38 },
  ];
  veriSayfasi["!autofilter"] = { ref: "A1:H2" };
  veriSayfasi["!freeze"] = { xSplit: 0, ySplit: 1 };
  sutunBasliklariniStille(veriSayfasi, 0, KOLONLAR.length);
  satiriStille(veriSayfasi, 1, KOLONLAR.length, { alignment: { vertical: "center", wrapText: true } });
  veriSayfasi["!rows"] = [{ hpt: 24 }, { hpt: 34 }];

  const tumKurler = benzersiz(guncelKampanyalar.flatMap(teklifeAcikKurler).map(String));
  const tumKartSecenekleri = benzersiz(guncelKampanyalar.flatMap(krediKartiEtiketleri));
  const tumSenetSecenekleri = benzersiz(guncelKampanyalar.flatMap(senetEtiketleri));
  const tumOdemeSecenekleri = ["Nakit", ...tumKartSecenekleri, ...tumSenetSecenekleri];
  const kampanyaAdlari = guncelKampanyalar.map((kampanya) => String(kampanya.kampanyaAdi || ""));

  const rehberSatirlari: (string | number)[][] = [];
  const bolumSatirlari: number[] = [];
  const ekleBolum = (baslik: string) => {
    bolumSatirlari.push(rehberSatirlari.length);
    rehberSatirlari.push([baslik]);
  };

  rehberSatirlari.push(["TOPLU TEKLİFLER — KULLANIM KILAVUZU"]);
  rehberSatirlari.push([`Bu dosya indirildiği anda ${subeAdi ? `"${subeAdi}"` : "seçili şube"} için güncel kampanyalarla oluşturuldu.`]);
  rehberSatirlari.push([]);
  ekleBolum("NASIL KULLANILIR?");
  rehberSatirlari.push(["1", "Şube seçimini kontrol edin. Bu kılavuzdaki kampanyalar yalnızca seçili/aktif şube için geçerlidir."]);
  rehberSatirlari.push(["2", "Aşağıdaki “Güncel Kampanyalar ve Geçerli Alternatifler” tablosundan kampanya adını kopyalayın."]);
  rehberSatirlari.push(["3", "Kampanya satırındaki izinli kur ve ödeme değerlerini ilk sayfaya birebir yazın."]);
  rehberSatirlari.push(["4", "Fiyat sütunu eklemeyin; fiyatlar SalesTime tarafından güncel kampanya kurallarıyla hesaplanır."]);
  rehberSatirlari.push(["5", "Aynı dosyada aynı telefon numarasını yalnızca bir kez kullanın."]);
  rehberSatirlari.push([]);
  ekleBolum("SÜTUN KURALLARI");
  const sutunBaslikSatiri = rehberSatirlari.length;
  rehberSatirlari.push(["Sütun adı", "Durum", "Tam yazım kuralı", "Kabul edilen tüm alternatifler", "Geçerli örnek", "Geçersiz örnek / dikkat"]);
  rehberSatirlari.push([
    "Ad Soyad", "Zorunlu", "En az iki kelime olacak şekilde ad ve soyad yazın.",
    "Serbest metin; ad + soyad zorunlu, ek ad/soyad yazılabilir.",
    "Ayşe Demir", "Ayşe → eksik; en az ad ve soyad gerekir.",
  ]);
  rehberSatirlari.push([
    "Telefon", "Zorunlu", "Rakamlar ayıklanır ve hedef biçim 90XXXXXXXXXX olur.",
    "05321234567 · 5321234567 · 905321234567 · +90 532 123 45 67 · 00905321234567",
    "0532 123 45 67 → 905321234567", "Başında 90 olmayan veya 12–15 rakam dışındaki değerler kabul edilmez.",
  ]);
  rehberSatirlari.push([
    "Son Eğitim", "Zorunlu", "Boş bırakmayın; bu alan serbest metindir.",
    "Sistem belirli bir liste doğrulamaz. Örn: Lise · Üniversite · Mezun · Ortaokul",
    "Lise", "Boş değer kabul edilmez; listedeki örnekler zorunlu seçenek değildir.",
  ]);
  rehberSatirlari.push([
    "Son Kur", "Zorunlu", "Boş bırakmayın; bu alan serbest metindir.",
    "Sistem belirli bir liste doğrulamaz. Örn: A2 · B1 · Başlangıç · Pre-Intermediate",
    "A2", "Boş değer kabul edilmez; listedeki örnekler zorunlu seçenek değildir.",
  ]);
  rehberSatirlari.push([
    "Teklif Edilecek Kur", "Zorunlu", "Pozitif tam sayı yazın. “4” veya “4 Kur” okunur; kampanya limitini aşmayın.",
    tumKurler.length ? tumKurler.join(" · ") : "Aktif şubede kampanya bulunamadı.",
    "3", "0 · iki · kampanya limitinden büyük sayı geçersizdir. Her kampanya için kesin liste aşağıdadır.",
  ]);
  rehberSatirlari.push([
    "Ödeme 1", "Zorunlu", "Önerilen tam yazım: Nakit veya “Kredi Kartı - N Taksit” / “Senet - N Taksit”.",
    tumOdemeSecenekleri.join(" · ") || "Aktif şubede kampanya bulunamadı.",
    "Kredi Kartı - 6 Taksit", "Taksit sayısı kampanya limitini aşamaz. Kesin seçenekleri kampanya satırından alın.",
  ]);
  rehberSatirlari.push([
    "Ödeme 2", "Zorunlu", "Ödeme 1 ile aynı tam yazım kuralını kullanın; iki değer farklı olmalı.",
    tumOdemeSecenekleri.join(" · ") || "Aktif şubede kampanya bulunamadı.",
    "Senet - 6 Taksit", "Ödeme 1 ile birebir aynı ödeme türü ve taksit sayısı olamaz.",
  ]);
  rehberSatirlari.push([
    "Kampanya", "Zorunlu", "Aşağıdaki aktif şube kampanya adını Excel’e birebir kopyalayın.",
    kampanyaAdlari.join(" · ") || "Aktif şubede kampanya bulunamadı.",
    ilkKampanya?.kampanyaAdi || "—", "Eski/başka şube kampanyası veya farklı yazım kabul edilmez.",
  ]);
  rehberSatirlari.push([]);
  ekleBolum("GÜNCEL KAMPANYALAR VE GEÇERLİ ALTERNATİFLER");
  const kampanyaBaslikSatiri = rehberSatirlari.length;
  rehberSatirlari.push([
    "Kampanya adı (Excel’e birebir yazın)", "Eğitim tipi", "Toplam kur", "Kullanılabilecek teklif kur sayıları",
    "Nakit", "Kredi kartı — izinli tam yazımlar", "Senet — izinli tam yazımlar", "Teklif hesaplama notu",
  ]);
  if (guncelKampanyalar.length) {
    guncelKampanyalar.forEach((kampanya) => {
      const kartlar = krediKartiEtiketleri(kampanya);
      const senetler = senetEtiketleri(kampanya);
      rehberSatirlari.push([
        String(kampanya.kampanyaAdi || ""), String(kampanya.egitimTipi || ""), Number(kampanya.kurSayisi || 0),
        teklifeAcikKurler(kampanya).join(" · ") || "Yok",
        "Var — Nakit",
        kartlar.length ? kartlar.join(" · ") : "Yok",
        senetler.length ? senetler.join(" · ") : "Yok",
        kampanyaHesaplamaNotu(kampanya),
      ]);
    });
  } else {
    rehberSatirlari.push(["Aktif şubede güncel kampanya bulunamadı.", "", "", "", "", "", "", "Şubeyi kontrol edin ve kampanyaları yenileyin."]);
  }
  rehberSatirlari.push([]);
  ekleBolum("ÖNEMLİ UYARILAR");
  rehberSatirlari.push(["Fiyat", "Fiyat/liste fiyatı/tutar sütunu eklemeyin. SalesTime teklif tutarını güncel kampanya verisiyle hesaplar."]);
  rehberSatirlari.push(["Kampanya uyumu", "Kur ve ödeme seçeneği yalnızca aynı satırda yazdığınız kampanyanın izin verdiği değerlerden olmalıdır."]);
  rehberSatirlari.push(["Mükerrer telefon", "Aynı normalize telefon numarası dosyada birden fazla kez yer alırsa satırlar gönderime alınmaz."]);

  const rehber = XLSX.utils.aoa_to_sheet(rehberSatirlari);
  rehber["!cols"] = [
    { wch: 26 }, { wch: 16 }, { wch: 39 }, { wch: 58 },
    { wch: 30 }, { wch: 54 }, { wch: 54 }, { wch: 48 },
  ];
  rehber["!rows"] = rehberSatirlari.map((satir, index) => ({
    hpt: index === 0 ? 30 : bolumSatirlari.includes(index) ? 22 : satir.length > 2 ? 50 : 34,
  }));
  rehber["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    ...bolumSatirlari.map((satir) => ({ s: { r: satir, c: 0 }, e: { r: satir, c: 7 } })),
  ];
  rehber["!freeze"] = { xSplit: 0, ySplit: kampanyaBaslikSatiri + 1 };
  const kampanyaSonSatir = kampanyaBaslikSatiri + Math.max(guncelKampanyalar.length, 1);
  rehber["!autofilter"] = { ref: `A${kampanyaBaslikSatiri + 1}:H${kampanyaSonSatir + 1}` };

  satiriStille(rehber, 0, 8, {
    fill: { fgColor: { rgb: "1F4E78" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
    alignment: { vertical: "center", horizontal: "center", wrapText: true },
  });
  satiriStille(rehber, 1, 8, {
    fill: { fgColor: { rgb: "D9EAF7" } },
    font: { italic: true, color: { rgb: "1F1F1F" } },
    alignment: { vertical: "center", wrapText: true },
  });
  bolumSatirlari.forEach((satir) => satiriStille(rehber, satir, 8, {
    fill: { fgColor: { rgb: "2F75B5" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { vertical: "center", wrapText: true },
  }));
  sutunBasliklariniStille(rehber, sutunBaslikSatiri, 6);
  sutunBasliklariniStille(rehber, kampanyaBaslikSatiri, 8);
  rehberSatirlari.forEach((_satir, index) => {
    if (![0, 1, sutunBaslikSatiri, kampanyaBaslikSatiri, ...bolumSatirlari].includes(index)) {
      satiriStille(rehber, index, 8, { alignment: { vertical: "top", wrapText: true } });
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, veriSayfasi, "Teklif Listesi");
  XLSX.utils.book_append_sheet(workbook, rehber, "Kullanım Kılavuzu");
  return workbook;
}

export function topluTeklifSablonuIndir(baglami: TopluTeklifSablonuBaglami = {}): void {
  const workbook = topluTeklifSablonuOlustur(baglami);
  XLSX.writeFile(workbook, "toplu-teklifler-sablonu.xlsx", { cellStyles: true });
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