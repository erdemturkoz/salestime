export type OdemeTipi = "nakit" | "kredi-karti" | "senet" | "";

export interface OfferFormState {
  egitimTipi: string;
  kampanyaId: string;
  kurSayisi: number | null;
  toplamDersSaati: number | null;
  odemeTipi: OdemeTipi;
  taksitSayisi: number;
  pesinat: number;
  kitapDahil: boolean;
  mudurIndirimTipi: "yuzde" | "miktar";
  mudurIndirimDegeri: number;
  gecerlilikGunu: number;
}

export const defaultFormState: OfferFormState = {
  egitimTipi: "",
  kampanyaId: "",
  kurSayisi: null,
  toplamDersSaati: null,
  odemeTipi: "",
  taksitSayisi: 1,
  pesinat: 0,
  kitapDahil: true,
  mudurIndirimTipi: "yuzde",
  mudurIndirimDegeri: 0,
  gecerlilikGunu: 2,
};

export interface OfferResult {
  id: string;
  title: string;
  customName: string;
  form: OfferFormState;
  listeFiyati: number;
  indirimTutari: number;
  indirimYuzdesi: number;
  kampanyaliFiyat: number;
  kitapUcreti: number;
  hediyeler: Array<{ isim: string; fiyat: number }>;
  genelToplam: number;
  mudurIndirimTutari: number;
  ozelFiyat: number;
  pesinat: number;
  kalanTutar: number;
  aylikOdeme: number;
  odemeTipiText: string;
  kampanyaAdi: string;
  egitimTipi: string;
  kurSayisi: number;
  dersSaati: number;
  isRecommended: boolean;
  kitapHediyeEdildi: boolean;
  hediyeEdildi: Record<string, boolean>;
}
