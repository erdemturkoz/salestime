import React from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface AuthenticationGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;       // Tam admin VEYA müdür (kampanya/kullanıcı yönetimi)
  fullAdminOnly?: boolean;   // Yalnızca tam admin (şube/eğitim tipi yönetimi)
}

export default function AuthenticationGuard({ children, adminOnly = false, fullAdminOnly = false }: AuthenticationGuardProps) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Oturum yüklenirken yükleme ekranı göster
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Oturum yoksa giriş sayfasına yönlendir
  if (!user) {
    return <Redirect to="/giris" />;
  }

  const userRoles = ("roller" in user ? user.roller : [])?.map((r: any) => r.rol) || [];
  const isFullAdmin = userRoles.includes("Sistem Yöneticisi") || userRoles.includes("Kurucu");
  const canManage = isFullAdmin || userRoles.includes("Müdür");

  // Yalnızca tam admin gerektiren sayfalar (şubeler, eğitim tipleri)
  if (fullAdminOnly && !isFullAdmin) {
    return <Redirect to="/" />;
  }

  // Yönetim (tam admin veya müdür) gerektiren sayfalar
  if (adminOnly && !canManage) {
    return <Redirect to="/" />;
  }

  // Oturum varsa ve yetkiler uygunsa içeriği göster
  return <>{children}</>;
}