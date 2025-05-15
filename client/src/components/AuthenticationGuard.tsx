import React from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const AuthenticationGuard: React.FC<Props> = ({ children, adminOnly = false }) => {
  const { user, isLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  // Yükleniyor durumu
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Kimlik doğrulama kontrolü
  if (!user) {
    return <Redirect to="/giris" />;
  }

  // Admin yetkisi kontrolü
  if (adminOnly && !isAdmin()) {
    // İzin verilmeyen durum - ana sayfaya yönlendir
    return <Redirect to="/" />;
  }

  // Yetkilendirme geçildi, children'ı göster
  return <>{children}</>;
};

export default AuthenticationGuard;