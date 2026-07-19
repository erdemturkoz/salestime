import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { OfferResult } from "@/types/offer-types";
import { Star, Pencil, Trash2, Gift, BookOpen, CheckCircle2 } from "lucide-react";

interface OfferSummaryCardProps {
  offer: OfferResult;
  onEdit: () => void;
  onDelete: () => void;
  onToggleRecommended: () => void;
  onToggleGift: (type: "kitap" | string) => void;
  showDelete?: boolean;
}

export default function OfferSummaryCard({
  offer,
  onEdit,
  onDelete,
  onToggleRecommended,
  onToggleGift,
  showDelete = true,
}: OfferSummaryCardProps) {
  const hasMudurIndirim = offer.mudurIndirimTutari > 0;
  const displayFiyat = hasMudurIndirim ? offer.ozelFiyat : offer.genelToplam;
  const hasPesinat = offer.pesinat > 0;
  const isTaksitli = offer.form.odemeTipi !== "nakit" && offer.form.taksitSayisi > 1;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white shadow-sm transition-all ${
        offer.isRecommended
          ? "border-blue-400 ring-2 ring-blue-100 shadow-blue-50"
          : "border-gray-200"
      }`}
    >
      {/* Recommended badge */}
      {offer.isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
            <Star className="w-3 h-3 fill-white" />
            ÖNERİLEN
          </span>
        </div>
      )}

      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-t-2xl border-b ${
          offer.isRecommended ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"
        }`}
      >
        <div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {offer.title}
          </span>
          {offer.customName && (
            <p className="text-sm font-semibold text-gray-700 mt-0.5">{offer.customName}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className={`h-7 w-7 rounded-lg ${offer.isRecommended ? "text-blue-600" : "text-gray-400 hover:text-blue-500"}`}
            onClick={onToggleRecommended}
            title="Önerilen olarak işaretle"
          >
            <Star className={`h-4 w-4 ${offer.isRecommended ? "fill-blue-600" : ""}`} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-lg text-gray-400 hover:text-gray-700"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {showDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg text-gray-400 hover:text-red-500"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Campaign + main info */}
        <div>
          <h3 className="text-base font-bold text-gray-900">{offer.kampanyaAdi}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{offer.egitimTipi}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-100">
              {offer.kurSayisi} Kur
            </Badge>
            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
              {offer.dersSaati} Saat
            </Badge>
            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
              {offer.odemeTipiText || "—"}
            </Badge>
            {isTaksitli && (
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                {offer.form.taksitSayisi} Taksit
              </Badge>
            )}
          </div>
        </div>

        {/* Price rows */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Liste Fiyatı</span>
            <span className="line-through">{formatCurrency(offer.listeFiyati)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Kampanya İndirimi</span>
            <span className="text-green-600 font-medium">
              -{formatCurrency(offer.indirimTutari)}
              {offer.indirimYuzdesi > 0 && (
                <span className="ml-1 text-xs text-green-500">({offer.indirimYuzdesi}%)</span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Kampanyalı Fiyat</span>
            <span className="font-semibold text-gray-800">
              {formatCurrency(offer.kampanyaliFiyat)}
            </span>
          </div>

          {offer.kitapUcreti > 0 && offer.form.kitapDahil && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-600">Kitap Seti</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${offer.kitapHediyeEdildi ? "line-through text-gray-400" : "text-gray-600"}`}>
                  {formatCurrency(offer.kitapUcreti)}
                </span>
                <button
                  onClick={() => onToggleGift("kitap")}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                    offer.kitapHediyeEdildi
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:border-emerald-200 hover:text-emerald-600"
                  }`}
                >
                  <Gift className="w-3 h-3" />
                  {offer.kitapHediyeEdildi ? "Hediye" : "Hediye Et"}
                </button>
              </div>
            </div>
          )}

          {offer.hediyeler.map((h) => (
            <div key={h.isim} className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-600">{h.isim}</span>
              </div>
              <div className="flex items-center gap-2">
                {h.fiyat > 0 && (
                  <span className={`text-xs ${offer.hediyeEdildi[h.isim] ? "line-through text-gray-400" : "text-gray-600"}`}>
                    {formatCurrency(h.fiyat)}
                  </span>
                )}
                <button
                  onClick={() => onToggleGift(h.isim)}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                    offer.hediyeEdildi[h.isim]
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:border-emerald-200 hover:text-emerald-600"
                  }`}
                >
                  <Gift className="w-3 h-3" />
                  {offer.hediyeEdildi[h.isim] ? "Hediye" : "Hediye Et"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-200" />

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Genel Toplam</span>
            <span className="font-medium text-gray-800">{formatCurrency(offer.genelToplam)}</span>
          </div>

          {hasMudurIndirim && (
            <div className="flex justify-between text-gray-600">
              <span>Müdür İndirimi ({offer.form.mudurIndirimDegeri}%)</span>
              <span className="text-orange-600 font-medium">
                -{formatCurrency(offer.mudurIndirimTutari)}
              </span>
            </div>
          )}

          {hasPesinat && (
            <div className="flex justify-between text-gray-600">
              <span>Peşinat</span>
              <span className="font-medium">{formatCurrency(offer.pesinat)}</span>
            </div>
          )}
        </div>

        {/* Big total */}
        <div
          className={`rounded-xl px-4 py-3 ${
            hasMudurIndirim
              ? "bg-amber-50 border border-amber-200"
              : "bg-blue-50 border border-blue-100"
          }`}
        >
          {hasMudurIndirim ? (
            <div className="text-center">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Kişiye Özel Fiyat</p>
              <p className="text-2xl font-bold text-amber-900">{formatCurrency(displayFiyat)}</p>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-blue-800">Toplam Tutar</span>
              <span className="text-xl font-bold text-blue-900">{formatCurrency(displayFiyat)}</span>
            </div>
          )}
        </div>

        {/* Monthly payment */}
        {isTaksitli && (
          <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-green-700 font-medium">
                {hasPesinat
                  ? `${formatCurrency(offer.pesinat)} peşinat + ${offer.form.taksitSayisi} taksit`
                  : `${offer.form.taksitSayisi} Eşit Taksit`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-800">{formatCurrency(offer.aylikOdeme)}</p>
              <p className="text-xs text-green-600">/ ay</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
