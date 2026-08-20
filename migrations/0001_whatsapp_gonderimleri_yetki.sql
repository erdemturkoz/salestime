-- WhatsApp kayıtlarını, şube ve danışman kimlikleri olmadan saklamayı
-- engeller. Yeni kurulumlarda tablo doğrudan güvenli şemayla oluşur; eski
-- kurulumlarda belirsiz kaydı yanlış bir şubeye bağlamak yerine migration durur.
CREATE TABLE IF NOT EXISTS "whatsapp_gonderimleri" (
  "id" serial PRIMARY KEY NOT NULL,
  "ogrenci_adi" text NOT NULL,
  "ogrenci_telefon" text NOT NULL,
  "kampanya_adi" text NOT NULL,
  "egitim_tipi" text NOT NULL,
  "genel_toplam" integer NOT NULL,
  "odeme_tipi" text NOT NULL,
  "taksit_sayisi" integer DEFAULT 1,
  "danisman_adi" text NOT NULL,
  "danisman_soyadi" text NOT NULL,
  "sube_adi" text NOT NULL,
  "sube_id" integer NOT NULL REFERENCES "subeler"("id") ON DELETE RESTRICT,
  "danisman_id" integer NOT NULL REFERENCES "kullanicilar"("id") ON DELETE RESTRICT,
  "gonderilen_at" timestamp DEFAULT now()
);

ALTER TABLE "whatsapp_gonderimleri"
  ADD COLUMN IF NOT EXISTS "sube_id" integer;
ALTER TABLE "whatsapp_gonderimleri"
  ADD COLUMN IF NOT EXISTS "danisman_id" integer;

-- Veri değişmeden önce eski kayıtlardaki her atfın kesin olarak çözümlenip
-- çözümlenemediğini denetle. Böylece aynı adlı şube veya danışmanlarda hiçbir
-- satır keyfi bir eşleşmeye bağlanmaz.
DO $$
DECLARE
  sube_atfi_belirsiz boolean;
  danisman_atfi_belirsiz boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "whatsapp_gonderimleri" AS w
    WHERE (
      w."sube_id" IS NULL
      AND (
        SELECT COUNT(*)
        FROM "subeler" AS s
        WHERE s."sube_adi" = w."sube_adi"
      ) <> 1
    ) OR (
      w."sube_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "subeler" AS s WHERE s."id" = w."sube_id"
      )
    )
  ) INTO sube_atfi_belirsiz;

  IF sube_atfi_belirsiz THEN
    RAISE EXCEPTION
      'WhatsApp kayıtlarında güvenilir şube atfı çözülemedi. Aynı adlı veya eşleşmeyen şubeleri manuel olarak mutabıklaştırın.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM "whatsapp_gonderimleri" AS w
    WHERE (
      w."danisman_id" IS NULL
      AND (
        SELECT COUNT(DISTINCT k."id")
        FROM "kullanicilar" AS k
        INNER JOIN "kullanici_sube_rolleri" AS r
          ON r."kullanici_id" = k."id"
        WHERE k."adi" = w."danisman_adi"
          AND k."soyadi" = w."danisman_soyadi"
          AND (
            r."sube_id" = COALESCE(
              w."sube_id",
              (SELECT s."id" FROM "subeler" AS s WHERE s."sube_adi" = w."sube_adi")
            )
            OR r."rol" = 'Sistem Yöneticisi'
          )
      ) <> 1
    ) OR (
      w."danisman_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "kullanici_sube_rolleri" AS r
        WHERE r."kullanici_id" = w."danisman_id"
          AND (
            r."sube_id" = COALESCE(
              w."sube_id",
              (SELECT s."id" FROM "subeler" AS s WHERE s."sube_adi" = w."sube_adi")
            )
            OR r."rol" = 'Sistem Yöneticisi'
          )
      )
    )
  ) INTO danisman_atfi_belirsiz;

  IF danisman_atfi_belirsiz THEN
    RAISE EXCEPTION
      'WhatsApp kayıtlarında güvenilir danışman atfı çözülemedi. Aynı adlı veya başka şubedeki danışmanları manuel olarak mutabıklaştırın.';
  END IF;
END $$;

-- Şube adına tam olarak bir karşılık varsa sadece o satırı doldur. Aynı adlı
-- birden çok şube varsa UPDATE yapılmaz; aşağıdaki doğrulama migration'ı durdurur.
WITH tekil_sube_eslesmesi AS (
  SELECT w."id", MIN(s."id") AS "sube_id"
  FROM "whatsapp_gonderimleri" AS w
  INNER JOIN "subeler" AS s ON s."sube_adi" = w."sube_adi"
  WHERE w."sube_id" IS NULL
  GROUP BY w."id"
  HAVING COUNT(s."id") = 1
)
UPDATE "whatsapp_gonderimleri" AS w
SET "sube_id" = e."sube_id"
FROM tekil_sube_eslesmesi AS e
WHERE w."id" = e."id";

-- Danışman atfı yalnızca hem isim hem de çözümlenmiş şube içinde tek bir
-- kullanıcıya karşılık geliyorsa doldurulur. Sistem Yöneticisi tüm şubelerde
-- yetkili olduğundan doğrudan şube rolü gibi değerlendirilir. Böylece başka
-- şubedeki aynı adlı danışman eski bir müşteri kaydına keyfi biçimde bağlanamaz.
WITH tekil_danisman_eslesmesi AS (
  SELECT w."id", MIN(k."id") AS "danisman_id"
  FROM "whatsapp_gonderimleri" AS w
  INNER JOIN "kullanicilar" AS k
    ON k."adi" = w."danisman_adi"
   AND k."soyadi" = w."danisman_soyadi"
  INNER JOIN "kullanici_sube_rolleri" AS r
    ON r."kullanici_id" = k."id"
   AND (r."sube_id" = w."sube_id" OR r."rol" = 'Sistem Yöneticisi')
  WHERE w."danisman_id" IS NULL
    AND w."sube_id" IS NOT NULL
  GROUP BY w."id"
  HAVING COUNT(DISTINCT k."id") = 1
)
UPDATE "whatsapp_gonderimleri" AS w
SET "danisman_id" = e."danisman_id"
FROM tekil_danisman_eslesmesi AS e
WHERE w."id" = e."id";

-- Kimliği bulunan satırların görünen snapshot alanlarını kanonik değerlerle
-- eşitle. Yukarıdaki doğrulama bu aşamaya yalnızca güvenilir atıflarla geçişe
-- izin verir.
UPDATE "whatsapp_gonderimleri" AS w
SET "sube_adi" = s."sube_adi"
FROM "subeler" AS s
WHERE w."sube_id" = s."id"
  AND w."sube_adi" IS DISTINCT FROM s."sube_adi";

UPDATE "whatsapp_gonderimleri" AS w
SET "danisman_adi" = k."adi",
    "danisman_soyadi" = k."soyadi"
FROM "kullanicilar" AS k
WHERE w."danisman_id" = k."id"
  AND (w."danisman_adi" IS DISTINCT FROM k."adi"
    OR w."danisman_soyadi" IS DISTINCT FROM k."soyadi");

ALTER TABLE "whatsapp_gonderimleri"
  ALTER COLUMN "sube_id" SET NOT NULL;
ALTER TABLE "whatsapp_gonderimleri"
  ALTER COLUMN "danisman_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    INNER JOIN pg_attribute AS a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'whatsapp_gonderimleri'::regclass
      AND a.attname = 'sube_id'
  ) THEN
    ALTER TABLE "whatsapp_gonderimleri"
      ADD CONSTRAINT "whatsapp_gonderimleri_sube_id_fkey"
      FOREIGN KEY ("sube_id") REFERENCES "subeler"("id") ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    INNER JOIN pg_attribute AS a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'whatsapp_gonderimleri'::regclass
      AND a.attname = 'danisman_id'
  ) THEN
    ALTER TABLE "whatsapp_gonderimleri"
      ADD CONSTRAINT "whatsapp_gonderimleri_danisman_id_fkey"
      FOREIGN KEY ("danisman_id") REFERENCES "kullanicilar"("id") ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "whatsapp_gonderimleri_sube_gonderilen_idx"
  ON "whatsapp_gonderimleri" ("sube_id", "gonderilen_at");