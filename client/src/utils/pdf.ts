import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Roboto fontunu PDF'e ekleyen yardımcı fonksiyon
 */
function initRobotoFont(doc: jsPDF) {
  try {
    // Türkçe dil desteğini aktifleştir
    doc.setLanguage('tr');
    
    // Standart fontlar (Helvetica) ile devam et, ancak dil desteğini sağla
    doc.setFont('helvetica');
    
    return doc;
  } catch (error) {
    console.error("Font yükleme hatası:", error);
    return doc;
  }
}

/**
 * Teklif için PDF oluşturan ana fonksiyon
 */
export function createPDF(data: {
  kampanyaAdi: string,
  egitimTipi: string,
  kurSayisi: number,
  dersSaati: number,
  indirimOrani: number,
  indirimTutari: number,
  odemeSekli: string,
  taksitBilgisi: string,
  kitapBilgisi: string,
  hediyeler: Array<{isim: string, deger: number}>,
  toplamTutar: number,
  aylikTutar: number,
  taksitSayisi: number
}): jsPDF {
  // Yeni PDF oluştur
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Font yükle
  initRobotoFont(doc);
  
  // PDF içeriği
  const margin = 15;
  const pageWidth = 210; // A4 genişliği
  const contentWidth = pageWidth - (margin * 2);
  const today = new Date().toLocaleDateString('tr-TR');
  
  // ----- BAŞLIK -----
  doc.setFillColor(46, 76, 170); // Koyu mavi arka plan
  doc.rect(margin, margin, contentWidth, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('ÖZET BİLGİ', pageWidth / 2, margin + 7, { align: 'center' });
  
  // ----- KAMPANYA ADI -----
  let yPos = margin + 20;
  
  doc.setTextColor(46, 76, 170); // Koyu mavi metin
  doc.setFontSize(14);
  doc.text("1+1", margin, yPos);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text(`Teklif Tarihi: ${today}`, pageWidth - margin, yPos, { align: 'right' });
  
  yPos += 7;
  doc.setTextColor(46, 76, 170);
  doc.setFontSize(14);
  doc.text("KAMPANYASI", margin, yPos);
  
  // ----- GİRİŞ METNİ -----
  yPos += 15;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text('Sayın Öğrencimiz,', margin, yPos);
  
  yPos += 8;
  doc.text('SINIRLI SÜRE için geçerli olan bu özel kampanya kapsamında', margin, yPos);
  yPos += 6;
  doc.text('seçmiş olduğunuz eğitim aşağıdaki ÖZEL AVANTAJLARLA sunulmaktadır:', margin, yPos);
  
  // ----- EĞİTİM BİLGİLERİ -----
  yPos += 15;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.text('Eğitim Bilgileri:', margin, yPos);
  
  // Eğitim bilgileri liste olarak
  yPos += 10;
  doc.setFontSize(12);
  doc.text(`• Eğitim Tipi: ${data.egitimTipi}`, margin, yPos);
  
  yPos += 7;
  doc.text(`• Toplam Eğitim: ${data.kurSayisi} Kur`, margin, yPos);
  
  yPos += 7;
  doc.text(`• Toplam Ders Saati: ${data.dersSaati} saat`, margin, yPos);
  
  // İndirim bilgisi (yeşil renkte)
  yPos += 7;
  doc.setTextColor(76, 175, 80); // Yeşil
  doc.text(`• İndirim: %${data.indirimOrani.toFixed(1)} (${data.indirimTutari.toLocaleString('tr-TR')} TL)`, margin, yPos);
  
  // Ödeme şekli
  yPos += 7;
  doc.setTextColor(60, 60, 60);
  doc.text(`• Ödeme Şekli: ${data.odemeSekli} ${data.taksitBilgisi}`, margin, yPos);
  
  // ----- HEDİYELER VE AVANTAJLAR -----
  yPos += 15;
  doc.setTextColor(76, 175, 80); // Yeşil
  doc.setFontSize(14);
  doc.text('HEDİYELER ve AVANTAJLAR:', margin, yPos);
  
  // Kitap bilgisi
  yPos += 10;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text(`• ${data.kitapBilgisi}`, margin, yPos);
  
  // Diğer hediyeler
  for (const hediye of data.hediyeler) {
    yPos += 7;
    doc.text(`• ${hediye.isim} (${hediye.deger.toLocaleString('tr-TR')} TL değerinde)`, margin, yPos);
  }
  
  // ----- UYARI KUTUSU -----
  yPos += 15;
  doc.setFillColor(255, 243, 224); // Açık turuncu arka plan
  doc.rect(margin, yPos, contentWidth, 10, 'F');
  
  doc.setTextColor(230, 81, 0); // Turuncu metin
  doc.text('BU ÖZEL TEKLİF YALNIZCA 2 GÜN GEÇERLİDİR!', pageWidth / 2, yPos + 7, { align: 'center' });
  
  // ----- FİYAT BİLGİLERİ -----
  yPos += 20;
  doc.setFillColor(232, 240, 254); // Açık mavi arka plan
  doc.rect(margin, yPos, contentWidth, 25, 'F');
  
  // Toplam tutar
  doc.setTextColor(46, 76, 170); // Koyu mavi
  doc.setFontSize(14);
  doc.text('Toplam Eğitim Tutarı:', margin + 5, yPos + 10);
  
  doc.setFontSize(16);
  doc.text(`${data.toplamTutar.toLocaleString('tr-TR')} TL`, margin + 5, yPos + 20);
  
  // Taksit bilgisi
  const taksitBilgiText = `Aylık sadece ${data.aylikTutar.toLocaleString('tr-TR')} TL x ${data.taksitSayisi} taksit`;
  doc.setFontSize(12);
  doc.setTextColor(63, 81, 181); // İndigo
  doc.text(taksitBilgiText, pageWidth - margin - 5, yPos + 16, { align: 'right' });
  
  // ----- ALT BİLGİ -----
  yPos += 35;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text('Bu belge eğitim kapsamını ve ödeme koşullarını gösterir.', margin, yPos);
  yPos += 4;
  doc.text('Kaydınız tamamlandığında kesin sözleşme düzenlenecektir.', margin, yPos);
  
  return doc;
}

/**
 * PDF'i indirme fonksiyonu
 */
export function downloadPDF(doc: jsPDF, filename: string): void {
  try {
    doc.save(filename);
  } catch (error) {
    console.error("PDF indirme hatası:", error);
    throw error;
  }
}