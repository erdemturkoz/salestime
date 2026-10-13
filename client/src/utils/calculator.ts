import { TaksitOption } from "@/types";

/**
 * Taksit seçeneklerini hesaplayan utility fonksiyonu
 * 
 * @param nakitFiyat - Tek seferde nakit ödeme fiyatı
 * @param faizOrani - Yıllık faiz oranı (örn. 12 = %12)
 * @param taksitAdedleri - Hesaplanacak taksit adetleri (örn. [3, 6, 12])
 * @param bankaKomisyonuOrani - Kredi kartı banka komisyonu yüzdesi (varsayılan: %10)
 * @returns Hesaplanan taksit seçenekleri
 */
export const calculateInstallments = (
  nakitFiyat: number,
  faizOrani: number,
  taksitAdedleri: number[],
  bankaKomisyonuOrani: number = 10
): TaksitOption[] => {
  if (
    !Number.isFinite(nakitFiyat) ||
    !Number.isFinite(faizOrani) ||
    !Number.isFinite(bankaKomisyonuOrani) ||
    nakitFiyat <= 0 ||
    faizOrani < 0 ||
    bankaKomisyonuOrani < 0
  ) {
    return [];
  }
  
  // Nakit fiyata banka komisyonu ekle
  const komisyonTutari = nakitFiyat * (bankaKomisyonuOrani / 100);
  const komisyonluFiyat = nakitFiyat + komisyonTutari;

  return taksitAdedleri.map(taksit => {
    // Basit faiz formülü: ana_para * (1 + oran * ay/12)
    const faizTutari = komisyonluFiyat * (faizOrani / 100) * (taksit / 12);
    const toplam = komisyonluFiyat + faizTutari;
    const aylik = toplam / taksit;

    return {
      taksitSayisi: taksit,
      aylikTutar: parseFloat(aylik.toFixed(2)),
      toplamTutar: parseFloat(toplam.toFixed(2)),
      toplam: parseFloat(toplam.toFixed(2)), // Geriye uyumluluk için ekledik
      komisyonTutari: parseFloat(komisyonTutari.toFixed(2)),
      faizTutari: parseFloat(faizTutari.toFixed(2)),
    };
  });
};
