import { 
  kampanyalar, 
  kullanicilar,
  subeler,
  kullaniciSubeRolleri,
  type Kampanya, 
  type InsertKampanya,
  type Kullanici,
  type InsertKullanici,
  type Sube,
  type InsertSube,
  type KullaniciSubeRol,
  type InsertKullaniciSubeRol,
  type KullaniciWithRollerVeSubeler,
  type SubeWithKullanicilar
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // Kampanya operations
  getAllKampanyalar(): Promise<Kampanya[]>;
  getKampanyasBySubeId(subeId: number): Promise<Kampanya[]>;
  getKampanya(id: number): Promise<Kampanya | undefined>;
  createKampanya(kampanya: InsertKampanya): Promise<Kampanya>;
  updateKampanya(id: number, kampanya: InsertKampanya): Promise<Kampanya | undefined>;
  deleteKampanya(id: number): Promise<boolean>;
  copyKampanyaToSube(kampanyaId: number, subeId: number): Promise<Kampanya | undefined>;
  
  // Kullanıcı operations
  getAllKullanicilar(): Promise<KullaniciWithRollerVeSubeler[]>;
  getKullanici(id: number): Promise<KullaniciWithRollerVeSubeler | undefined>;
  getKullaniciByTelefon(telefon: string): Promise<Kullanici | undefined>;
  getKullaniciRoller(kullaniciId: number): Promise<Array<{subeId: number; subeAdi: string; rol: string}>>;
  createKullanici(kullanici: InsertKullanici): Promise<Kullanici>;
  updateKullanici(id: number, kullanici: InsertKullanici): Promise<Kullanici | undefined>;
  updateKullaniciPassword(id: number, hashedPassword: string): Promise<boolean>;
  deleteKullanici(id: number): Promise<boolean>;
  addKullaniciToSube(kullaniciId: number, subeId: number, rol: string): Promise<KullaniciSubeRol>;
  removeKullaniciFromSube(kullaniciId: number, subeId: number): Promise<boolean>;
  
  // Şube operations
  getAllSubeler(): Promise<SubeWithKullanicilar[]>;
  getSube(id: number): Promise<SubeWithKullanicilar | undefined>;
  createSube(sube: InsertSube): Promise<Sube>;
  updateSube(id: number, sube: InsertSube): Promise<Sube | undefined>;
  deleteSube(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Kampanya operations
  async getAllKampanyalar(): Promise<Kampanya[]> {
    try {
      // Doğrudan SQL sorgusu kullanarak branch_id ve created_at'ı atlayalım
      const result = await db.execute<Kampanya>(
        `SELECT 
          id, 
          kampanya_adi as "kampanyaAdi", 
          egitim_tipi as "egitimTipi",
          kur_sayisi as "kurSayisi",
          toplam_ders_saati as "toplamDersSaati",
          liste_fiyati as "listeFiyati",
          nakit_fiyati as "nakitFiyati",
          indirim_orani as "indirimOrani",
          faiz_orani as "faizOrani",
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
      return [];
    }
  }
  
  async getKampanyasBySubeId(subeId: number): Promise<Kampanya[]> {
    try {
      const result = await db.execute<Kampanya>(
        `SELECT 
          id, 
          kampanya_adi as "kampanyaAdi", 
          egitim_tipi as "egitimTipi",
          kur_sayisi as "kurSayisi",
          toplam_ders_saati as "toplamDersSaati",
          liste_fiyati as "listeFiyati",
          nakit_fiyati as "nakitFiyati",
          indirim_orani as "indirimOrani",
          faiz_orani as "faizOrani",
          kitap_fiyati as "kitapFiyati",
          kitap_set_sayisi as "kitapSetSayisi",
          max_kredi_karti_taksit as "maxKrediKartiTaksit",
          max_senet_taksit as "maxSenetTaksit",
          hediyeler,
          sube_id as "subeId"
        FROM kampanyalar
        WHERE sube_id = $1`,
        [subeId]
      );
      return result.rows;
    } catch (error) {
      console.error(`Şube ${subeId} için kampanyaları getirme hatası:`, error);
      return [];
    }
  }

  async getKampanya(id: number): Promise<Kampanya | undefined> {
    try {
      const result = await db.execute<Kampanya>(
        `SELECT 
          id, 
          kampanya_adi as "kampanyaAdi", 
          egitim_tipi as "egitimTipi",
          kur_sayisi as "kurSayisi",
          toplam_ders_saati as "toplamDersSaati",
          liste_fiyati as "listeFiyati",
          nakit_fiyati as "nakitFiyati",
          indirim_orani as "indirimOrani",
          faiz_orani as "faizOrani",
          kitap_fiyati as "kitapFiyati",
          kitap_set_sayisi as "kitapSetSayisi",
          max_kredi_karti_taksit as "maxKrediKartiTaksit",
          max_senet_taksit as "maxSenetTaksit",
          hediyeler
        FROM kampanyalar
        WHERE id = $1`,
        [id]
      );
      
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error("Kampanya getirme hatası:", error);
      return undefined;
    }
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

  // Kullanıcı operations
  async getAllKullanicilar(): Promise<KullaniciWithRollerVeSubeler[]> {
    try {
      const kullanicilarResult = await db.select().from(kullanicilar);
      
      const kullanicilarWithRoller: KullaniciWithRollerVeSubeler[] = [];
      
      for (const kullanici of kullanicilarResult) {
        // Drizzle ORM ile ilişkili verileri çekme
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
    } catch (error) {
      console.error("Kullanıcıları getirme hatası:", error);
      return [];
    }
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

  async updateKullanici(id: number, updateData: InsertKullanici): Promise<Kullanici | undefined> {
    const result = await db
      .update(kullanicilar)
      .set(updateData)
      .where(eq(kullanicilar.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  async deleteKullanici(id: number): Promise<boolean> {
    const result = await db
      .delete(kullanicilar)
      .where(eq(kullanicilar.id, id))
      .returning();
    
    return result.length > 0;
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
  
  async updateKullaniciPassword(id: number, hashedPassword: string): Promise<boolean> {
    try {
      const result = await db
        .update(kullanicilar)
        .set({ sifre: hashedPassword })
        .where(eq(kullanicilar.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Kullanıcı şifre güncelleme hatası:", error);
      return false;
    }
  }

  async addKullaniciToSube(kullaniciId: number, subeId: number, rol: string): Promise<KullaniciSubeRol> {
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
    try {
      const subelerResult = await db.select().from(subeler);
      
      const subelerWithKullanicilar: SubeWithKullanicilar[] = [];
      
      for (const sube of subelerResult) {
        // Drizzle ORM kullanarak daha güvenli sorgu
        const kullanicilarResult = await db
          .select({
            kullaniciId: kullaniciSubeRolleri.kullaniciId,
            kullaniciAdi: kullanicilar.adi,
            kullaniciSoyadi: kullanicilar.soyadi,
            rol: kullaniciSubeRolleri.rol
          })
          .from(kullaniciSubeRolleri)
          .innerJoin(kullanicilar, eq(kullaniciSubeRolleri.kullaniciId, kullanicilar.id))
          .where(eq(kullaniciSubeRolleri.subeId, sube.id));
        
        subelerWithKullanicilar.push({
          ...sube,
          kullanicilar: kullanicilarResult
        });
      }
      
      return subelerWithKullanicilar;
    } catch (error) {
      console.error("Şubeleri getirme hatası:", error);
      return [];
    }
  }

  async getSube(id: number): Promise<SubeWithKullanicilar | undefined> {
    try {
      const [sube] = await db.select().from(subeler).where(eq(subeler.id, id));
      
      if (!sube) return undefined;
      
      // Drizzle ORM kullanarak daha güvenli sorgu
      const kullanicilarResult = await db
        .select({
          kullaniciId: kullaniciSubeRolleri.kullaniciId,
          kullaniciAdi: kullanicilar.adi,
          kullaniciSoyadi: kullanicilar.soyadi,
          rol: kullaniciSubeRolleri.rol
        })
        .from(kullaniciSubeRolleri)
        .innerJoin(kullanicilar, eq(kullaniciSubeRolleri.kullaniciId, kullanicilar.id))
        .where(eq(kullaniciSubeRolleri.subeId, id));
      
      return {
        ...sube,
        kullanicilar: kullanicilarResult
      };
    } catch (error) {
      console.error("Şube getirme hatası:", error);
      return undefined;
    }
  }

  async createSube(sube: InsertSube): Promise<Sube> {
    const result = await db.insert(subeler).values(sube).returning();
    return result[0];
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
}

// Veritabanı Depolama kullanalım
export const storage = new DatabaseStorage();