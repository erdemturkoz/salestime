import { Workbook, type Worksheet } from "@node-projects/excelforge";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_WORKSHEETS = 2;
const MAX_ROWS = 2_001;
const MAX_COLUMNS = 32;
const MAX_CELLS = 64_000;
const MAX_TEXT_BYTES = 1_000_000;
const MAX_CELL_TEXT_LENGTH = 4_000;
const MAX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
type Upload = Pick<File, "name" | "size" | "arrayBuffer">;

function invalid(message: string): never { throw new Error(`Güvenli Excel kontrolü: ${message}`); }
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  invalid("yalnızca düz metin ve sayısal hücreler kabul edilir.");
}

function inspectZip(buffer: ArrayBuffer): void {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65_557); index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) { eocd = index; break; }
  }
  if (eocd < 0) invalid("dosya geçerli bir .xlsx/OOXML arşivi değil.");
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  if (!count || count > 500 || offset >= bytes.length) invalid("arşivde kabul edilemeyecek sayıda dosya var.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const paths: string[] = [];
  let uncompressedBytes = 0;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) invalid("dosya geçerli bir .xlsx/OOXML arşivi değil.");
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length || !nameLength) invalid("dosya geçerli bir .xlsx/OOXML arşivi değil.");
    paths.push(decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength)));
    uncompressedBytes += size;
    offset = end;
  }
  if (!paths.includes("[Content_Types].xml") || !paths.includes("xl/workbook.xml")) invalid("dosya geçerli bir Excel çalışma kitabı değil.");
  if (paths.some((path) => /(^|\/)(vbaProject\.bin|externalLinks?)(\/|$)|\.bin$/i.test(path))) invalid("makro veya dış bağlantı içeren çalışma kitapları kabul edilmez.");
  if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) invalid("açıldığında izin verilen boyutu aşan dosya kabul edilmez.");
}

function inspectWorksheet(
  worksheet: Worksheet,
  expectedHeaders: readonly string[],
  validateHeaders: boolean,
  headerMismatchMessage?: string,
): void {
  if ((worksheet.options as any)?.state && (worksheet.options as any).state !== "visible") invalid("gizli sayfa içeren çalışma kitapları kabul edilmez.");
  const cells = worksheet.readAllCells();
  const maxRow = cells.reduce((max, entry) => Math.max(max, entry.row), 0);
  const maxColumn = cells.reduce((max, entry) => Math.max(max, entry.col), 0);
  if (maxRow > MAX_ROWS || maxColumn > MAX_COLUMNS || cells.length > MAX_CELLS) invalid("çalışma kitabı satır, sütun veya hücre sınırını aşıyor.");
  if (validateHeaders) {
    const headers = expectedHeaders.map((_, index) => cellText(worksheet.getCell(1, index + 1).value));
    if (maxColumn !== expectedHeaders.length || headers.some((header, index) => header !== expectedHeaders[index])) {
      invalid(headerMismatchMessage || "sütun başlıkları beklenen şablonla birebir eşleşmiyor.");
    }
  }
  let textBytes = 0;
  for (const { cell } of cells) {
    if (cell.formula || cell.arrayFormula || cell.hyperlink || cell.richText) invalid("formül, bağlantı veya nesne hücresi içeremez.");
    const value = cellText(cell.value);
    if (value.startsWith("#")) invalid("hata hücresi içeremez.");
    if (value.length > MAX_CELL_TEXT_LENGTH) invalid("bir hücre izin verilen metin uzunluğunu aşıyor.");
    textBytes += new TextEncoder().encode(value).byteLength;
    if (textBytes > MAX_TEXT_BYTES) invalid("toplam hücre metni sınırını aşıyor.");
  }
}

export async function loadSafeXlsx(
  file: Upload,
  expectedHeaders: readonly string[],
  options: { headerMismatchMessage?: string } = {},
): Promise<Workbook> {
  if (!file.name.toLocaleLowerCase("tr").endsWith(".xlsx")) invalid("yalnızca .xlsx dosyaları kabul edilir; eski .xls biçimi desteklenmez.");
  if (!Number.isFinite(file.size) || file.size < 4 || file.size > MAX_FILE_BYTES) invalid("dosya boş veya en fazla 5 MiB sınırını aşıyor.");
  const rawBuffer = await file.arrayBuffer();
  const buffer = rawBuffer instanceof ArrayBuffer
    ? rawBuffer
    : (rawBuffer as unknown as Uint8Array).buffer.slice(
        (rawBuffer as unknown as Uint8Array).byteOffset,
        (rawBuffer as unknown as Uint8Array).byteOffset + (rawBuffer as unknown as Uint8Array).byteLength,
      ) as ArrayBuffer;
  const signature = new Uint8Array(buffer.slice(0, 4));
  if (signature[0] !== 0x50 || signature[1] !== 0x4b || (signature[2] !== 0x03 && signature[2] !== 0x05 && signature[2] !== 0x07)) invalid("dosya bir .xlsx/ZIP arşivi değil.");
  inspectZip(buffer);
  let workbook: Workbook;
  try { workbook = await Workbook.fromBytes(new Uint8Array(buffer)); }
  catch { invalid("çalışma kitabı güvenli biçimde okunamadı."); }
  const sheetNames = workbook!.getSheetNames();
  if (!sheetNames.length || sheetNames.length > MAX_WORKSHEETS) invalid("çalışma kitabı sayfa sınırını aşıyor.");
  if ((workbook!.properties as any)?.workbookProtection || (workbook!.properties as any)?.fileSharing) invalid("korumalı çalışma kitabı kabul edilmez.");
  if (sheetNames.length === 2 && sheetNames[1] !== "Kullanım Kılavuzu") invalid("beklenmeyen ek çalışma sayfası içeremez.");
  sheetNames.forEach((name, index) =>
    inspectWorksheet(workbook!.getSheet(name)!, expectedHeaders, index === 0, options.headerMismatchMessage),
  );
  return workbook!;
}

export function safeSpreadsheetText(value: unknown): string {
  const text = String(value ?? "");
  return /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
}

export function worksheetRowsAsRecords(worksheet: Worksheet, headers: readonly string[]): Array<Record<string, string>> {
  const maxRow = worksheet.readAllCells().reduce((max, entry) => Math.max(max, entry.row), 0);
  const records: Array<Record<string, string>> = [];
  for (let rowNumber = 2; rowNumber <= maxRow; rowNumber += 1) {
    const values = headers.map((_, index) => cellText(worksheet.getCell(rowNumber, index + 1).value));
    if (!values.every((value) => value === "")) records.push(Object.fromEntries(headers.map((header, index) => [header, values[index]])));
  }
  return records;
}