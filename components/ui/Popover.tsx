"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import clsx from "clsx";

/**
 * Minimal accessible popover: trigger button + floating panel. Closes on
 * outside click and Escape; the trigger reports expanded state to AT.
 */
export function Popover({
  trigger,
  children,
  align = "start",
  panelClassName,
  triggerClassName,
}: {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  panelClassName?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-slate/40",
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          className={clsx(
            "absolute z-40 mt-1.5 min-w-52 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-card-hover)]",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function PopoverItem({
  onClick,
  selected,
  children,
}: {
  onClick: () => void;
  selected?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
        selected
          ? "bg-cobalt-soft font-medium text-cobalt"
          : "text-ink hover:bg-canvas",
      )}
    >
      {children}
    </button>
  );
}
