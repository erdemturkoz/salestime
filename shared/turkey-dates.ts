const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

export type IstanbulDateRange = {
  start?: Date;
  endExclusive?: Date;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function istanbulDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
}

function parseDateInput(value: string): DateParts | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1 ||
    year > 9999 ||
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return undefined;
  }

  return { year, month, day };
}

function utcOffsetAt(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const representedAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  const instantAtWholeSecond = Math.floor(instant.getTime() / 1000) * 1000;
  return representedAsUtc - instantAtWholeSecond;
}

function istanbulMidnightAsUtc({ year, month, day }: DateParts): Date {
  const localMidnightAsUtc = Date.UTC(year, month - 1, day);
  let instant = localMidnightAsUtc;

  // Resolve the local wall-clock midnight using the IANA zone instead of
  // assuming the server and database use Istanbul time.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const next = localMidnightAsUtc - utcOffsetAt(new Date(instant));
    if (next === instant) break;
    instant = next;
  }

  return new Date(instant);
}

function nextDate({ year, month, day }: DateParts): DateParts {
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function getDefaultIstanbulDateRange(now = new Date()) {
  const today = istanbulDateParts(now);
  const todayText = [
    String(today.year).padStart(4, "0"),
    String(today.month).padStart(2, "0"),
    String(today.day).padStart(2, "0"),
  ].join("-");

  return {
    start: `${todayText.slice(0, 7)}-01`,
    end: todayText,
  };
}

export function formatDateInputTurkish(value: string): string {
  const date = parseDateInput(value);
  if (!date) return "Tarih seçilmedi";
  return `${String(date.day).padStart(2, "0")}.${String(date.month).padStart(2, "0")}.${date.year}`;
}

export function istanbulDateInputsToUtcRange(
  startInput?: string,
  endInput?: string,
): IstanbulDateRange {
  const startDate = startInput ? parseDateInput(startInput) : undefined;
  const endDate = endInput ? parseDateInput(endInput) : undefined;

  if (startInput && !startDate) throw new Error("Başlangıç tarihi YYYY-AA-GG biçiminde geçerli olmalıdır.");
  if (endInput && !endDate) throw new Error("Bitiş tarihi YYYY-AA-GG biçiminde geçerli olmalıdır.");

  return {
    start: startDate ? istanbulMidnightAsUtc(startDate) : undefined,
    // Exclusive upper bound includes every instant on the selected final day.
    endExclusive: endDate ? istanbulMidnightAsUtc(nextDate(endDate)) : undefined,
  };
}
