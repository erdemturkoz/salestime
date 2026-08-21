-- Toplu gönderim kuyruğu için lease ve durum bütünlüğü. NOT VALID mevcut
-- kurulumlardaki tarihsel veriyi dönüştürmeden yeni/yenilenen satırları korur.
CREATE INDEX IF NOT EXISTS "toplu_teklifler_kuyruk_idx"
  ON "toplu_teklifler" ("gonderim_id", "durum", "claimed_at");
CREATE UNIQUE INDEX IF NOT EXISTS "toplu_teklifler_claim_token_unique"
  ON "toplu_teklifler" ("claim_token")
  WHERE "claim_token" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "toplu_gonderimler_id_sube_unique"
  ON "toplu_gonderimler" ("id", "sube_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'toplu_gonderimler_durum_check'
      AND conrelid = 'toplu_gonderimler'::regclass
  ) THEN
    ALTER TABLE "toplu_gonderimler"
      ADD CONSTRAINT "toplu_gonderimler_durum_check"
      CHECK ("durum" IN ('hazir', 'aktif', 'duraklatildi', 'durduruldu', 'tamamlandi'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'toplu_teklifler_durum_check'
      AND conrelid = 'toplu_teklifler'::regclass
  ) THEN
    ALTER TABLE "toplu_teklifler"
      ADD CONSTRAINT "toplu_teklifler_durum_check"
      CHECK ("durum" IN ('bekliyor', 'islemde', 'manuel_bekliyor', 'gonderildi', 'hata'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'toplu_teklifler_deneme_sayisi_check'
      AND conrelid = 'toplu_teklifler'::regclass
  ) THEN
    ALTER TABLE "toplu_teklifler"
      ADD CONSTRAINT "toplu_teklifler_deneme_sayisi_check"
      CHECK ("deneme_sayisi" >= 0 AND "deneme_sayisi" <= 3)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'toplu_teklifler_lease_durum_check'
      AND conrelid = 'toplu_teklifler'::regclass
  ) THEN
    ALTER TABLE "toplu_teklifler"
      ADD CONSTRAINT "toplu_teklifler_lease_durum_check"
      CHECK (
        ("durum" = 'islemde' AND "claim_token" IS NOT NULL AND "claimed_at" IS NOT NULL)
        OR
        ("durum" <> 'islemde' AND "claim_token" IS NULL AND "claimed_at" IS NULL)
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'toplu_teklifler_gonderim_sube_fkey'
      AND conrelid = 'toplu_teklifler'::regclass
  ) THEN
    ALTER TABLE "toplu_teklifler"
      ADD CONSTRAINT "toplu_teklifler_gonderim_sube_fkey"
      FOREIGN KEY ("gonderim_id", "sube_id")
      REFERENCES "toplu_gonderimler" ("id", "sube_id")
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;