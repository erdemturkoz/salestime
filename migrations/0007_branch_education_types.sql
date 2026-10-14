-- Preserve the original catalog and IDs. Each existing branch receives its own
-- independent copy; campaign and saved-offer names are left unchanged.
ALTER TABLE egitim_tipleri
  ADD COLUMN IF NOT EXISTS sube_id integer REFERENCES subeler(id) ON DELETE CASCADE;

-- Older installations use different names for the single-column constraint.
DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'egitim_tipleri'::regclass AND contype = 'u'
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
        WHERE attrelid = 'egitim_tipleri'::regclass AND attname = 'egitim_tipi')]
  LOOP
    EXECUTE format('ALTER TABLE egitim_tipleri DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS egitim_tipleri_sube_adi_unique
  ON egitim_tipleri(sube_id, egitim_tipi);

INSERT INTO egitim_tipleri(egitim_tipi, sube_id, created_at)
SELECT legacy.egitim_tipi, s.id, legacy.created_at
FROM egitim_tipleri legacy CROSS JOIN subeler s
WHERE legacy.sube_id IS NULL
ON CONFLICT (sube_id, egitim_tipi) DO NOTHING;

-- Preserve campaigns whose education name was missing from the old catalog.
INSERT INTO egitim_tipleri(egitim_tipi, sube_id)
SELECT DISTINCT egitim_tipi, sube_id FROM kampanyalar WHERE sube_id IS NOT NULL
ON CONFLICT (sube_id, egitim_tipi) DO NOTHING;

-- Enforce branch matching even for concurrent requests and copy/import paths.
-- Rename cascades only to campaigns in the same branch, never saved snapshots.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conrelid = 'kampanyalar'::regclass
        AND conname = 'kampanyalar_branch_education_fk') THEN
    ALTER TABLE kampanyalar ADD CONSTRAINT kampanyalar_branch_education_fk
      FOREIGN KEY (sube_id, egitim_tipi)
      REFERENCES egitim_tipleri(sube_id, egitim_tipi)
      ON UPDATE CASCADE ON DELETE NO ACTION;
  END IF;
END $$;
