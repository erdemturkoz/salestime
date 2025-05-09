import { 
  kampanyalar, 
  type Kampanya, 
  type InsertKampanya,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Kampanya operations
  getAllKampanyalar(): Promise<Kampanya[]>;
  getKampanya(id: number): Promise<Kampanya | undefined>;
  createKampanya(kampanya: InsertKampanya): Promise<Kampanya>;
  updateKampanya(id: number, kampanya: InsertKampanya): Promise<Kampanya | undefined>;
  deleteKampanya(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Kampanya operations
  async getAllKampanyalar(): Promise<Kampanya[]> {
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
        hediyeler
      FROM kampanyalar`
    );

    return result.rows;
  }

  async getKampanya(id: number): Promise<Kampanya | undefined> {
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
}

// Veritabanı Depolama kullanalım
export const storage = new DatabaseStorage();