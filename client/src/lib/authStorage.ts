import { KullaniciWithRollerVeSubeler, Kullanici } from "@shared/schema";

// Kullanıcı verilerini localStorage'da saklamak için yardımcı fonksiyonlar
type User = KullaniciWithRollerVeSubeler | Kullanici;

// Kullanıcı bilgilerini kaydet
export function saveUser(userData: User): void {
  try {
    localStorage.setItem('fiyatlama_user', JSON.stringify(userData));
  } catch (e) {
    console.error('Kullanıcı verileri kaydedilemedi:', e);
  }
}

// Kullanıcı bilgilerini getir
export function getUser(): User | null {
  try {
    const userData = localStorage.getItem('fiyatlama_user');
    return userData ? JSON.parse(userData) : null;
  } catch (e) {
    console.error('Kullanıcı verileri alınamadı:', e);
    return null;
  }
}

// Kullanıcı bilgilerini temizle
export function clearUser(): void {
  try {
    localStorage.removeItem('fiyatlama_user');
  } catch (e) {
    console.error('Kullanıcı verileri temizlenemedi:', e);
  }
}