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

  // Çoklu teklif desteği (isteğe bağlı)
  isRecommended?: boolean;
  pesinat?: number;
  kalanTutar?: number;
}

function formatTL(amount: number): string {
  if (!amount || amount === 0) return "0 TL";
  return (
    amount.toLocaleString("tr-TR", {
      minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    }) + " TL"
  );
}

function formatYuzde(val: number): string {
  const rounded = parseFloat(val.toFixed(1));
  const str = rounded.toString().replace(".", ",");
  return `%${str}`;
}

function formatTarih(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function teklifNumarasiUret(subeAdi: string): string {
  const subeKod = subeAdi
    .toUpperCase()
    .replace(/\u0130/g, "I")
    .replace(/\u015e/g, "S")
    .replace(/\u00c7/g, "C")
    .replace(/\u011e/g, "G")
    .replace(/\u00dc/g, "U")
    .replace(/\u00d6/g, "O")
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 10);

  const key = `teklif_counter_${subeKod}`;
  const current = parseInt(localStorage.getItem(key) || "1000", 10);
  const next = current + 1;
  localStorage.setItem(key, next.toString());

  return `ET-${subeKod}-${next}`;
}

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

export function generateTeklifPDF(data: TeklifData): void {
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
    ? `Sayin ${data.ogrenciAdi},`
    : "Sayin Ogrencimiz,";

  // Turkish character safe version for display
  const ogrenciHitapTR = data.ogrenciAdi
    ? `Say\u0131n ${data.ogrenciAdi},`
    : "Say\u0131n \u00d6\u011frencimiz,";

  const danismanTamAdi = `${data.danismanAdi} ${data.danismanSoyadi}`.trim();

  // Ödeme planı
  let odemeDetayHTML = "";
  if (data.taksitSayisi <= 1) {
    odemeDetayHTML = `
      <div class="payment-row">
        <span class="payment-label">\u00d6deme \u015eekli</span>
        <span class="payment-value">${data.odemeTipiText} \u2013 Tek \u00d6deme</span>
      </div>
      <div class="payment-row highlight-row">
        <span class="payment-label">\u00d6denecek Tutar</span>
        <span class="payment-value big">${formatTL(aktifFiyat)}</span>
      </div>
    `;
  } else {
    odemeDetayHTML = `
      <div class="payment-row">
        <span class="payment-label">\u00d6deme \u015eekli</span>
        <span class="payment-value">${data.odemeTipiText}</span>
      </div>
      <div class="payment-row">
        <span class="payment-label">Taksit Say\u0131s\u0131</span>
        <span class="payment-value">${data.taksitSayisi} Taksit</span>
      </div>
      <div class="payment-row highlight-row">
        <span class="payment-label">Ayl\u0131k Taksit</span>
        <span class="payment-value big">${formatTL(data.aylikOdeme)} \u00d7 ${data.taksitSayisi}</span>
      </div>
      <div class="payment-row">
        <span class="payment-label">Toplam \u00d6denecek</span>
        <span class="payment-value">${formatTL(aktifFiyat)}</span>
      </div>
    `;
  }

  // Nakit avantajı
  let nakitAvantajHTML = "";
  if (data.odemeTipi !== "nakit" && data.nakitFiyati > 0) {
    const nakitFark = aktifFiyat - data.nakitFiyati;
    if (nakitFark > 0) {
      nakitAvantajHTML = `
        <div class="cash-advantage">
          <span class="cash-icon">&#128161;</span>
          <div>
            <div class="cash-title">NAK\u0130T \u00d6DEME TAVS\u0130YE ED\u0130L\u0130R</div>
            <div class="cash-body">Nakit \u00f6demede yaln\u0131zca <strong>${formatTL(data.nakitFiyati)}</strong> \u00f6dersiniz &mdash; <strong>${formatTL(nakitFark)}</strong> tasarruf edersiniz.</div>
          </div>
        </div>
      `;
    }
  }

  // Hediyeler
  const hediyelerListesi: string[] = [];
  if (data.kitapDahil && data.kitapUcreti > 0) {
    const fiyatStr = data.kitapHediyeEdildi
      ? `${formatTL(data.kitapUcreti)} de\u011ferinde &mdash; Hediye`
      : formatTL(data.kitapUcreti);
    const badge = data.kitapHediyeEdildi
      ? `<span class="gift-badge">HED\u0130YE</span>`
      : "";
    hediyelerListesi.push(`
      <div class="gift-card">
        <div class="gift-icon">&#127873;</div>
        <div class="gift-info">
          <div class="gift-name">Kitap Seti ${badge}</div>
          <div class="gift-value">${fiyatStr}</div>
        </div>
      </div>
    `);
  }
  data.hediyeler.forEach((h) => {
    const verildi = data.hediyeEdildi[h.isim];
    const badge = verildi ? `<span class="gift-badge">HED\u0130YE</span>` : "";
    const fiyatStr =
      h.fiyat > 0
        ? verildi
          ? `${formatTL(h.fiyat)} de\u011ferinde &mdash; Hediye`
          : formatTL(h.fiyat)
        : "\u00dccretsiz";
    hediyelerListesi.push(`
      <div class="gift-card">
        <div class="gift-icon">&#127873;</div>
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
          ? `<div class="gifts-total">Toplam hediye ve avantaj de\u011feri: <strong>${formatTL(toplamHediye)}</strong></div>`
          : ""
      }
    </div>
  `
      : "";

  // Müdür indirimi
  const mudurIndirimHTML =
    data.mudurIndirimTutari > 0
      ? `
    <div class="manager-discount">
      <div class="manager-discount-label">M\u00fcд\u00fcr \u0130nisiyatifi \u0130ndirimi</div>
      <div class="manager-discount-value">&minus;${formatTL(data.mudurIndirimTutari)}</div>
    </div>
  `
      : "";

  // Özel fiyat
  const ozelFiyatHTML =
    data.mudurIndirimTutari > 0
      ? `
    <div class="special-price-card">
      <div class="special-price-label">K\u0130\u015e\u0130YE \u00d6ZEL F\u0130YAT</div>
      <div class="special-price-value">${formatTL(data.ozelFiyat)}</div>
      <div class="special-price-note">Genel toplam ${formatTL(data.genelToplam)}&rsquo;dan ekstra ${formatYuzde(data.mudurIndirimDegeri)} indirim uyguland\u0131</div>
    </div>
  `
      : "";

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ki\u015fiye \u00d6zel E\u011fitim Teklifi \u2014 ${teklifNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
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
      height: 297mm;
      overflow: hidden;
      font-family: 'Inter', 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #ffffff;
      color: #111827;
      font-size: 10pt;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    /* ─── HEADER ─── */
    .header {
      background: #1a1a2e;
      color: #ffffff;
      padding: 12px 22px 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-shrink: 0;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .logo-badge {
      background: #f97316;
      color: #ffffff;
      font-size: 11pt;
      font-weight: 700;
      padding: 3px 10px;
      letter-spacing: 0.5px;
      border-radius: 4px;
    }

    .branch-name {
      font-size: 9pt;
      color: #94a3b8;
      font-weight: 500;
      letter-spacing: 0.3px;
    }

    .offer-title {
      font-size: 13pt;
      font-weight: 700;
      color: #f97316;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    .header-right {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px;
      padding: 8px 12px;
      min-width: 185px;
      text-align: right;
    }

    .teklif-no {
      font-size: 10pt;
      font-weight: 700;
      color: #f97316;
      text-align: right;
      margin-bottom: 5px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 3px;
      font-size: 8pt;
    }

    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #94a3b8; white-space: nowrap; }
    .info-val { color: #e2e8f0; font-weight: 500; }

    /* ─── BODY ─── */
    .body {
      flex: 1;
      padding: 10px 22px 8px;
      background: #f8fafc;
      overflow: hidden;
    }

    /* ─── STUDENT GREETING ─── */
    .student-greeting {
      background: #ffffff;
      border-left: 4px solid #f97316;
      border-radius: 0 5px 5px 0;
      padding: 7px 12px;
      margin-bottom: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    .student-name {
      font-size: 11pt;
      font-weight: 700;
      color: #111827;
    }

    .student-subtitle {
      font-size: 8.5pt;
      color: #6b7280;
      margin-top: 1px;
    }

    /* ─── CAMPAIGN HERO ─── */
    .campaign-hero {
      background: #1a1a2e;
      color: #ffffff;
      border-radius: 7px;
      padding: 10px 18px;
      margin-bottom: 8px;
      text-align: center;
    }

    .campaign-title {
      font-size: 17pt;
      font-weight: 700;
      color: #f97316;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }

    .campaign-subtitle {
      font-size: 9pt;
      color: #cbd5e1;
      margin-top: 2px;
    }

    .campaign-tags {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 7px;
      flex-wrap: wrap;
    }

    .campaign-tag {
      background: rgba(249,115,22,0.15);
      border: 1px solid rgba(249,115,22,0.35);
      color: #fb923c;
      font-size: 8pt;
      font-weight: 600;
      padding: 2px 9px;
      border-radius: 20px;
    }

    /* ─── SECTIONS ─── */
    .section {
      background: #ffffff;
      border-radius: 5px;
      padding: 8px 13px;
      margin-bottom: 7px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }

    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #374151;
      border-bottom: 2px solid #f97316;
      padding-bottom: 4px;
      margin-bottom: 7px;
      display: inline-block;
    }

    /* ─── PRICE TABLE ─── */
    .price-table { width: 100%; }

    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 9pt;
    }

    .price-row:last-child { border-bottom: none; }
    .price-label { color: #6b7280; }

    .price-value {
      font-weight: 600;
      color: #111827;
    }

    .price-value.strikethrough {
      text-decoration: line-through;
      color: #9ca3af;
      font-weight: 400;
    }

    .price-value.discount { color: #059669; }

    .price-value.main {
      font-size: 11pt;
      font-weight: 700;
      color: #111827;
    }

    /* ─── TOTAL BOX ─── */
    .total-box {
      background: #1a1a2e;
      border-radius: 6px;
      padding: 9px 14px;
      margin-bottom: 7px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .total-box-label { color: #94a3b8; font-size: 9pt; }
    .total-box-sub { font-size: 7.5pt; color: #64748b; margin-top: 1px; }

    .total-box-value {
      color: #f97316;
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    /* ─── MANAGER DISCOUNT ─── */
    .manager-discount {
      display: flex;
      justify-content: space-between;
      background: #ecfdf5;
      border: 1px solid #6ee7b7;
      border-radius: 5px;
      padding: 6px 12px;
      margin-bottom: 6px;
      font-size: 9pt;
    }

    .manager-discount-label { color: #065f46; font-weight: 600; }
    .manager-discount-value { color: #059669; font-weight: 700; font-size: 11pt; }

    /* ─── SPECIAL PRICE ─── */
    .special-price-card {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 7px;
      text-align: center;
    }

    .special-price-label {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.85);
      margin-bottom: 3px;
    }

    .special-price-value {
      font-size: 22pt;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.1;
    }

    .special-price-note {
      font-size: 8pt;
      color: rgba(255,255,255,0.8);
      margin-top: 3px;
    }

    /* ─── TWO COLUMN LAYOUT ─── */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 7px;
    }

    /* ─── PAYMENT ─── */
    .payment-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 9pt;
    }

    .payment-row:last-child { border-bottom: none; }
    .payment-label { color: #6b7280; }

    .payment-value {
      font-weight: 600;
      color: #111827;
    }

    .payment-value.big {
      font-size: 11pt;
      font-weight: 700;
      color: #1d4ed8;
    }

    .highlight-row {
      background: #eff6ff;
      margin: 2px -8px;
      padding: 5px 8px;
      border-radius: 4px;
      border-bottom: none !important;
    }

    /* ─── CASH ADVANTAGE ─── */
    .cash-advantage {
      background: #fef9c3;
      border: 1px solid #fde047;
      border-radius: 5px;
      padding: 7px 12px;
      margin-bottom: 7px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .cash-icon { font-size: 14pt; flex-shrink: 0; }
    .cash-title { font-size: 8.5pt; font-weight: 700; color: #713f12; margin-bottom: 2px; }
    .cash-body { font-size: 8.5pt; color: #854d0e; }

    /* ─── GIFTS ─── */
    .gifts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 6px;
    }

    .gift-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 5px;
      padding: 6px 8px;
      display: flex;
      gap: 6px;
      align-items: flex-start;
    }

    .gift-icon { font-size: 13pt; flex-shrink: 0; line-height: 1; }

    .gift-name {
      font-size: 8.5pt;
      font-weight: 600;
      color: #111827;
      margin-bottom: 1px;
    }

    .gift-value { font-size: 8pt; color: #6b7280; }

    .gift-badge {
      background: #f97316;
      color: #ffffff;
      font-size: 7pt;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      letter-spacing: 0.3px;
      vertical-align: middle;
      margin-left: 3px;
    }

    .gifts-total {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #e5e7eb;
      font-size: 8.5pt;
      color: #374151;
      text-align: right;
    }

    /* ─── VALIDITY ─── */
    .validity-box {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 5px;
      padding: 7px 12px;
      margin-bottom: 7px;
    }

    .validity-main {
      font-size: 9.5pt;
      font-weight: 700;
      color: #9a3412;
    }

    .validity-sub {
      font-size: 8pt;
      color: #c2410c;
      margin-top: 2px;
    }

    /* ─── CONSULTANT ─── */
    .consultant-box {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 5px;
      padding: 8px 13px;
      margin-bottom: 7px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }

    .consultant-cta {
      font-size: 8.5pt;
      color: #374151;
      margin-bottom: 7px;
    }

    .consultant-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
    }

    .consultant-item { font-size: 9pt; }

    .consultant-item-label {
      color: #9ca3af;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .consultant-item-value {
      font-weight: 600;
      color: #111827;
    }

    /* ─── FOOTER ─── */
    .footer {
      background: #1a1a2e;
      padding: 6px 22px;
      text-align: center;
      font-size: 7pt;
      color: #64748b;
      line-height: 1.5;
      flex-shrink: 0;
    }

    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="logo-area">
        <span class="logo-badge">ENGLISH TIME</span>
        <span class="branch-name">${data.subeAdi || "\u015eube"}</span>
      </div>
      <div class="offer-title">K\u0130\u015e\u0130YE \u00d6ZEL E\u011e\u0130T\u0130M TEKL\u0130F\u0130</div>
    </div>
    <div class="header-right">
      <div class="teklif-no">${teklifNo}</div>
      <div class="info-row">
        <span class="info-label">Teklif Tarihi</span>
        <span class="info-val">${teklifTarihi}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Dan\u0131\u015fman</span>
        <span class="info-val">${danismanTamAdi || "\u2014"}</span>
      </div>
      ${
        data.danismanTelefon
          ? `<div class="info-row">
        <span class="info-label">Telefon</span>
        <span class="info-val">${data.danismanTelefon}</span>
      </div>`
          : ""
      }
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- Öğrenci selamlama -->
    <div class="student-greeting">
      <div class="student-name">Say\u0131n ${data.ogrenciAdi || "\u00d6\u011frencimiz"},</div>
      <div class="student-subtitle">E\u011fitim hedeflerinize g\u00f6re haz\u0131rlanan program ve \u00f6deme se\u00e7enekleri a\u015fa\u011f\u0131da sunulmu\u015ftur.</div>
    </div>

    <!-- Kampanya hero -->
    <div class="campaign-hero">
      <div class="campaign-title">${data.kampanyaAdi}</div>
      <div class="campaign-subtitle">${data.egitimTipi}</div>
      <div class="campaign-tags">
        <span class="campaign-tag">&#128218; ${data.kurSayisi} Kur</span>
        <span class="campaign-tag">&#9200; ${data.dersSaati} Saat</span>
        <span class="campaign-tag">&#127891; ${data.egitimTipi}</span>
      </div>
    </div>

    <!-- Toplam / Özel fiyat -->
    ${ozelFiyatHTML}

    ${
      !ozelFiyatHTML
        ? `
    <div class="total-box">
      <div>
        <div class="total-box-label">Genel Toplam</div>
        <div class="total-box-sub">T\u00fcm vergiler dahil</div>
      </div>
      <div class="total-box-value">${formatTL(data.genelToplam)}</div>
    </div>
    `
        : ""
    }

    ${mudurIndirimHTML}

    <!-- Fiyat + Ödeme -->
    <div class="two-col">
      <div class="section" style="margin-bottom:0;">
        <div class="section-title">Fiyat Bilgileri</div>
        <div class="price-table">
          <div class="price-row">
            <span class="price-label">Liste Fiyat\u0131</span>
            <span class="price-value strikethrough">${formatTL(data.listeFiyati)}</span>
          </div>
          <div class="price-row">
            <span class="price-label">Kampanya \u0130ndirimi</span>
            <span class="price-value discount">&minus;${formatTL(data.indirimTutari)} (${formatYuzde(data.indirimYuzdesi)})</span>
          </div>
          <div class="price-row">
            <span class="price-label">Kampanyal\u0131 Fiyat</span>
            <span class="price-value main">${formatTL(data.kampanyaliFiyat)}</span>
          </div>
          ${
            data.nakitFiyati > 0 && data.odemeTipi !== "nakit"
              ? `
          <div class="price-row">
            <span class="price-label">Nakit Fiyat</span>
            <span class="price-value" style="color:#059669;font-weight:700;">${formatTL(data.nakitFiyati)}</span>
          </div>
          `
              : ""
          }
        </div>
      </div>

      <div class="section" style="margin-bottom:0;">
        <div class="section-title">\u00d6deme Plan\u0131</div>
        ${odemeDetayHTML}
      </div>
    </div>

    <!-- Nakit avantajı -->
    ${nakitAvantajHTML}

    <!-- Hediyeler -->
    ${hediyelerHTML}

    <!-- Geçerlilik -->
    <div class="validity-box">
      <div class="validity-main">&#9203; Bu teklif ${sonGecerlilikTarihi} saat 18.00&rsquo;e kadar ge\u00e7erlidir.</div>
      <div class="validity-sub">Belirtilen fiyat ve kampanya ko\u015fullar\u0131, teklif s\u00fcresi sonunda yeniden de\u011flendirilebilir.</div>
    </div>

    <!-- Danışman -->
    <div class="consultant-box">
      <div class="consultant-cta">Teklifinizi onaylamak ve kontenjan\u0131n\u0131z\u0131 ay\u0131rmak i\u00e7in e\u011fitim dan\u0131\u015fman\u0131n\u0131zla ileti\u015fime ge\u00e7ebilirsiniz.</div>
      <div class="consultant-info">
        ${danismanTamAdi ? `<div class="consultant-item">
          <div class="consultant-item-label">Dan\u0131\u015fman</div>
          <div class="consultant-item-value">${danismanTamAdi}</div>
        </div>` : ""}
        ${data.subeAdi ? `<div class="consultant-item">
          <div class="consultant-item-label">\u015eube</div>
          <div class="consultant-item-value">${data.subeAdi}</div>
        </div>` : ""}
        ${data.danismanTelefon ? `<div class="consultant-item">
          <div class="consultant-item-label">Telefon / WhatsApp</div>
          <div class="consultant-item-value">${data.danismanTelefon}</div>
        </div>` : ""}
        ${data.subeTelefon ? `<div class="consultant-item">
          <div class="consultant-item-label">\u015eube Telefonu</div>
          <div class="consultant-item-value">${data.subeTelefon}</div>
        </div>` : ""}
        ${data.subeAdresi ? `<div class="consultant-item" style="grid-column:1/-1;">
          <div class="consultant-item-label">\u015eube Adresi</div>
          <div class="consultant-item-value">${data.subeAdresi}</div>
        </div>` : ""}
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    Bu belge e\u011fitim kapsam\u0131, kampanya avantajlar\u0131 ve \u00f6deme se\u00e7enekleri hakk\u0131nda \u00f6n bilgilendirme ama\u00e7l\u0131d\u0131r. Kesin kay\u0131t i\u015flemi tamamland\u0131\u011f\u0131nda taraflar aras\u0131nda e\u011fitim s\u00f6zle\u015fmesi d\u00fczenlenir.
    &bull; ${teklifNo} &bull; ${teklifTarihi}
  </div>

</div>

<script>
  // Font y\u00fcklendikten sonra yazd\u0131r
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() {
      setTimeout(function() { window.print(); }, 300);
    });
  } else {
    setTimeout(function() { window.print(); }, 800);
  }
</script>
</body>
</html>`;

  // Blob URL kullanarak UTF-8 karakter sorununu \u00f6nle
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");

  if (!win) {
    URL.revokeObjectURL(url);
    alert(
      "PDF penceresi a\u00e7\u0131lamad\u0131. L\u00fctfen taray\u0131c\u0131n\u0131z\u0131n pop-up engelleyicisini bu site i\u00e7in devre d\u0131\u015f\u0131 b\u0131rak\u0131n."
    );
    return;
  }

  // Pencere kapanınca blob URL'yi temizle
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ─────────────────────────────────────────────────────────────────
// Çift Teklif PDF Üreticisi
// ─────────────────────────────────────────────────────────────────
export function generateDualTeklifPDF(data1: TeklifData, data2: TeklifData): void {
  const bugun = new Date();
  const gecerlilikTarihi = new Date(bugun);
  gecerlilikTarihi.setDate(gecerlilikTarihi.getDate() + data1.gecerlilikGunu);

  const teklifNo = teklifNumarasiUret(data1.subeAdi || "ENGLISHTIME");
  const teklifTarihi = formatTarih(bugun);
  const sonGecerlilikTarihi = formatTarih(gecerlilikTarihi);

  const danismanTamAdi = `${data1.danismanAdi} ${data1.danismanSoyadi}`.trim();
  const ogrenciHitap = data1.ogrenciAdi
    ? `Say\u0131n ${data1.ogrenciAdi},`
    : "Say\u0131n \u00d6\u011frencimiz,";

  function teklifKarti(d: TeklifData, no: string): string {
    const aktifFiyat = d.mudurIndirimTutari > 0 ? d.ozelFiyat : d.genelToplam;
    const recommended = d.isRecommended
      ? `<div style="text-align:center;margin-bottom:8px;"><span style="background:#2563EB;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:.5px;">&#9733; \u00d6NER\u0130LEN</span></div>`
      : "";
    const border = d.isRecommended ? "border:2px solid #2563EB;" : "border:1px solid #e5e7eb;";

    let odemeStr = "";
    if (d.taksitSayisi <= 1) {
      odemeStr = `${d.odemeTipiText || "Nakit"} &mdash; Tek \u00d6deme`;
    } else {
      const pesinatStr = (d.pesinat ?? 0) > 0
        ? `${formatTL(d.pesinat!)} pe\u015finat + `
        : "";
      odemeStr = `${pesinatStr}${d.taksitSayisi} &times; ${formatTL(d.aylikOdeme)}`;
    }

    return `
      <div style="flex:1;${border}border-radius:12px;padding:18px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.06);">
        ${recommended}
        <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${no}</div>
        <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:2px;">${d.kampanyaAdi}</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:14px;">${d.egitimTipi} &mdash; ${d.kurSayisi} Kur / ${d.dersSaati} Saat</div>

        <table style="width:100%;font-size:12px;border-collapse:collapse;">
          <tr><td style="color:#6b7280;padding:3px 0;">Liste Fiyat\u0131</td><td style="text-align:right;text-decoration:line-through;color:#9ca3af;">${formatTL(d.listeFiyati)}</td></tr>
          <tr><td style="color:#6b7280;padding:3px 0;">Kampanya \u0130ndirimi</td><td style="text-align:right;color:#16a34a;font-weight:600;">-${formatTL(d.indirimTutari)} (%${d.indirimYuzdesi})</td></tr>
          <tr><td style="color:#6b7280;padding:3px 0;">Kampanyal\u0131 Fiyat</td><td style="text-align:right;font-weight:600;">${formatTL(d.kampanyaliFiyat)}</td></tr>
          ${d.kitapUcreti > 0 && d.kitapDahil ? `<tr><td style="color:#6b7280;padding:3px 0;">Kitap Seti</td><td style="text-align:right;">${d.kitapHediyeEdildi ? "<span style='color:#16a34a;font-weight:600;'>Hediye</span>" : formatTL(d.kitapUcreti)}</td></tr>` : ""}
          ${d.mudurIndirimTutari > 0 ? `<tr><td style="color:#6b7280;padding:3px 0;">M\u00fcд\u00fcr \u0130ndirimi</td><td style="text-align:right;color:#f97316;font-weight:600;">-${formatTL(d.mudurIndirimTutari)}</td></tr>` : ""}
        </table>

        <div style="margin-top:12px;padding:10px 14px;background:${d.isRecommended ? "#eff6ff" : "#f9fafb"};border-radius:8px;border:1px solid ${d.isRecommended ? "#bfdbfe" : "#e5e7eb"};">
          <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">Toplam Tutar</div>
          <div style="font-size:20px;font-weight:800;color:${d.isRecommended ? "#1d4ed8" : "#111827"};">${formatTL(aktifFiyat)}</div>
        </div>

        <div style="margin-top:8px;padding:8px 12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
          <div style="font-size:11px;color:#166534;\u00d6deme Plan\u0131">\u00d6deme Plan\u0131</div>
          <div style="font-size:13px;font-weight:600;color:#15803d;">${odemeStr}</div>
        </div>

        ${d.hediyeler.length > 0 || (d.kitapDahil && d.kitapUcreti > 0) ? `
        <div style="margin-top:10px;">
          <div style="font-size:11px;color:#6b7280;font-weight:600;margin-bottom:4px;">Hediyeler</div>
          ${d.kitapDahil && d.kitapUcreti > 0 ? `<div style="font-size:11px;color:#374151;">\u25cf Kitap Seti ${d.kitapHediyeEdildi ? "(Hediye)" : ""}</div>` : ""}
          ${d.hediyeler.map((h) => `<div style="font-size:11px;color:#374151;">\u25cf ${h.isim}</div>`).join("")}
        </div>` : ""}
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>English Time - Teklif Kar\u015f\u0131la\u015ft\u0131rmas\u0131</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',system-ui,sans-serif;background:#f6f7f9;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{max-width:800px;margin:0 auto;padding:20px;background:#fff;}
  @media print{body{background:#fff;}.page{padding:10px;max-width:100%;}}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:#172033;border-radius:12px;margin-bottom:20px;">
    <div>
      <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.3px;">ENGLISH TIME</div>
      <div style="color:#94a3b8;font-size:12px;margin-top:2px;">${data1.subeAdi || "Sales Time"}</div>
    </div>
    <div style="text-align:right;">
      <div style="color:#f97316;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">E\u011fitim Teklifi</div>
      <div style="color:#94a3b8;font-size:11px;margin-top:2px;">${teklifTarihi}</div>
    </div>
  </div>

  <!-- Öğrenci -->
  <div style="margin-bottom:16px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;">
    <div style="font-size:13px;color:#374151;">${ogrenciHitap}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px;">A\u015fa\u011f\u0131da haz\u0131rlad\u0131\u011f\u0131m\u0131z iki farkl\u0131 teklif se\u00e7ene\u011fini inceleyebilirsiniz.</div>
  </div>

  <!-- Teklif Kartları -->
  <div style="display:flex;gap:16px;margin-bottom:20px;">
    ${teklifKarti(data1, "Teklif 1")}
    ${teklifKarti(data2, "Teklif 2")}
  </div>

  <!-- Geçerlilik -->
  <div style="padding:12px 16px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;margin-bottom:16px;text-align:center;">
    <div style="font-size:12px;font-weight:700;color:#dc2626;">\u23f3 Bu teklifler ${sonGecerlilikTarihi} saat 18:00&rsquo;e kadar ge\u00e7erlidir.</div>
  </div>

  <!-- Danışman -->
  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e5e7eb;">
    <div>
      <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">E\u011fitim Dan\u0131\u015fman\u0131</div>
      <div style="font-size:13px;font-weight:600;color:#111827;margin-top:2px;">${danismanTamAdi || "&mdash;"}</div>
      ${data1.danismanTelefon ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${data1.danismanTelefon}</div>` : ""}
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#6b7280;">\u015eube</div>
      <div style="font-size:13px;font-weight:600;color:#111827;">${data1.subeAdi || ""}</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="margin-top:16px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #f3f4f6;padding-top:12px;">
    Bu belge e\u011fitim kapsam\u0131 ve \u00f6deme se\u00e7enekleri hakk\u0131nda \u00f6n bilgilendirme ama\u00e7l\u0131d\u0131r. &bull; ${teklifNo} &bull; ${teklifTarihi}
  </div>

</div>
<script>
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() { setTimeout(function() { window.print(); }, 300); });
  } else {
    setTimeout(function() { window.print(); }, 800);
  }
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    alert("PDF penceresi a\u00e7\u0131lamad\u0131. Pop-up engelleyiciyi devre d\u0131\u015f\u0131 b\u0131rak\u0131n.");
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
