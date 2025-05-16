import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatPercentage, calculateDiscount } from "@/lib/utils";
import { calculateInstallments } from "@/utils/calculator";
import { exportToExcel, importFromExcel } from "@/utils/excel-utils";
import { TaksitOption, Hediye } from "@/types";
import { RefreshCwIcon, Plus, FileSpreadsheet, Building, Copy } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { ExcelImportInfoDialog } from "@/components/ExcelImportInfoDialog";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const UcretlendirmePage = () => {
  const { toast } = useToast();
  const { kampanyalar, addKampanya, deleteKampanya, updateKampanya, refreshKampanyalar, 
    selectedSubeId, setSelectedSubeId } = useAppContext();
  const { user, isAdmin } = useAuth();
  
  // Kullanıcının şubeleri
  const [subeler, setSubeler] = useState<Array<{id: number, subeAdi: string}>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [hediyeAdi, setHediyeAdi] = useState("");
  const [hediyeFiyati, setHediyeFiyati] = useState("");
  const [showExcelInfoDialog, setShowExcelInfoDialog] = useState(false);
  const [formData, setFormData] = useState({
    kampanyaAdi: "",
    egitimTipi: "",
    kurSayisi: 1,
    toplamDersSaati: 120,
    listeFiyati: 0,
    nakitFiyati: 0,
    indirimOrani: 0,
    faizOrani: 0,
    kitapFiyati: 0,
    kitapSetSayisi: 1,
    maxKrediKartiTaksit: 8,
    maxSenetTaksit: 12,
    hediyeler: [] as Hediye[],
  });

  const [krediKartiTaksitler, setKrediKartiTaksitler] = useState<TaksitOption[]>([]);
  const [senetTaksitler, setSenetTaksitler] = useState<TaksitOption[]>([]);

  // Şubeleri getirme
  useEffect(() => {
    const fetchSubeler = async () => {
      try {
        const response = await fetch('/api/subeler');
        if (!response.ok) {
          throw new Error('Şubeler getirilemedi');
        }
        const data = await response.json();
        setSubeler(data);
      } catch (error) {
        console.error('Şubeler getirme hatası:', error);
        toast({
          title: 'Hata',
          description: 'Şubeler yüklenirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    };
    
    fetchSubeler();
  }, [toast]);
  
  // Şube seçimi değiştiğinde kampanyaları filtreleme
  useEffect(() => {
    const fetchKampanyalar = async () => {
      try {
        // selectedSubeId null ise tüm kampanyaları getir
        // değilse şubeye göre filtrele
        if (selectedSubeId) {
          await refreshKampanyalar(selectedSubeId);
        } else {
          await refreshKampanyalar();
        }
      } catch (error) {
        console.error('Kampanyalar getirme hatası:', error);
        toast({
          title: 'Hata', 
          description: 'Kampanyalar yüklenirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    };
    
    fetchKampanyalar();
  }, [selectedSubeId, toast, refreshKampanyalar]);
  
  // Sayfa ilk yüklendiğinde şubeleri getir
  useEffect(() => {
    const fetchSubeler = async () => {
      try {
        const response = await fetch('/api/subeler');
        if (!response.ok) {
          throw new Error('Şubeler getirilemedi');
        }
        const data = await response.json();
        setSubeler(data);
      } catch (error) {
        console.error('Şubeler getirme hatası:', error);
        toast({
          title: 'Hata',
          description: 'Şubeler yüklenirken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    };
    
    fetchSubeler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Liste fiyatı veya nakit fiyatı değiştiğinde, indirim oranını hesapla
  useEffect(() => {
    if (formData.listeFiyati > 0 && formData.nakitFiyati > 0) {
      const discount = calculateDiscount(formData.listeFiyati, formData.nakitFiyati);
      setFormData(prev => ({
        ...prev,
        indirimOrani: parseFloat(discount.toFixed(2))
      }));
    }
  }, [formData.listeFiyati, formData.nakitFiyati]);

  // İndirim oranı, nakit fiyatı veya faiz oranı değiştiğinde taksit seçeneklerini hesapla
  useEffect(() => {
    // Nakit fiyat ve faiz oranı varsa, kredi kartı taksit seçeneklerini hesapla
    if (formData.nakitFiyati > 0 && formData.faizOrani >= 0) {
      const krediKartiAdedleri = [1, 2, 4, 6, 8, 10].filter(
        adet => adet <= formData.maxKrediKartiTaksit
      );
      
      const krediKartiOpts = calculateInstallments(
        formData.nakitFiyati,
        formData.faizOrani,
        krediKartiAdedleri
      );
      setKrediKartiTaksitler(krediKartiOpts);

      const senetAdedleri = [2, 4, 6, 8, 10, 12].filter(
        adet => adet <= formData.maxSenetTaksit
      );
      
      const senetOpts = calculateInstallments(
        formData.nakitFiyati,
        formData.faizOrani,
        senetAdedleri
      );
      setSenetTaksitler(senetOpts);
    } else {
      setKrediKartiTaksitler([]);
      setSenetTaksitler([]);
    }
  }, [formData.nakitFiyati, formData.faizOrani, formData.maxKrediKartiTaksit, formData.maxSenetTaksit]);

  const resetForm = () => {
    setFormData({
      kampanyaAdi: "",
      egitimTipi: "",
      kurSayisi: 1,
      toplamDersSaati: 120,
      listeFiyati: 0,
      nakitFiyati: 0,
      indirimOrani: 0,
      faizOrani: 0,
      kitapFiyati: 0,
      kitapSetSayisi: 1,
      maxKrediKartiTaksit: 8,
      maxSenetTaksit: 12,
      hediyeler: [],
    });
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.kampanyaAdi) {
      toast({
        title: "Hata",
        description: "Kampanya adı girmelisiniz.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.listeFiyati || !formData.nakitFiyati) {
      toast({
        title: "Hata",
        description: "Liste fiyatı ve nakit fiyatı girmelisiniz.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (isEditing && currentId) {
        updateKampanya({
          ...formData,
          id: currentId,
        });
        toast({
          title: "Başarılı",
          description: "Kampanya başarıyla güncellendi.",
        });
      } else {
        addKampanya(formData);
        toast({
          title: "Başarılı",
          description: "Kampanya başarıyla eklendi.",
        });
      }
      resetForm();
    } catch (error) {
      console.error("Kampanya kaydedilirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Kampanya kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    
    // Sayısal değerler için dönüşüm yap
    if (
      ["listeFiyati", "nakitFiyati", "kurSayisi", "toplamDersSaati", "indirimOrani", "faizOrani", "kitapFiyati", "kitapSetSayisi"].includes(name)
    ) {
      parsedValue = value === "" ? 0 : parseFloat(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  const handleEditKampanya = (kampanya: any) => {
    setCurrentId(kampanya.id);
    setFormData({
      kampanyaAdi: kampanya.kampanyaAdi,
      egitimTipi: kampanya.egitimTipi || "",
      kurSayisi: kampanya.kurSayisi || 1,
      toplamDersSaati: kampanya.toplamDersSaati || 120,
      listeFiyati: kampanya.listeFiyati || 0,
      nakitFiyati: kampanya.nakitFiyati || 0,
      indirimOrani: kampanya.indirimOrani || 0,
      faizOrani: kampanya.faizOrani || 0,
      kitapFiyati: kampanya.kitapFiyati || 0,
      kitapSetSayisi: kampanya.kitapSetSayisi || 1,
      maxKrediKartiTaksit: kampanya.maxKrediKartiTaksit || 8,
      maxSenetTaksit: kampanya.maxSenetTaksit || 12,
      hediyeler: kampanya.hediyeler || [],
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteKampanya = (id: string) => {
    if (window.confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) {
      deleteKampanya(id);
      toast({
        title: "Başarılı",
        description: "Kampanya başarıyla silindi.",
      });
    }
  };

  const handleAddHediye = () => {
    if (!hediyeAdi || !hediyeFiyati || parseFloat(hediyeFiyati) <= 0) {
      toast({
        title: "Hata",
        description: "Hediye adı ve geçerli bir fiyat girmelisiniz.",
        variant: "destructive",
      });
      return;
    }
    
    const yeniHediye: Hediye = {
      isim: hediyeAdi,
      fiyat: parseFloat(hediyeFiyati)
    };
    
    setFormData(prev => ({
      ...prev,
      hediyeler: [...prev.hediyeler, yeniHediye]
    }));
    
    setHediyeAdi("");
    setHediyeFiyati("");
  };

  const handleRemoveHediye = (index: number) => {
    setFormData(prev => ({
      ...prev,
      hediyeler: prev.hediyeler.filter((_, i) => i !== index)
    }));
  };

  const handleHediyeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddHediye();
      e.preventDefault();
    }
  };
  
  // Çoklu kampanya kopyalama için kampanya seçme işlevi
  const handleKampanyaSelect = (kampanyaId: string) => {
    setSelectedKampanyalar(prev => {
      if (prev.includes(kampanyaId)) {
        return prev.filter(id => id !== kampanyaId);
      } else {
        return [...prev, kampanyaId];
      }
    });
  };
  
  // Tüm kampanyaları seçme işlevi
  const handleSelectAllKampanyalar = () => {
    // Eğer tüm kampanyalar seçiliyse, seçimi kaldır
    if (selectedKampanyalar.length === kampanyalar.length) {
      setSelectedKampanyalar([]);
    } 
    // Değilse tüm kampanyaları seç
    else {
      const allKampanyaIds = kampanyalar.map(k => k.id);
      setSelectedKampanyalar(allKampanyaIds);
    }
  };
  
  // Kampanya işleme fonksiyonları
  
  // Excel İşlevleri
  const handleExportToExcel = () => {
    if (kampanyalar.length === 0) {
      toast({
        title: "Hata",
        description: "Dışa aktarılacak kampanya bulunmuyor.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      exportToExcel(kampanyalar);
      toast({
        title: "Başarılı",
        description: "Kampanyalar Excel dosyasına aktarıldı.",
      });
    } catch (error) {
      console.error("Excel dışa aktarma hatası:", error);
      toast({
        title: "Hata",
        description: "Excel dosyası oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };
  
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const importedKampanyalar = await importFromExcel(file);
      
      if (importedKampanyalar.length === 0) {
        toast({
          title: "Uyarı",
          description: "İçe aktarılacak kampanya bulunamadı.",
          variant: "destructive",
        });
        return;
      }
      
      // Her bir kampanyayı ekle
      let addedCount = 0;
      for (const kampanya of importedKampanyalar) {
        if (kampanya.kampanyaAdi && kampanya.listeFiyati && kampanya.nakitFiyati) {
          // Type uyumluluğunu sağlamak için undefined değerleri varsayılan değerlerle değiştir
          const newKampanya = {
            kampanyaAdi: kampanya.kampanyaAdi,
            egitimTipi: kampanya.egitimTipi || "",
            kurSayisi: kampanya.kurSayisi || 1,
            toplamDersSaati: kampanya.toplamDersSaati || 120,
            listeFiyati: kampanya.listeFiyati || 0,
            nakitFiyati: kampanya.nakitFiyati || 0,
            indirimOrani: kampanya.indirimOrani || 0,
            faizOrani: kampanya.faizOrani || 0,
            kitapFiyati: kampanya.kitapFiyati || 0,
            kitapSetSayisi: kampanya.kitapSetSayisi || 1,
            maxKrediKartiTaksit: kampanya.maxKrediKartiTaksit || 8,
            maxSenetTaksit: kampanya.maxSenetTaksit || 12,
            hediyeler: kampanya.hediyeler || [],
          };
          
          addKampanya(newKampanya);
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        toast({
          title: "Başarılı",
          description: `${addedCount} kampanya başarıyla içe aktarıldı.`,
        });
      } else {
        toast({
          title: "Uyarı",
          description: "Geçerli kampanya bulunamadı.",
          variant: "destructive",
        });
      }
      
      // Dosya seçimini sıfırla
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Excel içe aktarma hatası:", error);
      toast({
        title: "Hata",
        description: "Excel dosyası içe aktarılırken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };
  
  const handleAddNewClick = () => {
    resetForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  const handleExcelInfoClick = () => {
    setShowExcelInfoDialog(true);
  };
  
  return (
    <div className="container mx-auto p-4 grid grid-cols-1 gap-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{isEditing ? "Kampanya Düzenle" : "Yeni Kampanya Ekle"}</CardTitle>
                <CardDescription>Kampanya bilgilerini girin</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Temizle
                </Button>
                <Button type="submit" size="sm">
                  {isEditing ? "Güncelle" : "Kaydet"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* İlk satır - genel bilgiler */}
              <div className="space-y-1">
                <Label htmlFor="kampanyaAdi" className="text-xs">Kampanya Adı</Label>
                <Input
                  id="kampanyaAdi"
                  name="kampanyaAdi"
                  value={formData.kampanyaAdi}
                  onChange={handleInputChange}
                  placeholder="Örn: 2+1 KAMPANYASI"
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="egitimTipi" className="text-xs">Eğitim Tipi</Label>
                <Input
                  id="egitimTipi"
                  name="egitimTipi"
                  value={formData.egitimTipi}
                  onChange={handleInputChange}
                  placeholder="Örn: Genel İngilizce"
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="kurSayisi" className="text-xs">Kur Sayısı</Label>
                <Input
                  id="kurSayisi"
                  name="kurSayisi"
                  type="number"
                  value={formData.kurSayisi}
                  onChange={handleInputChange}
                  min="1"
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="toplamDersSaati" className="text-xs">Toplam Ders Saati</Label>
                <Input
                  id="toplamDersSaati"
                  name="toplamDersSaati"
                  type="number"
                  value={formData.toplamDersSaati}
                  onChange={handleInputChange}
                  min="1"
                  className="h-8"
                />
              </div>

              {/* İkinci satır - fiyatlar */}
              <div className="space-y-1">
                <Label htmlFor="listeFiyati" className="text-xs">Liste Fiyatı (TL)</Label>
                <Input
                  id="listeFiyati"
                  name="listeFiyati"
                  type="number"
                  value={formData.listeFiyati}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="nakitFiyati" className="text-xs">Nakit Fiyatı (TL)</Label>
                <Input
                  id="nakitFiyati"
                  name="nakitFiyati"
                  type="number"
                  value={formData.nakitFiyati}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="indirimOrani" className="text-xs">İndirim Oranı (%)</Label>
                <Input
                  id="indirimOrani"
                  name="indirimOrani"
                  type="number"
                  value={formData.indirimOrani}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  readOnly
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="faizOrani" className="text-xs">Faiz Oranı (%)</Label>
                <Input
                  id="faizOrani"
                  name="faizOrani"
                  type="number"
                  value={formData.faizOrani}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="h-8"
                />
              </div>

              {/* Üçüncü satır - kitap ve taksit bilgileri */}
              <div className="space-y-1">
                <Label htmlFor="kitapFiyati" className="text-xs">Kitap Fiyatı (TL)</Label>
                <Input
                  id="kitapFiyati"
                  name="kitapFiyati"
                  type="number"
                  value={formData.kitapFiyati}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="kitapSetSayisi" className="text-xs">Kitap Set Sayısı</Label>
                <Input
                  id="kitapSetSayisi"
                  name="kitapSetSayisi"
                  type="number"
                  value={formData.kitapSetSayisi}
                  onChange={handleInputChange}
                  min="1"
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="maxKrediKartiTaksit" className="text-xs">Max Kredi Kartı Taksit</Label>
                <Input
                  id="maxKrediKartiTaksit"
                  name="maxKrediKartiTaksit"
                  type="number"
                  value={formData.maxKrediKartiTaksit}
                  onChange={handleInputChange}
                  min="1"
                  max="12"
                  className="h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="maxSenetTaksit" className="text-xs">Max Senet Taksit</Label>
                <Input
                  id="maxSenetTaksit"
                  name="maxSenetTaksit"
                  type="number"
                  value={formData.maxSenetTaksit}
                  onChange={handleInputChange}
                  min="1"
                  max="12"
                  className="h-8"
                />
              </div>
            </div>

            {/* Hediyeler Bölümü */}
            <div className="mt-4">
              <Label className="text-xs">Hediyeler</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Hediye adı"
                  value={hediyeAdi}
                  onChange={(e) => setHediyeAdi(e.target.value)}
                  onKeyDown={handleHediyeKeyDown}
                  className="h-8"
                />
                <Input
                  placeholder="Fiyatı"
                  type="number"
                  value={hediyeFiyati}
                  onChange={(e) => setHediyeFiyati(e.target.value)}
                  min="0"
                  step="0.01"
                  onKeyDown={handleHediyeKeyDown}
                  className="h-8"
                />
                <Button type="button" size="sm" className="h-8" onClick={handleAddHediye}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                {formData.hediyeler.map((hediye, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-accent rounded">
                    <span className="text-sm">{hediye.isim} - {formatCurrency(hediye.fiyat)}</span>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleRemoveHediye(index)}
                      className="px-2 h-7"
                    >
                      Sil
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-between">
            <Button type="button" variant="outline" onClick={resetForm}>
              {isEditing ? "İptal" : "Temizle"}
            </Button>
            <Button type="submit">
              {isEditing ? "Güncelle" : "Kaydet"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Mevcut Kampanyalar</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAddNewClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Ekle
                </Button>
                
                {/* Sadece admin ise şube filtreleme ve toplu kopyalama göster */}
                {isAdmin && (
                  <>
                    <Select 
                      value={selectedSubeId ? selectedSubeId.toString() : ""} 
                      onValueChange={(value) => {
                        if (value === "") {
                          setSelectedSubeId(null);
                        } else {
                          setSelectedSubeId(Number(value));
                        }
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tüm Şubeler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Tüm Şubeler</SelectItem>
                        {subeler.map((sube) => (
                          <SelectItem key={sube.id} value={sube.id.toString()}>
                            {sube.subeAdi}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    

                  </>
                )}
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={handleExcelInfoClick}>
                        <FileSpreadsheet className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Excel İşlemleri</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={refreshKampanyalar}>
                        <RefreshCwIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Yenile</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Dışa Aktar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleImportClick}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    İçe Aktar
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div className="mt-4">
                {kampanyalar.length > 0 ? (
                  <div className="space-y-2">
                    {kampanyalar.map((kampanya: any) => {
                      // Eğitim tipine göre arka plan rengi belirleme
                      let bgColor = "bg-blue-50";
                      if (kampanya.egitimTipi?.includes("Genel Almanca")) {
                        bgColor = "bg-green-50";
                      } else if (kampanya.egitimTipi?.includes("Junior")) {
                        bgColor = "bg-yellow-50";
                      } else if (kampanya.egitimTipi?.includes("Teenage")) {
                        bgColor = "bg-red-50";
                      } else if (kampanya.egitimTipi?.includes("Yds")) {
                        bgColor = "bg-purple-50";
                      } else if (kampanya.egitimTipi?.includes("Toefl")) {
                        bgColor = "bg-orange-50";
                      }
                      
                      return (
                        <div key={kampanya.id} className={`border rounded-md ${bgColor}`}>
                          <div className="flex flex-col">
                            {/* Üst kısım - Kampanya adı ve butonlar */}
                            <div className="flex justify-between items-center">
                              <div className="p-2">
                                <h3 className="font-bold text-lg">{kampanya.kampanyaAdi}</h3>
                                <div className="text-sm">
                                  {kampanya.egitimTipi || "Belirtilmemiş"}
                                  <span className="mx-1">•</span>
                                  <span>{kampanya.kurSayisi} Kur</span>
                                  <span className="mx-1">•</span>
                                  <span>{kampanya.toplamDersSaati} Saat</span>
                                </div>
                              </div>
                              
                              <div className="flex gap-1 p-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditKampanya(kampanya)}
                                >
                                  Düzenle
                                </Button>
                                
                                {isAdmin && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openCopyDialog(kampanya.id)}
                                  >
                                    Kopyala
                                  </Button>
                                )}
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteKampanya(kampanya.id)}
                                >
                                  Sil
                                </Button>
                              </div>
                            </div>
                            
                            {/* Bilgi kısmı */}
                            <div className="grid grid-cols-2 text-sm border-t">
                              <div className="p-2 border-r">
                                <div className="flex justify-between">
                                  <span>Liste Fiyatı:</span>
                                  <span className="font-medium">{formatCurrency(kampanya.listeFiyati)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Nakit Fiyatı:</span>
                                  <span className="font-medium">{formatCurrency(kampanya.nakitFiyati)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>İndirim/Faiz:</span>
                                  <span>{formatPercentage(kampanya.indirimOrani)} / {formatPercentage(kampanya.faizOrani)}</span>
                                </div>
                              </div>
                              
                              <div className="p-2">
                                <div className="flex justify-between">
                                  <span>Kitap:</span>
                                  <span>{formatCurrency(kampanya.kitapFiyati)} / {kampanya.kitapSetSayisi} set</span>
                                </div>
                                
                                {kampanya.hediyeler && kampanya.hediyeler.length > 0 && (
                                  <div>
                                    <span>Hediyeler:</span>
                                    <div>
                                      {kampanya.hediyeler.map((hediye: any, i: number) => (
                                        <div key={i} className="flex justify-between">
                                          <span>{hediye.isim}</span>
                                          <span>{formatCurrency(hediye.fiyat)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-neutral-500">
                    Kampanya bulunamadı. Yeni bir kampanya ekleyin.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kampanya Kopyalama Modal */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Şubeye Kampanya Kopyala</DialogTitle>
            <DialogDescription>
              Seçtiğiniz kampanyayı başka bir şubeye kopyalayabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <Label htmlFor="target-sube">Hedef Şube</Label>
            <Select
              value={targetSubeId ? targetSubeId.toString() : ""}
              onValueChange={(value) => {
                setTargetSubeId(parseInt(value));
              }}
            >
              <SelectTrigger id="target-sube">
                <SelectValue placeholder="Bir şube seçin" />
              </SelectTrigger>
              <SelectContent>
                {subeler
                  .filter(sube => selectedSubeId !== Number(sube.id)) // Mevcut seçili şubeyi gösterme
                  .map((sube) => (
                    <SelectItem key={sube.id} value={sube.id.toString()}>
                      {sube.subeAdi}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowCopyDialog(false)}
            >
              İptal
            </Button>
            <Button 
              type="button" 
              onClick={handleCopyKampanya}
              disabled={!targetSubeId}
            >
              <Copy className="mr-2 h-4 w-4" />
              Kopyala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Çoklu Kampanya Kopyalama Modal */}
      <Dialog open={showMultiCopyDialog} onOpenChange={setShowMultiCopyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kampanyaları Toplu Kopyala</DialogTitle>
            <DialogDescription>
              Seçtiğiniz kampanyaları başka bir şubeye toplu olarak kopyalayabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            {/* Kampanyalar Seçim Listesi */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Kopyalanacak Kampanyalar</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSelectAllKampanyalar}
                  className="h-7 text-xs"
                >
                  {selectedKampanyalar.length === kampanyalar.length 
                    ? "Tümünü Temizle" 
                    : "Tümünü Seç"}
                </Button>
              </div>
              
              <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                {kampanyalar.length > 0 ? (
                  <div className="space-y-2">
                    {kampanyalar.map((kampanya) => (
                      <div 
                        key={kampanya.id} 
                        className="flex items-center p-2 hover:bg-slate-100 rounded-md"
                      >
                        <Checkbox
                          id={`kampanya-${kampanya.id}`}
                          className="mr-3"
                          checked={selectedKampanyalar.includes(kampanya.id)}
                          onCheckedChange={() => handleKampanyaSelect(kampanya.id)}
                        />
                        <label 
                          htmlFor={`kampanya-${kampanya.id}`}
                          className="flex-grow cursor-pointer"
                        >
                          {kampanya.kampanyaAdi}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Kopyalanacak kampanya bulunamadı.
                  </p>
                )}
              </div>
            </div>
            
            {/* Hedef Şube Seçimi */}
            <Label htmlFor="multi-target-sube">Hedef Şube</Label>
            <Select
              value={targetSubeId ? targetSubeId.toString() : ""}
              onValueChange={(value) => {
                setTargetSubeId(parseInt(value));
              }}
            >
              <SelectTrigger id="multi-target-sube">
                <SelectValue placeholder="Bir şube seçin" />
              </SelectTrigger>
              <SelectContent>
                {subeler
                  .filter(sube => selectedSubeId !== Number(sube.id)) // Mevcut seçili şubeyi gösterme
                  .map((sube) => (
                    <SelectItem key={sube.id} value={sube.id.toString()}>
                      {sube.subeAdi}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowMultiCopyDialog(false)}
            >
              İptal
            </Button>
            <Button 
              type="button" 
              onClick={handleMultiKampanyaCopy}
              disabled={!targetSubeId || selectedKampanyalar.length === 0}
            >
              <Copy className="mr-2 h-4 w-4" />
              Toplu Kopyala ({selectedKampanyalar.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Excel Bilgi Modalı */}
      <ExcelImportInfoDialog
        open={showExcelInfoDialog}
        onOpenChange={setShowExcelInfoDialog}
      />
    </div>
  );
};

export default UcretlendirmePage;