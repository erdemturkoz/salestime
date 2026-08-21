import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { type AddressInfo } from "node:net";
import express from "express";
import { and, eq } from "drizzle-orm";
import { createToken } from "./auth";
import { db, pool } from "./db";
import { registerRoutes } from "./routes";
import {
  kullanicilar,
  kullaniciSubeRolleri,
  subeler,
  topluGonderimler,
  topluTeklifler,
  topluEklentiEslestirmeleri,
  topluEklentiGrantleri,
} from "@shared/schema";

const LEASE_MS = 15 * 60 * 1000;

let baseUrl = "";
let httpServer: Awaited<ReturnType<typeof registerRoutes>>;

before(async () => {
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

type TeklifDurumu = "bekliyor" | "islemde" | "gonderildi" | "hata";

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

async function extensionApi(grant: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Extension-Grant ${grant}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = response.status === 204 ? undefined : await response.json();
  return { response, body };
}

async function seedBatch(
  t: { after: (callback: () => Promise<void>) => void },
  teklifler: Array<{ durum: TeklifDurumu; claimToken?: string; claimedAt?: Date }>,
) {
  const marker = randomUUID();
  const [sube] = await db
    .insert(subeler)
    .values({ subeAdi: `Kuyruk Test Şubesi ${marker}` })
    .returning();
  const [kullanici] = await db
    .insert(kullanicilar)
    .values({
      adi: "Kuyruk",
      soyadi: "Test",
      telefon: `90${Date.now().toString().slice(-9)}`,
      sifre: "test-only-password",
      aktif: true,
    })
    .returning();
  await db.insert(kullaniciSubeRolleri).values({
    kullaniciId: kullanici.id,
    subeId: sube.id,
    rol: "Satış Danışmanı",
  });

  const gonderildi = teklifler.filter((teklif) => teklif.durum === "gonderildi").length;
  const hata = teklifler.filter((teklif) => teklif.durum === "hata").length;
  const bekliyor = teklifler.filter((teklif) =>
    ["bekliyor", "islemde"].includes(teklif.durum),
  ).length;
  const [gonderim] = await db
    .insert(topluGonderimler)
    .values({
      baslik: `Kuyruk Test ${marker}`,
      subeId: sube.id,
      subeAdi: sube.subeAdi,
      danismanId: kullanici.id,
      danismanAdi: kullanici.adi,
      danismanSoyadi: kullanici.soyadi,
      durum: "aktif",
      toplam: teklifler.length,
      gonderildi,
      hata,
      bekliyor,
      olusturanId: kullanici.id,
    })
    .returning();
  const satirlar = await db
    .insert(topluTeklifler)
    .values(
      teklifler.map((teklif, index) => ({
        gonderimId: gonderim.id,
        subeId: sube.id,
        ogrenciAdi: `Aday ${index + 1}`,
        ogrenciTelefon: `555000${String(index).padStart(4, "0")}`,
        sonEgitim: "Genel İngilizce",
        sonKur: "A1",
        teklifKur: 2,
        kampanyaAdi: "Kuyruk Test Kampanyası",
        egitimTipi: "Genel İngilizce",
        odeme1: "Nakit",
        odeme2: "Kredi Kartı - 3 Taksit",
        odeme1Detay: "10.000 TL",
        odeme2Detay: "3 × 3.500 TL",
        mesaj: "Test mesajı",
        snapshot: {},
        durum: teklif.durum,
        claimToken: teklif.claimToken ?? null,
        claimedAt: teklif.claimedAt ?? null,
        gonderildiAt: teklif.durum === "gonderildi" ? new Date() : null,
      })),
    )
    .returning();

  t.after(async () => {
    await db.delete(subeler).where(eq(subeler.id, sube.id));
    await db.delete(kullanicilar).where(eq(kullanicilar.id, kullanici.id));
  });

  return {
    gonderim,
    satirlar,
    token: await createToken(kullanici.id),
  };
}

async function createExtensionGrant(
  fixture: Awaited<ReturnType<typeof seedBatch>>,
) {
  const pairingSecret = randomBytes(32).toString("base64url");
  const grantSecret = randomBytes(32).toString("base64url");
  const now = new Date();
  const [pairing] = await db
    .insert(topluEklentiEslestirmeleri)
    .values({
      kodHash: createHash("sha256").update(pairingSecret).digest("hex"),
      gonderimId: fixture.gonderim.id,
      subeId: fixture.gonderim.subeId,
      olusturanId: fixture.gonderim.olusturanId,
      expiresAt: new Date(now.getTime() + 60_000),
      usedAt: now,
    })
    .returning();
  await db.insert(topluEklentiGrantleri).values({
    tokenHash: createHash("sha256").update(grantSecret).digest("hex"),
    eslestirmeId: pairing.id,
    gonderimId: fixture.gonderim.id,
    subeId: fixture.gonderim.subeId,
    expiresAt: new Date(now.getTime() + 60_000),
  });
  return grantSecret;
}

test("eşzamanlı sonuç ve tekrar deneme batch sayaçlarını tutarlı bırakır", async (t) => {
  const claimToken = randomUUID();
  const fixture = await seedBatch(t, [
    { durum: "islemde", claimToken, claimedAt: new Date() },
    { durum: "hata" },
  ]);

  const [sonuc, tekrar] = await Promise.all([
    api(fixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/sonuc`, {
      method: "PATCH",
      body: JSON.stringify({ durum: "gonderildi", claimToken }),
    }),
    api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/basarisizlari-tekrar-dene`, {
      method: "POST",
    }),
  ]);

  assert.equal(sonuc.response.status, 200);
  assert.equal(tekrar.response.status, 200);
  const [gonderim] = await db
    .select()
    .from(topluGonderimler)
    .where(eq(topluGonderimler.id, fixture.gonderim.id));
  const satirlar = await db
    .select()
    .from(topluTeklifler)
    .where(eq(topluTeklifler.gonderimId, fixture.gonderim.id));

  assert.deepEqual(
    satirlar.map((satir) => satir.durum).sort(),
    ["bekliyor", "gonderildi"],
  );
  assert.deepEqual(
    { durum: gonderim.durum, gonderildi: gonderim.gonderildi, hata: gonderim.hata, bekliyor: gonderim.bekliyor },
    { durum: "aktif", gonderildi: 1, hata: 0, bekliyor: 1 },
  );
});

test("duraklatılan veya durdurulan batch yeni kayıt claim edilmesine izin vermez", async (t) => {
  for (const action of ["duraklat", "durdur"] as const) {
    const fixture = await seedBatch(t, [{ durum: "bekliyor" }]);
    const durum = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    const sonraki = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/kuyruk/siradaki`);

    assert.equal(durum.response.status, 200);
    assert.equal(sonraki.response.status, 409);
    const [satir] = await db
      .select()
      .from(topluTeklifler)
      .where(eq(topluTeklifler.id, fixture.satirlar[0].id));
    assert.equal(satir.durum, "bekliyor");
  }
});

test("durdur hard stop'u eski lease'in heartbeat veya sonuç bildirmesini engeller", async (t) => {
  const fixture = await seedBatch(t, [{ durum: "bekliyor" }]);
  const claim = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/kuyruk/siradaki`);
  assert.equal(claim.response.status, 200);

  const stop = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "durdur" }),
  });
  const heartbeat = await api(fixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/kuyruk/heartbeat`, {
    method: "PATCH",
    body: JSON.stringify({ claimToken: claim.body.claimToken }),
  });
  const sonuc = await api(fixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/sonuc`, {
    method: "PATCH",
    body: JSON.stringify({ durum: "gonderildi", claimToken: claim.body.claimToken }),
  });

  assert.equal(stop.response.status, 200);
  assert.equal(heartbeat.response.status, 409);
  assert.equal(sonuc.response.status, 409);
  const [satir] = await db.select().from(topluTeklifler).where(eq(topluTeklifler.id, fixture.satirlar[0].id));
  assert.equal(satir.durum, "bekliyor");
  assert.equal(satir.claimToken, null);
  assert.equal(satir.claimedAt, null);
});

test("hard stop manuel gönderim başlatma ve onaylama yolundan aşılamaz", async (t) => {
  const fixture = await seedBatch(t, [{ durum: "bekliyor" }]);
  const manuelBaslat = await api(fixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/manuel-gonderim`, {
    method: "POST",
  });
  assert.equal(manuelBaslat.response.status, 200);

  const stop = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "durdur" }),
  });
  const manuelOnay = await api(fixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/manuel-gonderim/onayla`, {
    method: "POST",
  });
  const yenidenBaslat = await api(fixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/manuel-gonderim`, {
    method: "POST",
  });

  assert.equal(stop.response.status, 200);
  assert.equal(manuelOnay.response.status, 409);
  assert.equal(yenidenBaslat.response.status, 409);
});

test("duraklatma mevcut lease'in heartbeat ile yenilenmesine ve bitmesine izin verir", async (t) => {
  const fixture = await seedBatch(t, [{ durum: "bekliyor" }]);
  const claim = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/kuyruk/siradaki`);
  assert.equal(claim.response.status, 200);

  const pause = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "duraklat" }),
  });
  const heartbeat = await api(fixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/kuyruk/heartbeat`, {
    method: "PATCH",
    body: JSON.stringify({ claimToken: claim.body.claimToken }),
  });
  const sonuc = await api(fixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/sonuc`, {
    method: "PATCH",
    body: JSON.stringify({ durum: "gonderildi", claimToken: claim.body.claimToken }),
  });

  assert.equal(pause.response.status, 200);
  assert.equal(heartbeat.response.status, 200);
  assert.equal(sonuc.response.status, 200);
});

test("geçersiz veya süresi bitmiş claim token teklif sonucunu değiştiremez", async (t) => {
  const claimToken = randomUUID();
  const fixture = await seedBatch(t, [
    { durum: "islemde", claimToken, claimedAt: new Date() },
  ]);
  const teklifId = fixture.satirlar[0].id;

  const gecersizSonuc = await api(fixture.token, `/api/toplu-teklifler/${teklifId}/sonuc`, {
    method: "PATCH",
    body: JSON.stringify({ durum: "gonderildi", claimToken: randomUUID() }),
  });
  assert.equal(gecersizSonuc.response.status, 409);

  await db
    .update(topluTeklifler)
    .set({ claimedAt: new Date(Date.now() - LEASE_MS - 1_000) })
    .where(and(eq(topluTeklifler.id, teklifId), eq(topluTeklifler.claimToken, claimToken)));
  const heartbeat = await api(fixture.token, `/api/toplu-teklifler/${teklifId}/kuyruk/heartbeat`, {
    method: "PATCH",
    body: JSON.stringify({ claimToken }),
  });
  const suresiBitmisSonuc = await api(fixture.token, `/api/toplu-teklifler/${teklifId}/sonuc`, {
    method: "PATCH",
    body: JSON.stringify({ durum: "gonderildi", claimToken }),
  });

  assert.equal(heartbeat.response.status, 409);
  assert.equal(suresiBitmisSonuc.response.status, 409);
  const [satir] = await db.select().from(topluTeklifler).where(eq(topluTeklifler.id, teklifId));
  assert.equal(satir.durum, "islemde");
  assert.equal(satir.claimToken, claimToken);
});

test("heartbeat geçerli lease'i yeniler ve claim sabit idempotency anahtarı döndürür", async (t) => {
  const fixture = await seedBatch(t, [{ durum: "bekliyor" }]);
  const claim = await api(
    fixture.token,
    `/api/toplu-gonderimler/${fixture.gonderim.id}/kuyruk/siradaki`,
  );

  assert.equal(claim.response.status, 200);
  assert.equal(claim.body.idempotencyKey, `toplu-teklif-${fixture.satirlar[0].id}`);
  const claimToken = claim.body.claimToken as string;
  const oncekiLease = new Date(Date.now() - 5 * 60 * 1000);
  await db
    .update(topluTeklifler)
    .set({ claimedAt: oncekiLease })
    .where(eq(topluTeklifler.id, fixture.satirlar[0].id));

  const heartbeat = await api(
    fixture.token,
    `/api/toplu-teklifler/${fixture.satirlar[0].id}/kuyruk/heartbeat`,
    { method: "PATCH", body: JSON.stringify({ claimToken }) },
  );
  assert.equal(heartbeat.response.status, 200);
  assert.ok(new Date(heartbeat.body.leaseExpiresAt).getTime() > Date.now());

  const [yenilenmis] = await db
    .select()
    .from(topluTeklifler)
    .where(eq(topluTeklifler.id, fixture.satirlar[0].id));
  assert.ok(yenilenmis.claimedAt);
  assert.ok(yenilenmis.claimedAt!.getTime() > oncekiLease.getTime());
});

test("başarısızları tekrar deneme idempotenttir ve üç deneme sınırına uyar", async (t) => {
  const fixture = await seedBatch(t, [{ durum: "hata" }]);
  const teklifId = fixture.satirlar[0].id;
  await db
    .update(topluTeklifler)
    .set({ denemeSayisi: 2 })
    .where(eq(topluTeklifler.id, teklifId));

  const ilkRetry = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/basarisizlari-tekrar-dene`, {
    method: "POST",
  });
  const ikinciRetry = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/basarisizlari-tekrar-dene`, {
    method: "POST",
  });
  assert.equal(ilkRetry.response.status, 200);
  assert.equal(ilkRetry.body.tekrarKuyrugaAlinan, 1);
  assert.equal(ikinciRetry.response.status, 200);
  assert.equal(ikinciRetry.body.tekrarKuyrugaAlinan, 0);

  const claim = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/kuyruk/siradaki`);
  assert.equal(claim.response.status, 200);
  const hata = await api(fixture.token, `/api/toplu-teklifler/${teklifId}/sonuc`, {
    method: "PATCH",
    body: JSON.stringify({ durum: "hata", claimToken: claim.body.claimToken }),
  });
  assert.equal(hata.response.status, 200);

  const limitliRetry = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/basarisizlari-tekrar-dene`, {
    method: "POST",
  });
  const bosKuyruk = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/kuyruk/siradaki`);
  assert.equal(limitliRetry.response.status, 200);
  assert.equal(limitliRetry.body.tekrarKuyrugaAlinan, 0);
  assert.equal(bosKuyruk.response.status, 409);
});

test("extension grant yalnızca kendi batch'inde çalışır ve duraklatılmış lease'i yeniler", async (t) => {
  const fixture = await seedBatch(t, [{ durum: "bekliyor" }]);
  const otherFixture = await seedBatch(t, [{ durum: "bekliyor" }]);
  const grant = await createExtensionGrant(fixture);

  const disaridakiKuyruk = await extensionApi(
    grant,
    `/api/toplu-gonderimler/${otherFixture.gonderim.id}/kuyruk/siradaki`,
  );
  const claim = await extensionApi(grant, `/api/toplu-gonderimler/${fixture.gonderim.id}/kuyruk/siradaki`);
  const pause = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "duraklat" }),
  });
  const heartbeat = await extensionApi(grant, `/api/toplu-teklifler/${fixture.satirlar[0].id}/kuyruk/heartbeat`, {
    method: "PATCH",
    body: JSON.stringify({ claimToken: claim.body.claimToken }),
  });

  assert.equal(disaridakiKuyruk.response.status, 403);
  assert.equal(claim.response.status, 200);
  assert.equal(pause.response.status, 200);
  assert.equal(heartbeat.response.status, 200);
});

test("durdurulmuş batch extension grant lease'inin sonuç yazmasını engeller", async (t) => {
  const fixture = await seedBatch(t, [{ durum: "bekliyor" }]);
  const grant = await createExtensionGrant(fixture);
  const claim = await extensionApi(grant, `/api/toplu-gonderimler/${fixture.gonderim.id}/kuyruk/siradaki`);
  assert.equal(claim.response.status, 200);

  const stop = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "durdur" }),
  });
  const sonuc = await extensionApi(grant, `/api/toplu-teklifler/${fixture.satirlar[0].id}/sonuc`, {
    method: "PATCH",
    body: JSON.stringify({ durum: "gonderildi", claimToken: claim.body.claimToken }),
  });

  assert.equal(stop.response.status, 200);
  assert.equal(sonuc.response.status, 401);
});

test("eşzamanlı stop ve sonuç isteği tek bir sıralı durum geçişine indirgenir", async (t) => {
  const fixture = await seedBatch(t, [{ durum: "bekliyor" }]);
  const claim = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/kuyruk/siradaki`);
  assert.equal(claim.response.status, 200);

  const [stop, sonuc] = await Promise.all([
    api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "durdur" }),
    }),
    api(fixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/sonuc`, {
      method: "PATCH",
      body: JSON.stringify({ durum: "gonderildi", claimToken: claim.body.claimToken }),
    }),
  ]);

  assert.ok([200, 409].includes(stop.response.status));
  assert.ok([200, 409].includes(sonuc.response.status));
  assert.ok(stop.response.status === 200 || sonuc.response.status === 200);
  const [satir] = await db.select().from(topluTeklifler).where(eq(topluTeklifler.id, fixture.satirlar[0].id));
  assert.notEqual(satir.durum, "islemde");
  assert.equal(satir.claimToken, null);
});

test("başka şubenin Bearer oturumu teklif lease'ini yenileyemez veya sonuçlayamaz", async (t) => {
  const fixture = await seedBatch(t, [{ durum: "bekliyor" }]);
  const otherFixture = await seedBatch(t, [{ durum: "bekliyor" }]);
  const claim = await api(fixture.token, `/api/toplu-gonderimler/${fixture.gonderim.id}/kuyruk/siradaki`);
  assert.equal(claim.response.status, 200);

  const heartbeat = await api(otherFixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/kuyruk/heartbeat`, {
    method: "PATCH",
    body: JSON.stringify({ claimToken: claim.body.claimToken }),
  });
  const sonuc = await api(otherFixture.token, `/api/toplu-teklifler/${fixture.satirlar[0].id}/sonuc`, {
    method: "PATCH",
    body: JSON.stringify({ durum: "gonderildi", claimToken: claim.body.claimToken }),
  });

  assert.equal(heartbeat.response.status, 403);
  assert.equal(sonuc.response.status, 403);
});