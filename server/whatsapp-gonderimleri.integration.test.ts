import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { type AddressInfo } from "node:net";
import express from "express";
import { eq, inArray, sql } from "drizzle-orm";
import { createToken } from "./auth";
import { db, pool } from "./db";
import { registerRoutes } from "./routes";
import {
  kullanicilar,
  kullaniciSubeRolleri,
  subeler,
  whatsappGonderimleri,
} from "@shared/schema";

let baseUrl = "";
let httpServer: Awaited<ReturnType<typeof registerRoutes>>;

before(async () => {
  // Bu eski kayıt tablosu bazı boş test veritabanlarında bulunmayabilir.
  // Testi bağımsız kılmak için üretim şemasındaki zorunlu atıflarla kurulur.
  await db.execute(sql`
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
    )
  `);
  const app = express();
  app.use(express.json());
  httpServer = await registerRoutes(app);
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    httpServer.close((error) => error ? reject(error) : resolve()),
  );
  await pool.end();
});

async function api(token: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = response.status === 204 ? undefined : await response.json();
  return { response, body };
}

async function seedIkiSube(
  t: { after: (callback: () => Promise<void>) => void },
) {
  const marker = randomUUID();
  const [subeA, subeB] = await db
    .insert(subeler)
    .values([
      { subeAdi: `WhatsApp Güvenlik A ${marker}` },
      { subeAdi: `WhatsApp Güvenlik B ${marker}` },
    ])
    .returning();

  const [danismanA, mudurA, danismanB, sistemYoneticisi] = await db
    .insert(kullanicilar)
    .values([
      {
        adi: "Danışman",
        soyadi: "Bir",
        telefon: `wp-a-${marker}`,
        sifre: "test-only-password",
        aktif: true,
      },
      {
        adi: "Müdür",
        soyadi: "Bir",
        telefon: `wp-m-${marker}`,
        sifre: "test-only-password",
        aktif: true,
      },
      {
        adi: "Danışman",
        soyadi: "İki",
        telefon: `wp-b-${marker}`,
        sifre: "test-only-password",
        aktif: true,
      },
      {
        adi: "Sistem",
        soyadi: "Yönetici",
        telefon: `wp-s-${marker}`,
        sifre: "test-only-password",
        aktif: true,
      },
    ])
    .returning();

  await db.insert(kullaniciSubeRolleri).values([
    { kullaniciId: danismanA.id, subeId: subeA.id, rol: "Satış Danışmanı" },
    { kullaniciId: mudurA.id, subeId: subeA.id, rol: "Müdür" },
    { kullaniciId: danismanB.id, subeId: subeB.id, rol: "Satış Danışmanı" },
    { kullaniciId: sistemYoneticisi.id, subeId: subeA.id, rol: "Sistem Yöneticisi" },
  ]);

  const [bKaydi] = await db
    .insert(whatsappGonderimleri)
    .values({
      ogrenciAdi: "B Şubesi Adayı",
      ogrenciTelefon: "905550000002",
      kampanyaAdi: "B Kampanyası",
      egitimTipi: "Genel İngilizce",
      genelToplam: 12_000,
      odemeTipi: "Nakit",
      taksitSayisi: 1,
      subeId: subeB.id,
      subeAdi: subeB.subeAdi,
      danismanId: danismanB.id,
      danismanAdi: danismanB.adi,
      danismanSoyadi: danismanB.soyadi,
    })
    .returning();

  t.after(async () => {
    await db
      .delete(whatsappGonderimleri)
      .where(inArray(whatsappGonderimleri.subeId, [subeA.id, subeB.id]));
    await db
      .delete(kullaniciSubeRolleri)
      .where(inArray(kullaniciSubeRolleri.kullaniciId, [danismanA.id, mudurA.id, danismanB.id, sistemYoneticisi.id]));
    await db
      .delete(kullanicilar)
      .where(inArray(kullanicilar.id, [danismanA.id, mudurA.id, danismanB.id, sistemYoneticisi.id]));
    await db.delete(subeler).where(inArray(subeler.id, [subeA.id, subeB.id]));
  });

  return {
    subeA,
    subeB,
    danismanA,
    mudurA,
    sistemYoneticisi,
    bKaydi,
    danismanAToken: await createToken(danismanA.id),
    mudurAToken: await createToken(mudurA.id),
    sistemYoneticisiToken: await createToken(sistemYoneticisi.id),
  };
}

const yeniKayit = (subeId: number) => ({
  ogrenciAdi: "Yeni Aday",
  ogrenciTelefon: "905550000001",
  kampanyaAdi: "Güvenli Kampanya",
  egitimTipi: "Genel İngilizce",
  genelToplam: 15_000,
  odemeTipi: "Kredi Kartı",
  taksitSayisi: 3,
  subeId,
});

test("WhatsApp kaydı oturum sahibine atanır ve başka şube adına oluşturulamaz", async (t) => {
  const fixture = await seedIkiSube(t);
  const olusturulan = await api(fixture.danismanAToken, "/api/whatsapp-gonderimleri", {
    method: "POST",
    body: JSON.stringify({
      ...yeniKayit(fixture.subeA.id),
      subeAdi: "Sahte Şube",
      danismanId: fixture.bKaydi.danismanId,
      danismanAdi: "Sahte",
      danismanSoyadi: "Kayıt",
    }),
  });

  assert.equal(olusturulan.response.status, 201);
  assert.equal(olusturulan.body.subeId, fixture.subeA.id);
  assert.equal(olusturulan.body.subeAdi, fixture.subeA.subeAdi);
  assert.equal(olusturulan.body.danismanId, fixture.danismanA.id);
  assert.equal(olusturulan.body.danismanAdi, fixture.danismanA.adi);
  assert.equal(olusturulan.body.danismanSoyadi, fixture.danismanA.soyadi);

  const sahteSubeDenemesi = await api(fixture.danismanAToken, "/api/whatsapp-gonderimleri", {
    method: "POST",
    body: JSON.stringify(yeniKayit(fixture.subeB.id)),
  });
  assert.equal(sahteSubeDenemesi.response.status, 403);
});

test("WhatsApp listesi başka şubedeki müşteri verisini göstermez", async (t) => {
  const fixture = await seedIkiSube(t);
  const liste = await api(fixture.danismanAToken, "/api/whatsapp-gonderimleri");
  assert.equal(liste.response.status, 200);
  assert.equal(liste.body.some((kayit: { id: number }) => kayit.id === fixture.bKaydi.id), false);
  assert.ok(liste.body.every((kayit: { subeId: number }) => kayit.subeId === fixture.subeA.id));

  const digerSubeSorgusu = await api(
    fixture.danismanAToken,
    `/api/whatsapp-gonderimleri?subeId=${fixture.subeB.id}`,
  );
  assert.equal(digerSubeSorgusu.response.status, 403);
});

test("Sistem yöneticisi rolü olmayan şubede de kaydı kendi adına oluşturabilir", async (t) => {
  const fixture = await seedIkiSube(t);
  const olusturulan = await api(fixture.sistemYoneticisiToken, "/api/whatsapp-gonderimleri", {
    method: "POST",
    body: JSON.stringify(yeniKayit(fixture.subeB.id)),
  });

  assert.equal(olusturulan.response.status, 201);
  assert.equal(olusturulan.body.subeId, fixture.subeB.id);
  assert.equal(olusturulan.body.danismanId, fixture.sistemYoneticisi.id);
});

test("Müdür başka şubenin WhatsApp kaydını silemez", async (t) => {
  const fixture = await seedIkiSube(t);
  const silmeDenemesi = await api(
    fixture.mudurAToken,
    `/api/whatsapp-gonderimleri/${fixture.bKaydi.id}`,
    { method: "DELETE" },
  );

  assert.equal(silmeDenemesi.response.status, 404);
  const [kayit] = await db
    .select()
    .from(whatsappGonderimleri)
    .where(eq(whatsappGonderimleri.id, fixture.bKaydi.id));
  assert.ok(kayit);
  assert.equal(kayit.subeId, fixture.subeB.id);
});