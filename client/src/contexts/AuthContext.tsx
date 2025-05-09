import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '@shared/schema';

// Auth durumunu tutan tip
interface AuthState {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userName: string | null;
  userBranch: {
    id: number;
    name: string;
  } | null;
}

// Context'in API'si
interface AuthContextType extends AuthState {
  login: (username: string, role: UserRole, branchId: number, branchName: string) => void;
  logout: () => void;
  canAccessPath: (path: string) => boolean;
}

// Default context değerleri
const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  userRole: null,
  userName: null,
  userBranch: null,
  login: () => {},
  logout: () => {},
  canAccessPath: () => false,
};

// Context'i oluştur
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Role-bazlı yetkileri tanımla
const roleAccess = {
  [UserRole.ADMIN]: ['/', '/ucretlendirme', '/hesaplama', '/ayarlar', '/subeler'],
  [UserRole.KURUCU]: ['/', '/ucretlendirme', '/hesaplama', '/ayarlar', '/subeler'],
  [UserRole.SUBE_MUDURU]: ['/', '/hesaplama'],
  [UserRole.SATIS_DANISMANI]: ['/', '/hesaplama'],
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Mock auth durumu - localStorage'dan al
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userRole: null,
    userName: null,
    userBranch: null,
  });

  // Component mount olduğunda localStorage'dan bilgileri al
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    const storedName = localStorage.getItem('userName');
    const storedBranchId = localStorage.getItem('userBranchId');
    const storedBranchName = localStorage.getItem('userBranchName');

    // Eğer localStorage'da veri varsa auth durumunu güncelle
    if (storedRole && Object.values(UserRole).includes(storedRole as UserRole)) {
      setAuthState({
        isAuthenticated: true,
        userRole: storedRole as UserRole,
        userName: storedName,
        userBranch: storedBranchId && storedBranchName 
          ? { id: parseInt(storedBranchId), name: storedBranchName } 
          : null,
      });
    }
  }, []);

  // Giriş yap
  const login = (username: string, role: UserRole, branchId: number, branchName: string) => {
    // localStorage'a kaydet
    localStorage.setItem('userName', username);
    localStorage.setItem('userRole', role);
    localStorage.setItem('userBranchId', branchId.toString());
    localStorage.setItem('userBranchName', branchName);

    // Auth durumunu güncelle
    setAuthState({
      isAuthenticated: true,
      userRole: role,
      userName: username,
      userBranch: { id: branchId, name: branchName },
    });
  };

  // Çıkış yap
  const logout = () => {
    // localStorage'dan sil
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userBranchId');
    localStorage.removeItem('userBranchName');

    // Auth durumunu güncelle
    setAuthState({
      isAuthenticated: false,
      userRole: null,
      userName: null,
      userBranch: null,
    });
  };

  // Belirli bir path'e erişim yetkisi var mı kontrol et
  const canAccessPath = (path: string): boolean => {
    if (!authState.isAuthenticated || !authState.userRole) {
      return false;
    }

    const allowedPaths = roleAccess[authState.userRole] || [];
    return allowedPaths.some(allowedPath => 
      path === allowedPath || path.startsWith(`${allowedPath}/`)
    );
  };

  // Context değerlerini sağla
  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    canAccessPath,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook kullanımı için
export const useAuth = () => useContext(AuthContext);