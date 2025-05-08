import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { FileTextIcon, CalculatorIcon } from "lucide-react";

const Sidebar = () => {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const isActive = (path: string): boolean => {
    if (path === "/" && location === "/") return true;
    if (path === "/ucretlendirme" && (location === "/" || location === "/ucretlendirme")) return true;
    return location === path;
  };

  const links = [
    {
      text: "Ücretlendirme Şartları",
      href: "/ucretlendirme",
      icon: <FileTextIcon className="h-5 w-5 mr-2" />,
    },
    {
      text: "Ücret Hesaplama",
      href: "/hesaplama",
      icon: <CalculatorIcon className="h-5 w-5 mr-2" />,
    },
  ];

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Dil Kursu Yönetim</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-md z-20 absolute w-full">
          <nav className="p-2">
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={cn(
                    "w-full flex items-center p-3 rounded-md text-left font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "text-neutral-700 hover:bg-neutral-100"
                  )}>
                    {link.icon}
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="bg-white shadow-md md:w-64 md:fixed md:h-full flex-shrink-0 z-10 hidden md:block">
        <div className="p-4 border-b border-neutral-100">
          <h1 className="text-xl font-semibold text-primary">Dil Kursu Yönetim</h1>
        </div>
        
        <nav className="p-2">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={cn(
                  "w-full flex items-center p-3 rounded-md text-left font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "text-neutral-700 hover:bg-neutral-100"
                )}>
                  {link.icon}
                  {link.text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
