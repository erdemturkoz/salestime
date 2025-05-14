import { Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { storage } from "./storage";
import { 
  insertKampanyaSchema, 
  insertSubeSchema, 
  insertKullaniciSchema, 
  insertKullaniciSubeRolSchema,
  Roller
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Şube API routes
  app.get("/api/subeler", async (req, res) => {
    try {
      const subeler = await storage.getAllSubeler();
      res.json(subeler);
    } catch (error) {
      console.error("Şubeler API hatası:", error);
      res.status(500).json({ error: "Şubeler yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.get("/api/subeler/:id", async (req, res) => {
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

  app.post("/api/subeler", async (req, res) => {
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

  app.patch("/api/subeler/:id", async (req, res) => {
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

  app.delete("/api/subeler/:id", async (req, res) => {
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
  app.get("/api/kullanicilar", async (req, res) => {
    try {
      const kullanicilar = await storage.getAllKullanicilar();
      res.json(kullanicilar);
    } catch (error) {
      console.error("Kullanıcılar API hatası:", error);
      res.status(500).json({ error: "Kullanıcılar yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.get("/api/kullanicilar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const kullanici = await storage.getKullanici(parseInt(id));
      
      if (!kullanici) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      
      res.json(kullanici);
    } catch (error) {
      console.error("Kullanıcı API hatası:", error);
      res.status(500).json({ error: "Kullanıcı yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.post("/api/kullanicilar", async (req, res) => {
    try {
      const kullaniciData = insertKullaniciSchema.parse(req.body);
      const newKullanici = await storage.createKullanici(kullaniciData);
      res.status(201).json(newKullanici);
    } catch (error) {
      console.error("Kullanıcı oluşturma hatası:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Kullanıcı oluşturulurken bir hata oluştu", details: String(error) });
    }
  });

  app.patch("/api/kullanicilar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const kullaniciData = insertKullaniciSchema.parse(req.body);
      const updatedKullanici = await storage.updateKullanici(parseInt(id), kullaniciData);
      
      if (!updatedKullanici) {
        return res.status(404).json({ error: "Güncellenecek kullanıcı bulunamadı" });
      }
      
      res.json(updatedKullanici);
    } catch (error) {
      console.error("Kullanıcı güncelleme hatası:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Kullanıcı güncellenirken bir hata oluştu", details: String(error) });
    }
  });

  app.delete("/api/kullanicilar/:id", async (req, res) => {
    try {
      const { id } = req.params;
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
  app.post("/api/kullanicilar/:kullaniciId/subeler/:subeId", async (req, res) => {
    try {
      const { kullaniciId, subeId } = req.params;
      const { rol } = req.body;
      
      if (!Object.values(Roller).includes(rol)) {
        return res.status(400).json({ error: "Geçersiz rol. Roller: Kurucu, Müdür, Satış Danışmanı" });
      }
      
      const kullaniciSubeRol = await storage.addKullaniciToSube(parseInt(kullaniciId), parseInt(subeId), rol);
      res.status(201).json(kullaniciSubeRol);
    } catch (error) {
      console.error("Kullanıcı şubeye ekleme hatası:", error);
      res.status(500).json({ error: "Kullanıcı şubeye eklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.delete("/api/kullanicilar/:kullaniciId/subeler/:subeId", async (req, res) => {
    try {
      const { kullaniciId, subeId } = req.params;
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

  // Kampanya API routes
  app.get("/api/kampanyalar", async (req, res) => {
    try {
      const kampanyalar = await storage.getAllKampanyalar();
      res.json(kampanyalar);
    } catch (error) {
      console.error("Kampanyalar API hatası:", error);
      res.status(500).json({ error: "Kampanyalar yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.get("/api/kampanyalar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const kampanya = await storage.getKampanya(parseInt(id));
      
      if (!kampanya) {
        return res.status(404).json({ error: "Kampanya bulunamadı" });
      }
      
      res.json(kampanya);
    } catch (error) {
      console.error("Kampanya API hatası:", error);
      res.status(500).json({ error: "Kampanya yüklenirken bir hata oluştu", details: String(error) });
    }
  });

  app.post("/api/kampanyalar", async (req, res) => {
    try {
      const kampanyaData = insertKampanyaSchema.parse(req.body);
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

  app.put("/api/kampanyalar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const kampanyaData = insertKampanyaSchema.parse(req.body);
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

  app.delete("/api/kampanyalar/:id", async (req, res) => {
    try {
      const { id } = req.params;
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

  // Hata yakalama middleware'i
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Server hatası:", err);
    res.status(500).json({ error: "Sunucu hatası", details: String(err) });
  });

  const httpServer = createServer(app);
  return httpServer;
}