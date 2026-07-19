import { formatCurrency } from "@/lib/utils";
import { OfferResult } from "@/types/offer-types";
import OfferSummaryCard from "./OfferSummaryCard";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface OfferComparisonProps {
  offers: OfferResult[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleRecommended: (id: string) => void;
  onToggleGift: (id: string, type: string) => void;
}

function diffBadge(val: number, suffix = "") {
  if (val === 0) return <span className="text-gray-400 flex items-center gap-1"><Minus className="w-3 h-3" />—</span>;
  if (val > 0)
    return (
      <span className="text-red-500 flex items-center gap-1 font-medium text-xs">
        <TrendingUp className="w-3 h-3" />+{formatCurrency(val)}{suffix}
      </span>
    );
  return (
    <span className="text-green-600 flex items-center gap-1 font-medium text-xs">
      <TrendingDown className="w-3 h-3" />{formatCurrency(val)}{suffix}
    </span>
  );
}

export default function OfferComparison({
  offers,
  onEdit,
  onDelete,
  onToggleRecommended,
  onToggleGift,
}: OfferComparisonProps) {
  if (offers.length === 0) return null;

  const [o1, o2] = offers;

  const dinamikAvantajCumlesi = () => {
    if (!o1 || !o2) return "";
    const fiyatFark = o2.ozelFiyat - o1.ozelFiyat;
    const kurFark = o2.kurSayisi - o1.kurSayisi;
    const saatFark = o2.dersSaati - o1.dersSaati;
    const kurBasinaO1 = o1.kurSayisi > 0 ? o1.ozelFiyat / o1.kurSayisi : 0;
    const kurBasinaO2 = o2.kurSayisi > 0 ? o2.ozelFiyat / o2.kurSayisi : 0;

    const parts: string[] = [];

    if (fiyatFark > 0 && (kurFark > 0 || saatFark > 0)) {
      const kazanim: string[] = [];
      if (kurFark > 0) kazanim.push(`${kurFark} ek kur`);
      if (saatFark > 0) kazanim.push(`${saatFark} ek ders saati`);
      parts.push(`Teklif 2 ile ${formatCurrency(fiyatFark)} daha fazla ödeyerek ${kazanim.join(" ve ")} kazanılır.`);
    } else if (fiyatFark < 0) {
      parts.push(`Teklif 2, Teklif 1'den ${formatCurrency(Math.abs(fiyatFark))} daha uygun.`);
    }

    if (kurBasinaO1 > 0 && kurBasinaO2 > 0) {
      const daha = kurBasinaO1 < kurBasinaO2 ? "1" : "2";
      const oran = Math.abs(((kurBasinaO2 - kurBasinaO1) / kurBasinaO1) * 100).toFixed(0);
      parts.push(`Kur başına maliyet olarak Teklif ${daha} %${oran} daha avantajlı.`);
    }

    return parts.join(" ");
  };

  // Single offer — just show the card
  if (offers.length === 1) {
    return (
      <div className="max-w-sm mx-auto">
        <OfferSummaryCard
          offer={o1}
          onEdit={() => onEdit(o1.id)}
          onDelete={() => onDelete(o1.id)}
          onToggleRecommended={() => onToggleRecommended(o1.id)}
          onToggleGift={(type) => onToggleGift(o1.id, type)}
          showDelete={false}
        />
      </div>
    );
  }

  // Two offers — side by side comparison
  const avantaj = dinamikAvantajCumlesi();

  return (
    <div className="space-y-4">
      {/* Cards side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <OfferSummaryCard
          offer={o1}
          onEdit={() => onEdit(o1.id)}
          onDelete={() => onDelete(o1.id)}
          onToggleRecommended={() => onToggleRecommended(o1.id)}
          onToggleGift={(type) => onToggleGift(o1.id, type)}
          showDelete={true}
        />
        <OfferSummaryCard
          offer={o2}
          onEdit={() => onEdit(o2.id)}
          onDelete={() => onDelete(o2.id)}
          onToggleRecommended={() => onToggleRecommended(o2.id)}
          onToggleGift={(type) => onToggleGift(o2.id, type)}
          showDelete={true}
        />
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700">Karşılaştırma</h4>
        </div>
        <div className="divide-y divide-gray-100 text-sm">
          {[
            {
              label: "Eğitim",
              v1: o1.egitimTipi,
              v2: o2.egitimTipi,
              diff: null,
            },
            {
              label: "Kampanya",
              v1: o1.kampanyaAdi,
              v2: o2.kampanyaAdi,
              diff: null,
            },
            {
              label: "Kur Sayısı",
              v1: `${o1.kurSayisi} Kur`,
              v2: `${o2.kurSayisi} Kur`,
              diff: o2.kurSayisi - o1.kurSayisi,
              diffIsMoney: false,
            },
            {
              label: "Ders Saati",
              v1: `${o1.dersSaati} Saat`,
              v2: `${o2.dersSaati} Saat`,
              diff: o2.dersSaati - o1.dersSaati,
              diffIsMoney: false,
            },
            {
              label: "Toplam Tutar",
              v1: formatCurrency(o1.ozelFiyat),
              v2: formatCurrency(o2.ozelFiyat),
              diff: o2.ozelFiyat - o1.ozelFiyat,
              diffIsMoney: true,
            },
            {
              label: "Peşinat",
              v1: o1.pesinat > 0 ? formatCurrency(o1.pesinat) : "—",
              v2: o2.pesinat > 0 ? formatCurrency(o2.pesinat) : "—",
              diff: null,
            },
            {
              label: "Aylık Ödeme",
              v1: o1.form.odemeTipi === "nakit" ? "Tek ödeme" : formatCurrency(o1.aylikOdeme),
              v2: o2.form.odemeTipi === "nakit" ? "Tek ödeme" : formatCurrency(o2.aylikOdeme),
              diff:
                o1.form.odemeTipi !== "nakit" && o2.form.odemeTipi !== "nakit"
                  ? o2.aylikOdeme - o1.aylikOdeme
                  : null,
              diffIsMoney: true,
            },
            {
              label: "Ödeme Tipi",
              v1: o1.odemeTipiText || "—",
              v2: o2.odemeTipiText || "—",
              diff: null,
            },
            {
              label: "Taksit",
              v1: o1.form.taksitSayisi > 1 ? `${o1.form.taksitSayisi} Taksit` : "Tek çekim",
              v2: o2.form.taksitSayisi > 1 ? `${o2.form.taksitSayisi} Taksit` : "Tek çekim",
              diff: null,
            },
            {
              label: "Kur Başı Maliyet",
              v1: o1.kurSayisi > 0 ? formatCurrency(Math.round(o1.ozelFiyat / o1.kurSayisi)) : "—",
              v2: o2.kurSayisi > 0 ? formatCurrency(Math.round(o2.ozelFiyat / o2.kurSayisi)) : "—",
              diff:
                o1.kurSayisi > 0 && o2.kurSayisi > 0
                  ? Math.round(o2.ozelFiyat / o2.kurSayisi) - Math.round(o1.ozelFiyat / o1.kurSayisi)
                  : null,
              diffIsMoney: true,
            },
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr] items-center px-4 py-2.5">
              <span className="text-gray-500 text-xs">{row.label}</span>
              <span className="text-gray-800 font-medium text-xs text-center">{row.v1}</span>
              <div className="text-center">
                <span className="text-gray-800 font-medium text-xs block">{row.v2}</span>
                {row.diff !== null && (
                  <span className="block mt-0.5">
                    {row.diffIsMoney
                      ? diffBadge(row.diff as number)
                      : (row.diff as number) !== 0 && (
                          <span
                            className={`text-xs font-medium ${(row.diff as number) > 0 ? "text-blue-600" : "text-red-500"}`}
                          >
                            {(row.diff as number) > 0 ? "+" : ""}{row.diff}
                          </span>
                        )}
                  </span>
                )}
              </div>
            </div>
          ))}
          {/* Header row */}
          <div className="grid grid-cols-[1fr_1fr_1fr] items-center px-4 py-2 bg-gray-50/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>Kriter</span>
            <span className="text-center">Teklif 1</span>
            <span className="text-center">Teklif 2</span>
          </div>
        </div>
      </div>

      {/* Insight */}
      {avantaj && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-sm text-blue-800 leading-relaxed">{avantaj}</p>
        </div>
      )}
    </div>
  );
}
