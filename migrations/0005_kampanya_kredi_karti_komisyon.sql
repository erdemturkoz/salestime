ALTER TABLE kampanyalar
  ADD COLUMN IF NOT EXISTS kredi_karti_komisyon_orani NUMERIC(5, 2) NOT NULL DEFAULT 10
  CHECK (kredi_karti_komisyon_orani BETWEEN 0 AND 100);
