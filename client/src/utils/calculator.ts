/**
 * Taksit seçeneklerini hesaplayan utility fonksiyonu
 * 
 * @param nakitFiyat - Tek seferde nakit ödeme fiyatı
 * @param faizOrani - Yıllık faiz oranı (örn. 12 = %12)
 * @param taksitAdedleri - Hesaplanacak taksit adetleri (örn. [3, 6, 12])
 * @returns Hesaplanan taksit seçenekleri
 */
export const calculateInstallments = (
  nakitFiyat: number,
  faizOrani: number,
  taksitAdedleri: number[]
): Array<{taksit: number; aylik: number; toplam: number}> => {
  if (nakitFiyat <= 0 || faizOrani < 0) {
    return [];
  }

  return taksitAdedleri.map(taksit => {
    // Basit faiz formülü: ana_para * (1 + oran * ay/12)
    const faizTutari = nakitFiyat * (faizOrani / 100) * (taksit / 12);
    const toplam = nakitFiyat + faizTutari;
    const aylik = toplam / taksit;

    return {
      taksit,
      aylik: parseFloat(aylik.toFixed(2)),
      toplam: parseFloat(toplam.toFixed(2))
    };
  });
};
