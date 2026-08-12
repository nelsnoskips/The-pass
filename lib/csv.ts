/**
 * CSV building. Values are escaped per RFC 4180; metrics that do not exist
 * are exported as empty cells, never fabricated zeros.
 */

export type CsvValue = string | number | null;

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const escape = (v: CsvValue): string => {
    if (v === null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}

export function csvFilename(base: string, start: string, end: string): string {
  return `${base}_${start}_${end}.csv`;
}
