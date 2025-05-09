import { jsPDF } from "jspdf";

// Türkçe karakterleri destekleyen gömülü font
// Normal şartlarda bir font dosyasını import edebilirsiniz
// Bu örnekte satır içi tanımlıyoruz
function addCustomFontsToPDF(doc: jsPDF): jsPDF {
  // Standard ISO 8859-9 Türkçe karakterleri destekleyen font kodları
  doc.addFont("Helvetica", "Helvetica", "normal");
  doc.setFont("Helvetica");
  return doc;
}

// Doküman oluşturma fonksiyonu
export function createCustomPDF(): jsPDF {
  // PDF oluştur
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Font ayarla
  addCustomFontsToPDF(doc);
  
  // Sayfa bilgileri
  const margin = 20;
  const pageWidth = 210; // A4 genişliği
  
  // BAŞLIK
  doc.setFillColor(46, 76, 170);
  doc.rect(margin, margin, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("ÖZET BİLGİ", pageWidth / 2, margin + 6, { align: 'center' });
  
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
  doc.text("Sayın Öğrencimiz,", margin, yPos);
  
  yPos += 6;
  doc.text("SINIRLI SÜRE için geçerli olan bu özel kampanya", margin, yPos);
  
  yPos += 6;
  doc.text("kapsamında seçmiş olduğunuz eğitim aşağıdaki", margin, yPos);
  
  yPos += 6;
  doc.text("ÖZEL AVANTAJLARLA sunulmaktadır:", margin, yPos);
  
  // EĞİTİM BİLGİLERİ
  yPos += 15;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.text("Eğitim Bilgileri:", margin, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.text("• Eğitim Tipi: Genel İngilizce", margin, yPos);
  
  yPos += 6;
  doc.text("• Toplam Eğitim: 2 Kur", margin, yPos);
  
  yPos += 6;
  doc.text("• Toplam Ders Saati: 240 saat", margin, yPos);
  
  yPos += 6;
  doc.setTextColor(76, 175, 80);
  doc.text("• İndirim: %40.0 (24.000 TL)", margin, yPos);
  
  yPos += 6;
  doc.setTextColor(60, 60, 60);
  doc.text("• Ödeme Şekli: Kredi Kartı 4 Taksit", margin, yPos);
  
  // HEDİYELER
  yPos += 15;
  doc.setTextColor(76, 175, 80);
  doc.setFontSize(14);
  doc.text("HEDİYELER ve AVANTAJLAR:", margin, yPos);
  
  yPos += 10;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text("• Kitap Seti (2 set - 6.000 TL değerinde)", margin, yPos);
  
  yPos += 6;
  doc.text("• 3 AYLIK ETOPYA ONLINE (9.000 TL değerinde)", margin, yPos);
  
  // UYARI
  yPos += 15;
  doc.setFillColor(255, 243, 224);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(230, 81, 0);
  doc.text("BU ÖZEL TEKLİF YALNIZCA 2 GÜN GEÇERLİDİR!", pageWidth / 2, yPos + 6, { align: 'center' });
  
  // TOPLAM TUTAR
  yPos += 20;
  doc.setFillColor(232, 240, 254);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'F');
  
  doc.setTextColor(46, 76, 170);
  doc.setFontSize(14);
  doc.text("Toplam Eğitim Tutarı:", margin + 5, yPos + 8);
  
  doc.setFontSize(16);
  doc.text("63.840 TL", margin + 5, yPos + 16);
  
  doc.setFontSize(12);
  doc.setTextColor(63, 81, 181);
  doc.text("Aylık sadece 15.960 TL x 4 taksit", pageWidth - margin - 5, yPos + 12, { align: 'right' });
  
  // ALT BİLGİ
  yPos += 30;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text("Bu belge eğitim kapsamını ve ödeme koşullarını gösterir.", margin, yPos);
  doc.text("Kaydınız tamamlandığında kesin sözleşme düzenlenecektir.", margin, yPos + 4);
  
  return doc;
}

// PDF'i indirme fonksiyonu
export function downloadCustomPDF(): void {
  try {
    const doc = createCustomPDF();
    // Bugünün tarihini dosya adına ekle
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    doc.save(`1+1_KAMPANYASI_Teklif_${dateStr}.pdf`);
  } catch (error) {
    console.error("PDF indirme hatası:", error);
    throw error;
  }
}