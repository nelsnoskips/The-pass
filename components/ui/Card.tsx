import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      className={clsx(
        "rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({
  label,
  title,
  children,
  className,
}: {
  label?: string;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-wrap items-end justify-between gap-2", className)}>
      <div>
        {label && <p className="micro-label text-champagne">{label}</p>}
        <h2 className="mt-0.5 text-[17px] font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}
