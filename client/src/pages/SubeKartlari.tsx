import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Users, Building, User, Edit, Trash, Plus, Phone, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// Form şeması
const subeSchema = z.object({
  subeAdi: z.string().min(2, "Şube adı en az 2 karakter olmalıdır"),
  subeAdresi: z.string().optional(),
  subeTelefon: z.string().optional(),
});

// Rol renk haritası
const rolColors: Record<string, string> = {
  "Kurucu": "bg-amber-200 border-amber-500",
  "Müdür": "bg-blue-200 border-blue-500",
  "Satış Danışmanı": "bg-green-200 border-green-500",
};

const SubeKartlari = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSubeDialogOpen, setIsSubeDialogOpen] = useState(false);
  const [editSubeId, setEditSubeId] = useState<number | null>(null);

  // Formları ayarla
  const subeForm = useForm({
    resolver: zodResolver(subeSchema),
    defaultValues: {
      subeAdi: '',
      subeAdresi: '',
      subeTelefon: '',
    },
  });

  // Şubeleri getir
  const { data: subeler, isLoading: subelerLoading } = useQuery({
    queryKey: ['/api/subeler'],
    retry: false,
  });

  // Şube ekleme
  const { mutate: createSube, isPending: isCreatingShube } = useMutation({
    mutationFn: (data: any) => apiRequest('/api/subeler', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subeler'] });
      toast({
        title: "Şube eklendi",
        description: "Şube başarıyla eklendi"
      });
      setIsSubeDialogOpen(false);
      subeForm.reset();
    },
    onError: (err) => {
      console.error("Şube eklenirken bir hata oluştu:", err);
      toast({
        title: "Hata",
        description: "Şube eklenirken bir hata oluştu",
        variant: "destructive"
      });
    }
  });

  // Şube güncelleme
  const { mutate: updateSube, isPending: isUpdatingSube } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/subeler/${id}`, { method: 'PATCH', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subeler'] });
      toast({
        title: "Şube güncellendi",
        description: "Şube bilgileri başarıyla güncellendi"
      });
      setIsSubeDialogOpen(false);
      setEditSubeId(null);
      subeForm.reset();
    },
    onError: (err) => {
      console.error("Şube güncellenirken bir hata oluştu:", err);
      toast({
        title: "Hata",
        description: "Şube güncellenirken bir hata oluştu",
        variant: "destructive"
      });
    }
  });

  // Şube silme
  const { mutate: deleteSube } = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/subeler/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subeler'] });
      toast({
        title: "Şube silindi",
        description: "Şube başarıyla silindi"
      });
    },
    onError: (err) => {
      console.error("Şube silinirken bir hata oluştu:", err);
      toast({
        title: "Hata",
        description: "Şube silinirken bir hata oluştu. Bağlı kullanıcılar varsa önce onları silmelisiniz.",
        variant: "destructive"
      });
    }
  });

  // Şube formunu gönder
  const handleSubmitSube = (data: any) => {
    if (editSubeId) {
      updateSube({ id: editSubeId, data });
    } else {
      createSube(data);
    }
  };

  // Şube düzenleme formunu aç
  const handleEditSube = (sube: any) => {
    setEditSubeId(sube.id);
    subeForm.reset({
      subeAdi: sube.subeAdi,
      subeAdresi: sube.subeAdresi || '',
      subeTelefon: sube.subeTelefon || '',
    });
    setIsSubeDialogOpen(true);
  };

  // Yeni şube ekleme formunu aç
  const openNewSubeForm = () => {
    setEditSubeId(null);
    subeForm.reset({
      subeAdi: '',
      subeAdresi: '',
      subeTelefon: '',
    });
    setIsSubeDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Şube Yönetimi</h1>
        <Button onClick={openNewSubeForm}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Şube Ekle
        </Button>
      </div>

      {subelerLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-md">
              <CardHeader className="pb-4">
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subeler?.map((sube: any) => (
            <Card key={sube.id} className="shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-start">
                  <span className="text-xl font-bold">{sube.subeAdi}</span>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditSube(sube)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteSube(sube.id)}>
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription className="flex flex-col space-y-1">
                  {sube.subeAdresi && (
                    <span className="flex items-center text-sm">
                      <MapPin className="h-3.5 w-3.5 mr-1" /> {sube.subeAdresi}
                    </span>
                  )}
                  {sube.subeTelefon && (
                    <span className="flex items-center text-sm">
                      <Phone className="h-3.5 w-3.5 mr-1" /> {sube.subeTelefon}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Accordion type="single" collapsible className="border rounded-md">
                  <AccordionItem value="employees">
                    <AccordionTrigger className="py-3 px-4">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <span>Çalışanlar ({sube.kullanicilar?.length || 0})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-1">
                      {sube.kullanicilar?.length > 0 ? (
                        <div className="space-y-3">
                          {sube.kullanicilar.map((kullanici: any) => (
                            <div key={kullanici.kullaniciId} className="flex items-center justify-between border rounded-md p-2">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                <span>{kullanici.kullaniciAdi} {kullanici.kullaniciSoyadi}</span>
                              </div>
                              <Badge className={`${rolColors[kullanici.rol] || "bg-gray-200"} text-xs`}>
                                {kullanici.rol}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Bu şubede henüz çalışan bulunmuyor.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Şube Ekleme/Düzenleme Dialogu */}
      <Dialog open={isSubeDialogOpen} onOpenChange={setIsSubeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editSubeId ? "Şube Düzenle" : "Yeni Şube Ekle"}</DialogTitle>
            <DialogDescription>
              {editSubeId ? "Şube bilgilerini güncelleyin" : "Yeni bir şube ekleyin"}
            </DialogDescription>
          </DialogHeader>
          <Form {...subeForm}>
            <form onSubmit={subeForm.handleSubmit(handleSubmitSube)} className="space-y-4">
              <FormField
                control={subeForm.control}
                name="subeAdi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şube Adı</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Şubenin adını girin" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subeForm.control}
                name="subeAdresi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Şubenin adresini girin" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subeForm.control}
                name="subeTelefon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Şubenin telefon numarasını girin" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsSubeDialogOpen(false)}
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreatingShube || isUpdatingSube}
                >
                  {editSubeId ? "Güncelle" : "Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubeKartlari;