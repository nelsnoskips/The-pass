"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import clsx from "clsx";
import { Drawer } from "@/components/ui/Drawer";
import { Badge, statusTone } from "@/components/ui/Badge";
import { addDays, eachDay, formatRangeLabel, parseISODate, toISODate } from "@/lib/dates";
import { formatCents, formatCount, formatDate } from "@/lib/format";
import type { CalendarItem, CalendarItemStatus, CalendarItemType, Location } from "@/lib/types";

const TYPE_LABELS: Record<CalendarItemType, string> = {
  promotion: "Promotion",
  holiday: "Holiday",
  event: "Event",
  new_menu_item: "New menu item",
  email_sms: "Email / SMS",
  organic_social: "Organic social",
  google_campaign: "Google campaign",
  meta_campaign: "Meta campaign",
  creative_due: "Creative due",
  internal_task: "Internal task",
};

const STATUS_LABELS: Record<CalendarItemStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  in_production: "In production",
  scheduled: "Scheduled",
  live: "Live",
  completed: "Completed",
  canceled: "Canceled",
};

const TYPE_COLORS: Record<CalendarItemType, string> = {
  promotion: "bg-cobalt text-white",
  holiday: "bg-champagne text-ink",
  event: "bg-emerald text-white",
  new_menu_item: "bg-champagne-soft text-ink",
  email_sms: "bg-cobalt-soft text-cobalt",
  organic_social: "bg-emerald-soft text-emerald",
  google_campaign: "bg-cobalt text-white",
  meta_campaign: "bg-ink text-white",
  creative_due: "bg-warning-soft text-warning",
  internal_task: "bg-canvas text-slate",
};

export interface LinkedPerformance {
  campaignName: string;
  spendCents: number;
  conversions: number;
}

interface Props {
  items: CalendarItem[];
  locations: Location[];
  canEdit: boolean;
  today: string;
  linkedPerformance: Record<string, LinkedPerformance[]>;
}

type View = "month" | "week" | "list";

export function CalendarView({ items: initialItems, locations, canEdit, today, linkedPerformance }: Props) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(today);
  const [items, setItems] = useState(initialItems);
  const [openItem, setOpenItem] = useState<CalendarItem | null>(null);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<CalendarItemType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<CalendarItemStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (typeFilter === "all" || item.type === typeFilter) &&
          (statusFilter === "all" || item.status === statusFilter) &&
          (locationFilter === "all" || item.locationIds.includes(locationFilter)),
      ),
    [items, typeFilter, statusFilter, locationFilter],
  );

  const monthStart = useMemo(() => {
    const d = parseISODate(cursor);
    return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  }, [cursor]);

  const gridDays = useMemo(() => {
    if (view === "week") {
      const d = parseISODate(cursor);
      const dow = (d.getUTCDay() + 6) % 7;
      const start = addDays(cursor, -dow);
      return eachDay({ start, end: addDays(start, 6) });
    }
    const first = parseISODate(monthStart);
    const lead = (first.getUTCDay() + 6) % 7;
    const start = addDays(monthStart, -lead);
    return eachDay({ start, end: addDays(start, 41) });
  }, [view, cursor, monthStart]);

  const monthLabel = parseISODate(cursor).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const itemsOn = (date: string) =>
    filtered.filter((item) => item.startDate <= date && item.endDate >= date);

  const step = (dir: -1 | 1) => {
    if (view === "week") setCursor(addDays(cursor, dir * 7));
    else {
      const d = parseISODate(cursor);
      setCursor(
        toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + dir, 1))),
      );
    }
  };

  const updateItemDates = (item: CalendarItem, start: string, end: string) => {
    if (item.status === "live") {
      const ok = window.confirm(
        "This promotion is live. Moving it changes the plan only — The Pass never modifies the external ad platform automatically. Continue?",
      );
      if (!ok) return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, startDate: start, endDate: end } : i)),
    );
    setOpenItem(null);
  };

  const createItem = (form: FormData) => {
    const title = String(form.get("title") ?? "").trim();
    if (!title || !createDate) return;
    const item: CalendarItem = {
      id: `cal_local_${Date.now()}`,
      brandId: "brand_santorini",
      locationIds:
        String(form.get("location")) === "all"
          ? locations.map((l) => l.id)
          : [String(form.get("location"))],
      title,
      startDate: createDate,
      endDate: String(form.get("end") ?? createDate) || createDate,
      timezone: locations[0]?.timezone ?? "America/New_York",
      type: (form.get("type") as CalendarItemType) ?? "promotion",
      status: "planned",
      channels: [],
      details: String(form.get("details") ?? ""),
      budgetCents: null,
      owner: "You",
      linkedCampaignIds: [],
    };
    setItems((prev) => [...prev, item]);
    setCreateDate(null);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} aria-label="Previous period" className="rounded-lg border border-line bg-surface p-1.5 hover:border-slate/40">
            <ChevronLeft size={15} aria-hidden />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next period" className="rounded-lg border border-line bg-surface p-1.5 hover:border-slate/40">
            <ChevronRight size={15} aria-hidden />
          </button>
          <button type="button" onClick={() => setCursor(today)} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px] font-medium hover:border-slate/40">
            Today
          </button>
        </div>
        <h2 className="text-[15px] font-semibold text-ink">{monthLabel}</h2>
        <div className="ml-auto flex items-center gap-2">
          <div role="group" aria-label="Calendar view" className="flex rounded-lg border border-line bg-surface p-0.5">
            {(["month", "week", "list"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={clsx(
                  "rounded-md px-3 py-1 text-[12.5px] font-medium capitalize",
                  view === v ? "bg-ink text-white" : "text-slate hover:text-ink",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setCreateDate(today)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cobalt px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-cobalt/90"
            >
              <Plus size={14} aria-hidden />
              New item
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[12.5px]">
        <select aria-label="Filter by location" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1.5">
          <option value="all">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select aria-label="Filter by type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as CalendarItemType | "all")} className="rounded-lg border border-line bg-surface px-2 py-1.5">
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CalendarItemStatus | "all")} className="rounded-lg border border-line bg-surface px-2 py-1.5">
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {view !== "list" ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-line bg-canvas/60">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="micro-label px-2 py-2 text-slate">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {gridDays.map((date) => {
                const inMonth = view === "week" || date.slice(0, 7) === monthStart.slice(0, 7);
                const dayItems = itemsOn(date);
                return (
                  <div
                    key={date}
                    className={clsx(
                      "min-h-24 border-b border-r border-line/60 p-1.5 align-top",
                      !inMonth && "bg-canvas/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => canEdit && setCreateDate(date)}
                      className={clsx(
                        "tnum flex h-6 w-6 items-center justify-center rounded-full text-[11.5px]",
                        date === today ? "bg-cobalt font-bold text-white" : "text-slate",
                        canEdit && "hover:bg-canvas",
                      )}
                      aria-label={
                        canEdit ? `Create item on ${formatDate(date)}` : formatDate(date)
                      }
                    >
                      {Number(date.slice(8))}
                    </button>
                    <div className="mt-1 space-y-1">
                      {dayItems.slice(0, 3).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setOpenItem(item)}
                          className={clsx(
                            "block w-full truncate rounded px-1.5 py-0.5 text-left text-[10.5px] font-medium",
                            TYPE_COLORS[item.type],
                          )}
                          title={item.title}
                        >
                          {item.title}
                        </button>
                      ))}
                      {dayItems.length > 3 && (
                        <p className="px-1 text-[10px] text-slate">+{dayItems.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {[...filtered]
            .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
            .map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenItem(item)}
                  className="lift flex w-full flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-left"
                >
                  <span className={clsx("h-2.5 w-2.5 rounded-full", TYPE_COLORS[item.type].split(" ")[0])} aria-hidden />
                  <span className="min-w-40 flex-1 text-[13.5px] font-semibold text-ink">{item.title}</span>
                  <span className="tnum text-[12.5px] text-slate">
                    {formatRangeLabel({ start: item.startDate, end: item.endDate })}
                  </span>
                  <Badge tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                  <span className="text-[12px] text-slate">{TYPE_LABELS[item.type]}</span>
                </button>
              </li>
            ))}
          {filtered.length === 0 && (
            <li className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-[13px] text-slate">
              No calendar items match the current filters.
            </li>
          )}
        </ul>
      )}

      <Drawer open={openItem !== null} onClose={() => setOpenItem(null)} title={openItem?.title ?? ""}>
        {openItem && (
          <ItemDetail
            item={openItem}
            locations={locations}
            canEdit={canEdit}
            performance={linkedPerformance[openItem.id] ?? []}
            onMove={updateItemDates}
          />
        )}
      </Drawer>

      <Drawer open={createDate !== null} onClose={() => setCreateDate(null)} title={`New item — ${createDate ? formatDate(createDate) : ""}`}>
        <form action={createItem} className="space-y-3 text-[13px]">
          <label className="block">
            <span className="font-medium text-ink">Title</span>
            <input name="title" required className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <label className="block">
            <span className="font-medium text-ink">Type</span>
            <select name="type" className="mt-1 w-full rounded-lg border border-line px-3 py-2">
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-medium text-ink">Location</span>
            <select name="location" className="mt-1 w-full rounded-lg border border-line px-3 py-2">
              <option value="all">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-medium text-ink">End date</span>
            <input name="end" type="date" defaultValue={createDate ?? undefined} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <label className="block">
            <span className="font-medium text-ink">Details</span>
            <textarea name="details" rows={3} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
          </label>
          <button type="submit" className="w-full rounded-lg bg-cobalt px-3 py-2 font-semibold text-white hover:bg-cobalt/90">
            Create planned item
          </button>
          <p className="text-[11.5px] text-slate">
            Demo mode: new items are kept for this session only. The calendar
            plans marketing — it never publishes campaigns to ad platforms.
          </p>
        </form>
      </Drawer>
    </div>
  );
}

function ItemDetail({
  item,
  locations,
  canEdit,
  performance,
  onMove,
}: {
  item: CalendarItem;
  locations: Location[];
  canEdit: boolean;
  performance: LinkedPerformance[];
  onMove: (item: CalendarItem, start: string, end: string) => void;
}) {
  const [start, setStart] = useState(item.startDate);
  const [end, setEnd] = useState(item.endDate);
  const locationNames = item.locationIds
    .map((id) => locations.find((l) => l.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4 text-[13px]">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Badge>
        <Badge tone="slate">{TYPE_LABELS[item.type]}</Badge>
      </div>
      <dl className="space-y-2.5">
        {[
          ["Dates", `${formatDate(item.startDate)} → ${formatDate(item.endDate)} (${item.timezone})`],
          ["Locations", locationNames || "—"],
          ["Owner", item.owner],
          ["Channels", item.channels.join(", ") || "—"],
          ["Budget", item.budgetCents !== null ? formatCents(item.budgetCents) : "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11.5px] font-medium uppercase tracking-wide text-slate">{label}</dt>
            <dd className="mt-0.5 text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="rounded-lg bg-canvas px-3 py-2.5 leading-relaxed text-ink">{item.details}</p>
      {item.notes && <p className="text-slate">{item.notes}</p>}

      {performance.length > 0 && (
        <div>
          <p className="micro-label mb-2 text-champagne">Linked campaign performance</p>
          <ul className="space-y-1.5">
            {performance.map((p) => (
              <li key={p.campaignName} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                <span className="min-w-0 truncate text-slate" title={p.campaignName}>{p.campaignName}</span>
                <span className="tnum shrink-0 font-medium text-ink">
                  {formatCents(p.spendCents)} · {formatCount(p.conversions)} conv.
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11.5px] text-slate">
            Performance during the item&apos;s dates, as reported by each platform.
          </p>
        </div>
      )}

      {canEdit && (
        <div className="border-t border-line pt-4">
          <p className="micro-label mb-2 text-slate">Move / resize</p>
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">Start date</span>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-lg border border-line px-2 py-1.5" />
            </label>
            <label className="flex-1">
              <span className="sr-only">End date</span>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-lg border border-line px-2 py-1.5" />
            </label>
            <button
              type="button"
              disabled={start > end}
              onClick={() => onMove(item, start, end)}
              className="rounded-lg bg-ink px-3 py-1.5 font-semibold text-white disabled:opacity-40"
            >
              Apply
            </button>
          </div>
          {item.status === "live" && (
            <p className="mt-2 text-[11.5px] text-warning">
              This item is live — moving it updates the plan only and never
              modifies the external ad platform.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
