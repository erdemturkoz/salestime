import React from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';

export default function DirectLogin() {
  const { login } = useAuth();

  const handleDirectLogin = async () => {
    try {
      await login({ telefon: "admin", sifre: "admin" });
    } catch (error) {
      console.error("Doğrudan giriş başarısız:", error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={handleDirectLogin}
        variant="outline"
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Hızlı Giriş
      </Button>
    </div>
  );
}