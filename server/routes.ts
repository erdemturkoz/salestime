import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertKampanyaSchema, 
  insertBranchSchema, 
  insertUserSchema,
  UserRole
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Kampanya API routes
  app.get("/api/kampanyalar", async (req, res) => {
    try {
      const { branchId } = req.query;
      let kampanyalar;
      
      if (branchId) {
        // Şube ID'ye göre filtrelenmiş kampanyaları getir
        kampanyalar = await storage.getAllVisibleKampanyalar(Number(branchId));
      } else {
        // Tüm kampanyaları getir
        kampanyalar = await storage.getAllKampanyalar();
      }
      
      res.json(kampanyalar);
    } catch (error) {
      res.status(500).json({ error: "Kampanyalar yüklenirken bir hata oluştu" });
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
      res.status(500).json({ error: "Kampanya yüklenirken bir hata oluştu" });
    }
  });

  app.post("/api/kampanyalar", async (req, res) => {
    try {
      const kampanyaData = insertKampanyaSchema.parse(req.body);
      const newKampanya = await storage.createKampanya(kampanyaData);
      res.status(201).json(newKampanya);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Kampanya oluşturulurken bir hata oluştu" });
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Kampanya güncellenirken bir hata oluştu" });
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
      res.status(500).json({ error: "Kampanya silinirken bir hata oluştu" });
    }
  });

  // Şube API routes
  app.get("/api/branches", async (req, res) => {
    try {
      const branches = await storage.getAllBranches();
      res.json(branches);
    } catch (error) {
      res.status(500).json({ error: "Şubeler yüklenirken bir hata oluştu" });
    }
  });

  app.get("/api/branches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const branch = await storage.getBranch(parseInt(id));
      
      if (!branch) {
        return res.status(404).json({ error: "Şube bulunamadı" });
      }
      
      res.json(branch);
    } catch (error) {
      res.status(500).json({ error: "Şube yüklenirken bir hata oluştu" });
    }
  });

  app.post("/api/branches", async (req, res) => {
    try {
      const branchData = insertBranchSchema.parse(req.body);
      const newBranch = await storage.createBranch(branchData);
      res.status(201).json(newBranch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Şube oluşturulurken bir hata oluştu" });
    }
  });

  app.put("/api/branches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const branchData = insertBranchSchema.parse(req.body);
      const updatedBranch = await storage.updateBranch(parseInt(id), branchData);
      
      if (!updatedBranch) {
        return res.status(404).json({ error: "Güncellenecek şube bulunamadı" });
      }
      
      res.json(updatedBranch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Şube güncellenirken bir hata oluştu" });
    }
  });

  app.delete("/api/branches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBranch(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Silinecek şube bulunamadı" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Şube silinirken bir hata oluştu" });
    }
  });

  // Kullanıcı API routes
  app.get("/api/users", async (req, res) => {
    try {
      const { branchId } = req.query;
      let users;
      
      if (branchId) {
        // Şube ID'ye göre filtrelenmiş kullanıcıları getir
        users = await storage.getUsersByBranch(Number(branchId));
      } else {
        // Tüm kullanıcıları getir
        users = await storage.getAllUsers();
      }
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Kullanıcılar yüklenirken bir hata oluştu" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(parseInt(id));
      
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Kullanıcı yüklenirken bir hata oluştu" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Kullanıcı oluşturulurken bir hata oluştu" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userData = insertUserSchema.partial().parse(req.body); // Kısmi güncelleme
      const updatedUser = await storage.updateUser(parseInt(id), userData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "Güncellenecek kullanıcı bulunamadı" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Kullanıcı güncellenirken bir hata oluştu" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(parseInt(id));
      
      if (!success) {
        return res.status(404).json({ error: "Silinecek kullanıcı bulunamadı" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Kullanıcı silinirken bir hata oluştu" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
