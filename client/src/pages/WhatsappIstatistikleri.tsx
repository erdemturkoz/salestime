import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Search, Filter, Building, X, RefreshCw, LogIn } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { WhatsappGonderim } from "@shared/schema";

const WhatsappIstatistikleri = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [aramaMetni, setAramaMetni] = useState("");
  const [subeFiltre, setSubeFiltre] = useState("hepsi");
  const [odemeTipiFiltre, setOdemeTipiFiltre] = useState("hepsi");
  const [baslangicTarihi, setBaslangicTarihi] = useState("");
  const [bitisTarihi, setBitisTarihi] = useState("");

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (baslangicTarihi) params.set("baslangic", baslangicTarihi);
    if (bitisTarihi) params.set("bitis", bitisTarihi);
    return params.toString() ? `?${params.toString()}` : "";
  };

  const { data: gonderimleri = [], isLoading, isError, error, refetch } = useQuery<WhatsappGonderim[]>({
    queryKey: ["/api/whatsapp-gonderimleri", baslangicTarihi, bitisTarihi],
    queryFn: async () => {
      const qs = buildQueryString();
      const res = await fetch(`/api/whatsapp-gonderimleri${qs}`, { credentials: "include" });
      if (res.status === 401) {
        throw new Error("OTURUM_BITTI");
      }
      if (!res.ok) throw new Error("Veri yüklenemedi");
      return res.json();
    },
    retry: false,
  });

  const filtrelenmis = gonderimleri.filter((g) => {
    const metin = aramaMetni.toLowerCase();
    const metinEslesti =
      !metin ||
      g.ogrenciAdi.toLowerCase().includes(metin) ||
      g.ogrenciTelefon.includes(metin) ||
      g.kampanyaAdi.toLowerCase().includes(metin) ||
      g.danismanAdi.toLowerCase().includes(metin) ||
      g.danismanSoyadi.toLowerCase().includes(metin);

    const subeEslesti = subeFiltre === "hepsi" || g.subeAdi === subeFiltre;
    const odemeEslesti = odemeTipiFiltre === "hepsi" || g.odemeTipi === odemeTipiFiltre;

    return metinEslesti && subeEslesti && odemeEslesti;
  });

  const benzersizSubeler = [...new Set(gonderimleri.map((g) => g.subeAdi))].filter(Boolean);
  const benzersizOdemeTipleri = [...new Set(gonderimleri.map((g) => g.odemeTipi))].filter(Boolean);

  const toplamTutar = filtrelenmis.reduce((acc, g) => acc + (g.genelToplam || 0), 0);

  const filtreSifirla = () => {
    setAramaMetni("");
    setSubeFiltre("hepsi");
    setOdemeTipiFiltre("hepsi");
    setBaslangicTarihi("");
    setBitisTarihi("");
  };

  const aktifFiltreSayisi = [
    aramaMetni,
    subeFiltre !== "hepsi" ? subeFiltre : "",
    odemeTipiFiltre !== "hepsi" ? odemeTipiFiltre : "",
    baslangicTarihi,
    bitisTarihi,
  ].filter(Boolean).length;

  if (isError) {
    const oturumBitti = (error as Error)?.message === "OTURUM_BITTI";
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {oturumBitti ? <LogIn className="h-8 w-8 text-red-500" /> : <RefreshCw className="h-8 w-8 text-red-500" />}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {oturumBitti ? "Oturumunuz Sona Erdi" : "Veri Yüklenemedi"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {oturumBitti
              ? "İstatistikleri görüntülemek için tekrar giriş yapmanız gerekiyor."
              : "Sunucudan veri alınamadı. Lütfen tekrar deneyin."}
          </p>
          {oturumBitti ? (
            <Button onClick={() => setLocation("/giris")} className="bg-green-500 hover:bg-green-600 text-white">
              <LogIn className="h-4 w-4 mr-2" />
              Giriş Yap
            </Button>
          ) : (
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tekrar Dene
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Başlık */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Teklif İstatistikleri</h1>
            <p className="text-sm text-gray-500">Gönderilen tüm WhatsApp tekliflerini görüntüle ve filtrele</p>
          </div>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-green-700 font-medium mb-1">Toplam Gönderim</p>
            <p className="text-2xl font-bold text-green-800">{filtrelenmis.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs text-blue-700 font-medium mb-1">Toplam Teklif Tutarı</p>
            <p className="text-lg font-bold text-blue-800">{formatCurrency(toplamTutar)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="p-4">
            <p className="text-xs text-purple-700 font-medium mb-1">Benzersiz Öğrenci</p>
            <p className="text-2xl font-bold text-purple-800">
              {new Set(filtrelenmis.map((g) => g.ogrenciTelefon)).size}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-50">
          <CardContent className="p-4">
            <p className="text-xs text-orange-700 font-medium mb-1">Ort. Teklif Tutarı</p>
            <p className="text-lg font-bold text-orange-800">
              {filtrelenmis.length > 0
                ? formatCurrency(Math.round(toplamTutar / filtrelenmis.length))
                : formatCurrency(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card className="mb-6 border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-base">Filtreler</CardTitle>
              {aktifFiltreSayisi > 0 && (
                <Badge variant="secondary" className="text-xs">{aktifFiltreSayisi} aktif</Badge>
              )}
            </div>
            {aktifFiltreSayisi > 0 && (
              <Button variant="ghost" size="sm" onClick={filtreSifirla} className="text-xs h-7">
                <X className="h-3 w-3 mr-1" />
                Temizle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Label className="text-xs mb-1 block">Arama</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Öğrenci adı, telefon, kampanya..."
                  value={aramaMetni}
                  onChange={(e) => setAramaMetni(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Şube</Label>
              <Select value={subeFiltre} onValueChange={setSubeFiltre}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tüm şubeler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hepsi">Tüm Şubeler</SelectItem>
                  {benzersizSubeler.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Ödeme Tipi</Label>
              <Select value={odemeTipiFiltre} onValueChange={setOdemeTipiFiltre}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tüm tipler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hepsi">Tüm Tipler</SelectItem>
                  {benzersizOdemeTipleri.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Tarih Aralığı</Label>
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={baslangicTarihi}
                  onChange={(e) => setBaslangicTarihi(e.target.value)}
                  className="h-9 text-xs"
                />
                <Input
                  type="date"
                  value={bitisTarihi}
                  onChange={(e) => setBitisTarihi(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Gönderim Listesi
            <span className="ml-2 text-sm font-normal text-gray-500">({filtrelenmis.length} kayıt)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-3" />
                <p className="text-sm">Yükleniyor...</p>
              </div>
            </div>
          ) : filtrelenmis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Henüz gönderim kaydı yok</p>
              <p className="text-xs mt-1">WhatsApp'tan teklif gönderdikçe burada listelenir</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Öğrenci</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Kampanya</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tutar</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ödeme</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Danışman</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Şube</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrelenmis.map((g, i) => (
                    <tr
                      key={g.id}
                      className={`border-b transition-colors hover:bg-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{g.ogrenciAdi}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MessageCircle className="h-3 w-3 text-green-500" />
                            {g.ogrenciTelefon}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{g.kampanyaAdi}</p>
                        <p className="text-xs text-gray-500">{g.egitimTipi}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{formatCurrency(g.genelToplam)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {g.odemeTipi}
                          {g.taksitSayisi && g.taksitSayisi > 1 ? ` (${g.taksitSayisi}x)` : ""}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                            {g.danismanAdi?.[0]}{g.danismanSoyadi?.[0]}
                          </div>
                          <span>{g.danismanAdi} {g.danismanSoyadi}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Building className="h-3 w-3" />
                          {g.subeAdi}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {g.gonderilenAt
                          ? new Date(g.gonderilenAt).toLocaleString("tr-TR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsappIstatistikleri;
