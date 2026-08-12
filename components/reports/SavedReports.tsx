"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bookmark, Trash2 } from "lucide-react";
import { useStoredState } from "@/lib/useStoredState";

interface SavedReport {
  id: string;
  name: string;
  query: string;
  savedAt: string;
}

/**
 * Saved reports: the current filter combination (locations, platform, date
 * logic, comparison) is captured from the URL and restored on click.
 * Stored per user in localStorage; a `saved_reports` table in production.
 */
export function SavedReports({ userId }: { userId: string }) {
  const search = useSearchParams().toString();
  const [reports, persist] = useStoredState<SavedReport[]>(
    `pass-saved-reports:${userId}`,
    [],
  );

  const saveCurrent = () => {
    const name = window.prompt("Name this report view:");
    if (!name) return;
    persist((prev) => [
      ...prev,
      {
        id: `sr_${Date.now()}`,
        name,
        query: search,
        savedAt: new Date().toISOString().slice(0, 10),
      },
    ]);
  };

  return (
    <div>
      <button
        type="button"
        onClick={saveCurrent}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink hover:border-slate/40"
      >
        <Bookmark size={14} aria-hidden />
        Save current filters as a report
      </button>
      {reports.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {reports.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px]">
              <Link
                href={r.query ? `/?${r.query}` : "/"}
                className="min-w-0 flex-1 truncate font-medium text-cobalt hover:underline"
              >
                {r.name}
              </Link>
              <span className="tnum text-[11.5px] text-slate">saved {r.savedAt}</span>
              <button
                type="button"
                onClick={() => persist(reports.filter((x) => x.id !== r.id))}
                aria-label={`Delete saved report ${r.name}`}
                className="rounded p-1 text-slate hover:text-error"
              >
                <Trash2 size={13} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
