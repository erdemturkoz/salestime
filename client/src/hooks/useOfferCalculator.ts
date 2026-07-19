import { calculateInstallments } from "@/utils/calculator";
import { OfferFormState, OfferResult } from "@/types/offer-types";

interface KampanyaData {
  id: string | number;
  kampanyaAdi: string;
  egitimTipi: string;
  kurSayisi: number;
  toplamDersSaati: number;
  listeFiyati: number;
  nakitFiyati: number;
  faizOrani: number;
  kitapFiyati: number;
  kitapSetSayisi?: number;
  maxKrediKartiTaksit: number;
  maxSenetTaksit: number;
  hediyeler: Array<{ isim: string; fiyat: number }>;
}

export function computeOffer(
  form: OfferFormState,
  kampanya: KampanyaData,
  extra: {
    id: string;
    title: string;
    customName?: string;
    isRecommended?: boolean;
    kitapHediyeEdildi?: boolean;
    hediyeEdildi?: Record<string, boolean>;
  }
): OfferResult {
  const {
    kurSayisi,
    odemeTipi,
    taksitSayisi,
    kitapDahil,
    mudurIndirimTipi,
    mudurIndirimDegeri,
    pesinat,
  } = form;

  const selectedKur = kurSayisi ?? kampanya.kurSayisi;
  const kurOrani = selectedKur / kampanya.kurSayisi;
  const listeF = kampanya.listeFiyati * kurOrani;
  const nakitF = kampanya.nakitFiyati * kurOrani;
  const kitapF = kitapDahil
    ? kampanya.kitapFiyati * (kampanya.kitapSetSayisi || 1)
    : 0;
  const hediyelerToplam = kampanya.hediyeler.reduce(
    (t, h) => t + h.fiyat,
    0
  );

  let kampanyaFiyat = nakitF;
  let toplamFiyat = 0;
  let aylikOdeme = 0;
  let odemeTipiText = "";

  if (odemeTipi === "nakit") {
    odemeTipiText = "Nakit";
    kampanyaFiyat = Math.round(nakitF);
    toplamFiyat = Math.round(nakitF + kitapF + hediyelerToplam);
    aylikOdeme = toplamFiyat;
  } else if (odemeTipi === "kredi-karti") {
    odemeTipiText = "Kredi Kartı";
    const hesap = calculateInstallments(
      nakitF,
      kampanya.faizOrani,
      [taksitSayisi]
    );
    if (hesap.length > 0) {
      kampanyaFiyat = Math.round(hesap[0].toplamTutar);
      toplamFiyat = Math.round(kampanyaFiyat + kitapF + hediyelerToplam);
      aylikOdeme =
        taksitSayisi === 1
          ? toplamFiyat
          : Math.round(toplamFiyat / taksitSayisi);
    }
  } else if (odemeTipi === "senet") {
    odemeTipiText = "Senet";
    const hesap = calculateInstallments(
      nakitF,
      kampanya.faizOrani,
      [taksitSayisi],
      0
    );
    if (hesap.length > 0) {
      kampanyaFiyat = Math.round(hesap[0].toplamTutar);
      toplamFiyat = Math.round(kampanyaFiyat + kitapF + hediyelerToplam);
      aylikOdeme = Math.round(toplamFiyat / taksitSayisi);
    }
  }

  const indirimT = listeF - kampanyaFiyat;
  const indirimY = listeF > 0 ? Math.round((indirimT / listeF) * 100) : 0;
  const genelToplam = toplamFiyat;

  let mudurIndirimTutari = 0;
  let ozelFiyat = genelToplam;
  if (mudurIndirimDegeri > 0) {
    if (mudurIndirimTipi === "miktar") {
      mudurIndirimTutari = Math.min(mudurIndirimDegeri, genelToplam);
    } else {
      const yuzde = Math.min(mudurIndirimDegeri, 100);
      mudurIndirimTutari = Math.round((genelToplam * yuzde) / 100);
    }
    ozelFiyat = genelToplam - mudurIndirimTutari;
    if (taksitSayisi > 1) {
      aylikOdeme = Math.round(ozelFiyat / taksitSayisi);
    }
  }

  // Peşinat hesabı — genel toplamı değiştirmez, taksit tutarını etkiler
  const effectiveFiyat = ozelFiyat;
  const safePesinat = Math.min(pesinat, effectiveFiyat);
  const kalanTutar = effectiveFiyat - safePesinat;
  const finalAylikOdeme =
    odemeTipi === "nakit"
      ? effectiveFiyat
      : taksitSayisi > 1
      ? Math.round(kalanTutar / taksitSayisi)
      : kalanTutar;

  // Hediye durumları yeniden hesaplama desteği
  const kitapHediyeEdildi = extra.kitapHediyeEdildi ?? false;
  const hediyeEdildi = extra.hediyeEdildi ?? {};

  // Hediye toggle sonrası genel toplam düzeltmesi
  let duzeltilmisGenelToplam = genelToplam;
  if (kitapHediyeEdildi && kitapF > 0) {
    duzeltilmisGenelToplam -= kitapF;
  }
  kampanya.hediyeler.forEach((h) => {
    if (hediyeEdildi[h.isim] && h.fiyat > 0) {
      duzeltilmisGenelToplam -= h.fiyat;
    }
  });
  let duzeltilmisOzelFiyat =
    mudurIndirimTutari > 0
      ? duzeltilmisGenelToplam - mudurIndirimTutari
      : duzeltilmisGenelToplam;
  if (duzeltilmisOzelFiyat < 0) duzeltilmisOzelFiyat = 0;

  const duzeltilmisKalan = duzeltilmisOzelFiyat - safePesinat;
  const duzeltilmisAylik =
    odemeTipi === "nakit"
      ? duzeltilmisOzelFiyat
      : taksitSayisi > 1
      ? Math.round(duzeltilmisKalan / taksitSayisi)
      : duzeltilmisKalan;

  return {
    id: extra.id,
    title: extra.title,
    customName: extra.customName ?? "",
    form,
    listeFiyati: Math.round(listeF),
    indirimTutari: Math.round(indirimT),
    indirimYuzdesi: indirimY,
    kampanyaliFiyat: kampanyaFiyat,
    kitapUcreti: kitapF,
    hediyeler: kampanya.hediyeler,
    genelToplam: duzeltilmisGenelToplam,
    mudurIndirimTutari,
    ozelFiyat: duzeltilmisOzelFiyat,
    pesinat: safePesinat,
    kalanTutar: Math.max(0, duzeltilmisKalan),
    aylikOdeme: duzeltilmisAylik,
    odemeTipiText,
    kampanyaAdi: kampanya.kampanyaAdi,
    egitimTipi: kampanya.egitimTipi,
    kurSayisi: selectedKur,
    dersSaati: kampanya.toplamDersSaati,
    isRecommended: extra.isRecommended ?? false,
    kitapHediyeEdildi,
    hediyeEdildi,
  };
}

export function getTaksitOptions(
  odemeTipi: string,
  kampanya: KampanyaData
): number[] {
  if (odemeTipi === "kredi-karti") {
    const opts = [1];
    if (kampanya.maxKrediKartiTaksit >= 2) opts.push(2);
    if (kampanya.maxKrediKartiTaksit >= 4) opts.push(4);
    if (kampanya.maxKrediKartiTaksit >= 6) opts.push(6);
    if (kampanya.maxKrediKartiTaksit >= 8) opts.push(8);
    if (kampanya.maxKrediKartiTaksit >= 10) opts.push(10);
    return opts;
  }
  if (odemeTipi === "senet") {
    const opts: number[] = [];
    if (kampanya.maxSenetTaksit >= 2) opts.push(2);
    if (kampanya.maxSenetTaksit >= 4) opts.push(4);
    if (kampanya.maxSenetTaksit >= 6) opts.push(6);
    if (kampanya.maxSenetTaksit >= 8) opts.push(8);
    if (kampanya.maxSenetTaksit >= 10) opts.push(10);
    if (kampanya.maxSenetTaksit >= 12) opts.push(12);
    return opts;
  }
  return [];
}
