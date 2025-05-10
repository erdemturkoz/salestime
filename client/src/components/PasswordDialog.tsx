import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

// Sabit şifre değeri (gerçek uygulamada bu değer sunucu tarafında saklanabilir)
const ADMIN_PASSWORD = 'admin123';

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoute: string;
}

const PasswordDialog: React.FC<PasswordDialogProps> = ({ isOpen, onClose, targetRoute }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [_, navigate] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === ADMIN_PASSWORD) {
      onClose();
      navigate(targetRoute);
    } else {
      setError('Hatalı şifre. Lütfen tekrar deneyiniz.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Yönetici Girişi</DialogTitle>
          <DialogDescription>
            Kampanya yönetimi için yönetici şifresini giriniz.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="password"
                type="password"
                placeholder="Şifre giriniz"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="col-span-3"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} type="button">
              İptal
            </Button>
            <Button type="submit">Giriş</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordDialog;