import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { createPDF, downloadPDF } from './pdf';

/**
 * Teklif PDF'ini hazırlayan ve indiren fonksiyon.
 * Bu fonksiyon isteğe göre düzenlenebilir özellikler içerir.
 */
export function createAndDownloadTeklif(
  data: {
    kampanyaAdi: string;
    egitimTipi: string;
    kurSayisi: number;
    dersSaati: number;
    indirimOrani: number;
    indirimTutari: number;
    odemeSekli: string;
    taksitBilgisi: string;
    kitapBilgisi: string;
    toplamTutar: number;
    aylikTutar: number;
    taksitSayisi: number;
    hediyeler: Array<{isim: string, deger: number}>;
  }
): void {
  try {
    // PDF oluştur
    const doc = createPDF(data);
    
    // PDF'i indir
    downloadPDF(doc, 'teklif-ozeti.pdf');
    
    console.log('PDF başarıyla oluşturuldu ve indirildi.');
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    throw error;
  }
}

/**
 * Örnek bir teklif PDF'i oluşturur - Test amacıyla kullanılabilir
 */
export function createSampleTeklif(): void {
  const sampleData = {
    kampanyaAdi: '1+1 KAMPANYASI',
    egitimTipi: 'Genel İngilizce',
    kurSayisi: 2,
    dersSaati: 240,
    indirimOrani: 40.0,
    indirimTutari: 24000,
    odemeSekli: 'Kredi Kartı',
    taksitBilgisi: '4 Taksit',
    kitapBilgisi: 'Kitap Seti (2 set - 6.000 TL değerinde)',
    toplamTutar: 63840,
    aylikTutar: 15960,
    taksitSayisi: 4,
    hediyeler: [
      {
        isim: '3 AYLIK ETOPYA ONLINE',
        deger: 9000
      }
    ]
  };
  
  createAndDownloadTeklif(sampleData);
}