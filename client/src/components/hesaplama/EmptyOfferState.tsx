import { FileText } from "lucide-react";

export default function EmptyOfferState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[320px] py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 border border-blue-100">
        <FileText className="w-8 h-8 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Öğrenciye özel teklifinizi hazırlayın
      </h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
        Eğitim ve ödeme seçeneklerini belirlediğinizde teklif özeti burada görünecek.
      </p>
    </div>
  );
}
