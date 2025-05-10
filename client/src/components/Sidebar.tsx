import React, { useState } from 'react';
import { Link, useRoute, useLocation } from 'wouter';
import { 
  Calculator, 
  DollarSign, 
  User,
  LogOut,
  Menu, 
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const NAV_ITEMS = [
  {
    label: 'Ücret Hesaplama',
    href: '/hesaplama',
    icon: <Calculator className="h-5 w-5" />,
  },
  {
    label: 'Kampanya Ekle',
    href: '/ucretlendirme',
    icon: <DollarSign className="h-5 w-5" />,
  },
];

// Sabit şifre değeri
const ADMIN_PASSWORD = 'admin123';

const Sidebar = () => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [_, setLocation] = useLocation();
  
  // Şifre modalı için state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const toggleSidebar = () => setIsOpen(!isOpen);
  
  const handleNavigation = (href: string) => {
    // Eğer kampanya ekleme sayfasına gidiliyorsa ve modal henüz açık değilse
    if (href === '/ucretlendirme') {
      setPasswordModalOpen(true);
      return;
    }
    
    // Diğer sayfalar için normal navigasyon
    setLocation(href);
    if (isMobile) {
      setIsOpen(false);
    }
  };
  
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === ADMIN_PASSWORD) {
      setPasswordModalOpen(false);
      setPassword('');
      setPasswordError(null);
      setLocation('/ucretlendirme');
      if (isMobile) {
        setIsOpen(false);
      }
    } else {
      setPasswordError('Hatalı şifre. Lütfen tekrar deneyiniz.');
    }
  };

  // Mobil için toggle butonu
  const mobileToggle = (
    <Button 
      variant="ghost" 
      className="p-2 md:hidden fixed top-4 left-4 z-40"
      onClick={toggleSidebar}
    >
      {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
    </Button>
  );

  // Sidebar içeriği
  const sidebarContent = (
    <div className="flex flex-col h-full min-h-screen sticky top-0">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">Sales Time</h2>
      </div>

      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const [isActive] = useRoute(item.href);
            return (
              <Button
                key={item.href}
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleNavigation(item.href)}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Button>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t mt-auto">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Kullanıcı</p>
            <p className="text-xs text-muted-foreground">Rol Yok</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {mobileToggle}
      
      {/* Mobil Sidebar */}
      {isMobile && (
        <div 
          className={`fixed inset-0 z-30 transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <aside className="w-64 h-full bg-background border-r shadow-lg relative">
            {sidebarContent}
          </aside>
        </div>
      )}
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-60 min-h-screen h-full bg-background border-r shadow-lg hidden md:block sticky top-0">
          {sidebarContent}
        </aside>
      )}
      
      {/* Şifre Girişi Modalı */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Yönetici Girişi</DialogTitle>
            <DialogDescription>
              Kampanya yönetimi için yönetici şifresini giriniz.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Input
                  type="password"
                  placeholder="Şifre giriniz"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  className="col-span-3"
                />
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => {
                  setPasswordModalOpen(false);
                  setPassword('');
                  setPasswordError(null);
                }}
              >
                İptal
              </Button>
              <Button type="submit">Giriş</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar;