import { Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { 
  insertKampanyaSchema, 
  insertSubeSchema, 
  insertKullaniciSchema, 
  insertKullaniciSubeRolSchema,
  insertEgitimTipiSchema,
  insertWhatsappGonderimSchema,
  loginSchema,
  changePasswordSchema,
  Roller,
  kullaniciSubeRolleri,
  topluGonderimler,
  topluTeklifler
} from "@shared/schema";
import { db } from "./db";
import { z } from "zod";
import { setupSession, attachUser, isAuthenticated, isAdmin, isFullAdmin, canManageCampaigns, isFullAdminUser, isKurucuUser, isMudurUser, getUserSubeIds, getManagedSubeIds, getSessionUser, login, logout, getCurrentUser, changePassword, hashPassword } from "./auth";
import { computeOffer } from "../client/src/hooks/useOfferCalculator";
import "./types"; // Session tiplerini yükle

// Müdürün gönderdiği rollerin geçerliliği: yalnızca kendi şubesine "Satış Danışmanı"
function mudurRollerGecerliMi(roller: any[], managed: number[]): boolean {
  if (!Array.isArray(roller) || roller.length === 0) return false;
  return roller.every((r) => r.rol === "Satış Danışmanı" && managed.includes(Number(r.subeId)));
}

// Hedef kullanıcı müdür tarafından yönetilebilir mi?
// (kullanıcının TÜM rolleri müdürün şubelerinde ve yalnızca "Satış Danışmanı" olmalı)
function kullaniciMudureAitMi(kullanici: any, managed: number[]): boolean {
  if (!kullanici || !Array.isArray(kullanici.roller) || kullanici.roller.length === 0) return false;
  return kullanici.roller.every((r: any) =>
    r.rol === "Satış Danışmanı" && managed.includes(Number(r.subeId)));
}

function topluTeklifSubeErisimiVarMi(user: any, subeId: number): boolean {
  if (isFullAdminUser(user)) return true;
  if (isKurucuUser(user)) return getManagedSubeIds(user).includes(subeId);
  return getUserSubeIds(user).includes(subeId);
}

const topluTeklifSatirSchema = z.object({
  ogrenciAdi: z.string().trim().min(2).max(150),
  ogrenciTelefon: z.string().trim().min(10).max(20),
  sonEgitim: z.string().trim().min(1).max(120),
  sonKur: z.string().trim().min(1).max(60),
  teklifKur: z.number().int().positive().max(24),
  kampanyaId: z.number().int().positive(),
  odeme1: z.object({ odemeTipi: z.enum(["nakit", "kredi-karti", "senet"]), taksitSayisi: z.number().int().min(1).max(24) }),
  odeme2: z.object({ odemeTipi: z.enum(["nakit", "kredi-karti", "senet"]), taksitSayisi: z.number().int().min(1).max(24) }),
});

const topluGonderimOlusturSchema = z.object({
  baslik: z.string().trim().min(1).max(160),
  subeId: z.number().int().positive(),
  teklifler: z.array(topluTeklifSatirSchema).min(1).max(1000),
});

function topluPara(tutar: number): string {
  return `${Math.round(tutar).toLocaleString("tr-TR")} TL`;
}

function topluOdemeDetayi(teklif: any): string {
  if (teklif.form.odemeTipi === "nakit") return `${teklif.odemeTipiText} · ${topluPara(teklif.ozelFiyat)}`;
  const pesinat = teklif.pesinat > 0 ? `${topluPara(teklif.pesinat)} peşinat + ` : "";
  return `${teklif.odemeTipiText} · ${pesinat}${teklif.form.taksitSayisi} × ${topluPara(teklif.aylikOdeme)}`;
}

function topluOdemeEtiketi(odeme: { odemeTipi: string; taksitSayisi: number }): string {
  if (odeme.odemeTipi === "nakit") return "Nakit";
  return `${odeme.odemeTipi === "kredi-karti" ? "Kredi Kartı" : "Senet"} - ${odeme.taksitSayisi} Taksit`;
}

function topluMesajOlustur(satir: any, teklif1: any, teklif2: any, subeAdi: string, user: any): string {
  const bitis = new Date();
  bitis.setDate(bitis.getDate() + teklif1.form.gecerlilikGunu);
  const tarih = bitis.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const teklifSatiri = (baslik: string, teklif: any) => [
    `*${baslik}*`,
    `Eğitim: ${teklif.egitimTipi}`,
    `Kur: ${teklif.kurSayisi} / ${teklif.dersSaati} Ders Saati`,
    `Toplam: ${topluPara(teklif.ozelFiyat)}`,
    `Ödeme: ${topluOdemeDetayi(teklif)}`,
  ].join("\n");
  return [
    `Merhaba ${satir.ogrenciAdi},`, "",
    `English Time ${subeAdi} olarak mevcut eğitim durumunuza göre iki farklı teklif seçeneği hazırladık.`, "",
    teklifSatiri("1. TEKLİF", teklif1), "", teklifSatiri("2. TEKLİF", teklif2), "",
    `Teklif geçerlilik süresi: ${tarih}`, "",
    `${user?.adi || ""} ${user?.soyadi || ""}`.trim(), "Eğitim Danışmanı", `English Time ${subeAdi}`, user?.telefon || "",
  ].filter((line) => line !== "").join("\n");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Oturum yönetimi kurulumu
  setupSession(app);
  
  // Her istekte oturum çerezi VEYA Bearer token'dan kullanıcıyı çöz (iframe desteği)
  app.use(attachUser);
  
  // Auth routes
  app.post("/api/auth/login", login);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/current-user", getCurrentUser);
  app.post("/api/auth/change-password", isAuthenticated, changePassword);
  // Şube API routes - Tüm kullanıcılar görebilir (Kurucu yalnızca kendi şubelerini görür)
  app.get("/api/subeler", isAuthenticated, async (req, res) => {
    try {
      const user = getSessionUser(req);
      const tumSubeler = await storage.getAllSubeler();
      // Tam admin her şeyi görür; Kurucu sadece kendi şubelerini görür
      if (isFullAdminUser(user)) {
        return res.json(tumSubeler);
      }
      if (isKurucuUser(user)) {
        const managed = getManagedSubeIds(user);
        return res.json(tumSubeler.filter((s: any) => managed.includes(s.id)));
      }
      // Müdür ve Danışman kendi şubelerini görür
      const myIds = getUserSubeIds(user);
      if (myIds.length > 0) {
        return res.json(tumSubeler.filter((s: any) => myIds.includes(s.id)));
      }
      res.json(tumSubeler);
    } catch (error) {
      console.error("Şubeler API hatası:", error);
      res.status(500).json({ error: "Şubeler yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.get("/api/subeler/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const sube = await storage.getSube(parseInt(id));
      
      if (!sube) {
        return res.status(404).json({ error: "Şube bulunamadı" });
      }
      
      res.json(sube);
    } catch (error) {
      console.error("Şube API hatası:", error);
      res.status(500).json({ error: "Şube yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.post("/api/subeler", isFullAdmin, async (req, res) => {
    try {
      const subeData = insertSubeSchema.parse(req.body);
      const newSube = await storage.createSube(subeData);
      res.status(201).json(newSube);
    } catch (error) {
      console.error("Şube oluşturma hatası:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Şube oluşturulurken bir hata oluştu", details: String(error) });
    }
  });

  app.patch("/api/subeler/:id", isFullAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const subeData = insertSubeSchema.parse(req.body);
      const updatedSube = await storage.updateSube(parseInt(id), subeData);
      
      if (!updatedSube) {
        return res.status(404).json({ error: "Güncellenecek şube bulunamadı" });
      }
      
      res.json(updatedSube);
    } catch (error) {
      console.error("Şube güncelleme hatası:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Şube güncellenirken bir hata oluştu", details: String(error) });
    }
  });

  app.delete("/api/subeler/:id", isFullAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSube(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Silinecek şube bulunamadı" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Şube silme hatası:", error);
      res.status(500).json({ error: "Şube silinirken bir hata oluştu", details: String(error) });
    }
  });

  // Kullanıcı API routes
  app.get("/api/kullanicilar", canManageCampaigns, async (req, res) => {
    try {
      const user = getSessionUser(req);
      const kullanicilar = await storage.getAllKullanicilar();

      // Müdür: yalnızca kendi şubesindeki danışmanları görebilir
      // (tüm rolleri kendi şubesinde ve yalnızca "Satış Danışmanı" olan kullanıcılar)
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        const filtrelenmis = (kullanicilar as any[]).filter((k) =>
          kullaniciMudureAitMi(k, managed)
        );
        return res.json(filtrelenmis);
      }

      res.json(kullanicilar);
    } catch (error) {
      console.error("Kullanıcılar API hatası:", error);
      res.status(500).json({ error: "Kullanıcılar yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.get("/api/kullanicilar/:id", canManageCampaigns, async (req, res) => {
    try {
      const { id } = req.params;
      const kullanici = await storage.getKullanici(parseInt(id));
      
      if (!kullanici) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }

      // Müdür: yalnızca kendi şubesindeki danışmanları görebilir
      const user = getSessionUser(req);
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        if (!kullaniciMudureAitMi(kullanici, managed)) {
          return res.status(403).json({ error: "Bu kullanıcıya erişim yetkiniz yok." });
        }
      }
      
      res.json(kullanici);
    } catch (error) {
      console.error("Kullanıcı API hatası:", error);
      res.status(500).json({ error: "Kullanıcı yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.post("/api/kullanicilar", canManageCampaigns, async (req, res) => {
    try {
      const user = getSessionUser(req);
      // Roller varsa ayrı tut (Şema dışı veriler)
      const roller = req.body.roller || [];

      // Müdür: yalnızca kendi şubesine "Satış Danışmanı" ekleyebilir
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        if (!mudurRollerGecerliMi(roller, managed)) {
          return res.status(403).json({ error: "Şube müdürü yalnızca kendi şubesine Satış Danışmanı ekleyebilir." });
        }
      }

      // Kullanıcı veri şemasını doğrula
      const kullaniciData = insertKullaniciSchema.parse(req.body);
      
      // Şifreyi hashle (düz metin saklanmamalı; giriş bcrypt ile doğrulanıyor)
      const hashedData = {
        ...kullaniciData,
        sifre: await hashPassword(kullaniciData.sifre),
      };
      
      // Yeni kullanıcıyı oluştur
      const newKullanici = await storage.createKullanici(hashedData);
      
      // Roller varsa, her rol için kullanıcı-şube ilişkisini ekle
      if (roller && roller.length > 0) {
        for (const rol of roller) {
          await storage.addKullaniciToSube(
            newKullanici.id, 
            rol.subeId, 
            rol.rol
          );
        }
      }
      
      // Güncel roller dahil kullanıcı bilgisini al
      const kullaniciWithRoller = await storage.getKullanici(newKullanici.id);
      
      res.status(201).json(kullaniciWithRoller);
    } catch (error) {
      console.error("Kullanıcı oluşturma hatası:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Kullanıcı oluşturulurken bir hata oluştu", details: String(error) });
    }
  });

  app.patch("/api/kullanicilar/:id", canManageCampaigns, async (req, res) => {
    try {
      const { id } = req.params;
      const parsedId = parseInt(id);
      const user = getSessionUser(req);

      // Roller varsa ayrı tut (Şema dışı veriler)
      const roller = req.body.roller || [];

      // Müdür: yalnızca kendi şubesindeki danışmanı düzenleyebilir ve
      // yalnızca kendi şubesine "Satış Danışmanı" rolü atayabilir
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        const mevcut = await storage.getKullanici(parsedId);
        if (!mevcut || !kullaniciMudureAitMi(mevcut, managed)) {
          return res.status(403).json({ error: "Bu kullanıcıyı düzenleme yetkiniz yok." });
        }
        if (!mudurRollerGecerliMi(roller, managed)) {
          return res.status(403).json({ error: "Şube müdürü yalnızca kendi şubesine Satış Danışmanı atayabilir." });
        }
      }
      
      // Kullanıcı veri şemasını doğrula
      const kullaniciData = insertKullaniciSchema.parse(req.body);
      
      // Kullanıcıyı güncelle
      const updatedKullanici = await storage.updateKullanici(parsedId, kullaniciData);
      
      if (!updatedKullanici) {
        return res.status(404).json({ error: "Güncellenecek kullanıcı bulunamadı" });
      }
      
      // Önce mevcut kullanıcı-şube ilişkilerini sil
      // Bu işlem, kullanıcının güncel şube-rol listesinin tamamen yeni duruma geçmesini sağlar
      const existingRoller = await db
        .select()
        .from(kullaniciSubeRolleri)
        .where(eq(kullaniciSubeRolleri.kullaniciId, parsedId));
      
      for (const rol of existingRoller) {
        await storage.removeKullaniciFromSube(parsedId, rol.subeId);
      }
      
      // Yeni rolleri ekle
      if (roller && roller.length > 0) {
        for (const rol of roller) {
          await storage.addKullaniciToSube(
            parsedId, 
            rol.subeId, 
            rol.rol
          );
        }
      }
      
      // Güncel roller dahil kullanıcı bilgisini al
      const kullaniciWithRoller = await storage.getKullanici(parsedId);
      
      res.json(kullaniciWithRoller);
    } catch (error) {
      console.error("Kullanıcı güncelleme hatası:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Kullanıcı güncellenirken bir hata oluştu", details: String(error) });
    }
  });

  app.delete("/api/kullanicilar/:id", canManageCampaigns, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getSessionUser(req);

      // Müdür: yalnızca kendi şubesindeki danışmanı silebilir
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        const mevcut = await storage.getKullanici(parseInt(id));
        if (!mevcut || !kullaniciMudureAitMi(mevcut, managed)) {
          return res.status(403).json({ error: "Bu kullanıcıyı silme yetkiniz yok." });
        }
      }

      const success = await storage.deleteKullanici(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Silinecek kullanıcı bulunamadı" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Kullanıcı silme hatası:", error);
      res.status(500).json({ error: "Kullanıcı silinirken bir hata oluştu", details: String(error) });
    }
  });

  // Kullanıcı-Şube ilişkileri API
  app.post("/api/kullanicilar/:kullaniciId/subeler/:subeId", canManageCampaigns, async (req, res) => {
    try {
      const { kullaniciId, subeId } = req.params;
      const { rol } = req.body;
      const user = getSessionUser(req);
      
      if (!Object.values(Roller).includes(rol)) {
        return res.status(400).json({ error: "Geçersiz rol. Roller: Kurucu, Müdür, Satış Danışmanı" });
      }

      // Müdür: yalnızca kendi şubesine "Satış Danışmanı" ekleyebilir
      // ve yalnızca yeni (rolsüz) ya da kendi yönettiği danışman kullanıcıya
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        if (rol !== "Satış Danışmanı" || !managed.includes(parseInt(subeId))) {
          return res.status(403).json({ error: "Şube müdürü yalnızca kendi şubesine Satış Danışmanı ekleyebilir." });
        }
        const hedef = await storage.getKullanici(parseInt(kullaniciId));
        const rolsuz = !hedef || !Array.isArray((hedef as any).roller) || (hedef as any).roller.length === 0;
        if (!rolsuz && !kullaniciMudureAitMi(hedef, managed)) {
          return res.status(403).json({ error: "Bu kullanıcı üzerinde işlem yapma yetkiniz yok." });
        }
      }
      
      const kullaniciSubeRol = await storage.addKullaniciToSube(parseInt(kullaniciId), parseInt(subeId), rol);
      res.status(201).json(kullaniciSubeRol);
    } catch (error) {
      console.error("Kullanıcı şubeye ekleme hatası:", error);
      res.status(500).json({ error: "Kullanıcı şubeye eklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.delete("/api/kullanicilar/:kullaniciId/subeler/:subeId", canManageCampaigns, async (req, res) => {
    try {
      const { kullaniciId, subeId } = req.params;
      const user = getSessionUser(req);

      // Müdür: yalnızca kendi şubesinden ve yalnızca yönettiği danışmandan çıkarma yapabilir
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        if (!managed.includes(parseInt(subeId))) {
          return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
        }
        const hedef = await storage.getKullanici(parseInt(kullaniciId));
        if (!hedef || !kullaniciMudureAitMi(hedef, managed)) {
          return res.status(403).json({ error: "Bu kullanıcı üzerinde işlem yapma yetkiniz yok." });
        }
      }

      const success = await storage.removeKullaniciFromSube(parseInt(kullaniciId), parseInt(subeId));
      
      if (!success) {
        return res.status(404).json({ error: "Kullanıcı-Şube ilişkisi bulunamadı" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Kullanıcı şubeden çıkarma hatası:", error);
      res.status(500).json({ error: "Kullanıcı şubeden çıkarılırken bir hata oluştu", details: String(error) });
    }
  });

  // Eğitim Tipleri API routes
  app.get("/api/egitim-tipleri", isAuthenticated, async (req, res) => {
    try {
      const egitimTipleri = await storage.getAllEgitimTipleri();
      res.json(egitimTipleri);
    } catch (error) {
      console.error("Eğitim tipleri API hatası:", error);
      res.status(500).json({ error: "Eğitim tipleri yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.get("/api/egitim-tipleri/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const egitimTipi = await storage.getEgitimTipi(parseInt(id));
      
      if (!egitimTipi) {
        return res.status(404).json({ error: "Eğitim tipi bulunamadı" });
      }
      
      res.json(egitimTipi);
    } catch (error) {
      console.error("Eğitim tipi API hatası:", error);
      res.status(500).json({ error: "Eğitim tipi yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.post("/api/egitim-tipleri", canManageCampaigns, async (req, res) => {
    try {
      const egitimTipiData = insertEgitimTipiSchema.parse(req.body);
      const newEgitimTipi = await storage.createEgitimTipi(egitimTipiData);
      res.status(201).json(newEgitimTipi);
    } catch (error) {
      console.error("Eğitim tipi oluşturma hatası:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Eğitim tipi oluşturulurken bir hata oluştu", details: String(error) });
    }
  });

  app.put("/api/egitim-tipleri/:id", canManageCampaigns, async (req, res) => {
    try {
      const { id } = req.params;
      const egitimTipiData = insertEgitimTipiSchema.parse(req.body);
      const updatedEgitimTipi = await storage.updateEgitimTipi(parseInt(id), egitimTipiData);
      
      if (!updatedEgitimTipi) {
        return res.status(404).json({ error: "Güncellenecek eğitim tipi bulunamadı" });
      }
      
      res.json(updatedEgitimTipi);
    } catch (error) {
      console.error("Eğitim tipi güncelleme hatası:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Eğitim tipi güncellenirken bir hata oluştu", details: String(error) });
    }
  });

  app.delete("/api/egitim-tipleri/:id", canManageCampaigns, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Önce ilgili eğitim tipini al
      const egitimTipi = await storage.getEgitimTipi(parseInt(id));
      
      if (!egitimTipi) {
        return res.status(404).json({ error: "Silinecek eğitim tipi bulunamadı" });
      }
      
      // Eğitim tipinin kullanımda olup olmadığını kontrol et
      const isUsed = await storage.isEgitimTipiUsedInKampanyalar(egitimTipi.egitimTipi);
      
      if (isUsed) {
        return res.status(409).json({ 
          error: "Bu eğitim tipi bir veya daha fazla kampanyada kullanıldığı için silinemez", 
          details: "Eğitim tipini silmek için önce bu eğitim tipini kullanan tüm kampanyaları güncelleyin veya silin."
        });
      }
      
      // Kullanımda değilse silme işlemini gerçekleştir
      const success = await storage.deleteEgitimTipi(parseInt(id));
      
      if (!success) {
        return res.status(500).json({ error: "Eğitim tipi silinemedi" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Eğitim tipi silme hatası:", error);
      res.status(500).json({ error: "Eğitim tipi silinirken bir hata oluştu", details: String(error) });
    }
  });

  // Kampanya API routes
  app.get("/api/kampanyalar", isAuthenticated, async (req, res) => {
    try {
      const user = getSessionUser(req);

      // Tam yetkili admin: tüm şubeleri görebilir, isteğe bağlı şube filtresi
      if (isFullAdminUser(user)) {
        const { subeId } = req.query;
        let kampanyalar;
        if (subeId) {
          kampanyalar = await storage.getKampanyasBySubeId(parseInt(subeId as string));
        } else {
          kampanyalar = await storage.getAllKampanyalar();
        }
        return res.json(kampanyalar);
      }

      // Müdür / Danışman / Kurucu: şubeye izole kampanya listesi
      const userSubeIds = getUserSubeIds(user);
      if (userSubeIds.length === 0) {
        return res.json([]);
      }

      const { subeId } = req.query;

      if (subeId) {
        // Frontend şube filtresi geldi — yetkili mi kontrol et, sadece onu döndür
        const requestedSubeId = parseInt(subeId as string);
        if (!userSubeIds.includes(requestedSubeId)) {
          return res.status(403).json({ error: "Bu şubeye erişim yetkiniz yok." });
        }
        return res.json(await storage.getKampanyasBySubeId(requestedSubeId));
      }

      // subeId gelmedi: tek şubeli kullanıcı için oto-seç, çok şubeli için boş döndür
      if (userSubeIds.length === 1) {
        return res.json(await storage.getKampanyasBySubeId(userSubeIds[0]));
      }
      // Kurucu gibi çok şubeli kullanıcılar mutlaka bir şube seçmeli
      return res.json([]);
    } catch (error) {
      console.error("Kampanyalar API hatası:", error);
      res.status(500).json({ error: "Kampanyalar yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.get("/api/kampanyalar/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const kampanya = await storage.getKampanya(parseInt(id));
      
      if (!kampanya) {
        return res.status(404).json({ error: "Kampanya bulunamadı" });
      }

      // Tam admin değilse sadece kendi şubesinin kampanyasına erişebilir
      const user = getSessionUser(req);
      if (!isFullAdminUser(user)) {
        const subeIds = getUserSubeIds(user);
        if (!kampanya.subeId || !subeIds.includes(kampanya.subeId)) {
          return res.status(403).json({ error: "Bu kampanyaya erişim yetkiniz yok." });
        }
      }
      
      res.json(kampanya);
    } catch (error) {
      console.error("Kampanya API hatası:", error);
      res.status(500).json({ error: "Kampanya yüklenirken bir hata oluştu", details: String(error) });
    }
  });
  


  app.post("/api/kampanyalar", canManageCampaigns, async (req, res) => {
    try {
      const user = getSessionUser(req);
      const kampanyaData = insertKampanyaSchema.parse(req.body);

      // Müdür: kampanya yalnızca kendi yönettiği şubeye eklenir (client subeId zorlanır)
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        if (managed.length === 0) {
          return res.status(403).json({ error: "Kampanya eklemek için bir şubenin müdürü olmalısınız." });
        }
        const requested = kampanyaData.subeId;
        kampanyaData.subeId = (requested && managed.includes(requested)) ? requested : managed[0];
      }

      // Şube zorunlu — global (şubesiz) kampanya oluşturulmaz
      if (!kampanyaData.subeId) {
        return res.status(400).json({ error: "Kampanya için bir şube seçilmelidir." });
      }

      const newKampanya = await storage.createKampanya(kampanyaData);
      res.status(201).json(newKampanya);
    } catch (error) {
      console.error("Kampanya oluşturma hatası:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Kampanya oluşturulurken bir hata oluştu", details: String(error) });
    }
  });

  app.put("/api/kampanyalar/:id", canManageCampaigns, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getSessionUser(req);

      const existing = await storage.getKampanya(parseInt(id));
      if (!existing) {
        return res.status(404).json({ error: "Güncellenecek kampanya bulunamadı" });
      }

      const kampanyaData = insertKampanyaSchema.parse(req.body);

      // Müdür: yalnızca kendi şubesinin kampanyasını düzenleyebilir ve şube değiştiremez
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        if (!existing.subeId || !managed.includes(existing.subeId)) {
          return res.status(403).json({ error: "Bu kampanyayı düzenleme yetkiniz yok." });
        }
        kampanyaData.subeId = existing.subeId;
      } else if (kampanyaData.subeId == null) {
        // Admin şube göndermezse mevcut şubeyi koru (yetim kalmasın)
        kampanyaData.subeId = existing.subeId;
      }

      const updatedKampanya = await storage.updateKampanya(parseInt(id), kampanyaData);
      
      if (!updatedKampanya) {
        return res.status(404).json({ error: "Güncellenecek kampanya bulunamadı" });
      }
      
      res.json(updatedKampanya);
    } catch (error) {
      console.error("Kampanya güncelleme hatası:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Kampanya güncellenirken bir hata oluştu", details: String(error) });
    }
  });

  app.delete("/api/kampanyalar/:id", canManageCampaigns, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getSessionUser(req);

      const existing = await storage.getKampanya(parseInt(id));
      if (!existing) {
        return res.status(404).json({ error: "Silinecek kampanya bulunamadı" });
      }

      // Müdür: yalnızca kendi şubesinin kampanyasını silebilir
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        if (!existing.subeId || !managed.includes(existing.subeId)) {
          return res.status(403).json({ error: "Bu kampanyayı silme yetkiniz yok." });
        }
      }

      const success = await storage.deleteKampanya(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Silinecek kampanya bulunamadı" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Kampanya silme hatası:", error);
      res.status(500).json({ error: "Kampanya silinirken bir hata oluştu", details: String(error) });
    }
  });
  
  // Kampanya Kopyalama API endpoint'i
  app.post("/api/kampanyalar/:id/copy", canManageCampaigns, async (req, res) => {
    try {
      const { id } = req.params;
      const { subeId } = req.body;
      const user = getSessionUser(req);
      
      if (!subeId) {
        return res.status(400).json({ error: "Hedef şube ID'si (subeId) gereklidir" });
      }

      // Müdür: yalnızca kendi şubesinden kopyalayabilir ve yine kendi şubesine kopyalayabilir
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        const kaynak = await storage.getKampanya(parseInt(id));
        if (!kaynak) {
          return res.status(404).json({ error: "Kopyalanacak kampanya bulunamadı" });
        }
        if (!kaynak.subeId || !managed.includes(kaynak.subeId)) {
          return res.status(403).json({ error: "Bu kampanyayı kopyalama yetkiniz yok." });
        }
        if (!managed.includes(parseInt(subeId))) {
          return res.status(403).json({ error: "Yalnızca kendi şubenize kopyalayabilirsiniz." });
        }
      }
      
      const newKampanya = await storage.copyKampanyaToSube(parseInt(id), parseInt(subeId));
      
      if (!newKampanya) {
        return res.status(404).json({ error: "Kopyalanacak kampanya bulunamadı veya kopyalama sırasında hata oluştu" });
      }
      
      res.status(201).json(newKampanya);
    } catch (error) {
      console.error("Kampanya kopyalama hatası:", error);
      res.status(500).json({ error: "Kampanya kopyalanırken bir hata oluştu", details: String(error) });
    }
  });
  
  // Çoklu Kampanya Kopyalama API endpoint'i
  app.post("/api/kampanyalar/copy-many", canManageCampaigns, async (req, res) => {
    try {
      const { kampanyaIds, subeId } = req.body;
      const user = getSessionUser(req);
      
      console.log("API'ye gelen kampanya ID'leri:", kampanyaIds);
      console.log("API'ye gelen şube ID:", subeId);
      
      if (!subeId) {
        return res.status(400).json({ error: "Hedef şube ID'si (subeId) gereklidir" });
      }
      
      if (!kampanyaIds || !Array.isArray(kampanyaIds) || kampanyaIds.length === 0) {
        return res.status(400).json({ error: "Kopyalanacak kampanya ID'leri (kampanyaIds) gereklidir ve en az bir ID içermelidir" });
      }
      
      // Kampanya ID'lerini sayıya çevir (NaN değerlerini filtrele)
      const validIds = kampanyaIds
        .map(id => typeof id === 'string' ? parseInt(id) : id)
        .filter(id => !isNaN(id));
      
      console.log("Geçerli kampanya ID'leri:", validIds);
      
      if (validIds.length === 0) {
        return res.status(400).json({ error: "Geçerli kampanya ID'si bulunamadı" });
      }
      
      const parsedSubeId = parseInt(subeId);

      // Müdür: yalnızca kendi şubesine ve kendi şubesinin kampanyalarını kopyalayabilir
      if (!isFullAdminUser(user)) {
        const managed = getManagedSubeIds(user);
        if (!managed.includes(parsedSubeId)) {
          return res.status(403).json({ error: "Yalnızca kendi şubenize kopyalayabilirsiniz." });
        }
        for (const kid of validIds) {
          const kaynak = await storage.getKampanya(kid);
          if (!kaynak || !kaynak.subeId || !managed.includes(kaynak.subeId)) {
            return res.status(403).json({ error: "Yalnızca kendi şubenizin kampanyalarını kopyalayabilirsiniz." });
          }
        }
      }
      const newKampanyalar = await storage.copyManyKampanyalarToSube(validIds, parsedSubeId);
      
      if (newKampanyalar.length === 0) {
        return res.status(404).json({ error: "Hiçbir kampanya kopyalanamadı" });
      }
      
      res.status(201).json({
        success: true,
        message: `${newKampanyalar.length} kampanya başarıyla kopyalandı`,
        kampanyalar: newKampanyalar
      });
    } catch (error) {
      console.error("Çoklu kampanya kopyalama hatası:", error);
      res.status(500).json({ error: "Kampanyalar kopyalanırken bir hata oluştu", details: String(error) });
    }
  });

  // WhatsApp Gönderim API routes
  app.post("/api/whatsapp-gonderimleri", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertWhatsappGonderimSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Geçersiz veri", details: parsed.error.errors });
      }
      const gonderim = await storage.createWhatsappGonderim(parsed.data);
      res.status(201).json(gonderim);
    } catch (error) {
      console.error("WhatsApp gönderim kayıt hatası:", error);
      res.status(500).json({ error: "Kayıt oluşturulurken hata oluştu", details: String(error) });
    }
  });

  app.delete("/api/whatsapp-gonderimleri/:id", isAuthenticated, async (req, res) => {
    try {
      const user = getSessionUser(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Geçersiz id" });
      // Sadece yöneticiler silebilir (Sistem Yöneticisi, Kurucu, Müdür)
      if (!isFullAdminUser(user) && !isKurucuUser(user) && !isMudurUser(user)) {
        return res.status(403).json({ error: "Bu işlemi yapmak için yetkiniz yok." });
      }
      const success = await storage.deleteWhatsappGonderim(id);
      if (!success) return res.status(404).json({ error: "Kayıt bulunamadı" });
      res.status(204).send();
    } catch (error) {
      console.error("WhatsApp gönderim silme hatası:", error);
      res.status(500).json({ error: "Silinirken hata oluştu", details: String(error) });
    }
  });

  app.get("/api/whatsapp-gonderimleri", isAuthenticated, async (req, res) => {
    try {
      const { subeId, danismanId, baslangic, bitis } = req.query;
      const filters: any = {};
      if (subeId) filters.subeId = parseInt(subeId as string);
      if (danismanId) filters.danismanId = parseInt(danismanId as string);
      if (baslangic) filters.baslangicTarihi = new Date(baslangic as string);
      if (bitis) {
        const b = new Date(bitis as string);
        b.setHours(23, 59, 59, 999);
        filters.bitisTarihi = b;
      }
      const gonderimleri = await storage.getAllWhatsappGonderimleri(filters);
      res.json(gonderimleri);
    } catch (error) {
      console.error("WhatsApp gönderim listesi hatası:", error);
      res.status(500).json({ error: "Liste yüklenirken hata oluştu", details: String(error) });
    }
  });

  // ── Toplu Teklifler: kalıcı snapshot ve sağlayıcıdan bağımsız kuyruk ──
  app.post("/api/toplu-gonderimler", isAuthenticated, async (req, res) => {
    try {
      const parsed = topluGonderimOlusturSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Geçersiz toplu teklif verisi.", details: parsed.error.errors });
      }

      const user = getSessionUser(req) as any;
      const { subeId, teklifler } = parsed.data;
      if (!topluTeklifSubeErisimiVarMi(user, subeId)) {
        return res.status(403).json({ error: "Bu şube için toplu teklif oluşturma yetkiniz yok." });
      }

      const telefonlar = teklifler.map((t) => t.ogrenciTelefon.replace(/\D/g, ""));
      if (new Set(telefonlar).size !== telefonlar.length) {
        return res.status(400).json({ error: "Aynı toplu gönderimde aynı telefon numarası birden fazla kez bulunamaz." });
      }

      const sube = await storage.getSube(subeId);
      if (!sube) return res.status(404).json({ error: "Şube bulunamadı." });
      const ilkRol = Array.isArray(user?.roller)
        ? user.roller.find((r: any) => Number(r.subeId) === subeId) || user.roller[0]
        : null;
      if (!ilkRol && !isFullAdminUser(user)) {
        return res.status(403).json({ error: "Aktif işlem bağlamı için şube rolünüz bulunamadı." });
      }

      // İstemci yalnızca aday ve ödeme tercihlerini gönderir. Kampanya, fiyat,
      // mesaj ve snapshot burada, mevcut computeOffer motoru ile üretilir.
      const kampanyalar = await Promise.all(teklifler.map((teklif) => storage.getKampanya(teklif.kampanyaId)));
      for (let index = 0; index < teklifler.length; index++) {
        const kampanya = kampanyalar[index] as any;
        const teklif = teklifler[index];
        if (!kampanya || Number(kampanya.subeId) !== subeId) {
          return res.status(400).json({ error: `Satır ${index + 1}: seçili şubeye ait kampanya bulunamadı.` });
        }
        if (teklif.teklifKur > Number(kampanya.kurSayisi)) {
          return res.status(400).json({ error: `Satır ${index + 1}: kampanya kur limiti aşılıyor.` });
        }
        const odemeler = [teklif.odeme1, teklif.odeme2];
        if (odemeler[0].odemeTipi === odemeler[1].odemeTipi && odemeler[0].taksitSayisi === odemeler[1].taksitSayisi) {
          return res.status(400).json({ error: `Satır ${index + 1}: iki ödeme alternatifi farklı olmalı.` });
        }
        for (const odeme of odemeler) {
          const limit = odeme.odemeTipi === "kredi-karti" ? Number(kampanya.maxKrediKartiTaksit)
            : odeme.odemeTipi === "senet" ? Number(kampanya.maxSenetTaksit) : 1;
          if (odeme.taksitSayisi > limit || (odeme.odemeTipi === "nakit" && odeme.taksitSayisi !== 1)) {
            return res.status(400).json({ error: `Satır ${index + 1}: ödeme planı kampanya taksit kurallarına uygun değil.` });
          }
        }
      }

      const sonuc = await db.transaction(async (tx) => {
        const [gonderim] = await tx
          .insert(topluGonderimler)
          .values({
            baslik: parsed.data.baslik,
            subeId,
            subeAdi: sube.subeAdi,
            danismanId: Number(user.id),
            danismanAdi: user.adi || "",
            danismanSoyadi: user.soyadi || "",
            durum: "hazir",
            toplam: teklifler.length,
            bekliyor: teklifler.length,
            olusturanId: Number(user.id),
          })
          .returning();

        const olusturmaTarihi = new Date();
        const kayitlar = teklifler.map((teklif, index) => {
          const kampanya = { ...(kampanyalar[index] as any), hediyeler: (kampanyalar[index] as any).hediyeler || [] };
          const teklifOlustur = (odeme: any, title: string) => computeOffer({
            egitimTipi: kampanya.egitimTipi,
            kampanyaId: String(kampanya.id),
            kurSayisi: teklif.teklifKur,
            toplamDersSaati: Number(kampanya.toplamDersSaati),
            odemeTipi: odeme.odemeTipi,
            taksitSayisi: odeme.taksitSayisi,
            pesinat: 0,
            kitapDahil: true,
            mudurIndirimTipi: "yuzde" as const,
            mudurIndirimDegeri: 0,
            gecerlilikGunu: 2,
          }, kampanya, { id: `batch-${gonderim.id}-${index + 1}-${title}`, title, isRecommended: title === "Teklif 1" });
          const teklif1 = teklifOlustur(teklif.odeme1, "Teklif 1");
          const teklif2 = teklifOlustur(teklif.odeme2, "Teklif 2");
          const sonGecerlilik = new Date(olusturmaTarihi);
          sonGecerlilik.setDate(sonGecerlilik.getDate() + teklif1.form.gecerlilikGunu);
          const snapshot = {
            kampanya,
            teklif1,
            teklif2,
            danisman: { adi: user.adi || "", soyadi: user.soyadi || "", telefon: user.telefon || "" },
            sube: { subeAdi: sube.subeAdi, subeAdresi: sube.subeAdresi || "", subeTelefon: sube.subeTelefon || "" },
            pdf: {
              teklifNo: `TT-${gonderim.id}-${index + 1}`,
              teklifTarihi: olusturmaTarihi.toISOString(),
              sonGecerlilikTarihi: sonGecerlilik.toISOString(),
            },
          };
          return {
            gonderimId: gonderim.id,
            subeId,
            ogrenciAdi: teklif.ogrenciAdi,
            ogrenciTelefon: teklif.ogrenciTelefon,
            sonEgitim: teklif.sonEgitim,
            sonKur: teklif.sonKur,
            teklifKur: teklif.teklifKur,
            kampanyaAdi: kampanya.kampanyaAdi,
            egitimTipi: kampanya.egitimTipi,
            odeme1: topluOdemeEtiketi(teklif.odeme1),
            odeme2: topluOdemeEtiketi(teklif.odeme2),
            odeme1Detay: topluOdemeDetayi(teklif1),
            odeme2Detay: topluOdemeDetayi(teklif2),
            mesaj: topluMesajOlustur(teklif, teklif1, teklif2, sube.subeAdi, user),
            snapshot,
            durum: "bekliyor",
          };
        });
        await tx.insert(topluTeklifler).values(kayitlar);
        return gonderim;
      });

      res.status(201).json(sonuc);
    } catch (error) {
      console.error("Toplu gönderim oluşturma hatası:", error);
      res.status(500).json({ error: "Toplu gönderim kaydedilemedi.", details: String(error) });
    }
  });

  app.get("/api/toplu-gonderimler", isAuthenticated, async (req, res) => {
    try {
      const user = getSessionUser(req) as any;
      const gonderimler = await db.select().from(topluGonderimler).orderBy(desc(topluGonderimler.createdAt));
      res.json(gonderimler.filter((g) => topluTeklifSubeErisimiVarMi(user, g.subeId)));
    } catch (error) {
      console.error("Toplu gönderim listesi hatası:", error);
      res.status(500).json({ error: "Toplu gönderimler yüklenemedi." });
    }
  });

  app.get("/api/toplu-teklifler", isAuthenticated, async (req, res) => {
    try {
      const user = getSessionUser(req) as any;
      const gonderimId = req.query.gonderimId ? Number(req.query.gonderimId) : undefined;
      const teklifler = await db
        .select()
        .from(topluTeklifler)
        .where(gonderimId ? eq(topluTeklifler.gonderimId, gonderimId) : undefined)
        .orderBy(desc(topluTeklifler.createdAt));
      res.json(teklifler.filter((t) => topluTeklifSubeErisimiVarMi(user, t.subeId)));
    } catch (error) {
      console.error("Toplu teklif geçmişi hatası:", error);
      res.status(500).json({ error: "Toplu teklif geçmişi yüklenemedi." });
    }
  });

  app.patch("/api/toplu-gonderimler/:id", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const action = z.enum(["baslat", "duraklat", "durdur"]).safeParse(req.body?.action);
      if (!Number.isInteger(id) || !action.success) return res.status(400).json({ error: "Geçersiz işlem." });
      const user = getSessionUser(req) as any;
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM ${topluGonderimler} WHERE ${topluGonderimler.id} = ${id} FOR UPDATE`);
        const [gonderim] = await tx.select().from(topluGonderimler).where(eq(topluGonderimler.id, id));
        if (!gonderim) return { error: "Gönderim bulunamadı.", status: 404 };
        if (!topluTeklifSubeErisimiVarMi(user, gonderim.subeId)) return { error: "Bu gönderime erişim yetkiniz yok.", status: 403 };
        if (gonderim.durum === "tamamlandi") return { error: "Tamamlanan gönderim yeniden başlatılamaz.", status: 409 };
        const durum = action.data === "baslat" ? "aktif" : action.data === "duraklat" ? "duraklatildi" : "durduruldu";
        const [updated] = await tx
          .update(topluGonderimler)
          .set({
            durum,
            updatedAt: new Date(),
            ...(action.data === "baslat" && !gonderim.startedAt ? { startedAt: new Date() } : {}),
          })
          .where(eq(topluGonderimler.id, id))
          .returning();
        return { updated };
      });
      if ("error" in result) return res.status(result.status ?? 500).json({ error: result.error });
      res.json(result.updated);
    } catch (error) {
      console.error("Toplu gönderim durum hatası:", error);
      res.status(500).json({ error: "Gönderim durumu güncellenemedi." });
    }
  });

  // Sağlayıcılar (Chrome eklentisi vb.) sıradaki kaydı bu sözleşmeden alır.
  // Kayıt, tek atomik durum geçişiyle "islemde"ye alınır; aynı kişi iki kez tüketilemez.
  app.get("/api/toplu-gonderimler/:id/kuyruk/siradaki", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = getSessionUser(req) as any;
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM ${topluGonderimler} WHERE ${topluGonderimler.id} = ${id} FOR UPDATE`);
        const [gonderim] = await tx.select().from(topluGonderimler).where(eq(topluGonderimler.id, id));
        if (!gonderim) return { error: "Gönderim bulunamadı.", status: 404 };
        if (!topluTeklifSubeErisimiVarMi(user, gonderim.subeId)) return { error: "Bu gönderime erişim yetkiniz yok.", status: 403 };
        if (gonderim.durum !== "aktif") return { error: "Gönderim kuyruğu henüz başlatılmadı veya duraklatıldı.", status: 409 };
        const leaseCutoff = new Date(Date.now() - 15 * 60 * 1000);
        await tx
          .update(topluTeklifler)
          .set({ durum: "bekliyor", claimToken: null, claimedAt: null, updatedAt: new Date() })
          .where(and(eq(topluTeklifler.gonderimId, id), eq(topluTeklifler.durum, "islemde"), lt(topluTeklifler.claimedAt, leaseCutoff)));
        const [aday] = await tx
          .select()
          .from(topluTeklifler)
          .where(and(eq(topluTeklifler.gonderimId, id), eq(topluTeklifler.durum, "bekliyor")))
          .limit(1);
        if (!aday) return { empty: true };
        const claimToken = randomUUID();
        const [kilitli] = await tx
          .update(topluTeklifler)
          .set({ durum: "islemde", claimToken, claimedAt: new Date(), denemeSayisi: aday.denemeSayisi + 1, updatedAt: new Date() })
          .where(and(eq(topluTeklifler.id, aday.id), eq(topluTeklifler.durum, "bekliyor")))
          .returning();
        if (!kilitli) return { error: "Kayıt başka bir sağlayıcı tarafından alındı.", status: 409 };
        return { gonderim, kilitli, claimToken };
      });
      if ("error" in result) return res.status(result.status ?? 500).json({ error: result.error });
      if ("empty" in result) return res.status(204).send();
      const { gonderim, kilitli, claimToken } = result;
      res.json({
        gonderim: { id: gonderim.id, subeAdi: gonderim.subeAdi },
        teklif: kilitli,
        claimToken,
        // Sağlayıcı sözleşmesi: bu anahtarı kendi teslimat/dedup mekanizmasında kullanmalı,
        // mesajdan hemen önce heartbeat çağrısıyla lease'in hâlâ kendisinde olduğunu doğrulamalıdır.
        idempotencyKey: `toplu-teklif-${kilitli.id}`,
        leaseExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      console.error("Kuyruk tüketim hatası:", error);
      res.status(500).json({ error: "Kuyruktan kayıt alınamadı." });
    }
  });

  app.patch("/api/toplu-teklifler/:id/kuyruk/heartbeat", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const parsed = z.object({ claimToken: z.string().uuid() }).safeParse(req.body);
      if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ error: "Geçersiz lease yenileme isteği." });
      const user = getSessionUser(req) as any;
      const [teklif] = await db.select().from(topluTeklifler).where(eq(topluTeklifler.id, id));
      if (!teklif) return res.status(404).json({ error: "Teklif bulunamadı." });
      if (!topluTeklifSubeErisimiVarMi(user, teklif.subeId)) return res.status(403).json({ error: "Bu teklife erişim yetkiniz yok." });
      const [updated] = await db
        .update(topluTeklifler)
        .set({ claimedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(topluTeklifler.id, id),
          eq(topluTeklifler.durum, "islemde"),
          eq(topluTeklifler.claimToken, parsed.data.claimToken),
        ))
        .returning();
      if (!updated) return res.status(409).json({ error: "Lease geçersiz veya başka bir sağlayıcıya devredildi." });
      res.json({ ok: true, leaseExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
    } catch (error) {
      console.error("Kuyruk heartbeat hatası:", error);
      res.status(500).json({ error: "Lease yenilenemedi." });
    }
  });

  app.patch("/api/toplu-teklifler/:id/sonuc", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const parsed = z.object({
        durum: z.enum(["gonderildi", "hata"]),
        claimToken: z.string().uuid(),
        hataMesaji: z.string().max(1000).optional(),
      }).safeParse(req.body);
      if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ error: "Geçersiz sonuç bildirimi." });
      const user = getSessionUser(req) as any;
      const [teklif] = await db.select().from(topluTeklifler).where(eq(topluTeklifler.id, id));
      if (!teklif) return res.status(404).json({ error: "Teklif bulunamadı." });
      if (!topluTeklifSubeErisimiVarMi(user, teklif.subeId)) return res.status(403).json({ error: "Bu teklife erişim yetkiniz yok." });
      if (["gonderildi", "hata"].includes(teklif.durum)) return res.json(teklif); // idempotent tekrar bildirimi

      const updated = await db.transaction(async (tx) => {
        // Aynı batch'in sayaç ve terminal durumu bu kilit altında seri güncellenir.
        await tx.execute(sql`SELECT id FROM ${topluGonderimler} WHERE ${topluGonderimler.id} = ${teklif.gonderimId} FOR UPDATE`);
        const [kilitliGonderim] = await tx.select().from(topluGonderimler).where(eq(topluGonderimler.id, teklif.gonderimId));
        const [guncelTeklif] = await tx.select().from(topluTeklifler).where(eq(topluTeklifler.id, id));
        if (!guncelTeklif || !kilitliGonderim) return null;
        if (["gonderildi", "hata"].includes(guncelTeklif.durum)) return guncelTeklif;

        const [sonuc] = await tx
          .update(topluTeklifler)
          .set({
            durum: parsed.data.durum,
            hataMesaji: parsed.data.durum === "hata" ? parsed.data.hataMesaji || "Sağlayıcı gönderimi tamamlayamadı." : null,
            gonderildiAt: parsed.data.durum === "gonderildi" ? new Date() : null,
            claimToken: null,
            claimedAt: null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(topluTeklifler.id, id),
            eq(topluTeklifler.durum, "islemde"),
            eq(topluTeklifler.claimToken, parsed.data.claimToken),
          ))
          .returning();
        if (!sonuc) return null;

        const tumTeklifler = await tx.select().from(topluTeklifler).where(eq(topluTeklifler.gonderimId, teklif.gonderimId));
        const gonderildi = tumTeklifler.filter((t) => t.durum === "gonderildi").length;
        const hata = tumTeklifler.filter((t) => t.durum === "hata").length;
        const bekliyor = tumTeklifler.filter((t) => ["bekliyor", "islemde", "manuel_bekliyor"].includes(t.durum)).length;
        await tx
          .update(topluGonderimler)
          .set({
            gonderildi,
            hata,
            bekliyor,
            durum: bekliyor === 0
              ? "tamamlandi"
              : ["duraklatildi", "durduruldu"].includes(kilitliGonderim.durum)
              ? kilitliGonderim.durum
              : "aktif",
            completedAt: bekliyor === 0 ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(topluGonderimler.id, teklif.gonderimId));
        return sonuc;
      });
      if (!updated) return res.status(409).json({ error: "Kuyruk kaydının işlem yetkisi geçersiz veya süresi dolmuş." });
      res.json(updated);
    } catch (error) {
      console.error("Toplu teklif sonuç hatası:", error);
      res.status(500).json({ error: "Gönderim sonucu kaydedilemedi." });
    }
  });

  // WhatsApp sayfasını açmak gönderim kanıtı değildir. Önce manuel onay bekleyen
  // duruma geçilir; danışman WhatsApp'tan döndüğünde sonucu ayrıca kaydeder.
  // Duraklatma/durdurma mevcut lease'leri iptal etmez; yalnızca yeni claim'leri engeller.
  app.post("/api/toplu-teklifler/:id/manuel-gonderim", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "Geçersiz teklif kaydı." });
      const user = getSessionUser(req) as any;
      const [teklif] = await db.select().from(topluTeklifler).where(eq(topluTeklifler.id, id));
      if (!teklif) return res.status(404).json({ error: "Teklif bulunamadı." });
      if (!topluTeklifSubeErisimiVarMi(user, teklif.subeId)) return res.status(403).json({ error: "Bu teklife erişim yetkiniz yok." });

      const sonuc = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM ${topluGonderimler} WHERE ${topluGonderimler.id} = ${teklif.gonderimId} FOR UPDATE`);
        const [gonderim] = await tx.select().from(topluGonderimler).where(eq(topluGonderimler.id, teklif.gonderimId));
        const [guncelTeklif] = await tx.select().from(topluTeklifler).where(eq(topluTeklifler.id, id));
        if (!gonderim || !guncelTeklif) return null;
        if (guncelTeklif.durum === "islemde") return { error: "Bu teklif şu anda sağlayıcı tarafından işleniyor.", status: 409 };
        if (guncelTeklif.durum === "manuel_bekliyor") return { teklif: guncelTeklif, manualPending: true };
        if (guncelTeklif.durum === "gonderildi") return { teklif: guncelTeklif, alreadyFinal: true };

        const [manuelTeklif] = await tx
          .update(topluTeklifler)
          .set({
            durum: "manuel_bekliyor",
            hataMesaji: null,
            claimToken: null,
            claimedAt: null,
            gonderildiAt: null,
            updatedAt: new Date(),
          })
          .where(and(eq(topluTeklifler.id, id), eq(topluTeklifler.durum, guncelTeklif.durum)))
          .returning();
        if (!manuelTeklif) return { error: "Teklif durumu değişti; lütfen yeniden deneyin.", status: 409 };

        const tumTeklifler = await tx.select().from(topluTeklifler).where(eq(topluTeklifler.gonderimId, teklif.gonderimId));
        const gonderildi = tumTeklifler.filter((t) => t.durum === "gonderildi").length;
        const hata = tumTeklifler.filter((t) => t.durum === "hata").length;
        const bekliyor = tumTeklifler.filter((t) => ["bekliyor", "islemde", "manuel_bekliyor"].includes(t.durum)).length;
        await tx
          .update(topluGonderimler)
          .set({
            gonderildi,
            hata,
            bekliyor,
            durum: bekliyor === 0 ? "tamamlandi" : gonderim.durum,
            completedAt: bekliyor === 0 ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(topluGonderimler.id, teklif.gonderimId));
        return { teklif: manuelTeklif, manualPending: true };
      });
      if (!sonuc) return res.status(404).json({ error: "Teklif veya gönderim bulunamadı." });
      if ("error" in sonuc) return res.status(sonuc.status ?? 500).json({ error: sonuc.error });
      res.json(sonuc);
    } catch (error) {
      console.error("Manuel WhatsApp gönderim hatası:", error);
      res.status(500).json({ error: "Manuel gönderim kaydedilemedi." });
    }
  });

  app.post("/api/toplu-teklifler/:id/manuel-gonderim/:action", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const action = z.enum(["onayla", "iptal"]).safeParse(req.params.action);
      if (!Number.isInteger(id) || !action.success) return res.status(400).json({ error: "Geçersiz manuel gönderim işlemi." });
      const user = getSessionUser(req) as any;
      const [teklif] = await db.select().from(topluTeklifler).where(eq(topluTeklifler.id, id));
      if (!teklif) return res.status(404).json({ error: "Teklif bulunamadı." });
      if (!topluTeklifSubeErisimiVarMi(user, teklif.subeId)) return res.status(403).json({ error: "Bu teklife erişim yetkiniz yok." });

      const sonuc = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM ${topluGonderimler} WHERE ${topluGonderimler.id} = ${teklif.gonderimId} FOR UPDATE`);
        const [gonderim] = await tx.select().from(topluGonderimler).where(eq(topluGonderimler.id, teklif.gonderimId));
        const [guncelTeklif] = await tx.select().from(topluTeklifler).where(eq(topluTeklifler.id, id));
        if (!gonderim || !guncelTeklif) return null;
        if (guncelTeklif.durum !== "manuel_bekliyor") return { error: "Bu teklif manuel gönderim onayı beklemiyor.", status: 409 };
        const yeniDurum = action.data === "onayla" ? "gonderildi" : "bekliyor";
        const [updated] = await tx
          .update(topluTeklifler)
          .set({ durum: yeniDurum, gonderildiAt: action.data === "onayla" ? new Date() : null, updatedAt: new Date() })
          .where(and(eq(topluTeklifler.id, id), eq(topluTeklifler.durum, "manuel_bekliyor")))
          .returning();
        if (!updated) return { error: "Teklif durumu değişti; lütfen yeniden deneyin.", status: 409 };
        const tumTeklifler = await tx.select().from(topluTeklifler).where(eq(topluTeklifler.gonderimId, teklif.gonderimId));
        const gonderildi = tumTeklifler.filter((t) => t.durum === "gonderildi").length;
        const hata = tumTeklifler.filter((t) => t.durum === "hata").length;
        const bekliyor = tumTeklifler.filter((t) => ["bekliyor", "islemde", "manuel_bekliyor"].includes(t.durum)).length;
        await tx.update(topluGonderimler).set({
          gonderildi, hata, bekliyor,
          durum: bekliyor === 0 ? "tamamlandi" : gonderim.durum,
          completedAt: bekliyor === 0 ? new Date() : null,
          updatedAt: new Date(),
        }).where(eq(topluGonderimler.id, teklif.gonderimId));
        return { teklif: updated, action: action.data };
      });
      if (!sonuc) return res.status(404).json({ error: "Teklif veya gönderim bulunamadı." });
      if ("error" in sonuc) return res.status(sonuc.status ?? 500).json({ error: sonuc.error });
      res.json(sonuc);
    } catch (error) {
      console.error("Manuel WhatsApp sonucu hatası:", error);
      res.status(500).json({ error: "Manuel gönderim sonucu kaydedilemedi." });
    }
  });

  app.post("/api/toplu-gonderimler/:id/basarisizlari-tekrar-dene", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = getSessionUser(req) as any;
      const [gonderim] = await db.select().from(topluGonderimler).where(eq(topluGonderimler.id, id));
      if (!gonderim) return res.status(404).json({ error: "Gönderim bulunamadı." });
      if (!topluTeklifSubeErisimiVarMi(user, gonderim.subeId)) return res.status(403).json({ error: "Bu gönderime erişim yetkiniz yok." });
      const sonuc = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM ${topluGonderimler} WHERE ${topluGonderimler.id} = ${id} FOR UPDATE`);
        const [kilitliGonderim] = await tx.select().from(topluGonderimler).where(eq(topluGonderimler.id, id));
        const yeniden = await tx
          .update(topluTeklifler)
          .set({ durum: "bekliyor", hataMesaji: null, claimToken: null, claimedAt: null, updatedAt: new Date() })
          .where(and(eq(topluTeklifler.gonderimId, id), eq(topluTeklifler.durum, "hata")))
          .returning();
        const tumTeklifler = await tx.select().from(topluTeklifler).where(eq(topluTeklifler.gonderimId, id));
        const gonderildi = tumTeklifler.filter((t) => t.durum === "gonderildi").length;
        const hata = tumTeklifler.filter((t) => t.durum === "hata").length;
        const bekliyor = tumTeklifler.filter((t) => ["bekliyor", "islemde", "manuel_bekliyor"].includes(t.durum)).length;
        const [updated] = await tx
          .update(topluGonderimler)
          .set({
            durum: bekliyor === 0
              ? "tamamlandi"
              : ["duraklatildi", "durduruldu"].includes(kilitliGonderim?.durum || "")
              ? kilitliGonderim!.durum
              : "aktif",
            gonderildi,
            hata,
            bekliyor,
            completedAt: bekliyor === 0 ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(topluGonderimler.id, id))
          .returning();
        return { gonderim: updated, tekrarKuyrugaAlinan: yeniden.length };
      });
      res.json(sonuc);
    } catch (error) {
      console.error("Başarısızları tekrar deneme hatası:", error);
      res.status(500).json({ error: "Başarısız teklifler tekrar kuyruğa alınamadı." });
    }
  });

  // Hata yakalama middleware'i
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Server hatası:", err);
    res.status(500).json({ error: "Sunucu hatası", details: String(err) });
  });

  const httpServer = createServer(app);
  return httpServer;
}