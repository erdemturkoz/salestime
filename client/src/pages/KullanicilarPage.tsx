import { useState, useEffect } from "react";
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
import { Edit, Trash, UserPlus } from "lucide-react";

// Şube tipini tanımlayalım
type Sube = {
  id: string;
  ad: string;
};

// Rol tipini tanımlayalım
type Rol = "Kurucu" | "Müdür" | "Satış Danışmanı";

// Kullanıcı-Şube ilişkisini tanımlayalım
type SubeRol = {
  subeId: string;
  rol: Rol;
};

// Örnek kullanıcı tipi - birden fazla şubeyi yönetebilir
type User = {
  id: number;
  ad: string;
  soyad: string;
  email: string;
  subeRolleri: SubeRol[]; // Birden fazla şube için rol
  sonGiris: string;
};

// Örnek şubeler
const SUBELER: Sube[] = [
  { id: "merkez", ad: "Merkez" },
  { id: "kadikoy", ad: "Kadıköy" },
  { id: "besiktas", ad: "Beşiktaş" },
  { id: "sisli", ad: "Şişli" },
  { id: "bakirkoy", ad: "Bakırköy" },
];

// Örnek kullanıcı verileri
const dummyUsers: User[] = [
  { 
    id: 1, 
    ad: "Ahmet", 
    soyad: "Yılmaz", 
    email: "ahmet.yilmaz@example.com", 
    subeRolleri: [
      { subeId: "kadikoy", rol: "Satış Danışmanı" }
    ],
    sonGiris: "12.05.2025 09:15" 
  },
  { 
    id: 2, 
    ad: "Ayşe", 
    soyad: "Kaya", 
    email: "ayse.kaya@example.com", 
    subeRolleri: [
      { subeId: "merkez", rol: "Müdür" }
    ],
    sonGiris: "11.05.2025 14:30" 
  },
  { 
    id: 3, 
    ad: "Mehmet", 
    soyad: "Demir", 
    email: "mehmet.demir@example.com", 
    subeRolleri: [
      { subeId: "besiktas", rol: "Satış Danışmanı" }
    ],
    sonGiris: "10.05.2025 11:45" 
  },
  { 
    id: 4, 
    ad: "Zeynep", 
    soyad: "Şahin", 
    email: "zeynep.sahin@example.com", 
    subeRolleri: [
      { subeId: "sisli", rol: "Satış Danışmanı" },
      { subeId: "bakirkoy", rol: "Satış Danışmanı" }
    ],
    sonGiris: "09.05.2025 16:20" 
  },
  { 
    id: 5, 
    ad: "Mustafa", 
    soyad: "Öztürk", 
    email: "mustafa.ozturk@example.com", 
    subeRolleri: [
      { subeId: "merkez", rol: "Müdür" },
      { subeId: "kadikoy", rol: "Müdür" },
      { subeId: "besiktas", rol: "Müdür" }
    ],
    sonGiris: "12.05.2025 08:10" 
  },
  { 
    id: 6, 
    ad: "Ali", 
    soyad: "Yıldırım", 
    email: "ali.yildirim@example.com", 
    subeRolleri: [
      { subeId: "merkez", rol: "Kurucu" },
      { subeId: "kadikoy", rol: "Kurucu" },
      { subeId: "besiktas", rol: "Kurucu" },
      { subeId: "sisli", rol: "Kurucu" },
      { subeId: "bakirkoy", rol: "Kurucu" }
    ],
    sonGiris: "12.05.2025 10:30" 
  },
];

const KullanicilarPage = () => {
  const [users, setUsers] = useState<User[]>(dummyUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    ad: "",
    soyad: "",
    email: "",
    selectedRol: "Satış Danışmanı" as Rol,
    selectedSubeId: "merkez",
    selectedSubeler: [] as {subeId: string, rol: Rol}[],
  });

  // Şube adını ID'den bulmak için yardımcı fonksiyon
  const getSubeAdi = (subeId: string): string => {
    const sube = SUBELER.find(s => s.id === subeId);
    return sube ? sube.ad : subeId;
  };

  // Kullanıcı arama - birden çok şubede çalışanlar için daha karmaşık arama
  const filteredUsers = users.filter(
    (user) => {
      const searchTermLower = searchTerm.toLowerCase();
      
      // Temel bilgiler içinde arama
      if (
        user.ad.toLowerCase().includes(searchTermLower) ||
        user.soyad.toLowerCase().includes(searchTermLower) ||
        user.email.toLowerCase().includes(searchTermLower)
      ) {
        return true;
      }
      
      // Rol ve şube bilgisi içinde arama
      return user.subeRolleri.some(subeRol => {
        // Rol içinde arama
        if (subeRol.rol.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        // Şube adı içinde arama
        const subeAdi = getSubeAdi(subeRol.subeId);
        return subeAdi.toLowerCase().includes(searchTermLower);
      });
    }
  );

  // Yeni şube-rol eklemek için state ve fonksiyonlar
  const [currentSubeRol, setCurrentSubeRol] = useState<SubeRol>({
    subeId: "merkez",
    rol: "Satış Danışmanı"
  });

  // Seçili şube-rolü listeye ekleme
  const handleAddSubeRol = () => {
    // Eğer bu şube-rol zaten eklenmişse eklemeyi engelle
    if (newUser.selectedSubeler.some(sr => sr.subeId === currentSubeRol.subeId)) {
      return; // Aynı şube birden fazla eklenemesin
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

  // Kullanıcı ekleme fonksiyonu - güncellenmiş
  const handleAddUser = () => {
    const id = Math.max(0, ...users.map((u) => u.id)) + 1;
    const now = new Date();
    const sonGiris = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}`;
    
    // Eğer hiç şube-rol seçilmemişse, şu anki seçili şube-rolü ekle
    const subeRolleri = newUser.selectedSubeler.length > 0 
      ? newUser.selectedSubeler
      : [{ subeId: newUser.selectedSubeId, rol: newUser.selectedRol }];
    
    const newUserData: User = {
      id,
      ad: newUser.ad,
      soyad: newUser.soyad,
      email: newUser.email,
      subeRolleri,
      sonGiris,
    };
    
    setUsers([...users, newUserData]);
    setNewUser({
      ad: "",
      soyad: "",
      email: "",
      selectedRol: "Satış Danışmanı" as Rol,
      selectedSubeId: "merkez",
      selectedSubeler: [],
    });
    setIsAddDialogOpen(false);
  };

  // Kullanıcı düzenleme - şube rol işlemleri
  const [editingSubeRolleri, setEditingSubeRolleri] = useState<SubeRol[]>([]);
  const [editCurrentSubeRol, setEditCurrentSubeRol] = useState<SubeRol>({
    subeId: "merkez",
    rol: "Satış Danışmanı"
  });

  // Kullanıcı düzenleme dialogunu açarken şube-rol listesini hazırlama
  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditingSubeRolleri([...user.subeRolleri]);
    setIsEditDialogOpen(true);
  };

  // Düzenlemede şube-rol ekleme
  const handleAddEditSubeRol = () => {
    if (!selectedUser) return;
    
    // Eğer bu şube-rol zaten eklenmişse eklemeyi engelle
    if (editingSubeRolleri.some(sr => sr.subeId === editCurrentSubeRol.subeId)) {
      return; // Aynı şube birden fazla eklenemesin
    }
    
    const updatedSubeRoller = [...editingSubeRolleri, {...editCurrentSubeRol}];
    setEditingSubeRolleri(updatedSubeRoller);
    
    // Kullanıcı nesnesini de güncelle
    setSelectedUser({
      ...selectedUser,
      subeRolleri: updatedSubeRoller
    });
  };

  // Düzenlemede şube-rol silme
  const handleRemoveEditSubeRol = (index: number) => {
    if (!selectedUser) return;
    
    const updatedSubeRoller = [...editingSubeRolleri];
    updatedSubeRoller.splice(index, 1);
    setEditingSubeRolleri(updatedSubeRoller);
    
    // Kullanıcı nesnesini de güncelle
    setSelectedUser({
      ...selectedUser,
      subeRolleri: updatedSubeRoller
    });
  };

  // Kullanıcı düzenleme fonksiyonu
  const handleEditUser = () => {
    if (!selectedUser) return;
    
    setUsers(
      users.map((user) =>
        user.id === selectedUser.id ? { ...selectedUser } : user
      )
    );
    
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    setEditingSubeRolleri([]);
  };

  // Kullanıcı silme fonksiyonu
  const handleDeleteUser = () => {
    if (!selectedUser) return;
    
    setUsers(users.filter((user) => user.id !== selectedUser.id));
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="bg-blue-50">
          <div className="flex justify-between items-center">
            <CardTitle className="text-blue-800">Kullanıcı Yönetimi</CardTitle>
            <Button className="flex items-center" onClick={() => setIsAddDialogOpen(true)}>
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

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[50px]">ID</TableHead>
                  <TableHead>Ad</TableHead>
                  <TableHead>Soyad</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Şube ve Roller</TableHead>
                  <TableHead>Son Giriş</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell>{user.ad}</TableCell>
                      <TableCell>{user.soyad}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.subeRolleri.map((subeRol, index) => (
                            <div key={index} className="flex items-center mb-1">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 mr-1">
                                {getSubeAdi(subeRol.subeId)}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                subeRol.rol === "Kurucu" 
                                  ? "bg-purple-100 text-purple-800" 
                                  : subeRol.rol === "Müdür" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-orange-100 text-orange-800"
                              }`}>
                                {subeRol.rol}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{user.sonGiris}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Kullanıcı bulunamadı
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
                value={newUser.ad}
                onChange={(e) => setNewUser({ ...newUser, ad: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="soyad" className="text-right">
                Soyad
              </label>
              <Input
                id="soyad"
                value={newUser.soyad}
                onChange={(e) => setNewUser({ ...newUser, soyad: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right">
                E-posta
              </label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="rol" className="text-right">
                Rol
              </label>
              <select
                id="rol"
                value={newUser.rol}
                onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Satış Danışmanı">Satış Danışmanı</option>
                <option value="Müdür Yardımcısı">Müdür Yardımcısı</option>
                <option value="Müdür">Müdür</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="sube" className="text-right">
                Şube
              </label>
              <select
                id="sube"
                value={newUser.sube}
                onChange={(e) => setNewUser({ ...newUser, sube: e.target.value })}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Merkez">Merkez</option>
                <option value="Kadıköy">Kadıköy</option>
                <option value="Beşiktaş">Beşiktaş</option>
                <option value="Şişli">Şişli</option>
                <option value="Bakırköy">Bakırköy</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleAddUser}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kullanıcı Düzenleme Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-ad" className="text-right">
                  Ad
                </label>
                <Input
                  id="edit-ad"
                  value={selectedUser.ad}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, ad: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-soyad" className="text-right">
                  Soyad
                </label>
                <Input
                  id="edit-soyad"
                  value={selectedUser.soyad}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, soyad: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-email" className="text-right">
                  E-posta
                </label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, email: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-rol" className="text-right">
                  Rol
                </label>
                <select
                  id="edit-rol"
                  value={selectedUser.rol}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, rol: e.target.value })
                  }
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Satış Danışmanı">Satış Danışmanı</option>
                  <option value="Müdür Yardımcısı">Müdür Yardımcısı</option>
                  <option value="Müdür">Müdür</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-sube" className="text-right">
                  Şube
                </label>
                <select
                  id="edit-sube"
                  value={selectedUser.sube}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, sube: e.target.value })
                  }
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Merkez">Merkez</option>
                  <option value="Kadıköy">Kadıköy</option>
                  <option value="Beşiktaş">Beşiktaş</option>
                  <option value="Şişli">Şişli</option>
                  <option value="Bakırköy">Bakırköy</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleEditUser}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kullanıcı Silme Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Sil</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-center">
              <strong>{selectedUser?.ad} {selectedUser?.soyad}</strong> kullanıcısını silmek istediğinize emin misiniz?
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Bu işlem geri alınamaz.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KullanicilarPage;