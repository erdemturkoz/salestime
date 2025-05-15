import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Backend'in beklediği alan isimleriyle uyumlu form şeması (telefon, sifre)
const loginSchema = z.object({
  telefon: z.string().min(1, "Kullanıcı adı zorunludur"),
  sifre: z.string().min(1, "Şifre zorunludur"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function GirisPage() {
  const { user, isLoading, login } = useAuth();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      telefon: "",
      sifre: "",
    },
  });

  // Eğer kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsSubmitting(true);
      await login(data);
      navigate('/');
    } catch (error) {
      console.error('Giriş hatası:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="grid w-full max-w-[1000px] grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sol Kolon - Giriş Formu */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Giriş Yap</CardTitle>
            <CardDescription className="text-center">
              Hesabınıza giriş yaparak devam edin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="telefon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kullanıcı Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Kullanıcı adınızı girin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sifre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şifre</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Şifrenizi girin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Giriş Yapılıyor
                    </>
                  ) : (
                    "Giriş Yap"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Sağ Kolon - Tanıtım */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg hidden lg:block">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Satış Danışmanları için Fiyatlandırma Sistemi</CardTitle>
            <CardDescription className="text-blue-100 mt-2">
              Kampanya oluşturma, fiyat hesaplama ve teklif hazırlama süreçlerinizi basitleştirin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-white/10 p-3">
              <h3 className="font-medium mb-1">✓ Kolay Fiyat Hesaplama</h3>
              <p className="text-sm text-blue-100">Tüm kurlar ve kampanyalar için anında fiyat hesaplama</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <h3 className="font-medium mb-1">✓ Özel İndirimler</h3>
              <p className="text-sm text-blue-100">Kampanya ve yönetici indirimlerini kolayca uygulama</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <h3 className="font-medium mb-1">✓ PDF Teklif Hazırlama</h3>
              <p className="text-sm text-blue-100">Tek tıkla profesyonel teklif dokümanları oluşturma</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}