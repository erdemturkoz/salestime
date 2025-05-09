import { useState, useEffect } from 'react';

// 768px'den küçük ekranları mobil olarak kabul edelim
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // İlk render'da bir kez çalıştır

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}