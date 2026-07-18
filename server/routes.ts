import { Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { eq, and } from "drizzle-orm";
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
  kullaniciSubeRolleri
} from "@shared/schema";
import { db } from "./db";
import { z } from "zod";
import { setupSession, attachUser, isAuthenticated, isAdmin, isFullAdmin, canManageCampaigns, isFullAdminUser, isKurucuUser, isMudurUser, getUserSubeIds, getManagedSubeIds, getSessionUser, login, logout, getCurrentUser, changePassword, hashPassword } from "./auth";
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

      // Müdür / Danışman: SADECE kendi şubelerinin kampanyaları (client subeId yok sayılır)
      const subeIds = getUserSubeIds(user);
      if (subeIds.length === 0) {
        return res.json([]);
      }
      let sonuc: any[] = [];
      for (const sid of subeIds) {
        const list = await storage.getKampanyasBySubeId(sid);
        sonuc = sonuc.concat(list);
      }
      return res.json(sonuc);
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

  // Hata yakalama middleware'i
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Server hatası:", err);
    res.status(500).json({ error: "Sunucu hatası", details: String(err) });
  });

  const httpServer = createServer(app);
  return httpServer;
}