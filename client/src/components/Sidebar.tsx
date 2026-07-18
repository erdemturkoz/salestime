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
  Building,
  BookOpen,
  MessageCircle
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  {
    label: 'Ücret Hesaplama',
    href: '/hesaplama',
    icon: Calculator,
  },
  {
    label: 'Kampanya Ekle',
    href: '/ucretlendirme',
    icon: DollarSign,
    adminOnly: true,
  },
  {
    label: 'WhatsApp İstatistikleri',
    href: '/whatsapp-istatistikleri',
    icon: MessageCircle,
  },
  {
    label: 'Eğitim Tipleri',
    href: '/egitim-tipleri',
    icon: BookOpen,
    fullAdminOnly: true,
  },
  {
    label: 'Kullanıcılar',
    href: '/kullanicilar',
    icon: Users,
    adminOnly: true,
  },
  {
    label: 'Şubeler',
    href: '/subeler',
    icon: Building,
    kurucuAndAbove: true,
  },
];

type NavItemDef = {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  fullAdminOnly?: boolean;
  kurucuAndAbove?: boolean;
};

const NavItem = ({
  item,
  user,
  onNavigate,
}: {
  item: NavItemDef;
  user: any;
  onNavigate: (href: string) => void;
}) => {
  const [isActive] = useRoute(item.href);
  const Icon = item.icon;

  const roles: string[] =
    user && "roller" in user && Array.isArray(user.roller)
      ? user.roller.map((r: any) => r.rol)
      : [];
  const isFullAdmin = roles.includes("Sistem Yöneticisi");
  const isKurucu = roles.includes("Kurucu");
  const canManage = isFullAdmin || isKurucu || roles.includes("Müdür");

  if (item.fullAdminOnly && !isFullAdmin) return null;
  if (item.kurucuAndAbove && !isFullAdmin && !isKurucu) return null;
  if (item.adminOnly && !canManage) return null;

  return (
    <button
      onClick={() => onNavigate(item.href)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        isActive
          ? 'bg-[#F26207] text-white shadow-md shadow-orange-900/30'
          : 'text-gray-400 hover:bg-white/8 hover:text-white'
      }`}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
      <span>{item.label}</span>
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
      )}
    </button>
  );
};

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

  const mobileToggle = (
    <button
      className="p-2 md:hidden fixed top-4 left-4 z-40 rounded-lg bg-[#1a1a1a] text-white shadow-lg"
      onClick={toggleSidebar}
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-screen sticky top-0 bg-[#1a1a1a]">
      {/* Logo / Başlık */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F26207] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <h2 className="text-white font-bold text-base tracking-wide">Sales Time</h2>
        </div>
      </div>

      {/* Navigasyon */}
      <div className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              user={user}
              onNavigate={handleNavigation}
            />
          ))}
        </nav>
      </div>
      
      {/* Alt kullanıcı bölümü */}
      <div className="px-3 py-4 border-t border-white/10">
        {user ? (
          <>
            <div className="flex items-center gap-3 px-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#F26207]/20 border border-[#F26207]/40 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-[#F26207]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user.adi} {user.soyadi}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {'roller' in user && user.roller && user.roller.length > 0 
                    ? `${user.roller[0].rol}${user.roller[0].subeAdi ? ` (${user.roller[0].subeAdi})` : ''}`
                    : 'Rol Yok'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  setIsPending(true);
                  await logout();
                } catch (error) {
                  console.error('Çıkış hatası:', error);
                } finally {
                  setIsPending(false);
                }
              }}
              disabled={isPending}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/8 transition-all duration-150 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {isPending ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
            </button>
          </>
        ) : (
          <button
            onClick={() => setLocation('/giris')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/8 transition-all duration-150"
          >
            <User className="h-4 w-4" />
            Giriş Yap
          </button>
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
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
          <aside className="w-64 h-full relative shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-60 min-h-screen h-full hidden md:block sticky top-0 shadow-xl">
          {sidebarContent}
        </aside>
      )}
    </>
  );
};

export default Sidebar;
