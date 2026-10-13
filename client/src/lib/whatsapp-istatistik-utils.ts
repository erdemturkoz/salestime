type WhatsappFilterRecord = {
  ogrenciAdi: string;
  ogrenciTelefon: string;
  kampanyaAdi: string;
  danismanAdi: string;
  danismanSoyadi: string;
  subeAdi: string;
  odemeTipi: string;
  genelToplam: number;
};

export type WhatsappStatisticsFilters = {
  search: string;
  branch: string;
  advisor: string;
  paymentType: string;
};

export function filterWhatsappStatistics<T extends WhatsappFilterRecord>(
  records: T[],
  filters: WhatsappStatisticsFilters,
): T[] {
  const search = filters.search.trim().toLocaleLowerCase("tr-TR");

  return records.filter((record) => {
    const searchMatches =
      !search ||
      record.ogrenciAdi.toLocaleLowerCase("tr-TR").includes(search) ||
      record.ogrenciTelefon.includes(search) ||
      record.kampanyaAdi.toLocaleLowerCase("tr-TR").includes(search) ||
      record.danismanAdi.toLocaleLowerCase("tr-TR").includes(search) ||
      record.danismanSoyadi.toLocaleLowerCase("tr-TR").includes(search);

    const branchMatches = filters.branch === "hepsi" || record.subeAdi === filters.branch;
    const advisorMatches =
      filters.advisor === "hepsi" ||
      `${record.danismanAdi} ${record.danismanSoyadi}` === filters.advisor;
    const paymentMatches = filters.paymentType === "hepsi" || record.odemeTipi === filters.paymentType;

    return searchMatches && branchMatches && advisorMatches && paymentMatches;
  });
}

export function summarizeWhatsappStatistics(records: WhatsappFilterRecord[]) {
  const total = records.reduce(
    (sum, record) => sum + (Number.isFinite(record.genelToplam) ? record.genelToplam : 0),
    0,
  );
  const count = records.length;

  return {
    count,
    total,
    uniqueStudents: new Set(records.map((record) => record.ogrenciTelefon)).size,
    average: count ? total / count : 0,
  };
}
