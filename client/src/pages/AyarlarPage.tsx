import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@shared/schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function AyarlarPage() {
  const { userRole } = useAuth();
  
  // Sadece admin ve kurucu erişebilir
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.KURUCU) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Erişim Reddedildi</h1>
        <p>Bu sayfayı görüntülemek için yetkiniz yok.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">Ayarlar</h1>
        <p className="text-neutral-500">Sistem ayarlarını yapılandırın</p>
      </header>
      
      <Tabs defaultValue="genel" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="genel">Genel Ayarlar</TabsTrigger>
          <TabsTrigger value="bildirimler">Bildirim Ayarları</TabsTrigger>
          <TabsTrigger value="gorunum">Görünüm</TabsTrigger>
        </TabsList>
        
        <TabsContent value="genel">
          <Card>
            <CardHeader>
              <CardTitle>Genel Ayarlar</CardTitle>
              <CardDescription>
                Temel sistem ayarlarını buradan yapılandırabilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Şirket Adı</Label>
                  <Input id="company-name" defaultValue="Dil Kursu A.Ş." />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tax-id">Vergi Numarası</Label>
                  <Input id="tax-id" defaultValue="1234567890" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="default-currency">Varsayılan Para Birimi</Label>
                  <Input id="default-currency" defaultValue="TL" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="tax-included">Fiyatlara KDV Dahil</Label>
                    <p className="text-sm text-muted-foreground">
                      Tüm fiyatlar KDV dahil olarak görüntülensin.
                    </p>
                  </div>
                  <Switch id="tax-included" defaultChecked />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Kaydet</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="bildirimler">
          <Card>
            <CardHeader>
              <CardTitle>Bildirim Ayarları</CardTitle>
              <CardDescription>
                Sistem bildirimleri ve hatırlatıcıları yapılandırın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="new-campaign">Yeni Kampanya Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      Yeni bir kampanya eklendiğinde bildirim gönder
                    </p>
                  </div>
                  <Switch id="new-campaign" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="price-change">Fiyat Değişikliği Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      Bir kampanyanın fiyatı değiştiğinde bildirim gönder
                    </p>
                  </div>
                  <Switch id="price-change" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-summary">Günlük Özet</Label>
                    <p className="text-sm text-muted-foreground">
                      Günlük aktivite özeti e-postası gönder
                    </p>
                  </div>
                  <Switch id="daily-summary" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Kaydet</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="gorunum">
          <Card>
            <CardHeader>
              <CardTitle>Görünüm Ayarları</CardTitle>
              <CardDescription>
                Arayüz ve tema ayarları
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Ana Renk</Label>
                  <div className="flex gap-2">
                    <Input id="primary-color" type="color" defaultValue="#3b82f6" className="w-16 h-10" />
                    <Input defaultValue="#3b82f6" className="flex-1" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logo-upload">Logo</Label>
                  <Input id="logo-upload" type="file" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dark-mode">Karanlık Mod</Label>
                    <p className="text-sm text-muted-foreground">
                      Varsayılan olarak karanlık modu kullan
                    </p>
                  </div>
                  <Switch id="dark-mode" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Kaydet</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}