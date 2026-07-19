import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Calculator } from "lucide-react";
import { OfferFormState, defaultFormState, OdemeTipi } from "@/types/offer-types";
import { getTaksitOptions } from "@/hooks/useOfferCalculator";
import type { EgitimTipi } from "@shared/schema";

interface KampanyaData {
  id: string | number;
  kampanyaAdi: string;
  egitimTipi: string;
  kurSayisi: number;
  toplamDersSaati: number;
  listeFiyati: number;
  nakitFiyati: number;
  faizOrani: number;
  kitapFiyati: number;
  kitapSetSayisi?: number;
  maxKrediKartiTaksit: number;
  maxSenetTaksit: number;
  hediyeler: Array<{ isim: string; fiyat: number }>;
}

interface OfferBuilderPanelProps {
  egitimTipleri: EgitimTipi[];
  kampanyalar: KampanyaData[];
  initialValues?: Partial<OfferFormState> | null;
  isEditing?: boolean;
  submitLabel?: string;
  offerCount: number;
  onSubmit: (form: OfferFormState, kampanya: KampanyaData) => void;
}

export default function OfferBuilderPanel({
  egitimTipleri,
  kampanyalar,
  initialValues,
  isEditing,
  submitLabel,
  offerCount,
  onSubmit,
}: OfferBuilderPanelProps) {
  const [form, setForm] = useState<OfferFormState>({ ...defaultFormState, ...initialValues });
  const [mudurAcik, setMudurAcik] = useState(false);
  const [validationError, setValidationError] = useState<string>("");

  useEffect(() => {
    if (initialValues) {
      setForm({ ...defaultFormState, ...initialValues });
      setMudurAcik((initialValues.mudurIndirimDegeri ?? 0) > 0);
    }
  }, [initialValues]);

  const selectedKampanya = kampanyalar.find(
    (k) => String(k.id) === String(form.kampanyaId)
  ) ?? null;

  // Auto-fill kur/ders when campaign changes
  useEffect(() => {
    if (selectedKampanya) {
      setForm((prev) => ({
        ...prev,
        kurSayisi: selectedKampanya.kurSayisi,
        toplamDersSaati: selectedKampanya.toplamDersSaati,
      }));
    }
  }, [form.kampanyaId]);

  const taksitOptions = selectedKampanya
    ? getTaksitOptions(form.odemeTipi, selectedKampanya)
    : [];

  const handleOdemeTipi = (tip: OdemeTipi) => {
    setForm((prev) => {
      const opts = selectedKampanya ? getTaksitOptions(tip, selectedKampanya) : [];
      const defaultTaksit =
        tip === "nakit" ? 1 : opts.length > 0 ? opts[0] : 1;
      return { ...prev, odemeTipi: tip, taksitSayisi: defaultTaksit, pesinat: 0 };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!form.egitimTipi) {
      setValidationError("Eğitim tipi seçiniz.");
      return;
    }
    if (!form.kampanyaId || !selectedKampanya) {
      setValidationError("Kampanya seçiniz.");
      return;
    }
    if (!form.odemeTipi) {
      setValidationError("Ödeme tipini seçiniz.");
      return;
    }
    if (form.odemeTipi !== "nakit" && !form.taksitSayisi) {
      setValidationError("Taksit sayısını seçiniz.");
      return;
    }

    onSubmit(form, selectedKampanya);
  };

  const set = <K extends keyof OfferFormState>(key: K, val: OfferFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const filteredKampanyalar = kampanyalar.filter(
    (k) => !form.egitimTipi || k.egitimTipi === form.egitimTipi
  );

  const label = submitLabel ?? (isEditing ? "Teklifi Güncelle" : offerCount === 0 ? "Teklifi Oluştur" : "Teklif 2'yi Oluştur");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        {isEditing ? "Teklifi Düzenle" : offerCount === 0 ? "Yeni Teklif" : "Alternatif Teklif"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* --- Eğitim Seçimi --- */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Eğitim Seçimi</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">Eğitim Tipi</Label>
              <Select
                value={form.egitimTipi}
                onValueChange={(v) => {
                  set("egitimTipi", v);
                  set("kampanyaId", "");
                  set("kurSayisi", null);
                  set("toplamDersSaati", null);
                }}
              >
                <SelectTrigger className="h-9 text-sm border-gray-200">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {egitimTipleri.map((t) => (
                    <SelectItem key={t.id} value={t.egitimTipi}>
                      {t.egitimTipi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">Kampanya</Label>
              <Select
                value={String(form.kampanyaId)}
                onValueChange={(v) => set("kampanyaId", v)}
                disabled={!form.egitimTipi}
              >
                <SelectTrigger className="h-9 text-sm border-gray-200">
                  <SelectValue placeholder="Kampanya seçin" />
                </SelectTrigger>
                <SelectContent>
                  {filteredKampanyalar.map((k) => (
                    <SelectItem key={k.id} value={String(k.id)}>
                      {k.kampanyaAdi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedKampanya && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-700">Kur Sayısı</Label>
                  <Input
                    value={selectedKampanya.kurSayisi}
                    disabled
                    className="h-9 text-sm bg-gray-50 border-gray-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-700">Ders Saati</Label>
                  <Input
                    value={selectedKampanya.toplamDersSaati}
                    disabled
                    className="h-9 text-sm bg-gray-50 border-gray-200"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* --- Ödeme Planı --- */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ödeme Planı</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">Ödeme Tipi</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["nakit", "kredi-karti", "senet"] as OdemeTipi[]).map((tip) => {
                  const labels: Record<string, string> = {
                    nakit: "Nakit",
                    "kredi-karti": "Kredi Kartı",
                    senet: "Senet",
                  };
                  return (
                    <button
                      key={tip}
                      type="button"
                      onClick={() => handleOdemeTipi(tip)}
                      disabled={!selectedKampanya}
                      className={`py-2 px-2 rounded-lg text-sm font-medium border transition-all ${
                        form.odemeTipi === tip
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40"
                      }`}
                    >
                      {labels[tip as string]}
                    </button>
                  );
                })}
              </div>
            </div>

            {form.odemeTipi !== "nakit" && form.odemeTipi !== "" && (
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">Taksit Sayısı</Label>
                <Select
                  value={String(form.taksitSayisi)}
                  onValueChange={(v) => set("taksitSayisi", parseInt(v))}
                  disabled={!selectedKampanya}
                >
                  <SelectTrigger className="h-9 text-sm border-gray-200">
                    <SelectValue placeholder="Taksit seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {taksitOptions.map((t) => (
                      <SelectItem key={t} value={String(t)}>
                        {t === 1 ? "Tek Çekim" : `${t} Taksit`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.odemeTipi !== "nakit" && form.odemeTipi !== "" && form.taksitSayisi > 1 && (
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">
                  Peşinat <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.pesinat || ""}
                    onChange={(e) => set("pesinat", parseFloat(e.target.value) || 0)}
                    className="h-9 text-sm border-gray-200 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">TL</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* --- Ek Avantajlar --- */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ek Avantajlar</p>
          <div className="flex items-center gap-2">
            <Checkbox
              id="kitap-dahil"
              checked={form.kitapDahil}
              onCheckedChange={(v) => set("kitapDahil", !!v)}
            />
            <Label htmlFor="kitap-dahil" className="text-sm text-gray-700 cursor-pointer">
              Kitap seti dahil
              {selectedKampanya && selectedKampanya.kitapFiyati > 0 && (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({(selectedKampanya.kitapFiyati * (selectedKampanya.kitapSetSayisi || 1)).toLocaleString("tr-TR")} TL)
                </span>
              )}
            </Label>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* --- İndirim ve Onay --- */}
        <div>
          <button
            type="button"
            onClick={() => setMudurAcik((v) => !v)}
            className="flex items-center justify-between w-full"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Müdür İnisiyatifi
            </p>
            <span className="text-gray-400">
              {mudurAcik ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {mudurAcik && (
            <div className="mt-3 space-y-2">
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">İndirim Oranı (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0"
                    value={form.mudurIndirimDegeri || ""}
                    onChange={(e) =>
                      set("mudurIndirimDegeri", parseFloat(e.target.value) || 0)
                    }
                    className="h-9 text-sm border-gray-200 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">0–100 arasında yüzde girin. Genel toplamdan düşülür.</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Geçerlilik + Öğrenci Adı */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-700">Geçerlilik Süresi</Label>
            <Select
              value={String(form.gecerlilikGunu)}
              onValueChange={(v) => set("gecerlilikGunu", parseInt(v))}
            >
              <SelectTrigger className="h-9 text-sm border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 7].map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    {g} Gün
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {validationError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {validationError}
          </p>
        )}

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10">
          <Calculator className="w-4 h-4 mr-2" />
          {label}
        </Button>
      </form>
    </div>
  );
}
