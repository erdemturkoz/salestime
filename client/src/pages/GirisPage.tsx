import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { z } from "zod";
import { loginSchema, Login } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const GirisPage = () => {
  const { isAuthenticated, login, isPending } = useAuth();
  const [, setLocation] = useLocation();
  
  // Kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
  React.useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);
  
  // Şema oluştur
  const formSchema = loginSchema.extend({
    telefon: z.string().min(1, "Telefon numarası zorunludur"),
    sifre: z.string().min(1, "Şifre zorunludur")
  });
  
  // Form işleyicisini oluştur
  const form = useForm<Login>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      telefon: "",
      sifre: ""
    }
  });
  
  // Form gönderme
  const onSubmit = (data: Login) => {
    login(data);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Sol taraf - Giriş formu */}
        <div className="w-full md:w-1/2 p-8">
          <Card className="border-0 shadow-none">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">GİRİŞ YAP</CardTitle>
              <CardDescription className="text-center">
                Fiyat hesaplama sistemine erişmek için giriş yapın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="telefon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon Numarası</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Telefon numaranızı girin" 
                            {...field} 
                          />
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
                          <Input 
                            type="password" 
                            placeholder="Şifrenizi girin" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Giriş Yapılıyor...
                      </>
                    ) : (
                      "Giriş Yap"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            
            <CardFooter className="flex flex-col items-center">
              <p className="text-sm text-gray-500 mt-4">
                Eğer giriş yapamıyorsanız, lütfen yöneticinizle iletişime geçin.
              </p>
            </CardFooter>
          </Card>
        </div>
        
        {/* Sağ taraf - Hero bölümü */}
        <div className="w-full md:w-1/2 p-8 flex items-center bg-primary text-white">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Dil Kursu Fiyatlandırma</h2>
            <p className="text-lg">
              Dil kursu fiyatlarını hesaplamak, ödeme planları oluşturmak ve 
              kampanyaları yönetmek için kapsamlı çözüm. Satış süreçlerinizi hızlandırın.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Kolay fiyatlandırma hesaplama
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Kampanya ve promosyon yönetimi
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Ödeme planı oluşturma
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                PDF teklif çıktıları
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GirisPage;