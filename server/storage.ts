import { 
  users, 
  branches,
  kampanyalar, 
  type User, 
  type InsertUser, 
  type Kampanya, 
  type InsertKampanya,
  type Branch,
  type InsertBranch,
  UserRole
} from "@shared/schema";
import { db } from "./db";
import { eq, isNull, and, or } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUsersByBranch(branchId: number): Promise<User[]>;
  
  // Branch operations
  getAllBranches(): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: number, branch: InsertBranch): Promise<Branch | undefined>;
  deleteBranch(id: number): Promise<boolean>;
  
  // Kampanya operations
  getAllKampanyalar(): Promise<Kampanya[]>;
  getKampanyasByBranch(branchId: number): Promise<Kampanya[]>;
  getAllVisibleKampanyalar(branchId?: number): Promise<Kampanya[]>; // belirli şube + global kampanyalar
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
  
  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    
    return result.length > 0;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async getUsersByBranch(branchId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.branchId, branchId));
  }
  
  // Branch operations
  async getAllBranches(): Promise<Branch[]> {
    return await db.select().from(branches);
  }
  
  async getBranch(id: number): Promise<Branch | undefined> {
    const result = await db.select().from(branches).where(eq(branches.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const result = await db.insert(branches).values(insertBranch).returning();
    return result[0];
  }
  
  async updateBranch(id: number, updateData: InsertBranch): Promise<Branch | undefined> {
    const result = await db
      .update(branches)
      .set(updateData)
      .where(eq(branches.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }
  
  async deleteBranch(id: number): Promise<boolean> {
    const result = await db
      .delete(branches)
      .where(eq(branches.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Kampanya operations
  async getAllKampanyalar(): Promise<Kampanya[]> {
    return await db.select().from(kampanyalar);
  }
  
  async getKampanyasByBranch(branchId: number): Promise<Kampanya[]> {
    return await db.select()
      .from(kampanyalar)
      .where(eq(kampanyalar.branchId, branchId));
  }
  
  async getAllVisibleKampanyalar(branchId?: number): Promise<Kampanya[]> {
    // Bir branchId sağlanırsa, o şubeye ait kampanyaları ve tüm şubelere görünür kampanyaları getir
    if (branchId) {
      return await db.select()
        .from(kampanyalar)
        .where(
          or(
            eq(kampanyalar.branchId, branchId),
            isNull(kampanyalar.branchId)
          )
        );
    }
    
    // branchId sağlanmazsa tüm kampanyaları getir
    return await this.getAllKampanyalar();
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

// Veritabanı Depolama kullanalım
export const storage = new DatabaseStorage();
