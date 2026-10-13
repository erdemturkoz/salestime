import assert from "node:assert/strict";
import test from "node:test";
import {
  filterWhatsappStatistics,
  summarizeWhatsappStatistics,
} from "../client/src/lib/whatsapp-istatistik-utils";

const records = [
  {
    ogrenciAdi: "Deniz Arı",
    ogrenciTelefon: "5550000001",
    kampanyaAdi: "Temel Eğitim",
    danismanAdi: "Ayşe",
    danismanSoyadi: "Yılmaz",
    subeAdi: "Kadıköy",
    odemeTipi: "Nakit",
    genelToplam: 12000,
  },
  {
    ogrenciAdi: "Deniz Arı",
    ogrenciTelefon: "5550000001",
    kampanyaAdi: "İleri Eğitim",
    danismanAdi: "Ayşe",
    danismanSoyadi: "Yılmaz",
    subeAdi: "Kadıköy",
    odemeTipi: "Kredi Kartı",
    genelToplam: 18000,
  },
  {
    ogrenciAdi: "Ece Kaya",
    ogrenciTelefon: "5550000002",
    kampanyaAdi: "Temel Eğitim",
    danismanAdi: "Mert",
    danismanSoyadi: "Demir",
    subeAdi: "Beşiktaş",
    odemeTipi: "Nakit",
    genelToplam: 9000,
  },
];

test("search, branch, advisor, and payment filters combine over the full record list", () => {
  const filtered = filterWhatsappStatistics(records, {
    search: "deniz",
    branch: "Kadıköy",
    advisor: "Ayşe Yılmaz",
    paymentType: "Kredi Kartı",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].genelToplam, 18000);
  assert.deepEqual(summarizeWhatsappStatistics(filtered), {
    count: 1,
    total: 18000,
    uniqueStudents: 1,
    average: 18000,
  });
});

test("the summary covers all filtered rows and preserves phone-based unique students", () => {
  const filtered = filterWhatsappStatistics(records, {
    search: "",
    branch: "Kadıköy",
    advisor: "hepsi",
    paymentType: "hepsi",
  });

  assert.equal(filtered.length, 2);
  assert.deepEqual(summarizeWhatsappStatistics(filtered), {
    count: 2,
    total: 30000,
    uniqueStudents: 1,
    average: 15000,
  });
});

test("empty results show finite zero values on every summary card", () => {
  assert.deepEqual(summarizeWhatsappStatistics([]), {
    count: 0,
    total: 0,
    uniqueStudents: 0,
    average: 0,
  });
});

test("average remains the exact filtered total divided by the filtered count", () => {
  assert.equal(
    summarizeWhatsappStatistics([
      { ...records[0], genelToplam: 12000 },
      { ...records[2], genelToplam: 9001 },
    ]).average,
    10500.5,
  );
});
