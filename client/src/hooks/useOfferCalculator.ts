import { calculateInstallments } from "@/utils/calculator";
import { buildInstallmentSchedule } from "@/utils/installment-schedule";
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
  krediKartiKomisyonOrani?: number;
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
  const krediKartiKomisyonOrani = kampanya.krediKartiKomisyonOrani ?? 10;
  const kitapF = kitapDahil
    ? kampanya.kitapFiyati * (kampanya.kitapSetSayisi || 1)
    : 0;
  const hediyelerToplam = kampanya.hediyeler.reduce(
    (t, h) => t + h.fiyat,
    0
  );

  let kampanyaFiyat = nakitF;
  let krediKartiKomisyonTutari = 0;
  let taksitFaizTutari = 0;
  let toplamFiyat = 0;
  const installmentCount = Math.max(1, Math.floor(taksitSayisi || 1));
  let odemeTipiText = "";

  if (odemeTipi === "nakit") {
    odemeTipiText = "Nakit";
    kampanyaFiyat = Math.round(nakitF);
    toplamFiyat = Math.round(nakitF + kitapF + hediyelerToplam);
  } else if (odemeTipi === "kredi-karti") {
    odemeTipiText = "Kredi Kartı";
    const hesap = calculateInstallments(
      nakitF,
      kampanya.faizOrani,
      [installmentCount],
      krediKartiKomisyonOrani
    );
    if (hesap.length > 0) {
      kampanyaFiyat = Math.round(hesap[0].toplamTutar);
      toplamFiyat = Math.round(kampanyaFiyat + kitapF + hediyelerToplam);
      krediKartiKomisyonTutari = Math.round(hesap[0].komisyonTutari ?? 0);
      taksitFaizTutari = Math.max(
        0,
        kampanyaFiyat - Math.round(nakitF) - krediKartiKomisyonTutari,
      );
    }
  } else if (odemeTipi === "senet") {
    odemeTipiText = "Senet";
    const hesap = calculateInstallments(
      nakitF,
      kampanya.faizOrani,
      [installmentCount],
      0
    );
    if (hesap.length > 0) {
      kampanyaFiyat = Math.round(hesap[0].toplamTutar);
      toplamFiyat = Math.round(kampanyaFiyat + kitapF + hediyelerToplam);
      taksitFaizTutari = Math.max(0, kampanyaFiyat - Math.round(nakitF));
    }
  }

  const genelToplam = toplamFiyat;
  // Campaign discount is determined from the list price and campaign cash
  // price only. Gifts and payment-method financing are separate line items.
  const indirimT = Math.max(0, Math.round(listeF - nakitF));
  const indirimY = listeF > 0 ? Math.round((indirimT / listeF) * 100) : 0;

  let mudurIndirimTutari = 0;
  let ozelFiyat = genelToplam;
  if (mudurIndirimDegeri > 0) {
    if (mudurIndirimTipi === "miktar") {
      mudurIndirimTutari = Math.min(mudurIndirimDegeri, genelToplam);
    } else {
      const yuzde = Math.min(mudurIndirimDegeri, 100);
      mudurIndirimTutari = Math.round((genelToplam * yuzde) / 100);
    }
    ozelFiyat = Math.max(0, genelToplam - mudurIndirimTutari);
  }

  // Hediye durumları yeniden hesaplama desteği
  const kitapHediyeEdildi = extra.kitapHediyeEdildi ?? false;
  const hediyeEdildi = extra.hediyeEdildi ?? {};

  // Hediye toggle sonrası genel toplam düzeltmesi
  const hediyeIndirimi = kampanya.hediyeler.reduce(
    (toplam, h) => (hediyeEdildi[h.isim] && h.fiyat > 0 ? toplam + h.fiyat : toplam),
    0
  );
  const hediyesizFiyat = genelToplam; // fiyat, herhangi bir hediye düşülmeden önce
  const kitapHediyeIndirimi = kitapHediyeEdildi && kitapF > 0 ? kitapF : 0;
  const toplamHediyeIndirimi = kitapHediyeIndirimi + Math.round(hediyeIndirimi);
  let duzeltilmisGenelToplam = genelToplam;
  if (kitapHediyeEdildi && kitapF > 0) {
    duzeltilmisGenelToplam -= kitapF;
  }
  duzeltilmisGenelToplam -= hediyeIndirimi;
  const duzeltilmisOzelFiyat = Math.max(
    0,
    Math.round(duzeltilmisGenelToplam - mudurIndirimTutari),
  );
  // Down payment is clamped after gift and manager discounts, then the exact
  // remaining balance is divided so the displayed schedule sums to the total.
  const safePesinat =
    odemeTipi === "nakit"
      ? 0
      : Math.min(Math.max(0, Math.round(pesinat)), duzeltilmisOzelFiyat);
  const kalanTutar =
    odemeTipi === "nakit"
      ? 0
      : Math.max(0, duzeltilmisOzelFiyat - safePesinat);
  const taksitTutarlari =
    odemeTipi === "nakit"
      ? []
      : buildInstallmentSchedule(kalanTutar, installmentCount);
  const aylikOdeme = taksitTutarlari[0] ?? duzeltilmisOzelFiyat;
  const toplamOdeme =
    odemeTipi === "nakit"
      ? duzeltilmisOzelFiyat
      : safePesinat + taksitTutarlari.reduce((sum, amount) => sum + amount, 0);
  const finansmanFarki = Math.max(
    0,
    Math.round(kampanyaFiyat - Math.round(nakitF)),
  );

  return {
    id: extra.id,
    title: extra.title,
    customName: extra.customName ?? "",
    form,
    listeFiyati: Math.round(listeF),
    indirimTutari: Math.round(indirimT),
    indirimYuzdesi: indirimY,
    kampanyaliFiyat: kampanyaFiyat,
    nakitKampanyaFiyati: Math.round(nakitF),
    krediKartiKomisyonOrani:
      odemeTipi === "kredi-karti" ? krediKartiKomisyonOrani : 0,
    krediKartiKomisyonTutari,
    taksitFaizTutari,
    finansmanFarki,
    kitapUcreti: kitapF,
    hediyeler: kampanya.hediyeler,
    hediyelerToplam: Math.round(hediyelerToplam),
    hediyesizFiyat: Math.round(hediyesizFiyat),
    hediyeIndirimi: Math.round(hediyeIndirimi),
    kitapHediyeIndirimi: Math.round(kitapHediyeIndirimi),
    toplamHediyeIndirimi: Math.round(toplamHediyeIndirimi),
    genelToplam: duzeltilmisGenelToplam,
    mudurIndirimTutari,
    ozelFiyat: duzeltilmisOzelFiyat,
    toplamOdeme: Math.round(toplamOdeme),
    pesinat: safePesinat,
    kalanTutar,
    aylikOdeme,
    taksitTutarlari,
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
