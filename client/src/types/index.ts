export interface Kampanya {
  id: string;
  kampanyaAdi: string;
  kurSayisi: number;
  listeFiyati: number;
  nakitFiyati: number;
  indirimOrani: number;
  faizOrani: number;
  kitapFiyati: number;
  hediyeler: string[];
}

export interface TaksitOption {
  taksit: number;
  aylik: number;
  toplam: number;
}
