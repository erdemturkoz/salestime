import { db } from "../db";
import { egitimTipleri, subeler } from "@shared/schema";

const defaultEgitimTipleri = [
  "Genel İngilizce",
  "Genel Almanca",
  "Junior İngilizce",
  "Teenage İngilizce",
  "Yds Hazırlık",
  "Toefl Hazırlık",
  "İspanyolca",
  "Fransızca",
  "İtalyanca",
  "Rusça",
];

export async function createDefaultEgitimTipleri() {
  console.log("Varsayılan eğitim tipleri oluşturuluyor...");
  
  // Eğitim tipleri tablosundaki veriyi kontrol et
  const existingEgitimTipleri = await db.select().from(egitimTipleri);
  
  if (existingEgitimTipleri.length === 0) {
    // Varsayılan eğitim tiplerini ekle
    const branches = await db.select({ id: subeler.id }).from(subeler);
    for (const branch of branches) {
      await db.insert(egitimTipleri).values(defaultEgitimTipleri.map((tip) => ({
        egitimTipi: tip,
        subeId: branch.id,
      }))).onConflictDoNothing();
    }
    console.log(`${defaultEgitimTipleri.length} varsayılan eğitim tipi eklendi.`);
  } else {
    console.log(`Zaten ${existingEgitimTipleri.length} eğitim tipi mevcut. Varsayılan eğitim tipleri eklenmedi.`);
  }
}