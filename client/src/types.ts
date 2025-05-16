// Hediye tanımı
export interface Hediye {
  isim: string;
  fiyat: number;
}

// Taksit seçeneği tanımı
export interface TaksitOption {
  taksitSayisi: number;
  aylikTutar: number;
  toplamTutar: number;  // Bu, API kodu için korunacak
  toplam?: number;      // Geriye uyumluluk için eklenen alan
}

// Kullanıcı rolleri
export type KullaniciRolu = "Sistem Yöneticisi" | "Kurucu" | "Müdür" | "Satış Danışmanı";

// Kampanya
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
  subeId?: number | null;
}

// Fiyat bilgisi
export interface FiyatBilgisi {
  listeFiyati: number;
  nakitFiyati: number;
  kitapFiyati: number;
  kitapSetSayisi: number;
  hediyeler: Hediye[];
  genelToplam: number;
  indirimliFiyat: number;
  ozelFiyat?: number;
}

// Ödeme Planı
export interface OdemePlani {
  odemeYontemi: string;
  taksitSayisi: number;
  aylikTaksit: number;
  toplamOdeme: number;
}

// Hesaplama Sonucu
export interface HesaplamaSonucu {
  kampanyaAdi: string;
  egitimTipi: string;
  kurSayisi: number;
  toplamDersSaati: number;
  fiyatBilgisi: FiyatBilgisi;
  odemePlanlari: OdemePlani[];
  ogrenciAdi?: string;
  ogrenciSoyadi?: string;
  ogrenciTelefon?: string;
  danismanNotu?: string;
  mudurlukIndirimi?: number;
  kitapDahil: boolean;
  createdAt: Date;
  createdBy?: string;
  subeId?: number;
}

// Kullanıcı
export interface Kullanici {
  id: number;
  adiSoyadi: string;
  kullaniciAdi: string;
  rol: KullaniciRolu;
  aktif: boolean;
  createdAt: Date;
}

// Şube
export interface Sube {
  id: number;
  subeAdi: string;
  subeAdresi: string;
  subeTelefon: string;
  createdAt: Date;
  kullanicilar?: Kullanici[];
}

// Şube Kullanıcı ilişkisi
export interface SubeKullanici {
  id: number;
  subeId: number;
  kullaniciId: number;
  rol: KullaniciRolu;
  createdAt: Date;
}