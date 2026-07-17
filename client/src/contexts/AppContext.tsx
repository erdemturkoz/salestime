import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Kampanya } from '@/types';
import { apiRequest } from '@/lib/queryClient';

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

const defaultContextValue: AppContextType = {
  kampanyalar: [],
  addKampanya: () => {},
  deleteKampanya: () => {},
  updateKampanya: () => {},
  loading: false,
  refreshKampanyalar: async () => {},
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

const formatKampanyalar = (data: any[]): Kampanya[] =>
  data.map((kampanya: any) => ({
    ...kampanya,
    id: kampanya.id.toString(),
    hediyeler: kampanya.hediyeler || []
  }));

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [kampanyalar, setKampanyalar] = useState<Kampanya[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSubeId, setSelectedSubeId] = useState<number | null>(null);

  // DB'den kampanyaları çeken fonksiyon
  const fetchKampanyalar = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/kampanyalar');
      if (data && Array.isArray(data)) {
        setKampanyalar(formatKampanyalar(data));
      }
    } catch (error) {
      console.error('Kampanyaları getirirken bir hata oluştu:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKampanyalar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kampanya ekleme fonksiyonu — POST sonrası backend'den yeniden çeker
  const addKampanya = async (kampanya: Omit<Kampanya, 'id'>) => {
    try {
      setLoading(true);

      const kampanyaData = {
        kampanyaAdi: kampanya.kampanyaAdi,
        egitimTipi: kampanya.egitimTipi,
        kurSayisi: kampanya.kurSayisi || 1,
        toplamDersSaati: kampanya.toplamDersSaati || 0,
        listeFiyati: kampanya.listeFiyati || 0,
        nakitFiyati: kampanya.nakitFiyati || 0,
        indirimOrani: Math.round(kampanya.indirimOrani || 0),
        faizOrani: Math.round(kampanya.faizOrani || 12),
        kitapFiyati: kampanya.kitapFiyati || 0,
        kitapSetSayisi: kampanya.kitapSetSayisi || 1,
        maxKrediKartiTaksit: kampanya.maxKrediKartiTaksit || 8,
        maxSenetTaksit: kampanya.maxSenetTaksit || 12,
        hediyeler: kampanya.hediyeler || [],
        subeId: (kampanya as any).subeId ?? null
      };

      await apiRequest('/api/kampanyalar', {
        method: 'POST',
        body: JSON.stringify(kampanyaData)
      });

      // POST başarılı — listeyi backend'den yeniden çek
      await fetchKampanyalar();

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
      await apiRequest(`/api/kampanyalar/${id}`, { method: 'DELETE' });
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

      const kampanyaData = {
        kampanyaAdi: updatedKampanya.kampanyaAdi,
        egitimTipi: updatedKampanya.egitimTipi,
        kurSayisi: updatedKampanya.kurSayisi || 1,
        toplamDersSaati: updatedKampanya.toplamDersSaati || 0,
        listeFiyati: updatedKampanya.listeFiyati || 0,
        nakitFiyati: updatedKampanya.nakitFiyati || 0,
        indirimOrani: Math.round(updatedKampanya.indirimOrani || 0),
        faizOrani: Math.round(updatedKampanya.faizOrani || 12),
        kitapFiyati: updatedKampanya.kitapFiyati || 0,
        kitapSetSayisi: updatedKampanya.kitapSetSayisi || 1,
        maxKrediKartiTaksit: updatedKampanya.maxKrediKartiTaksit || 8,
        maxSenetTaksit: updatedKampanya.maxSenetTaksit || 12,
        hediyeler: updatedKampanya.hediyeler || []
      };

      await apiRequest(`/api/kampanyalar/${updatedKampanya.id}`, {
        method: 'PUT',
        body: JSON.stringify(kampanyaData)
      });

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
        const formattedKampanyalar = formatKampanyalar(data);

        const sortedKampanyalar = [...formattedKampanyalar].sort((a, b) => {
          if (a.egitimTipi !== b.egitimTipi) {
            return a.egitimTipi.localeCompare(b.egitimTipi);
          }
          if (a.egitimTipi === "Genel İngilizce" && b.egitimTipi === "Genel İngilizce") {
            if (a.kampanyaAdi === "1+1 KAMPANYASI") return -1;
            if (b.kampanyaAdi === "1+1 KAMPANYASI") return 1;
          }
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

  const refreshKampanyalar = async (subeId?: number) => {
    if (subeId) {
      await getKampanyalarBySubeId(subeId);
    } else if (selectedSubeId) {
      await getKampanyalarBySubeId(selectedSubeId);
    } else {
      await fetchKampanyalar();
    }
  };

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
