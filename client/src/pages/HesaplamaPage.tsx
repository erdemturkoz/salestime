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
import { PrinterIcon } from "lucide-react";

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
    
    // İndirim hesaplamaları
    const indirimT = listeF - nakitF;
    const indirimY = (indirimT / listeF) * 100;
    
    let odemeSekli = "";
    let taksitDetayi = "Tek Çekim";
    let toplamFiyat = nakitF;
    let aylikOdeme = nakitF;
    
    // Ödeme tipi hesaplamaları
    if (odemeTipi === "nakit") {
      odemeSekli = "Nakit";
      taksitDetayi = "Tek Çekim";
      toplamFiyat = nakitF;
      aylikOdeme = nakitF;
    } else if (odemeTipi === "kredi-karti") {
      odemeSekli = "Kredi Kartı";
      
      // Kredi kartı işlemlerinde %10 fatura bedeli ekle
      const faturaBedeli = nakitF * 0.1;
      const krediKartiFiyat = nakitF + faturaBedeli;
      
      if (taksitSayisi === 1) {
        taksitDetayi = "Tek Çekim";
        toplamFiyat = krediKartiFiyat;
        aylikOdeme = krediKartiFiyat;
      } else {
        taksitDetayi = `${taksitSayisi} Taksit`;
        const taksitHesapla = calculateInstallments(krediKartiFiyat, selectedKampanya.faizOrani, [taksitSayisi]);
        if (taksitHesapla.length > 0) {
          toplamFiyat = taksitHesapla[0].toplam;
          aylikOdeme = taksitHesapla[0].aylik;
        }
      }
    } else if (odemeTipi === "senet") {
      odemeSekli = "Senet";
      taksitDetayi = `${taksitSayisi} Taksit`;
      const taksitHesapla = calculateInstallments(nakitF, selectedKampanya.faizOrani, [taksitSayisi]);
      if (taksitHesapla.length > 0) {
        toplamFiyat = taksitHesapla[0].toplam;
        aylikOdeme = taksitHesapla[0].aylik;
      }
    }
    
    // Hediye etme durumunu sıfırla
    setHediyeEt({});
    
    // Sonuçları güncelle
    setSonuclar({
      listeFiyati: listeF,
      indirimTutari: indirimT,
      indirimYuzdesi: indirimY,
      kampanyaliFiyat: toplamFiyat,
      kitapUcreti: kitapF,
      genelToplam: toplamFiyat + kitapF,
      aylikOdeme: aylikOdeme,
      odemeTipiText: odemeSekli,
      taksitDetay: taksitDetayi,
      kampanyaAdi: selectedKampanya.kampanyaAdi,
      hediyeler: selectedKampanya.hediyeler,
    });
    
    setIsCalculated(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">Ücret Hesaplama Arayüzü</h1>
        <p className="text-neutral-500">Müşterilere sunulacak ödeme seçeneklerini hesaplayın.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      setTaksitSayisi(3);
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
                        <Label htmlFor="taksit-sayisi">Taksit Sayısı</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ödemenin kaç taksite bölüneceğini seçin</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Select
                    value={taksitSayisi.toString()}
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        <Checkbox
                          id="kitap-dahil"
                          checked={kitapDahil}
                          onCheckedChange={(checked) => {
                            setKitapDahil(checked as boolean);
                          }}
                          disabled={!selectedKampanya}
                        />
                        <Label
                          htmlFor="kitap-dahil"
                          className="ml-2 text-sm text-neutral-700"
                        >
                          Kitap dahil
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eğitim kitapları ücrete dahil edilsin mi?</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Button type="submit" className="w-full" disabled={!selectedEgitimTipi || !selectedKampanya || !selectedKurSayisi || !odemeTipi}>
                Hesapla
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sonuç Kartı */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b border-neutral-100 bg-neutral-50">
            <CardTitle>Hesaplama Sonucu</CardTitle>
            {isCalculated && sonuclar.kampanyaAdi && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-md p-2 text-center">
                <span className="font-bold text-blue-700">{sonuclar.kampanyaAdi}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {isCalculated ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fiyat Detayları */}
                <div>
                  <h3 className="text-neutral-500 font-medium mb-4">Fiyat Detayları</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Liste Fiyatı:</span>
                      <span className="font-medium">{formatCurrency(sonuclar.listeFiyati)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">İndirim:</span>
                      <span className="text-green-500 font-medium">
                        -{formatCurrency(sonuclar.indirimTutari)} ({formatPercentage(sonuclar.indirimYuzdesi)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Kampanyalı Fiyat:</span>
                      <span className="font-medium">
                        {formatCurrency(sonuclar.kampanyaliFiyat)}
                        {odemeTipi === "kredi-karti" && (
                          <span className="text-xs text-gray-500 block">
                            (Fatura bedeli %10 dahil)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="border-t border-neutral-100 pt-2 flex justify-between">
                      <span className="text-neutral-800 font-medium">Genel Toplam:</span>
                      <span className="text-primary font-bold text-lg">
                        {formatCurrency(sonuclar.genelToplam)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Ödeme Detayları */}
                <div>
                  <h3 className="text-neutral-500 font-medium mb-4">Ödeme Detayları</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Eğitim Tipi:</span>
                      <span className="font-medium">{selectedEgitimTipi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Ödeme Şekli:</span>
                      <span className="font-medium">{sonuclar.odemeTipiText}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Taksit Sayısı:</span>
                      <span className="font-medium">{sonuclar.taksitDetay}</span>
                    </div>
                    {(odemeTipi === "kredi-karti" || odemeTipi === "senet") && taksitSayisi > 1 && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Aylık Ödeme:</span>
                        <span className="font-medium">{formatCurrency(sonuclar.aylikOdeme)}</span>
                      </div>
                    )}
                    
                    {/* Aylık Ödeme Planı */}
                    {(odemeTipi === "kredi-karti" || odemeTipi === "senet") && taksitSayisi > 1 && (
                      <div className="border-t border-neutral-100 pt-2 mt-2">
                        <span className="text-neutral-800 font-medium block mb-2">Aylık Ödeme Planı:</span>
                        <div className="grid grid-cols-1 gap-2">
                          {Array.from({ length: taksitSayisi }).map((_, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-neutral-600">{index + 1}. Taksit:</span>
                              <span className="font-medium">{formatCurrency(sonuclar.aylikOdeme)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Kampanya bilgisini üst banner'a taşıdık */}
                    <div className="border-t border-neutral-100 pt-2">
                        <span className="text-neutral-800 font-medium block mb-2">Hediyeler:</span>
                        <ul className="list-disc list-inside space-y-1 text-neutral-600">
                          {kitapDahil && (
                            <li className="flex items-center justify-between">
                              <div>
                                Kitap Ücreti
                                <span className="ml-1 text-gray-500">
                                  ({formatCurrency(sonuclar.kitapUcreti)})
                                  {selectedKampanya && selectedKampanya.kitapSetSayisi > 1 && kitapDahil && (
                                    <span className="ml-1 text-gray-500">
                                      ({selectedKampanya.kitapSetSayisi} set)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant={hediyeEt["kitap"] ? "default" : "outline"}
                                size="sm"
                                className="ml-2 text-xs h-7 px-2"
                                onClick={() => {
                                  const newHediyeEt = { ...hediyeEt };
                                  newHediyeEt["kitap"] = !newHediyeEt["kitap"];
                                  setHediyeEt(newHediyeEt);
                                  
                                  // Toplam fiyatı güncelle
                                  const yeniToplam = sonuclar.genelToplam + (newHediyeEt["kitap"] ? -sonuclar.kitapUcreti : sonuclar.kitapUcreti);
                                  setSonuclar({
                                    ...sonuclar,
                                    genelToplam: yeniToplam
                                  });
                                }}
                              >
                                {hediyeEt["kitap"] ? "Hediye Edildi" : "Hediye Et"}
                              </Button>
                            </li>
                          )}
                          {sonuclar.hediyeler.map((hediye, index) => (
                            <li key={index} className="flex items-center justify-between">
                              <div>
                                {hediye.isim}
                                {hediye.fiyat > 0 && (
                                  <span className="ml-1 text-gray-500">
                                    ({formatCurrency(hediye.fiyat)})
                                  </span>
                                )}
                              </div>
                              {hediye.fiyat > 0 && (
                                <Button
                                  type="button"
                                  variant={hediyeEt[hediye.isim] ? "default" : "outline"}
                                  size="sm"
                                  className="ml-2 text-xs h-7 px-2"
                                  onClick={() => {
                                    const newHediyeEt = { ...hediyeEt };
                                    newHediyeEt[hediye.isim] = !newHediyeEt[hediye.isim];
                                    setHediyeEt(newHediyeEt);
                                    
                                    // Toplam fiyatı güncelle
                                    const yeniToplam = sonuclar.genelToplam + (newHediyeEt[hediye.isim] ? -hediye.fiyat : hediye.fiyat);
                                    setSonuclar({
                                      ...sonuclar,
                                      genelToplam: yeniToplam
                                    });
                                  }}
                                >
                                  {hediyeEt[hediye.isim] ? "Hediye Edildi" : "Hediye Et"}
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-neutral-500">
                Hesaplama sonuçları burada görüntülenecek.
                <br />
                Lütfen sol taraftaki formu doldurup "Hesapla" düğmesine tıklayın.
              </div>
            )}
          </CardContent>
          <CardFooter className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
            <Button 
              onClick={handlePrint}
              className="flex items-center gap-2"
              disabled={!isCalculated}
            >
              <PrinterIcon className="h-5 w-5" />
              Yazdır
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default HesaplamaPage;
