import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { loadFont } from './font-loader';

// Test PDF dosyası oluşturmak için fonksiyon
export function createTestPDF(): jsPDF {
  // Yeni PDF oluştur
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Font yükle
  loadFont(doc);
  
  // PDF içeriği
  const margin = 15;
  const pageWidth = 210; // A4 genişliği
  const today = new Date().toLocaleDateString('tr-TR');
  
  // ----- BAŞLIK -----
  doc.setFillColor(50, 80, 180);
  doc.rect(margin, margin, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('ÖZET BİLGİ', pageWidth / 2, margin + 7, { align: 'center' });
  
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
  
  // ----- GİRİŞ METNİ -----
  yPos += 15;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.text('Sayın Öğrencimiz,', margin, yPos);
  
  // ----- İÇERİK - AutoTable kullanarak Türkçe karakterlerle uyumlu -----
  yPos += 12;
  
  // @ts-ignore
  doc.autoTable({
    startY: yPos,
    head: [['Eğitim Bilgileri']],
    body: [
      ['Toplam Eğitim Tutarı: ₺63.840'],
      ['İndirim: %40 (₺24.000)'],
      ['Ödeme Şekli: Kredi Kartı 4 Taksit'],
      ['Hediye: Kitap Seti + 3 Aylık Online Eğitim']
    ],
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [50, 50, 50],
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      textColor: [60, 60, 60],
    },
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - (margin * 2),
  });
  
  // ----- UYARI KUTUSU -----
  yPos = 150;
  doc.setFillColor(255, 245, 220);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(200, 80, 30);
  doc.text('BU ÖZEL TEKLİF YALNIZCA 2 GÜN GEÇERLİDİR!', pageWidth / 2, yPos + 7, { align: 'center' });
  
  return doc;
}

// PDF dosyasını indir
export function downloadTestPDF(filename: string = 'teklif-ozeti.pdf'): void {
  const doc = createTestPDF();
  doc.save(filename);
}