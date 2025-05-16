import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from "@tanstack/react-query";
import { EgitimTipi, InsertEgitimTipi } from "@shared/schema";

const API_ENDPOINT = "/api/egitim-tipleri";

export interface EgitimTipleriResult {
  egitimTipleri: EgitimTipi[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  createEgitimTipi: ReturnType<typeof useMutation>;
  updateEgitimTipi: ReturnType<typeof useMutation>;
  deleteEgitimTipi: ReturnType<typeof useMutation>;
}

export function useEgitimTipleri(): EgitimTipleriResult {
  const queryClient = useQueryClient();
  
  // Tüm eğitim tiplerini getir - performans için staleTime uzun tutuldu
  const {
    data: egitimTipleri = [],
    isLoading,
    isError,
    error
  } = useQuery<EgitimTipi[]>({
    queryKey: [API_ENDPOINT],
    retry: 1,
    retryOnMount: false, 
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 10, // 10 dakika
    gcTime: 1000 * 60 * 60, // 1 saat - cacheTime yerine TanStack Query v5'te gcTime kullanılıyor
  });

  // Yeni eğitim tipi ekle
  const createEgitimTipi = useMutation({
    mutationFn: async (data: InsertEgitimTipi) => {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Eğitim tipi eklenirken bir hata oluştu");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] });
    },
  });

  // Eğitim tipini güncelle
  const updateEgitimTipi = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertEgitimTipi }) => {
      const response = await fetch(`${API_ENDPOINT}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Eğitim tipi güncellenirken bir hata oluştu");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] });
    },
  });

  // Eğitim tipini sil
  const deleteEgitimTipi = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_ENDPOINT}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        // Sunucudan gelen hata mesajını alma
        const errorData = await response.json().catch(() => ({ error: "Bilinmeyen hata" }));
        
        if (response.status === 409) {
          // 409 Conflict - Eğitim tipi kullanımda
          throw new Error(errorData.error || "Bu eğitim tipi bir veya daha fazla kampanyada kullanıldığı için silinemez");
        } else if (response.status === 404) {
          throw new Error("Silinecek eğitim tipi bulunamadı");
        } else {
          throw new Error(errorData.error || "Eğitim tipi silinirken bir hata oluştu");
        }
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] });
    },
  });

  return {
    egitimTipleri,
    isLoading,
    isError,
    error,
    createEgitimTipi,
    updateEgitimTipi,
    deleteEgitimTipi,
  };
}