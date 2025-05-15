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

const UcretlendirmePage = () => {
  const { toast } = useToast();
  const { kampanyalar, addKampanya, deleteKampanya, updateKampanya, refreshKampanyalar, 
    selectedSubeId, setSelectedSubeId, copyKampanyaToSube, copyManyKampanyalarToSube } = useAppContext();
  const { user, isAdmin } = useAuth();
  
  // Kullanıcının şubeleri
  const [subeler, setSubeler] = useState<Array<{id: number, subeAdi: string}>>([]);
  const [targetSubeId, setTargetSubeId] = useState<number | null>(null);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showMultiCopyDialog, setShowMultiCopyDialog] = useState(false);
  const [copyingKampanyaId, setCopyingKampanyaId] = useState<string | null>(null);
  const [selectedKampanyalar, setSelectedKampanyalar] = useState<string[]>([]);
  
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
  
  // Kampanya kopyalama modalı açma
  const openCopyDialog = (kampanyaId: string) => {
    setCopyingKampanyaId(kampanyaId);
    setTargetSubeId(null); // Hedef şubeyi sıfırla
    setShowCopyDialog(true);
  };
  
  const openMultiCopyDialog = () => {
    setSelectedKampanyalar([]);
    setTargetSubeId(null);
    setShowMultiCopyDialog(true);
  };
  
  // Kampanya kopyalama işlemi
  const handleCopyKampanya = async () => {
    if (!copyingKampanyaId || !targetSubeId) {
      toast({
        title: 'Hata',
        description: 'Lütfen hedef şubeyi seçin.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const result = await copyKampanyaToSube(copyingKampanyaId, targetSubeId);
      if (result) {
        toast({
          title: 'Başarılı',
          description: 'Kampanya başarıyla kopyalandı.',
        });
        await refreshKampanyalar(selectedSubeId || undefined);
        setShowCopyDialog(false);
        setCopyingKampanyaId(null);
        setTargetSubeId(null);
      } else {
        toast({
          title: 'Hata',
          description: 'Kampanya kopyalanırken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Kampanya kopyalama hatası:', error);
      toast({
        title: 'Hata',
        description: 'Kampanya kopyalanırken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };
  
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
            hediyeler: kampanya.hediyeler || []
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
          description: "Geçerli kampanya bulunamadı. Zorunlu alanların dolu olduğundan emin olun.",
          variant: "destructive",
        });
      }
      
      // Dosya seçiciyi sıfırla
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
    } catch (error) {
      console.error("Excel içe aktarma hatası:", error);
      toast({
        title: "Hata",
        description: "Excel dosyasından veri okunamadı.",
        variant: "destructive",
      });
      
      // Dosya seçiciyi sıfırla
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="h-full w-full">
      <div className="w-full px-1 md:px-4">
        <header className="mb-6 mt-[5px]">
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="md:hidden w-8"></div> {/* Mobil görünümde sol tarafta boşluk */}
            <h1 className="text-2xl font-bold text-neutral-800 pl-10 md:pl-0 mt-2 md:mt-0">Ücretlendirme Şartları Yönetimi</h1>
          </div>
          <p className="text-neutral-500 pl-10 md:pl-0">Yeni kampanya oluşturun veya mevcut kampanyaları düzenleyin.</p>
        </header>
        
        {/* Şube Filtresi */}
        <div className="mb-6 flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="w-full md:w-64">
            <Select
              value={selectedSubeId ? selectedSubeId.toString() : "all"}
              onValueChange={(value) => {
                setSelectedSubeId(value !== "all" ? parseInt(value) : null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tüm Şubeler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Şubeler</SelectItem>
                {subeler.map((sube) => (
                  <SelectItem key={sube.id} value={sube.id.toString()}>
                    {sube.subeAdi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isAdmin && (
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const fetchData = async () => {
                    await refreshKampanyalar(selectedSubeId || undefined);
                  };
                  fetchData();
                }}
                className="ml-2"
              >
                <RefreshCwIcon className="mr-2 h-4 w-4" />
                Kampanyaları Yenile
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Kampanya Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{isEditing ? "Kampanya Düzenle" : "Yeni Kampanya Ekle"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <SelectItem value="Genel İngilizce" className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800">Genel İngilizce</SelectItem>
                          <SelectItem value="Genel Almanca" className="bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800">Genel Almanca</SelectItem>
                          <SelectItem value="Junior" className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800">Junior</SelectItem>
                          <SelectItem value="Teenage" className="bg-teal-50 text-teal-700 hover:bg-teal-100 hover:text-teal-800">Teenage</SelectItem>
                          <SelectItem value="Yds" className="bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800">Yds</SelectItem>
                          <SelectItem value="Toefl" className="bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800">Toefl</SelectItem>
                          <SelectItem value="Ielts" className="bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800">Ielts</SelectItem>
                          <SelectItem value="Ydt" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800">Ydt</SelectItem>
                          <SelectItem value="Özel Ders" className="bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-800">Özel Ders</SelectItem>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <p>Eğitimde kullanılacak kitapların toplam fiyatı</p>
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
                          <p>Kaç set kitap verileceği</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Select
                      value={formData.kitapSetSayisi?.toString() || "1"}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, kitapSetSayisi: parseInt(value) }))}
                    >
                      <SelectTrigger id="kitap-set-sayisi">
                        <SelectValue placeholder="Set sayısı seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Set</SelectItem>
                        <SelectItem value="2">2 Set</SelectItem>
                        <SelectItem value="3">3 Set</SelectItem>
                        <SelectItem value="4">4 Set</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label>Hediyeler</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Kampanya kapsamında verilecek hediyeler</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.hediyeler.map((hediye, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="group flex items-center gap-1 cursor-default px-3 py-1.5"
                      >
                        <span>{hediye.isim} - {formatCurrency(hediye.fiyat)}</span>
                        <button 
                          onClick={() => handleRemoveHediye(index)}
                          className="hover:text-destructive"
                          type="button"
                        >
                          &times;
                        </button>
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Hediye adı"
                        value={hediyeAdi}
                        onChange={(e) => setHediyeAdi(e.target.value)}
                        onKeyDown={handleHediyeKeyDown}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        placeholder="Fiyatı"
                        type="number"
                        min="0"
                        value={hediyeFiyati}
                        onChange={(e) => setHediyeFiyati(e.target.value)}
                        onKeyDown={handleHediyeKeyDown}
                      />
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={handleAddHediye}
                      className="flex-shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ekle
                    </Button>
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
                    onClick={resetForm}
                  >
                    İptal
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Ödeme Seçenekleri Hesaplama Kartı */}
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
        
        {/* Kayıtlı Kampanyalar - Tam Genişlikte */}
        <div className="col-span-full mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Kayıtlı Kampanyalar</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={handleExportToExcel}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel'e Aktar</span>
                  </Button>
                  
                  <ExcelImportInfoDialog onImportClick={handleImportClick} />
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary hover:text-primary/80 flex items-center gap-1"
                    onClick={refreshKampanyalar}
                  >
                    <RefreshCwIcon className="h-4 w-4" />
                    <span>Yenile</span>
                  </Button>
                  
                  {/* Gizli dosya giriş elemanı */}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx, .xls"
                    className="hidden" 
                  />
                </div>
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
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            kampanya.egitimTipi === "Genel İngilizce" 
                              ? "bg-blue-50 text-blue-700" 
                              : kampanya.egitimTipi === "Genel Almanca" 
                                ? "bg-purple-50 text-purple-700"
                                : kampanya.egitimTipi === "Junior"
                                  ? "bg-green-50 text-green-700"
                                  : kampanya.egitimTipi === "Teenage"
                                    ? "bg-teal-50 text-teal-700"
                                    : kampanya.egitimTipi === "Yds"
                                      ? "bg-amber-50 text-amber-700"
                                      : kampanya.egitimTipi === "Toefl"
                                        ? "bg-orange-50 text-orange-700"
                                        : kampanya.egitimTipi === "Ielts"
                                          ? "bg-rose-50 text-rose-700"
                                          : kampanya.egitimTipi === "Ydt"
                                            ? "bg-indigo-50 text-indigo-700"
                                            : kampanya.egitimTipi === "Özel Ders"
                                              ? "bg-slate-50 text-slate-700"
                                              : "bg-primary/10 text-primary"
                          }`}>
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
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-500 hover:text-emerald-700 mr-2"
                              onClick={() => openCopyDialog(kampanya.id)}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Kopyala
                            </Button>
                          )}
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
      
      {/* Kampanya Kopyalama Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kampanyayı Başka Şubeye Kopyala</DialogTitle>
            <DialogDescription>
              Seçtiğiniz kampanya bilgilerini başka bir şubeye kopyalayabilirsiniz.
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
    </div>
  );
};

export default UcretlendirmePage;