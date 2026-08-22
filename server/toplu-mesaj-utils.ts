/**
 * Toplu teklif WhatsApp mesaj şablonu yardımcıları.
 * Ayrı modüle taşındı; böylece routes.ts dışından test edilebilir.
 */

export function topluPara(tutar: number): string {
  return `${Math.round(tutar).toLocaleString("tr-TR")} TL`;
}

export function topluOdemeDetayi(teklif: any): string {
  if (teklif.form.odemeTipi === "nakit")
    return `${teklif.odemeTipiText} · ${topluPara(teklif.toplamOdeme)}`;
  const pesinat = teklif.pesinat > 0 ? `${topluPara(teklif.pesinat)} peşinat + ` : "";
  return `${teklif.odemeTipiText} · ${pesinat}${teklif.form.taksitSayisi} × ${topluPara(teklif.aylikOdeme)} = ${topluPara(teklif.toplamOdeme)}`;
}

export function topluMesajOlustur(
  satir: { ogrenciAdi: string; sonEgitim?: string | null; sonKur?: string | null },
  teklif1: any,
  teklif2: any,
  subeAdi: string,
  user: { adi?: string; soyadi?: string; telefon?: string } | null,
): string {
  const bitis = new Date();
  bitis.setDate(bitis.getDate() + teklif1.form.gecerlilikGunu);
  const tarih = bitis.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const gecmisEgitim = satir.sonEgitim ? `Geçmiş eğitiminiz: ${satir.sonEgitim}. ` : "";
  const hitap = satir.sonKur
    ? `${gecmisEgitim}Son aldığınız ${satir.sonKur} seviyesinin ardından size özel hazırladığımız teklif seçenekleri:`
    : `${gecmisEgitim}Mevcut eğitim durumunuza göre size özel hazırladığımız teklif seçenekleri:`;

  const teklifBlok = (baslik: string, teklif: any) => {
    const blokSatirlari: string[] = [
      `*${baslik}*`,
      `Teklif Eğitimi: ${teklif.egitimTipi} | ${teklif.kurSayisi} Kur · ${teklif.dersSaati} Ders Saati`,
      `Liste Fiyatı: ${topluPara(teklif.listeFiyati)}`,
    ];
    if ((teklif.toplamHediyeIndirimi || 0) > 0) {
      blokSatirlari.push(`Hediyesiz Son Fiyat: ${topluPara(teklif.hediyesizFiyat)}`);
      (teklif.hediyeler || []).forEach((h: any) => {
        if (teklif.hediyeEdildi?.[h.isim] && h.fiyat > 0) {
          blokSatirlari.push(`🎁 ${h.isim} (${topluPara(h.fiyat)}) — HEDİYE`);
        }
      });
      if (teklif.kitapHediyeEdildi && (teklif.kitapUcreti || 0) > 0) {
        blokSatirlari.push(`🎁 Kitap Seti (${topluPara(teklif.kitapUcreti)}) — HEDİYE`);
      }
      blokSatirlari.push(`Toplam Hediye İndirimi: -${topluPara(teklif.toplamHediyeIndirimi)}`);
    }
    blokSatirlari.push(`Satış Fiyatı: ${topluPara(teklif.ozelFiyat)}`);
    blokSatirlari.push(`Ödeme: ${topluOdemeDetayi(teklif)}`);
    return blokSatirlari.join("\n");
  };

  const mesajSatirlari: string[] = [
    `Merhaba ${satir.ogrenciAdi},`,
    "",
    `English Time ${subeAdi} — ${hitap}`,
    "",
    teklifBlok("1. TEKLİF", teklif1),
    "",
    teklifBlok("2. TEKLİF", teklif2),
    "",
    `⏳ Teklif geçerlilik süresi: ${tarih}`,
    "",
    `${user?.adi || ""} ${user?.soyadi || ""}`.trim(),
    "Eğitim Danışmanı",
    `English Time ${subeAdi}`,
  ];
  if (user?.telefon) mesajSatirlari.push(user.telefon);
  return mesajSatirlari.join("\n");
}
