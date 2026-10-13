ALTER TABLE kullanicilar
  ADD COLUMN IF NOT EXISTS global_rol TEXT;

UPDATE kullanicilar AS k
SET global_rol = 'Sistem Yöneticisi'
WHERE EXISTS (
  SELECT 1
  FROM kullanici_sube_rolleri AS ksr
  WHERE ksr.kullanici_id = k.id
    AND ksr.rol = 'Sistem Yöneticisi'
);

DELETE FROM kullanici_sube_rolleri
WHERE rol = 'Sistem Yöneticisi';

CREATE INDEX IF NOT EXISTS idx_kullanicilar_global_rol
  ON kullanicilar (global_rol)
  WHERE global_rol IS NOT NULL;
