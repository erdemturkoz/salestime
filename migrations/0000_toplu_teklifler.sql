-- Existing SalesTime installations already contain the legacy tables.
-- This migration intentionally adds only the Toplu Teklifler persistence layer.
CREATE TABLE IF NOT EXISTS "toplu_gonderimler" (
  "id" serial PRIMARY KEY NOT NULL,
  "baslik" text NOT NULL,
  "sube_id" integer NOT NULL REFERENCES "subeler"("id") ON DELETE cascade,
  "sube_adi" text NOT NULL,
  "danisman_id" integer NOT NULL,
  "danisman_adi" text NOT NULL,
  "danisman_soyadi" text NOT NULL,
  "durum" text DEFAULT 'hazir' NOT NULL,
  "saglayici" text DEFAULT 'chrome-extension' NOT NULL,
  "toplam" integer DEFAULT 0 NOT NULL,
  "gonderildi" integer DEFAULT 0 NOT NULL,
  "hata" integer DEFAULT 0 NOT NULL,
  "bekliyor" integer DEFAULT 0 NOT NULL,
  "olusturan_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "started_at" timestamp,
  "completed_at" timestamp,
  CONSTRAINT "toplu_gonderimler_durum_check"
    CHECK ("durum" IN ('hazir', 'aktif', 'duraklatildi', 'durduruldu', 'tamamlandi'))
);

CREATE TABLE IF NOT EXISTS "toplu_teklifler" (
  "id" serial PRIMARY KEY NOT NULL,
  "gonderim_id" integer NOT NULL REFERENCES "toplu_gonderimler"("id") ON DELETE cascade,
  "sube_id" integer NOT NULL REFERENCES "subeler"("id") ON DELETE cascade,
  "ogrenci_adi" text NOT NULL,
  "ogrenci_telefon" text NOT NULL,
  "son_egitim" text NOT NULL,
  "son_kur" text NOT NULL,
  "teklif_kur" integer NOT NULL,
  "kampanya_adi" text NOT NULL,
  "egitim_tipi" text NOT NULL,
  "odeme_1" text NOT NULL,
  "odeme_2" text NOT NULL,
  "odeme_1_detay" text NOT NULL,
  "odeme_2_detay" text NOT NULL,
  "mesaj" text NOT NULL,
  "snapshot" json NOT NULL,
  "durum" text DEFAULT 'bekliyor' NOT NULL,
  "hata_mesaji" text,
  "deneme_sayisi" integer DEFAULT 0 NOT NULL,
  "claim_token" text,
  "claimed_at" timestamp,
  "gonderildi_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "toplu_teklifler_durum_check"
    CHECK ("durum" IN ('bekliyor', 'islemde', 'manuel_bekliyor', 'gonderildi', 'hata')),
  CONSTRAINT "toplu_teklifler_deneme_sayisi_check"
    CHECK ("deneme_sayisi" >= 0 AND "deneme_sayisi" <= 3),
  CONSTRAINT "toplu_teklifler_lease_durum_check"
    CHECK (
      ("durum" = 'islemde' AND "claim_token" IS NOT NULL AND "claimed_at" IS NOT NULL)
      OR
      ("durum" <> 'islemde' AND "claim_token" IS NULL AND "claimed_at" IS NULL)
    )
);

-- Safe for environments where the two tables were previously provisioned
-- through drizzle-kit push before this versioned migration was introduced.
ALTER TABLE IF EXISTS "toplu_teklifler"
  ADD COLUMN IF NOT EXISTS "claim_token" text;
ALTER TABLE IF EXISTS "toplu_teklifler"
  ADD COLUMN IF NOT EXISTS "claimed_at" timestamp;

CREATE INDEX IF NOT EXISTS "toplu_gonderimler_sube_created_idx"
  ON "toplu_gonderimler" ("sube_id", "created_at");
CREATE INDEX IF NOT EXISTS "toplu_teklifler_batch_status_idx"
  ON "toplu_teklifler" ("gonderim_id", "durum");
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
    WHERE conname = 'toplu_teklifler_gonderim_sube_fkey'
      AND conrelid = 'toplu_teklifler'::regclass
  ) THEN
    ALTER TABLE "toplu_teklifler"
      ADD CONSTRAINT "toplu_teklifler_gonderim_sube_fkey"
      FOREIGN KEY ("gonderim_id", "sube_id")
      REFERENCES "toplu_gonderimler" ("id", "sube_id")
      ON DELETE CASCADE;
  END IF;
END $$;

-- Chrome eklentisi için kullanıcı oturumundan bağımsız, kısa ömürlü
-- eşleştirme kodları ve hash'lenmiş dar kapsamlı çalışma izinleri.
CREATE TABLE IF NOT EXISTS "toplu_eklenti_eslestirmeleri" (
  "id" serial PRIMARY KEY NOT NULL,
  "kod_hash" text NOT NULL UNIQUE,
  "gonderim_id" integer NOT NULL REFERENCES "toplu_gonderimler"("id") ON DELETE cascade,
  "sube_id" integer NOT NULL REFERENCES "subeler"("id") ON DELETE cascade,
  "olusturan_id" integer NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "toplu_eklenti_grantleri" (
  "id" serial PRIMARY KEY NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "eslestirme_id" integer NOT NULL REFERENCES "toplu_eklenti_eslestirmeleri"("id") ON DELETE cascade,
  "gonderim_id" integer NOT NULL REFERENCES "toplu_gonderimler"("id") ON DELETE cascade,
  "sube_id" integer NOT NULL REFERENCES "subeler"("id") ON DELETE cascade,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "last_used_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "toplu_eklenti_eslestirme_gonderim_idx"
  ON "toplu_eklenti_eslestirmeleri" ("gonderim_id", "expires_at");
CREATE INDEX IF NOT EXISTS "toplu_eklenti_grant_gonderim_idx"
  ON "toplu_eklenti_grantleri" ("gonderim_id", "expires_at");