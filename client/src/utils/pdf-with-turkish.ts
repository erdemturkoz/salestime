import { jsPDF } from "jspdf";

/**
 * Türkçe karakter desteği ile PDF oluşturur
 * jsPDF'e ek değişiklikler uygulanır
 */
export function createPDFWithTurkishSupport(): jsPDF {
  // PDF oluştur
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Türkçe karakter kodlarını değiştir
  const processStr = (str: string): string => {
    // Karakterleri Unicode'a çevir
    return str
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U');
  };

  // text metodunu monkey-patch ederek Türkçe karakterleri düzelt
  const originalText = doc.text;
  doc.text = function(text: string | string[], x: number, y: number, options: any = {}) {
    const processedText = typeof text === 'string' ? processStr(text) : text.map(processStr);
    return originalText.call(this, processedText, x, y, options);
  };
  
  // Sayfa bilgileri
  const margin = 20;
  const pageWidth = 210; // A4 genişliği
  
  // BAŞLIK
  doc.setFillColor(46, 76, 170);
  doc.rect(margin, margin, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("OZET BILGI", pageWidth / 2, margin + 6, { align: 'center' });
  
  // KAMPANYA ADI
  let yPos = margin + 20;
  doc.setTextColor(46, 76, 170);
  doc.setFontSize(14);
  doc.text("1+1", margin, yPos);
  doc.text("KAMPANYASI", margin, yPos + 7);
  
  // TARİH
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  const today = new Date();
  const tarih = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  doc.text(`Teklif Tarihi: ${tarih}`, pageWidth - margin, yPos, { align: 'right' });
  
  // GİRİŞ
  yPos += 20;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text("Sayin Ogrencimiz,", margin, yPos);
  
  yPos += 6;
  doc.text("SINIRLI SURE icin gecerli olan bu ozel kampanya", margin, yPos);
  
  yPos += 6;
  doc.text("kapsaminda secmis oldugunuz egitim asagidaki", margin, yPos);
  
  yPos += 6;
  doc.text("OZEL AVANTAJLARLA sunulmaktadir:", margin, yPos);
  
  // EĞİTİM BİLGİLERİ
  yPos += 15;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.text("Egitim Bilgileri:", margin, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.text("• Egitim Tipi: Genel Ingilizce", margin, yPos);
  
  yPos += 6;
  doc.text("• Toplam Egitim: 2 Kur", margin, yPos);
  
  yPos += 6;
  doc.text("• Toplam Ders Saati: 240 saat", margin, yPos);
  
  yPos += 6;
  doc.setTextColor(76, 175, 80);
  doc.text("• Indirim: %40.0 (24.000 TL)", margin, yPos);
  
  yPos += 6;
  doc.setTextColor(60, 60, 60);
  doc.text("• Odeme Sekli: Kredi Karti 4 Taksit", margin, yPos);
  
  // HEDİYELER
  yPos += 15;
  doc.setTextColor(76, 175, 80);
  doc.setFontSize(14);
  doc.text("HEDIYELER ve AVANTAJLAR:", margin, yPos);
  
  yPos += 10;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text("• Kitap Seti (2 set - 6.000 TL degerinde)", margin, yPos);
  
  yPos += 6;
  doc.text("• 3 AYLIK ETOPYA ONLINE (9.000 TL degerinde)", margin, yPos);
  
  // UYARI
  yPos += 15;
  doc.setFillColor(255, 243, 224);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(230, 81, 0);
  doc.text("BU OZEL TEKLIF YALNIZCA 2 GUN GECERLIDIR!", pageWidth / 2, yPos + 6, { align: 'center' });
  
  // TOPLAM TUTAR
  yPos += 20;
  doc.setFillColor(232, 240, 254);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'F');
  
  doc.setTextColor(46, 76, 170);
  doc.setFontSize(14);
  doc.text("Toplam Egitim Tutari:", margin + 5, yPos + 8);
  
  doc.setFontSize(16);
  doc.text("63.840 TL", margin + 5, yPos + 16);
  
  doc.setFontSize(12);
  doc.setTextColor(63, 81, 181);
  doc.text("Aylik sadece 15.960 TL x 4 taksit", pageWidth - margin - 5, yPos + 12, { align: 'right' });
  
  // ALT BİLGİ
  yPos += 30;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text("Bu belge egitim kapsamini ve odeme kosullarini gosterir.", margin, yPos);
  doc.text("Kaydiniz tamamlandiginda kesin sozlesme duzenlenecektir.", margin, yPos + 4);
  
  return doc;
}

// PDF'i indirme fonksiyonu
export function downloadPDFWithTurkishSupport(): void {
  try {
    const doc = createPDFWithTurkishSupport();
    // Bugünün tarihini dosya adına ekle
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    doc.save(`1+1_KAMPANYASI_Teklif_${dateStr}.pdf`);
  } catch (error) {
    console.error("PDF indirme hatası:", error);
    throw error;
  }
}