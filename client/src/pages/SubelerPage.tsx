import React, { useState } from 'react';
import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Branch, InsertBranch, User, UserRole, InsertUser } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus, Users, Building2 } from 'lucide-react';

// Şube formu tipi
interface BranchFormData {
  name: string;
  address: string;
  phone: string;
}

// Kullanıcı formu tipi
interface UserFormData {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  branchId: number;
  active: boolean;
}

export default function SubelerPage() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [branchForm, setBranchForm] = useState<BranchFormData>({
    name: '',
    address: '',
    phone: '',
  });
  const [userForm, setUserForm] = useState<UserFormData>({
    username: '',
    password: '',
    fullName: '',
    role: UserRole.SATIS_DANISMANI,
    branchId: 0,
    active: true,
  });

  // Role göre erişim kontrolü
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.KURUCU) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Erişim Reddedildi</h1>
        <p>Bu sayfayı görüntülemek için yetkiniz yok.</p>
      </div>
    );
  }

  // Şubeleri getir
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ['/api/branches'],
    queryFn: async () => {
      // Şimdilik mock veri kullanıyoruz, gerçek API hazır olduğunda değiştirilecek
      return [
        { id: 1, name: 'Kadıköy Şubesi', address: 'Kadıköy, İstanbul', phone: '0216 123 4567', createdAt: new Date().toISOString() },
        { id: 2, name: 'Beyoğlu Şubesi', address: 'Beyoğlu, İstanbul', phone: '0212 987 6543', createdAt: new Date().toISOString() },
      ] as Branch[];
    },
  });

  // Kullanıcıları getir
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      // Şimdilik mock veri kullanıyoruz, gerçek API hazır olduğunda değiştirilecek
      return [
        { id: 1, username: 'admin', fullName: 'Admin Kullanıcı', role: UserRole.ADMIN, branchId: 1, active: true, createdAt: new Date().toISOString() },
        { id: 2, username: 'kurucu', fullName: 'Kurucu Yönetici', role: UserRole.KURUCU, branchId: null, active: true, createdAt: new Date().toISOString() },
        { id: 3, username: 'sube_muduru', fullName: 'Müdür Ahmet', role: UserRole.SUBE_MUDURU, branchId: 1, active: true, createdAt: new Date().toISOString() },
        { id: 4, username: 'satis1', fullName: 'Satış Danışmanı 1', role: UserRole.SATIS_DANISMANI, branchId: 1, active: true, createdAt: new Date().toISOString() },
        { id: 5, username: 'satis2', fullName: 'Satış Danışmanı 2', role: UserRole.SATIS_DANISMANI, branchId: 2, active: true, createdAt: new Date().toISOString() },
      ] as User[];
    },
  });

  // Şube ekleme/güncelleme mutasyonu
  const branchMutation = useMutation({
    mutationFn: async (branch: InsertBranch & { id?: number }) => {
      if (branch.id) {
        // Şube güncelleme - şimdilik mock
        console.log('Şube güncelleniyor:', branch);
        return { ...branch, id: branch.id } as Branch;
      } else {
        // Yeni şube ekleme - şimdilik mock
        console.log('Yeni şube ekleniyor:', branch);
        return { ...branch, id: Date.now(), createdAt: new Date().toISOString() } as Branch;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/branches'] });
      setIsBranchDialogOpen(false);
      resetBranchForm();
      toast({
        title: selectedBranch ? 'Şube güncellendi' : 'Şube eklendi',
        description: `${branchForm.name} şubesi başarıyla ${selectedBranch ? 'güncellendi' : 'eklendi'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: 'Şube işlemi sırasında bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Kullanıcı ekleme/güncelleme mutasyonu
  const userMutation = useMutation({
    mutationFn: async (user: InsertUser & { id?: number }) => {
      if (user.id) {
        // Kullanıcı güncelleme - şimdilik mock
        console.log('Kullanıcı güncelleniyor:', user);
        return { ...user, id: user.id } as User;
      } else {
        // Yeni kullanıcı ekleme - şimdilik mock
        console.log('Yeni kullanıcı ekleniyor:', user);
        return { ...user, id: Date.now(), createdAt: new Date().toISOString() } as User;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsUserDialogOpen(false);
      resetUserForm();
      toast({
        title: selectedUser ? 'Kullanıcı güncellendi' : 'Kullanıcı eklendi',
        description: `${userForm.fullName} kullanıcısı başarıyla ${selectedUser ? 'güncellendi' : 'eklendi'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: 'Kullanıcı işlemi sırasında bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Şube silme mutasyonu
  const deleteBranchMutation = useMutation({
    mutationFn: async (branchId: number) => {
      // Şimdilik mock
      console.log('Şube siliniyor:', branchId);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/branches'] });
      toast({
        title: 'Şube silindi',
        description: 'Şube başarıyla silindi.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: 'Şube silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Kullanıcı silme mutasyonu
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      // Şimdilik mock
      console.log('Kullanıcı siliniyor:', userId);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Kullanıcı silindi',
        description: 'Kullanıcı başarıyla silindi.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: 'Kullanıcı silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    },
  });

  // Şube formunu sıfırla
  const resetBranchForm = () => {
    setBranchForm({
      name: '',
      address: '',
      phone: '',
    });
    setSelectedBranch(null);
  };

  // Kullanıcı formunu sıfırla
  const resetUserForm = () => {
    setUserForm({
      username: '',
      password: '',
      fullName: '',
      role: UserRole.SATIS_DANISMANI,
      branchId: branches.length > 0 ? branches[0].id : 0,
      active: true,
    });
    setSelectedUser(null);
  };

  // Şube düzenleme işlemi
  const handleEditBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setBranchForm({
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
    });
    setIsBranchDialogOpen(true);
  };

  // Kullanıcı düzenleme işlemi
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      username: user.username,
      password: '', // Şifre gösterilmez, sadece değiştirilecekse doldurulur
      fullName: user.fullName,
      role: user.role as UserRole,
      branchId: user.branchId || 0,
      active: user.active,
    });
    setIsUserDialogOpen(true);
  };

  // Şube formu gönderme
  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const branchData: InsertBranch & { id?: number } = {
      name: branchForm.name,
      address: branchForm.address,
      phone: branchForm.phone,
    };

    if (selectedBranch) {
      branchData.id = selectedBranch.id;
    }

    branchMutation.mutate(branchData);
  };

  // Kullanıcı formu gönderme
  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userData: InsertUser & { id?: number } = {
      username: userForm.username,
      password: userForm.password, // Edit için boş olabilir
      fullName: userForm.fullName,
      role: userForm.role,
      branchId: userForm.branchId,
      active: userForm.active,
    };

    if (selectedUser) {
      userData.id = selectedUser.id;
      // Şifre alanı boş ise, güncelleme sırasında şifreyi değiştirme
      if (!userData.password) {
        delete userData.password;
      }
    }

    userMutation.mutate(userData);
  };

  // Şubeye ait kullanıcıları filtrele
  const getUsersByBranch = (branchId: number) => {
    return users.filter(user => user.branchId === branchId);
  };

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">Şube & Kullanıcı Yönetimi</h1>
        <p className="text-neutral-500">Şubeleri ve kullanıcıları yönetin.</p>
      </header>

      <Tabs defaultValue="branches" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="branches">
            <Building2 className="w-4 h-4 mr-2" />
            Şubeler
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Kullanıcılar
          </TabsTrigger>
        </TabsList>

        {/* Şubeler Sekmesi */}
        <TabsContent value="branches">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">Şubeler</h2>
            <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetBranchForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Şube Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedBranch ? 'Şube Düzenle' : 'Yeni Şube Ekle'}</DialogTitle>
                  <DialogDescription>
                    {selectedBranch 
                      ? 'Şube bilgilerini güncelleyin.' 
                      : 'Yeni bir şube eklemek için bilgileri doldurun.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBranchSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="branch-name">Şube Adı*</Label>
                      <Input
                        id="branch-name"
                        value={branchForm.name}
                        onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="branch-address">Adres</Label>
                      <Input
                        id="branch-address"
                        value={branchForm.address}
                        onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="branch-phone">Telefon</Label>
                      <Input
                        id="branch-phone"
                        value={branchForm.phone}
                        onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsBranchDialogOpen(false)}
                    >
                      İptal
                    </Button>
                    <Button type="submit">
                      {selectedBranch ? 'Güncelle' : 'Ekle'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingBranches ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch) => (
                <Card key={branch.id}>
                  <CardHeader>
                    <CardTitle>{branch.name}</CardTitle>
                    <CardDescription>
                      {branch.address && `${branch.address}`}
                      {branch.phone && branch.address && ' • '}
                      {branch.phone && `${branch.phone}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      <span className="font-medium">Personel Sayısı:</span>{' '}
                      {getUsersByBranch(branch.id).length}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditBranch(branch)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Düzenle
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        if (confirm(`"${branch.name}" şubesini silmek istediğinize emin misiniz?`)) {
                          deleteBranchMutation.mutate(branch.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Sil
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Kullanıcılar Sekmesi */}
        <TabsContent value="users">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">Kullanıcılar</h2>
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetUserForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Kullanıcı Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</DialogTitle>
                  <DialogDescription>
                    {selectedUser 
                      ? 'Kullanıcı bilgilerini güncelleyin.' 
                      : 'Yeni bir kullanıcı eklemek için bilgileri doldurun.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUserSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="user-fullname">Ad Soyad*</Label>
                      <Input
                        id="user-fullname"
                        value={userForm.fullName}
                        onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-username">Kullanıcı Adı*</Label>
                      <Input
                        id="user-username"
                        value={userForm.username}
                        onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-password">
                        {selectedUser ? 'Şifre (değiştirmek için doldurun)' : 'Şifre*'}
                      </Label>
                      <Input
                        id="user-password"
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        required={!selectedUser}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-role">Rol*</Label>
                      <Select 
                        value={userForm.role}
                        onValueChange={(value) => setUserForm({ ...userForm, role: value as UserRole })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rol seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                          <SelectItem value={UserRole.KURUCU}>Kurucu</SelectItem>
                          <SelectItem value={UserRole.SUBE_MUDURU}>Şube Müdürü</SelectItem>
                          <SelectItem value={UserRole.SATIS_DANISMANI}>Satış Danışmanı</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="user-branch">Şube*</Label>
                      <Select 
                        value={userForm.branchId.toString()}
                        onValueChange={(value) => setUserForm({ ...userForm, branchId: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Şube seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsUserDialogOpen(false)}
                    >
                      İptal
                    </Button>
                    <Button type="submit">
                      {selectedUser ? 'Güncelle' : 'Ekle'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingUsers ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : (
            <Table>
              <TableCaption>Toplam {users.length} kullanıcı</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Kullanıcı Adı</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Şube</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const userBranch = branches.find(b => b.id === user.branchId);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{userBranch ? userBranch.name : 'Genel Merkez'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.active ? 'Aktif' : 'Pasif'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm(`"${user.fullName}" kullanıcısını silmek istediğinize emin misiniz?`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}