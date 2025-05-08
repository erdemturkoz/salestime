import { users, type User, type InsertUser, type Kampanya, type InsertKampanya } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private kampanyalar: Map<number, Kampanya>;
  private userCurrentId: number;
  private kampanyaCurrentId: number;

  constructor() {
    this.users = new Map();
    this.kampanyalar = new Map();
    this.userCurrentId = 1;
    this.kampanyaCurrentId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Kampanya operations
  async getAllKampanyalar(): Promise<Kampanya[]> {
    return Array.from(this.kampanyalar.values());
  }

  async getKampanya(id: number): Promise<Kampanya | undefined> {
    return this.kampanyalar.get(id);
  }

  async createKampanya(insertKampanya: InsertKampanya): Promise<Kampanya> {
    const id = this.kampanyaCurrentId++;
    const kampanya: Kampanya = { ...insertKampanya, id };
    this.kampanyalar.set(id, kampanya);
    return kampanya;
  }

  async updateKampanya(id: number, updateData: InsertKampanya): Promise<Kampanya | undefined> {
    const existingKampanya = this.kampanyalar.get(id);
    
    if (!existingKampanya) {
      return undefined;
    }
    
    const updatedKampanya: Kampanya = { ...updateData, id };
    this.kampanyalar.set(id, updatedKampanya);
    
    return updatedKampanya;
  }

  async deleteKampanya(id: number): Promise<boolean> {
    return this.kampanyalar.delete(id);
  }
}

export const storage = new MemStorage();
