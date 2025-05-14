import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import PasswordDialog from './PasswordDialog';

interface PasswordProtectedRouteProps {
  children: React.ReactNode;
}

const PasswordProtectedRoute: React.FC<PasswordProtectedRouteProps> = ({ children }) => {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(true);

  // Admin anahtarı localStorage'da varsa, kimlik doğrulama yapılmış sayılır
  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      setDialogOpen(false);
    }
  }, []);

  const handleSuccessfulLogin = () => {
    setIsAuthenticated(true);
    setDialogOpen(false);
    localStorage.setItem('adminAuth', 'true');
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (!isAuthenticated) {
      // Kullanıcı ana sayfaya yönlendirilecek
      window.history.back();
    }
  };

  return (
    <>
      {isAuthenticated ? (
        children
      ) : (
        <PasswordDialog 
          isOpen={dialogOpen} 
          onClose={handleDialogClose} 
          onSuccess={handleSuccessfulLogin}
        />
      )}
    </>
  );
};

export default PasswordProtectedRoute;