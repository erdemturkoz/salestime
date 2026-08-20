import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, Building2, CheckCircle2, ChevronRight, CirclePause, CircleStop,
  Download, FileSpreadsheet, FileText, Filter, History, Loader2, MessageCircle,
  Copy, Link2, Play, RefreshCw, Search, Send, Unplug, Upload, Users, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { computeOffer } from "@/hooks/useOfferCalculator";
import { defaultFormState, OfferResult } from "@/types/offer-types";
import { generateDualTeklifPDF } from "@/utils/teklif-pdf-generator";
import {
  OdemePlani, TopluTeklifSatiri, odemePlaniniAyikla, topluTeklifExceliniOku, topluTeklifSablonuIndir,
} from "@/utils/toplu-teklif-excel";

type HazirTeklif = TopluTeklifSatiri & { teklif1: OfferResult; teklif2: OfferResult; mesaj: string };
type Sekme = "yeni" | "gecmis";
type Gonderim = any;
type KayitliTeklif = any;

const durumRenkleri: Record<string, string> = {
  hazir: "bg-slate-100 text-slate-700",
  aktif: "bg-blue-100 text-blue-700",
  duraklatildi: "bg-amber-100 text-amber-700",
  durduruldu: "bg-gray-200 text-gray-700",
  tamamlandi: "bg-emerald-100 text-emerald-700",
  bekliyor: "bg-slate-100 text-slate-700",
  islemde: "bg-blue-100 text-blue-700",
  manuel_bekliyor: "bg-violet-100 text-violet-700",
  gonderildi: "bg-emerald-100 text-emerald-700",
  hata: "bg-rose-100 text-rose-700",
};

const durumEtiketi: Record<string, string> = {
  hazir: "Hazır", aktif: "Gönderimde", duraklatildi: "Duraklatıldı", durduruldu: "Durduruldu",
  tamamlandi: "Tamamlandı", bekliyor: "Bekliyor", islemde: "İşleniyor", manuel_bekliyor: "Manuel onay bekliyor", gonderildi: "Gönderildi", hata: "Hata",
};

const eklentiDurumEtiketi: Record<string, string> = {
  bagli_degil: "Bağlı değil",
  kod_bekliyor: "Eşleştirme kodu bekleniyor",
  bagli: "Bağlı",
  iptal_edildi: "İptal edildi",
};

const eklentiDurumRenkleri: Record<string, string> = {
  bagli_degil: "bg-slate-100 text-slate-700",
  kod_bekliyor: "bg-amber-100 text-amber-800",
  bagli: "bg-emerald-100 text-emerald-800",
  iptal_edildi: "bg-gray-200 text-gray-700",
};

function odemeDetayi(odeme: OfferResult): string {
  if (odeme.form.odemeTipi === "nakit") return `${odeme.odemeTipiText} · ${formatCurrency(odeme.ozelFiyat)}`;
  const pesinat = odeme.pesinat > 0 ? `${formatCurrency(odeme.pesinat)} peşinat + ` : "";
  return `${odeme.odemeTipiText} · ${pesinat}${odeme.form.taksitSayisi} × ${formatCurrency(odeme.aylikOdeme)}`;
}

function mesajOlustur(satir: TopluTeklifSatiri, teklif1: OfferResult, teklif2: OfferResult, subeAdi: string, user: any): string {
  const tarih = new Date();
  tarih.setDate(tarih.getDate() + teklif1.form.gecerlilikGunu);
  const gecerlilik = tarih.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const teklifSatiri = (baslik: string, teklif: OfferResult) => [
    `*${baslik}*`, `Eğitim: ${teklif.egitimTipi}`, `Kur: ${teklif.kurSayisi} / ${teklif.dersSaati} Ders Saati`,
    `Toplam: ${formatCurrency(teklif.ozelFiyat)}`, `Ödeme: ${odemeDetayi(teklif)}`,
  ].join("\n");
  return [
    `Merhaba ${satir.adSoyad},`, "",
    `English Time ${subeAdi} olarak mevcut eğitim durumunuza göre iki farklı teklif seçeneği hazırladık.`, "",
    teklifSatiri("1. TEKLİF", teklif1), "", teklifSatiri("2. TEKLİF", teklif2), "",
    `Teklif geçerlilik süresi: ${gecerlilik}`, "",
    `${user?.adi || ""} ${user?.soyadi || ""}`.trim(), "Eğitim Danışmanı", `English Time ${subeAdi}`, user?.telefon || "",
  ].filter((satir) => satir !== "").join("\n");
}

function pdfVerisineDonustur(offer: OfferResult, kayit: KayitliTeklif) {
  const snapshot = (kayit.snapshot as any) || {};
  const kampanya = snapshot.kampanya || {};
  const sube = snapshot.sube || {};
  const pdf = snapshot.pdf || {};
  return {
    kampanyaAdi: offer.kampanyaAdi, egitimTipi: offer.egitimTipi, kurSayisi: offer.kurSayisi, dersSaati: offer.dersSaati,
    listeFiyati: offer.listeFiyati, indirimTutari: offer.indirimTutari, indirimYuzdesi: offer.indirimYuzdesi,
    kampanyaliFiyat: offer.kampanyaliFiyat, genelToplam: offer.genelToplam, ozelFiyat: offer.ozelFiyat,
    nakitFiyati: Number(kampanya.nakitFiyati || 0), odemeTipi: offer.form.odemeTipi, odemeTipiText: offer.odemeTipiText,
    taksitSayisi: offer.form.taksitSayisi, aylikOdeme: offer.aylikOdeme, kitapUcreti: offer.kitapUcreti,
    kitapDahil: offer.form.kitapDahil, kitapHediyeEdildi: offer.kitapHediyeEdildi, hediyeler: offer.hediyeler,
    hediyeEdildi: offer.hediyeEdildi, mudurIndirimTutari: offer.mudurIndirimTutari,
    mudurIndirimTipi: offer.form.mudurIndirimTipi, mudurIndirimDegeri: offer.form.mudurIndirimDegeri,
    ogrenciAdi: kayit.ogrenciAdi, gecerlilikGunu: offer.form.gecerlilikGunu,
    danismanAdi: snapshot.danisman?.adi || "", danismanSoyadi: snapshot.danisman?.soyadi || "",
    danismanTelefon: snapshot.danisman?.telefon || "", subeAdi: sube.subeAdi || "",
    subeAdresi: sube.subeAdresi || "", subeTelefon: sube.subeTelefon || "", pesinat: offer.pesinat, kalanTutar: offer.kalanTutar,
    teklifNo: pdf.teklifNo, teklifTarihi: pdf.teklifTarihi, sonGecerlilikTarihi: pdf.sonGecerlilikTarihi,
  };
}

export default function TopluTekliflerPage() {
  const { user } = useAuth();
  const { kampanyalar, getKampanyalarBySubeId } = useAppContext();
  const { toast } = useToast();
  const roller = ((user as any)?.roller || []) as any[];
  const [aktifSubeId, setAktifSubeId] = useState<number | null>(roller[0]?.subeId || null);
  const [sekme, setSekme] = useState<Sekme>("yeni");
  const [satirlar, setSatirlar] = useState<TopluTeklifSatiri[]>([]);
  const [arama, setArama] = useState("");
  const [durumFiltre, setDurumFiltre] = useState<"hepsi" | TopluTeklifSatiri["durum"]>("hepsi");
  const [secilenId, setSecilenId] = useState<string | null>(null);
  const [onayAcik, setOnayAcik] = useState(false);
  const [detayKaydi, setDetayKaydi] = useState<KayitliTeklif | null>(null);
  const [gecmisArama, setGecmisArama] = useState("");
  const [gecmisDurum, setGecmisDurum] = useState("hepsi");
  const [gecmisBaslangic, setGecmisBaslangic] = useState("");
  const [gecmisBitis, setGecmisBitis] = useState("");
  const [manuelGonderimId, setManuelGonderimId] = useState<number | null>(null);
  const [manuelOnayKaydi, setManuelOnayKaydi] = useState<KayitliTeklif | null>(null);
  const [eslestirmeBaglami, setEslestirmeBaglami] = useState<{ gonderimId: number; subeAdi: string; pairingCode: string; expiresAt: string } | null>(null);
  const yuklenenSubeRef = useRef<number | null>(null);

  const aktifRol = roller.find((rol) => Number(rol.subeId) === Number(aktifSubeId)) || roller[0];
  const subeAdi = aktifRol?.subeAdi || "";

  useEffect(() => {
    if (aktifSubeId && yuklenenSubeRef.current !== aktifSubeId) {
      yuklenenSubeRef.current = aktifSubeId;
      getKampanyalarBySubeId(aktifSubeId);
    }
  }, [aktifSubeId]);

  const hazirTeklifler = useMemo<HazirTeklif[]>(() => satirlar
    .filter((satir) => satir.durum === "hazir" && satir.kampanya && satir.odeme1 && satir.odeme2 && satir.teklifKur)
    .map((satir) => {
      const teklifOlustur = (odeme: OdemePlani, title: string) => computeOffer({
        ...defaultFormState,
        egitimTipi: satir.kampanya.egitimTipi,
        kampanyaId: String(satir.kampanya.id),
        kurSayisi: satir.teklifKur,
        toplamDersSaati: Number(satir.kampanya.toplamDersSaati),
        odemeTipi: odeme.odemeTipi,
        taksitSayisi: odeme.taksitSayisi,
      }, satir.kampanya, { id: `${satir.id}-${title}`, title, isRecommended: title === "Teklif 1" });
      const teklif1 = teklifOlustur(satir.odeme1!, "Teklif 1");
      const teklif2 = teklifOlustur(satir.odeme2!, "Teklif 2");
      return { ...satir, teklif1, teklif2, mesaj: mesajOlustur(satir, teklif1, teklif2, subeAdi, user) };
    }), [satirlar, subeAdi, user]);

  const secilenTeklif = hazirTeklifler.find((teklif) => teklif.id === secilenId) || hazirTeklifler[0];
  const gorunenSatirlar = satirlar.filter((satir) => {
    const metin = `${satir.adSoyad} ${satir.telefon} ${satir.kampanyaAdi}`.toLocaleLowerCase("tr");
    return (!arama || metin.includes(arama.toLocaleLowerCase("tr"))) && (durumFiltre === "hepsi" || satir.durum === durumFiltre);
  });

  const { data: gonderimler = [], isLoading: gecmisYukleniyor } = useQuery<Gonderim[]>({
    queryKey: ["/api/toplu-gonderimler"],
    queryFn: () => apiRequest("/api/toplu-gonderimler"),
    enabled: sekme === "gecmis",
  });
  const { data: gecmis = [] } = useQuery<KayitliTeklif[]>({
    queryKey: ["/api/toplu-teklifler"],
    queryFn: () => apiRequest("/api/toplu-teklifler"),
    enabled: sekme === "gecmis",
  });
  const { data: eklentiDurumlari = {} } = useQuery<Record<string, { durum: string; expiresAt: string | null }>>({
    queryKey: ["/api/toplu-gonderimler/eklenti-durumlari"],
    queryFn: () => apiRequest("/api/toplu-gonderimler/eklenti-durumlari"),
    enabled: sekme === "gecmis",
  });

  const gonderimOlustur = useMutation({
    mutationFn: async () => {
      if (!aktifSubeId) throw new Error("İşlem yapılacak şube seçilmedi.");
      const teklifler = hazirTeklifler.map((teklif) => ({
        ogrenciAdi: teklif.adSoyad, ogrenciTelefon: teklif.telefon, sonEgitim: teklif.sonEgitim, sonKur: teklif.sonKur,
        teklifKur: teklif.teklifKur!, kampanyaId: Number(teklif.kampanya.id),
        odeme1: { odemeTipi: teklif.odeme1!.odemeTipi, taksitSayisi: teklif.odeme1!.taksitSayisi },
        odeme2: { odemeTipi: teklif.odeme2!.odemeTipi, taksitSayisi: teklif.odeme2!.taksitSayisi },
      }));
      return apiRequest("/api/toplu-gonderimler", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baslik: `Toplu teklif · ${new Date().toLocaleDateString("tr-TR")}`, subeId: aktifSubeId, teklifler }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-gonderimler"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-teklifler"] });
      setOnayAcik(false); setSatirlar([]); setSecilenId(null); setSekme("gecmis");
      toast({ title: "Gönderim kuyruğa alındı", description: "Teklif snapshot'ları ve bekleyen gönderimler kalıcı olarak kaydedildi." });
    },
    onError: (error: Error) => toast({ title: "Kuyruk oluşturulamadı", description: error.message, variant: "destructive" }),
  });

  const gonderimDurumu = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) => apiRequest(`/api/toplu-gonderimler/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-gonderimler"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-gonderimler/eklenti-durumlari"] });
    },
    onError: () => toast({ title: "Durum güncellenemedi", variant: "destructive" }),
  });
  const retryMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/toplu-gonderimler/${id}/basarisizlari-tekrar-dene`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-gonderimler"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-teklifler"] });
    },
  });
  const eklentiEslestirme = useMutation({
    mutationFn: (gonderim: Gonderim) => apiRequest(`/api/toplu-gonderimler/${gonderim.id}/eklenti-eslestirme`, { method: "POST" }),
    onSuccess: (sonuc: any, gonderim: Gonderim) => {
      setEslestirmeBaglami({
        gonderimId: gonderim.id,
        subeAdi: gonderim.subeAdi,
        pairingCode: sonuc.pairingCode,
        expiresAt: sonuc.expiresAt,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-gonderimler/eklenti-durumlari"] });
    },
    onError: (error: Error) => toast({ title: "Eşleştirme kodu oluşturulamadı", description: error.message, variant: "destructive" }),
  });
  const eklentiGrantIptal = useMutation({
    mutationFn: (gonderimId: number) => apiRequest(`/api/toplu-gonderimler/${gonderimId}/eklenti-grant`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-gonderimler/eklenti-durumlari"] });
      toast({ title: "Chrome eklentisi erişimi iptal edildi" });
    },
    onError: (error: Error) => toast({ title: "Eklenti erişimi iptal edilemedi", description: error.message, variant: "destructive" }),
  });

  const eslestirmeKodunuKopyala = async () => {
    if (!eslestirmeBaglami) return;
    try {
      await navigator.clipboard.writeText(eslestirmeBaglami.pairingCode);
      toast({ title: "Eşleştirme kodu kopyalandı" });
    } catch {
      toast({ title: "Kod kopyalanamadı", description: "Kodu seçip el ile kopyalayın.", variant: "destructive" });
    }
  };

  const whatsappMesajiAc = async (kayit: KayitliTeklif) => {
    const dahaOnceGonderildi = kayit.durum === "gonderildi";
    const manuelOnayBekliyor = kayit.durum === "manuel_bekliyor";
    const onayMetni = dahaOnceGonderildi
      ? "Bu mesaj daha önce gönderildi. WhatsApp mesajını yeniden açmak istiyor musunuz?"
      : manuelOnayBekliyor
      ? "Bu mesaj için manuel gönderim onayı bekleniyor. WhatsApp mesajını yeniden açmak istiyor musunuz?"
      : "WhatsApp mesajı açılacak. Gönderdikten sonra sonucu ayrıca onaylamanız gerekecek. Devam etmek istiyor musunuz?";
    if (!window.confirm(onayMetni)) return;
    const popup = window.open("", "_blank");
    setManuelGonderimId(kayit.id);
    try {
      const sonuc: any = dahaOnceGonderildi
        ? { teklif: kayit, alreadyFinal: true }
        : await apiRequest(`/api/toplu-teklifler/${kayit.id}/manuel-gonderim`, { method: "POST" });
      const hedef = `https://wa.me/${sonuc.teklif.ogrenciTelefon}?text=${encodeURIComponent(sonuc.teklif.mesaj)}`;
      if (popup) popup.location.href = hedef;
      else window.open(hedef, "_blank");
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-gonderimler"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-teklifler"] });
      if (sonuc.alreadyFinal) {
        toast({ title: "WhatsApp mesajı yeniden açıldı", description: "Mesaj daha önce gönderilmişti." });
      } else {
        setManuelOnayKaydi({ ...kayit, ...sonuc.teklif, durum: "manuel_bekliyor" });
        toast({ title: "Gönderim onayı bekleniyor", description: "WhatsApp'ta gönderimi tamamladıktan sonra buraya dönerek sonucu kaydedin." });
      }
    } catch (error: any) {
      popup?.close();
      toast({ title: "WhatsApp açılamadı", description: error.message || "Gönderim kaydedilemedi.", variant: "destructive" });
    } finally {
      setManuelGonderimId(null);
    }
  };

  const manuelGonderimSonucunuKaydet = async (action: "onayla" | "iptal") => {
    if (!manuelOnayKaydi) return;
    setManuelGonderimId(manuelOnayKaydi.id);
    try {
      await apiRequest(`/api/toplu-teklifler/${manuelOnayKaydi.id}/manuel-gonderim/${action}`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-gonderimler"] });
      queryClient.invalidateQueries({ queryKey: ["/api/toplu-teklifler"] });
      toast({
        title: action === "onayla" ? "Gönderim kayda alındı" : "Teklif yeniden kuyruğa alındı",
        description: action === "onayla" ? "Teklif gönderildi olarak işaretlendi." : "Sağlayıcı kuyruğu bu teklifi yeniden alabilir.",
      });
      setManuelOnayKaydi(null);
    } catch (error: any) {
      toast({ title: "Durum kaydedilemedi", description: error.message || "Lütfen yeniden deneyin.", variant: "destructive" });
    } finally {
      setManuelGonderimId(null);
    }
  };

  const excelYukle = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!aktifSubeId) {
      toast({ title: "Şube seçin", description: "Önce işlem yapılacak şubeyi seçin.", variant: "destructive" });
      event.target.value = "";
      return;
    }
    try {
      const sonuc = await topluTeklifExceliniOku(file, kampanyalar as any[]);
      setSatirlar(sonuc); setSecilenId(null);
      toast({ title: "Excel doğrulandı", description: `${sonuc.length} satır okundu; yalnızca hazır satırlar teklif kapsamına alınacak.` });
    } catch (error: any) {
      toast({ title: "Excel okunamadı", description: error.message || "Dosya biçimini kontrol edin.", variant: "destructive" });
    } finally {
      event.target.value = "";
    }
  };

  const sablonIndir = async () => {
    if (!aktifSubeId) {
      toast({ title: "Şube seçin", description: "Şablonun güncel kampanyalarla oluşması için önce şube seçin.", variant: "destructive" });
      return;
    }
    try {
      // Şablon, ekrandaki olası eski state yerine indirme anındaki şube
      // kampanyalarından oluşur. Backend şube erişimini ayrıca uygular.
      const tazeKampanyalar = await apiRequest(`/api/kampanyalar?subeId=${aktifSubeId}`);
      await topluTeklifSablonuIndir({
        subeAdi,
        kampanyalar: Array.isArray(tazeKampanyalar) ? tazeKampanyalar : [],
      });
    } catch (error: any) {
      toast({ title: "Şablon oluşturulamadı", description: error.message || "Güncel kampanyalar alınamadı.", variant: "destructive" });
    }
  };

  const gecmisFiltreli = gecmis.filter((kayit) => {
    const ara = `${kayit.ogrenciAdi} ${kayit.ogrenciTelefon} ${kayit.kampanyaAdi} ${kayit.egitimTipi}`.toLocaleLowerCase("tr");
    const tarih = kayit.createdAt ? new Date(kayit.createdAt) : null;
    return (!gecmisArama || ara.includes(gecmisArama.toLocaleLowerCase("tr")))
      && (gecmisDurum === "hepsi" || kayit.durum === gecmisDurum)
      && (!gecmisBaslangic || (tarih && tarih >= new Date(gecmisBaslangic)))
      && (!gecmisBitis || (tarih && tarih <= new Date(`${gecmisBitis}T23:59:59`)));
  });

  const snapshotPDF = (kayit: KayitliTeklif) => {
    const snapshot = kayit.snapshot as any;
    if (!snapshot?.teklif1 || !snapshot?.teklif2) {
      toast({ title: "Snapshot eksik", description: "Bu teklifin PDF verisi eksik.", variant: "destructive" });
      return;
    }
    generateDualTeklifPDF(pdfVerisineDonustur(snapshot.teklif1, kayit), pdfVerisineDonustur(snapshot.teklif2, kayit));
  };

  const hazirSayisi = satirlar.filter((s) => s.durum === "hazir").length;
  const duzeltmeliSayisi = satirlar.filter((s) => s.durum === "duzeltmeli").length;
  const mukerrerSayisi = satirlar.filter((s) => s.durum === "mukerrer").length;

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6">
        <div className="mb-6 pl-10 md:pl-0">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F26207] shadow-sm"><Send className="h-5 w-5 text-white" /></div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Toplu Teklifler</h1>
                  <p className="text-sm text-gray-500">Excel’den teklif hazırlayın, doğrulayın ve kalıcı gönderim kuyruğuna alın.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
              <Building2 className="ml-1 h-4 w-4 text-gray-400" />
              {roller.length > 1 ? (
                <select value={aktifSubeId || ""} onChange={(e) => { setAktifSubeId(Number(e.target.value)); setSatirlar([]); }}
                  className="h-8 max-w-[230px] bg-transparent text-sm font-medium outline-none">
                  {roller.map((rol, i) => <option value={rol.subeId} key={`${rol.subeId}-${i}`}>{rol.subeAdi || `Şube #${rol.subeId}`}</option>)}
                </select>
              ) : <span className="pr-2 text-sm font-medium text-gray-700">{subeAdi || "Şube seçilmedi"}</span>}
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-1 border-b border-gray-200">
          <button onClick={() => setSekme("yeni")} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${sekme === "yeni" ? "border-b-2 border-[#F26207] text-[#C95004]" : "text-gray-500 hover:text-gray-900"}`}>
            <Upload className="h-4 w-4" /> Yeni Gönderim
          </button>
          <button onClick={() => setSekme("gecmis")} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${sekme === "gecmis" ? "border-b-2 border-[#F26207] text-[#C95004]" : "text-gray-500 hover:text-gray-900"}`}>
            <History className="h-4 w-4" /> Teklif Geçmişi
          </button>
        </div>

        {sekme === "yeni" ? (
          <>
            <div className="mb-5 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#F26207]"><FileSpreadsheet className="h-5 w-5" /></div>
                    <div><h2 className="font-semibold text-gray-900">Standart Excel şablonu</h2><p className="mt-1 max-w-xl text-sm text-gray-500">İstenen sütunlar ilk sayfada, Türkçe kullanım kılavuzu ikinci sayfada bulunur.</p></div>
                  </div>
                  <Button variant="outline" className="border-gray-200" onClick={sablonIndir}><Download className="mr-2 h-4 w-4" /> Şablonu İndir</Button>
                </CardContent>
              </Card>
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-[#F26207]/40 bg-white p-5 text-center shadow-sm transition hover:border-[#F26207] hover:bg-orange-50/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F26207] text-white"><Upload className="h-4 w-4" /></div>
                 <div className="text-left"><p className="text-sm font-semibold text-gray-900">Excel dosyası yükle</p><p className="text-xs text-gray-500">Yalnızca güvenli .xlsx · fiyat bilgisi gerekmez</p></div>
                 <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={excelYukle} className="hidden" />
              </label>
            </div>

            {satirlar.length === 0 ? (
              <Card className="border-gray-200 shadow-sm"><CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100"><Users className="h-7 w-7 text-gray-400" /></div>
                <h2 className="font-semibold text-gray-900">Gönderim listenizi hazırlayın</h2><p className="mt-2 max-w-md text-sm text-gray-500">Şablonu indirip aday bilgilerini ekleyin. Dosya yüklendiğinde telefon, kampanya, kur ve ödeme biçimleri satır bazında denetlenecek.</p>
              </CardContent></Card>
            ) : (
              <>
                <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    ["Toplam", satirlar.length, "bg-white text-gray-900", FileSpreadsheet],
                    ["Hazır", hazirSayisi, "bg-emerald-50 text-emerald-800", CheckCircle2],
                    ["Düzeltilmeli", duzeltmeliSayisi, "bg-amber-50 text-amber-800", AlertTriangle],
                    ["Mükerrer", mukerrerSayisi, "bg-rose-50 text-rose-800", XCircle],
                  ].map(([ad, sayi, renk, Icon]: any) => <Card key={ad} className={`border-0 shadow-sm ${renk}`}><CardContent className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 opacity-70" /><div><p className="text-xs font-medium opacity-75">{ad}</p><p className="text-2xl font-bold">{sayi}</p></div></CardContent></Card>)}
                </div>

                <Card className="mb-5 border-gray-200 shadow-sm">
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
                      <div><h2 className="font-semibold text-gray-900">Doğrulama sonuçları</h2><p className="text-xs text-gray-500">Hatalı ve mükerrer satırlar otomatik olarak kapsam dışında bırakılır.</p></div>
                      <div className="flex gap-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><Input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Ara..." className="h-9 w-full pl-8 sm:w-52" /></div>
                        <select value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value as any)} className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"><option value="hepsi">Tüm durumlar</option><option value="hazir">Hazır</option><option value="duzeltmeli">Düzeltilmeli</option><option value="mukerrer">Mükerrer</option></select>
                      </div>
                    </div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="px-4 py-3">Satır</th><th className="px-4 py-3">Aday</th><th className="px-4 py-3">Kampanya / Kur</th><th className="px-4 py-3">Ödeme alternatifleri</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3">Açıklama</th></tr></thead>
                      <tbody>{gorunenSatirlar.map((satir) => <tr key={satir.id} className="border-t border-gray-100 align-top hover:bg-gray-50/60"><td className="px-4 py-3 text-xs text-gray-400">#{satir.sira}</td><td className="px-4 py-3"><p className="font-medium text-gray-900">{satir.adSoyad || "—"}</p><p className="text-xs text-gray-500">{satir.telefon || "Telefon yok"}</p></td><td className="px-4 py-3"><p>{satir.kampanyaAdi || "—"}</p><p className="text-xs text-gray-500">{satir.teklifKur ? `${satir.teklifKur} Kur` : "Kur geçersiz"}</p></td><td className="px-4 py-3 text-xs text-gray-600">{satir.odeme1Raw || "—"}<br />{satir.odeme2Raw || "—"}</td><td className="px-4 py-3"><Badge className={durumRenkleri[satir.durum]} variant="secondary">{satir.durum === "hazir" ? "Hazır" : satir.durum === "mukerrer" ? "Mükerrer" : "Düzeltilmeli"}</Badge></td><td className="max-w-xs px-4 py-3 text-xs text-gray-500">{satir.hatalar.length ? <><p className="text-rose-600">{satir.hatalar[0]}</p><p className="mt-1">{satir.beklenen[0]}</p></> : "Teklif üretimine hazır."}</td></tr>)}</tbody></table></div>
                  </CardContent>
                </Card>

                {hazirTeklifler.length > 0 && (
                  <Card className="border-gray-200 shadow-sm"><CardContent className="p-0">
                    <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between"><div><h2 className="font-semibold text-gray-900">Teklif önizleme</h2><p className="text-xs text-gray-500">Öğrenciyi seçin; iki alternatif ve kişiselleştirilmiş WhatsApp mesajını kontrol edin.</p></div><Button className="bg-[#F26207] hover:bg-[#D95205]" onClick={() => setOnayAcik(true)}><Send className="mr-2 h-4 w-4" /> {hazirTeklifler.length} teklifi kuyruğa al</Button></div>
                    <div className="grid min-h-[500px] lg:grid-cols-[300px_1fr]">
                      <div className="border-b border-gray-100 bg-gray-50/50 p-3 lg:border-b-0 lg:border-r"><div className="mb-3 flex items-center justify-between text-xs font-medium text-gray-500"><span>HAZIR ADAYLAR</span><span>{hazirTeklifler.length}</span></div><div className="max-h-[520px] space-y-1 overflow-y-auto">{hazirTeklifler.map((teklif) => <button onClick={() => setSecilenId(teklif.id)} key={teklif.id} className={`w-full rounded-lg p-3 text-left transition ${secilenTeklif?.id === teklif.id ? "bg-white shadow-sm ring-1 ring-[#F26207]/30" : "hover:bg-white"}`}><p className="text-sm font-semibold text-gray-900">{teklif.adSoyad}</p><p className="mt-0.5 text-xs text-gray-500">{teklif.kampanyaAdi} · {teklif.teklifKur} Kur</p></button>)}</div></div>
                      {secilenTeklif && <div className="p-5"><div className="mb-5 flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-bold text-gray-900">{secilenTeklif.adSoyad}</h3><p className="text-sm text-gray-500">{secilenTeklif.sonEgitim} · Son kur: {secilenTeklif.sonKur} · {secilenTeklif.telefon}</p></div><Badge variant="outline">{secilenTeklif.kampanyaAdi}</Badge></div>
                        <div className="mb-5 grid gap-4 md:grid-cols-2">{[secilenTeklif.teklif1, secilenTeklif.teklif2].map((offer, i) => <div key={offer.id} className={`rounded-xl border p-4 ${i === 0 ? "border-[#F26207]/30 bg-orange-50/40" : "border-blue-200 bg-blue-50/40"}`}><p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{i + 1}. alternatif</p><p className="text-sm font-semibold text-gray-900">{offer.odemeTipiText}</p><p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(offer.ozelFiyat)}</p><p className="mt-1 text-sm text-gray-600">{odemeDetayi(offer)}</p><p className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500">{offer.kurSayisi} Kur · {offer.dersSaati} ders saati · {offer.indirimYuzdesi}% kampanya avantajı</p></div>)}</div>
                        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-800"><MessageCircle className="h-4 w-4" /> WhatsApp mesajı</div><pre className="max-h-52 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-6 text-gray-700">{secilenTeklif.mesaj}</pre></div>
                      </div>}
                    </div>
                  </CardContent></Card>
                )}
              </>
            )}
          </>
        ) : (
          <div className="space-y-5">
            <Card className="border-gray-200 shadow-sm"><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
              <div className="flex-1"><Label className="mb-1 block text-xs">Ara</Label><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><Input className="pl-8" placeholder="Aday, telefon, kampanya veya eğitim..." value={gecmisArama} onChange={(e) => setGecmisArama(e.target.value)} /></div></div>
              <div><Label className="mb-1 block text-xs">Durum</Label><select className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm" value={gecmisDurum} onChange={(e) => setGecmisDurum(e.target.value)}><option value="hepsi">Tüm durumlar</option><option value="bekliyor">Bekliyor</option><option value="gonderildi">Gönderildi</option><option value="hata">Hata</option></select></div>
              <div><Label className="mb-1 block text-xs">Başlangıç</Label><Input type="date" value={gecmisBaslangic} onChange={(e) => setGecmisBaslangic(e.target.value)} /></div><div><Label className="mb-1 block text-xs">Bitiş</Label><Input type="date" value={gecmisBitis} onChange={(e) => setGecmisBitis(e.target.value)} /></div>
            </CardContent></Card>

            <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
              <Card className="border-gray-200 shadow-sm"><CardContent className="p-0"><div className="border-b border-gray-100 p-4"><h2 className="font-semibold">Gönderim kuyrukları</h2><p className="text-xs text-gray-500">Duraklatın, sürdürün veya başarısız kayıtları yeniden kuyruğa alın.</p></div>
                <div className="max-h-[620px] divide-y overflow-y-auto">
                  {gecmisYukleniyor ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-400" /></div>
                    : gonderimler.length === 0 ? <div className="p-10 text-center text-sm text-gray-500">Henüz toplu gönderim yok.</div>
                    : gonderimler.map((g) => {
                      const eklentiBaglantisi = eklentiDurumlari[String(g.id)] || { durum: "bagli_degil", expiresAt: null };
                      const baglanabilir = ["hazir", "aktif", "duraklatildi"].includes(g.durum);
                      return <div className="p-4" key={g.id}>
                        <div className="flex items-start justify-between gap-2">
                          <div><p className="font-medium text-gray-900">{g.baslik}</p><p className="mt-0.5 text-xs text-gray-500">{g.subeAdi} · {g.danismanAdi} {g.danismanSoyadi}</p></div>
                          <Badge className={durumRenkleri[g.durum]} variant="secondary">{durumEtiketi[g.durum] || g.durum}</Badge>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-emerald-500" style={{ width: `${g.toplam ? ((g.gonderildi + g.hata) / g.toplam) * 100 : 0}%` }} /></div>
                        <div className="mt-2 flex gap-3 text-xs text-gray-500"><span>{g.toplam} kişi</span><span className="text-emerald-700">{g.gonderildi} başarılı</span><span className="text-rose-600">{g.hata} hata</span></div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge className={eklentiDurumRenkleri[eklentiBaglantisi.durum]} variant="secondary">{eklentiDurumEtiketi[eklentiBaglantisi.durum]}</Badge>
                          {baglanabilir && <Button size="sm" variant="outline" disabled={eklentiEslestirme.isPending} onClick={() => eklentiEslestirme.mutate(g)}><Link2 className="mr-1 h-3.5 w-3.5" /> Chrome Eklentisini Bağla</Button>}
                          {["bagli", "kod_bekliyor"].includes(eklentiBaglantisi.durum) && <Button size="sm" variant="ghost" className="text-rose-700" disabled={eklentiGrantIptal.isPending} onClick={() => eklentiGrantIptal.mutate(g.id)}><Unplug className="mr-1 h-3.5 w-3.5" /> Eklentiyi iptal et</Button>}
                          {["hazir", "duraklatildi", "durduruldu"].includes(g.durum) && <Button size="sm" variant="outline" onClick={() => gonderimDurumu.mutate({ id: g.id, action: "baslat" })}><Play className="mr-1 h-3.5 w-3.5" /> Başlat</Button>}
                          {g.durum === "aktif" && <><Button size="sm" variant="outline" onClick={() => gonderimDurumu.mutate({ id: g.id, action: "duraklat" })}><CirclePause className="mr-1 h-3.5 w-3.5" /> Duraklat</Button><Button size="sm" variant="outline" className="text-rose-700" onClick={() => gonderimDurumu.mutate({ id: g.id, action: "durdur" })}><CircleStop className="mr-1 h-3.5 w-3.5" /> Durdur</Button></>}
                          {g.hata > 0 && <Button size="sm" variant="ghost" onClick={() => retryMutation.mutate(g.id)}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Başarısızları dene</Button>}
                        </div>
                      </div>;
                    })}
                </div>
              </CardContent></Card>
              <Card className="border-gray-200 shadow-sm"><CardContent className="p-0"><div className="flex items-center justify-between border-b border-gray-100 p-4"><div><h2 className="font-semibold">Teklif geçmişi</h2><p className="text-xs text-gray-500">{gecmisFiltreli.length} kayıt bulundu</p></div><Filter className="h-4 w-4 text-gray-400" /></div><div className="overflow-x-auto"><table className="w-full min-w-[690px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="px-4 py-3">Aday</th><th className="px-4 py-3">Kampanya</th><th className="px-4 py-3">Teklif</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3"></th></tr></thead><tbody>{gecmisFiltreli.map((kayit) => <tr key={kayit.id} className="border-t border-gray-100 hover:bg-gray-50"><td className="px-4 py-3"><p className="font-medium">{kayit.ogrenciAdi}</p><p className="text-xs text-gray-500">{kayit.ogrenciTelefon}</p></td><td className="px-4 py-3"><p>{kayit.kampanyaAdi}</p><p className="text-xs text-gray-500">{kayit.egitimTipi} · {kayit.teklifKur} Kur</p></td><td className="px-4 py-3 text-xs text-gray-600">{kayit.odeme1}<br />{kayit.odeme2}</td><td className="px-4 py-3"><Badge className={durumRenkleri[kayit.durum]} variant="secondary">{durumEtiketi[kayit.durum] || kayit.durum}</Badge></td><td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => setDetayKaydi(kayit)}>Detay <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></td></tr>)}</tbody></table></div></CardContent></Card>
            </div>
          </div>
        )}
      </div>

      <Dialog open={onayAcik} onOpenChange={setOnayAcik}><DialogContent><DialogHeader><DialogTitle>Gönderim kuyruğunu onaylayın</DialogTitle><DialogDescription>Bu işlem hazır tekliflerin fiyat ve kampanya snapshot’ını kalıcı olarak saklar. Harici sağlayıcı kuyruktan kayıtları alarak gönderimi gerçekleştirir.</DialogDescription></DialogHeader><div className="rounded-xl bg-gray-50 p-4 text-sm"><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-gray-500">Kişi / teklif</p><p className="font-bold">{hazirTeklifler.length}</p></div><div><p className="text-xs text-gray-500">Şube</p><p className="font-bold">{subeAdi}</p></div><div><p className="text-xs text-gray-500">Danışman</p><p className="font-bold">{(user as any)?.adi} {(user as any)?.soyadi}</p></div><div><p className="text-xs text-gray-500">Gönderim kanalı</p><p className="font-bold">Sağlayıcı kuyruğu</p></div></div></div><DialogFooter><Button variant="outline" onClick={() => setOnayAcik(false)}>Vazgeç</Button><Button className="bg-[#F26207] hover:bg-[#D95205]" disabled={gonderimOlustur.isPending} onClick={() => gonderimOlustur.mutate()}>{gonderimOlustur.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Onayla ve kuyruğa al</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!eslestirmeBaglami} onOpenChange={(open) => !open && setEslestirmeBaglami(null)}>
        {eslestirmeBaglami && <DialogContent>
          <DialogHeader>
            <DialogTitle>Chrome eklentisini bağlayın</DialogTitle>
            <DialogDescription>
              Bu kod yalnızca {eslestirmeBaglami.subeAdi} şubesindeki seçili gönderim için geçerlidir. SalesTime oturumunuz veya JWT’niz eklentiye aktarılmaz.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Tek kullanımlık eşleştirme kodu</p>
            <code className="mt-2 block break-all rounded-lg bg-white p-3 text-sm font-bold text-gray-900">{eslestirmeBaglami.pairingCode}</code>
            <p className="mt-3 text-xs text-amber-900">Bu kod {new Date(eslestirmeBaglami.expiresAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} saatine kadar geçerlidir. Eklentiye yalnızca bu kodu verin.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEslestirmeBaglami(null)}>Kapat</Button>
            <Button className="bg-[#F26207] hover:bg-[#D95205]" onClick={eslestirmeKodunuKopyala}><Copy className="mr-2 h-4 w-4" /> Kodu kopyala</Button>
          </DialogFooter>
        </DialogContent>}
      </Dialog>
      <Dialog open={!!manuelOnayKaydi} onOpenChange={() => undefined}>{manuelOnayKaydi && <DialogContent onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}><DialogHeader><DialogTitle>WhatsApp gönderimini onaylayın</DialogTitle><DialogDescription>WhatsApp penceresinden mesajı gerçekten gönderdiyseniz kaydı tamamlayın. Göndermediyseniz teklif otomatik sağlayıcı kuyruğuna geri döner.</DialogDescription></DialogHeader><div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900"><p className="font-semibold">{manuelOnayKaydi.ogrenciAdi}</p><p className="mt-1">Bu kayıt, onay verilene kadar “Manuel onay bekliyor” durumunda tutulur ve otomatik olarak tekrar gönderilmez.</p></div><DialogFooter><Button variant="outline" disabled={manuelGonderimId === manuelOnayKaydi.id} onClick={() => manuelGonderimSonucunuKaydet("iptal")}>Göndermedim, kuyruğa geri al</Button><Button className="bg-green-600 hover:bg-green-700" disabled={manuelGonderimId === manuelOnayKaydi.id} onClick={() => manuelGonderimSonucunuKaydet("onayla")}>{manuelGonderimId === manuelOnayKaydi.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gönderildi olarak işaretle</Button></DialogFooter></DialogContent>}</Dialog>
      <Dialog open={!!detayKaydi} onOpenChange={(open) => !open && setDetayKaydi(null)}>{detayKaydi && <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{detayKaydi.ogrenciAdi} · teklif snapshot’ı</DialogTitle><DialogDescription>{detayKaydi.kampanyaAdi} · {detayKaydi.createdAt ? new Date(detayKaydi.createdAt).toLocaleString("tr-TR") : ""}</DialogDescription></DialogHeader><div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-orange-50 p-4"><p className="text-xs font-bold text-orange-700">1. ALTERNATİF</p><p className="mt-2 font-semibold">{detayKaydi.odeme1}</p><p className="mt-1 text-sm text-gray-600">{detayKaydi.odeme1Detay}</p></div><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-bold text-blue-700">2. ALTERNATİF</p><p className="mt-2 font-semibold">{detayKaydi.odeme2}</p><p className="mt-1 text-sm text-gray-600">{detayKaydi.odeme2Detay}</p></div></div><div className="max-h-48 overflow-y-auto rounded-xl border border-green-100 bg-green-50/50 p-4"><p className="mb-2 text-xs font-bold text-green-800">KAYITLI WHATSAPP MESAJI</p><pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{detayKaydi.mesaj}</pre></div><DialogFooter><Button variant="outline" onClick={() => snapshotPDF(detayKaydi)}><FileText className="mr-2 h-4 w-4" /> Snapshot PDF</Button><Button disabled={manuelGonderimId === detayKaydi.id} className="bg-green-600 hover:bg-green-700" onClick={() => whatsappMesajiAc(detayKaydi)}>{manuelGonderimId === detayKaydi.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />} WhatsApp’ta aç</Button></DialogFooter></DialogContent>}</Dialog>
    </div>
  );
}