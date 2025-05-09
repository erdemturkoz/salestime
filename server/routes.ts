import { Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { storage } from "./storage";
import { insertKampanyaSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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