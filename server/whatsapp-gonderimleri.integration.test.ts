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
  egitimTipleri,
  kampanyalar,
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

  const [danismanA, mudurA, danismanB, sistemYoneticisi, kurucuA] = await db
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
        globalRol: "Sistem Yöneticisi",
      },
      {
        adi: "Kurucu",
        soyadi: "Bir",
        telefon: `wp-k-${marker}`,
        sifre: "test-only-password",
        aktif: true,
      },
    ])
    .returning();

  await db.insert(kullaniciSubeRolleri).values([
    { kullaniciId: danismanA.id, subeId: subeA.id, rol: "Satış Danışmanı" },
    { kullaniciId: mudurA.id, subeId: subeA.id, rol: "Müdür" },
    { kullaniciId: danismanB.id, subeId: subeB.id, rol: "Satış Danışmanı" },
    { kullaniciId: kurucuA.id, subeId: subeA.id, rol: "Kurucu" },
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
      .where(inArray(kullaniciSubeRolleri.kullaniciId, [danismanA.id, mudurA.id, danismanB.id, sistemYoneticisi.id, kurucuA.id]));
    await db
      .delete(kullanicilar)
      .where(inArray(kullanicilar.id, [danismanA.id, mudurA.id, danismanB.id, sistemYoneticisi.id, kurucuA.id]));
    await db.delete(subeler).where(inArray(subeler.id, [subeA.id, subeB.id]));
  });

  return {
    subeA,
    subeB,
    danismanA,
    mudurA,
    danismanB,
    sistemYoneticisi,
    kurucuA,
    bKaydi,
    danismanAToken: await createToken(danismanA.id),
    mudurAToken: await createToken(mudurA.id),
    sistemYoneticisiToken: await createToken(sistemYoneticisi.id),
    kurucuAToken: await createToken(kurucuA.id),
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

test("Kurucu eğitim tiplerini yalnızca kendi şubesinde yönetir; ad değişikliği diğer şubeyi etkilemez", async (t) => {
  const f = await seedIkiSube(t);
  const name = `Şube eğitimi ${randomUUID()}`;
  const create = (token: string, subeId: number, egitimTipi = name) =>
    api(token, "/api/egitim-tipleri", { method: "POST", body: JSON.stringify({ egitimTipi, subeId }) });
  const a = await create(f.kurucuAToken, f.subeA.id);
  assert.equal(a.response.status, 201);
  assert.equal(a.body.subeId, f.subeA.id);
  const b = await create(f.sistemYoneticisiToken, f.subeB.id);
  assert.equal(b.response.status, 201, "same education name is allowed independently in another branch");
  assert.equal((await create(f.kurucuAToken, f.subeA.id)).response.status, 409);
  assert.equal((await create(f.kurucuAToken, f.subeB.id, "İzinsiz")).response.status, 403);
  assert.equal((await create(f.mudurAToken, f.subeA.id, "İzinsiz")).response.status, 403);
  assert.equal((await create(f.danismanAToken, f.subeA.id, "İzinsiz")).response.status, 403);
  assert.equal((await api(f.kurucuAToken, `/api/egitim-tipleri?subeId=${f.subeB.id}`)).response.status, 403);
  assert.equal((await api(f.kurucuAToken, `/api/egitim-tipleri/${b.body.id}`)).response.status, 403);
  const ownList = await api(f.kurucuAToken, "/api/egitim-tipleri");
  assert.ok(ownList.body.some((row: any) => row.id === a.body.id));
  assert.ok(ownList.body.every((row: any) => row.subeId === f.subeA.id));
  assert.equal((await api(f.danismanAToken, `/api/egitim-tipleri?subeId=${f.subeA.id}`)).response.status, 200);
  for (const method of ["PUT", "DELETE"]) {
    const result = await api(f.kurucuAToken, `/api/egitim-tipleri/${b.body.id}`, {
      method, ...(method === "PUT" ? { body: JSON.stringify({ egitimTipi: "İzinsiz" }) } : {}),
    });
    assert.equal(result.response.status, 403);
  }
  assert.equal((await api(f.kurucuAToken, `/api/egitim-tipleri/${a.body.id}`, {
    method: "PUT", body: JSON.stringify({ egitimTipi: name, subeId: f.subeB.id }),
  })).response.status, 400);

  const campaignData = {
    kampanyaAdi: "Şubeye özel kampanya", egitimTipi: name, kurSayisi: 1, toplamDersSaati: 120,
    listeFiyati: 65000, nakitFiyati: 48750, indirimOrani: 25, faizOrani: 60,
    kitapFiyati: 5000, maxKrediKartiTaksit: 4, maxSenetTaksit: 6, subeId: f.subeA.id,
  };
  const campaignA = await api(f.kurucuAToken, "/api/kampanyalar", { method: "POST", body: JSON.stringify(campaignData) });
  assert.equal(campaignA.response.status, 201);
  const campaignB = await api(f.sistemYoneticisiToken, "/api/kampanyalar", {
    method: "POST", body: JSON.stringify({ ...campaignData, subeId: f.subeB.id }),
  });
  assert.equal(campaignB.response.status, 201);
  assert.equal((await api(f.kurucuAToken, "/api/kampanyalar", {
    method: "POST", body: JSON.stringify({ ...campaignData, subeId: f.subeB.id }),
  })).response.status, 403);
  const renamed = `${name} yeni`;
  assert.equal((await api(f.kurucuAToken, `/api/egitim-tipleri/${a.body.id}`, {
    method: "PUT", body: JSON.stringify({ egitimTipi: renamed }),
  })).response.status, 200);
  assert.equal((await api(f.kurucuAToken, `/api/kampanyalar/${campaignA.body.id}`)).body.egitimTipi, renamed);
  assert.equal((await api(f.sistemYoneticisiToken, `/api/kampanyalar/${campaignB.body.id}`)).body.egitimTipi, name);
  assert.equal((await api(f.kurucuAToken, `/api/egitim-tipleri/${a.body.id}`, { method: "DELETE" })).response.status, 409);
  for (const method of ["PUT", "DELETE"]) {
    assert.equal((await api(f.kurucuAToken, `/api/kampanyalar/${campaignB.body.id}`, {
      method, ...(method === "PUT" ? { body: JSON.stringify({ ...campaignData, subeId: f.subeB.id }) } : {}),
    })).response.status, 403);
  }
  assert.equal((await api(f.kurucuAToken, `/api/kampanyalar/${campaignA.body.id}`, {
    method: "PUT", body: JSON.stringify({ ...campaignData, egitimTipi: renamed, kampanyaAdi: "Güncel kampanya" }),
  })).response.status, 200);
  assert.equal((await api(f.kurucuAToken, `/api/kampanyalar/${campaignA.body.id}`, { method: "DELETE" })).response.status, 204);
  assert.equal((await api(f.kurucuAToken, `/api/egitim-tipleri/${a.body.id}`, { method: "DELETE" })).response.status, 204);
  // B still uses the same original name, and must not block an unrelated A deletion.
  const independentA = await create(f.kurucuAToken, f.subeA.id);
  assert.equal(independentA.response.status, 201);
  assert.equal((await api(f.kurucuAToken, `/api/egitim-tipleri/${independentA.body.id}`, { method: "DELETE" })).response.status, 204);
  await db.delete(kampanyalar).where(eq(kampanyalar.id, campaignB.body.id));
});

test("Kurucu kendi şubesinde yönetici oluşturur/düzenler/siler; başka şubeye ve genel yetkiye erişemez", async (t) => {
  const f = await seedIkiSube(t);
  const marker = randomUUID();
  const payload = {
    adi: "Test", soyadi: "Yönetici", telefon: `founder-crud-${marker}`, sifre: "test-only-password",
    aktif: true, roller: [{ subeId: f.subeA.id, rol: "Müdür" }],
  };
  const created = await api(f.kurucuAToken, "/api/kullanicilar", { method: "POST", body: JSON.stringify(payload) });
  assert.equal(created.response.status, 201);
  t.after(async () => {
    await db.delete(kullaniciSubeRolleri).where(eq(kullaniciSubeRolleri.kullaniciId, created.body.id));
    await db.delete(kullanicilar).where(eq(kullanicilar.id, created.body.id));
  });
  assert.equal((await api(f.kurucuAToken, `/api/kullanicilar/${created.body.id}`, {
    method: "PATCH", body: JSON.stringify({ ...payload, soyadi: "Güncel", roller: [{ subeId: f.subeA.id, rol: "Kurucu" }] }),
  })).response.status, 200);
  assert.equal((await api(f.kurucuAToken, `/api/kullanicilar/${created.body.id}`, {
    method: "PATCH", body: JSON.stringify({ ...payload, globalRol: "Sistem Yöneticisi" }),
  })).response.status, 403);
  assert.equal((await api(f.kurucuAToken, "/api/kullanicilar", {
    method: "POST", body: JSON.stringify({ ...payload, telefon: `outside-${marker}`, roller: [{ subeId: f.subeB.id, rol: "Müdür" }] }),
  })).response.status, 403);
  for (const method of ["PATCH", "DELETE"]) {
    assert.equal((await api(f.kurucuAToken, `/api/kullanicilar/${f.danismanB.id}`, {
      method, ...(method === "PATCH" ? { body: JSON.stringify({ ...payload, roller: [{ subeId: f.subeB.id, rol: "Satış Danışmanı" }] }) } : {}),
    })).response.status, 403);
  }
  assert.equal((await api(f.kurucuAToken, `/api/kullanicilar/${created.body.id}`, { method: "DELETE" })).response.status, 204);
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

test("Kurucu kendi şubesindeki rolleri görür, Müdür yalnızca danışmanları görür", async (t) => {
  const fixture = await seedIkiSube(t);
  const [kurucuListesi, kurucuSubeleri, mudurListesi] = await Promise.all([
    api(fixture.kurucuAToken, "/api/kullanicilar"),
    api(fixture.kurucuAToken, "/api/subeler"),
    api(fixture.mudurAToken, "/api/kullanicilar"),
  ]);

  assert.equal(kurucuListesi.response.status, 200);
  const kurucuIds = new Set(kurucuListesi.body.map((user: { id: number }) => user.id));
  assert.ok(kurucuIds.has(fixture.kurucuA.id));
  assert.ok(kurucuIds.has(fixture.mudurA.id));
  assert.ok(kurucuIds.has(fixture.danismanA.id));
  assert.equal(kurucuIds.has(fixture.danismanB.id), false);
  assert.equal(kurucuIds.has(fixture.sistemYoneticisi.id), false);

  assert.equal(kurucuSubeleri.response.status, 200);
  assert.deepEqual(kurucuSubeleri.body.map((sube: { id: number }) => sube.id), [fixture.subeA.id]);

  assert.equal(mudurListesi.response.status, 200);
  const mudurIds = new Set(mudurListesi.body.map((user: { id: number }) => user.id));
  assert.deepEqual([...mudurIds], [fixture.danismanA.id]);
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