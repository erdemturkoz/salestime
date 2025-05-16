import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface ExcelImportInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportClick?: () => void;
}

export const ExcelImportInfoDialog: React.FC<ExcelImportInfoDialogProps> = ({
  open,
  onOpenChange,
  onImportClick,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Excel Dosyası İçerik Gereksinimleri
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <p className="text-sm text-neutral-600">
            Excel dosyanızda aşağıdaki sütun başlıkları bulunmalıdır. Tüm başlıkları tam olarak belirtilen şekilde yazmanız önemlidir.
          </p>
          
          <div className="bg-neutral-50 p-4 rounded-md">
            <h3 className="font-medium mb-2 text-neutral-800">Gerekli Alanlar:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Kampanya Adı</strong>: Kampanya için kullanılacak kısa isim</li>
              <li><strong>Eğitim Tipi</strong>: Verilecek eğitimin türü (Örn: "Genel İngilizce")</li>
              <li><strong>Kur Sayısı</strong>: Eğitim programındaki kur adedi</li>
              <li><strong>Toplam Ders Saati</strong>: Programın toplam saat cinsinden süresi</li>
              <li><strong>Liste Fiyatı</strong>: İndirimsiz normal fiyat (TL)</li>
              <li><strong>Nakit Fiyatı</strong>: Tek seferde ödemede geçerli indirimli fiyat (TL)</li>
              <li><strong>İndirim Oranı (%)</strong>: Liste fiyatı üzerinden uygulanan indirim yüzdesi</li>
              <li><strong>Faiz Oranı (%)</strong>: Taksitli ödemelerde uygulanacak yıllık faiz oranı</li>
              <li><strong>Kitap Fiyatı</strong>: Eğitim kitaplarının toplam fiyatı (TL)</li>
              <li><strong>Kitap Set Sayısı</strong>: Eğitimde kullanılacak kitap seti adedi</li>
              <li><strong>Maks. Kredi Kartı Taksiti</strong>: İzin verilen maksimum kredi kartı taksit sayısı</li>
              <li><strong>Maks. Senet Taksiti</strong>: İzin verilen maksimum senet taksit sayısı</li>
              <li><strong>Hediyeler</strong>: Kampanya kapsamında verilen hediyeler ve fiyatları. Format: "Hediye Adı (Fiyat TL), Hediye Adı (Fiyat TL)"</li>
            </ul>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-md">
            <h3 className="font-medium mb-2 text-amber-800">Örnek Excel Formatı:</h3>
            <p className="text-sm text-amber-700">
              Excel'e Aktar butonunu kullanarak oluşturacağınız Excel dosyası doğru formatta olacaktır.
              Bu dosyayı şablon olarak kullanabilir, içeriğini düzenleyip tekrar yükleyebilirsiniz.
            </p>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between flex flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => window.open("https://docs.google.com/spreadsheets/d/1u_c6Lngx4i4m3UoSU5QIWujtzyLBjRWpQblDSUMc9hk/edit?usp=sharing", "_blank")}
          >
            Şablon İndir
          </Button>
          <DialogClose asChild>
            <Button type="button" onClick={onImportClick}>
              Dosya Seç
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};