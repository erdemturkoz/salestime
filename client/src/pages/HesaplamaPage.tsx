import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { EgitimTipi } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Plus } from "lucide-react";

import { OfferFormState, OfferResult, defaultFormState } from "@/types/offer-types";
import { computeOffer } from "@/hooks/useOfferCalculator";
import OfferBuilderPanel from "@/components/hesaplama/OfferBuilderPanel";
import EmptyOfferState from "@/components/hesaplama/EmptyOfferState";
import OfferComparison from "@/components/hesaplama/OfferComparison";
import OfferActionBar from "@/components/hesaplama/OfferActionBar";
import { generateTeklifPDF, generateDualTeklifPDF } from "@/utils/teklif-pdf-generator";

const HesaplamaPage = () => {
  const { kampanyalar, getKampanyalarBySubeId } = useAppContext();
  const { toast } = useToast();
  const { user } = useAuth();

  // Kurucu gibi çok şubeli kullanıcılar için — kampanyalar boşsa birincil şubeden yükle
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (!autoLoadedRef.current && kampanyalar.length === 0 && user) {
      const roller = (user as any).roller;
      if (roller && roller.length > 0) {
        const firstSubeId = roller[0]?.subeId;
        if (firstSubeId) {
          autoLoadedRef.current = true;
          getKampanyalarBySubeId(firstSubeId);
        }
      }
    }
  }, [user, kampanyalar.length, getKampanyalarBySubeId]);

  // Eğitim tiplerini veritabanından çek
  const { data: egitimTipleri = [] } = useQuery<EgitimTipi[]>({
    queryKey: ["/api/egitim-tipleri"],
  });

  // --- Ana State ---
  const [offers, setOffers] = useState<OfferResult[]>([]);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [builderInitialValues, setBuilderInitialValues] = useState<Partial<OfferFormState> | null>(null);
  const [isAddingAlternative, setIsAddingAlternative] = useState(false);
  const [ogrenciAdi, setOgrenciAdi] = useState("");

  // WhatsApp modal state
  const [wpModalAcik, setWpModalAcik] = useState(false);
  const [wpOgrenciAdi, setWpOgrenciAdi] = useState("");
  const [wpTelefon, setWpTelefon] = useState("");

  const roller = (user as any)?.roller;
  const ilkRol = roller?.[0];
  const subeAdi = ilkRol?.subeAdi || "";

  // --- WhatsApp mutation (mevcut API korundu) ---
  const wpGonderimMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/whatsapp-gonderimleri", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onError: () => {
      toast({
        title: "Kayıt hatası",
        description: "Teklif istatistiklere kaydedilemedi. Gönderim yine de WhatsApp'ta tamamlandı.",
        variant: "destructive",
      });
    },
  });

  // --- Teklif oluştur/güncelle ---
  const handleOfferSubmit = (form: OfferFormState, kampanya: any) => {
    if (editingOfferId) {
      // Mevcut teklifi güncelle
      setOffers((prev) =>
        prev.map((o) => {
          if (o.id !== editingOfferId) return o;
          return computeOffer(form, kampanya, {
            id: o.id,
            title: o.title,
            customName: o.customName,
            isRecommended: o.isRecommended,
            kitapHediyeEdildi: false,
            hediyeEdildi: {},
          });
        })
      );
      setEditingOfferId(null);
      setBuilderInitialValues(null);
      setIsAddingAlternative(false);
      toast({ title: "Teklif güncellendi", description: "Değişiklikler uygulandı." });
    } else if (isAddingAlternative) {
      // İkinci teklif ekle
      const id2 = `offer-${Date.now()}`;
      const newOffer = computeOffer(form, kampanya, {
        id: id2,
        title: "Teklif 2",
        customName: "",
        isRecommended: false,
        kitapHediyeEdildi: false,
        hediyeEdildi: {},
      });
      setOffers((prev) => [...prev.slice(0, 1), newOffer]);
      setIsAddingAlternative(false);
      setBuilderInitialValues(null);
      toast({ title: "Alternatif teklif oluşturuldu", description: "İki teklif karşılaştırma modunda." });
    } else {
      // İlk teklif
      const id1 = `offer-${Date.now()}`;
      const newOffer = computeOffer(form, kampanya, {
        id: id1,
        title: "Teklif 1",
        customName: "",
        isRecommended: false,
        kitapHediyeEdildi: false,
        hediyeEdildi: {},
      });
      setOffers([newOffer]);
      toast({ title: "Teklif oluşturuldu", description: `${kampanya.kampanyaAdi} teklifi hazır.` });
    }
  };

  // --- Alternatif teklif ekle ---
  const handleAddAlternative = () => {
    if (offers.length === 0) return;
    const base = offers[0];
    setBuilderInitialValues({ ...base.form });
    setIsAddingAlternative(true);
    setEditingOfferId(null);
  };

  // --- Teklif düzenle ---
  const handleEditOffer = (id: string) => {
    const offer = offers.find((o) => o.id === id);
    if (!offer) return;
    setBuilderInitialValues({ ...offer.form });
    setEditingOfferId(id);
    setIsAddingAlternative(false);
  };

  // --- Teklif sil ---
  const handleDeleteOffer = (id: string) => {
    setOffers((prev) => {
      const next = prev.filter((o) => o.id !== id);
      // Tek teklif kaldıysa title'ı Teklif 1 yap
      if (next.length === 1) {
        return [{ ...next[0], title: "Teklif 1" }];
      }
      return next;
    });
    if (editingOfferId === id) {
      setEditingOfferId(null);
      setBuilderInitialValues(null);
    }
    setIsAddingAlternative(false);
  };

  // --- Önerilen toggle ---
  const handleToggleRecommended = (id: string) => {
    setOffers((prev) =>
      prev.map((o) => ({ ...o, isRecommended: o.id === id ? !o.isRecommended : false }))
    );
  };

  // --- Hediye toggle ---
  const handleToggleGift = (offerId: string, type: string) => {
    setOffers((prev) =>
      prev.map((o) => {
        if (o.id !== offerId) return o;
        const isKitap = type === "kitap";
        const newKitapHediye = isKitap ? !o.kitapHediyeEdildi : o.kitapHediyeEdildi;
        const newHediyeEdildi = isKitap
          ? o.hediyeEdildi
          : { ...o.hediyeEdildi, [type]: !o.hediyeEdildi[type] };

        // Kampanya bul ve yeniden hesapla
        const kampanya = kampanyalar.find((k) => String(k.id) === String(o.form.kampanyaId));
        if (!kampanya) return o;

        return computeOffer(o.form, kampanya, {
          id: o.id,
          title: o.title,
          customName: o.customName,
          isRecommended: o.isRecommended,
          kitapHediyeEdildi: newKitapHediye,
          hediyeEdildi: newHediyeEdildi,
        });
      })
    );
  };

  // --- Temizle ---
  const handleClear = () => {
    setOffers([]);
    setEditingOfferId(null);
    setBuilderInitialValues(null);
    setIsAddingAlternative(false);
  };

  // --- WhatsApp Gönder ---
  const handleWhatsappGonder = () => {
    if (!wpTelefon.trim()) {
      toast({ title: "Hata", description: "Telefon numarası zorunludur.", variant: "destructive" });
      return;
    }
    if (!wpOgrenciAdi.trim()) {
      toast({ title: "Hata", description: "Öğrenci adı soyadı zorunludur.", variant: "destructive" });
      return;
    }

    const temizTelefon = wpTelefon.replace(/\D/g, "");

    const gecerlilikTarihi = (gecGun: number) => {
      const d = new Date();
      d.setDate(d.getDate() + gecGun);
      return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    const teklifSatiri = (o: OfferResult, sira: string) => {
      const odemeSatiri =
        o.form.odemeTipi === "nakit"
          ? "Nakit"
          : o.pesinat > 0
          ? `${formatCurrency(o.pesinat)} peşinat + ${o.form.taksitSayisi} × ${formatCurrency(o.aylikOdeme)}`
          : `${o.form.taksitSayisi} eşit taksit × ${formatCurrency(o.aylikOdeme)}`;

      const recommended = o.isRecommended ? " — ÖNERİLEN" : "";
      return [
        `*${sira}${recommended}*`,
        `Eğitim: ${o.egitimTipi}`,
        `Kur: ${o.kurSayisi} / ${o.dersSaati} Ders Saati`,
        `Toplam: ${formatCurrency(o.ozelFiyat)}`,
        `Ödeme: ${odemeSatiri}`,
      ].join("\n");
    };

    let mesaj: string;
    const birincilOffer = offers[0];

    if (offers.length >= 2) {
      const tarih = gecerlilikTarihi(birincilOffer.form.gecerlilikGunu);
      mesaj = [
        `Merhaba ${wpOgrenciAdi},`,
        ``,
        `English Time ${subeAdi} olarak eğitim hedeflerinize göre iki farklı teklif seçeneği hazırladık.`,
        ``,
        teklifSatiri(offers[0], "1. EKONOMİK SEÇENEK"),
        ``,
        teklifSatiri(offers[1], "2. AVANTAJLI SEÇENEK"),
        ``,
        `Teklif geçerlilik süresi: ${tarih}`,
        ``,
        `${(user as any)?.adi || ""} ${(user as any)?.soyadi || ""}`,
        `Eğitim Danışmanı`,
        `English Time ${subeAdi}`,
        (user as any)?.telefon || "",
      ]
        .filter((l) => l !== null)
        .join("\n");
    } else if (birincilOffer) {
      const o = birincilOffer;
      const tarih = gecerlilikTarihi(o.form.gecerlilikGunu);
      const odemeSatiri =
        o.form.odemeTipi === "nakit"
          ? "Nakit"
          : `${o.form.taksitSayisi} eşit taksit × ${formatCurrency(o.aylikOdeme)}`;

      const kurMatch = o.kampanyaAdi?.match(/^(\d+)\+(\d+)\s*kur/i);
      const satinAlinanKur = kurMatch ? parseInt(kurMatch[1]) : o.kurSayisi;
      const hediyeKur = kurMatch ? parseInt(kurMatch[2]) : 0;
      const hediyeIsimleri = (o.hediyeler || []).map((h) => h.isim).filter(Boolean).join(", ");
      const kazanimParcalari: string[] = [];
      if (hediyeKur > 0) kazanimParcalari.push(`${hediyeKur} Kur eğitim`);
      if (hediyeIsimleri) kazanimParcalari.push(hediyeIsimleri);
      const kazanimlar = kazanimParcalari.join(", ");
      let kampanyaSatiri = `*${o.kampanyaAdi}*`;
      if (hediyeKur > 0) {
        const ek = hediyeIsimleri ? ` ve ${hediyeIsimleri}` : "";
        kampanyaSatiri = `*${satinAlinanKur} Kur alın, ${hediyeKur} Kur${ek} hediyemiz olsun.*`;
      }

      mesaj = [
        `Merhaba ${wpOgrenciAdi},`,
        ``,
        `English Time ${subeAdi} olarak size özel hazırladığımız eğitim teklifini bilgilerinize sunuyoruz.`,
        ``,
        kampanyaSatiri,
        ``,
        `Eğitim: ${o.egitimTipi}`,
        `Toplam: ${o.kurSayisi} Kur / ${o.dersSaati} Ders Saati`,
        ``,
        `Liste Fiyatı: ${formatCurrency(o.listeFiyati)}`,
        `*Size Özel Fiyat: ${formatCurrency(o.ozelFiyat)}*`,
        ``,
        `Ödeme: ${odemeSatiri}`,
        ``,
        kazanimlar || o.indirimTutari > 0
          ? `*Kazanımlarınız:* ${kazanimlar}${kazanimlar && o.indirimTutari > 0 ? " ve " : ""}${o.indirimTutari > 0 ? formatCurrency(o.indirimTutari) + " indirim" : ""}.`
          : null,
        ``,
        `Teklifiniz ${tarih} saat 17:00'e kadar geçerlidir.`,
        ``,
        `${(user as any)?.adi || ""} ${(user as any)?.soyadi || ""}`,
        `Eğitim Danışmanı`,
        `English Time ${subeAdi}`,
        (user as any)?.telefon || "",
      ]
        .filter((l) => l !== null)
        .join("\n");
    } else {
      return;
    }

    // istatistik kaydı — birincil / önerilen teklifi kaydet
    const kayitOffer = offers.find((o) => o.isRecommended) || birincilOffer;
    if (kayitOffer) {
      const odemeTipiLabel =
        kayitOffer.form.odemeTipi === "nakit"
          ? "Nakit"
          : kayitOffer.form.odemeTipi === "kredi-karti"
          ? "Kredi Kartı"
          : "Senet";
      wpGonderimMutation.mutate({
        ogrenciAdi: wpOgrenciAdi,
        ogrenciTelefon: temizTelefon,
        kampanyaAdi: kayitOffer.kampanyaAdi,
        egitimTipi: kayitOffer.egitimTipi,
        genelToplam: kayitOffer.ozelFiyat,
        odemeTipi: odemeTipiLabel,
        taksitSayisi: kayitOffer.form.taksitSayisi,
        danismanAdi: (user as any)?.adi || "",
        danismanSoyadi: (user as any)?.soyadi || "",
        subeAdi,
        subeId: ilkRol?.subeId || null,
        danismanId: (user as any)?.id || null,
      });
    }

    const waUrl = `https://wa.me/${temizTelefon}?text=${encodeURIComponent(mesaj)}`;
    window.open(waUrl, "_blank");
    setWpModalAcik(false);
    setWpTelefon("");
    toast({ title: "WhatsApp açıldı", description: "Mesaj hazırlandı." });
  };

  // --- PDF Oluştur ---
  const handleGeneratePDF = () => {
    try {
      if (offers.length === 0) return;

      const toPdfData = (o: OfferResult) => ({
        kampanyaAdi: o.kampanyaAdi,
        egitimTipi: o.egitimTipi,
        kurSayisi: o.kurSayisi,
        dersSaati: o.dersSaati,
        listeFiyati: o.listeFiyati,
        indirimTutari: o.indirimTutari,
        indirimYuzdesi: o.indirimYuzdesi,
        kampanyaliFiyat: o.kampanyaliFiyat,
        genelToplam: o.genelToplam,
        ozelFiyat: o.ozelFiyat,
        nakitFiyati: (() => {
          const kmp = kampanyalar.find((k) => String(k.id) === String(o.form.kampanyaId));
          return kmp ? kmp.nakitFiyati : 0;
        })(),
        odemeTipi: o.form.odemeTipi,
        odemeTipiText: o.odemeTipiText,
        taksitSayisi: o.form.taksitSayisi,
        aylikOdeme: o.aylikOdeme,
        kitapUcreti: o.kitapUcreti,
        kitapDahil: o.form.kitapDahil,
        kitapHediyeEdildi: o.kitapHediyeEdildi,
        hediyeler: o.hediyeler,
        hediyeEdildi: o.hediyeEdildi,
        mudurIndirimTutari: o.mudurIndirimTutari,
        mudurIndirimTipi: o.form.mudurIndirimTipi,
        mudurIndirimDegeri: o.form.mudurIndirimDegeri,
        ogrenciAdi,
        gecerlilikGunu: o.form.gecerlilikGunu,
        danismanAdi: (user as any)?.adi || "",
        danismanSoyadi: (user as any)?.soyadi || "",
        danismanTelefon: (user as any)?.telefon || "",
        subeAdi,
        subeAdresi: "",
        subeTelefon: "",
        isRecommended: o.isRecommended,
        pesinat: o.pesinat,
        kalanTutar: o.kalanTutar,
      });

      if (offers.length >= 2) {
        generateDualTeklifPDF(toPdfData(offers[0]), toPdfData(offers[1]));
      } else {
        generateTeklifPDF(toPdfData(offers[0]));
      }

      toast({ title: "PDF oluşturuldu", description: "Belge hazırlandı." });
    } catch (err) {
      console.error("PDF hatası:", err);
      toast({ title: "Hata", description: "PDF oluşturulurken hata oluştu.", variant: "destructive" });
    }
  };

  // Builder'ın hangi teklif için gösterileceğini belirle
  const isBuilderEditing = !!editingOfferId;
  const showAlternativeButton =
    offers.length === 1 && !isAddingAlternative && !editingOfferId;
  const showBuilder = offers.length === 0 || isBuilderEditing || isAddingAlternative;

  const builderSubmitLabel = isBuilderEditing
    ? "Teklifi Güncelle"
    : isAddingAlternative
    ? "Teklif 2'yi Oluştur"
    : "Teklifi Oluştur";

  return (
    <div className="h-full w-full bg-[#F6F7F9] min-h-screen">
      <div className="w-full px-4 md:px-6 py-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6 pl-10 md:pl-0">
          <h1 className="text-xl font-bold text-gray-900">Ücret Hesaplama</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Öğrenciye özel teklif hazırlayın ve WhatsApp / PDF ile paylaşın.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* ── Sol Panel: Teklif Oluşturucu ── */}
          <div className="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 space-y-4">
            {/* Öğrenci adı */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <Label className="text-sm text-gray-700 mb-1.5 block">
                Öğrenci Adı Soyadı{" "}
                <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
              </Label>
              <Input
                placeholder="Örn: Ahmet Yılmaz"
                value={ogrenciAdi}
                onChange={(e) => setOgrenciAdi(e.target.value)}
                className="h-9 text-sm border-gray-200"
              />
            </div>

            {/* Teklif oluşturucu form */}
            {showBuilder ? (
              <OfferBuilderPanel
                egitimTipleri={egitimTipleri}
                kampanyalar={kampanyalar as any}
                initialValues={builderInitialValues}
                isEditing={isBuilderEditing}
                submitLabel={builderSubmitLabel}
                offerCount={offers.length}
                onSubmit={handleOfferSubmit}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center text-sm text-gray-500 space-y-3">
                <p className="font-medium text-gray-700">Teklifler hazır</p>
                <p>Bir teklifi düzenlemek için kart üzerindeki kalem simgesine tıklayın.</p>
                {showAlternativeButton && (
                  <Button
                    className="w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 mt-2"
                    variant="outline"
                    onClick={handleAddAlternative}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Alternatif Teklif Ekle
                  </Button>
                )}
              </div>
            )}

            {/* Alternatif teklif butonu (builder gösteriliyorken de) */}
            {showBuilder && showAlternativeButton && (
              <Button
                className="w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                variant="outline"
                onClick={handleAddAlternative}
              >
                <Plus className="w-4 h-4 mr-2" />
                Alternatif Teklif Ekle
              </Button>
            )}

            {isAddingAlternative && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setIsAddingAlternative(false);
                  setBuilderInitialValues(null);
                }}
              >
                İptal
              </Button>
            )}

            {isBuilderEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setEditingOfferId(null);
                  setBuilderInitialValues(null);
                }}
              >
                İptal
              </Button>
            )}
          </div>

          {/* ── Sağ Alan: Teklif Görünümü ── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              {offers.length === 0 ? (
                <EmptyOfferState />
              ) : (
                <OfferComparison
                  offers={offers}
                  onEdit={handleEditOffer}
                  onDelete={handleDeleteOffer}
                  onToggleRecommended={handleToggleRecommended}
                  onToggleGift={handleToggleGift}
                />
              )}

              {/* Aksiyon çubuğu */}
              <OfferActionBar
                offers={offers}
                onWhatsapp={() => {
                  setWpOgrenciAdi(ogrenciAdi || "");
                  setWpModalAcik(true);
                }}
                onPDF={handleGeneratePDF}
                onClear={handleClear}
                isPending={wpGonderimMutation.isPending}
              />
            </div>
          </div>
        </div>
      </div>

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
            {offers.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                <strong>
                  {offers.length === 1
                    ? `${offers[0].kampanyaAdi} — ${formatCurrency(offers[0].ozelFiyat)}`
                    : `${offers.length} alternatif teklif gönderilecek`}
                </strong>
              </div>
            )}
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
                placeholder="905321234567"
                value={wpTelefon}
                onChange={(e) => setWpTelefon(e.target.value)}
              />
              <p className="text-xs text-gray-400">Uluslararası format: 905xxxxxxxxx</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWpModalAcik(false)}>
              İptal
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={handleWhatsappGonder}
              disabled={wpGonderimMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HesaplamaPage;
