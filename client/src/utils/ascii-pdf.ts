import { jsPDF } from 'jspdf';

// Basit bir teklif PDF'i oluşturma fonksiyonu
export function createBasicPDF(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Sayfa bilgileri
  const margin = 20;
  const pageWidth = 210; // A4 genişliği
  
  // Başlık
  doc.setFillColor(46, 76, 170);
  doc.rect(margin, margin, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('OZET BILGI', pageWidth / 2, margin + 6, { align: 'center' });
  
  // Kampanya adı
  let yPos = margin + 20;
  doc.setTextColor(46, 76, 170);
  doc.setFontSize(14);
  doc.text('1+1', margin, yPos);
  doc.text('KAMPANYASI', margin, yPos + 7);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text(`Teklif Tarihi: ${new Date().toLocaleDateString('en-US')}`, pageWidth - margin, yPos, { align: 'right' });
  
  // Giriş metni
  yPos += 20;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text('Sayin Ogrencimiz,', margin, yPos);
  
  yPos += 6;
  const girisText = 'SINIRLI SURE icin gecerli olan bu ozel kampanya';
  doc.text(girisText, margin, yPos);
  
  yPos += 6;
  const girisText2 = 'kapsaminda secmis oldugunuz egitim asagidaki';
  doc.text(girisText2, margin, yPos);
  
  yPos += 6;
  const girisText3 = 'OZEL AVANTAJLARLA sunulmaktadir:';
  doc.text(girisText3, margin, yPos);
  
  // Eğitim bilgileri
  yPos += 15;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.text('Egitim Bilgileri:', margin, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.text('• Egitim Tipi: Genel Ingilizce', margin, yPos);
  
  yPos += 6;
  doc.text('• Toplam Egitim: 2 Kur', margin, yPos);
  
  yPos += 6;
  doc.text('• Toplam Ders Saati: 240 saat', margin, yPos);
  
  yPos += 6;
  doc.setTextColor(76, 175, 80);
  doc.text('• Indirim: %40.0 (24.000 TL)', margin, yPos);
  
  yPos += 6;
  doc.setTextColor(60, 60, 60);
  doc.text('• Odeme Sekli: Kredi Karti 4 Taksit', margin, yPos);
  
  // Hediyeler
  yPos += 15;
  doc.setTextColor(76, 175, 80);
  doc.setFontSize(14);
  doc.text('HEDIYELER ve AVANTAJLAR:', margin, yPos);
  
  yPos += 10;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text('• Kitap Seti (2 set - 6.000 TL degerinde)', margin, yPos);
  
  yPos += 6;
  doc.text('• 3 AYLIK ETOPYA ONLINE (9.000 TL degerinde)', margin, yPos);
  
  // Uyarı 
  yPos += 15;
  doc.setFillColor(255, 243, 224);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(230, 81, 0);
  doc.text('BU OZEL TEKLIF YALNIZCA 2 GUN GECERLIDIR!', pageWidth / 2, yPos + 6, { align: 'center' });
  
  // Toplam tutar
  yPos += 20;
  doc.setFillColor(232, 240, 254);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'F');
  
  doc.setTextColor(46, 76, 170);
  doc.setFontSize(14);
  doc.text('Toplam Egitim Tutari:', margin + 5, yPos + 8);
  
  doc.setFontSize(16);
  doc.text('63.840 TL', margin + 5, yPos + 16);
  
  doc.setFontSize(12);
  doc.setTextColor(63, 81, 181);
  doc.text('Aylik sadece 15.960 TL x 4 taksit', pageWidth - margin - 5, yPos + 12, { align: 'right' });
  
  // Alt bilgi
  yPos += 30;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text('Bu belge egitim kapsamini ve odeme kosullarini gosterir.', margin, yPos);
  doc.text('Kaydiniz tamamlandiginda kesin sozlesme duzenlenecektir.', margin, yPos + 4);
  
  return doc;
}

// PDF'i indirme fonksiyonu
export function downloadSimpleAsciiPDF(): void {
  try {
    const doc = createBasicPDF();
    doc.save('teklif.pdf');
  } catch (error) {
    console.error("PDF indirme hatası:", error);
    throw error;
  }
}