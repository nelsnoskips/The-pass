/** Skeleton loaders — never a false $0 while data is loading. */

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="skeleton h-3 w-24" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton mt-3 h-4" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="skeleton h-4 w-40" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton h-8" />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading report data">
      <div className="skeleton h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
