import { jsPDF } from 'jspdf';

// Font yükleme işlemi için yardımcı fonksiyon
export function loadFont(doc: jsPDF) {
  try {
    // Önce standart fontlarını kullan
    doc.setFont('helvetica');
    
    // Tarayıcı ortamında çalışıyorsa daha fazla font seçeneği olabilir
    if (typeof window !== 'undefined') {
      // VFS'e font eklemek için jsPDF.API üzerinden özellikler kullanılabilir
      doc.setLanguage('tr');
    }
    
    return doc;
  } catch (error) {
    console.error("Font yükleme hatası:", error);
    // Sorun olursa varsayılan fontu kullan
    return doc;
  }
}