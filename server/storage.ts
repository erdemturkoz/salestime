import { users, kampanyalar, type User, type InsertUser, type Kampanya, type InsertKampanya } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllKampanyalar(): Promise<Kampanya[]>;
  getKampanya(id: number): Promise<Kampanya | undefined>;
  createKampanya(kampanya: InsertKampanya): Promise<Kampanya>;
  updateKampanya(id: number, kampanya: InsertKampanya): Promise<Kampanya | undefined>;
  deleteKampanya(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Kampanya operations
  async getAllKampanyalar(): Promise<Kampanya[]> {
    return await db.select().from(kampanyalar);
  }

  async getKampanya(id: number): Promise<Kampanya | undefined> {
    const result = await db.select().from(kampanyalar).where(eq(kampanyalar.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async createKampanya(insertKampanya: InsertKampanya): Promise<Kampanya> {
    const result = await db.insert(kampanyalar).values(insertKampanya).returning();
    return result[0];
  }

  async updateKampanya(id: number, updateData: InsertKampanya): Promise<Kampanya | undefined> {
    const result = await db
      .update(kampanyalar)
      .set(updateData)
      .where(eq(kampanyalar.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteKampanya(id: number): Promise<boolean> {
    const result = await db
      .delete(kampanyalar)
      .where(eq(kampanyalar.id, id))
      .returning();
    
    return result.length > 0;
  }
}

// MemStorage yerine DatabaseStorage kullanmaya başla
export const storage = new DatabaseStorage();
