import { pgTable, text, serial, integer, boolean, json, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Kullanıcı rolleri için enum
export enum UserRole {
  ADMIN = "admin",
  KURUCU = "kurucu",
  SUBE_MUDURU = "şube müdürü",
  SATIS_DANISMANI = "satış danışmanı"
}

// Şubeler tablosu
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Kullanıcılar tablosu
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().$type<UserRole>().default(UserRole.SATIS_DANISMANI),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  active: boolean("active").notNull().default(true),
});

// Kampanya tablosu
export const kampanyalar = pgTable("kampanyalar", {
  id: serial("id").primaryKey(),
  kampanyaAdi: text("kampanya_adi").notNull(),
  egitimTipi: text("egitim_tipi").notNull(),
  kurSayisi: integer("kur_sayisi").notNull(),
  toplamDersSaati: integer("toplam_ders_saati").notNull(),
  listeFiyati: integer("liste_fiyati").notNull(),
  nakitFiyati: integer("nakit_fiyati").notNull(),
  indirimOrani: integer("indirim_orani").notNull(), // Veritabanında integer olarak oluşturulmuş
  faizOrani: integer("faiz_orani").notNull(), // Veritabanında integer olarak oluşturulmuş
  kitapFiyati: integer("kitap_fiyati").notNull(),
  kitapSetSayisi: integer("kitap_set_sayisi").default(1),
  maxKrediKartiTaksit: integer("max_kredi_karti_taksit").default(10),
  maxSenetTaksit: integer("max_senet_taksit").default(12),
  hediyeler: json("hediyeler").$type<{isim: string, fiyat: number}[]>().default([]),
  // branchId kolonu veritabanında mevcut değil, bu yüzden kaldırıldı
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert şemaları
export const insertBranchSchema = createInsertSchema(branches).pick({
  name: true,
  address: true,
  phone: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  branchId: true,
  active: true,
});

export const insertKampanyaSchema = createInsertSchema(kampanyalar).omit({
  id: true,
  createdAt: true,
});

// Tip tanımlamaları
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertKampanya = z.infer<typeof insertKampanyaSchema>;
export type Kampanya = typeof kampanyalar.$inferSelect;
