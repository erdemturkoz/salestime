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
import { formatCurrency, formatPercentage, calculateDiscount } from "@/lib/utils";
import { calculateInstallments } from "@/utils/calculator";
import { Download, FileText, MessageCircle, Send } from "lucide-react";
import { downloadPDFWithTurkishSupport } from "@/utils/pdf-with-turkish";
import { generateTeklifPDF } from "@/utils/teklif-pdf-generator";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";


type OdemeType = "nakit" | "kredi-karti" | "senet" | "";

const HesaplamaPage = () => {
  const { kampanyalar } = useAppContext();
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedEgitimTipi, setSelectedEgitimTipi] = useState<string>("");
  const [selectedKampanyaId, setSelectedKampanyaId] = useState<string>("");
  const [selectedKurSayisi, setSelectedKurSayisi] = useState<number | null>(null);
  const [toplamDersSaati, setToplamDersSaati] = useState<number | null>(null);
  const [odemeTipi, setOdemeTipi] = useState<OdemeType>("");
  const [taksitSayisi, setTaksitSayisi] = useState<number>(1);
  const [kitapDahil, setKitapDahil] = useState<boolean>(true);
  const [hediyeEt, setHediyeEt] = useState<{[key: string]: boolean}>({});
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [ogrenciAdi, setOgrenciAdi] = useState<string>("");
  const [gecerlilikGunu, setGecerlilikGunu] = useState<number>(2);
  const [wpModalAcik, setWpModalAcik] = useState<boolean>(false);
  const [wpOgrenciAdi, setWpOgrenciAdi] = useState<string>("");
  const [wpTelefon, setWpTelefon] = useState<string>("");
  const [mudurIndirimTipi, setMudurIndirimTipi] = useState<"miktar" | "yuzde">("yuzde");
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
    genelToplam: 0, // Kampanyalı Fiyat + Hediyeler = Genel Toplam
    ozelFiyat: 0, // Genel Toplam - Müdür İnisiyatifi İndirimi = Özel Fiyat
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
    hediyeEdilenKalemler: "",
    hediyeEdilenTutar: 0,
  });

  const selectedKampanya = kampanyalar.find(k => k.id === selectedKampanyaId);
  
  // Kampanya seçildiğinde otomatik olarak kampanyada tanımlı kur sayısını ve toplam ders saatini seç
  useEffect(() => {
    if (selectedKampanyaId) {
      const kampanya = kampanyalar.find(k => k.id === selectedKampanyaId);
      if (kampanya) {
        setSelectedKurSayisi(kampanya.kurSayisi); // Kampanyada tanımlı kur sayısını ata
        setToplamDersSaati(kampanya.toplamDersSaati); // Kampanyada tanımlı toplam ders saatini ata
      }
    }
  }, [selectedKampanyaId, kampanyalar]);
  
  // Müdür inisiyatifi indirimi uygulandığında aylık ödeme tutarını güncelle
  useEffect(() => {
    // Müdür indirimi uygulandıysa ve taksitli ödemeyse
    if (mudurIndirimUygulandi && taksitSayisi > 1 && sonuclar.ozelFiyat > 0) {
      // Özel fiyat üzerinden yeni aylık ödeme hesapla
      const yeniAylikOdeme = Math.round(sonuclar.ozelFiyat / taksitSayisi);
      
      // Yeni taksit planı oluştur
      const yeniTaksitPlani: Array<{taksitNo: number, tutar: number}> = [];
      for (let i = 0; i < taksitSayisi; i++) {
        yeniTaksitPlani.push({
          taksitNo: i + 1,
          tutar: yeniAylikOdeme
        });
      }
      
      // Aylık ödeme tutarını ve taksit planını güncelle
      setSonuclar(prev => ({
        ...prev,
        aylikOdeme: yeniAylikOdeme,
        taksitPlanı: yeniTaksitPlani
      }));
      
      console.log("Müdür indirimi sonrası aylık ödeme güncellendi:", yeniAylikOdeme);
    }
  }, [mudurIndirimUygulandi, sonuclar.ozelFiyat, taksitSayisi]);

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

    // Hediye butonlarının durumlarını sıfırla
    setKitapHediyeEdildi(false);
    setHediyeEdildi({});
    
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
      // Toplam hesaplanırken, kampanyalı fiyat + hediyeler dahil edilir
      toplamFiyat = Math.round(nakitF + kitapF + hediyelerToplam);
      aylikOdeme = toplamFiyat; // Tek ödeme olduğu için aynı
    } else if (odemeTipi === "kredi-karti") {
      odemeSekli = "Kredi Kartı";
      
      if (taksitSayisi === 1) {
        taksitDetayi = "Tek Çekim";
        
        // Tek çekimde de %10 banka komisyonu uygulanıyor (değişiklik burada)
        const taksitHesapla = calculateInstallments(nakitF, selectedKampanya.faizOrani, [1]);
        
        if (taksitHesapla.length > 0) {
          // Kampanyalı fiyata komisyon ve faiz dahil
          kampanyaFiyat = Math.round(taksitHesapla[0].toplamTutar); // Yuvarlama yapalım
          // Toplam fiyat olarak kampanyalı fiyat + hediyeler dahil edilir
          toplamFiyat = Math.round(kampanyaFiyat + kitapF + hediyelerToplam);
          aylikOdeme = toplamFiyat;
        }
      } else {
        taksitDetayi = `${taksitSayisi} Taksit`;
        
        // Kredi kartı taksitli ödemede banka komisyonu ve faiz uygulanır
        // calculator.ts içinde banka komisyonu ekleniyor
        const taksitHesapla = calculateInstallments(nakitF, selectedKampanya.faizOrani, [taksitSayisi]);
        
        if (taksitHesapla.length > 0) {
          // Kampanyalı fiyata komisyon ve faiz dahil
          kampanyaFiyat = Math.round(taksitHesapla[0].toplamTutar); // Yuvarlama yapalım
          // Toplam fiyat olarak kampanyalı fiyat + hediyeler dahil edilir
          toplamFiyat = Math.round(kampanyaFiyat + kitapF + hediyelerToplam);
          // Aylık ödeme tüm toplamı taksite böler
          aylikOdeme = Math.round(toplamFiyat / taksitSayisi);
        }
      }
    } else if (odemeTipi === "senet") {
      odemeSekli = "Senet";
      taksitDetayi = `${taksitSayisi} Taksit`;
      
      // Senetli ödemede kampanyalı fiyata faiz uygulanır (banka komisyonu uygulanmaz)
      const taksitHesapla = calculateInstallments(nakitF, selectedKampanya.faizOrani, [taksitSayisi], 0); // Senet ödemesinde banka komisyonu yok
      
      if (taksitHesapla.length > 0) {
        // Kampanyalı fiyata faiz dahil
        kampanyaFiyat = Math.round(taksitHesapla[0].toplamTutar); // Yuvarlama yapalım
        // Toplam fiyat olarak kampanyalı fiyat + hediyeler dahil edilir
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
    
    // Toplam fiyat hesaplaması: Kampanyalı Fiyat + Hediyeler
    // Burada kitap dahil ve hediyeler zaten hesaplamaya katılıyor
    let genelToplam = toplamFiyat;
    
    // Hediye edilmiş ürünlerin toplamını zaten hesaplıyoruz, bunların fiyatı düşülecek
    let hediyelerUcretsiz = 0;
    
    // Müdür İnisiyatifi indirimini uygula
    let mudurIndirimTutari = 0;
    let ozelFiyat = genelToplam; // Varsayılan olarak genel toplam
    
    if (mudurIndirimDegeri > 0) {
      if (mudurIndirimTipi === "miktar") {
        // Miktar olarak indirim (TL)
        mudurIndirimTutari = Math.min(mudurIndirimDegeri, genelToplam); // Toplam tutardan fazla indirim yapılamaz
      } else {
        // Yüzde olarak indirim (%)
        const yuzde = Math.min(mudurIndirimDegeri, 100); // Maksimum %100 indirim
        mudurIndirimTutari = Math.round((genelToplam * yuzde) / 100);
      }
      
      // Özel fiyat = Genel Toplam - Müdür İnisiyatifi İndirimi
      ozelFiyat = genelToplam - mudurIndirimTutari;
      
      // Taksit varsa aylık ödemeyi yeniden hesapla
      if (taksitSayisi > 1) {
        aylikOdeme = Math.round(ozelFiyat / taksitSayisi);
        
        // Taksit planını güncelle
        if (odemeTipi === "senet" && taksitSayisi > 1) {
          sonuclar.taksitPlanı = [];
          for (let i = 0; i < taksitSayisi; i++) {
            sonuclar.taksitPlanı.push({
              taksitNo: i + 1,
              tutar: Math.round(ozelFiyat / taksitSayisi)
            });
          }
        }
      }
      
      setMudurIndirimUygulandi(true);
    } else {
      setMudurIndirimUygulandi(false);
    }
    
    // Sonuçların tamamını oluştur
    
    // Hediye edilen ürünleri tespit et
    let hediyeEdilenTutar = 0;
    let hediyeEdilenKalemler: Record<string, boolean> = {};
    
    // Kitap hediye edilmiş mi? Kitap dahil seçiliyse hediye olarak veriyoruz
    if (kitapDahil && kitapF > 0) {
      hediyeEdilenTutar += kitapF;
      hediyeEdilenKalemler["kitap"] = true;
    }
    
    // Hediyeler dizisini oluştur
    if (selectedKampanya.hediyeler && selectedKampanya.hediyeler.length > 0) {
      selectedKampanya.hediyeler.forEach(hediye => {
        // Bu örnekte tüm hediyeler verilmiş kabul ediliyor
        hediyeEdilenKalemler[hediye.isim] = true;
        hediyeEdilenTutar += hediye.fiyat;
      });
    }
    
    // Müdür indirimi hesaplandığında aylikOdeme useEffect'de güncellenir
    // Bu kısmı boş bırakıyoruz
    
    const yeniSonuclar = {
      listeFiyati: listeF,
      indirimTutari: indirimT,
      indirimYuzdesi: indirimY,
      kampanyaliFiyat: kampanyaFiyat,
      nakitFiyati: nakitF, // Nakit fiyatını ekledik
      kitapUcreti: kitapF,
      genelToplam: genelToplam, // Kampanyalı Fiyat + Hediyeler = Genel Toplam
      ozelFiyat: ozelFiyat, // Genel Toplam - Müdür İnisiyatifi İndirimi = Özel Fiyat
      aylikOdeme: aylikOdeme, // Müdür indirimi varsa güncellenmiş değeri
      odemeTipiText: odemeSekli,
      taksitDetay: taksitDetayi,
      kampanyaAdi: selectedKampanya.kampanyaAdi,
      hediyeler: selectedKampanya.hediyeler,
      egitimTipi: selectedEgitimTipi,
      kurSayisi: selectedKurSayisi,
      dersSaati: selectedKampanya.toplamDersSaati,
      taksitSayisi: taksitSayisi,
      hediyeEdilenKalemler: JSON.stringify(hediyeEdilenKalemler),
      hediyeEdilenTutar: hediyeEdilenTutar,
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

  // WhatsApp gönderim mutation
  const wpGonderimMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/whatsapp-gonderimleri", data);
    },
  });

  const handleWhatsappGonder = () => {
    if (!wpTelefon.trim()) {
      toast({ title: "Hata", description: "Telefon numarası zorunludur.", variant: "destructive" });
      return;
    }
    if (!wpOgrenciAdi.trim()) {
      toast({ title: "Hata", description: "Öğrenci adı soyadı zorunludur.", variant: "destructive" });
      return;
    }

    const roller = (user as any)?.roller;
    const ilkRol = roller?.[0];

    const odemeTipiLabel =
      odemeTipi === "nakit" ? "Nakit" :
      odemeTipi === "kredi-karti" ? "Kredi Kartı" :
      odemeTipi === "senet" ? "Senet" : "";

    const mesaj = [
      `Merhaba ${wpOgrenciAdi} 👋`,
      ``,
      `🎓 *${sonuclar.kampanyaAdi}* kampanyası için hazırladığım özel teklif:`,
      ``,
      `📚 Eğitim: ${sonuclar.egitimTipi || selectedEgitimTipi}`,
      `⏱ Toplam: ${sonuclar.kurSayisi} Kur / ${sonuclar.dersSaati} Saat`,
      ``,
      `💰 *Teklif Tutarı: ${formatCurrency(sonuclar.genelToplam)}*`,
      odemeTipi === "nakit"
        ? `✅ Ödeme: Nakit`
        : `📆 Ödeme: ${odemeTipiLabel} ${taksitSayisi} Taksit × ${formatCurrency(sonuclar.aylikOdeme)}`,
      ``,
      `Bu teklifimiz ${gecerlilikGunu} gün geçerlidir.`,
      ``,
      `📞 Sorularınız için: ${(user as any)?.telefon || ""}`,
      `🏫 ${ilkRol?.subeAdi || ""}`,
    ].join("\n");

    const temizTelefon = wpTelefon.replace(/\D/g, "");
    const waUrl = `https://wa.me/${temizTelefon}?text=${encodeURIComponent(mesaj)}`;

    // Kaydet
    wpGonderimMutation.mutate({
      ogrenciAdi: wpOgrenciAdi,
      ogrenciTelefon: temizTelefon,
      kampanyaAdi: sonuclar.kampanyaAdi,
      egitimTipi: sonuclar.egitimTipi || selectedEgitimTipi,
      genelToplam: sonuclar.genelToplam,
      odemeTipi: odemeTipiLabel,
      taksitSayisi: taksitSayisi,
      danismanAdi: (user as any)?.adi || "",
      danismanSoyadi: (user as any)?.soyadi || "",
      subeAdi: ilkRol?.subeAdi || "",
      subeId: ilkRol?.subeId || null,
      danismanId: (user as any)?.id || null,
    });

    window.open(waUrl, "_blank");
    setWpModalAcik(false);
    setWpTelefon("");
    toast({ title: "WhatsApp açıldı", description: "Mesaj hazırlandı, göndermek için WhatsApp'ta Gönder'e tıklayın." });
  };

  // PDF oluşturup indirme fonksiyonu - İSO Türkçe karakterli sürüm
  const handleGeneratePDF = () => {
    try {
      // Ekrandaki mevcut değerleri al
      const mudurIndirimTutari = sonuclar.mudurIndirimTutari || 0;
      const ozelFiyat = sonuclar.ozelFiyat || sonuclar.genelToplam;
      
      // PDF için ekstra veri hazırla - doğru fiyat hesaplamalarını içerecek şekilde
      const pdfData = {
        ...sonuclar,
        kampanyaAdi: selectedKampanya?.kampanyaAdi || 'Kampanya',
        egitimTipi: 'Genel İngilizce',
        mudurIndirimTutari, // Tam ekrandaki değer
        ozelFiyat, // Tam ekrandaki değer
        genelToplam: sonuclar.genelToplam,
        indirimOrani: selectedKampanya?.indirimOrani || 0
      };
      
      // Console'a kontrol amaçlı yazdır
      console.log("PDF için hazırlanan veriler:", pdfData);
      
      // Hazırlanan veriyi localStorage'a kaydet
      localStorage.setItem('hesaplamaData', JSON.stringify(pdfData));
      
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
        <header className="mb-4 mt-[5px]">
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="md:hidden w-8"></div> {/* Mobil görünümde sol tarafta boşluk */}
            <h1 className="text-2xl font-bold text-neutral-800 pl-10 md:pl-0 mt-2 md:mt-0">Ücret Hesaplama Arayüzü</h1>
          </div>
          <p className="text-neutral-500 pl-10 md:pl-0">Müşterilere sunulacak ödeme seçeneklerini hesaplayın.</p>
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

                {/* Kur Sayısı ve Toplam Ders Saati - 2 sütun */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Kur Sayısı */}
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
                      disabled={true}
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

                  {/* Toplam Ders Saati */}
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label htmlFor="ders-saati">Toplam Ders Saati</Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Toplam ders saati</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Input
                      id="ders-saati"
                      value={toplamDersSaati ? toplamDersSaati.toString() : ""}
                      type="text"
                      disabled={true}
                      className="bg-gray-100"
                    />
                  </div>
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
                
                {/* Taksit Sayısı - Ödeme tipi nakit ise gösterilmez */}
                {odemeTipi !== "nakit" && (
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
                      disabled={!selectedKampanya}
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



                {/* Öğrenci Adı */}
                <div className="space-y-1">
                  <Label htmlFor="ogrenci-adi" className="text-sm">Öğrenci Adı Soyadı <span className="text-neutral-400 font-normal">(isteğe bağlı)</span></Label>
                  <Input
                    id="ogrenci-adi"
                    placeholder="Örn: Ahmet Yılmaz"
                    value={ogrenciAdi}
                    onChange={(e) => setOgrenciAdi(e.target.value)}
                  />
                </div>

                {/* Teklif Geçerlilik Süresi */}
                <div className="space-y-1">
                  <Label className="text-sm">Teklif Geçerlilik Süresi</Label>
                  <Select
                    value={gecerlilikGunu.toString()}
                    onValueChange={(v) => setGecerlilikGunu(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Gün</SelectItem>
                      <SelectItem value="2">2 Gün</SelectItem>
                      <SelectItem value="3">3 Gün</SelectItem>
                      <SelectItem value="5">5 Gün</SelectItem>
                      <SelectItem value="7">7 Gün</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                      {/* Sadece Yüzde (%) seçeneği bırakıldı */}
                      <input type="hidden" value="yuzde" onChange={() => setMudurIndirimTipi("yuzde")} />
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          placeholder="İndirim yüzdesi"
                          value={mudurIndirimDegeri || ""}
                          onChange={(e) => setMudurIndirimDegeri(parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                        />
                        <div className="bg-blue-50 p-2 rounded text-sm text-blue-700 mt-2">
                          Yüzde olarak indirim oranını girin (0-100 arası)
                        </div>
                      </div>
                      {/* Açıklama bilgisi yukarıya taşındı */}
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
                    <div className="mt-3 rounded-md p-3 text-center" style={{ backgroundColor: '#ffec00', border: '1px solid #e6d400' }}>
                      <h3 className="text-lg font-bold text-black">NAKİT SATIŞ TAVSİYE EDİLMEKTEDİR</h3>
                      <p className="text-black">Nakit Fiyat: {formatCurrency(selectedKampanya ? selectedKampanya.nakitFiyati : 0)} (-{selectedKampanya ? selectedKampanya.indirimOrani.toFixed(1).replace('.', ',') : 0}% indirim)</p>
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
                        {/* KATEGORİ 1: KAMPANYA FİYATLANDIRMASI */}
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Liste Fiyatı:</span>
                          <span className="font-medium text-lg">{formatCurrency(sonuclar.listeFiyati)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Kampanya İndirimi:</span>
                          <span className="text-green-600 font-bold">-{formatCurrency(sonuclar.indirimTutari)} ({formatPercentage(sonuclar.indirimYuzdesi)})</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">Kampanyalı Fiyat:</span>
                          <span className="font-bold text-lg text-blue-700">{formatCurrency(sonuclar.kampanyaliFiyat)}</span>
                        </div>
                      </div>

                      {/* Ana Hediyeler Alanı */}
                      {(sonuclar.hediyeler.length > 0 || sonuclar.kitapUcreti > 0) && (
                        <div className="mt-6 border rounded-md p-4 bg-green-50 border-green-100">
                          <h4 className="text-green-700 font-bold mb-4 uppercase text-center">HEDİYELER</h4>
                          
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
                                    className={kitapHediyeEdildi ? "bg-rose-500 text-white hover:bg-rose-600 h-7 px-3 min-w-20" : "bg-green-600 text-white hover:bg-green-700 h-7 px-3 min-w-20"}
                                    onClick={() => {
                                      // Kitap hediye edildi durumunu değiştir
                                      const yeniDurum = !kitapHediyeEdildi;
                                      setKitapHediyeEdildi(yeniDurum);
                                      
                                      // Genel toplamı güncelle
                                      setSonuclar(prev => {
                                        // Kampanyalı fiyatı al (hediyeler hariç)
                                        const kampanyaliFiyat = prev.kampanyaliFiyat;
                                        
                                        // Tüm hediyelerin durumunu kontrol et ve toplam fiyatı hesapla
                                        let hediyelerToplami = 0;
                                        
                                        // Kitap hediye mi?
                                        if (kitapDahil && !yeniDurum) {
                                          hediyelerToplami += prev.kitapUcreti;
                                        }
                                        
                                        // Diğer hediyeler
                                        prev.hediyeler.forEach((h) => {
                                          // Eğer hediye edilmemişse (yani kullanıcı ödeyecekse) toplama ekle
                                          if (!hediyeEdildi[h.isim]) {
                                            hediyelerToplami += h.fiyat;
                                          }
                                        });
                                        
                                        // Yeni genel toplam: kampanyalı fiyat + ödenmesi gereken hediyeler
                                        const yeniGenelToplam = kampanyaliFiyat + hediyelerToplami;
                                        
                                        // Taksitli ödemede taksit başına düşen tutarı güncelle
                                        const yeniAylikOdeme = taksitSayisi > 1
                                          ? Math.round(yeniGenelToplam / taksitSayisi)
                                          : yeniGenelToplam;
                                        
                                        // Müdür inisiyatifi indirimi varsa özel fiyatı yeniden hesapla
                                        let yeniOzelFiyat = yeniGenelToplam;
                                        let yeniMudurIndirimTutari = 0;
                                        
                                        if (mudurIndirimUygulandi) {
                                          if (mudurIndirimTipi === "miktar") {
                                            yeniMudurIndirimTutari = Math.min(mudurIndirimDegeri, yeniGenelToplam);
                                          } else {
                                            const yuzde = Math.min(mudurIndirimDegeri, 100);
                                            yeniMudurIndirimTutari = Math.round((yeniGenelToplam * yuzde) / 100);
                                          }
                                          yeniOzelFiyat = yeniGenelToplam - yeniMudurIndirimTutari;
                                        }
                                        
                                        return {
                                          ...prev,
                                          genelToplam: yeniGenelToplam,
                                          aylikOdeme: yeniAylikOdeme,
                                          ozelFiyat: yeniOzelFiyat,
                                          mudurIndirimTutari: yeniMudurIndirimTutari
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
                                    {kitapHediyeEdildi ? "Hediye Edildi" : "Hediye Et"}
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
                                    className={hediyeEdildi[hediye.isim] ? "bg-rose-500 text-white hover:bg-rose-600 h-7 px-3 min-w-20" : "bg-green-600 text-white hover:bg-green-700 h-7 px-3 min-w-20"}
                                    onClick={() => {
                                      // Hediye edildi durumunu değiştir
                                      const yeniHediyeEdildi = {...hediyeEdildi};
                                      yeniHediyeEdildi[hediye.isim] = !yeniHediyeEdildi[hediye.isim];
                                      setHediyeEdildi(yeniHediyeEdildi);
                                      
                                      // Kampanyalı fiyatı al (hediyeler hariç)
                                      const kampanyaliFiyat = sonuclar.kampanyaliFiyat;
                                      
                                      // Tüm hediyelerin durumunu kontrol et ve toplam fiyatı hesapla
                                      let hediyelerToplami = 0;
                                      
                                      // Kitap hediye mi?
                                      if (kitapDahil && !kitapHediyeEdildi) {
                                        hediyelerToplami += sonuclar.kitapUcreti;
                                      }
                                      
                                      // Diğer hediyeler
                                      sonuclar.hediyeler.forEach((h) => {
                                        // Eğer hediye edilmemişse (yani kullanıcı ödeyecekse) toplama ekle
                                        if (!yeniHediyeEdildi[h.isim]) {
                                          hediyelerToplami += h.fiyat;
                                        }
                                      });
                                      
                                      // Yeni genel toplam: kampanyalı fiyat + ödenmesi gereken hediyeler
                                      const yeniGenelToplam = kampanyaliFiyat + hediyelerToplami;
                                      
                                      // Taksitli ödemede taksit başına düşen tutarı güncelle
                                      const yeniAylikOdeme = taksitSayisi > 1
                                        ? Math.round(yeniGenelToplam / taksitSayisi)
                                        : yeniGenelToplam;
                                      
                                      // Sonuçları güncelle (Özel fiyatı da güncelleyerek)
                                      setSonuclar(prev => {
                                        // Müdür inisiyatifi indirimi varsa özel fiyatı yeniden hesapla
                                        let yeniOzelFiyat = yeniGenelToplam;
                                        if (mudurIndirimUygulandi) {
                                          let mudurIndirimTutari = 0;
                                          if (mudurIndirimTipi === "miktar") {
                                            mudurIndirimTutari = Math.min(mudurIndirimDegeri, yeniGenelToplam);
                                          } else {
                                            const yuzde = Math.min(mudurIndirimDegeri, 100);
                                            mudurIndirimTutari = Math.round((yeniGenelToplam * yuzde) / 100);
                                          }
                                          yeniOzelFiyat = yeniGenelToplam - mudurIndirimTutari;
                                        }
                                        
                                        return {
                                          ...prev,
                                          genelToplam: yeniGenelToplam,
                                          aylikOdeme: yeniAylikOdeme,
                                          ozelFiyat: yeniOzelFiyat,
                                          mudurIndirimTutari: mudurIndirimUygulandi ? 
                                            (mudurIndirimTipi === "miktar" ? 
                                              Math.min(mudurIndirimDegeri, yeniGenelToplam) : 
                                              Math.round((yeniGenelToplam * Math.min(mudurIndirimDegeri, 100)) / 100)
                                            ) : 0
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
                                    {hediyeEdildi[hediye.isim] ? "Hediye Edildi" : "Hediye Et"}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Genel Toplam */}
                      <div className="mt-6 p-3 bg-blue-50 rounded-md border border-blue-100 mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-800 font-bold">Genel Toplam:</span>
                          <span className="text-blue-800 text-xl font-bold">{formatCurrency(sonuclar.genelToplam)}</span>
                        </div>
                      </div>
                      
                      {/* Müdür İnisiyatifi İndirimi */}
                      {mudurIndirimUygulandi && (
                        <div className="p-3 bg-green-50 rounded-md border border-green-100 mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-green-800 font-bold">Müdür İnisiyatifi İndirimi:</span>
                            <span className="text-green-600 font-bold">
                              -{formatCurrency(sonuclar.mudurIndirimTutari)} 
                              <span className="ml-1">({mudurIndirimDegeri}%)</span>
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Özel Fiyat - Müdür indiriminden sonra */}
                      {mudurIndirimUygulandi && (
                        <div className="p-3 bg-yellow-300 rounded-md border border-yellow-400">
                          <div className="flex justify-between items-center">
                            <span className="text-black font-bold">Özel Fiyat:</span>
                            <span className="text-black text-xl font-bold">{formatCurrency(sonuclar.ozelFiyat)}</span>
                          </div>
                        </div>
                      )}
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
            {/* WhatsApp Modal */}
            <Dialog open={wpModalAcik} onOpenChange={setWpModalAcik}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    WhatsApp'tan Teklif Gönder
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    <strong>Teklif:</strong> {sonuclar.kampanyaAdi} — {formatCurrency(sonuclar.genelToplam)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="wp-ad">Öğrenci Adı Soyadı</Label>
                    <Input
                      id="wp-ad"
                      placeholder="Örn: Ahmet Yılmaz"
                      value={wpOgrenciAdi}
                      onChange={(e) => setWpOgrenciAdi(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="wp-tel">WhatsApp Telefon Numarası</Label>
                    <Input
                      id="wp-tel"
                      placeholder="Örn: 905321234567 (başında + olmadan)"
                      value={wpTelefon}
                      onChange={(e) => setWpTelefon(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">Uluslararası format: 905xxxxxxxxx (TR için 90 ile başlayın)</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setWpModalAcik(false)}>İptal</Button>
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white"
                    onClick={handleWhatsappGonder}
                    disabled={wpGonderimMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    WhatsApp'ı Aç ve Gönder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {isCalculated && (
              <CardFooter className="flex justify-end gap-2 bg-neutral-50 border-t border-neutral-100 p-3 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleGeneratePDF}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF İndir (Eski)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-400 text-green-700 hover:bg-green-50"
                  onClick={() => {
                    setWpOgrenciAdi(ogrenciAdi || "");
                    setWpModalAcik(true);
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                  WhatsApp'tan Gönder
                </Button>
                <Button
                  size="sm"
                  className="bg-[#111827] hover:bg-[#1f2937] text-[#FFF200]"
                  onClick={() => {
                    const roller = (user as any)?.roller;
                    const ilkRol = roller?.[0];
                    generateTeklifPDF({
                      kampanyaAdi: sonuclar.kampanyaAdi,
                      egitimTipi: sonuclar.egitimTipi || selectedEgitimTipi,
                      kurSayisi: sonuclar.kurSayisi,
                      dersSaati: sonuclar.dersSaati,
                      listeFiyati: sonuclar.listeFiyati,
                      indirimTutari: sonuclar.indirimTutari,
                      indirimYuzdesi: sonuclar.indirimYuzdesi,
                      kampanyaliFiyat: sonuclar.kampanyaliFiyat,
                      genelToplam: sonuclar.genelToplam,
                      ozelFiyat: sonuclar.ozelFiyat,
                      nakitFiyati: (sonuclar as any).nakitFiyati || selectedKampanya?.nakitFiyati || 0,
                      odemeTipi: odemeTipi,
                      odemeTipiText: sonuclar.odemeTipiText,
                      taksitSayisi: taksitSayisi,
                      aylikOdeme: sonuclar.aylikOdeme,
                      kitapUcreti: sonuclar.kitapUcreti,
                      kitapDahil: kitapDahil,
                      kitapHediyeEdildi: kitapHediyeEdildi,
                      hediyeler: sonuclar.hediyeler,
                      hediyeEdildi: hediyeEdildi,
                      mudurIndirimTutari: sonuclar.mudurIndirimTutari,
                      mudurIndirimTipi: sonuclar.mudurIndirimTipi,
                      mudurIndirimDegeri: mudurIndirimDegeri,
                      ogrenciAdi: ogrenciAdi,
                      gecerlilikGunu: gecerlilikGunu,
                      danismanAdi: (user as any)?.adi || "",
                      danismanSoyadi: (user as any)?.soyadi || "",
                      danismanTelefon: (user as any)?.telefon || "",
                      subeAdi: ilkRol?.subeAdi || "",
                      subeAdresi: "",
                      subeTelefon: "",
                    });
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Profesyonel Teklif PDF
                </Button>
              </CardFooter>
            )}
          </Card>
          
          {/* Özet Bilgi Kartı - En Alta Yerleştirildi */}
          {isCalculated && (
            <div className="w-full lg:col-span-3 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-xl overflow-hidden border border-slate-200 shadow-md">
                {/* Sol Kolon - Eğitim Bilgileri */}
                <div className="col-span-4 p-4 bg-blue-50 border-b lg:border-b-0 lg:border-r border-slate-200 shadow-sm">
                  <div className="flex flex-col h-full">
                    <div className="p-2 mb-3 border-b border-blue-200">
                      <h3 className="text-xl font-extrabold text-blue-700 tracking-wide mb-1">{sonuclar.kampanyaAdi}</h3>
                      <p className="text-md text-blue-600 font-medium">{sonuclar.egitimTipi}</p>
                      <p className="text-sm text-neutral-500 mt-1">Genel İngilizce</p>

                      <div className="mt-2 text-neutral-600 text-md">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-normal">Kur:</span>
                          <span className="font-medium">{sonuclar.kurSayisi}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-normal">Toplam:</span>
                          <span className="font-medium">{sonuclar.dersSaati} saat</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-600 font-normal text-md">Liste Fiyatı:</span>
                        <span className="font-medium text-md">{formatCurrency(sonuclar.listeFiyati)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-600 font-normal text-md">İndirim Oranı:</span>
                        <span className="font-medium text-md text-green-600">
                          {formatPercentage(sonuclar.indirimYuzdesi)}
                        </span>
                      </div>
                      
                      <div className="mt-4 mb-3 bg-white rounded-md border border-gray-200 p-2 shadow-sm">
                        <div className="text-neutral-700 font-semibold text-md mb-2 border-b pb-1">İndirim Kırılımı:</div>
                        
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-blue-100">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <span className="text-neutral-600 text-sm">Kampanya İndirimi:</span>
                          </div>
                          <span className="font-medium text-sm text-blue-600">
                            {formatPercentage(sonuclar.indirimYuzdesi)} ({formatCurrency(sonuclar.listeFiyati - sonuclar.kampanyaliFiyat)})
                          </span>
                        </div>
                        
                        {sonuclar.mudurIndirimTutari > 0 && (
                          <div className="flex justify-between items-center mb-2 pb-2 border-b border-purple-100">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                              <span className="text-neutral-600 text-sm">Müdür İndirimi:</span>
                            </div>
                            <span className="font-medium text-sm text-purple-600">
                              {formatPercentage(sonuclar.mudurIndirimTutari / sonuclar.genelToplam * 100)} ({formatCurrency(sonuclar.mudurIndirimTutari)})
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-neutral-700 font-medium text-sm">Toplam İndirim:</span>
                          </div>
                          <span className="font-medium text-sm text-green-600">
                            {formatPercentage((sonuclar.listeFiyati - sonuclar.ozelFiyat) / sonuclar.listeFiyati * 100)} ({formatCurrency(sonuclar.listeFiyati - sonuclar.ozelFiyat)})
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-blue-100">
                        <span className="text-neutral-700 font-medium text-md">Eğitim Fiyatı:</span>
                        <span className="font-bold text-md">{formatCurrency(sonuclar.kampanyaliFiyat)}</span>
                      </div>
                      
                      <div className="mt-3 bg-blue-100 rounded-md p-3 border border-blue-200">
                        <p className="text-blue-800 font-semibold text-md mb-2 border-b border-blue-200 pb-1">
                          <span className="inline-block mr-1">🎁</span> Bu teklif için hediyeler:
                        </p>
                        {kitapDahil && (
                          <div className="flex items-center justify-between mb-2 pl-1">
                            <div className="flex items-center">
                              <span className="w-2 h-2 rounded-full bg-blue-600 mr-2"></span>
                              <span className="text-neutral-700 font-medium">Kitap Seti</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm font-medium line-through text-neutral-500 mr-1">{formatCurrency(sonuclar.kitapUcreti)}</span>
                              <span className="text-xs bg-green-600 text-white px-1 py-0.5 rounded">ÜCRETSİZ</span>
                            </div>
                          </div>
                        )}
                        
                        {sonuclar.hediyeler.length > 0 ? (
                          <ul className="text-md space-y-2">
                            {sonuclar.hediyeler.map((hediye, index) => (
                              <li key={index} className="flex items-center justify-between pl-1">
                                <div className="flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-blue-600 mr-2"></span>
                                  <span className="text-neutral-700 font-medium">{hediye.isim}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-sm font-medium line-through text-neutral-500 mr-1">{formatCurrency(hediye.fiyat)}</span>
                                  <span className="text-xs bg-green-600 text-white px-1 py-0.5 rounded">ÜCRETSİZ</span>
                                </div>
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
                
                {/* Orta Kolon - Ödeme Detayları */}
                <div className="col-span-4 p-4 bg-green-50 border-b lg:border-b-0 lg:border-r border-slate-200 shadow-sm">
                  <div className="flex flex-col h-full">
                    <div className="p-2 mb-3 border-b border-green-200">
                      <h3 className="text-lg font-bold text-green-700 tracking-wide">Ödeme Detayları</h3>
                    </div>
                    
                    <div className="bg-white rounded-md border border-green-200 p-3 mb-4">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-green-100">
                        <span className="text-green-800 font-medium">Ödeme Şekli:</span>
                        <span className="font-semibold">{sonuclar.odemeTipiText}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-green-800 font-medium">Plan:</span>
                        <span className="font-semibold">{taksitSayisi} Taksit</span>
                      </div>
                    </div>
                    
                    {taksitSayisi > 1 && (
                      <div>
                        <div className="bg-white rounded-md border border-green-200 overflow-hidden shadow-sm">
                          <div className="flex justify-between items-center p-2 bg-green-100 border-b border-green-200">
                            <p className="text-green-700 font-bold">Aylık Ödeme Planı</p>
                            <p className="text-green-800 font-semibold">Toplam: <span className="font-bold">{formatCurrency(sonuclar.ozelFiyat)}</span></p>
                          </div>
                          <div className="p-3">
                            <table className="w-full text-sm">
                              <thead className="bg-green-50 border-b border-green-200">
                                <tr>
                                  <th className="text-left py-2 px-3 font-semibold text-green-800 rounded-tl-md">Taksit</th>
                                  <th className="text-right py-2 px-3 font-semibold text-green-800 rounded-tr-md">Tutar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: taksitSayisi }, (_, i) => (
                                  <tr key={i} className={i % 2 === 0 ? "bg-green-50/30" : ""}>
                                    <td className="py-2 px-3 border-b border-green-50">{i + 1}. Taksit</td>
                                    <td className="py-2 px-3 text-right font-medium border-b border-green-50">{formatCurrency(sonuclar.aylikOdeme)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-green-50">
                                  <td className="py-2 px-3 font-semibold text-green-800">Toplam:</td>
                                  <td className="py-2 px-3 text-right font-bold text-green-800">{formatCurrency(sonuclar.ozelFiyat)}</td>
                                </tr>
                                <tr>
                                  <td colSpan={2} className="py-2 px-3 text-center font-medium text-neutral-600 text-xs bg-green-50/30 border-t border-green-100">
                                    <span className="bg-green-100 px-3 py-1 rounded-full">
                                      {taksitSayisi} taksit boyunca her ay {formatCurrency(sonuclar.aylikOdeme)} ödeme
                                    </span>
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Sağ Kolon - Genel Toplam ve Hediyeler */}
                <div className="col-span-4 p-4 bg-yellow-50 shadow-sm">
                  <div className="flex flex-col h-full">
                    {sonuclar.mudurIndirimTutari > 0 ? (
                      <div className="mb-4 p-4 bg-yellow-200 rounded-md border border-yellow-400 shadow">
                        <p className="text-black font-bold text-center uppercase tracking-wider text-xl">KİŞİYE ÖZEL FİYAT</p>
                        <p className="text-4xl font-extrabold text-center text-black my-3">{formatCurrency(sonuclar.ozelFiyat)}</p>
                        <div className="border-t border-yellow-400 my-2"></div>
                        <div className="text-center text-black">
                          <p className="font-semibold text-md">EKSTRA Müdür İndirimi: {formatCurrency(sonuclar.mudurIndirimTutari)}</p>
                          <p className="mt-1 bg-green-600 text-white text-sm font-medium inline-block px-2 py-0.5 rounded uppercase font-bold">
                            EKSTRA {formatPercentage(sonuclar.mudurIndirimTutari / sonuclar.genelToplam * 100)} indirim uygulandı
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 p-4 bg-yellow-100 rounded-md border border-yellow-300 shadow">
                        <p className="text-yellow-800 font-semibold text-center text-lg">Genel Toplam</p>
                        <p className="text-3xl font-bold text-center text-yellow-900 my-2">{formatCurrency(sonuclar.genelToplam)}</p>
                        <p className="text-sm text-center text-yellow-700 font-medium">Tüm vergiler dahil</p>
                      </div>
                    )}
                    
                    <div className="p-4 bg-blue-50 rounded-md border border-blue-200 shadow-sm mb-3">
                      <h3 className="text-blue-800 font-semibold text-md mb-3 pb-1 border-b border-blue-100">Fiyat Bilgileri</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-blue-800 font-medium">Liste Fiyatı:</span>
                          <span className="font-bold text-lg">{formatCurrency(sonuclar.listeFiyati)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-1">
                          <span className="text-blue-800 font-medium">İndirim Oranı:</span>
                          <span className="font-bold text-lg text-green-600">
                            {formatPercentage(sonuclar.indirimYuzdesi)} ({formatCurrency(sonuclar.listeFiyati - sonuclar.kampanyaliFiyat)})
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-amber-100 rounded-md border border-amber-300 shadow-sm">
                      <div className="text-center">
                        <p className="text-amber-800 font-semibold text-lg mb-1">
                          Teklif Tarihi: {new Date().toLocaleDateString('tr-TR')}
                        </p>
                        <div className="mt-2 bg-amber-200 inline-block px-4 py-1 rounded-full border border-amber-400">
                          <p className="text-amber-900 font-bold">
                            Bu teklif sadece 2 gün geçerlidir!
                          </p>
                        </div>
                        <p className="text-sm text-amber-700 mt-3 font-medium">
                          Kampanya kontenjanları sınırlıdır. Fırsatı kaçırmayın!
                        </p>
                      </div>
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