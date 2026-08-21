-- connect-pg-simple, server/auth.ts içindeki özel "sessions" tablo adını
-- kullanır. Oturum deposunun başlangıçta DDL çalıştırmasına gerek kalmaması
-- için tablo ve son kullanma indeksi migrasyon zincirinde oluşturulur.
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire"
  ON "sessions" ("expire");