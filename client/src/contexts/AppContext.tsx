import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Kampanya } from '@/types';

// Define a mock initial kampanya if needed
const initialKampanya: Kampanya = {
  id: 'initial-kampanya',
  kampanyaAdi: 'Demo Kampanya',
  egitimTipi: 'Genel İngilizce',
  kurSayisi: 3,
  listeFiyati: 10000,
  nakitFiyati: 8500,
  indirimOrani: 15,
  faizOrani: 12,
  kitapFiyati: 1000,
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
}

// Create the context with default values to avoid undefined checks
const defaultContextValue: AppContextType = {
  kampanyalar: [initialKampanya],
  addKampanya: () => {},
  deleteKampanya: () => {},
  updateKampanya: () => {}
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

  // LocalStorage'dan kampanyaları yükle
  useEffect(() => {
    const savedKampanyalar = localStorage.getItem('kampanyalar');
    if (savedKampanyalar) {
      try {
        const parsedData = JSON.parse(savedKampanyalar);
        
        // Eski formattan yeni formata dönüştür (string[] -> Hediye[])
        const updatedKampanyalar = parsedData.map((kampanya: any) => {
          if (kampanya.hediyeler && Array.isArray(kampanya.hediyeler)) {
            // Eğer hediyeler bir dizi string ise, onları Hediye nesnesine dönüştür
            if (typeof kampanya.hediyeler[0] === 'string') {
              return {
                ...kampanya,
                hediyeler: kampanya.hediyeler.map((h: string) => ({ isim: h, fiyat: 0 }))
              };
            }
          }
          return kampanya;
        });
        
        setKampanyalar(updatedKampanyalar);
      } catch (error) {
        console.error('Kampanyalar yüklenirken hata oluştu:', error);
        localStorage.removeItem('kampanyalar');
      }
    }
  }, []);

  // Kampanyalar değiştiğinde localStorage'ı güncelle
  useEffect(() => {
    localStorage.setItem('kampanyalar', JSON.stringify(kampanyalar));
  }, [kampanyalar]);

  const addKampanya = (kampanya: Omit<Kampanya, 'id'>) => {
    const newKampanya: Kampanya = {
      ...kampanya,
      id: Date.now().toString(), // Benzersiz bir ID oluştur
    };
    setKampanyalar(prev => [...prev, newKampanya]);
  };

  const deleteKampanya = (id: string) => {
    setKampanyalar(prev => prev.filter(kampanya => kampanya.id !== id));
  };

  const updateKampanya = (updatedKampanya: Kampanya) => {
    setKampanyalar(prev => 
      prev.map(kampanya => 
        kampanya.id === updatedKampanya.id ? updatedKampanya : kampanya
      )
    );
  };

  const contextValue = {
    kampanyalar,
    addKampanya,
    deleteKampanya,
    updateKampanya
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
