import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit, Trash, UserPlus, Search, ChevronUp, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Şube tipini tanımlayalım
type Sube = {
  id: string;
  ad: string;
  renk: string;
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
  subeRolleri: SubeRol[]; // Birden fazla şube için rol
  sonGiris: string;
};

// Örnek şubeler
const SUBELER: Sube[] = [
  { id: "merkez", ad: "Merkez", renk: "bg-blue-50 border-blue-200" },
  { id: "kadikoy", ad: "Kadıköy", renk: "bg-green-50 border-green-200" },
  { id: "besiktas", ad: "Beşiktaş", renk: "bg-purple-50 border-purple-200" },
  { id: "sisli", ad: "Şişli", renk: "bg-orange-50 border-orange-200" },
  { id: "bakirkoy", ad: "Bakırköy", renk: "bg-pink-50 border-pink-200" },
];

// Örnek kullanıcı verileri
const dummyUsers: User[] = [
  { 
    id: 1, 
    ad: "Ahmet", 
    soyad: "Yılmaz", 
    subeRolleri: [
      { subeId: "kadikoy", rol: "Satış Danışmanı" }
    ],
    sonGiris: "12.05.2025 09:15" 
  },
  { 
    id: 2, 
    ad: "Ayşe", 
    soyad: "Kaya", 
    subeRolleri: [
      { subeId: "merkez", rol: "Müdür" }
    ],
    sonGiris: "11.05.2025 14:30" 
  },
  { 
    id: 3, 
    ad: "Mehmet", 
    soyad: "Demir", 
    subeRolleri: [
      { subeId: "besiktas", rol: "Satış Danışmanı" }
    ],
    sonGiris: "10.05.2025 11:45" 
  },
  { 
    id: 4, 
    ad: "Zeynep", 
    soyad: "Şahin", 
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
    subeRolleri: [
      { subeId: "merkez", rol: "Kurucu" },
      { subeId: "kadikoy", rol: "Kurucu" },
      { subeId: "besiktas", rol: "Kurucu" },
      { subeId: "sisli", rol: "Kurucu" },
      { subeId: "bakirkoy", rol: "Kurucu" }
    ],
    sonGiris: "12.05.2025 10:30" 
  },
  { 
    id: 7, 
    ad: "Fatma", 
    soyad: "Can", 
    subeRolleri: [
      { subeId: "merkez", rol: "Satış Danışmanı" }
    ],
    sonGiris: "12.05.2025 10:45" 
  },
  { 
    id: 8, 
    ad: "Kemal", 
    soyad: "Koç", 
    subeRolleri: [
      { subeId: "kadikoy", rol: "Satış Danışmanı" }
    ],
    sonGiris: "11.05.2025 09:30" 
  },
  { 
    id: 9, 
    ad: "Elif", 
    soyad: "Yılmaz", 
    subeRolleri: [
      { subeId: "besiktas", rol: "Satış Danışmanı" }
    ],
    sonGiris: "10.05.2025 14:20" 
  },
  { 
    id: 10, 
    ad: "Hakan", 
    soyad: "Bulut", 
    subeRolleri: [
      { subeId: "sisli", rol: "Müdür" }
    ],
    sonGiris: "11.05.2025 15:40" 
  },
];

const SubeKartlari = () => {
  const [users, setUsers] = useState<User[]>(dummyUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubeId, setSelectedSubeId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(
    SUBELER.reduce((acc, sube) => ({ ...acc, [sube.id]: true }), {})
  );

  // Kartı genişlet/daralt
  const toggleCardExpand = (subeId: string) => {
    setExpandedCards({
      ...expandedCards,
      [subeId]: !expandedCards[subeId]
    });
  };

  // Şube çalışanlarını filtrele
  const getSubeCalisanlari = (subeId: string) => {
    return users.filter(user => 
      user.subeRolleri.some(subeRol => subeRol.subeId === subeId)
    ).map(user => {
      // Bu şubedeki rolünü bul
      const subeRol = user.subeRolleri.find(sr => sr.subeId === subeId);
      return {
        ...user,
        rolBuSubede: subeRol?.rol || "Satış Danışmanı" // varsayılan rol
      };
    });
  };

  // Rolün rengini belirle
  const getRolRengi = (rol: Rol) => {
    switch(rol) {
      case "Kurucu": return "bg-purple-100 text-purple-800";
      case "Müdür": return "bg-green-100 text-green-800";
      case "Satış Danışmanı": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Şube adını bul
  const getSubeAdi = (subeId: string) => {
    const sube = SUBELER.find(s => s.id === subeId);
    return sube ? sube.ad : subeId;
  };

  // Rol sırasına göre sırala (Kurucu > Müdür > Satış Danışmanı)
  const getRolSirasi = (rol: Rol) => {
    switch(rol) {
      case "Kurucu": return 1;
      case "Müdür": return 2;
      case "Satış Danışmanı": return 3;
      default: return 99;
    }
  };

  // Rollere göre sıralanmış çalışanlar
  const getSiralanmisCalisanlar = (subeId: string) => {
    return getSubeCalisanlari(subeId).sort((a, b) => {
      const rolSirasiA = getRolSirasi(a.rolBuSubede as Rol);
      const rolSirasiB = getRolSirasi(b.rolBuSubede as Rol);
      return rolSirasiA - rolSirasiB;
    });
  };

  // Arama filtresine uygun şubeleri bul
  const filteredSubeler = searchTerm 
    ? SUBELER.filter(sube => {
        // Şube adında arama
        if (sube.ad.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
        
        // Şubede çalışanların adında veya soyadında arama
        const calisanlar = getSubeCalisanlari(sube.id);
        return calisanlar.some(calisan => 
          calisan.ad.toLowerCase().includes(searchTerm.toLowerCase()) ||
          calisan.soyad.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    : SUBELER;

  // Seçilen şubeye göre filtrele
  const displayedSubeler = selectedSubeId 
    ? filteredSubeler.filter(sube => sube.id === selectedSubeId) 
    : filteredSubeler;

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="text-2xl font-bold text-blue-800">Şubeler ve Çalışanlar</div>
          <Button className="flex items-center bg-blue-600" onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Yeni Çalışan Ekle
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Şube veya çalışan ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedSubeId === null ? "default" : "outline"}
              onClick={() => setSelectedSubeId(null)}
              className="text-xs"
            >
              Tüm Şubeler
            </Button>
            {SUBELER.map(sube => (
              <Button 
                key={sube.id}
                variant={selectedSubeId === sube.id ? "default" : "outline"}
                onClick={() => setSelectedSubeId(sube.id === selectedSubeId ? null : sube.id)}
                className="text-xs"
              >
                {sube.ad}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedSubeler.map(sube => {
          const calisanlar = getSiralanmisCalisanlar(sube.id);
          const isExpanded = expandedCards[sube.id];
          
          return (
            <Card key={sube.id} className={`border-2 ${sube.renk}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>{sube.ad}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCardExpand(sube.id)}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                </div>
                <CardDescription className="flex items-center justify-between">
                  <span>Toplam {calisanlar.length} çalışan</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs bg-purple-50">
                      {calisanlar.filter(c => c.rolBuSubede === "Kurucu").length} Kurucu
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">
                      {calisanlar.filter(c => c.rolBuSubede === "Müdür").length} Müdür
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-orange-50">
                      {calisanlar.filter(c => c.rolBuSubede === "Satış Danışmanı").length} Danışman
                    </Badge>
                  </div>
                </CardDescription>
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  {calisanlar.length > 0 ? (
                    <div className="space-y-3">
                      {calisanlar.map(calisan => (
                        <div 
                          key={`${sube.id}-${calisan.id}`} 
                          className="flex items-center justify-between p-2 border rounded-md hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{calisan.ad} {calisan.soyad}</div>
                            <Badge className={`text-xs ${getRolRengi(calisan.rolBuSubede as Rol)}`}>
                              {calisan.rolBuSubede}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                              onClick={() => {
                                setSelectedUser(calisan);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Bu şubede henüz çalışan bulunmuyor
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Çalışan silme dialogu */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Çalışanı Sil</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            {selectedUser && (
              <p>
                <strong>{selectedUser.ad} {selectedUser.soyad}</strong> isimli çalışanı silmek istediğinize emin misiniz?
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedUser) {
                  setUsers(users.filter(user => user.id !== selectedUser.id));
                }
                setIsDeleteDialogOpen(false);
                setSelectedUser(null);
              }}
            >
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubeKartlari;