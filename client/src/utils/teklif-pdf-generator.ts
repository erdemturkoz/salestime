// Kişiye Özel Eğitim Teklifi - HTML/CSS tabanlı profesyonel PDF üretici

export interface TeklifData {
  kampanyaAdi: string;
  egitimTipi: string;
  kurSayisi: number;
  dersSaati: number;

  listeFiyati: number;
  indirimTutari: number;
  indirimYuzdesi: number;
  kampanyaliFiyat: number;
  genelToplam: number;
  ozelFiyat: number;
  nakitFiyati: number;

  odemeTipi: string;
  odemeTipiText: string;
  taksitSayisi: number;
  aylikOdeme: number;

  kitapUcreti: number;
  kitapDahil: boolean;
  kitapHediyeEdildi: boolean;
  hediyeler: Array<{ isim: string; fiyat: number }>;
  hediyeEdildi: Record<string, boolean>;

  mudurIndirimTutari: number;
  mudurIndirimTipi: string;
  mudurIndirimDegeri: number;

  ogrenciAdi: string;
  gecerlilikGunu: number;

  danismanAdi: string;
  danismanSoyadi: string;
  danismanTelefon: string;
  subeAdi: string;
  subeAdresi: string;
  subeTelefon: string;
}

// Türk para formatı: 103.250,33 TL
function formatTL(amount: number): string {
  if (!amount || amount === 0) return "0 TL";
  return (
    amount.toLocaleString("tr-TR", {
      minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    }) + " TL"
  );
}

// Türk yüzde formatı: %28,5 veya %50
function formatYuzde(val: number): string {
  const rounded = parseFloat(val.toFixed(1));
  const str = rounded.toString().replace(".", ",");
  return `%${str}`;
}

// Tarih formatı: 14 Temmuz 2026
function formatTarih(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Teklif numarası üretici: ET-IZMIT-1001
function teklifNumarasiUret(subeAdi: string): string {
  const subeKod = subeAdi
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 10);

  const key = `teklif_counter_${subeKod}`;
  const current = parseInt(localStorage.getItem(key) || "1000", 10);
  const next = current + 1;
  localStorage.setItem(key, next.toString());

  return `ET-${subeKod}-${next}`;
}

// Veri doğrulama
function dogrulamaKontrol(data: TeklifData): string[] {
  const hatalar: string[] = [];

  const aktifFiyat =
    data.mudurIndirimTutari > 0 ? data.ozelFiyat : data.genelToplam;

  if (data.taksitSayisi > 1 && data.aylikOdeme > 0) {
    const taksitToplam = data.aylikOdeme * data.taksitSayisi;
    const fark = Math.abs(taksitToplam - aktifFiyat);
    if (fark > data.taksitSayisi) {
      console.warn(
        `Taksit toplam farkı: ${fark} TL (${taksitToplam} vs ${aktifFiyat})`
      );
    }
  }

  return hatalar;
}

// Hediye toplamı hesapla (değeri olan hediyeler)
function hediyeToplami(data: TeklifData): number {
  let toplam = 0;
  if (data.kitapDahil && data.kitapHediyeEdildi && data.kitapUcreti > 0) {
    toplam += data.kitapUcreti;
  }
  data.hediyeler.forEach((h) => {
    if (data.hediyeEdildi[h.isim] && h.fiyat > 0) {
      toplam += h.fiyat;
    }
  });
  return toplam;
}

// Ana PDF üretici — yeni pencerede HTML açar ve yazdırma tetikler
export function generateTeklifPDF(data: TeklifData): void {
  const hatalar = dogrulamaKontrol(data);
  if (hatalar.length > 0) {
    console.error("Teklif veri doğrulama hataları:", hatalar);
  }

  const bugun = new Date();
  const gecerlilikTarihi = new Date(bugun);
  gecerlilikTarihi.setDate(gecerlilikTarihi.getDate() + data.gecerlilikGunu);

  const teklifNo = teklifNumarasiUret(data.subeAdi || "ENGLISHTIME");
  const teklifTarihi = formatTarih(bugun);
  const sonGecerlilikTarihi = formatTarih(gecerlilikTarihi);

  const aktifFiyat =
    data.mudurIndirimTutari > 0 ? data.ozelFiyat : data.genelToplam;
  const toplamHediye = hediyeToplami(data);

  const ogrenciHitap = data.ogrenciAdi
    ? `Sayın ${data.ogrenciAdi},`
    : "Sayın Öğrencimiz,";

  const danismanTamAdi = `${data.danismanAdi} ${data.danismanSoyadi}`.trim();

  // Ödeme planı satırları
  let odemeDetayHTML = "";
  if (data.taksitSayisi <= 1) {
    odemeDetayHTML = `
      <div class="payment-row">
        <span class="payment-label">Ödeme Şekli</span>
        <span class="payment-value">${data.odemeTipiText} – Tek Ödeme</span>
      </div>
      <div class="payment-row highlight-row">
        <span class="payment-label">Ödenecek Tutar</span>
        <span class="payment-value big">${formatTL(aktifFiyat)}</span>
      </div>
    `;
  } else {
    const taksitTutari = data.aylikOdeme;
    odemeDetayHTML = `
      <div class="payment-row">
        <span class="payment-label">Ödeme Şekli</span>
        <span class="payment-value">${data.odemeTipiText}</span>
      </div>
      <div class="payment-row">
        <span class="payment-label">Taksit Sayısı</span>
        <span class="payment-value">${data.taksitSayisi} Taksit</span>
      </div>
      <div class="payment-row highlight-row">
        <span class="payment-label">Aylık Taksit</span>
        <span class="payment-value big">${formatTL(taksitTutari)} × ${data.taksitSayisi}</span>
      </div>
      <div class="payment-row">
        <span class="payment-label">Toplam Ödenecek</span>
        <span class="payment-value">${formatTL(aktifFiyat)}</span>
      </div>
    `;
  }

  // Nakit avantajı — taksitli ödeme seçildiyse göster
  let nakitAvantajHTML = "";
  if (data.odemeTipi !== "nakit" && data.nakitFiyati > 0) {
    const nakitFark = aktifFiyat - data.nakitFiyati;
    if (nakitFark > 0) {
      nakitAvantajHTML = `
        <div class="cash-advantage">
          <div class="cash-advantage-title">💡 NAKİT ÖDEME TAVSİYE EDİLİR</div>
          <div class="cash-advantage-body">
            Nakit ödemede yalnızca <strong>${formatTL(data.nakitFiyati)}</strong> ödersiniz — 
            <strong>${formatTL(nakitFark)}</strong> tasarruf edersiniz.
          </div>
        </div>
      `;
    }
  }

  // Hediyeler bölümü
  const hediyelerListesi: string[] = [];
  if (data.kitapDahil && data.kitapUcreti > 0) {
    const fiyatStr =
      data.kitapHediyeEdildi && data.kitapUcreti > 0
        ? `${formatTL(data.kitapUcreti)} değerinde — Hediye`
        : formatTL(data.kitapUcreti);
    const badge = data.kitapHediyeEdildi
      ? `<span class="gift-badge">HEDİYE</span>`
      : "";
    hediyelerListesi.push(`
      <div class="gift-card">
        <div class="gift-icon">🎁</div>
        <div class="gift-info">
          <div class="gift-name">Kitap Seti ${badge}</div>
          <div class="gift-value">${fiyatStr}</div>
        </div>
      </div>
    `);
  }
  data.hediyeler.forEach((h) => {
    const verildi = data.hediyeEdildi[h.isim];
    const badge = verildi ? `<span class="gift-badge">HEDİYE</span>` : "";
    const fiyatStr =
      h.fiyat > 0
        ? verildi
          ? `${formatTL(h.fiyat)} değerinde — Hediye`
          : formatTL(h.fiyat)
        : "Ücretsiz";
    hediyelerListesi.push(`
      <div class="gift-card">
        <div class="gift-icon">🎁</div>
        <div class="gift-info">
          <div class="gift-name">${h.isim} ${badge}</div>
          <div class="gift-value">${fiyatStr}</div>
        </div>
      </div>
    `);
  });

  const hediyelerHTML =
    hediyelerListesi.length > 0
      ? `
    <div class="section">
      <div class="section-title">Hediyeler &amp; Avantajlar</div>
      <div class="gifts-grid">
        ${hediyelerListesi.join("")}
      </div>
      ${
        toplamHediye > 0
          ? `<div class="gifts-total">Toplam hediye ve avantaj değeri: <strong>${formatTL(toplamHediye)}</strong></div>`
          : ""
      }
    </div>
  `
      : "";

  // Müdür indirimi bölümü
  const mudurIndirimHTML =
    data.mudurIndirimTutari > 0
      ? `
    <div class="manager-discount">
      <div class="manager-discount-label">Müdür İnisiyatifi İndirimi</div>
      <div class="manager-discount-value">−${formatTL(data.mudurIndirimTutari)}</div>
    </div>
  `
      : "";

  // Özel fiyat kartı
  const ozelFiyatHTML =
    data.mudurIndirimTutari > 0
      ? `
    <div class="special-price-card">
      <div class="special-price-label">KİŞİYE ÖZEL FİYAT</div>
      <div class="special-price-value">${formatTL(data.ozelFiyat)}</div>
      <div class="special-price-note">Genel toplam ${formatTL(data.genelToplam)}'dan ekstra ${formatYuzde(data.mudurIndirimDegeri)} indirim uygulandı</div>
    </div>
  `
      : "";

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kişiye Özel Eğitim Teklifi — ${teklifNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 210mm;
      min-height: 297mm;
      font-family: 'Roboto Condensed', Arial, sans-serif;
      background: #ffffff;
      color: #111827;
      font-size: 11pt;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    /* ─── HEADER ─── */
    .header {
      background: #111827;
      color: #ffffff;
      padding: 16px 24px 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-left {}

    .logo-area {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .logo-badge {
      background: #FFF200;
      color: #111827;
      font-size: 13pt;
      font-weight: 700;
      padding: 4px 10px;
      letter-spacing: 1px;
      border-radius: 3px;
    }

    .branch-name {
      font-size: 10pt;
      color: #9CA3AF;
      letter-spacing: 0.5px;
    }

    .offer-title {
      font-size: 16pt;
      font-weight: 700;
      color: #FFF200;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    .header-right {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px;
      padding: 10px 14px;
      min-width: 200px;
      text-align: right;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 4px;
      font-size: 9pt;
    }

    .info-row:last-child { margin-bottom: 0; }

    .info-label {
      color: #9CA3AF;
      white-space: nowrap;
    }

    .info-val {
      color: #ffffff;
      font-weight: 500;
    }

    .teklif-no {
      font-size: 11pt;
      font-weight: 700;
      color: #FFF200;
      text-align: right;
      margin-bottom: 8px;
    }

    /* ─── BODY ─── */
    .body {
      flex: 1;
      padding: 14px 24px 10px;
      background: #F5F6F8;
    }

    /* ─── STUDENT GREETING ─── */
    .student-greeting {
      background: #ffffff;
      border-left: 4px solid #FFF200;
      border-radius: 0 6px 6px 0;
      padding: 10px 14px;
      margin-bottom: 12px;
    }

    .student-name {
      font-size: 13pt;
      font-weight: 700;
      color: #111827;
    }

    .student-subtitle {
      font-size: 9.5pt;
      color: #6B7280;
      margin-top: 2px;
    }

    /* ─── CAMPAIGN HERO ─── */
    .campaign-hero {
      background: #111827;
      color: #ffffff;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 12px;
      text-align: center;
    }

    .campaign-title {
      font-size: 20pt;
      font-weight: 700;
      color: #FFF200;
      letter-spacing: 1px;
      line-height: 1.15;
    }

    .campaign-subtitle {
      font-size: 10pt;
      color: #D1D5DB;
      margin-top: 4px;
    }

    .campaign-tags {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .campaign-tag {
      background: rgba(255,242,0,0.12);
      border: 1px solid rgba(255,242,0,0.3);
      color: #FFF200;
      font-size: 9pt;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 20px;
    }

    /* ─── SECTIONS ─── */
    .section {
      background: #ffffff;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 10px;
      border: 1px solid #E5E7EB;
    }

    .section-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #374151;
      border-bottom: 2px solid #FFF200;
      padding-bottom: 5px;
      margin-bottom: 10px;
      display: inline-block;
    }

    /* ─── PRICE TABLE ─── */
    .price-table {
      width: 100%;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      border-bottom: 1px solid #F3F4F6;
      font-size: 10pt;
    }

    .price-row:last-child { border-bottom: none; }

    .price-label { color: #6B7280; }

    .price-value {
      font-weight: 600;
      color: #111827;
    }

    .price-value.strikethrough {
      text-decoration: line-through;
      color: #9CA3AF;
      font-weight: 400;
    }

    .price-value.discount { color: #059669; }

    .price-value.main {
      font-size: 13pt;
      font-weight: 700;
      color: #111827;
    }

    /* ─── TOTAL HIGHLIGHT ─── */
    .total-box {
      background: #111827;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .total-box-label {
      color: #9CA3AF;
      font-size: 10pt;
    }

    .total-box-value {
      color: #FFF200;
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    /* ─── MANAGER DISCOUNT ─── */
    .manager-discount {
      display: flex;
      justify-content: space-between;
      background: #ECFDF5;
      border: 1px solid #6EE7B7;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 8px;
      font-size: 10pt;
    }

    .manager-discount-label { color: #065F46; font-weight: 600; }
    .manager-discount-value { color: #059669; font-weight: 700; font-size: 12pt; }

    /* ─── SPECIAL PRICE ─── */
    .special-price-card {
      background: #FFF200;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 10px;
      text-align: center;
    }

    .special-price-label {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #111827;
      margin-bottom: 4px;
    }

    .special-price-value {
      font-size: 26pt;
      font-weight: 700;
      color: #111827;
      line-height: 1.1;
    }

    .special-price-note {
      font-size: 8.5pt;
      color: #374151;
      margin-top: 4px;
    }

    /* ─── PAYMENT ─── */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }

    .payment-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      border-bottom: 1px solid #F3F4F6;
      font-size: 10pt;
    }

    .payment-row:last-child { border-bottom: none; }
    .payment-label { color: #6B7280; }

    .payment-value {
      font-weight: 600;
      color: #111827;
    }

    .payment-value.big {
      font-size: 13pt;
      font-weight: 700;
      color: #1D4ED8;
    }

    .highlight-row {
      background: #EFF6FF;
      margin: 2px -8px;
      padding: 6px 8px;
      border-radius: 4px;
      border-bottom: none !important;
    }

    /* ─── CASH ADVANTAGE ─── */
    .cash-advantage {
      background: #FFF200;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 10px;
    }

    .cash-advantage-title {
      font-size: 10pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 3px;
    }

    .cash-advantage-body {
      font-size: 9.5pt;
      color: #374151;
    }

    /* ─── GIFTS ─── */
    .gifts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
    }

    .gift-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .gift-icon {
      font-size: 14pt;
      flex-shrink: 0;
      line-height: 1;
    }

    .gift-info {}

    .gift-name {
      font-size: 9.5pt;
      font-weight: 600;
      color: #111827;
      margin-bottom: 2px;
    }

    .gift-value {
      font-size: 8.5pt;
      color: #6B7280;
    }

    .gift-badge {
      background: #111827;
      color: #FFF200;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      letter-spacing: 0.5px;
      vertical-align: middle;
      margin-left: 3px;
    }

    .gifts-total {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #E5E7EB;
      font-size: 9.5pt;
      color: #374151;
      text-align: right;
    }

    /* ─── VALIDITY ─── */
    .validity-box {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 10px;
    }

    .validity-main {
      font-size: 10pt;
      font-weight: 700;
      color: #991B1B;
    }

    .validity-sub {
      font-size: 8.5pt;
      color: #B91C1C;
      margin-top: 3px;
    }

    /* ─── CONSULTANT ─── */
    .consultant-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 10px;
    }

    .consultant-cta {
      font-size: 10pt;
      color: #374151;
      margin-bottom: 10px;
    }

    .consultant-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .consultant-item {
      font-size: 9.5pt;
    }

    .consultant-item-label {
      color: #9CA3AF;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .consultant-item-value {
      font-weight: 600;
      color: #111827;
    }

    /* ─── FOOTER ─── */
    .footer {
      background: #111827;
      padding: 8px 24px;
      text-align: center;
      font-size: 7.5pt;
      color: #6B7280;
      line-height: 1.5;
    }

    @media print {
      body { margin: 0; }
      .page { page-break-inside: avoid; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- A. KURUMSAL ÜST ALAN -->
  <div class="header">
    <div class="header-left">
      <div class="logo-area">
        <span class="logo-badge">ENGLISH TIME</span>
        <span class="branch-name">${data.subeAdi || "Şube"}</span>
      </div>
      <div class="offer-title">KİŞİYE ÖZEL EĞİTİM TEKLİFİ</div>
    </div>
    <div class="header-right">
      <div class="teklif-no">${teklifNo}</div>
      <div class="info-row">
        <span class="info-label">Teklif Tarihi</span>
        <span class="info-val">${teklifTarihi}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Danışman</span>
        <span class="info-val">${danismanTamAdi || "—"}</span>
      </div>
      ${
        data.danismanTelefon
          ? `<div class="info-row">
        <span class="info-label">Danışman Tel</span>
        <span class="info-val">${data.danismanTelefon}</span>
      </div>`
          : ""
      }
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- B. ÖĞRENCİYE ÖZEL GİRİŞ -->
    <div class="student-greeting">
      <div class="student-name">${ogrenciHitap}</div>
      <div class="student-subtitle">
        Eğitim hedeflerinize göre hazırlanan program ve ödeme seçenekleri aşağıda sunulmuştur.
      </div>
    </div>

    <!-- C. ANA KAMPANYA ALANI -->
    <div class="campaign-hero">
      <div class="campaign-title">${data.kampanyaAdi}</div>
      <div class="campaign-subtitle">${data.egitimTipi}</div>
      <div class="campaign-tags">
        <span class="campaign-tag">📚 ${data.kurSayisi} Kur</span>
        <span class="campaign-tag">⏱ ${data.dersSaati} Saat</span>
        <span class="campaign-tag">🎓 ${data.egitimTipi}</span>
      </div>
    </div>

    <!-- D. FİYAT ALANI -->
    ${ozelFiyatHTML}

    ${!ozelFiyatHTML ? `
    <div class="total-box">
      <div>
        <div class="total-box-label">Genel Toplam</div>
        <div style="font-size:8.5pt;color:#6B7280;">Tüm vergiler dahil</div>
      </div>
      <div class="total-box-value">${formatTL(data.genelToplam)}</div>
    </div>
    ` : ""}

    ${mudurIndirimHTML}

    <!-- E. FİYAT DETAYI + ÖDEME PLANI -->
    <div class="two-col">
      <div class="section" style="margin-bottom:0;">
        <div class="section-title">Fiyat Bilgileri</div>
        <div class="price-table">
          <div class="price-row">
            <span class="price-label">Program Liste Fiyatı</span>
            <span class="price-value strikethrough">${formatTL(data.listeFiyati)}</span>
          </div>
          <div class="price-row">
            <span class="price-label">Kampanya İndirimi</span>
            <span class="price-value discount">−${formatTL(data.indirimTutari)} (${formatYuzde(data.indirimYuzdesi)})</span>
          </div>
          <div class="price-row">
            <span class="price-label">Kampanyalı Fiyat</span>
            <span class="price-value main">${formatTL(data.kampanyaliFiyat)}</span>
          </div>
          ${data.nakitFiyati > 0 && data.odemeTipi !== "nakit" ? `
          <div class="price-row">
            <span class="price-label">Nakit Fiyat</span>
            <span class="price-value" style="color:#059669;font-weight:700;">${formatTL(data.nakitFiyati)}</span>
          </div>
          ` : ""}
        </div>
      </div>

      <div class="section" style="margin-bottom:0;">
        <div class="section-title">Ödeme Planı</div>
        ${odemeDetayHTML}
      </div>
    </div>

    <!-- Nakit avantaj banneri -->
    ${nakitAvantajHTML}

    <!-- F. HEDİYELER -->
    ${hediyelerHTML}

    <!-- G. GEÇERLİLİK UYARISI -->
    <div class="validity-box">
      <div class="validity-main">
        ⏳ Bu teklif ${sonGecerlilikTarihi} saat 18.00'e kadar geçerlidir.
      </div>
      <div class="validity-sub">
        Belirtilen fiyat ve kampanya koşulları, teklif süresi sonunda yeniden değerlendirilebilir.
      </div>
    </div>

    <!-- H. DANIŞMAN VE SONRAKİ ADIM -->
    <div class="consultant-box">
      <div class="consultant-cta">
        Teklifinizi onaylamak ve kontenjanınızı ayırmak için eğitim danışmanınızla iletişime geçebilirsiniz.
      </div>
      <div class="consultant-info">
        ${danismanTamAdi ? `<div class="consultant-item">
          <div class="consultant-item-label">Danışman</div>
          <div class="consultant-item-value">${danismanTamAdi}</div>
        </div>` : ""}
        ${data.subeAdi ? `<div class="consultant-item">
          <div class="consultant-item-label">Şube</div>
          <div class="consultant-item-value">${data.subeAdi}</div>
        </div>` : ""}
        ${data.danismanTelefon ? `<div class="consultant-item">
          <div class="consultant-item-label">Telefon / WhatsApp</div>
          <div class="consultant-item-value">${data.danismanTelefon}</div>
        </div>` : ""}
        ${data.subeTelefon ? `<div class="consultant-item">
          <div class="consultant-item-label">Şube Telefonu</div>
          <div class="consultant-item-value">${data.subeTelefon}</div>
        </div>` : ""}
        ${data.subeAdresi ? `<div class="consultant-item" style="grid-column:1/-1;">
          <div class="consultant-item-label">Şube Adresi</div>
          <div class="consultant-item-value">${data.subeAdresi}</div>
        </div>` : ""}
      </div>
    </div>

  </div>

  <!-- I. YASAL AÇIKLAMA -->
  <div class="footer">
    Bu belge eğitim kapsamı, kampanya avantajları ve ödeme seçenekleri hakkında ön bilgilendirme amacı taşır.
    Kesin kayıt işlemi tamamlandığında taraflar arasında eğitim sözleşmesi düzenlenir. &bull; ${teklifNo} &bull; ${teklifTarihi}
  </div>

</div>

<script>
  window.addEventListener('load', function() {
    window.print();
  });
</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    console.error(
      "Yeni pencere açılamadı. Tarayıcı pop-up engelleyicisini kontrol edin."
    );
    alert(
      "PDF penceresi açılamadı. Lütfen tarayıcınızın pop-up engelleyicisini bu site için devre dışı bırakın."
    );
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
}
