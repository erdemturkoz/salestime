import React from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface AuthenticationGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function AuthenticationGuard({ children, adminOnly = false }: AuthenticationGuardProps) {
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

  // Admin yetkisi kontrolü
  if (adminOnly) {
    const userRoles = user.roller?.map(r => r.rol) || [];
    const isAdmin = userRoles.includes("Kurucu") || userRoles.includes("Müdür");
    
    if (!isAdmin) {
      return <Redirect to="/" />;
    }
  }

  // Oturum varsa ve yetkiler uygunsa içeriği göster
  return <>{children}</>;
}