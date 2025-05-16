import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from "@tanstack/react-query";
import { EgitimTipi, InsertEgitimTipi } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const API_ENDPOINT = "/api/egitim-tipleri";

export function useEgitimTipleri() {
  const queryClient = useQueryClient();
  
  // Tüm eğitim tiplerini getir
  const {
    data: egitimTipleri = [],
    isLoading,
    error
  } = useQuery<EgitimTipi[]>({
    queryKey: [API_ENDPOINT],
  });

  // Yeni eğitim tipi ekle
  const createEgitimTipi = useMutation({
    mutationFn: async (data: InsertEgitimTipi) => {
      const response = await apiRequest("POST", API_ENDPOINT, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] });
    },
  });

  // Eğitim tipini güncelle
  const updateEgitimTipi = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertEgitimTipi }) => {
      const response = await apiRequest("PUT", `${API_ENDPOINT}/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] });
    },
  });

  // Eğitim tipini sil
  const deleteEgitimTipi = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `${API_ENDPOINT}/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINT] });
    },
  });

  return {
    egitimTipleri,
    isLoading,
    error,
    createEgitimTipi,
    updateEgitimTipi,
    deleteEgitimTipi,
  };
}