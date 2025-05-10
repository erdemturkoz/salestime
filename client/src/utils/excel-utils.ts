import * as XLSX from 'xlsx';
import { Kampanya } from '@/types';

/**
 * Kampanyaları Excel dosyasına aktarır
 * @param kampanyalar Aktarılacak kampanya listesi
 */
export const exportToExcel = (kampanyalar: Kampanya[]): void => {
  // Veriyi hazırla
  const data = kampanyalar.map(kampanya => ({
    'Kampanya Adı': kampanya.kampanyaAdi,
    'Eğitim Tipi': kampanya.egitimTipi,
    'Kur Sayısı': kampanya.kurSayisi,
    'Toplam Ders Saati': kampanya.toplamDersSaati,
    'Liste Fiyatı': kampanya.listeFiyati,
    'Nakit Fiyatı': kampanya.nakitFiyati,
    'İndirim Oranı (%)': kampanya.indirimOrani,
    'Faiz Oranı (%)': kampanya.faizOrani,
    'Kitap Fiyatı': kampanya.kitapFiyati,
    'Kitap Set Sayısı': kampanya.kitapSetSayisi,
    'Maks. Kredi Kartı Taksiti': kampanya.maxKrediKartiTaksit,
    'Maks. Senet Taksiti': kampanya.maxSenetTaksit,
    'Hediyeler': kampanya.hediyeler.map(h => `${h.isim} (${h.fiyat} TL)`).join(', ')
  }));

  // Çalışma sayfası oluştur
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kampanyalar');

  // Kolon genişliklerini ayarla
  const colWidths = [
    { wch: 20 }, // Kampanya Adı
    { wch: 15 }, // Eğitim Tipi
    { wch: 10 }, // Kur Sayısı
    { wch: 15 }, // Toplam Ders Saati
    { wch: 12 }, // Liste Fiyatı
    { wch: 12 }, // Nakit Fiyatı
    { wch: 15 }, // İndirim Oranı
    { wch: 15 }, // Faiz Oranı
    { wch: 12 }, // Kitap Fiyatı
    { wch: 15 }, // Kitap Set Sayısı
    { wch: 20 }, // Maks. Kredi Kartı Taksiti
    { wch: 20 }, // Maks. Senet Taksiti
    { wch: 30 }, // Hediyeler
  ];
  worksheet['!cols'] = colWidths;

  // Excel dosyasını indir
  XLSX.writeFile(workbook, 'kampanyalar.xlsx');
};

/**
 * Excel dosyasından kampanyaları içe aktarır
 * @param file Yüklenen Excel dosyası
 * @returns Promise<Kampanya[]> İçe aktarılan kampanyalar
 */
export const importFromExcel = (file: File): Promise<Partial<Kampanya>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Excel'den gelen verileri kampanya formatına dönüştür
        const kampanyalar: Partial<Kampanya>[] = jsonData.map((row: any) => {
          // Hediyeleri işle
          let hediyeler: Array<{isim: string, fiyat: number}> = [];
          if (row['Hediyeler']) {
            const hediyeListesi = row['Hediyeler'].split(',');
            hediyeler = hediyeListesi.map((hediye: string) => {
              const match = hediye.trim().match(/(.+)\s*\((\d+(?:\.\d+)?)\s*TL\)/);
              if (match) {
                return {
                  isim: match[1].trim(),
                  fiyat: parseFloat(match[2])
                };
              }
              return { isim: hediye.trim(), fiyat: 0 };
            });
          }
          
          return {
            kampanyaAdi: row['Kampanya Adı'] || '',
            egitimTipi: row['Eğitim Tipi'] || '',
            kurSayisi: Number(row['Kur Sayısı']) || 1,
            toplamDersSaati: Number(row['Toplam Ders Saati']) || 120,
            listeFiyati: Number(row['Liste Fiyatı']) || 0,
            nakitFiyati: Number(row['Nakit Fiyatı']) || 0,
            indirimOrani: Number(row['İndirim Oranı (%)']) || 0,
            faizOrani: Number(row['Faiz Oranı (%)']) || 0,
            kitapFiyati: Number(row['Kitap Fiyatı']) || 0,
            kitapSetSayisi: Number(row['Kitap Set Sayısı']) || 1,
            maxKrediKartiTaksit: Number(row['Maks. Kredi Kartı Taksiti']) || 8,
            maxSenetTaksit: Number(row['Maks. Senet Taksiti']) || 12,
            hediyeler
          };
        });
        
        resolve(kampanyalar);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};