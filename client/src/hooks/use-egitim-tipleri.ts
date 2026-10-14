import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { EgitimTipi, InsertEgitimTipi } from "@shared/schema";
import { useAppContext } from "@/contexts/AppContext";

const API_ENDPOINT = "/api/egitim-tipleri";

export interface EgitimTipleriResult {
  egitimTipleri: EgitimTipi[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  createEgitimTipi: UseMutationResult<unknown, Error, InsertEgitimTipi>;
  updateEgitimTipi: UseMutationResult<unknown, Error, { id: number; data: InsertEgitimTipi & { subeId?: number } }>;
  deleteEgitimTipi: UseMutationResult<number, Error, number>;
}

export function useEgitimTipleri(subeId?: number | null): EgitimTipleriResult {
  const queryClient = useQueryClient();
  const { refreshKampanyalar } = useAppContext();
  
  // Tüm eğitim tiplerini getir - performans için staleTime uzun tutuldu
  const {
    data: egitimTipleri = [],
    isLoading,
    isError,
    error
  } = useQuery<EgitimTipi[]>({
    queryKey: [API_ENDPOINT, subeId ?? null],
    queryFn: async () => {
      const url = subeId == null ? API_ENDPOINT : `${API_ENDPOINT}?subeId=${encodeURIComponent(subeId)}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error || `Eğitim tipleri yüklenemedi (${response.status})`);
      }
      return response.json();
    },
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
        body: JSON.stringify({ ...data, subeId: data.subeId ?? subeId ?? undefined }),
      });
      
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error || detail?.message || "Eğitim tipi eklenirken bir hata oluştu");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] });
      queryClient.invalidateQueries({ queryKey: ["/api/kampanyalar"] });
    },
  });

  // Eğitim tipini güncelle
  const updateEgitimTipi = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertEgitimTipi & { subeId?: number } }) => {
      const response = await fetch(`${API_ENDPOINT}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error || detail?.message || "Eğitim tipi güncellenirken bir hata oluştu");
      }
      
      return await response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] });
      queryClient.invalidateQueries({ queryKey: ["/api/kampanyalar"] });
      // Campaigns also live in AppContext, outside the query cache.
      await refreshKampanyalar();
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
          throw new Error(errorData.error || errorData.message || "Bu eğitim tipi bir veya daha fazla kampanyada kullanıldığı için silinemez");
        } else if (response.status === 404) {
          throw new Error("Silinecek eğitim tipi bulunamadı");
        } else {
          throw new Error(errorData.error || errorData.message || "Eğitim tipi silinirken bir hata oluştu");
        }
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] });
      queryClient.invalidateQueries({ queryKey: ["/api/kampanyalar"] });
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