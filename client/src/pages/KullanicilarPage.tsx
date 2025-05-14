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

// Örnek kullanıcı tipi
type User = {
  id: number;
  ad: string;
  soyad: string;
  email: string;
  rol: string;
  sonGiris: string;
};

// Örnek kullanıcı verileri
const dummyUsers: User[] = [
  { 
    id: 1, 
    ad: "Ahmet", 
    soyad: "Yılmaz", 
    email: "ahmet.yilmaz@example.com", 
    rol: "Satış Danışmanı", 
    sonGiris: "12.05.2025 09:15" 
  },
  { 
    id: 2, 
    ad: "Ayşe", 
    soyad: "Kaya", 
    email: "ayse.kaya@example.com", 
    rol: "Müdür", 
    sonGiris: "11.05.2025 14:30" 
  },
  { 
    id: 3, 
    ad: "Mehmet", 
    soyad: "Demir", 
    email: "mehmet.demir@example.com", 
    rol: "Satış Danışmanı", 
    sonGiris: "10.05.2025 11:45" 
  },
  { 
    id: 4, 
    ad: "Zeynep", 
    soyad: "Şahin", 
    email: "zeynep.sahin@example.com", 
    rol: "Satış Danışmanı", 
    sonGiris: "09.05.2025 16:20" 
  },
  { 
    id: 5, 
    ad: "Mustafa", 
    soyad: "Öztürk", 
    email: "mustafa.ozturk@example.com", 
    rol: "Müdür Yardımcısı", 
    sonGiris: "12.05.2025 08:10" 
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
    rol: "Satış Danışmanı",
  });

  // Kullanıcı arama
  const filteredUsers = users.filter(
    (user) =>
      user.ad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.soyad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Kullanıcı ekleme fonksiyonu
  const handleAddUser = () => {
    const id = Math.max(0, ...users.map((u) => u.id)) + 1;
    const now = new Date();
    const sonGiris = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}`;
    
    const newUserData: User = {
      id,
      ...newUser,
      sonGiris,
    };
    
    setUsers([...users, newUserData]);
    setNewUser({
      ad: "",
      soyad: "",
      email: "",
      rol: "Satış Danışmanı",
    });
    setIsAddDialogOpen(false);
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
                  <TableHead>Rol</TableHead>
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
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.rol === "Müdür" 
                            ? "bg-purple-100 text-purple-800" 
                            : user.rol === "Müdür Yardımcısı" 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-green-100 text-green-800"
                        }`}>
                          {user.rol}
                        </span>
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