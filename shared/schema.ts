import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const kampanyalar = pgTable("kampanyalar", {
  id: serial("id").primaryKey(),
  kampanyaAdi: text("kampanya_adi").notNull(),
  kurSayisi: integer("kur_sayisi").notNull(),
  listeFiyati: integer("liste_fiyati").notNull(),
  nakitFiyati: integer("nakit_fiyati").notNull(),
  indirimOrani: integer("indirim_orani").notNull(),
  faizOrani: integer("faiz_orani").notNull(),
  kitapFiyati: integer("kitap_fiyati").notNull(),
  hediyeler: json("hediyeler").$type<string[]>().default([]),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertKampanyaSchema = createInsertSchema(kampanyalar).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertKampanya = z.infer<typeof insertKampanyaSchema>;
export type Kampanya = typeof kampanyalar.$inferSelect;
