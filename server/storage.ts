import { 
  kampanyalar, 
  kullanicilar,
  subeler,
  kullaniciSubeRolleri,
  Roller,
  egitimTipleri,
  whatsappGonderimleri,
  type Kampanya, 
  type InsertKampanya,
  type Kullanici,
  type InsertKullanici,
  type Sube,
  type InsertSube,
  type KullaniciSubeRol,
  type InsertKullaniciSubeRol,
  type SubeRolu,
  type KullaniciWithRollerVeSubeler,
  type SubeWithKullanicilar,
  type EgitimTipi,
  type InsertEgitimTipi,
  type WhatsappGonderim,
  type InsertWhatsappGonderim
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, gte, lte, inArray, isNull, isNotNull } from "drizzle-orm";

export type WhatsappGonderimFilters = {
  subeId?: number;
  danismanId?: number;
  baslangicTarihi?: Date;
  bitisTarihiExclusive?: Date;
};

export interface IStorage {
  // Eğitim Tipleri operations
  getAllEgitimTipleri(subeIds?: readonly number[]): Promise<EgitimTipi[]>;
  getEgitimTipi(id: number): Promise<EgitimTipi | undefined>;
  createEgitimTipi(egitimTipi: InsertEgitimTipi): Promise<EgitimTipi>;
  updateEgitimTipi(id: number, egitimTipi: InsertEgitimTipi): Promise<EgitimTipi | undefined>;
  deleteEgitimTipi(id: number): Promise<boolean>;
  
  // Kampanya operations
  getAllKampanyalar(): Promise<Kampanya[]>;
  getKampanyasBySubeId(subeId: number): Promise<Kampanya[]>;
  getKampanya(id: number): Promise<Kampanya | undefined>;
  createKampanya(kampanya: InsertKampanya): Promise<Kampanya>;
  updateKampanya(id: number, kampanya: InsertKampanya): Promise<Kampanya | undefined>;
  deleteKampanya(id: number): Promise<boolean>;
  copyKampanyaToSube(kampanyaId: number, subeId: number): Promise<Kampanya | undefined>;
  copyManyKampanyalarToSube(kampanyaIds: (number | string)[], subeId: number): Promise<Kampanya[]>;
  
  // Kullanıcı operations
  getAllKullanicilar(): Promise<KullaniciWithRollerVeSubeler[]>;
  getKullanici(id: number): Promise<KullaniciWithRollerVeSubeler | undefined>;
  getKullaniciByTelefon(telefon: string): Promise<Kullanici | undefined>;
  getKullaniciRoller(kullaniciId: number): Promise<Array<{subeId: number; subeAdi: string; rol: string}>>;
  createKullanici(kullanici: InsertKullanici): Promise<Kullanici>;
  updateKullanici(id: number, kullanici: Partial<InsertKullanici>): Promise<Kullanici | undefined>;
  setKullaniciGlobalRole(id: number, globalRol: string | null): Promise<boolean>;
  countActiveSystemAdmins(): Promise<number>;
  updateKullaniciPasswordAndInvalidate(id: number, hashedPassword: string): Promise<boolean>;
  invalidateKullaniciAuth(id: number): Promise<boolean>;
  deleteKullanici(id: number): Promise<boolean>;
  addKullaniciToSube(kullaniciId: number, subeId: number, rol: SubeRolu): Promise<KullaniciSubeRol>;
  removeKullaniciFromSube(kullaniciId: number, subeId: number): Promise<boolean>;
  
  // Şube operations
  getAllSubeler(): Promise<SubeWithKullanicilar[]>;
  getSube(id: number): Promise<SubeWithKullanicilar | undefined>;
  createSube(sube: InsertSube): Promise<Sube>;
  updateSube(id: number, sube: InsertSube): Promise<Sube | undefined>;
  deleteSube(id: number): Promise<boolean>;

  // WhatsApp Gönderim operations
  getAllSubeIds(): Promise<number[]>;
  createWhatsappGonderim(data: InsertWhatsappGonderim, yetkiliSubeIds: readonly number[]): Promise<WhatsappGonderim>;
  deleteWhatsappGonderim(id: number, yetkiliSubeIds: readonly number[]): Promise<boolean>;
  getAllWhatsappGonderimleri(
    filters: WhatsappGonderimFilters | undefined,
    yetkiliSubeIds: readonly number[],
  ): Promise<WhatsappGonderim[]>;
}

export class DatabaseStorage implements IStorage {
  // Eğitim Tipleri operations
  async getAllEgitimTipleri(subeIds?: readonly number[]): Promise<EgitimTipi[]> {
    if (subeIds && subeIds.length === 0) return [];
    return db.select().from(egitimTipleri).where(
      subeIds ? inArray(egitimTipleri.subeId, [...subeIds]) : isNotNull(egitimTipleri.subeId),
    );
  }

  async getEgitimTipi(id: number): Promise<EgitimTipi | undefined> {
    try {
      const [egitimTipi] = await db
        .select()
        .from(egitimTipleri)
        .where(eq(egitimTipleri.id, id));
      return egitimTipi;
    } catch (error) {
      console.error(`Eğitim tipi ID ${id} getirilirken hata:`, error);
      return undefined;
    }
  }

  async createEgitimTipi(insertEgitimTipi: InsertEgitimTipi): Promise<EgitimTipi> {
    try {
      const [result] = await db
        .insert(egitimTipleri)
        .values(insertEgitimTipi)
        .returning();
      return result;
    } catch (error) {
      console.error("Eğitim tipi oluşturulurken hata:", error);
      throw error;
    }
  }

  async updateEgitimTipi(id: number, updateData: InsertEgitimTipi): Promise<EgitimTipi | undefined> {
    try {
      const [result] = await db
        .update(egitimTipleri)
        .set(updateData)
        .where(eq(egitimTipleri.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error(`Eğitim tipi ID ${id} güncellenirken hata:`, error);
      throw error;
    }
  }

  async isEgitimTipiUsedInKampanyalar(egitimTipiAdi: string, subeId: number): Promise<boolean> {
    try {
      // Drizzle ORM sorgusu kullanarak kampanyalardan kontrol yapalım
      const kampanyaList = await db.select({ count: sql`count(*)` })
        .from(kampanyalar)
        .where(and(eq(kampanyalar.egitimTipi, egitimTipiAdi), eq(kampanyalar.subeId, subeId)));
      
      const count = Number(kampanyaList[0].count);
      console.log(`Eğitim tipi '${egitimTipiAdi}' için kampanya kullanımı kontrolü: ${count} adet kampanya bulundu`);
      
      return count > 0;
    } catch (error) {
      console.error(`Eğitim tipi '${egitimTipiAdi}' kullanım kontrolünde hata:`, error);
      // Güvenlik için hata durumunda true döndürelim
      return true; 
    }
  }

  async deleteEgitimTipi(id: number): Promise<boolean> {
    try {
      // Önce eğitim tipini al
      const [egitimTipi] = await db
        .select()
        .from(egitimTipleri)
        .where(eq(egitimTipleri.id, id));
      
      if (!egitimTipi || !egitimTipi.subeId) {
        console.warn(`Silinecek eğitim tipi bulunamadı: ID ${id}`);
        return false;
      }
      
      // Eğitim tipinin herhangi bir kampanyada kullanılıp kullanılmadığını kontrol et
      const isUsed = await this.isEgitimTipiUsedInKampanyalar(egitimTipi.egitimTipi, egitimTipi.subeId);
      
      if (isUsed) {
        console.warn(`Eğitim tipi '${egitimTipi.egitimTipi}' kampanyalarda kullanımda olduğu için silinemez.`);
        return false;
      }
      
      // Kullanılmıyorsa sil
      const result = await db
        .delete(egitimTipleri)
        .where(eq(egitimTipleri.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`Eğitim tipi ID ${id} silinirken hata:`, error);
      throw error;
    }
  }
  // Kampanya operations
  async getAllKampanyalar(): Promise<Kampanya[]> {
    try {
      const result = await db.execute<Kampanya>(
        sql`SELECT 
          id, 
          kampanya_adi as "kampanyaAdi", 
          egitim_tipi as "egitimTipi",
          kur_sayisi as "kurSayisi",
          toplam_ders_saati as "toplamDersSaati",
          liste_fiyati as "listeFiyati",
          nakit_fiyati as "nakitFiyati",
          indirim_orani as "indirimOrani",
          faiz_orani as "faizOrani",
          kredi_karti_komisyon_orani as "krediKartiKomisyonOrani",
          kitap_fiyati as "kitapFiyati",
          kitap_set_sayisi as "kitapSetSayisi",
          max_kredi_karti_taksit as "maxKrediKartiTaksit",
          max_senet_taksit as "maxSenetTaksit",
          hediyeler,
          sube_id as "subeId"
        FROM kampanyalar`
      );

      return result.rows;
    } catch (error) {
      console.error("Kampanyalar API hatası:", error);
      throw error;
    }
  }
  
  async getKampanyasBySubeId(subeId: number): Promise<Kampanya[]> {
    try {
      const result = await db.execute<Kampanya>(
        sql`SELECT 
          id, 
          kampanya_adi as "kampanyaAdi", 
          egitim_tipi as "egitimTipi",
          kur_sayisi as "kurSayisi",
          toplam_ders_saati as "toplamDersSaati",
          liste_fiyati as "listeFiyati",
          nakit_fiyati as "nakitFiyati",
          indirim_orani as "indirimOrani",
          faiz_orani as "faizOrani",
          kredi_karti_komisyon_orani as "krediKartiKomisyonOrani",
          kitap_fiyati as "kitapFiyati",
          kitap_set_sayisi as "kitapSetSayisi",
          max_kredi_karti_taksit as "maxKrediKartiTaksit",
          max_senet_taksit as "maxSenetTaksit",
          hediyeler,
          sube_id as "subeId"
        FROM kampanyalar
        WHERE sube_id = ${subeId}`
      );

      return result.rows;
    } catch (error) {
      console.error(`Şube ${subeId} için kampanyalar getirilirken hata:`, error);
      return [];
    }
  }

  async getKampanya(id: number): Promise<Kampanya | undefined> {
    try {
      const result = await db.execute<Kampanya>(
        sql`SELECT 
          id, 
          kampanya_adi as "kampanyaAdi", 
          egitim_tipi as "egitimTipi",
          kur_sayisi as "kurSayisi",
          toplam_ders_saati as "toplamDersSaati",
          liste_fiyati as "listeFiyati",
          nakit_fiyati as "nakitFiyati",
          indirim_orani as "indirimOrani",
          faiz_orani as "faizOrani",
          kredi_karti_komisyon_orani as "krediKartiKomisyonOrani",
          kitap_fiyati as "kitapFiyati",
          kitap_set_sayisi as "kitapSetSayisi",
          max_kredi_karti_taksit as "maxKrediKartiTaksit",
          max_senet_taksit as "maxSenetTaksit",
          hediyeler,
          sube_id as "subeId"
        FROM kampanyalar
        WHERE id = ${id}`
      );
      
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error("Kampanya getirme hatası:", error);
      return undefined;
    }
  }
  
  async copyKampanyaToSube(kampanyaId: number, subeId: number): Promise<Kampanya | undefined> {
    try {
      // İlk olarak var olan kampanyayı al
      const kampanya = await this.getKampanya(kampanyaId);
      
      if (!kampanya) {
        console.error(`ID ${kampanyaId} ile kampanya bulunamadı`);
        return undefined;
      }
      
      // Yeni kampanya verileri oluştur
      const result = await db.execute<Kampanya>(
        sql`INSERT INTO kampanyalar (
          kampanya_adi,
          egitim_tipi,
          kur_sayisi,
          toplam_ders_saati,
          liste_fiyati,
          nakit_fiyati,
          indirim_orani,
          faiz_orani,
          kredi_karti_komisyon_orani,
          kitap_fiyati,
          kitap_set_sayisi,
          max_kredi_karti_taksit,
          max_senet_taksit,
          hediyeler,
          sube_id
        ) VALUES (
          ${kampanya.kampanyaAdi}, ${kampanya.egitimTipi}, ${kampanya.kurSayisi},
          ${kampanya.toplamDersSaati}, ${kampanya.listeFiyati}, ${kampanya.nakitFiyati},
          ${kampanya.indirimOrani}, ${kampanya.faizOrani}, ${kampanya.krediKartiKomisyonOrani}, ${kampanya.kitapFiyati},
          ${kampanya.kitapSetSayisi}, ${kampanya.maxKrediKartiTaksit}, ${kampanya.maxSenetTaksit},
          ${JSON.stringify(kampanya.hediyeler)}, ${subeId}
        )
        RETURNING 
          id, 
          kampanya_adi as "kampanyaAdi", 
          egitim_tipi as "egitimTipi",
          kur_sayisi as "kurSayisi",
          toplam_ders_saati as "toplamDersSaati",
          liste_fiyati as "listeFiyati",
          nakit_fiyati as "nakitFiyati",
          indirim_orani as "indirimOrani",
          faiz_orani as "faizOrani",
          kredi_karti_komisyon_orani as "krediKartiKomisyonOrani",
          kitap_fiyati as "kitapFiyati",
          kitap_set_sayisi as "kitapSetSayisi",
          max_kredi_karti_taksit as "maxKrediKartiTaksit",
          max_senet_taksit as "maxSenetTaksit",
          hediyeler,
          sube_id as "subeId"`
      );
      
      if (result.rows.length === 0) {
        console.error("Kampanya kopyalanırken veri döndürülemedi");
        return undefined;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Kampanya ${kampanyaId} şubeye ${subeId} kopyalanırken hata:`, error);
      return undefined;
    }
  }
  
  async copyManyKampanyalarToSube(kampanyaIds: (number | string)[], subeId: number): Promise<Kampanya[]> {
    const results: Kampanya[] = [];
    const errors: (number | string)[] = [];
    
    // Her bir kampanya için kopyalama işlemi yapılır
    for (const kampanyaId of kampanyaIds) {
      try {
        // Kampanya ID'sinin geçerli bir sayı olduğundan emin olalım
        const validKampanyaId = typeof kampanyaId === 'string' ? parseInt(kampanyaId) : kampanyaId;
        
        // NaN kontrolü yap
        if (isNaN(validKampanyaId)) {
          console.error(`Geçersiz kampanya ID'si: ${kampanyaId}`);
          errors.push(kampanyaId);
          continue;
        }
        
        const newKampanya = await this.copyKampanyaToSube(validKampanyaId, subeId);
        if (newKampanya) {
          results.push(newKampanya);
        } else {
          errors.push(kampanyaId);
        }
      } catch (error) {
        console.error(`Kampanya ${kampanyaId} şubeye ${subeId} kopyalanırken hata:`, error);
        errors.push(kampanyaId);
      }
    }
    
    if (errors.length > 0) {
      console.warn(`Bazı kampanyalar kopyalanamadı (IDs: ${errors.join(', ')})`);
    }
    
    return results;
  }

  async createKampanya(insertKampanya: InsertKampanya): Promise<Kampanya> {
    const result = await db.insert(kampanyalar).values(insertKampanya).returning();
    return result[0] as Kampanya;
  }

  async updateKampanya(id: number, updateData: InsertKampanya): Promise<Kampanya | undefined> {
    const result = await db
      .update(kampanyalar)
      .set(updateData)
      .where(eq(kampanyalar.id, id))
      .returning();
    
    return result.length > 0 ? result[0] as Kampanya : undefined;
  }

  async deleteKampanya(id: number): Promise<boolean> {
    const result = await db
      .delete(kampanyalar)
      .where(eq(kampanyalar.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Kullanıcı operations
  async getAllKullanicilar(): Promise<KullaniciWithRollerVeSubeler[]> {
    const kullanicilarResult = await db.select().from(kullanicilar);
    const kullanicilarWithRoller: KullaniciWithRollerVeSubeler[] = [];

    for (const kullanici of kullanicilarResult) {
      const rollerResult = await db
        .select({
          subeId: kullaniciSubeRolleri.subeId,
          subeAdi: subeler.subeAdi,
          rol: kullaniciSubeRolleri.rol
        })
        .from(kullaniciSubeRolleri)
        .innerJoin(subeler, eq(kullaniciSubeRolleri.subeId, subeler.id))
        .where(eq(kullaniciSubeRolleri.kullaniciId, kullanici.id));

      kullanicilarWithRoller.push({
        ...kullanici,
        roller: rollerResult
      });
    }

    return kullanicilarWithRoller;
  }

  async getKullanici(id: number): Promise<KullaniciWithRollerVeSubeler | undefined> {
    try {
      const [kullanici] = await db.select().from(kullanicilar).where(eq(kullanicilar.id, id));
      
      if (!kullanici) return undefined;
      
      // Drizzle ORM ile ilişkili verileri çekme
      const rollerResult = await db
        .select({
          subeId: kullaniciSubeRolleri.subeId,
          subeAdi: subeler.subeAdi,
          rol: kullaniciSubeRolleri.rol
        })
        .from(kullaniciSubeRolleri)
        .innerJoin(subeler, eq(kullaniciSubeRolleri.subeId, subeler.id))
        .where(eq(kullaniciSubeRolleri.kullaniciId, id));
      
      return {
        ...kullanici,
        roller: rollerResult
      };
    } catch (error) {
      console.error("Kullanıcı getirme hatası:", error);
      return undefined;
    }
  }

  async createKullanici(kullanici: InsertKullanici): Promise<Kullanici> {
    const result = await db.insert(kullanicilar).values(kullanici).returning();
    return result[0];
  }

  async updateKullanici(id: number, updateData: Partial<InsertKullanici>): Promise<Kullanici | undefined> {
    const result = await db
      .update(kullanicilar)
      .set(updateData)
      .where(eq(kullanicilar.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  async setKullaniciGlobalRole(id: number, globalRol: string | null): Promise<boolean> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(726593146)`);
      const [target] = await tx
        .select({ globalRol: kullanicilar.globalRol, aktif: kullanicilar.aktif })
        .from(kullanicilar)
        .where(eq(kullanicilar.id, id));
      if (!target) return false;

      if (
        target.globalRol === Roller.SISTEM_YONETICISI &&
        target.aktif &&
        globalRol !== Roller.SISTEM_YONETICISI
      ) {
        const [admins] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(kullanicilar)
          .where(and(
            eq(kullanicilar.globalRol, Roller.SISTEM_YONETICISI),
            eq(kullanicilar.aktif, true),
          ));
        if ((admins?.count ?? 0) <= 1) return false;
      }

      const result = await tx
        .update(kullanicilar)
        .set({
          globalRol,
          authVersion: sql`${kullanicilar.authVersion} + 1`,
        })
        .where(eq(kullanicilar.id, id))
        .returning({ id: kullanicilar.id });

      return result.length > 0;
    });
  }

  async countActiveSystemAdmins(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(kullanicilar)
      .where(and(
        eq(kullanicilar.globalRol, Roller.SISTEM_YONETICISI),
        eq(kullanicilar.aktif, true),
      ));

    return result?.count ?? 0;
  }

  async deleteKullanici(id: number): Promise<boolean> {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(726593146)`);
      const [target] = await tx
        .select({ globalRol: kullanicilar.globalRol, aktif: kullanicilar.aktif })
        .from(kullanicilar)
        .where(eq(kullanicilar.id, id));
      if (!target) return false;

      if (target.globalRol === Roller.SISTEM_YONETICISI && target.aktif) {
        const [admins] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(kullanicilar)
          .where(and(
            eq(kullanicilar.globalRol, Roller.SISTEM_YONETICISI),
            eq(kullanicilar.aktif, true),
          ));
        if ((admins?.count ?? 0) <= 1) return false;
      }

      const result = await tx
        .delete(kullanicilar)
        .where(eq(kullanicilar.id, id))
        .returning();

      return result.length > 0;
    });
  }
  
  async getKullaniciByTelefon(telefon: string): Promise<Kullanici | undefined> {
    try {
      const [kullanici] = await db
        .select()
        .from(kullanicilar)
        .where(eq(kullanicilar.telefon, telefon));
      
      return kullanici;
    } catch (error) {
      console.error("Telefona göre kullanıcı getirme hatası:", error);
      return undefined;
    }
  }
  
  // Kullanıcının şube rollerini getirir
  async getKullaniciRoller(kullaniciId: number): Promise<Array<{subeId: number; subeAdi: string; rol: string}>> {
    try {
      // Kullanıcının şube ve rollerini getir
      const result = await db
        .select({
          subeId: kullaniciSubeRolleri.subeId,
          subeAdi: subeler.subeAdi,
          rol: kullaniciSubeRolleri.rol,
        })
        .from(kullaniciSubeRolleri)
        .innerJoin(subeler, eq(kullaniciSubeRolleri.subeId, subeler.id))
        .where(eq(kullaniciSubeRolleri.kullaniciId, kullaniciId));
      
      return result;
    } catch (error) {
      console.error("Kullanıcı rolleri getirme hatası:", error);
      return [];
    }
  }
  
  async updateKullaniciPasswordAndInvalidate(id: number, hashedPassword: string): Promise<boolean> {
    try {
      const result = await db
        .update(kullanicilar)
        .set({
          sifre: hashedPassword,
          authVersion: sql`${kullanicilar.authVersion} + 1`,
        })
        .where(eq(kullanicilar.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Kullanıcı şifre güncelleme hatası:", error);
      return false;
    }
  }

  async invalidateKullaniciAuth(id: number): Promise<boolean> {
    try {
      const result = await db
        .update(kullanicilar)
        .set({ authVersion: sql`${kullanicilar.authVersion} + 1` })
        .where(eq(kullanicilar.id, id))
        .returning({ id: kullanicilar.id });
      return result.length > 0;
    } catch (error) {
      console.error("Kullanıcı erişimi geçersizleştirilirken hata:", error);
      return false;
    }
  }

  async addKullaniciToSube(kullaniciId: number, subeId: number, rol: SubeRolu): Promise<KullaniciSubeRol> {
    // Önce var olan bir ilişki var mı kontrol et
    const existing = await db
      .select()
      .from(kullaniciSubeRolleri)
      .where(
        and(
          eq(kullaniciSubeRolleri.kullaniciId, kullaniciId),
          eq(kullaniciSubeRolleri.subeId, subeId)
        )
      );
    
    // Varsa güncelle, yoksa yeni ekle
    if (existing.length > 0) {
      const [result] = await db
        .update(kullaniciSubeRolleri)
        .set({ rol })
        .where(
          and(
            eq(kullaniciSubeRolleri.kullaniciId, kullaniciId),
            eq(kullaniciSubeRolleri.subeId, subeId)
          )
        )
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(kullaniciSubeRolleri)
        .values({ kullaniciId, subeId, rol })
        .returning();
      return result;
    }
  }

  async removeKullaniciFromSube(kullaniciId: number, subeId: number): Promise<boolean> {
    const result = await db
      .delete(kullaniciSubeRolleri)
      .where(
        and(
          eq(kullaniciSubeRolleri.kullaniciId, kullaniciId),
          eq(kullaniciSubeRolleri.subeId, subeId)
        )
      )
      .returning();
    
    return result.length > 0;
  }

  // Şube operations
  async getAllSubeler(): Promise<SubeWithKullanicilar[]> {
    const subelerResult = await db.select().from(subeler);
    const subelerWithKullanicilar: SubeWithKullanicilar[] = [];

    for (const sube of subelerResult) {
      const kullanicilarResult = await db
        .select({
          kullaniciId: kullaniciSubeRolleri.kullaniciId,
          kullaniciAdi: kullanicilar.adi,
          kullaniciSoyadi: kullanicilar.soyadi,
          rol: kullaniciSubeRolleri.rol
        })
        .from(kullaniciSubeRolleri)
        .innerJoin(kullanicilar, eq(kullaniciSubeRolleri.kullaniciId, kullanicilar.id))
        .where(and(
          eq(kullaniciSubeRolleri.subeId, sube.id),
          isNull(kullanicilar.globalRol),
        ));

      subelerWithKullanicilar.push({
        ...sube,
        kullanicilar: kullanicilarResult
      });
    }

    return subelerWithKullanicilar;
  }

  async getSube(id: number): Promise<SubeWithKullanicilar | undefined> {
    const [sube] = await db.select().from(subeler).where(eq(subeler.id, id));
    if (!sube) return undefined;

    const kullanicilarResult = await db
      .select({
        kullaniciId: kullaniciSubeRolleri.kullaniciId,
        kullaniciAdi: kullanicilar.adi,
        kullaniciSoyadi: kullanicilar.soyadi,
        rol: kullaniciSubeRolleri.rol
      })
      .from(kullaniciSubeRolleri)
      .innerJoin(kullanicilar, eq(kullaniciSubeRolleri.kullaniciId, kullanicilar.id))
      .where(and(
        eq(kullaniciSubeRolleri.subeId, id),
        isNull(kullanicilar.globalRol),
      ));

    return {
      ...sube,
      kullanicilar: kullanicilarResult
    };
  }

  // Varsayılan kampanyaları oluşturan yardımcı fonksiyon
  private async createDefaultKampanyalar(subeId: number): Promise<Kampanya[]> {
    try {
      // Varsayılan kampanya şablonları
      const defaultKampanyalar: Partial<InsertKampanya>[] = [
        {
          kampanyaAdi: "1+1 KAMPANYASI",
          egitimTipi: "Genel İngilizce",
          kurSayisi: 2,
          toplamDersSaati: 480,
          listeFiyati: 14000,
          nakitFiyati: 12000,
          indirimOrani: 14.29,
          faizOrani: 2.5,
          kitapFiyati: 1000,
          kitapSetSayisi: 2,
          maxKrediKartiTaksit: 10,
          maxSenetTaksit: 12,
          hediyeler: [
            { isim: "Konuşma Kulübü", fiyat: 0 }, 
            { isim: "Çevrimiçi Kaynak Erişimi", fiyat: 0 }
          ],
          subeId: subeId
        },
        {
          kampanyaAdi: "2+1 KAMPANYASI",
          egitimTipi: "Genel İngilizce",
          kurSayisi: 3,
          toplamDersSaati: 720,
          listeFiyati: 21000,
          nakitFiyati: 18000,
          indirimOrani: 14.29,
          faizOrani: 2.5,
          kitapFiyati: 1500,
          kitapSetSayisi: 3,
          maxKrediKartiTaksit: 10,
          maxSenetTaksit: 12,
          hediyeler: [
            { isim: "Konuşma Kulübü", fiyat: 0 },
            { isim: "Çevrimiçi Kaynak Erişimi", fiyat: 0 },
            { isim: "Yurtdışı Eğitim Danışmanlığı", fiyat: 0 }
          ],
          subeId: subeId
        },
        {
          kampanyaAdi: "3+1 KAMPANYASI",
          egitimTipi: "Genel İngilizce",
          kurSayisi: 4,
          toplamDersSaati: 960,
          listeFiyati: 28000,
          nakitFiyati: 24000,
          indirimOrani: 14.29,
          faizOrani: 2.5,
          kitapFiyati: 2000,
          kitapSetSayisi: 4,
          maxKrediKartiTaksit: 10,
          maxSenetTaksit: 12,
          hediyeler: [
            { isim: "Konuşma Kulübü", fiyat: 0 },
            { isim: "Çevrimiçi Kaynak Erişimi", fiyat: 0 },
            { isim: "Yurtdışı Eğitim Danışmanlığı", fiyat: 0 },
            { isim: "Sınav Hazırlık Seti", fiyat: 0 }
          ],
          subeId: subeId
        },
        {
          kampanyaAdi: "1 KUR",
          egitimTipi: "Genel İngilizce",
          kurSayisi: 1,
          toplamDersSaati: 240,
          listeFiyati: 7000,
          nakitFiyati: 6000,
          indirimOrani: 14.29,
          faizOrani: 2.5,
          kitapFiyati: 500,
          kitapSetSayisi: 1,
          maxKrediKartiTaksit: 8,
          maxSenetTaksit: 10,
          hediyeler: [
            { isim: "Çevrimiçi Kaynak Erişimi", fiyat: 0 }
          ],
          subeId: subeId
        },
        {
          kampanyaAdi: "2+2 KUR +MESLEKİ EĞİTİM",
          egitimTipi: "Mesleki İngilizce",
          kurSayisi: 4,
          toplamDersSaati: 960,
          listeFiyati: 28000,
          nakitFiyati: 24000,
          indirimOrani: 14.29,
          faizOrani: 2.5,
          kitapFiyati: 2000,
          kitapSetSayisi: 4,
          maxKrediKartiTaksit: 10,
          maxSenetTaksit: 12,
          hediyeler: [
            { isim: "Konuşma Kulübü", fiyat: 0 },
            { isim: "Çevrimiçi Kaynak Erişimi", fiyat: 0 },
            { isim: "Kariyer Danışmanlığı", fiyat: 0 },
            { isim: "Sektörel Eğitim Seti", fiyat: 0 }
          ],
          subeId: subeId
        },
        {
          kampanyaAdi: "3+2 KUR +MESLEKİ EĞİTİM",
          egitimTipi: "Mesleki İngilizce",
          kurSayisi: 5,
          toplamDersSaati: 1200,
          listeFiyati: 35000,
          nakitFiyati: 30000,
          indirimOrani: 14.29,
          faizOrani: 2.5,
          kitapFiyati: 2500,
          kitapSetSayisi: 5,
          maxKrediKartiTaksit: 10,
          maxSenetTaksit: 12,
          hediyeler: [
            { isim: "Konuşma Kulübü", fiyat: 0 },
            { isim: "Çevrimiçi Kaynak Erişimi", fiyat: 0 },
            { isim: "Kariyer Danışmanlığı", fiyat: 0 },
            { isim: "Sektörel Eğitim Seti", fiyat: 0 },
            { isim: "Yurtdışı Staj İmkanı", fiyat: 0 }
          ],
          subeId: subeId
        }
      ];
      
      const createdKampanyalar: Kampanya[] = [];
      
      // Her bir varsayılan kampanyayı veritabanına ekle
      for (const kampanya of defaultKampanyalar) {
        const result = await db.insert(kampanyalar).values(kampanya as InsertKampanya).returning();
        if (result.length > 0) {
          createdKampanyalar.push(result[0] as Kampanya);
        }
      }
      
      console.log(`Şube ${subeId} için ${createdKampanyalar.length} varsayılan kampanya oluşturuldu`);
      return createdKampanyalar;
    } catch (error) {
      console.error(`Şube ${subeId} için varsayılan kampanyalar oluşturulurken hata:`, error);
      return [];
    }
  }

  async createSube(sube: InsertSube): Promise<Sube> {
    try {
      // Şubeyi oluştur
      const result = await db.insert(subeler).values(sube).returning();
      const newSube = result[0];
      
      if (newSube) {
        // Yeni şube için varsayılan kampanyaları oluştur
        await this.createDefaultKampanyalar(newSube.id);
      }
      
      return newSube;
    } catch (error) {
      console.error("Şube oluşturma hatası:", error);
      throw error;
    }
  }

  async updateSube(id: number, updateData: InsertSube): Promise<Sube | undefined> {
    const result = await db
      .update(subeler)
      .set(updateData)
      .where(eq(subeler.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteSube(id: number): Promise<boolean> {
    const result = await db
      .delete(subeler)
      .where(eq(subeler.id, id))
      .returning();
    
    return result.length > 0;
  }

  async getAllSubeIds(): Promise<number[]> {
    const result = await db.select({ id: subeler.id }).from(subeler);
    return result.map((sube) => sube.id);
  }

  async createWhatsappGonderim(
    data: InsertWhatsappGonderim,
    yetkiliSubeIds: readonly number[],
  ): Promise<WhatsappGonderim> {
    if (yetkiliSubeIds.length === 0 || !yetkiliSubeIds.includes(data.subeId)) {
      throw new Error("WhatsApp kaydı için yetkili şube bulunamadı.");
    }

    // INSERT öncesi şube kaydını SQL seviyesinde yetkili kapsamla doğrula.
    const [yetkiliSube] = await db
      .select({ id: subeler.id })
      .from(subeler)
      .where(and(eq(subeler.id, data.subeId), inArray(subeler.id, [...yetkiliSubeIds])))
      .limit(1);
    if (!yetkiliSube) {
      throw new Error("WhatsApp kaydı için şube yetkisi doğrulanamadı.");
    }

    const [result] = await db
      .insert(whatsappGonderimleri)
      .values(data)
      .returning();
    return result;
  }

  async deleteWhatsappGonderim(id: number, yetkiliSubeIds: readonly number[]): Promise<boolean> {
    if (yetkiliSubeIds.length === 0) return false;
    const result = await db
      .delete(whatsappGonderimleri)
      .where(and(
        eq(whatsappGonderimleri.id, id),
        inArray(whatsappGonderimleri.subeId, [...yetkiliSubeIds]),
      ))
      .returning();
    return result.length > 0;
  }

  async getAllWhatsappGonderimleri(
    filters: WhatsappGonderimFilters | undefined,
    yetkiliSubeIds: readonly number[],
  ): Promise<WhatsappGonderim[]> {
    if (yetkiliSubeIds.length === 0) return [];
    const conditions = [inArray(whatsappGonderimleri.subeId, [...yetkiliSubeIds])];
    if (filters?.subeId) conditions.push(eq(whatsappGonderimleri.subeId, filters.subeId));
    if (filters?.danismanId) conditions.push(eq(whatsappGonderimleri.danismanId, filters.danismanId));
    if (filters?.baslangicTarihi) {
      const utcTimestamp = filters.baslangicTarihi.toISOString().replace(/Z$/, "");
      conditions.push(sql`${whatsappGonderimleri.gonderilenAt} >= ${utcTimestamp}::timestamp`);
    }
    if (filters?.bitisTarihiExclusive) {
      const utcTimestamp = filters.bitisTarihiExclusive.toISOString().replace(/Z$/, "");
      conditions.push(sql`${whatsappGonderimleri.gonderilenAt} < ${utcTimestamp}::timestamp`);
    }

    const query = db.select().from(whatsappGonderimleri).orderBy(desc(whatsappGonderimleri.gonderilenAt));
    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    return query;
  }
}

// Veritabanı Depolama kullanalım
export const storage = new DatabaseStorage();