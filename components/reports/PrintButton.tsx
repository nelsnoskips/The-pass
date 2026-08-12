"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-cobalt px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-cobalt/90"
    >
      <Printer size={14} aria-hidden />
      {label}
    </button>
  );
}
