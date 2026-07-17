import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Kampanya } from '@/types';
import { apiRequest } from '@/lib/queryClient';

// Define a mock initial kampanya (sadece uygulama ilk yüklenirken gösterilecek)
const initialKampanya: Kampanya = {
  id: 'initial-kampanya',
  kampanyaAdi: 'Demo Kampanya',
  egitimTipi: 'Genel İngilizce',
  kurSayisi: 3,
  toplamDersSaati: 120,
  listeFiyati: 10000,
  nakitFiyati: 8500,
  indirimOrani: 15,
  faizOrani: 12,
  kitapFiyati: 1000,
  kitapSetSayisi: 1,
  maxKrediKartiTaksit: 8,
  maxSenetTaksit: 12,
  hediyeler: [
    { isim: 'Online Dersler', fiyat: 1500 },
    { isim: 'Özel Konuşma Seansı', fiyat: 750 }
  ]
};

interface AppContextType {
  kampanyalar: Kampanya[];
  addKampanya: (kampanya: Omit<Kampanya, 'id'>) => void;
  deleteKampanya: (id: string) => void;
  updateKampanya: (kampanya: Kampanya) => void;

  loading: boolean;
  refreshKampanyalar: (subeId?: number) => Promise<void>;
  getKampanyalarBySubeId: (subeId: number) => Promise<void>;
  selectedSubeId: number | null;
  setSelectedSubeId: (subeId: number | null) => void;
}

// Create the context with default values to avoid undefined checks
const defaultContextValue: AppContextType = {
  kampanyalar: [initialKampanya],
  addKampanya: () => {},
  deleteKampanya: () => {},
  updateKampanya: () => {},

  loading: false,
  refreshKampanyalar: async (subeId?: number) => {},
  getKampanyalarBySubeId: async () => {},
  selectedSubeId: null,
  setSelectedSubeId: () => {},
};

const AppContext = createContext<AppContextType>(defaultContextValue);

export const useAppContext = () => {
  return useContext(AppContext);
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [kampanyalar, setKampanyalar] = useState<Kampanya[]>([initialKampanya]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSubeId, setSelectedSubeId] = useState<number | null>(null);

  // DB'den kampanyaları çeken fonksiyon
  const fetchKampanyalar = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/kampanyalar');

      if (data && Array.isArray(data) && data.length > 0) {
        const formattedKampanyalar = data.map((kampanya: any) => ({
          ...kampanya,
          id: kampanya.id.toString(),
          hediyeler: kampanya.hediyeler || []
        }));
        setKampanyalar(formattedKampanyalar);
      } else if (data && Array.isArray(data) && data.length === 0) {
        setKampanyalar([]);
      }
    } catch (error) {
      console.error('Kampanyaları getirirken bir hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  // Kampanya verilerini bir kere yükle, ancak modalın açılıp kapanması ile
  // gereksiz yenilemeyi engellemek için modalState'e bağlı olma
  const [kampanyaVerisiYuklendi, setKampanyaVerisiYuklendi] = useState(false);
  
  useEffect(() => {
    // İlk yüklemede bir kere çalışsın
    if (!kampanyaVerisiYuklendi) {
      fetchKampanyalar();
      setKampanyaVerisiYuklendi(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kampanyaVerisiYuklendi]);

  // Kampanya ekleme fonksiyonu
  const addKampanya = async (kampanya: Omit<Kampanya, 'id'>) => {
    try {
      setLoading(true);
      
      // Veri doğrulama kontrolü yap ve varsayılan değerleri ekle
      const kampanyaData = {
        kampanyaAdi: kampanya.kampanyaAdi,
        egitimTipi: kampanya.egitimTipi,
        kurSayisi: kampanya.kurSayisi || 1,
        toplamDersSaati: kampanya.toplamDersSaati || 0,
        listeFiyati: kampanya.listeFiyati || 0,
        nakitFiyati: kampanya.nakitFiyati || 0,
        indirimOrani: Math.round(kampanya.indirimOrani || 0), // Tamsayı değer yap
        faizOrani: Math.round(kampanya.faizOrani || 12), // Tamsayı değer yap
        kitapFiyati: kampanya.kitapFiyati || 0,
        kitapSetSayisi: kampanya.kitapSetSayisi || 1,
        maxKrediKartiTaksit: kampanya.maxKrediKartiTaksit || 8,
        maxSenetTaksit: kampanya.maxSenetTaksit || 12,
        hediyeler: kampanya.hediyeler || [],
        subeId: (kampanya as any).subeId ?? null
      };
      
      // API çağrısı ile veritabanına kampanya ekle
      const newKampanya = await apiRequest('/api/kampanyalar', {
        method: 'POST',
        body: JSON.stringify(kampanyaData)
      });
      
      // State'i güncelle
      setKampanyalar(prev => [...prev, {
        ...newKampanya,
        id: newKampanya.id.toString()
      }]);
      
    } catch (error) {
      console.error('Kampanya eklenirken bir hata oluştu:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Kampanya silme fonksiyonu
  const deleteKampanya = async (id: string) => {
    try {
      setLoading(true);
      
      // Eğer demo kampanyasıysa (initial-kampanya), sadece state'den kaldır
      if (id === 'initial-kampanya') {
        setKampanyalar(prev => prev.filter(kampanya => kampanya.id !== id));
        return;
      }
      
      // API çağrısı ile veritabanından kampanya sil
      await apiRequest(`/api/kampanyalar/${id}`, { method: 'DELETE' });

      // State'i güncelle
      setKampanyalar(prev => prev.filter(kampanya => kampanya.id !== id));
      
    } catch (error) {
      console.error('Kampanya silinirken bir hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  // Kampanya güncelleme fonksiyonu
  const updateKampanya = async (updatedKampanya: Kampanya) => {
    try {
      setLoading(true);
      
      // Veri doğrulama kontrolü yap ve varsayılan değerleri ekle
      const kampanyaData = {
        kampanyaAdi: updatedKampanya.kampanyaAdi,
        egitimTipi: updatedKampanya.egitimTipi,
        kurSayisi: updatedKampanya.kurSayisi || 1,
        toplamDersSaati: updatedKampanya.toplamDersSaati || 0,
        listeFiyati: updatedKampanya.listeFiyati || 0,
        nakitFiyati: updatedKampanya.nakitFiyati || 0,
        indirimOrani: Math.round(updatedKampanya.indirimOrani || 0), // Tamsayı değer yap
        faizOrani: Math.round(updatedKampanya.faizOrani || 12), // Tamsayı değer yap
        kitapFiyati: updatedKampanya.kitapFiyati || 0,
        kitapSetSayisi: updatedKampanya.kitapSetSayisi || 1,
        maxKrediKartiTaksit: updatedKampanya.maxKrediKartiTaksit || 8,
        maxSenetTaksit: updatedKampanya.maxSenetTaksit || 12,
        hediyeler: updatedKampanya.hediyeler || []
      };
      
      // API çağrısı ile veritabanında kampanya güncelle
      await apiRequest(`/api/kampanyalar/${updatedKampanya.id}`, {
        method: 'PUT',
        body: JSON.stringify(kampanyaData)
      });

      // State'i güncelle
      setKampanyalar(prev => 
        prev.map(kampanya => 
          kampanya.id === updatedKampanya.id ? updatedKampanya : kampanya
        )
      );
      
    } catch (error) {
      console.error('Kampanya güncellenirken bir hata oluştu:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Şube ID'sine göre kampanyaları getir
  const getKampanyalarBySubeId = async (subeId: number) => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/kampanyalar?subeId=${subeId}`);
      
      if (data && Array.isArray(data)) {
        // Kampanyaları formatla
        const formattedKampanyalar = data.map((kampanya: any) => ({
          ...kampanya,
          id: kampanya.id.toString(),
          hediyeler: kampanya.hediyeler || []
        }));
        
        // Kampanyaları sırala: önce eğitim tipine göre grupla, sonra Genel İngilizce içinde "1+1 KAMPANYASI" en başta olsun
        const sortedKampanyalar = [...formattedKampanyalar].sort((a, b) => {
          // Önce eğitim tipine göre sırala
          if (a.egitimTipi !== b.egitimTipi) {
            return a.egitimTipi.localeCompare(b.egitimTipi);
          }
          
          // Eğer her ikisi de "Genel İngilizce" ise özel sıralama uygula
          if (a.egitimTipi === "Genel İngilizce" && b.egitimTipi === "Genel İngilizce") {
            // "1+1 KAMPANYASI" her zaman en başta olsun
            if (a.kampanyaAdi === "1+1 KAMPANYASI") return -1;
            if (b.kampanyaAdi === "1+1 KAMPANYASI") return 1;
          }
          
          // Diğer durumlarda kampanya adına göre sırala
          return a.kampanyaAdi.localeCompare(b.kampanyaAdi);
        });
        
        setKampanyalar(sortedKampanyalar);
      } else {
        setKampanyalar([]);
      }
    } catch (error) {
      console.error('Şubeye göre kampanyaları getirirken bir hata oluştu:', error);
      setKampanyalar([]);
    } finally {
      setLoading(false);
    }
  };



  // Kampanyaları yenileme fonksiyonu
  const refreshKampanyalar = async (subeId?: number) => {
    if (subeId) {
      await getKampanyalarBySubeId(subeId);
    } else if (selectedSubeId) {
      await getKampanyalarBySubeId(selectedSubeId);
    } else {
      await fetchKampanyalar();
    }
  };

  // Bu useEffect kaldırıldı, yukarıda kampanyaVerisiYuklendi state'i ile kontrol edilen bir useEffect kullanıldı

  const contextValue = {
    kampanyalar,
    addKampanya,
    deleteKampanya,
    updateKampanya,

    loading,
    refreshKampanyalar,
    getKampanyalarBySubeId,
    selectedSubeId,
    setSelectedSubeId
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
