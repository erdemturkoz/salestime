import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { calculateInstallments } from "@/utils/calculator";
import { Download } from "lucide-react";
import { downloadPDFWithTurkishSupport } from "@/utils/pdf-with-turkish";


type OdemeType = "nakit" | "kredi-karti" | "senet" | "";

const HesaplamaPage = () => {
  const { kampanyalar } = useAppContext();
  const { toast } = useToast();

  const [selectedEgitimTipi, setSelectedEgitimTipi] = useState<string>("");
  const [selectedKampanyaId, setSelectedKampanyaId] = useState<string>("");
  const [selectedKurSayisi, setSelectedKurSayisi] = useState<number | null>(null);
  const [odemeTipi, setOdemeTipi] = useState<OdemeType>("");
  const [taksitSayisi, setTaksitSayisi] = useState<number>(1);
  const [kitapDahil, setKitapDahil] = useState<boolean>(true);
  const [hediyeEt, setHediyeEt] = useState<{[key: string]: boolean}>({});
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [mudurIndirimTipi, setMudurIndirimTipi] = useState<"miktar" | "yuzde">("miktar");
  const [mudurIndirimDegeri, setMudurIndirimDegeri] = useState<number>(0);
  const [mudurIndirimUygulandi, setMudurIndirimUygulandi] = useState<boolean>(false);
  const [mudurInisiyatifiAcik, setMudurInisiyatifiAcik] = useState<boolean>(false);
  const [hediyeEdildi, setHediyeEdildi] = useState<{[key: string]: boolean}>({});
  const [kitapHediyeEdildi, setKitapHediyeEdildi] = useState<boolean>(false);
  
  // Sonuçlar
  const [sonuclar, setSonuclar] = useState({
    listeFiyati: 0,
    indirimTutari: 0,
    indirimYuzdesi: 0,
    kampanyaliFiyat: 0,
    kitapUcreti: 0,
    genelToplam: 0,
    aylikOdeme: 0,
    odemeTipiText: "",
    taksitDetay: "",
    kampanyaAdi: "",
    hediyeler: [] as {isim: string, fiyat: number}[],
    taksitPlanı: [] as {taksitNo: number, tutar: number}[],
    mudurIndirimTutari: 0,
    mudurIndirimTipi: "",
    egitimTipi: "",
    kurSayisi: 0,
    dersSaati: 0,
  });

  const selectedKampanya = kampanyalar.find(k => k.id === selectedKampanyaId);
  
  // Kampanya seçildiğinde otomatik olarak kampanyada tanımlı kur sayısını seç
  useEffect(() => {
    if (selectedKampanyaId) {
      const kampanya = kampanyalar.find(k => k.id === selectedKampanyaId);
      if (kampanya) {
        setSelectedKurSayisi(kampanya.kurSayisi); // Kampanyada tanımlı kur sayısını ata
      }
    }
  }, [selectedKampanyaId, kampanyalar]);

  const kurOptions = () => {
    if (!selectedKampanya) return [];
    const options = [];
    for (let i = 1; i <= selectedKampanya.kurSayisi; i++) {
      options.push(i);
    }
    return options;
  };

  const taksitOptions = () => {
    if (odemeTipi === "kredi-karti" && selectedKampanya) {
      const options = [1]; // Tek çekim her zaman var
      if (selectedKampanya.maxKrediKartiTaksit >= 2) options.push(2);
      if (selectedKampanya.maxKrediKartiTaksit >= 4) options.push(4);
      if (selectedKampanya.maxKrediKartiTaksit >= 6) options.push(6);
      if (selectedKampanya.maxKrediKartiTaksit >= 8) options.push(8);
      if (selectedKampanya.maxKrediKartiTaksit >= 10) options.push(10);
      return options;
    } else if (odemeTipi === "senet" && selectedKampanya) {
      const options = [];
      if (selectedKampanya.maxSenetTaksit >= 2) options.push(2);
      if (selectedKampanya.maxSenetTaksit >= 4) options.push(4);
      if (selectedKampanya.maxSenetTaksit >= 6) options.push(6); 
      if (selectedKampanya.maxSenetTaksit >= 8) options.push(8);
      if (selectedKampanya.maxSenetTaksit >= 10) options.push(10);
      if (selectedKampanya.maxSenetTaksit >= 12) options.push(12);
      return options;
    }
    return [];
  };

  const calculatePayment = () => {
    if (!selectedEgitimTipi || !selectedKampanya || !selectedKurSayisi || !odemeTipi) {
      toast({
        title: "Hata",
        description: "Lütfen tüm alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    // Kur sayısına göre oransal hesaplama
    const kurOrani = selectedKurSayisi / selectedKampanya.kurSayisi;
    const listeF = selectedKampanya.listeFiyati * kurOrani;
    const nakitF = selectedKampanya.nakitFiyati * kurOrani;
    const kitapF = kitapDahil ? selectedKampanya.kitapFiyati * (selectedKampanya.kitapSetSayisi || 1) : 0;
    const hediyelerToplam = selectedKampanya.hediyeler.reduce((toplam, hediye) => toplam + hediye.fiyat, 0);
    
    // İndirim hesaplamaları - sonradan değerler değişecek
    let indirimT = listeF - nakitF;
    let indirimY = Math.round((indirimT / listeF) * 100);
    
    let odemeSekli = "";
    let taksitDetayi = "Tek Çekim";
    let kampanyaFiyat = nakitF;
    let toplamFiyat = 0;
    let aylikOdeme = 0;
    
    // Ödeme tipi hesaplamaları
    if (odemeTipi === "nakit") {
      odemeSekli = "Nakit";
      taksitDetayi = "Tek Çekim";
      // Kampanyalı fiyat sadece indirimli eğitim fiyatını kapsar, kitap ve hediye dahil değil
      kampanyaFiyat = Math.round(nakitF);
      // Toplam hesaplanırken kitap ve hediyeler eklenecek
      toplamFiyat = Math.round(nakitF + kitapF + hediyelerToplam);
      aylikOdeme = toplamFiyat; // Tek ödeme olduğu için aynı
    } else if (odemeTipi === "kredi-karti") {
      odemeSekli = "Kredi Kartı";
      
      // Kredi kartı işlemlerinde %10 fatura bedeli ekle
      const faturaBedeli = nakitF * 0.1;
      
      if (taksitSayisi === 1) {
        taksitDetayi = "Tek Çekim";
        // Tek çekimde faiz uygulanmıyor
        kampanyaFiyat = nakitF + faturaBedeli;
        // Kampanyalı fiyat için açıklama ekleyelim
        kampanyaFiyat = Math.round(kampanyaFiyat); // Yuvarlama yapalım
        // Taksit hesaplamasında kitap ve hediyeler dahil edilecek
        toplamFiyat = Math.round(kampanyaFiyat + kitapF + hediyelerToplam);
        aylikOdeme = toplamFiyat;
      } else {
        taksitDetayi = `${taksitSayisi} Taksit`;
        
        // Kredi kartı taksitli ödemede sadece kampanya fiyatına faiz uygulanır
        const krediKartiTemelFiyat = nakitF + faturaBedeli;
        const taksitHesapla = calculateInstallments(krediKartiTemelFiyat, selectedKampanya.faizOrani, [taksitSayisi]);
        
        if (taksitHesapla.length > 0) {
          // Kampanyalı fiyata faiz dahil
          kampanyaFiyat = Math.round(taksitHesapla[0].toplam); // Yuvarlama yapalım
          // Toplam fiyata kitap ve hediyeler eklenir
          toplamFiyat = Math.round(kampanyaFiyat + kitapF + hediyelerToplam);
          // Aylık ödeme tüm toplamı taksite böler
          aylikOdeme = Math.round(toplamFiyat / taksitSayisi);
        }
      }
    } else if (odemeTipi === "senet") {
      odemeSekli = "Senet";
      taksitDetayi = `${taksitSayisi} Taksit`;
      
      // Senetli ödemede kampanyalı fiyata faiz uygulanır
      const taksitHesapla = calculateInstallments(nakitF, selectedKampanya.faizOrani, [taksitSayisi]);
      
      if (taksitHesapla.length > 0) {
        // Kampanyalı fiyata faiz dahil
        kampanyaFiyat = Math.round(taksitHesapla[0].toplam); // Yuvarlama yapalım
        // Toplam fiyata kitap ve hediyeler eklenir
        toplamFiyat = Math.round(kampanyaFiyat + kitapF + hediyelerToplam);
        // Aylık ödeme tüm toplamı taksite böler
        aylikOdeme = Math.round(toplamFiyat / taksitSayisi);
        
        // Taksit planını oluşturalım - şimdilik aynı değerler, daha sonra farklılaştırılabilir
        const taksitPlanı = [];
        
        // Taksitleri oluştur
        for (let i = 0; i < taksitSayisi; i++) {
          taksitPlanı.push({
            taksitNo: i + 1,
            tutar: Math.round(toplamFiyat / taksitSayisi)
          });
        }
        
        // Taksit planını sonuçlara ekleyelim
        sonuclar.taksitPlanı = taksitPlanı;
      }
    }
    
    // Hediye etme durumunu sıfırla
    setHediyeEt({});
    
    // İndirim oranını liste fiyatı ve kampanyalı fiyat arasından hesaplama
    indirimT = listeF - kampanyaFiyat;
    indirimY = Math.round((indirimT / listeF) * 100);
    
    // Müdür İnisiyatifi indirimini uygula
    let mudurIndirimTutari = 0;
    let toplamFiyatSonHali = toplamFiyat;
    
    if (mudurIndirimDegeri > 0) {
      if (mudurIndirimTipi === "miktar") {
        // Miktar olarak indirim (TL)
        mudurIndirimTutari = Math.min(mudurIndirimDegeri, toplamFiyat); // Toplam tutardan fazla indirim yapılamaz
        toplamFiyatSonHali = toplamFiyat - mudurIndirimTutari;
      } else {
        // Yüzde olarak indirim (%)
        const yuzde = Math.min(mudurIndirimDegeri, 100); // Maksimum %100 indirim
        mudurIndirimTutari = Math.round((toplamFiyat * yuzde) / 100);
        toplamFiyatSonHali = toplamFiyat - mudurIndirimTutari;
      }
      
      // Taksit varsa aylık ödemeyi yeniden hesapla
      if (taksitSayisi > 1) {
        aylikOdeme = Math.round(toplamFiyatSonHali / taksitSayisi);
        
        // Taksit planını güncelle
        if (odemeTipi === "senet" && taksitSayisi > 1) {
          sonuclar.taksitPlanı = [];
          for (let i = 0; i < taksitSayisi; i++) {
            sonuclar.taksitPlanı.push({
              taksitNo: i + 1,
              tutar: Math.round(toplamFiyatSonHali / taksitSayisi)
            });
          }
        }
      }
      
      setMudurIndirimUygulandi(true);
    } else {
      setMudurIndirimUygulandi(false);
    }
    
    // Sonuçların tamamını oluştur
    const yeniSonuclar = {
      listeFiyati: listeF,
      indirimTutari: indirimT,
      indirimYuzdesi: indirimY,
      kampanyaliFiyat: kampanyaFiyat,
      kitapUcreti: kitapF,
      genelToplam: toplamFiyatSonHali,
      aylikOdeme: aylikOdeme,
      odemeTipiText: odemeSekli,
      taksitDetay: taksitDetayi,
      kampanyaAdi: selectedKampanya.kampanyaAdi,
      hediyeler: selectedKampanya.hediyeler,
      egitimTipi: selectedEgitimTipi,
      kurSayisi: selectedKurSayisi,
      dersSaati: selectedKampanya.toplamDersSaati,
      taksitSayisi: taksitSayisi,
      hediyeEdilenKalemler: JSON.stringify({}), // Başlangıçta boş bir hediye listesi
      taksitPlanı: sonuclar.taksitPlanı || [], // Varsa, oluşturulan taksit planını ekleyelim
      mudurIndirimTutari: mudurIndirimTutari,
      mudurIndirimTipi: mudurIndirimDegeri > 0 ? mudurIndirimTipi : "",
    };
    
    // Sonuçları state'e kaydet
    setSonuclar(yeniSonuclar);
    
    // Sonuçları localStorage'a kaydet (PDF için)
    try {
      localStorage.setItem('hesaplamaData', JSON.stringify(yeniSonuclar));
    } catch (error) {
      console.error("Sonuçlar localStorage'a kaydedilemedi:", error);
    }
    
    setIsCalculated(true);
  };

  // PDF oluşturup indirme fonksiyonu - İSO Türkçe karakterli sürüm
  const handleGeneratePDF = () => {
    try {
      // Türkçe karakterleri destekleyen PDF oluşturma metodunu kullan
      downloadPDFWithTurkishSupport();
      
      toast({
        title: "PDF oluşturuldu",
        description: "Belge başarıyla indirildi.",
        variant: "default",
      });
    } catch (error) {
      console.error("PDF oluşturma hatası:", error);
      toast({
        title: "Hata",
        description: "PDF oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full w-full">
      <div className="w-full px-6">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-neutral-800">Ücret Hesaplama Arayüzü</h1>
          <p className="text-neutral-500">Müşterilere sunulacak ödeme seçeneklerini hesaplayın.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Hesaplama Formu */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Ödeme Hesaplama</CardTitle>
            </CardHeader>
            <CardContent>
              <form 
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  calculatePayment();
                }}
              >
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="egitim-tipi">Eğitim Tipi</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Eğitim tipini seçin</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Select
                    value={selectedEgitimTipi}
                    onValueChange={(value) => {
                      setSelectedEgitimTipi(value);
                      setSelectedKampanyaId(""); // Eğitim tipi değiştiğinde kampanya seçimini sıfırla
                      setSelectedKurSayisi(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Eğitim tipi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Genel İngilizce">Genel İngilizce</SelectItem>
                      <SelectItem value="Genel Almanca">Genel Almanca</SelectItem>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Teenage">Teenage</SelectItem>
                      <SelectItem value="Yds">Yds</SelectItem>
                      <SelectItem value="Toefl">Toefl</SelectItem>
                      <SelectItem value="Ielts">Ielts</SelectItem>
                      <SelectItem value="Ydt">Ydt</SelectItem>
                      <SelectItem value="Özel Ders">Özel Ders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="kampanya-secim">Kampanya Seçimi</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Uygulanacak kampanyayı seçin</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Select
                    value={selectedKampanyaId}
                    onValueChange={(value) => {
                      setSelectedKampanyaId(value);
                    }}
                    disabled={!selectedEgitimTipi}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kampanya seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {kampanyalar
                        .filter(kampanya => !selectedEgitimTipi || kampanya.egitimTipi === selectedEgitimTipi)
                        .map((kampanya) => (
                          <SelectItem key={kampanya.id} value={kampanya.id}>
                            {kampanya.kampanyaAdi}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="kur-secim">Kur Sayısı</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Alınacak kur sayısını seçin</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Select
                    value={selectedKurSayisi?.toString() || ""}
                    onValueChange={(value) => setSelectedKurSayisi(parseInt(value))}
                    disabled={!selectedKampanya}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kur sayısı seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {kurOptions().map((kur) => (
                        <SelectItem key={kur} value={kur.toString()}>
                          {kur} Kur
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label>Ödeme Tipi</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ödeme şeklini seçin</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={odemeTipi === "nakit" ? "default" : "outline"}
                      className="py-2 px-3 text-sm font-medium"
                      onClick={() => {
                        setOdemeTipi("nakit");
                        setTaksitSayisi(1);
                      }}
                      disabled={!selectedKampanya}
                    >
                      Nakit
                    </Button>
                    <Button
                      type="button"
                      variant={odemeTipi === "kredi-karti" ? "default" : "outline"}
                      className="py-2 px-3 text-sm font-medium"
                      onClick={() => {
                        setOdemeTipi("kredi-karti");
                        setTaksitSayisi(1);
                      }}
                      disabled={!selectedKampanya}
                    >
                      Kredi Kartı
                    </Button>
                    <Button
                      type="button"
                      variant={odemeTipi === "senet" ? "default" : "outline"}
                      className="py-2 px-3 text-sm font-medium"
                      onClick={() => {
                        setOdemeTipi("senet");
                        // Senet seçildiğinde varsayılan olarak ilk taksit seçeneğini belirle
                        const senetSeçenekleri = taksitOptions();
                        setTaksitSayisi(senetSeçenekleri.length > 0 ? senetSeçenekleri[0] : 1);
                      }}
                      disabled={!selectedKampanya}
                    >
                      Senet
                    </Button>
                  </div>
                </div>

                {(odemeTipi === "kredi-karti" || odemeTipi === "senet") && (
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor="taksit-secim">Taksit Sayısı</Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ödemeyi kaç taksite bölmek istediğinizi seçin</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Select
                      value={taksitSayisi?.toString() || ""}
                      onValueChange={(value) => setTaksitSayisi(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Taksit sayısı seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {taksitOptions().map((taksit) => (
                          <SelectItem key={taksit} value={taksit.toString()}>
                            {taksit === 1 ? "Tek Çekim" : `${taksit} Taksit`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="kitap-dahil" 
                    checked={kitapDahil}
                    onCheckedChange={(checked) => {
                      setKitapDahil(!!checked);
                    }}
                  />
                  <Label htmlFor="kitap-dahil">Kitap dahil</Label>
                </div>

                {/* Müdür İnisiyatifi Bölümü - Açılır/Kapanır */}
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => setMudurInisiyatifiAcik(!mudurInisiyatifiAcik)}
                  >
                    <p className="text-sm font-medium text-gray-700">Müdür İnisiyatifi</p>
                    <span className="text-gray-400">
                      {mudurInisiyatifiAcik ? "▲" : "▼"}
                    </span>
                  </button>
                  
                  {mudurInisiyatifiAcik && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <Button
                          type="button"
                          variant={mudurIndirimTipi === "miktar" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMudurIndirimTipi("miktar")}
                        >
                          Miktar (₺)
                        </Button>
                        <Button
                          type="button"
                          variant={mudurIndirimTipi === "yuzde" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMudurIndirimTipi("yuzde")}
                        >
                          Yüzde (%)
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          placeholder={mudurIndirimTipi === "miktar" ? "İndirim tutarı" : "İndirim yüzdesi"}
                          value={mudurIndirimDegeri || ""}
                          onChange={(e) => setMudurIndirimDegeri(parseFloat(e.target.value) || 0)}
                          min="0"
                          max={mudurIndirimTipi === "yuzde" ? "100" : undefined}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {mudurIndirimTipi === "miktar" 
                          ? "Toplam tutardan düşülecek sabit indirim miktarı" 
                          : "Toplam tutara uygulanacak indirim yüzdesi"}
                      </p>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full">Hesapla</Button>
              </form>
            </CardContent>
          </Card>

          {/* Sonuç Kartı */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3 border-b border-neutral-100 bg-neutral-50">
              <CardTitle>Hesaplama Sonucu</CardTitle>
              {isCalculated && (
                <div className="mt-2">
                  {/* Ana kampanya başlığı */}
                  {/* Kurs ve Eğitim Tipi Başlık */}
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-center">
                    <h3 className="text-xl font-bold text-blue-700">{sonuclar.kampanyaAdi}</h3>
                    <p className="text-blue-600">{sonuclar.egitimTipi} - {sonuclar.kurSayisi} Kur</p>
                  </div>
                  
                  {/* Nakit ödeme tavsiyesi banneri */}
                  {odemeTipi !== "nakit" && (
                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-md p-3 text-center">
                      <h3 className="text-lg font-bold text-amber-800">NAKİT SATIŞ TAVSİYE EDİLMEKTEDİR</h3>
                      <p className="text-amber-600">Nakit Fiyat: {formatCurrency(sonuclar.kampanyaliFiyat)} (-{formatPercentage(sonuclar.indirimYuzdesi)} indirim)</p>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4">
              {isCalculated ? (
                <>
                  {/* Ana Sayfa Düzeni - İki kolon */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Fiyat Detayları */}
                    <div>
                      <h3 className="text-xl font-medium mb-4 text-neutral-700">Fiyat Detayları</h3>
                      
                      {/* Fiyat Listesi */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Liste Fiyatı:</span>
                          <span className="font-medium text-lg">{formatCurrency(sonuclar.listeFiyati)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">İndirim:</span>
                          <span className="text-success font-medium">-{formatCurrency(sonuclar.indirimTutari)} ({formatPercentage(sonuclar.indirimYuzdesi)})</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Kampanyalı Fiyat:</span>
                          <span className="font-medium">{formatCurrency(sonuclar.kampanyaliFiyat)}</span>
                        </div>
                      </div>

                      {/* Hediyeler Alanı */}
                      {(sonuclar.hediyeler.length > 0 || sonuclar.kitapUcreti > 0) && (
                        <div className="mt-6 border rounded-md p-4 bg-blue-50 border-blue-100">
                          <h4 className="text-blue-700 font-bold mb-4 uppercase text-center">HEDİYELER</h4>
                          
                          <div className="space-y-3">
                            {sonuclar.kitapUcreti > 0 && (
                              <div className="flex items-center">
                                <div className="flex-grow">
                                  <span className="text-neutral-700 font-medium">Kitap Seti</span>
                                </div>
                                <div className="flex-shrink-0 mx-2 text-right">
                                  <span className="text-xs text-neutral-600">({formatCurrency(sonuclar.kitapUcreti)})</span>
                                </div>
                                <div className="flex-shrink-0 ml-3">
                                  <Button 
                                    variant="secondary" 
                                    size="xs" 
                                    className={kitapHediyeEdildi ? "bg-green-500 text-white hover:bg-green-600 h-7 px-3 min-w-20" : "bg-blue-500 text-white hover:bg-blue-600 h-7 px-3 min-w-20"}
                                    onClick={() => {
                                      // Kitap hediye edildi durumunu değiştir
                                      const yeniDurum = !kitapHediyeEdildi;
                                      setKitapHediyeEdildi(yeniDurum);
                                      
                                      // Genel toplamı güncelle
                                      setSonuclar(prev => {
                                        const yeniToplam = yeniDurum 
                                          ? prev.genelToplam - prev.kitapUcreti 
                                          : prev.genelToplam + prev.kitapUcreti;
                                        
                                        // Taksitli ödemede taksit başına düşen tutarı güncelle
                                        const yeniAylikOdeme = taksitSayisi > 1 
                                          ? Math.round(yeniToplam / taksitSayisi) 
                                          : yeniToplam;
                                        
                                        return {
                                          ...prev,
                                          genelToplam: yeniToplam,
                                          aylikOdeme: yeniAylikOdeme
                                        };
                                      });
                                      
                                      // Bildirim göster
                                      toast({
                                        title: yeniDurum ? "Kitap hediye edildi" : "Kitap hediye iptal edildi",
                                        description: yeniDurum ? "Kitap ücreti genel toplamdan düşüldü." : "Kitap ücreti genel toplama eklendi.",
                                        variant: "default",
                                      });
                                    }}
                                  >
                                    Hediye Et
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            {sonuclar.hediyeler.map((hediye, index) => (
                              <div key={index} className="flex items-center">
                                <div className="flex-grow">
                                  <span className="text-neutral-700 font-medium">{hediye.isim}</span>
                                </div>
                                <div className="flex-shrink-0 mx-2 text-right">
                                  <span className="text-xs text-neutral-600">({formatCurrency(hediye.fiyat)})</span>
                                </div>
                                <div className="flex-shrink-0 ml-3">
                                  <Button 
                                    variant="secondary" 
                                    size="xs" 
                                    className={hediyeEdildi[hediye.isim] ? "bg-green-500 text-white hover:bg-green-600 h-7 px-3 min-w-20" : "bg-blue-500 text-white hover:bg-blue-600 h-7 px-3 min-w-20"}
                                    onClick={() => {
                                      // Hediye edildi durumunu değiştir
                                      const yeniHediyeEdildi = {...hediyeEdildi};
                                      yeniHediyeEdildi[hediye.isim] = !yeniHediyeEdildi[hediye.isim];
                                      setHediyeEdildi(yeniHediyeEdildi);
                                      
                                      // Genel toplamı güncelle
                                      setSonuclar(prev => {
                                        const yeniToplam = yeniHediyeEdildi[hediye.isim] 
                                          ? prev.genelToplam - hediye.fiyat 
                                          : prev.genelToplam + hediye.fiyat;
                                        
                                        // Taksitli ödemede taksit başına düşen tutarı güncelle
                                        const yeniAylikOdeme = taksitSayisi > 1 
                                          ? Math.round(yeniToplam / taksitSayisi) 
                                          : yeniToplam;
                                        
                                        return {
                                          ...prev,
                                          genelToplam: yeniToplam,
                                          aylikOdeme: yeniAylikOdeme
                                        };
                                      });
                                      
                                      // Bildirim göster
                                      toast({
                                        title: yeniHediyeEdildi[hediye.isim] ? "Hediye edildi" : "Hediye iptal edildi",
                                        description: yeniHediyeEdildi[hediye.isim] ? `${hediye.isim} hediyesi genel toplamdan düşüldü.` : `${hediye.isim} hediyesi genel toplama eklendi.`,
                                        variant: "default",
                                      });
                                    }}
                                  >
                                    Hediye Et
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Müdür İnisiyatifi İndirimi */}
                      {mudurIndirimUygulandi && (
                        <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-100">
                          <h4 className="text-green-700 font-bold">Müdür İnisiyatifi İndirimi:</h4>
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-700 text-sm">Özel yetkilendirme ile uygulanan ek indirim</span>
                            <span className="text-green-600 font-medium">-{formatCurrency(sonuclar.mudurIndirimTutari)} ({mudurIndirimDegeri}%)</span>
                          </div>
                        </div>
                      )}

                      {/* Genel Toplam */}
                      <div className="mt-6 p-3 bg-blue-100 rounded-md border border-blue-200">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-800 font-bold">Genel Toplam:</span>
                          <span className="text-blue-800 text-xl font-bold">{formatCurrency(sonuclar.genelToplam)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ödeme Detayları */}
                    <div>
                      <h3 className="text-xl font-medium mb-4 text-neutral-700">Ödeme Detayları</h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Eğitim Tipi:</span>
                          <span className="font-medium">{sonuclar.egitimTipi}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Toplam Ders Saati:</span>
                          <span className="font-medium">{sonuclar.dersSaati} saat</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Ödeme Şekli:</span>
                          <span className="font-medium">{sonuclar.odemeTipiText}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Taksit Sayısı:</span>
                          <span className="font-medium">{taksitSayisi} Taksit</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Aylık Ödeme:</span>
                          <span className="font-medium text-blue-700">{formatCurrency(sonuclar.aylikOdeme)}</span>
                        </div>
                      </div>

                      {/* Taksit Planı - Sadece taksitli ödeme için */}
                      {taksitSayisi > 1 && (
                        <div className="mt-6">
                          <h4 className="font-medium mb-2">Aylık Ödeme Planı:</h4>
                          <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                              <tbody>
                                {Array.from({length: taksitSayisi}).map((_, i) => (
                                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="py-2 px-3 border-b">{i+1}. Taksit:</td>
                                    <td className="py-2 px-3 border-b text-right font-medium">{formatCurrency(sonuclar.aylikOdeme)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="mt-4 text-sm text-neutral-600 border-t border-blue-100 pt-3">
                    Bu belge eğitim kapsamını ve ödeme koşullarını gösterir. Kaydınız tamamlandığında kesin sözleşme düzenlenecektir.
                  </p>
                </>
              ) : (
                <div className="py-12 text-center text-neutral-500">
                  <p>Hesaplama yapmak için formu doldurun ve "Hesapla" butonuna tıklayın.</p>
                </div>
              )}
            </CardContent>
            {isCalculated && (
              <CardFooter className="flex justify-end bg-neutral-50 border-t border-neutral-100 p-3">
                <Button variant="outline" size="sm" onClick={handleGeneratePDF}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF İndir
                </Button>
              </CardFooter>
            )}
          </Card>
          
          {/* Özet Bilgi Kartı - En Alta Yerleştirildi */}
          {isCalculated && (
            <div className="w-full lg:col-span-3 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-md overflow-hidden border border-slate-200">
                {/* Sol Kolon - Eğitim Bilgileri */}
                <div className="col-span-4 p-4 bg-blue-50 border-b lg:border-b-0 lg:border-r border-slate-200">
                  <div className="flex flex-col h-full">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-blue-700">{sonuclar.kampanyaAdi}</h3>
                      <p className="text-blue-600">{sonuclar.egitimTipi}</p>
                      <p className="text-sm text-neutral-500">Genel İngilizce</p>

                      <div className="mt-2 text-gray-600 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span>Kur:</span>
                          <span className="font-medium">{sonuclar.kurSayisi}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Toplam:</span>
                          <span className="font-medium">{sonuclar.dersSaati} saat</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Liste Fiyatı:</span>
                        <span className="font-medium">{formatCurrency(sonuclar.listeFiyati)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-neutral-600">İndirim Oranı:</span>
                        <span className="font-medium text-green-600">{formatPercentage(sonuclar.indirimYuzdesi)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Eğitim Fiyatı:</span>
                        <span className="font-medium">{formatCurrency(sonuclar.kampanyaliFiyat)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Orta Kolon - Ödeme Detayları */}
                <div className="col-span-4 p-4 bg-green-50 border-b lg:border-b-0 lg:border-r border-slate-200">
                  <div className="flex flex-col h-full">
                    <h3 className="text-lg font-bold text-green-700 mb-4">Ödeme Detayları</h3>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Ödeme Şekli:</span>
                        <span className="font-medium">{sonuclar.odemeTipiText}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Plan:</span>
                        <span className="font-medium">{taksitSayisi} Taksit</span>
                      </div>
                    </div>
                    
                    {taksitSayisi > 1 && (
                      <div className="pt-4">
                        <div className="py-3 px-2 bg-white rounded border border-green-200">
                          <table className="w-full">
                            <tbody>
                              <tr>
                                <td colSpan={2} className="pb-2">
                                  <p className="text-green-700 font-medium text-center">Aylık Ödeme</p>
                                </td>
                              </tr>
                              <tr>
                                <td colSpan={2}>
                                  <p className="text-xl font-bold text-center text-green-800">{formatCurrency(sonuclar.aylikOdeme)}</p>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Sağ Kolon - Genel Toplam ve Hediyeler */}
                <div className="col-span-4 p-4 bg-yellow-50">
                  <div className="flex flex-col h-full">
                    <div className="mb-3 p-3 bg-yellow-100 rounded-md border border-yellow-300 shadow-sm">
                      <p className="text-yellow-800 font-medium text-center">Genel Toplam</p>
                      <p className="text-2xl font-bold text-center text-yellow-900 my-1">{formatCurrency(sonuclar.genelToplam)}</p>
                      <p className="text-xs text-center text-yellow-700">Tüm vergiler dahil</p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-md border border-blue-100 mb-3">
                      <p className="text-blue-800 font-medium mb-2">Bu teklif için hediyeler:</p>
                      
                      {kitapDahil && (
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="mr-2 text-blue-500">•</span>
                            <span className="text-neutral-700">Kitap Seti</span>
                          </div>
                          <span className="text-xs font-medium line-through text-neutral-500">{formatCurrency(sonuclar.kitapUcreti)}</span>
                        </div>
                      )}
                      
                      {sonuclar.hediyeler.length > 0 ? (
                        <ul className="text-sm space-y-1">
                          {sonuclar.hediyeler.map((hediye, index) => (
                            <li key={index} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="mr-2 text-blue-500">•</span>
                                <span className="text-neutral-700">{hediye.isim}</span>
                              </div>
                              <span className="text-xs font-medium line-through text-neutral-500">{formatCurrency(hediye.fiyat)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : kitapDahil ? null : (
                        <div className="text-center text-neutral-500 text-sm my-1">
                          <p>Hediye bulunmuyor</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HesaplamaPage;