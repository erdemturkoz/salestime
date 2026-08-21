/**
 * Migration runner — her migration bir kez çalışır.
 *
 * schema_migrations tablosunu ledger olarak kullanır.
 * Render dahil tüm ortamlarda startup'ta güvenle çalışabilir:
 * uygulanan dosyalar tekrar çalıştırılmaz.
 */

import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = ws;

const MIGRATIONS = [
  "migrations/0000_toplu_teklifler.sql",
  "migrations/0001_whatsapp_gonderimleri_yetki.sql",
  "migrations/0002_kullanici_auth_version.sql",
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL ortam değişkeni tanımlı değil.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // Ledger tablosu yoksa oluştur
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of MIGRATIONS) {
      const { rows } = await client.query<{ filename: string }>(
        "SELECT filename FROM schema_migrations WHERE filename = $1",
        [file],
      );

      if (rows.length > 0) {
        console.log(`[migrate] zaten uygulandı: ${file}`);
        continue;
      }

      console.log(`[migrate] uygulanıyor: ${file}`);
      const sql = readFileSync(file, "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file],
        );
        await client.query("COMMIT");
        console.log(`[migrate] tamamlandı: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] HATA:", err);
  process.exit(1);
});
