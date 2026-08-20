-- Kullanıcıya ait tüm oturumların ve Bearer token'ların sürümünü tutar.
-- Önceki kullanıcılar sürüm 1 ile başlar; erişim/rol/parola değişimlerinde
-- uygulama bu değeri artırarak tüm eski kimlik bilgilerini geçersizleştirir.
ALTER TABLE "kullanicilar"
  ADD COLUMN IF NOT EXISTS "auth_version" integer NOT NULL DEFAULT 1;