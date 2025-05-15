import { pgTable, text, serial, integer, json, timestamp, varchar, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session tablosu - oturum yönetimi için gerekli
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => {
    return {
      expireIdx: index("IDX_session_expire").on(table.expire),
    };
  },
);

// Şube tablosu
export const subeler = pgTable("subeler", {
  id: serial("id").primaryKey(),
  subeAdi: text("sube_adi").notNull(),
  subeAdresi: text("sube_adresi"),
  subeTelefon: text("sube_telefon"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Kullanıcı rolleri için enum değerler
export const Roller = {
  KURUCU: "Kurucu",
  MUDUR: "Müdür",
  SATIS_DANISMANI: "Satış Danışmanı",
  SISTEM_YONETICISI: "Sistem Yöneticisi"
} as const;

// Kullanıcı tablosu
export const kullanicilar = pgTable("kullanicilar", {
  id: serial("id").primaryKey(),
  adi: text("adi").notNull(),
  soyadi: text("soyadi").notNull(),
  telefon: text("telefon"),
  // Şifre için salt ile birlikte hashlenmiş bir şifre depolayacağız
  sifre: text("sifre").notNull(),
  aktif: boolean("aktif").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Kullanıcı-Şube ilişki tablosu
export const kullaniciSubeRolleri = pgTable("kullanici_sube_rolleri", {
  id: serial("id").primaryKey(),
  kullaniciId: integer("kullanici_id").notNull().references(() => kullanicilar.id, { onDelete: 'cascade' }),
  subeId: integer("sube_id").notNull().references(() => subeler.id, { onDelete: 'cascade' }),
  rol: text("rol").notNull().$type<typeof Roller[keyof typeof Roller]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// İlişki tanımlamaları
export const subelerRelations = relations(subeler, ({ many }) => {
  return {
    kullanicilar: many(kullaniciSubeRolleri)
  };
});

export const kullanicilarRelations = relations(kullanicilar, ({ many }) => {
  return {
    subeler: many(kullaniciSubeRolleri)
  };
});

export const kullaniciSubeRolleriRelations = relations(kullaniciSubeRolleri, ({ one }) => {
  return {
    kullanici: one(kullanicilar, {
      fields: [kullaniciSubeRolleri.kullaniciId],
      references: [kullanicilar.id],
    }),
    sube: one(subeler, {
      fields: [kullaniciSubeRolleri.subeId],
      references: [subeler.id],
    })
  };
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
});

// Insert şemaları
export const insertKampanyaSchema = createInsertSchema(kampanyalar).omit({
  id: true,
});

export const insertSubeSchema = createInsertSchema(subeler).omit({
  id: true,
  createdAt: true,
});

export const insertKullaniciSchema = createInsertSchema(kullanicilar).omit({
  id: true,
  createdAt: true,
});

// Kullanıcı girişi için login şeması
export const loginSchema = z.object({
  telefon: z.string().min(1, "Telefon numarası zorunludur"),
  sifre: z.string().min(1, "Şifre zorunludur")
});

// Şifre değiştirme şeması
export const changePasswordSchema = z.object({
  eskiSifre: z.string().min(1, "Mevcut şifre zorunludur"),
  yeniSifre: z.string().min(6, "Yeni şifre en az 6 karakter olmalıdır"),
  yeniSifreTekrar: z.string().min(6, "Yeni şifre tekrarı en az 6 karakter olmalıdır")
}).refine(data => data.yeniSifre === data.yeniSifreTekrar, {
  message: "Şifreler eşleşmiyor",
  path: ["yeniSifreTekrar"]
});

export const insertKullaniciSubeRolSchema = createInsertSchema(kullaniciSubeRolleri).omit({
  id: true,
  createdAt: true,
});

// Tipler
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

export type Sube = typeof subeler.$inferSelect;
export type InsertSube = z.infer<typeof insertSubeSchema>;

export type Kullanici = typeof kullanicilar.$inferSelect;
export type InsertKullanici = z.infer<typeof insertKullaniciSchema>;

export type KullaniciSubeRol = typeof kullaniciSubeRolleri.$inferSelect;
export type InsertKullaniciSubeRol = z.infer<typeof insertKullaniciSubeRolSchema>;

// Yeni tipler
export type Login = z.infer<typeof loginSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

export type KullaniciWithRollerVeSubeler = Kullanici & {
  roller: Array<{
    subeId: number;
    subeAdi: string;
    rol: string;
  }>;
};

export type SubeWithKullanicilar = Sube & {
  kullanicilar: Array<{
    kullaniciId: number;
    kullaniciAdi: string;
    kullaniciSoyadi: string;
    rol: string;
  }>;
};

export type InsertKampanya = z.infer<typeof insertKampanyaSchema>;