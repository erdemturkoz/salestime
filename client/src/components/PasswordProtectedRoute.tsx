import React, { useState } from 'react';
import { useLocation, Route } from 'wouter';
import PasswordDialog from './PasswordDialog';

interface PasswordProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

const PasswordProtectedRoute: React.FC<PasswordProtectedRouteProps> = ({ path, component }) => {
  const [location] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const isPathMatched = location === path;

  // Eğer şu anki lokasyon korumalı yol ise ve dialog henüz açılmadıysa
  React.useEffect(() => {
    if (isPathMatched && !dialogOpen) {
      setDialogOpen(true);
    }
  }, [isPathMatched, dialogOpen]);

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (isPathMatched) {
      // Kullanıcı ana sayfaya yönlendirilecek
      window.history.back();
    }
  };

  return (
    <>
      <Route path={path} component={component} />
      {dialogOpen && (
        <PasswordDialog 
          isOpen={dialogOpen} 
          onClose={handleDialogClose} 
          targetRoute={path} 
        />
      )}
    </>
  );
};

export default PasswordProtectedRoute;