import { jsPDF } from "jspdf";

/**
 * Türkçe karakter desteği ile PDF oluşturur
 * jsPDF'e ek değişiklikler uygulanır
 */
export function createPDFWithTurkishSupport(): jsPDF {
  // Sonuçları global olarak alalım (normalde bir fonksiyon parametresi olmalı,
  // ancak bu hızlı çözüm için uygundur)
  let sonuclar: any = {};
  
  // Global state'ten data almaya çalış
  try {
    // localStorage'dan son hesaplama verilerini almaya çalış
    const storeData = localStorage.getItem('hesaplamaData');
    if (storeData) {
      sonuclar = JSON.parse(storeData);
    }
  } catch (error) {
    console.error("Hesaplama verileri alınamadı:", error);
  }
  
  // PDF'de gösterilecek bilgileri değişkenlere ata
  const egitimTipi = sonuclar.egitimTipi || "Genel Ingilizce"; 
  const kampanyaAdi = sonuclar.kampanyaAdi || "1+1 KAMPANYASI";
  const kurSayisi = sonuclar.kurSayisi || 2;
  const dersSaati = sonuclar.dersSaati || 240;
  const indirimYuzdesi = sonuclar.indirimYuzdesi || 40;
  const indirimTutari = sonuclar.indirimTutari || 24000;
  const odemeTipi = sonuclar.odemeTipiText || "Kredi Karti";
  const taksitDetay = sonuclar.taksitDetay || "4 Taksit";
  const kitapUcreti = sonuclar.kitapUcreti || 6000;
  
  // Hediye edilen kalemler varsa hesaba katılmayan tutarlar olabilir
  // Eğer hediyeler state'den bir şekilde takip ediliyorsa bu bilgiyi kullanacağız
  let hediyeEdilenTutar = 0;
  let parsedHediyeler: Record<string, boolean> = {};
  
  // Eğer hediyeEdilenTutar doğrudan iletilmişse, onu kullan
  if (typeof sonuclar.hediyeEdilenTutar === 'number') {
    hediyeEdilenTutar = sonuclar.hediyeEdilenTutar;
    // Hediye edilen kalemleri de kontrol et
    if (sonuclar.hediyeEdilenKalemler) {
      try {
        parsedHediyeler = JSON.parse(sonuclar.hediyeEdilenKalemler);
      } catch (e) {
        console.error("Hediye edilen kalemler parselenemedi:", e);
      }
    }
  } 
  // Eski yöntem - hediyeEdilenTutar değeri yoksa kalemlerden topla
  else if (sonuclar.hediyeEdilenKalemler) {
    try {
      // Hediye edilen kalemlerin tutarlarını topla
      parsedHediyeler = JSON.parse(sonuclar.hediyeEdilenKalemler);
      for (const [key, value] of Object.entries(parsedHediyeler)) {
        if (value === true) {
          // Kitap mı hediye edilmiş?
          if (key === "kitap") {
            hediyeEdilenTutar += kitapUcreti;
          }
          // Diğer hediyeler araştırılıyor
          else if (sonuclar.hediyeler) {
            const hediye = sonuclar.hediyeler.find((h: any) => h.isim === key);
            if (hediye) {
              hediyeEdilenTutar += hediye.fiyat;
            }
          }
        }
      }
    } catch (e) {
      console.error("Hediye edilen kalemler hesaplanamadı:", e);
    }
  }
  
  console.log("Hediye edilen tutar:", hediyeEdilenTutar);
  
  // Toplam ve diğer değerleri hesapla
  // Genel Toplam, Kampanyalı Fiyat ile aynı tutarı kullanır
  // Hediyeler genel toplamdan düşülmez, ücretsiz hediye olarak verilir
  const genelToplam = sonuclar.genelToplam || 63840;
  
  // Müdür inisiyatifi indirimi ve özel fiyatı doğrudan localStorage'dan alınan veriden kullan
  // Bu sayede ekranda görünen değerlerle tam uyumlu olacak
  let mudurIndirimTutari = sonuclar.mudurIndirimTutari || 0;
  let ozelFiyat = sonuclar.ozelFiyat || genelToplam;
  
  // Güvenlik kontrolü - Değerler yoksa hesapla
  if (mudurIndirimTutari <= 0 && sonuclar.mudurIndirimDegeri && sonuclar.mudurIndirimTipi) {
    if (sonuclar.mudurIndirimTipi === "miktar") {
      mudurIndirimTutari = Math.min(sonuclar.mudurIndirimDegeri, genelToplam);
    } else {
      const yuzde = Math.min(sonuclar.mudurIndirimDegeri, 100);
      mudurIndirimTutari = Math.round((genelToplam * yuzde) / 100);
    }
    ozelFiyat = genelToplam - mudurIndirimTutari;
  }
  
  // Taksit hesaplaması - Özel fiyat üzerinden yapılır (müdür indirimi varsa)
  // Müdür İnisiyatifi İndirimi uygulandıysa Özel Fiyat, yoksa Genel Toplam kullanılır
  const aylikOdeme = sonuclar.aylikOdeme || 
    ((sonuclar.taksitSayisi && sonuclar.taksitSayisi > 1) 
      ? (mudurIndirimTutari > 0 ? Math.round(ozelFiyat / sonuclar.taksitSayisi) : Math.round(genelToplam / sonuclar.taksitSayisi))
      : (mudurIndirimTutari > 0 ? ozelFiyat : genelToplam));
  const taksitSayisi = sonuclar.taksitSayisi || 4;
  const nakitFiyat = sonuclar.kampanyaliFiyat || 55000;
  
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
  
  // Kampanya adını boşluktan böl (eğer 1+1 KAMPANYASI gibi bir formatta ise)
  const kampanyaParts = kampanyaAdi.split(' ');
  if (kampanyaParts.length > 1) {
    doc.text(kampanyaParts[0], margin, yPos);
    doc.text(kampanyaParts.slice(1).join(' '), margin, yPos + 7);
  } else {
    doc.text(kampanyaAdi, margin, yPos);
  }
  
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
  doc.text(`• Egitim Tipi: ${egitimTipi}`, margin, yPos);
  
  yPos += 6;
  doc.text(`• Toplam Egitim: ${kurSayisi} Kur`, margin, yPos);
  
  yPos += 6;
  doc.text(`• Toplam Ders Saati: ${dersSaati} saat`, margin, yPos);
  
  yPos += 6;
  doc.setTextColor(76, 175, 80);
  doc.text(`• Indirim: %${indirimYuzdesi.toFixed(1)} (${indirimTutari.toLocaleString('tr-TR')} TL)`, margin, yPos);
  
  yPos += 6;
  doc.setTextColor(60, 60, 60);
  doc.text(`• Odeme Sekli: ${odemeTipi} ${taksitDetay}`, margin, yPos);
  
  // HEDİYELER
  yPos += 15;
  doc.setTextColor(76, 175, 80);
  doc.setFontSize(14);
  doc.text("HEDIYELER ve AVANTAJLAR:", margin, yPos);
  
  yPos += 10;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  
  // Hediye edilen kalemleri kontrol et
  // Yukarıda parseHediyeler değişkenine atadığımız hediye bilgilerini kullan
  
  // Kitap seti - hediye edilip edilmediğini kontrol et
  const kitapHediye = parsedHediyeler && 'kitap' in parsedHediyeler && parsedHediyeler.kitap === true;
  doc.text(`• Kitap Seti (${kitapUcreti.toLocaleString('tr-TR')} TL degerinde)${kitapHediye ? ' - HEDIYE' : ''}`, margin, yPos);
  
  // Hediyeler varsa
  if (sonuclar.hediyeler && sonuclar.hediyeler.length > 0) {
    for (const hediye of sonuclar.hediyeler) {
      yPos += 6;
      const hediyeKey = hediye.isim;
      const hediyeEdildi = parsedHediyeler && hediyeKey in parsedHediyeler && parsedHediyeler[hediyeKey] === true;
      doc.text(`• ${hediye.isim} (${hediye.fiyat.toLocaleString('tr-TR')} TL degerinde)${hediyeEdildi ? ' - HEDIYE' : ''}`, margin, yPos);
    }
  } else {
    // Varsayılan hediye
    yPos += 6;
    doc.text("• 3 AYLIK ETOPYA ONLINE (9.000 TL degerinde)", margin, yPos);
  }
  
  // NAKİT ÖDEME AVANTAJI - sadece nakit dışındaki ödeme tiplerinde göster
  if (odemeTipi.toLowerCase() !== "nakit") {
    yPos += 15;
    
    // Nakit ödeme tutarı = Kampanyanın nakit fiyatı 
    // (kitap veya hediyeler hediye edilmemişse onları da ekle)
    
    // Nakit ödeme temel tutar (kampanya nakit fiyatı)
    const nakitTemelFiyat = nakitFiyat;
    let nakitToplamFiyat = nakitTemelFiyat;
    
    // Kitap ücretini ekle (hediye edilmediyse)
    if (!kitapHediye && kitapUcreti > 0) {
      nakitToplamFiyat += kitapUcreti;
    }
    
    // Hediyeleri ekle (hediye edilmediği durumda)
    if (sonuclar.hediyeler && sonuclar.hediyeler.length > 0) {
      for (const hediye of sonuclar.hediyeler) {
        const hediyeKey = hediye.isim;
        const hediyeEdildi = parsedHediyeler && 
                             hediyeKey in parsedHediyeler && 
                             parsedHediyeler[hediyeKey] === true;
        
        // Hediye edilmediyse fiyatını ekle
        if (!hediyeEdildi) {
          nakitToplamFiyat += hediye.fiyat;
        }
      }
    }
    
    // Taksitli ödeme toplamı (genel toplam)
    const taksitliToplamFiyat = genelToplam;
    
    // Tasarruf miktarı
    const tasarrufMiktari = taksitliToplamFiyat - nakitToplamFiyat;
    
    console.log("Nakit Avantaj Hesaplama:", {
      nakitTemelFiyat,
      nakitToplamFiyat,
      taksitliToplamFiyat,
      tasarrufMiktari,
      kitapHediye,
      hediyeKalemleri: parsedHediyeler
    });
    
    // Eğer tasarruf varsa göster
    if (tasarrufMiktari > 0) {
      const indirimOrani = Math.round((tasarrufMiktari / taksitliToplamFiyat) * 100);
      
      doc.setFillColor(255, 236, 0); // #ffec00 parlak sarı arka plan
      doc.rect(margin, yPos, pageWidth - (margin * 2), 15, 'F');
      
      doc.setTextColor(0, 0, 0); // Siyah yazı
      doc.setFontSize(12);
      doc.text("NAKIT ODEME AVANTAJI", pageWidth / 2, yPos + 6, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Bu egitimi nakit olarak alirsaniz ${tasarrufMiktari.toLocaleString('tr-TR')} TL (%${indirimOrani}) tasarruf edersiniz.`, 
        pageWidth / 2, yPos + 13, { align: 'center' });
    }
    
    yPos += 20;
  } else {
    yPos += 15;
  }
  
  // UYARI
  doc.setFillColor(255, 243, 224);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
  
  doc.setTextColor(230, 81, 0);
  doc.text("BU OZEL TEKLIF YALNIZCA 2 GUN GECERLIDIR!", pageWidth / 2, yPos + 6, { align: 'center' });
  
  // TOPLAM TUTARLAR - Yan yana 3 kart olarak
  yPos += 20;
  
  // Kart genişliklerini ve boşlukları hesaplayalım
  const cardSpacing = 10; // Kartlar arası boşluk
  const cardWidth = (pageWidth - (margin * 2) - (cardSpacing * 2)) / 3; // 3 kart için eşit genişlik
  
  // GENEL TOPLAM
  doc.setFillColor(232, 240, 254); // Mavi
  doc.rect(margin, yPos, cardWidth, 30, 'F');
  
  doc.setTextColor(46, 76, 170);
  doc.setFontSize(12);
  doc.text("Genel Toplam:", margin + 5, yPos + 10);
  
  doc.setFontSize(14);
  doc.text(`${genelToplam.toLocaleString('tr-TR')} TL`, margin + 5, yPos + 20);
  
  // MÜDÜR İNİSİYATİFİ İNDİRİMİ - Hesaplama sonuçlarını doğrudan kullan
  let mudurIndirimiVarMi = false;
  console.log("PDF'de kullanılacak değerler:", {
    genelToplam: genelToplam,
    mudurIndirimTutari: sonuclar.mudurIndirimTutari,
    ozelFiyat: sonuclar.ozelFiyat
  });
  
  if (sonuclar.mudurIndirimTutari && sonuclar.mudurIndirimTutari > 0) {
    mudurIndirimiVarMi = true;
    
    doc.setFillColor(232, 250, 236); // Açık yeşil
    doc.rect(margin + cardWidth + cardSpacing, yPos, cardWidth, 30, 'F');
    
    doc.setTextColor(46, 125, 50);
    doc.setFontSize(12);
    doc.text("EKSTRA Müdür İndirimi:", margin + cardWidth + cardSpacing + 5, yPos + 10);
    
    doc.setFontSize(14);
    let mudurIndirimiText = `-${sonuclar.mudurIndirimTutari.toLocaleString('tr-TR')} TL`;
    
    // Yüzde gösterimi de ekleniyor
    if (sonuclar.mudurIndirimTipi === "yuzde" && typeof sonuclar.mudurIndirimDegeri === 'number') {
      mudurIndirimiText += ` (EKSTRA ${sonuclar.mudurIndirimDegeri}%)`;
    }
    
    doc.text(mudurIndirimiText, margin + cardWidth + cardSpacing + 5, yPos + 20);
  }
  
  // ÖZEL FİYAT - Müdür indirimi varsa gösterilir
  if (mudurIndirimiVarMi && sonuclar.ozelFiyat) {
    doc.setFillColor(255, 236, 0); // Sarı
    doc.rect(margin + (cardWidth + cardSpacing) * 2, yPos, cardWidth, 30, 'F');
    
    doc.setTextColor(0, 0, 0); // Siyah
    doc.setFontSize(12);
    doc.text("Kişiye Özel Fiyat:", margin + (cardWidth + cardSpacing) * 2 + 5, yPos + 10);
    
    doc.setFontSize(14);
    doc.text(`${sonuclar.ozelFiyat.toLocaleString('tr-TR')} TL`, margin + (cardWidth + cardSpacing) * 2 + 5, yPos + 20);
  }
  
  // Taksitli ödeme ise taksit planını göster
  if (taksitSayisi > 1) {
    yPos += 35;
    
    // Taksit planı başlığı
    doc.setFillColor(232, 240, 254);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 20, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(63, 81, 181);
    
    // Aylık ödeme tutarını doğrudan aylikOdeme alanından al
    // Hesaplama sayfasında Özel Fiyat / Taksit Sayısı formülüyle hesaplanmış olmalı
    const taksitTutari = sonuclar.aylikOdeme || 
      (sonuclar.mudurIndirimTutari > 0 
        ? Math.round(sonuclar.ozelFiyat / taksitSayisi) 
        : Math.round(genelToplam / taksitSayisi));
    
    doc.text(`Aylik Odeme Plani: ${taksitTutari.toLocaleString('tr-TR')} TL x ${taksitSayisi} taksit`, 
      pageWidth / 2, yPos + 12, { align: 'center' });
    
    // Opsiyonel olarak taksit detaylarını ekleyebiliriz
    if (taksitSayisi <= 6) { // Maksimum 6 taksit detayı gösterelim
      yPos += 25;
      const taksitWidth = (pageWidth - (margin * 2)) / 3; // 3 sütun halinde
      
      for (let i = 0; i < taksitSayisi; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const tX = margin + (col * taksitWidth);
        const tY = yPos + (row * 15);
        
        doc.setFontSize(10);
        doc.setTextColor(63, 81, 181);
        doc.text(`${i+1}. Taksit: ${taksitTutari.toLocaleString('tr-TR')} TL`, tX + 5, tY);
      }
      
      // Taksit detaylarından sonra aşağı kaydır
      yPos += 15 * Math.ceil(taksitSayisi / 3);
    }
  }
  
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
    
    // Kampanya adını localStorage'dan al
    let kampanyaAdi = "KAMPANYA";
    try {
      const storeData = localStorage.getItem('hesaplamaData');
      if (storeData) {
        const data = JSON.parse(storeData);
        if (data.kampanyaAdi) {
          kampanyaAdi = data.kampanyaAdi
            .replace(/\s+/g, '_')   // Boşlukları alt çizgiye çevir
            .replace(/[^\w-]/g, ''); // Sadece alfanumerik karakterler, tire ve alt çizgi kalsın
        }
      }
    } catch (error) {
      console.error("Kampanya adı okunamadı:", error);
    }
    
    // Bugünün tarihini dosya adına ekle
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    
    doc.save(`${kampanyaAdi}_Teklif_${dateStr}.pdf`);
  } catch (error) {
    console.error("PDF indirme hatası:", error);
    throw error;
  }
}