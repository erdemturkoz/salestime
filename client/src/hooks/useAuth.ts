import { useQuery, useMutation } from "@tanstack/react-query";
import { Login, ChangePassword, KullaniciWithRollerVeSubeler, Kullanici } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type User = KullaniciWithRollerVeSubeler | Kullanici;

export function useAuth() {
  const { toast } = useToast();
  
  // Mevcut oturum kontrolü
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/current-user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/current-user");
        if (!res.ok) {
          if (res.status === 401) {
            // Oturum açık değil - hata mesajı gösterme
            return null;
          }
          throw new Error("Oturum bilgisi alınamadı");
        }
        return res.json();
      } catch (error) {
        console.error("Oturum bilgisi alınamadı:", error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 dakika
  });

  // Giriş işlemi
  const loginMutation = useMutation({
    mutationFn: async (credentials: Login) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Giriş yapılamadı");
      }
      return res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/auth/current-user"], userData);
      toast({
        title: "Giriş Başarılı",
        description: `Hoş geldiniz, ${userData.adi} ${userData.soyadi}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Giriş Başarısız",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Çıkış işlemi
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Çıkış yapılamadı");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/current-user"], null);
      toast({
        title: "Çıkış Başarılı",
        description: "Başarıyla çıkış yaptınız.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Çıkış Başarısız",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Şifre değiştirme
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: ChangePassword) => {
      const res = await apiRequest("POST", "/api/auth/change-password", passwordData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Şifre değiştirilemedi");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Şifre Değiştirildi",
        description: "Şifreniz başarıyla değiştirildi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Şifre Değiştirilemedi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Kullanıcı rol kontrolü yardımcı fonksiyonları
  const hasRole = (role: string) => {
    if (!user || !("roller" in user)) return false;
    return user.roller.some(r => r.rol === role);
  };

  const isKurucu = () => hasRole("Kurucu");
  const isMudur = () => hasRole("Müdür");
  const isSatisDanismani = () => hasRole("Satış Danışmanı");
  const isAdmin = () => isKurucu() || isMudur();

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    isPending: loginMutation.isPending || logoutMutation.isPending || changePasswordMutation.isPending,
    isKurucu,
    isMudur,
    isSatisDanismani,
    isAdmin,
  };
}