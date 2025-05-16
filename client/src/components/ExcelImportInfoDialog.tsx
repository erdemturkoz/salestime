import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
          <DialogDescription className="text-center text-sm text-neutral-600">
            Lütfen aşağıdaki bilgileri dikkatlice okuyun
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <p className="text-sm text-neutral-600">
            Excel dosyanızda aşağıdaki sütun başlıkları bulunmalıdır. Tüm başlıkları tam olarak belirtilen şekilde yazmanız önemlidir.
          </p>
          
          <div className="bg-neutral-50 p-4 rounded-md">
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>kampanyaAdi</li>
              <li>egitimTipi</li>
              <li>kurSayisi</li>
              <li>toplamDersSaati</li>
              <li>listeFiyati</li> 
              <li>nakitFiyati</li>
              <li>indirimOrani</li>
              <li>faizOrani</li>
              <li>kitapFiyati</li>
              <li>kitapSetSayisi</li>
              <li>maxKrediKartiTaksit</li>
              <li>maxSenetTaksit</li>
              <li>hediyeler (JSON formatında dizi)</li>
            </ul>
          </div>
          
          <p className="text-sm text-neutral-600">
            Sayısal değerler için tam sayı veya ondalık sayı kullanabilirsiniz. Fiyatlar TL cinsinden olmalıdır. İndirim ve faiz oranlarını yüzde olarak belirtin (örn: 15 → %15).
          </p>
          
          <div className="bg-yellow-50 p-4 rounded-md text-sm text-yellow-800">
            <span className="font-bold">Not:</span> Excel dosyasında yer alan kampanyalar, mevcut seçili şubeye eklenecektir. 
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={onImportClick}>
            İçe Aktarmaya Başla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};