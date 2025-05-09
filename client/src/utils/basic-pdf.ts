import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// PDF oluşturma fonksiyonu - ASCII harfler kullanarak
export function createBasicPDF(): jsPDF {
  // Yeni PDF oluştur
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // PDF içeriği
  const margin = 15;
  const pageWidth = 210; // A4 genişliği
  const today = new Date().toLocaleDateString('tr-TR');
  
  // ----- BASLIK -----
  doc.setFillColor(50, 80, 180);
  doc.rect(margin, margin, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('OZET BILGI', pageWidth / 2, margin + 7, { align: 'center' });
  
  // ----- KAMPANYA ADI -----
  let yPos = margin + 20;
  
  doc.setTextColor(50, 80, 180);
  doc.setFontSize(14);
  doc.text("1+1", margin, yPos);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text(`Teklif Tarihi: ${today}`, pageWidth - margin, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setTextColor(50, 80, 180);
  doc.setFontSize(14);
  doc.text("KAMPANYASI", margin, yPos);
  
  // ----- GIRIS METNI -----
  yPos += 15;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text('Sayin Ogrencimiz,', margin, yPos);
  
  yPos += 8;
  doc.text('SINIRLI SURE icin gecerli olan bu ozel kampanya kapsaminda', margin, yPos);
  yPos += 6;
  doc.text('secmis oldugunuz egitim asagidaki OZEL AVANTAJLARLA sunulmaktadir:', margin, yPos);
  
  // ----- EGITIM BILGILERI -----
  yPos += 15;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.text('Egitim Bilgileri:', margin, yPos);
  
  // Eğitim bilgileri liste olarak
  yPos += 10;
  doc.setFontSize(12);
  doc.text('• Egitim Tipi: Genel Ingilizce', margin, yPos);
  
  yPos += 7;
  doc.text('• Toplam Egitim: 2 Kur', margin, yPos);
  
  yPos += 7;
  doc.text('• Toplam Ders Saati: 240 saat', margin, yPos);
  
  // İndirim bilgisi (yeşil renkte)
  yPos += 7;
  doc.setTextColor(40, 160, 70);
  doc.text('• Indirim: %40.0 (24.000 TL)', margin, yPos);
  
  // Ödeme şekli
  yPos += 7;
  doc.setTextColor(60, 60, 60);
  doc.text('• Odeme Sekli: Kredi Karti 4 Taksit', margin, yPos);
  
  // ----- HEDIYELER VE AVANTAJLAR -----
  yPos += 15;
  doc.setTextColor(40, 140, 60);
  doc.setFontSize(14);
  doc.text('HEDIYELER ve AVANTAJLAR:', margin, yPos);
  
  // Hediyeler listesi
  yPos += 10;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text('• Kitap Seti (2 set - 6.000 TL degerinde)', margin, yPos);
  
  yPos += 7;
  doc.text('• 3 AYLIK ETOPYA ONLINE (9.000 TL degerinde)', margin, yPos);
  
  // ----- UYARI KUTUSU -----
  yPos += 15;
  doc.setFillColor(255, 245, 220);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(200, 80, 30);
  doc.text('BU OZEL TEKLIF YALNIZCA 2 GUN GECERLIDIR!', pageWidth / 2, yPos + 7, { align: 'center' });
  
  // ----- FIYAT BILGILERI -----
  yPos += 20;
  doc.setFillColor(235, 245, 255);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 25, 'F');
  
  doc.setTextColor(20, 60, 180);
  doc.setFontSize(14);
  doc.text('Toplam Egitim Tutari:', margin + 5, yPos + 10);
  
  doc.setFontSize(16);
  doc.text('63.840 TL', margin + 5, yPos + 20);
  
  // Taksit bilgisi
  doc.setFontSize(12);
  doc.setTextColor(60, 100, 200);
  doc.text('Aylik sadece 15.960 TL x 4 taksit', pageWidth - margin - 5, yPos + 16, { align: 'right' });
  
  // ----- ALT BILGI -----
  yPos += 35;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text('Bu belge egitim kapsamini ve odeme kosullarini gosterir.', margin, yPos);
  yPos += 4;
  doc.text('Kaydiniz tamamlandiginda kesin sozlesme duzenlenecektir.', margin, yPos);
  
  return doc;
}

// PDF'i indirme fonksiyonu
export function downloadBasicPDF(filename: string = 'teklif-ozeti.pdf'): void {
  try {
    const doc = createBasicPDF();
    doc.save(filename);
  } catch (error) {
    console.error("PDF indirme hatası:", error);
    throw error;
  }
}