import React, { useState, useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { Kampanya, Hediye } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { calculateDiscount, formatCurrency, formatPercentage } from "@/lib/utils";
import { calculateInstallments } from "@/utils/calculator";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import HediyeTag from "@/components/HediyeTag";
import { RefreshCwIcon } from "lucide-react";

const UcretlendirmePage = () => {
  const { kampanyalar, addKampanya, deleteKampanya, updateKampanya } = useAppContext();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Omit<Kampanya, "id">>({
    kampanyaAdi: "",
    egitimTipi: "",
    kurSayisi: 1,
    toplamDersSaati: 0,
    listeFiyati: 0,
    nakitFiyati: 0,
    indirimOrani: 0,
    faizOrani: 12,
    kitapFiyati: 0,
    kitapSetSayisi: 1,
    maxKrediKartiTaksit: 8,
    maxSenetTaksit: 12,
    hediyeler: [],
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [hediyeInput, setHediyeInput] = useState("");
  const [hediyeFiyat, setHediyeFiyat] = useState<number>(0);
  const [krediKartiTaksitler, setKrediKartiTaksitler] = useState<Array<{taksit: number, aylik: number, toplam: number}>>([]);
  const [senetTaksitler, setSenetTaksitler] = useState<Array<{taksit: number, aylik: number, toplam: number}>>([]);
  
  // Form doğrulama için hata state'leri
  const [formErrors, setFormErrors] = useState<{
    kampanyaAdi?: string;
    egitimTipi?: string;
    kurSayisi?: string;
    toplamDersSaati?: string;
    listeFiyati?: string;
    nakitFiyati?: string;
    faizOrani?: string;
    kitapFiyati?: string;
  }>({});

  // Form değişikliklerini izle
  useEffect(() => {
    if (formData.nakitFiyati > 0 && formData.faizOrani > 0) {
      // Kredi kartı taksit seçeneklerini dinamik olarak oluştur
      const krediKartiOpsiyonlari = [1]; // Tek çekim her zaman olsun
      if (formData.maxKrediKartiTaksit >= 2) krediKartiOpsiyonlari.push(2);
      if (formData.maxKrediKartiTaksit >= 4) krediKartiOpsiyonlari.push(4);
      if (formData.maxKrediKartiTaksit >= 6) krediKartiOpsiyonlari.push(6);
      if (formData.maxKrediKartiTaksit >= 8) krediKartiOpsiyonlari.push(8);
      if (formData.maxKrediKartiTaksit >= 10) krediKartiOpsiyonlari.push(10);
      
      // Senet taksit seçeneklerini dinamik olarak oluştur
      const senetOpsiyonlari = [];
      if (formData.maxSenetTaksit >= 2) senetOpsiyonlari.push(2);
      if (formData.maxSenetTaksit >= 4) senetOpsiyonlari.push(4);
      if (formData.maxSenetTaksit >= 6) senetOpsiyonlari.push(6);
      if (formData.maxSenetTaksit >= 8) senetOpsiyonlari.push(8);
      if (formData.maxSenetTaksit >= 10) senetOpsiyonlari.push(10);
      if (formData.maxSenetTaksit >= 12) senetOpsiyonlari.push(12);

      // Kredi kartı işlemlerinde %10 fatura bedeli ekleniyor
      const krediKartiFiyat = formData.nakitFiyati * 1.1; // %10 fatura bedeli ekleniyor
      const kartiTaksitler = calculateInstallments(krediKartiFiyat, formData.faizOrani, krediKartiOpsiyonlari);
      const senetTaksitlerHesap = calculateInstallments(formData.nakitFiyati, formData.faizOrani, senetOpsiyonlari);
      
      setKrediKartiTaksitler(kartiTaksitler);
      setSenetTaksitler(senetTaksitlerHesap);
    }
  }, [formData.nakitFiyati, formData.faizOrani, formData.maxKrediKartiTaksit, formData.maxSenetTaksit]);

  // Liste fiyatı veya nakit fiyatı değiştiğinde indirim oranını hesapla
  useEffect(() => {
    if (formData.listeFiyati > 0 && formData.nakitFiyati > 0) {
      const discount = calculateDiscount(formData.listeFiyati, formData.nakitFiyati);
      setFormData(prev => ({ ...prev, indirimOrani: parseFloat(discount.toFixed(1)) }));
    }
  }, [formData.listeFiyati, formData.nakitFiyati]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === "number" ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleAddHediye = () => {
    const trimmedInput = hediyeInput.trim();
    
    if (trimmedInput) {
      const yeniHediye = {
        isim: trimmedInput,
        fiyat: hediyeFiyat
      };
      
      setFormData(prevData => {
        const updatedHediyeler = [...prevData.hediyeler, yeniHediye];
        return {
          ...prevData,
          hediyeler: updatedHediyeler
        };
      });
      
      // Formu sıfırla
      setHediyeInput("");
      setHediyeFiyat(0);
    }
  };

  const handleRemoveHediye = (index: number) => {
    setFormData(prev => ({
      ...prev,
      hediyeler: prev.hediyeler.filter((_, idx) => idx !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Tüm form hatalarını sıfırla
    setFormErrors({});
    
    // Tüm zorunlu alanları kontrol et
    let hasErrors = false;
    const errors: { [key: string]: string } = {};
    
    if (!formData.kampanyaAdi) {
      errors.kampanyaAdi = "Kampanya adı boş olamaz";
      hasErrors = true;
    }
    
    if (!formData.egitimTipi) {
      errors.egitimTipi = "Lütfen bir eğitim tipi seçin";
      hasErrors = true;
    }

    if (!formData.kurSayisi || formData.kurSayisi <= 0) {
      errors.kurSayisi = "Kur sayısı 0'dan büyük olmalıdır";
      hasErrors = true;
    }
    
    if (!formData.toplamDersSaati || formData.toplamDersSaati <= 0) {
      errors.toplamDersSaati = "Toplam ders saati belirtilmelidir";
      hasErrors = true;
    }

    if (!formData.listeFiyati || formData.listeFiyati <= 0) {
      errors.listeFiyati = "Liste fiyatı 0'dan büyük olmalıdır";
      hasErrors = true;
    }

    if (!formData.nakitFiyati || formData.nakitFiyati <= 0) {
      errors.nakitFiyati = "Kampanyalı nakit fiyatı 0'dan büyük olmalıdır";
      hasErrors = true;
    }
    
    if (!formData.faizOrani || formData.faizOrani < 0) {
      errors.faizOrani = "Faiz oranı belirtilmelidir";
      hasErrors = true;
    }
    
    if (!formData.kitapFiyati && formData.kitapFiyati !== 0) {
      errors.kitapFiyati = "Kitap fiyatı belirtilmelidir";
      hasErrors = true;
    }
    
    // Eğer herhangi bir hata varsa, formErrors'ı güncelle ve işlemi durdur
    if (hasErrors) {
      setFormErrors(errors);
      
      // İlk hata için toast bildirimi göster
      const firstError = Object.values(errors)[0];
      toast({
        title: "Eksik veya Hatalı Bilgi",
        description: firstError,
        variant: "destructive",
      });
      
      // Formun en üstüne kaydır - hataları görebilmesi için
      document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (isEditing && editingId) {
      // Kampanyayı güncelle
      updateKampanya({
        ...formData,
        id: editingId
      });
      toast({
        title: "Başarılı",
        description: "Kampanya başarıyla güncellendi",
      });
      // Düzenleme modundan çık
      setIsEditing(false);
      setEditingId(null);
    } else {
      // Yeni kampanya ekle
      addKampanya(formData);
      toast({
        title: "Başarılı",
        description: "Kampanya başarıyla kaydedildi",
      });
    }

    // Form verilerini sıfırla
    setFormData({
      kampanyaAdi: "",
      egitimTipi: "",
      kurSayisi: 1,
      toplamDersSaati: 0,
      listeFiyati: 0,
      nakitFiyati: 0,
      indirimOrani: 0,
      faizOrani: 12,
      kitapFiyati: 0,
      kitapSetSayisi: 1,
      maxKrediKartiTaksit: 8,
      maxSenetTaksit: 12,
      hediyeler: [],
    });
  };

  const handleDeleteKampanya = (id: string) => {
    const kampanya = kampanyalar.find(k => k.id === id);
    if (kampanya && window.confirm(`"${kampanya.kampanyaAdi}" kampanyasını silmek istediğinize emin misiniz?`)) {
      deleteKampanya(id);
      toast({
        title: "Silindi",
        description: "Kampanya başarıyla silindi",
      });
    }
  };

  const handleEditKampanya = (kampanya: Kampanya) => {
    setFormData({
      kampanyaAdi: kampanya.kampanyaAdi,
      egitimTipi: kampanya.egitimTipi,
      kurSayisi: kampanya.kurSayisi,
      toplamDersSaati: kampanya.toplamDersSaati,
      listeFiyati: kampanya.listeFiyati,
      nakitFiyati: kampanya.nakitFiyati,
      indirimOrani: kampanya.indirimOrani,
      faizOrani: kampanya.faizOrani,
      kitapFiyati: kampanya.kitapFiyati,
      kitapSetSayisi: kampanya.kitapSetSayisi,
      maxKrediKartiTaksit: kampanya.maxKrediKartiTaksit,
      maxSenetTaksit: kampanya.maxSenetTaksit,
      hediyeler: kampanya.hediyeler,
    });
    setIsEditing(true);
    setEditingId(kampanya.id);
    // Forma doğru scroll
    document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddHediye();
      e.preventDefault();
    }
  };

  return (
    <div className="h-full w-full">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-neutral-800">Ücretlendirme Şartları Yönetimi</h1>
        <p className="text-neutral-500">Yeni kampanya oluşturun veya mevcut kampanyaları düzenleyin.</p>
      </header>

      <div className="flex flex-col space-y-4 w-full">
        {/* Kampanya Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{isEditing ? "Kampanya Düzenle" : "Yeni Kampanya Ekle"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="kampanya-adi">Kampanya Adı</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Kampanyanın kısa ismi</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="kampanya-adi"
                    name="kampanyaAdi"
                    placeholder="Örn: 1+1"
                    value={formData.kampanyaAdi}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="egitim-tipi">Eğitim Tipi</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Verilecek eğitimin türü</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Select
                    value={formData.egitimTipi}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, egitimTipi: value }))}
                  >
                    <SelectTrigger id="egitim-tipi">
                      <SelectValue placeholder="Eğitim tipini seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="Genel İngilizce">Genel İngilizce</SelectItem>
                        <SelectItem value="Genel Almanca">Genel Almanca</SelectItem>
                        <SelectItem value="Junior">Junior</SelectItem>
                        <SelectItem value="Teenage">Teenage</SelectItem>
                        <SelectItem value="Yds">Yds</SelectItem>
                        <SelectItem value="Toefl">Toefl</SelectItem>
                        <SelectItem value="Ielts">Ielts</SelectItem>
                        <SelectItem value="Ydt">Ydt</SelectItem>
                        <SelectItem value="Özel Ders">Özel Ders</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="kur-sayisi">Kur Sayısı</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Eğitim programındaki kur sayısı</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="kur-sayisi"
                    name="kurSayisi"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="Örn: 3"
                    value={formData.kurSayisi || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="toplam-ders-saati">Toplam Ders Saati</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Toplam eğitim süresi (saat olarak)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="toplam-ders-saati"
                    name="toplamDersSaati"
                    type="number"
                    min="1"
                    placeholder="Örn: 120"
                    value={formData.toplamDersSaati || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="indirim-orani">İndirim Oranı (%)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Liste fiyatı üzerinden uygulanacak indirim yüzdesi</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="indirim-orani"
                    name="indirimOrani"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Örn: 15"
                    value={formData.indirimOrani || ""}
                    onChange={handleInputChange}
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="liste-fiyati">Liste Fiyatı (₺)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>İndirimsiz normal fiyat</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="liste-fiyati"
                    name="listeFiyati"
                    type="number"
                    min="0"
                    placeholder="Örn: 15000"
                    value={formData.listeFiyati || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="nakit-fiyati">Kampanyalı Nakit Fiyatı (₺)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tek seferde nakit ödemede geçerli olan indirimli fiyat</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="nakit-fiyati"
                    name="nakitFiyati"
                    type="number"
                    min="0"
                    placeholder="Örn: 12500"
                    value={formData.nakitFiyati || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="faiz-orani">Yıllık Faiz Oranı (%)</Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Taksitli ödeme seçeneklerinde uygulanacak yıllık faiz oranı</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  id="faiz-orani"
                  name="faizOrani"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Örn: 12.5"
                  value={formData.faizOrani || ""}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="kredi-karti-taksit">Maks. Kredi Kartı Taksiti</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Kredi kartı ile yapılabilecek maksimum taksit sayısı</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Select
                    value={formData.maxKrediKartiTaksit?.toString() || "8"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, maxKrediKartiTaksit: parseInt(value) }))}
                  >
                    <SelectTrigger id="kredi-karti-taksit">
                      <SelectValue placeholder="Maks. taksit sayısı" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Tek Çekim</SelectItem>
                      <SelectItem value="2">2 Taksit</SelectItem>
                      <SelectItem value="4">4 Taksit</SelectItem>
                      <SelectItem value="6">6 Taksit</SelectItem>
                      <SelectItem value="8">8 Taksit</SelectItem>
                      <SelectItem value="10">10 Taksit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="senet-taksit">Maks. Senet Taksiti</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Senet ile yapılabilecek maksimum taksit sayısı</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Select
                    value={formData.maxSenetTaksit?.toString() || "12"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, maxSenetTaksit: parseInt(value) }))}
                  >
                    <SelectTrigger id="senet-taksit">
                      <SelectValue placeholder="Maks. taksit sayısı" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Taksit</SelectItem>
                      <SelectItem value="4">4 Taksit</SelectItem>
                      <SelectItem value="6">6 Taksit</SelectItem>
                      <SelectItem value="8">8 Taksit</SelectItem>
                      <SelectItem value="10">10 Taksit</SelectItem>
                      <SelectItem value="12">12 Taksit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="kitap-fiyati">Kitap Fiyatı (₺)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Bir adet kitap setinin fiyatı</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input
                    id="kitap-fiyati"
                    name="kitapFiyati"
                    type="number"
                    min="0"
                    placeholder="Örn: 1200"
                    value={formData.kitapFiyati || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="kitap-set-sayisi">Kitap Set Sayısı</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Kursta verilecek kitap seti sayısı</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Select
                    value={formData.kitapSetSayisi?.toString() || "1"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, kitapSetSayisi: parseInt(value) }))}
                  >
                    <SelectTrigger id="kitap-set-sayisi">
                      <SelectValue placeholder="Kitap set sayısı" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Set</SelectItem>
                      <SelectItem value="2">2 Set</SelectItem>
                      <SelectItem value="3">3 Set</SelectItem>
                      <SelectItem value="4">4 Set</SelectItem>
                      <SelectItem value="5">5 Set</SelectItem>
                      <SelectItem value="6">6 Set</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hediyeler">Hediyeler</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.hediyeler.map((hediye, index) => (
                    <HediyeTag 
                      key={index} 
                      hediye={hediye} 
                      onRemove={() => handleRemoveHediye(index)} 
                    />
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-3">
                    <Input
                      id="hediye-input"
                      placeholder="Hediye adı"
                      value={hediyeInput}
                      onChange={(e) => setHediyeInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      id="hediye-fiyat"
                      type="number"
                      min="0"
                      placeholder="Fiyatı (₺)"
                      value={hediyeFiyat || ""}
                      onChange={(e) => setHediyeFiyat(parseFloat(e.target.value) || 0)}
                      onKeyPress={handleKeyPress}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleAddHediye}
                    >
                      Ekle
                    </Button>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">
                {isEditing ? "Kampanyayı Güncelle" : "Kampanya Kaydet"}
              </Button>
              {isEditing && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full mt-2" 
                  onClick={() => {
                    setIsEditing(false);
                    setEditingId(null);
                    setFormData({
                      kampanyaAdi: "",
                      egitimTipi: "",
                      kurSayisi: 1,
                      toplamDersSaati: 0,
                      listeFiyati: 0,
                      nakitFiyati: 0,
                      indirimOrani: 0,
                      faizOrani: 12,
                      kitapFiyati: 0,
                      kitapSetSayisi: 1,
                      maxKrediKartiTaksit: 8,
                      maxSenetTaksit: 12,
                      hediyeler: [],
                    });
                  }}
                >
                  İptal Et
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Dinamik Hesaplama */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Ödeme Seçenekleri Hesaplama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-neutral-50 p-4 rounded-md">
                <h3 className="font-medium text-neutral-700 mb-2">Kredi Kartı Taksit Seçenekleri <span className="text-xs text-gray-500">(%10 fatura bedeli dahil)</span></h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-2 px-4">Taksit</th>
                        <th className="text-right py-2 px-4">Aylık Tutar</th>
                        <th className="text-right py-2 px-4">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {krediKartiTaksitler.length > 0 ? (
                        krediKartiTaksitler.map((option, index) => (
                          <tr key={index} className="border-b border-neutral-100">
                            <td className="py-2 px-4">
                              {option.taksit === 1 ? "Tek Çekim" : `${option.taksit} Taksit`}
                            </td>
                            <td className="text-right py-2 px-4">
                              {formatCurrency(option.aylik)}
                            </td>
                            <td className="text-right py-2 px-4">
                              {formatCurrency(option.toplam)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-neutral-500">
                            Hesaplama için lütfen nakit fiyatı ve faiz oranı girin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-neutral-50 p-4 rounded-md">
                <h3 className="font-medium text-neutral-700 mb-2">Senet Taksit Seçenekleri</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-2 px-4">Taksit</th>
                        <th className="text-right py-2 px-4">Aylık Tutar</th>
                        <th className="text-right py-2 px-4">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {senetTaksitler.length > 0 ? (
                        senetTaksitler.map((option, index) => (
                          <tr key={index} className="border-b border-neutral-100">
                            <td className="py-2 px-4">{`${option.taksit} Taksit`}</td>
                            <td className="text-right py-2 px-4">
                              {formatCurrency(option.aylik)}
                            </td>
                            <td className="text-right py-2 px-4">
                              {formatCurrency(option.toplam)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-neutral-500">
                            Hesaplama için lütfen nakit fiyatı ve faiz oranı girin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kampanya ve Hesaplama Kartları - Side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        
          {/* Ödeme Seçenekleri Hesaplama - Sağ tarafta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Ödeme Seçenekleri Hesaplama</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Kredi Kartı Taksit Seçenekleri <span className="text-xs text-muted-foreground">(%10 fatura bedeli dahil)</span></h3>
                  <div className="bg-neutral-50 rounded-md p-4">
                    <div className="grid grid-cols-3 text-sm font-medium border-b pb-2 mb-2">
                      <div>Taksit</div>
                      <div>Aylık Tutar</div>
                      <div>Toplam</div>
                    </div>
                    {krediKartiTaksitler.length > 0 ? (
                      krediKartiTaksitler.map((taksit) => (
                        <div key={taksit.taksit} className="grid grid-cols-3 text-sm py-1">
                          <div>{taksit.taksit === 1 ? 'Tek Çekim' : `${taksit.taksit} Taksit`}</div>
                          <div>{formatCurrency(taksit.aylik)}</div>
                          <div>{formatCurrency(taksit.toplam)}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">Hesaplama için lütfen nakit fiyatı ve faiz oranı girin.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Senet Taksit Seçenekleri</h3>
                  <div className="bg-neutral-50 rounded-md p-4">
                    <div className="grid grid-cols-3 text-sm font-medium border-b pb-2 mb-2">
                      <div>Taksit</div>
                      <div>Aylık Tutar</div>
                      <div>Toplam</div>
                    </div>
                    {senetTaksitler.length > 0 ? (
                      senetTaksitler.map((taksit) => (
                        <div key={taksit.taksit} className="grid grid-cols-3 text-sm py-1">
                          <div>{taksit.taksit} Taksit</div>
                          <div>{formatCurrency(taksit.aylik)}</div>
                          <div>{formatCurrency(taksit.toplam)}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">Hesaplama için lütfen nakit fiyatı ve faiz oranı girin.</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kayıtlı Kampanyalar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Kayıtlı Kampanyalar</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <RefreshCwIcon className="h-4 w-4" />
                <span>Yenile</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {kampanyalar.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-600">
                      <th className="text-left p-3 rounded-tl-md">Kampanya</th>
                      <th className="text-left p-3">Eğitim Tipi</th>
                      <th className="text-center p-3">Kur</th>
                      <th className="text-center p-3">Liste Fiyatı</th>
                      <th className="text-center p-3">Nakit Fiyatı</th>
                      <th className="text-center p-3">İndirim %</th>
                      <th className="text-center p-3">K.K. Taksit</th>
                      <th className="text-center p-3">Senet Taksit</th>
                      <th className="text-center p-3">Kitap</th>
                      <th className="text-right p-3 rounded-tr-md">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kampanyalar.map((kampanya) => (
                      <tr key={kampanya.id} className="border-b border-neutral-100">
                        <td className="p-3">{kampanya.kampanyaAdi}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                            {kampanya.egitimTipi || "Belirtilmemiş"}
                          </span>
                        </td>
                        <td className="text-center p-3">{kampanya.kurSayisi}</td>
                        <td className="text-center p-3">{formatCurrency(kampanya.listeFiyati)}</td>
                        <td className="text-center p-3">{formatCurrency(kampanya.nakitFiyati)}</td>
                        <td className="text-center p-3">{formatPercentage(kampanya.indirimOrani)}</td>
                        <td className="text-center p-3">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                            {kampanya.maxKrediKartiTaksit || 8}
                          </Badge>
                        </td>
                        <td className="text-center p-3">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
                            {kampanya.maxSenetTaksit || 12}
                          </Badge>
                        </td>
                        <td className="text-center p-3">
                          {formatCurrency(kampanya.kitapFiyati * (kampanya.kitapSetSayisi || 1))}
                          {kampanya.kitapSetSayisi > 1 && 
                            <span className="text-xs text-gray-500 block">
                              ({kampanya.kitapSetSayisi} set)
                            </span>
                          }
                        </td>
                        <td className="text-right p-3">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary/80 mr-2"
                            onClick={() => handleEditKampanya(kampanya)}
                          >
                            Düzenle
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteKampanya(kampanya.id)}
                          >
                            Sil
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-neutral-500">
                Henüz kayıtlı kampanya bulunmuyor. Yukarıdaki formu kullanarak kampanya ekleyebilirsiniz.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UcretlendirmePage;