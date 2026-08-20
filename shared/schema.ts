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
    kullanicilar: many(kullaniciSubeRolleri),
    kampanyalar: many(kampanyalar)
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
  subeId: integer("sube_id").references(() => subeler.id, { onDelete: 'cascade' }),
});

// Kampanya-Şube ilişkisi
export const kampanyalarRelations = relations(kampanyalar, ({ one }) => {
  return {
    sube: one(subeler, {
      fields: [kampanyalar.subeId],
      references: [subeler.id]
    })
  };
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
  subeId: number | null;
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

// Toplu teklif gönderimlerinin ve teklif anındaki fiyat snapshot'larının
// kalıcı kaydı. Mevcut WhatsApp istatistiklerinden bağımsız tutulur.
export const topluGonderimler = pgTable("toplu_gonderimler", {
  id: serial("id").primaryKey(),
  baslik: text("baslik").notNull(),
  subeId: integer("sube_id").notNull().references(() => subeler.id, { onDelete: "cascade" }),
  subeAdi: text("sube_adi").notNull(),
  danismanId: integer("danisman_id").notNull(),
  danismanAdi: text("danisman_adi").notNull(),
  danismanSoyadi: text("danisman_soyadi").notNull(),
  durum: text("durum").notNull().default("hazir"),
  saglayici: text("saglayici").notNull().default("chrome-extension"),
  toplam: integer("toplam").notNull().default(0),
  gonderildi: integer("gonderildi").notNull().default(0),
  hata: integer("hata").notNull().default(0),
  bekliyor: integer("bekliyor").notNull().default(0),
  olusturanId: integer("olusturan_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const topluTeklifler = pgTable("toplu_teklifler", {
  id: serial("id").primaryKey(),
  gonderimId: integer("gonderim_id").notNull().references(() => topluGonderimler.id, { onDelete: "cascade" }),
  subeId: integer("sube_id").notNull().references(() => subeler.id, { onDelete: "cascade" }),
  ogrenciAdi: text("ogrenci_adi").notNull(),
  ogrenciTelefon: text("ogrenci_telefon").notNull(),
  sonEgitim: text("son_egitim").notNull(),
  sonKur: text("son_kur").notNull(),
  teklifKur: integer("teklif_kur").notNull(),
  kampanyaAdi: text("kampanya_adi").notNull(),
  egitimTipi: text("egitim_tipi").notNull(),
  odeme1: text("odeme_1").notNull(),
  odeme2: text("odeme_2").notNull(),
  odeme1Detay: text("odeme_1_detay").notNull(),
  odeme2Detay: text("odeme_2_detay").notNull(),
  mesaj: text("mesaj").notNull(),
  snapshot: json("snapshot").notNull(),
  durum: text("durum").notNull().default("bekliyor"),
  hataMesaji: text("hata_mesaji"),
  denemeSayisi: integer("deneme_sayisi").notNull().default(0),
  claimToken: text("claim_token"),
  claimedAt: timestamp("claimed_at"),
  gonderildiAt: timestamp("gonderildi_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chrome eklentisinin kullanıcı oturumunu görmeden, yalnızca belirli bir
// gönderim kuyruğuna bağlanması için tek kullanımlık eşleştirme kodları.
// Düz metin kod yerine yalnızca SHA-256 özeti saklanır.
export const topluEklentiEslestirmeleri = pgTable("toplu_eklenti_eslestirmeleri", {
  id: serial("id").primaryKey(),
  kodHash: text("kod_hash").notNull().unique(),
  gonderimId: integer("gonderim_id").notNull().references(() => topluGonderimler.id, { onDelete: "cascade" }),
  subeId: integer("sube_id").notNull().references(() => subeler.id, { onDelete: "cascade" }),
  olusturanId: integer("olusturan_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  gonderimDurumIdx: index("toplu_eklenti_eslestirme_gonderim_idx").on(table.gonderimId, table.expiresAt),
}));

// Eklentiye yalnızca değişim anında dönen opaque grant'in özeti saklanır.
// Grant, kullanıcı JWT'si ve session cookie'sinden tamamen ayrıdır.
export const topluEklentiGrantleri = pgTable("toplu_eklenti_grantleri", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  eslestirmeId: integer("eslestirme_id").notNull().references(() => topluEklentiEslestirmeleri.id, { onDelete: "cascade" }),
  gonderimId: integer("gonderim_id").notNull().references(() => topluGonderimler.id, { onDelete: "cascade" }),
  subeId: integer("sube_id").notNull().references(() => subeler.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  gonderimDurumIdx: index("toplu_eklenti_grant_gonderim_idx").on(table.gonderimId, table.expiresAt),
}));

export const topluGonderimlerRelations = relations(topluGonderimler, ({ one, many }) => ({
  sube: one(subeler, {
    fields: [topluGonderimler.subeId],
    references: [subeler.id],
  }),
  teklifler: many(topluTeklifler),
}));

export const topluTekliflerRelations = relations(topluTeklifler, ({ one }) => ({
  gonderim: one(topluGonderimler, {
    fields: [topluTeklifler.gonderimId],
    references: [topluGonderimler.id],
  }),
  sube: one(subeler, {
    fields: [topluTeklifler.subeId],
    references: [subeler.id],
  }),
}));

// WhatsApp Gönderim Kayıtları tablosu
export const whatsappGonderimleri = pgTable("whatsapp_gonderimleri", {
  id: serial("id").primaryKey(),
  ogrenciAdi: text("ogrenci_adi").notNull(),
  ogrenciTelefon: text("ogrenci_telefon").notNull(),
  kampanyaAdi: text("kampanya_adi").notNull(),
  egitimTipi: text("egitim_tipi").notNull(),
  genelToplam: integer("genel_toplam").notNull(),
  odemeTipi: text("odeme_tipi").notNull(),
  taksitSayisi: integer("taksit_sayisi").default(1),
  danismanAdi: text("danisman_adi").notNull(),
  danismanSoyadi: text("danisman_soyadi").notNull(),
  subeAdi: text("sube_adi").notNull(),
  subeId: integer("sube_id").notNull().references(() => subeler.id, { onDelete: "restrict" }),
  danismanId: integer("danisman_id").notNull().references(() => kullanicilar.id, { onDelete: "restrict" }),
  gonderilenAt: timestamp("gonderilen_at").defaultNow(),
});

export const insertWhatsappGonderimSchema = createInsertSchema(whatsappGonderimleri).omit({
  id: true,
  gonderilenAt: true,
});

// İstemcinin sadece teklif verilerini ve seçtiği şube bağlamını göndermesine
// izin verilir. Kayıt sahibi ile şube/danışman isimleri sunucuda üretilir.
export const whatsappGonderimRequestSchema = insertWhatsappGonderimSchema
  .omit({
    subeAdi: true,
    danismanId: true,
    danismanAdi: true,
    danismanSoyadi: true,
  })
  .extend({
    subeId: z.number().int().positive(),
  });

export type WhatsappGonderim = typeof whatsappGonderimleri.$inferSelect;
export type InsertWhatsappGonderim = z.infer<typeof insertWhatsappGonderimSchema>;
export type WhatsappGonderimRequest = z.infer<typeof whatsappGonderimRequestSchema>;

// Eğitim Tipleri tablosu
export const egitimTipleri = pgTable("egitim_tipleri", {
  id: serial("id").primaryKey(),
  egitimTipi: text("egitim_tipi").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Eğitim tipi insert şeması
export const insertEgitimTipiSchema = createInsertSchema(egitimTipleri, {
  egitimTipi: z.string().min(2, "Eğitim tipi en az 2 karakter olmalıdır"),
}).omit({ id: true, createdAt: true });

export type InsertEgitimTipi = z.infer<typeof insertEgitimTipiSchema>;
export type EgitimTipi = typeof egitimTipleri.$inferSelect;