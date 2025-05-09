import { pgTable, text, serial, integer, boolean, json, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Kampanya tablosunu type'a uygun olarak güncelle
export const kampanyalar = pgTable("kampanyalar", {
  id: serial("id").primaryKey(),
  kampanyaAdi: text("kampanya_adi").notNull(),
  egitimTipi: text("egitim_tipi").notNull(),
  kurSayisi: integer("kur_sayisi").notNull(),
  toplamDersSaati: integer("toplam_ders_saati").notNull(),
  listeFiyati: integer("liste_fiyati").notNull(),
  nakitFiyati: integer("nakit_fiyati").notNull(),
  indirimOrani: real("indirim_orani").notNull(), // Float değer için integer yerine real kullanılıyor
  faizOrani: real("faiz_orani").notNull(), // Faiz oranı da ondalıklı olabilir
  kitapFiyati: integer("kitap_fiyati").notNull(),
  kitapSetSayisi: integer("kitap_set_sayisi").default(1),
  maxKrediKartiTaksit: integer("max_kredi_karti_taksit").default(10),
  maxSenetTaksit: integer("max_senet_taksit").default(12),
  hediyeler: json("hediyeler").$type<{isim: string, fiyat: number}[]>().default([]),
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
