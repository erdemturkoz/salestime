/**
 * Toplu teklif WhatsApp mesaj şablonu yardımcıları.
 * Ayrı modüle taşındı; böylece routes.ts dışından test edilebilir.
 */

export function topluPara(tutar: number): string {
  return `${Math.round(tutar).toLocaleString("tr-TR")} TL`;
}

export function topluOdemeDetayi(teklif: any): string {
  if (teklif.form.odemeTipi === "nakit") return `${teklif.odemeTipiText} · ${topluPara(teklif.ozelFiyat)}`;
  const pesinat = teklif.pesinat > 0 ? `${topluPara(teklif.pesinat)} peşinat + ` : "";
  return `${teklif.odemeTipiText} · ${pesinat}${teklif.form.taksitSayisi} × ${topluPara(teklif.aylikOdeme)}`;
}

export function topluMesajOlustur(
  satir: { ogrenciAdi: string; sonKur?: string | null },
  teklif1: any,
  teklif2: any,
  subeAdi: string,
  user: { adi?: string; soyadi?: string; telefon?: string } | null,
): string {
  const bitis = new Date();
  bitis.setDate(bitis.getDate() + teklif1.form.gecerlilikGunu);
  const tarih = bitis.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const hitap = satir.sonKur
    ? `Son aldığınız ${satir.sonKur} seviyesinin ardından size özel hazırladığımız teklif seçenekleri:`
    : `Mevcut eğitim durumunuza göre size özel hazırladığımız teklif seçenekleri:`;

  const teklifBlok = (baslik: string, teklif: any) => {
    const blokSatirlari: string[] = [
      `*${baslik}*`,
      `Eğitim: ${teklif.egitimTipi} | ${teklif.kurSayisi} Kur · ${teklif.dersSaati} Ders Saati`,
      `Liste Fiyatı: ${topluPara(teklif.listeFiyati)}`,
      `Kampanya İndirimi: -${topluPara(teklif.indirimTutari)} (%${teklif.indirimYuzdesi})`,
    ];
    (teklif.hediyeler || []).forEach((h: any) => {
      if (teklif.hediyeEdildi?.[h.isim] && h.fiyat > 0) {
        blokSatirlari.push(`🎁 ${h.isim} (${topluPara(h.fiyat)}) — HEDİYE`);
      }
    });
    if ((teklif.hediyeIndirimi || 0) > 0) {
      blokSatirlari.push(`Hediye İndirimi: -${topluPara(teklif.hediyeIndirimi)}`);
    }
    blokSatirlari.push(`Ödenecek: ${topluPara(teklif.ozelFiyat)}`);
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
