"use client";

import { Download } from "lucide-react";
import { toCsv, type CsvValue } from "@/lib/csv";

/**
 * Client-side CSV export. Receives rows already scoped by the active global
 * filters (the server component builds them from the filtered query), so the
 * export always matches what the user sees.
 */
export function ExportCsvButton({
  headers,
  rows,
  filename,
  label = "Export CSV",
}: {
  headers: string[];
  rows: CsvValue[][];
  filename: string;
  label?: string;
}) {
  const onExport = () => {
    const blob = new Blob([toCsv(headers, rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={onExport}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-slate/40"
    >
      <Download size={14} aria-hidden />
      {label}
    </button>
  );
}
