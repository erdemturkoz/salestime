import { Button } from "@/components/ui/button";
import { MessageCircle, FileText, Trash2 } from "lucide-react";
import { OfferResult } from "@/types/offer-types";

interface OfferActionBarProps {
  offers: OfferResult[];
  onWhatsapp: () => void;
  onPDF: () => void;
  onClear: () => void;
  isPending?: boolean;
}

export default function OfferActionBar({
  offers,
  onWhatsapp,
  onPDF,
  onClear,
  isPending,
}: OfferActionBarProps) {
  if (offers.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-gray-200">
      <Button
        variant="outline"
        size="sm"
        className="text-gray-500 border-gray-200 hover:text-red-600 hover:border-red-200"
        onClick={onClear}
      >
        <Trash2 className="h-4 w-4 mr-1.5" />
        Teklifleri Temizle
      </Button>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-gray-200 text-gray-700 hover:bg-gray-50"
          onClick={onPDF}
        >
          <FileText className="h-4 w-4 mr-1.5" />
          Teklif PDF
        </Button>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={onWhatsapp}
          disabled={isPending}
        >
          <MessageCircle className="h-4 w-4 mr-1.5" />
          WhatsApp Gönder
        </Button>
      </div>
    </div>
  );
}
