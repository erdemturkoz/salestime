import { jsPDF } from 'jspdf';

// Roboto fontunu gömme işlemi
function initRobotoFont(doc: jsPDF) {
  // Roboto Regular fontunu base64 olarak göm
  const robotoBase64 = 'AAEAAAATAQAABAAwRFNJR54SRB...' // Bu çok uzun bir string olacak, test amaçlı kısa veriyorum
  
  try {
    // Roboto fontunu ekle
    doc.addFileToVFS("Roboto-Regular.ttf", robotoBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    
    // Fontu varsayılan olarak kullan
    doc.setFont("Roboto");
  } catch (error) {
    console.error("Font yükleme hatası:", error);
    // Sorun olursa varsayılan font kullan
    doc.setFont("helvetica");
  }
  
  return doc;
}

// PDF Oluşturma fonksiyonu
export function createPDF(data: {
  kampanyaAdi: string;
  egitimTipi: string;
  kurSayisi: number;
  dersSaati: number;
  indirimYuzdesi: number;
  indirimTutari: number;
  odemeSekli: string;
  taksitSayisi: number;
  hediyeler: Array<{isim: string, deger: number}>;
  toplamTutar: number;
  aylikTaksit?: number;
}): jsPDF {
  // Yeni PDF oluştur
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Roboto fontunu yükle
  initRobotoFont(doc);
  
  // Sabit değerler
  const margin = 15;
  const pageWidth = 210; // A4 genişliği
  const today = new Date().toLocaleDateString('tr-TR');
  
  // ----- BAŞLIK BÖLÜMÜ -----
  // Mavi başlık alanı
  doc.setFillColor(50, 80, 180);
  doc.rect(margin, margin, pageWidth - (margin * 2), 10, 'F');
  
  // Başlık metni
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('ÖZET BİLGİ', pageWidth / 2, margin + 7, { align: 'center' });
  
  // ----- KAMPANYA ADI -----
  let yPos = margin + 20;
  doc.setTextColor(50, 80, 180);
  doc.setFontSize(14);
  
  // Kampanya adını böl (1+1 KAMPANYASI gibi)
  const kampanyaBolumleri = data.kampanyaAdi.split(' ');
  const ilkBolum = kampanyaBolumleri[0] || '1+1';
  const ikinciBolum = kampanyaBolumleri[1] || 'KAMPANYASI';
  
  doc.text(ilkBolum, margin, yPos);
  
  // Sağ üst tarih
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text(`Teklif Tarihi: ${today}`, pageWidth - margin, yPos, { align: 'right' });
  
  // Kampanya adının ikinci kısmı
  yPos += 7;
  doc.setTextColor(50, 80, 180);
  doc.setFontSize(14);
  doc.text(ikinciBolum, margin, yPos);
  
  // ----- GİRİŞ METNİ -----
  yPos += 15;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text('Sayın Öğrencimiz,', margin, yPos);
  
  yPos += 8;
  doc.text('SINIRLI SÜRE için geçerli olan bu özel kampanya kapsamında seçmiş', margin, yPos);
  yPos += 6;
  doc.text('olduğunuz eğitim aşağıdaki ÖZEL AVANTAJLARLA sunulmaktadır:', margin, yPos);
  
  // ----- EĞİTİM BİLGİLERİ -----
  yPos += 15;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.text('Eğitim Bilgileri:', margin, yPos);
  
  // Eğitim bilgileri liste olarak
  yPos += 10;
  doc.setFontSize(12);
  doc.text(`Eğitim Tipi: ${data.egitimTipi}`, margin, yPos);
  
  yPos += 7;
  doc.text(`Toplam Eğitim: ${data.kurSayisi} Kur`, margin, yPos);
  
  yPos += 7;
  doc.text(`Toplam Ders Saati: ${data.dersSaati} saat`, margin, yPos);
  
  // İndirim bilgisi (yeşil renkte)
  yPos += 7;
  doc.setTextColor(40, 160, 70);
  doc.text(`İndirim: %${data.indirimYuzdesi.toFixed(1)} (₺${data.indirimTutari.toLocaleString('tr-TR')})`, margin, yPos);
  
  // Ödeme şekli
  yPos += 7;
  doc.setTextColor(60, 60, 60);
  const odemeBilgisi = data.taksitSayisi > 1 ? `${data.odemeSekli} ${data.taksitSayisi} Taksit` : data.odemeSekli;
  doc.text(`Ödeme Şekli: ${odemeBilgisi}`, margin, yPos);
  
  // ----- HEDİYELER VE AVANTAJLAR -----
  yPos += 15;
  doc.setTextColor(40, 140, 60);
  doc.setFontSize(14);
  doc.text('HEDİYELER ve AVANTAJLAR:', margin, yPos);
  
  // Hediyeler listesi
  yPos += 10;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  
  data.hediyeler.forEach(hediye => {
    doc.text(`${hediye.isim} (₺${hediye.deger.toLocaleString('tr-TR')} değerinde)`, margin, yPos);
    yPos += 7;
  });
  
  // ----- UYARI KUTUSU -----
  yPos += 8;
  doc.setFillColor(255, 245, 220);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(200, 80, 30);
  doc.text('BU ÖZEL TEKLİF YALNIZCA 2 GÜN GEÇERLİDİR!', pageWidth / 2, yPos + 7, { align: 'center' });
  
  // ----- FİYAT BİLGİLERİ -----
  yPos += 20;
  doc.setFillColor(235, 245, 255);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 25, 'F');
  
  doc.setTextColor(20, 60, 180);
  doc.setFontSize(14);
  doc.text('Toplam Eğitim Tutarı:', margin + 10, yPos + 10);
  
  doc.setFontSize(16);
  doc.text(`₺${data.toplamTutar.toLocaleString('tr-TR')}`, margin + 10, yPos + 20);
  
  // Taksit bilgisi varsa
  if (data.taksitSayisi > 1 && data.aylikTaksit) {
    doc.setFontSize(12);
    doc.setTextColor(60, 100, 200);
    doc.text(
      `Aylık sadece ₺${data.aylikTaksit.toLocaleString('tr-TR')} x ${data.taksitSayisi} taksit`,
      pageWidth - margin - 10, 
      yPos + 20, 
      { align: 'right' }
    );
  }
  
  // ----- ALT BİLGİ -----
  yPos += 35;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text('Bu belge eğitim kapsamını ve ödeme koşullarını gösterir.', margin, yPos);
  yPos += 4;
  doc.text('Kaydınız tamamlandığında kesin sözleşme düzenlenecektir.', margin, yPos);
  
  return doc;
}

// PDF'i indirme fonksiyonu
export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}