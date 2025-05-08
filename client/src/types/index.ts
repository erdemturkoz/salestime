export interface Hediye {
  isim: string;
  fiyat: number;
}

export interface Kampanya {
  id: string;
  kampanyaAdi: string;
  egitimTipi: string;
  kurSayisi: number;
  toplamDersSaati: number;
  listeFiyati: number;
  nakitFiyati: number;
  indirimOrani: number;
  faizOrani: number;
  kitapFiyati: number;
  kitapSetSayisi: number;
  maxKrediKartiTaksit: number;
  maxSenetTaksit: number;
  hediyeler: Hediye[];
}

export interface TaksitOption {
  taksit: number;
  aylik: number;
  toplam: number;
}
