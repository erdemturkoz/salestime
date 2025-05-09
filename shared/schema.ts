import { pgTable, text, serial, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
});

// Insert şemaları
export const insertKampanyaSchema = createInsertSchema(kampanyalar).omit({
  id: true,
});

// Manuel olarak Kampanya tipini tanımlayalım (veritabanındaki gerçek sütunlara uygun şekilde)
export type Kampanya = {
  id: number;
  kampanyaAdi: string;
  egitimTipi: string;
  kurSayisi: number;
  toplamDersSaati: number;
  listeFiyati: number;
  nakitFiyati: number;
  indirimOrani: number;
  faizOrani: number;
  kitapFiyati: number;
  kitapSetSayisi: number;
  maxKrediKartiTaksit: number;
  maxSenetTaksit: number;
  hediyeler: Array<{isim: string, fiyat: number}>;
};

export type InsertKampanya = z.infer<typeof insertKampanyaSchema>;