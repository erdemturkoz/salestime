import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { 
  Calculator, 
  DollarSign, 
  User,
  Users,
  LogOut,
  Menu, 
  X,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

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
  {
    label: 'Kullanıcılar',
    href: '/kullanicilar',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'Şubeler',
    href: '/subeler',
    icon: <Building className="h-5 w-5" />,
  },
];

const Sidebar = () => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [_, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isPending, setIsPending] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  
  const handleNavigation = (href: string) => {
    setLocation(href);
    if (isMobile) {
      setIsOpen(false);
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
        {user ? (
          <>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{user.adi} {user.soyadi}</p>
                <p className="text-xs text-muted-foreground">
                  {'roller' in user && user.roller && user.roller.length > 0 
                    ? `${user.roller[0].rol} ${user.roller[0].subeAdi ? `(${user.roller[0].subeAdi})` : ''}`
                    : 'Rol Yok'
                  }
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => logout()}
              disabled={isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isPending ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
            </Button>
          </>
        ) : (
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setLocation('/giris')}
          >
            <User className="h-4 w-4 mr-2" />
            Giriş Yap
          </Button>
        )}
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
    </>
  );
};

export default Sidebar;