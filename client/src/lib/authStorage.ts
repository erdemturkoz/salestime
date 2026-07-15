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
    localStorage.removeItem('fiyatlama_token');
  } catch (e) {
    console.error('Kullanıcı verileri temizlenemedi:', e);
  }
}

// Kimlik doğrulama token'ını kaydet (iframe'de çerez engellemesine karşı)
export function saveToken(token: string): void {
  try {
    localStorage.setItem('fiyatlama_token', token);
  } catch (e) {
    console.error('Token kaydedilemedi:', e);
  }
}

// Kimlik doğrulama token'ını getir
export function getToken(): string | null {
  try {
    return localStorage.getItem('fiyatlama_token');
  } catch (e) {
    return null;
  }
}

// Kimlik doğrulama token'ını temizle
export function clearToken(): void {
  try {
    localStorage.removeItem('fiyatlama_token');
  } catch (e) {
    console.error('Token temizlenemedi:', e);
  }
}