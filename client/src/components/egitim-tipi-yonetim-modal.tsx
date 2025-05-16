import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon, PlusIcon, TrashIcon, XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEgitimTipleri } from "@/hooks/use-egitim-tipleri";
import { insertEgitimTipiSchema, type InsertEgitimTipi } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EgitimTipiYonetimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EgitimTipiYonetimModal({ open, onOpenChange }: EgitimTipiYonetimModalProps) {
  const { toast } = useToast();
  const {
    egitimTipleri,
    isLoading,
    createEgitimTipi,
    updateEgitimTipi,
    deleteEgitimTipi,
  } = useEgitimTipleri();

  const [editId, setEditId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  
  const form = useForm<InsertEgitimTipi>({
    resolver: zodResolver(insertEgitimTipiSchema),
    defaultValues: {
      egitimTipi: "",
    },
  });
  
  // Formu sıfırla
  const resetForm = () => {
    form.reset({ egitimTipi: "" });
    setEditId(null);
  };
  
  // Düzenleme moduna geç
  const handleEdit = (id: number, egitimTipi: string) => {
    setEditId(id);
    form.setValue("egitimTipi", egitimTipi);
  };
  
  // Silme onayı modalını aç
  const handleDeleteConfirm = (id: number) => {
    setDeleteItemId(id);
    setDeleteConfirmOpen(true);
  };
  
  // Form gönderildi
  const onSubmit = (data: InsertEgitimTipi) => {
    if (editId) {
      // Güncelleme
      updateEgitimTipi.mutate(
        { id: editId, data },
        {
          onSuccess: () => {
            toast({
              title: "Eğitim tipi güncellendi",
              description: "Eğitim tipi başarıyla güncellendi.",
            });
            resetForm();
          },
          onError: (error) => {
            toast({
              title: "Hata",
              description: "Eğitim tipi güncellenirken bir hata oluştu: " + String(error),
              variant: "destructive",
            });
          },
        }
      );
    } else {
      // Yeni kayıt
      createEgitimTipi.mutate(data, {
        onSuccess: () => {
          toast({
            title: "Eğitim tipi eklendi",
            description: "Yeni eğitim tipi başarıyla eklendi.",
          });
          resetForm();
        },
        onError: (error) => {
          toast({
            title: "Hata",
            description: "Eğitim tipi eklenirken bir hata oluştu: " + String(error),
            variant: "destructive",
          });
        },
      });
    }
  };
  
  // Silme işlemi
  const handleDelete = () => {
    if (deleteItemId) {
      deleteEgitimTipi.mutate(deleteItemId, {
        onSuccess: () => {
          toast({
            title: "Eğitim tipi silindi",
            description: "Eğitim tipi başarıyla silindi.",
          });
          setDeleteConfirmOpen(false);
          setDeleteItemId(null);
        },
        onError: (error) => {
          toast({
            title: "Hata",
            description: "Eğitim tipi silinirken bir hata oluştu: " + String(error),
            variant: "destructive",
          });
        },
      });
    }
  };
  
  // Modal kapatılıyor
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Eğitim Tipleri Yönetimi</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Ekleme/Düzenleme Formu */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="egitimTipi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eğitim Tipi</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input placeholder="Eğitim tipini giriniz" {...field} />
                        </FormControl>
                        <Button 
                          type="submit" 
                          disabled={createEgitimTipi.isPending || updateEgitimTipi.isPending}
                        >
                          {(createEgitimTipi.isPending || updateEgitimTipi.isPending) ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <PlusIcon className={cn("h-4 w-4 mr-1", editId ? "hidden" : "block")} />
                          )}
                          {editId ? "Güncelle" : "Ekle"}
                        </Button>
                        {editId && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={resetForm}
                          >
                            <XIcon className="h-4 w-4 mr-1" />
                            İptal
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            {/* Eğitim Tipleri Listesi */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Eğitim Tipi</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : egitimTipleri.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                        Henüz hiç eğitim tipi bulunmuyor
                      </TableCell>
                    </TableRow>
                  ) : (
                    egitimTipleri.map((tip) => (
                      <TableRow key={tip.id}>
                        <TableCell className="font-medium">{tip.id}</TableCell>
                        <TableCell>{tip.egitimTipi}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(tip.id, tip.egitimTipi)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteConfirm(tip.id)}
                            >
                              <TrashIcon className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Silme Onayı Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eğitim Tipini Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu eğitim tipini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve 
              mevcut kampanyalarda kullanılıyorsa sorunlara yol açabilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEgitimTipi.isPending}
            >
              {deleteEgitimTipi.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}