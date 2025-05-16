import { 
  kampanyalar, 
  kullanicilar,
  subeler,
  kullaniciSubeRolleri,
  egitimTipleri,
  type Kampanya, 
  type InsertKampanya,
  type Kullanici,
  type InsertKullanici,
  type Sube,
  type InsertSube,
  type KullaniciSubeRol,
  type InsertKullaniciSubeRol,
  type KullaniciWithRollerVeSubeler,
  type SubeWithKullanicilar,
  type EgitimTipi,
  type InsertEgitimTipi
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // Eğitim Tipleri operations
  getAllEgitimTipleri(): Promise<EgitimTipi[]>;
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
  // Eğitim Tipleri operations
  async getAllEgitimTipleri(): Promise<EgitimTipi[]> {
    try {
      const result = await db.select().from(egitimTipleri);
      return result;
    } catch (error) {
      console.error("Eğitim tiplerini getirme hatası:", error);
      return [];
    }
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
      return undefined;
    }
  }

  async deleteEgitimTipi(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(egitimTipleri)
        .where(eq(egitimTipleri.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error(`Eğitim tipi ID ${id} silinirken hata:`, error);
      return false;
    }
  }
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
      console.error(`Şube ${subeId} için kampanyalar getirilirken hata:`, error);
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
          hediyeler,
          sube_id as "subeId"
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
        `INSERT INTO kampanyalar (
          kampanya_adi,
          egitim_tipi,
          kur_sayisi,
          toplam_ders_saati,
          liste_fiyati,
          nakit_fiyati,
          indirim_orani,
          faiz_orani,
          kitap_fiyati,
          kitap_set_sayisi,
          max_kredi_karti_taksit,
          max_senet_taksit,
          hediyeler,
          sube_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
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
          kitap_fiyati as "kitapFiyati",
          kitap_set_sayisi as "kitapSetSayisi",
          max_kredi_karti_taksit as "maxKrediKartiTaksit",
          max_senet_taksit as "maxSenetTaksit",
          hediyeler,
          sube_id as "subeId"`,
        [
          kampanya.kampanyaAdi,
          kampanya.egitimTipi,
          kampanya.kurSayisi,
          kampanya.toplamDersSaati,
          kampanya.listeFiyati,
          kampanya.nakitFiyati,
          kampanya.indirimOrani,
          kampanya.faizOrani,
          kampanya.kitapFiyati,
          kampanya.kitapSetSayisi,
          kampanya.maxKrediKartiTaksit,
          kampanya.maxSenetTaksit,
          kampanya.hediyeler,
          subeId
        ]
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
          hediyeler: ["Konuşma Kulübü", "Çevrimiçi Kaynak Erişimi", "Yurtdışı Eğitim Danışmanlığı", "Sınav Hazırlık Seti"],
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
          hediyeler: ["Çevrimiçi Kaynak Erişimi"],
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
          hediyeler: ["Konuşma Kulübü", "Çevrimiçi Kaynak Erişimi", "Kariyer Danışmanlığı", "Sektörel Eğitim Seti"],
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
          hediyeler: ["Konuşma Kulübü", "Çevrimiçi Kaynak Erişimi", "Kariyer Danışmanlığı", "Sektörel Eğitim Seti", "Yurtdışı Staj İmkanı"],
          subeId: subeId
        }
      ];
      
      const createdKampanyalar: Kampanya[] = [];
      
      // Her bir varsayılan kampanyayı veritabanına ekle
      for (const kampanya of defaultKampanyalar) {
        const result = await db.insert(kampanyalar).values(kampanya as InsertKampanya).returning();
        if (result.length > 0) {
          createdKampanyalar.push(result[0]);
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
}

// Veritabanı Depolama kullanalım
export const storage = new DatabaseStorage();