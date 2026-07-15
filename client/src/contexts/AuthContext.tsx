import React, { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { KullaniciWithRollerVeSubeler, Kullanici } from "@shared/schema";
import { saveUser, getUser, clearUser } from "@/lib/authStorage";

type User = KullaniciWithRollerVeSubeler | Kullanici;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (credentials: { telefon: string; sifre: string }) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (data: { oldPassword: string; newPassword: string }) => Promise<void>;
  isAdmin: () => boolean;
  isFullAdmin: () => boolean;
  canManageCampaigns: () => boolean;
  isMudur: () => boolean;
  isDanisman: () => boolean;
  getManagedSubeIds: () => number[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [loginPending, setLoginPending] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [changePwdPending, setChangePwdPending] = useState(false);
  
  // LocalStorage'dan kullanıcı bilgisini kontrol et
  const [localUser, setLocalUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Sayfa yüklendiğinde localStorage'dan kullanıcı bilgisini al
    const storedUser = getUser();
    if (storedUser) {
      setLocalUser(storedUser);
    }
  }, []);
  
  // Sunucudan kullanıcı bilgilerini getir
  const { 
    data: serverUser, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ["/api/auth/current-user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/current-user", {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log("Current user response status:", res.status);
        if (!res.ok) {
          if (res.status === 401) {
            // 401 hatası durumunda sessizce null döndür
            return null;
          }
          throw new Error("Oturum bilgisi alınamadı");
        }
        const userData = await res.json();
        
        // Kullanıcı bilgisi localStorage'a kaydet
        saveUser(userData);
        
        return userData;
      } catch (error) {
        console.error("Oturum bilgisi alınamadı:", error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 dakika
  });
  
  // Sunucu kesin cevap verene kadar (yüklenirken) localStorage'daki kullanıcıyı
  // iyimser şekilde göster; sunucu cevap verdikten sonra YALNIZCA sunucuya güven.
  // Sunucu 401 dönerse (oturum geçersiz/süresi dolmuş) eski localStorage temizlenir.
  useEffect(() => {
    if (!isLoading && serverUser === null) {
      clearUser();
      setLocalUser(null);
    }
  }, [isLoading, serverUser]);

  // @ts-ignore
  const user = isLoading ? (serverUser ?? localUser) : serverUser;

  // Giriş yap
  const login = async (credentials: { telefon: string; sifre: string }) => {
    try {
      setLoginPending(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Giriş yapılamadı");
      }
      
      const userData = await res.json();
      
      // LocalStorage'a kaydet ve state'i güncelle
      saveUser(userData);
      setLocalUser(userData);
      
      queryClient.setQueryData(["/api/auth/current-user"], userData);
      
      toast({
        title: "Giriş Başarılı",
        description: "Hoş geldiniz!",
      });
      
      console.log("Giriş başarılı, kullanıcı verisi:", userData);
      
      // Kullanıcı verilerini güncelle
      const updatedUser = await refetch();
      console.log("Yenilenen kullanıcı verisi:", updatedUser.data);
      
      window.location.href = "/"; // Sayfayı yenileme ve ana sayfaya gitme
    } catch (error: any) {
      toast({
        title: "Giriş Başarısız",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoginPending(false);
    }
  };

  // Çıkış yap
  const logout = async () => {
    try {
      setLogoutPending(true);
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Çıkış yapılamadı");
      }
      
      queryClient.setQueryData(["/api/auth/current-user"], null);
      
      // LocalStorage'dan kullanıcı bilgisini sil
      clearUser();
      
      setLocalUser(null);
      
      toast({
        title: "Çıkış Başarılı",
        description: "Başarıyla çıkış yaptınız.",
      });
      
      window.location.href = "/giris"; // Çıkış sonrası giriş sayfasına yönlendir
    } catch (error: any) {
      toast({
        title: "Çıkış Başarısız",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLogoutPending(false);
    }
  };

  // Şifre değiştir
  const changePassword = async (data: { oldPassword: string; newPassword: string }) => {
    try {
      setChangePwdPending(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Şifre değiştirilemedi");
      }
      
      toast({
        title: "Şifre Değiştirildi",
        description: "Şifreniz başarıyla değiştirildi.",
      });
    } catch (error: any) {
      toast({
        title: "Şifre Değiştirilemedi",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setChangePwdPending(false);
    }
  };

  // Kullanıcı rolleri
  const getRoles = (): string[] => {
    if (!user || !("roller" in user) || !user.roller) return [];
    return user.roller.map((r: any) => r.rol);
  };

  // Tam yetkili admin (Kurucu / Sistem Yöneticisi) — tüm şubelere hakim
  const isFullAdmin = () => {
    const roles = getRoles();
    return roles.includes("Sistem Yöneticisi") || roles.includes("Kurucu");
  };

  // Şube müdürü
  const isMudur = () => getRoles().includes("Müdür");

  // Kampanya yönetebilir mi? (Tam admin veya müdür)
  const canManageCampaigns = () => isFullAdmin() || isMudur();

  // Yalnızca satış danışmanı mı? (yönetim yetkisi yok)
  const isDanisman = () => !canManageCampaigns();

  // Müdür olarak yönetilen şube id'leri
  const getManagedSubeIds = (): number[] => {
    if (!user || !("roller" in user) || !user.roller) return [];
    const ids = user.roller
      .filter((r: any) => r.rol === "Müdür")
      .map((r: any) => r.subeId)
      .filter((x: any) => x !== null && x !== undefined);
    return Array.from(new Set<number>(ids));
  };

  // Geriye dönük uyumluluk: isAdmin = kampanya yönetebilenler (tam admin + müdür)
  const isAdmin = () => canManageCampaigns();

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isAuthenticated: !!user,
        login,
        logout,
        changePassword,
        isAdmin,
        isFullAdmin,
        canManageCampaigns,
        isMudur,
        isDanisman,
        getManagedSubeIds,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}