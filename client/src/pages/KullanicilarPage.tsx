import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Edit, Trash, UserPlus, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

// Şube tipini tanımlayalım
type Sube = {
  id: number;
  subeAdi: string;
  subeAdresi?: string;
  subeTelefon?: string;
  kullanicilar?: Array<{
    kullaniciId: number;
    kullaniciAdi: string;
    kullaniciSoyadi: string;
    rol: string;
  }>;
};

// Rol tipini tanımlayalım
type Rol = "Kurucu" | "Müdür" | "Satış Danışmanı";

// Kullanıcı-Şube ilişkisini tanımlayalım
type KullaniciSubeRol = {
  subeId: number;
  subeAdi: string; 
  rol: Rol;
};

// Kullanıcı tipi
type Kullanici = {
  id: number;
  adi: string;
  soyadi: string;
  roller: KullaniciSubeRol[];
};

const KullanicilarPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isFullAdmin, getManagedSubeIds } = useAuth();

  // Müdür ise: yalnızca "Satış Danışmanı" rolü ve kendi şubelerine erişim
  const tamAdmin = isFullAdmin();
  const yonetilenSubeIds = getManagedSubeIds();
  const kullanilabilirRoller: Rol[] = tamAdmin
    ? ["Satış Danışmanı", "Müdür", "Kurucu"]
    : ["Satış Danışmanı"];
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Kullanici | null>(null);
  
  // Formlar için state
  const [newUser, setNewUser] = useState({
    adi: "",
    soyadi: "",
    telefon: "",
    sifre: "",
    selectedRol: "Satış Danışmanı" as Rol,
    selectedSubeId: 0,
    selectedSubeler: [] as {subeId: number, rol: Rol}[],
  });

  // Şubeleri API'den çek
  const { data: subeler = [], isLoading: subelerLoading, error: subelerError } = useQuery({
    queryKey: ['/api/subeler'],
    retry: false,
  });

  // Kullanıcıları API'den çek
  const { data: kullanicilar = [], isLoading: kullanicilarLoading, error: kullanicilarError } = useQuery({
    queryKey: ['/api/kullanicilar'],
    retry: false,
  });

  // Kullanıcı ekleme, düzenleme ve silme için mutasyonlar
  const { mutate: createKullanici, isPending: isCreatingKullanici } = useMutation({
    mutationFn: (data: any) => apiRequest('/api/kullanicilar', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({
        title: "Kullanıcı eklendi",
        description: "Yeni kullanıcı başarıyla eklendi.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kullanicilar'] });
      resetAndCloseAddDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Kullanıcı eklenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`,
        variant: "destructive",
      });
    }
  });

  const { mutate: updateKullanici, isPending: isUpdatingKullanici } = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/kullanicilar/${data.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({
        title: "Kullanıcı güncellendi",
        description: "Kullanıcı bilgileri başarıyla güncellendi.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kullanicilar'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Kullanıcı güncellenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`,
        variant: "destructive",
      });
    }
  });

  const { mutate: deleteKullanici, isPending: isDeletingKullanici } = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/kullanicilar/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: "Kullanıcı silindi",
        description: "Kullanıcı başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/kullanicilar'] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: `Kullanıcı silinirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`,
        variant: "destructive",
      });
    }
  });

  // Yeni şube-rol için state
  const [currentSubeRol, setCurrentSubeRol] = useState<{subeId: number, rol: Rol}>({
    subeId: 0,
    rol: "Satış Danışmanı"
  });

  // Kullanıcı dialoglarını açma ve kapatma fonksiyonları
  const openAddDialog = () => {
    if (Array.isArray(subeler) && subeler.length > 0) {
      // Müdür ise varsayılan şube kendi şubesi olsun
      const varsayilanSube = tamAdmin
        ? subeler[0].id
        : (subeler.find((s: Sube) => yonetilenSubeIds.includes(s.id))?.id ?? subeler[0].id);
      setCurrentSubeRol({
        subeId: varsayilanSube,
        rol: "Satış Danışmanı"
      });
      setNewUser({
        adi: "",
        soyadi: "",
        telefon: "",
        sifre: "",
        selectedRol: "Satış Danışmanı",
        selectedSubeId: varsayilanSube,
        selectedSubeler: [],
      });
    }
    setIsAddDialogOpen(true);
  };

  const resetAndCloseAddDialog = () => {
    setNewUser({
      adi: "",
      soyadi: "",
      telefon: "",
      sifre: "",
      selectedRol: "Satış Danışmanı",
      selectedSubeId: Array.isArray(subeler) && subeler.length > 0 ? subeler[0].id : 0,
      selectedSubeler: [],
    });
    setIsAddDialogOpen(false);
  };

  // Seçili şube-rolü listeye ekleme
  const handleAddSubeRol = () => {
    // Eğer bu şube-rol zaten eklenmişse eklemeyi engelle
    if (newUser.selectedSubeler.some(sr => sr.subeId === currentSubeRol.subeId)) {
      toast({
        title: "Uyarı",
        description: "Bu şube zaten eklenmiş.",
        variant: "destructive",
      });
      return;
    }

    setNewUser({
      ...newUser,
      selectedSubeler: [...newUser.selectedSubeler, {...currentSubeRol}]
    });
  };

  // Şube-rol listesinden bir öğeyi kaldırma
  const handleRemoveSubeRol = (index: number) => {
    const updatedSubeler = [...newUser.selectedSubeler];
    updatedSubeler.splice(index, 1);
    setNewUser({
      ...newUser,
      selectedSubeler: updatedSubeler
    });
  };

  // Kullanıcı ekleme
  const handleAddUser = () => {
    if (!newUser.adi || !newUser.soyadi) {
      toast({
        title: "Eksik bilgiler",
        description: "Ad ve soyad alanları zorunludur.",
        variant: "destructive",
      });
      return;
    }

    if (!newUser.telefon.trim()) {
      toast({
        title: "Eksik bilgiler",
        description: "Kullanıcının giriş yapabilmesi için telefon (kullanıcı adı) zorunludur.",
        variant: "destructive",
      });
      return;
    }

    if (!newUser.sifre || newUser.sifre.length < 4) {
      toast({
        title: "Eksik bilgiler",
        description: "Şifre en az 4 karakter olmalıdır.",
        variant: "destructive",
      });
      return;
    }

    if (newUser.selectedSubeler.length === 0) {
      toast({
        title: "Eksik bilgiler",
        description: "En az bir şube ve rol eklemelisiniz.",
        variant: "destructive",
      });
      return;
    }

    // API'ye gönderilecek veriyi hazırla
    const userData = {
      adi: newUser.adi,
      soyadi: newUser.soyadi,
      telefon: newUser.telefon.trim(),
      sifre: newUser.sifre,
      roller: newUser.selectedSubeler.map(sr => ({
        subeId: sr.subeId,
        rol: sr.rol
      }))
    };

    createKullanici(userData);
  };

  // Kullanıcı düzenleme için state
  const [editingRoller, setEditingRoller] = useState<{subeId: number, rol: Rol}[]>([]);
  const [editCurrentSubeRol, setEditCurrentSubeRol] = useState<{subeId: number, rol: Rol}>({
    subeId: 0,
    rol: "Satış Danışmanı"
  });

  // Kullanıcı düzenleme dialogunu açma
  const handleOpenEditDialog = (user: Kullanici) => {
    setSelectedUser(user);
    
    // Mevcut roller
    const currentRoles = user.roller.map(rol => ({
      subeId: rol.subeId,
      rol: rol.rol as Rol
    }));
    
    setEditingRoller(currentRoles);
    
    // İlk şubeyi varsayılan olarak seç
    if (Array.isArray(subeler) && subeler.length > 0) {
      setEditCurrentSubeRol({
        subeId: subeler[0].id,
        rol: "Satış Danışmanı"
      });
    }
    
    setIsEditDialogOpen(true);
  };

  // Düzenlemede şube-rol ekleme
  const handleAddEditSubeRol = () => {
    if (!selectedUser) return;
    
    // Eğer bu şube-rol zaten eklenmişse eklemeyi engelle
    if (editingRoller.some(sr => sr.subeId === editCurrentSubeRol.subeId)) {
      toast({
        title: "Uyarı",
        description: "Bu şube zaten eklenmiş.",
        variant: "destructive",
      });
      return;
    }
    
    setEditingRoller([...editingRoller, {...editCurrentSubeRol}]);
  };

  // Düzenlemede şube-rol silme
  const handleRemoveEditSubeRol = (index: number) => {
    if (!selectedUser) return;
    
    const updatedRoller = [...editingRoller];
    updatedRoller.splice(index, 1);
    setEditingRoller(updatedRoller);
  };

  // Kullanıcı güncelleme
  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    if (editingRoller.length === 0) {
      toast({
        title: "Eksik bilgiler",
        description: "En az bir şube ve rol eklemelisiniz.",
        variant: "destructive",
      });
      return;
    }
    
    // API'ye gönderilecek veriyi hazırla
    const userData = {
      id: selectedUser.id,
      adi: selectedUser.adi,
      soyadi: selectedUser.soyadi,
      roller: editingRoller.map(sr => ({
        subeId: sr.subeId,
        rol: sr.rol
      }))
    };
    
    updateKullanici(userData);
  };

  // Kullanıcı silme
  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteKullanici(selectedUser.id);
  };

  // Kullanıcı arama
  const filteredKullanicilar = Array.isArray(kullanicilar) 
    ? kullanicilar.filter((kullanici: Kullanici) => {
        if (!searchTerm) return true;
        
        const searchTermLower = searchTerm.toLowerCase();
        
        // Temel bilgiler içinde arama
        if (
          kullanici.adi.toLowerCase().includes(searchTermLower) ||
          kullanici.soyadi.toLowerCase().includes(searchTermLower)
        ) {
          return true;
        }
        
        // Rol ve şube bilgisi içinde arama
        return kullanici.roller?.some(rol => {
          // Rol içinde arama
          if (rol.rol.toLowerCase().includes(searchTermLower)) {
            return true;
          }
          
          // Şube adı içinde arama
          return rol.subeAdi.toLowerCase().includes(searchTermLower);
        });
      }) 
    : [];

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="bg-blue-50">
          <div className="flex justify-between items-center">
            <CardTitle className="text-blue-800">Kullanıcı Yönetimi</CardTitle>
            <Button className="flex items-center" onClick={openAddDialog}>
              <UserPlus className="h-4 w-4 mr-2" />
              Yeni Kullanıcı
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 mt-4">
            <Input
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Hata varsa göster */}
          {kullanicilarError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>
                Kullanıcılar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/kullanicilar'] })}
                >
                  Yeniden Dene
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Kullanıcı tablosu */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[50px]">ID</TableHead>
                  <TableHead>Ad</TableHead>
                  <TableHead>Soyad</TableHead>
                  <TableHead>Şube ve Roller</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kullanicilarLoading ? (
                  // Yükleme durumu
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredKullanicilar.length > 0 ? (
                  // Kullanıcıları listele
                  filteredKullanicilar.map((kullanici: Kullanici) => (
                    <TableRow key={kullanici.id}>
                      <TableCell className="font-medium">{kullanici.id}</TableCell>
                      <TableCell>{kullanici.adi}</TableCell>
                      <TableCell>{kullanici.soyadi}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {kullanici.roller?.map((rol, index) => (
                            <div key={index} className="flex items-center mb-1">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 mr-1">
                                {rol.subeAdi}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                rol.rol === "Kurucu" 
                                  ? "bg-purple-100 text-purple-800" 
                                  : rol.rol === "Müdür" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-orange-100 text-orange-800"
                              }`}>
                                {rol.rol}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditDialog(kullanici)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(kullanici);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // Kullanıcı bulunamadı
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      {searchTerm ? 'Arama kriterine uygun kullanıcı bulunamadı' : 'Henüz kullanıcı bulunmuyor'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Kullanıcı Ekleme Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="ad" className="text-right">
                Ad
              </label>
              <Input
                id="ad"
                value={newUser.adi}
                onChange={(e) => setNewUser({ ...newUser, adi: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="soyad" className="text-right">
                Soyad
              </label>
              <Input
                id="soyad"
                value={newUser.soyadi}
                onChange={(e) => setNewUser({ ...newUser, soyadi: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="telefon" className="text-right">
                Telefon
              </label>
              <Input
                id="telefon"
                placeholder="Giriş için kullanıcı adı"
                value={newUser.telefon}
                onChange={(e) => setNewUser({ ...newUser, telefon: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="sifre" className="text-right">
                Şifre
              </label>
              <Input
                id="sifre"
                type="password"
                placeholder="En az 4 karakter"
                value={newUser.sifre}
                onChange={(e) => setNewUser({ ...newUser, sifre: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="mb-4 border-t pt-4">
              <h3 className="text-md font-medium mb-2">Şube ve Roller</h3>
              
              {/* Şube ve rol ekleme alanı */}
              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <label htmlFor="add-sube" className="text-right">
                  Şube
                </label>
                <select
                  id="add-sube"
                  value={currentSubeRol.subeId}
                  onChange={(e) => 
                    setCurrentSubeRol({ ...currentSubeRol, subeId: Number(e.target.value) })
                  }
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {Array.isArray(subeler) && subeler
                    .filter((sube: Sube) => tamAdmin || yonetilenSubeIds.includes(sube.id))
                    .map((sube: Sube) => (
                      <option key={sube.id} value={sube.id}>{sube.subeAdi}</option>
                    ))}
                </select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <label htmlFor="add-rol" className="text-right">
                  Rol
                </label>
                <select
                  id="add-rol"
                  value={currentSubeRol.rol}
                  onChange={(e) => 
                    setCurrentSubeRol({ ...currentSubeRol, rol: e.target.value as Rol })
                  }
                  disabled={!tamAdmin}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {kullanilabilirRoller.map((rol) => (
                    <option key={rol} value={rol}>{rol}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end mb-4">
                <Button variant="secondary" size="sm" onClick={handleAddSubeRol}>
                  Ekle
                </Button>
              </div>
              
              {/* Eklenmiş şube-rol listesi */}
              <div className="border rounded-md p-2 mt-2 max-h-40 overflow-y-auto">
                {newUser.selectedSubeler.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {newUser.selectedSubeler.map((sr, index) => {
                      const sube = Array.isArray(subeler) ? subeler.find((s: Sube) => s.id === sr.subeId) : null;
                      return (
                        <div key={index} className="flex items-center bg-slate-100 rounded-md px-2 py-1">
                          <span className="mr-1 text-xs">{sube ? sube.subeAdi : sr.subeId} - {sr.rol}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 ml-1" 
                            onClick={() => handleRemoveSubeRol(index)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    Henüz şube eklenmedi
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAndCloseAddDialog}>
              İptal
            </Button>
            <Button onClick={handleAddUser} disabled={isCreatingKullanici}>
              {isCreatingKullanici ? 'Ekleniyor...' : 'Kullanıcı Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kullanıcı Düzenleme Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedUser && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-ad" className="text-right">
                    Ad
                  </label>
                  <Input
                    id="edit-ad"
                    value={selectedUser.adi}
                    onChange={(e) => setSelectedUser({ ...selectedUser, adi: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-soyad" className="text-right">
                    Soyad
                  </label>
                  <Input
                    id="edit-soyad"
                    value={selectedUser.soyadi}
                    onChange={(e) => setSelectedUser({ ...selectedUser, soyadi: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="mb-4 border-t pt-4">
                  <h3 className="text-md font-medium mb-2">Şube ve Roller</h3>
                  
                  {/* Şube ve rol ekleme alanı */}
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <label htmlFor="edit-sube" className="text-right">
                      Şube
                    </label>
                    <select
                      id="edit-sube"
                      value={editCurrentSubeRol.subeId}
                      onChange={(e) => 
                        setEditCurrentSubeRol({ ...editCurrentSubeRol, subeId: Number(e.target.value) })
                      }
                      className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {Array.isArray(subeler) && subeler
                        .filter((sube: Sube) => tamAdmin || yonetilenSubeIds.includes(sube.id))
                        .map((sube: Sube) => (
                          <option key={sube.id} value={sube.id}>{sube.subeAdi}</option>
                        ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <label htmlFor="edit-rol" className="text-right">
                      Rol
                    </label>
                    <select
                      id="edit-rol"
                      value={editCurrentSubeRol.rol}
                      onChange={(e) => 
                        setEditCurrentSubeRol({ ...editCurrentSubeRol, rol: e.target.value as Rol })
                      }
                      disabled={!tamAdmin}
                      className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {kullanilabilirRoller.map((rol) => (
                        <option key={rol} value={rol}>{rol}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end mb-4">
                    <Button variant="secondary" size="sm" onClick={handleAddEditSubeRol}>
                      Ekle
                    </Button>
                  </div>
                  
                  {/* Eklenmiş şube-rol listesi */}
                  <div className="border rounded-md p-2 mt-2 max-h-40 overflow-y-auto">
                    {editingRoller.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {editingRoller.map((sr, index) => {
                          const sube = Array.isArray(subeler) ? subeler.find((s: Sube) => s.id === sr.subeId) : null;
                          return (
                            <div key={index} className="flex items-center bg-slate-100 rounded-md px-2 py-1">
                              <span className="mr-1 text-xs">{sube ? sube.subeAdi : sr.subeId} - {sr.rol}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 ml-1" 
                                onClick={() => handleRemoveEditSubeRol(index)}
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground py-2">
                        Henüz şube eklenmedi
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdatingKullanici}>
              {isUpdatingKullanici ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kullanıcı Silme Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Sil</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            {selectedUser && (
              <div className="bg-slate-50 p-3 rounded-md mt-3">
                <p><span className="font-semibold">ID:</span> {selectedUser.id}</p>
                <p><span className="font-semibold">Ad Soyad:</span> {selectedUser.adi} {selectedUser.soyadi}</p>
                <p><span className="font-semibold">Şube ve Roller:</span> {selectedUser.roller.map(r => `${r.subeAdi} (${r.rol})`).join(', ')}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeletingKullanici}>
              {isDeletingKullanici ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KullanicilarPage;