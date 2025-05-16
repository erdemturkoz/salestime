import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatPercentage, calculateDiscount } from "@/lib/utils";
import { calculateInstallments } from "@/utils/calculator";
import { exportToExcel, importFromExcel } from "@/utils/excel-utils";
import { TaksitOption, Hediye } from "@/types";
import { RefreshCwIcon, Plus, FileSpreadsheet, Building, Settings } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { ExcelImportInfoDialog } from "@/components/ExcelImportInfoDialog";
// Artık sadece tamamen bağımsız sayfamız olduğu için bu import kaldırıldı
// import { EgitimTipiYonetimModal } from "@/components/egitim-tipi-yonetim-modal";
import { useAuth } from "@/contexts/AuthContext";
import { useEgitimTipleri } from "@/hooks/use-egitim-tipleri";

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
  
  // Eğitim tiplerini API'den çekelim
  const { egitimTipleri, isLoading: egitimTipleriLoading } = useEgitimTipleri();
  
  // Kullanıcının şubeleri
  const [subeler, setSubeler] = useState<Array<{id: number, subeAdi: string}>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [hediyeAdi, setHediyeAdi] = useState("");
  const [hediyeFiyati, setHediyeFiyati] = useState("");
  const [showExcelInfoDialog, setShowExcelInfoDialog] = useState(false);
  // Artık Eğitim Tipi modal kullanımını kaldırdık
  // const [showEgitimTipiModal, setShowEgitimTipiModal] = useState(false);
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

  // Liste fiyatı veya nakit fiyatı değiştiğinde, indirim oranını otomatik hesapla
  useEffect(() => {
    if (formData.listeFiyati > 0 && formData.nakitFiyati > 0) {
      const discount = calculateDiscount(formData.listeFiyati, formData.nakitFiyati);
      setFormData(prev => ({
        ...prev,
        indirimOrani: parseFloat(discount.toFixed(2))
      }));
    }
  }, [formData.listeFiyati, formData.nakitFiyati]);
  
  // İndirim Oranı alanının manuel değiştirilmesini önle
  const handleIndirimOraniChange = () => {
    // Bu fonksiyon boş - alan sadece okunabilir
    // İndirim oranı liste fiyatı ve nakit fiyatı üzerinden otomatik hesaplanıyor
  };

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
        senetAdedleri,
        0 // Senet ödemelerinde banka komisyonu uygulanmaz
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
  
  // Kampanyaları kategorilere ayırma ve sıralama fonksiyonu
  const renderGroupedKampanyalar = () => {
    if (kampanyalar.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Kayıtlı kampanya bulunmuyor. Yeni bir kampanya ekleyebilirsiniz.
        </div>
      );
    }
    
    // Kampanyaları eğitim tipine göre grupla
    const groupedKampanyalar: Record<string, any[]> = {};
    
    // Önce grupla
    kampanyalar.forEach((kampanya: any) => {
      const tip = kampanya.egitimTipi || "Diğer";
      if (!groupedKampanyalar[tip]) {
        groupedKampanyalar[tip] = [];
      }
      groupedKampanyalar[tip].push(kampanya);
    });
    
    // "1+1 KAMPANYASI"nı Genel İngilizce grubunda en başa getir
    Object.keys(groupedKampanyalar).forEach(tip => {
      if (tip.includes("Genel İngilizce")) {
        groupedKampanyalar[tip].sort((a, b) => {
          if (a.kampanyaAdi.includes("1+1")) return -1;
          if (b.kampanyaAdi.includes("1+1")) return 1;
          return 0;
        });
      }
    });
    
    // Grupları listele
    return (
      <div className="space-y-6">
        {Object.entries(groupedKampanyalar).map(([tip, kampanyaGrup]) => (
          <div key={tip} className="mb-4">
            <h3 className="font-bold text-lg mb-2 px-2 py-1 bg-gray-100 rounded-md">{tip}</h3>
            <div className="space-y-2">
              {kampanyaGrup.map((kampanya: any) => {
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
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteKampanya(kampanya.id)}
                          >
                            Sil
                          </Button>
                        </div>
                      </div>
                      
                      {/* Alt kısım - Detaylar */}
                      <div className="p-2 pt-0 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <div className="mb-1">
                            <span className="text-sm font-medium">Fiyat Bilgileri:</span>
                          </div>
                          <div className="text-sm">
                            <div className="flex justify-between">
                              <span>Liste Fiyatı:</span>
                              <span>{formatCurrency(kampanya.listeFiyati)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Nakit Fiyatı:</span>
                              <span>{formatCurrency(kampanya.nakitFiyati)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>İndirim Oranı:</span>
                              <span>{formatPercentage(kampanya.indirimOrani)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Kitap Fiyatı:</span>
                              <span>{formatCurrency(kampanya.kitapFiyati)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Kitap Set Sayısı:</span>
                              <span>{kampanya.kitapSetSayisi}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="mb-1">
                            <span className="text-sm font-medium">Taksit Bilgileri:</span>
                          </div>
                          <div className="text-sm">
                            <div className="flex justify-between">
                              <span>Faiz Oranı:</span>
                              <span>{formatPercentage(kampanya.faizOrani)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Maks. KK Taksit:</span>
                              <span>{kampanya.maxKrediKartiTaksit} Taksit</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Maks. Senet Taksit:</span>
                              <span>{kampanya.maxSenetTaksit} Taksit</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="mb-1">
                            <span className="text-sm font-medium">Hediyeler:</span>
                          </div>
                          {kampanya.hediyeler && kampanya.hediyeler.length > 0 ? (
                            <div className="text-sm space-y-1">
                              {kampanya.hediyeler.map((hediye: any, idx: number) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{hediye.isim}:</span>
                                  <span>{formatCurrency(hediye.fiyat)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Hediye bulunmuyor
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
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
                <div>
                  <Label htmlFor="egitimTipi" className="text-xs">Eğitim Tipi</Label>
                </div>
                <Select
                  value={formData.egitimTipi}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, egitimTipi: value }))}
                >
                  <SelectTrigger id="egitimTipi" className="h-8">
                    <SelectValue placeholder="Eğitim tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {egitimTipleriLoading ? (
                      <SelectItem value="loading" disabled>Yükleniyor...</SelectItem>
                    ) : egitimTipleri.length === 0 ? (
                      <SelectItem value="no-data" disabled>Eğitim tipi bulunamadı</SelectItem>
                    ) : (
                      egitimTipleri.map((tip) => (
                        <SelectItem key={tip.id} value={tip.egitimTipi}>
                          {tip.egitimTipi}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="kurSayisi" className="text-xs">Kur Sayısı</Label>
                <Input
                  id="kurSayisi"
                  name="kurSayisi"
                  type="number"
                  value={formData.kurSayisi}
                  onChange={handleInputChange}
                  className="h-8"
                  min={1}
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
                  className="h-8"
                  min={1}
                />
              </div>
              
              {/* İkinci satır - fiyat bilgileri */}
              <div className="space-y-1">
                <Label htmlFor="listeFiyati" className="text-xs">Liste Fiyatı (₺)</Label>
                <Input
                  id="listeFiyati"
                  name="listeFiyati"
                  type="number"
                  value={formData.listeFiyati || ""}
                  onChange={handleInputChange}
                  className="h-8"
                  min={0}
                  step={0.01}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="nakitFiyati" className="text-xs">Nakit Fiyatı (₺)</Label>
                <Input
                  id="nakitFiyati"
                  name="nakitFiyati"
                  type="number"
                  value={formData.nakitFiyati || ""}
                  onChange={handleInputChange}
                  className="h-8"
                  min={0}
                  step={0.01}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="indirimOrani" className="text-xs">İndirim Oranı (%) - Otomatik Hesaplanır</Label>
                <Input
                  id="indirimOrani"
                  name="indirimOrani"
                  type="number"
                  value={formData.indirimOrani || ""}
                  readOnly
                  className="h-8 bg-gray-50"
                  min={0}
                  max={100}
                  step={0.01}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="faizOrani" className="text-xs">Taksit Faiz Oranı (%)</Label>
                <Input
                  id="faizOrani"
                  name="faizOrani"
                  type="number"
                  value={formData.faizOrani || ""}
                  onChange={handleInputChange}
                  className="h-8"
                  min={0}
                  max={100}
                  step={0.01}
                />
              </div>
              
              {/* Üçüncü satır - kitap ve taksit bilgileri */}
              <div className="space-y-1">
                <Label htmlFor="kitapFiyati" className="text-xs">Kitap Fiyatı (₺)</Label>
                <Input
                  id="kitapFiyati"
                  name="kitapFiyati"
                  type="number"
                  value={formData.kitapFiyati || ""}
                  onChange={handleInputChange}
                  className="h-8"
                  min={0}
                  step={0.01}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="kitapSetSayisi" className="text-xs">Kitap Set Sayısı</Label>
                <Input
                  id="kitapSetSayisi"
                  name="kitapSetSayisi"
                  type="number"
                  value={formData.kitapSetSayisi || ""}
                  onChange={handleInputChange}
                  className="h-8"
                  min={0}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="maxKrediKartiTaksit" className="text-xs">Maks. Kredi Kartı Taksit</Label>
                <Input
                  id="maxKrediKartiTaksit"
                  name="maxKrediKartiTaksit"
                  type="number"
                  value={formData.maxKrediKartiTaksit || ""}
                  onChange={(e) => {
                    // String değil, sayı olarak kaydet
                    const value = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      maxKrediKartiTaksit: value === "" ? 0 : parseInt(value)
                    }));
                  }}
                  className="h-8"
                  min={1}
                  max={12}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="maxSenetTaksit" className="text-xs">Maks. Senet Taksit</Label>
                <Input
                  id="maxSenetTaksit"
                  name="maxSenetTaksit"
                  type="number"
                  value={formData.maxSenetTaksit || ""}
                  onChange={(e) => {
                    // String değil, sayı olarak kaydet
                    const value = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      maxSenetTaksit: value === "" ? 0 : parseInt(value)
                    }));
                  }}
                  className="h-8"
                  min={1}
                  max={12}
                />
              </div>
            </div>
            
            {/* Hediyeler */}
            <div className="mt-4">
              <Label className="text-xs">Hediyeler</Label>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <Input
                    placeholder="Hediye Adı"
                    value={hediyeAdi}
                    onChange={(e) => setHediyeAdi(e.target.value)}
                    className="h-8"
                    onKeyDown={handleHediyeKeyDown}
                  />
                </div>
                <div className="w-32">
                  <Input
                    placeholder="Fiyat (₺)"
                    type="number"
                    value={hediyeFiyati}
                    onChange={(e) => setHediyeFiyati(e.target.value)}
                    className="h-8"
                    min={0}
                    step={0.01}
                    onKeyDown={handleHediyeKeyDown}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddHediye}
                  className="h-8 px-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ekle
                </Button>
              </div>
              
              {formData.hediyeler.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                  {formData.hediyeler.map((hediye, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center p-2 border rounded-md"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{hediye.isim}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(hediye.fiyat)}</div>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveHediye(index)}
                        className="h-7 px-2 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        Kaldır
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  Eklenmiş hediye bulunmuyor.
                </div>
              )}
            </div>
            
            {/* Taksit Özeti */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kredi Kartı Taksit Seçenekleri */}
              <div>
                <h3 className="text-sm font-medium mb-2">Kredi Kartı Taksit Seçenekleri</h3>
                {krediKartiTaksitler.length > 0 ? (
                  <div className="space-y-1">
                    {krediKartiTaksitler.map((taksit) => (
                      <div key={taksit.taksitSayisi} className="flex justify-between text-sm py-1 border-b">
                        <span>{taksit.taksitSayisi} Taksit:</span>
                        <span className="font-medium">{formatCurrency(taksit.aylikTutar)} x {taksit.taksitSayisi} = {formatCurrency(taksit.toplamTutar)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Henüz hesaplanmış taksit bulunmuyor. Lütfen nakit fiyat ve faiz oranı girin.
                  </div>
                )}
              </div>
              
              {/* Senet Taksit Seçenekleri */}
              <div>
                <h3 className="text-sm font-medium mb-2">Senet Taksit Seçenekleri</h3>
                {senetTaksitler.length > 0 ? (
                  <div className="space-y-1">
                    {senetTaksitler.map((taksit) => (
                      <div key={taksit.taksitSayisi} className="flex justify-between text-sm py-1 border-b">
                        <span>{taksit.taksitSayisi} Taksit:</span>
                        <span className="font-medium">{formatCurrency(taksit.aylikTutar)} x {taksit.taksitSayisi} = {formatCurrency(taksit.toplamTutar)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Henüz hesaplanmış taksit bulunmuyor. Lütfen nakit fiyat ve faiz oranı girin.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
      
      {/* Kampanya Yönetimi */}
      <div>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Mevcut Kampanyalar</CardTitle>
                <CardDescription>
                  Kampanyaları görüntüle, düzenle veya sil
                </CardDescription>
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <Select
                  value={selectedSubeId?.toString() || "all"}
                  onValueChange={(value) => setSelectedSubeId(value === "all" ? null : parseInt(value))}
                >
                  <SelectTrigger className="h-8 w-[200px]">
                    <SelectValue placeholder="Tüm şubeler" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm şubeler</SelectItem>
                    {subeler.map((sube) => (
                      <SelectItem key={sube.id} value={sube.id.toString()}>
                        {sube.subeAdi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => refreshKampanyalar(selectedSubeId || undefined)}
                  >
                    <RefreshCwIcon className="h-4 w-4" />
                  </Button>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleExportToExcel}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Excel'e Aktar</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                  />
                  
                  <Button variant="outline" size="sm" onClick={handleImportClick} className="h-8">
                    Excel'den İçe Aktar
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={handleExcelInfoClick} className="h-8">
                    ?
                  </Button>
                  
                  <Button variant="default" size="sm" onClick={handleAddNewClick} className="h-8">
                    <Plus className="mr-1 h-4 w-4" />
                    Yeni Ekle
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderGroupedKampanyalar()}
          </CardContent>
        </Card>
      </div>

      {/* Excel Bilgi Dialogu */}
      <Dialog open={showExcelInfoDialog} onOpenChange={setShowExcelInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excel İçe Aktarma Bilgisi</DialogTitle>
            <DialogDescription>
              Excel dosyasında olması gereken sütunlar:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>kampanyaAdi (zorunlu)</li>
              <li>egitimTipi</li>
              <li>kurSayisi</li>
              <li>toplamDersSaati</li>
              <li>listeFiyati (zorunlu)</li>
              <li>nakitFiyati (zorunlu)</li>
              <li>indirimOrani</li>
              <li>faizOrani</li>
              <li>kitapFiyati</li>
              <li>kitapSetSayisi</li>
              <li>maxKrediKartiTaksit</li>
              <li>maxSenetTaksit</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              Not: Dosyada 'hediyeler' bilgisi bulunmayacaktır, içe aktarma sonrası 
              kampanyalara manuel olarak hediye ekleyebilirsiniz.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowExcelInfoDialog(false)}
            >
              Tamam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Artık bağımsız sayfa olduğu için burada modal yok */}

      {/* Excel İçe Aktarma Bilgi Modalı */}
      <ExcelImportInfoDialog 
        open={showExcelInfoDialog} 
        onOpenChange={setShowExcelInfoDialog} 
      />
    </div>
  );
};

export default UcretlendirmePage;