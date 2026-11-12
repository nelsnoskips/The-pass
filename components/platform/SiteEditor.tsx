"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { MenuItem, SiteContent } from "@/lib/sites/content";
import { saveSite } from "@/lib/platform/site-actions";

/**
 * The website editor: the site's content as fields, never as markup.
 * Saving makes a new draft version; publishing points the live site at
 * it. Every save is kept, so nothing an owner does here is unrecoverable.
 */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item";
const uid = (base: string) => `${slug(base)}-${Math.random().toString(36).slice(2, 6)}`;
const dollars = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(cents % 100 ? 2 : 0));
const toCents = (v: string): number | null => {
  const t = v.trim().replace(/^\$/, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

/** Unsaved work is kept on this device until it's saved or discarded. */
const draftKey = (org: string) => `pf-site-draft:${org}`;
interface LocalDraft { base: string; at: number; content: SiteContent }
function readDraft(org: string): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(org));
    const d = raw ? (JSON.parse(raw) as LocalDraft) : null;
    return d && typeof d.base === "string" && d.content && typeof d.at === "number" ? d : null;
  } catch {
    return null;
  }
}
function writeDraft(org: string, d: LocalDraft | null) {
  try {
    if (d) window.localStorage.setItem(draftKey(org), JSON.stringify(d));
    else window.localStorage.removeItem(draftKey(org));
  } catch {
    // Private mode or storage full: the beforeunload and link guards still protect the work.
  }
}
const LEAVE = "You have unsaved changes to your website. Leave this page? (A copy stays on this device and comes back when you return.)";

export function SiteEditor({ org, initial, liveUrl, versionId, serviceHours, tz }: {
  org: string; initial: SiteContent; liveUrl: string;
  /** The version the editor opened, so a local draft knows what it was based on. */
  versionId: string;
  /** The restaurant's timezone, for the draft's time. */
  tz: string;
  /** Opening hours written from the service periods, for "Use my service hours". */
  serviceHours: { days: string; hours: string }[];
}) {
  const [c, setC] = useState<SiteContent>(initial);
  const [saved, setSaved] = useState<string>(JSON.stringify(initial));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = useMemo(() => JSON.stringify(c) !== saved, [c, saved]);

  const [restored, setRestored] = useState<{ at: number; older: LocalDraft | null } | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // In-app navigation (the sidebar, any link) doesn't fire beforeunload:
  // catch the click on window, before React (whose root is the document) and Next's router see it, and ask.
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;
      if (!window.confirm(LEAVE)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("click", guard, true);
    return () => window.removeEventListener("click", guard, true);
  }, [dirty]);

  // Bring back unsaved work from this device, once, after the first render.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const d = readDraft(org);
    if (!d || JSON.stringify(d.content) === JSON.stringify(initial)) { if (d) writeDraft(org, null); return; }
    if (d.base === versionId) { setC(d.content); setRestored({ at: d.at, older: null }); }
    else setRestored({ at: d.at, older: d });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave to this device while there are unsaved changes.
  useEffect(() => {
    if (!loaded.current || restored?.older) return;
    const t = setTimeout(() => writeDraft(org, dirty ? { base: versionId, at: Date.now(), content: c } : null), 500);
    return () => clearTimeout(t);
  }, [c, dirty, org, versionId, restored]);

  const set = <K extends keyof SiteContent>(k: K, v: SiteContent[K]) => { setC((p) => ({ ...p, [k]: v })); setDone(null); };
  const setItem = (mi: number, si: number, ii: number, patch: Partial<MenuItem>) =>
    set("menus", c.menus.map((m, a) => a !== mi ? m : { ...m, sections: m.sections.map((s, b) => b !== si ? s : { ...s, items: s.items.map((it, d) => d !== ii ? it : { ...it, ...patch }) }) }));

  const save = (publish: boolean) =>
    start(async () => {
      const bad = c.menus.flatMap((m) => m.sections.flatMap((s) => s.items.filter((i) => Number.isNaN(i.priceCents as number)).map((i) => i.name || "an item")));
      if (bad.length) { setErrors(bad.map((n) => `Check the price for ${n}.`)); return; }
      // A dish row left completely blank is an unfinished click, not content.
      const clean: SiteContent = {
        ...c,
        hours: c.hours.filter((h) => h.days.trim() || h.hours.trim()),
        menus: c.menus.map((m) => ({ ...m, sections: m.sections.map((sec) => ({
          ...sec, items: sec.items.filter((i) => i.name.trim() || i.description.trim() || i.priceCents !== null),
        })) })),
      };
      const r = await saveSite(org, clean, note, publish);
      setErrors(r.errors.map((e) => humanize(e, clean)));
      if (!r.errors.length) {
        setC(clean); setSaved(JSON.stringify(clean)); setNote(""); writeDraft(org, null); setRestored(null);
        setDone(publish ? "Published. It's live now." : "Draft saved. Preview it from the history, or publish when ready.");
        router.refresh();
      }
    });

  const when = (at: number) => new Date(at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz });
  const discard = () => { writeDraft(org, null); setRestored(null); setC(JSON.parse(saved) as SiteContent); };

  return (
    <div className="pf-body pf-site-editor" style={{ padding: 0, gap: 14 }}>
      {restored && !restored.older && (
        <div className="pf-msg ok" role="status" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span>Brought back your unsaved changes from {when(restored.at)} on this device.</span>
          <button type="button" className="pf-btn small quiet" onClick={discard}>Discard them</button>
        </div>
      )}
      {restored?.older && (
        <div className="pf-msg" role="status" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <span>You have unsaved changes from {when(restored.at)} on this device, made before the website last changed.</span>
          <button type="button" className="pf-btn small" onClick={() => { setC(restored.older!.content); setRestored({ at: restored.at, older: null }); }}>Bring them back</button>
          <button type="button" className="pf-btn small quiet" onClick={discard}>Discard</button>
        </div>
      )}
      <Panel title="Notice bar" hint="A line across the top of every page: holiday hours, a new menu, an event. Leave empty to hide it.">
        <input className="pf-input" value={c.announcement} maxLength={240} placeholder="Closed Thanksgiving Day — open again Friday at 5"
          onChange={(e) => set("announcement", e.target.value)} />
      </Panel>

      <Panel title="Hours" hint="What the website says about when you're open. Write it yourself, or fill it from the service hours guests book against.">
        {serviceHours.length > 0 && (
          <button type="button" className="pf-btn small" style={{ justifySelf: "start" }}
            onClick={() => {
              const any = c.hours.some((h) => h.days.trim() || h.hours.trim());
              if (any && !window.confirm("Replace the hours rows with your service hours? You can still edit them after.")) return;
              set("hours", serviceHours.map((h) => ({ ...h })));
            }}>
            Use my service hours
          </button>
        )}
        {c.hours.map((h, i) => (
          <div key={i} className="pf-row2 pf-hoursrow">
            <input className="pf-input" value={h.days} aria-label="Days" onChange={(e) => set("hours", c.hours.map((x, j) => j === i ? { ...x, days: e.target.value } : x))} />
            <input className="pf-input" value={h.hours} aria-label="Hours" onChange={(e) => set("hours", c.hours.map((x, j) => j === i ? { ...x, hours: e.target.value } : x))} />
            <button type="button" className="pf-btn quiet small" aria-label={`Remove ${h.days}`} onClick={() => set("hours", c.hours.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" className="pf-btn small" onClick={() => set("hours", [...c.hours, { days: "", hours: "" }])}>Add a row</button>
      </Panel>

      <Panel title="Menu" hint="Prices in dollars; leave a price empty for market price. Tags like vegetarian or gluten-free show under the dish.">
        {c.menus.map((m, mi) => (
          <details key={m.id} open={mi === 0} className="pf-panel" style={{ background: "oklch(0 0 0 / 0.18)" }}>
            <summary style={{ padding: "12px 14px", cursor: "pointer", fontWeight: 600 }}>{m.name || "Untitled menu"}</summary>
            <div className="pf-body">
              <Field label="Menu name"><input className="pf-input" value={m.name} onChange={(e) => set("menus", c.menus.map((x, a) => a === mi ? { ...x, name: e.target.value } : x))} /></Field>
              {m.sections.map((s, si) => (
                <div key={s.id} style={{ display: "grid", gap: 10, borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
                  <div className="pf-row2">
                    <Field label="Section"><input className="pf-input" value={s.name} onChange={(e) => set("menus", c.menus.map((x, a) => a !== mi ? x : { ...x, sections: x.sections.map((y, b) => b === si ? { ...y, name: e.target.value } : y) }))} /></Field>
                    <Field label="Note"><input className="pf-input" value={s.note} onChange={(e) => set("menus", c.menus.map((x, a) => a !== mi ? x : { ...x, sections: x.sections.map((y, b) => b === si ? { ...y, note: e.target.value } : y) }))} /></Field>
                  </div>
                  {s.items.map((it, ii) => (
                    <div key={it.id} className="pf-dish">
                      <input className="pf-input" value={it.name} placeholder="Dish" aria-label="Dish" onChange={(e) => setItem(mi, si, ii, { name: e.target.value })} />
                      <PriceInput cents={it.priceCents} onChange={(v) => setItem(mi, si, ii, { priceCents: v })} />
                      <input className="pf-input" value={it.description} placeholder="Description" aria-label="Description" onChange={(e) => setItem(mi, si, ii, { description: e.target.value })} />
                      <button type="button" className="pf-btn quiet small" aria-label={`Remove ${it.name}`}
                        onClick={() => set("menus", c.menus.map((x, a) => a !== mi ? x : { ...x, sections: x.sections.map((y, b) => b !== si ? y : { ...y, items: y.items.filter((_, d) => d !== ii) }) }))}>Remove</button>
                      <input className="pf-input pf-dish-tags" value={it.tags.join(", ")} placeholder="Tags, comma separated" aria-label="Tags"
                        onChange={(e) => setItem(mi, si, ii, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8) })} />
                    </div>
                  ))}
                  <button type="button" className="pf-btn small" style={{ justifySelf: "start" }}
                    onClick={() => set("menus", c.menus.map((x, a) => a !== mi ? x : { ...x, sections: x.sections.map((y, b) => b !== si ? y : { ...y, items: [...y.items, { id: uid("dish"), name: "", description: "", priceCents: null, tags: [] }] }) }))}>
                    Add a dish to {s.name || "this section"}
                  </button>
                </div>
              ))}
              <button type="button" className="pf-btn small" style={{ justifySelf: "start" }}
                onClick={() => set("menus", c.menus.map((x, a) => a !== mi ? x : { ...x, sections: [...x.sections, { id: uid("section"), name: "New section", note: "", items: [] }] }))}>
                Add a section
              </button>
            </div>
          </details>
        ))}
      </Panel>

      <Panel title="Front page">
        <Field label="Headline"><input className="pf-input" value={c.hero.headline} maxLength={160} onChange={(e) => set("hero", { ...c.hero, headline: e.target.value })} /></Field>
        <Field label="Under the headline"><textarea className="pf-input" rows={2} value={c.hero.sub} maxLength={400} onChange={(e) => set("hero", { ...c.hero, sub: e.target.value })} /></Field>
        <Field label="Photo link"><input className="pf-input" value={c.hero.image ?? ""} placeholder="https://…" onChange={(e) => set("hero", { ...c.hero, image: e.target.value || null })} /></Field>
        <div className="pf-row2">
          <Field label="Story heading"><input className="pf-input" value={c.story.heading} onChange={(e) => set("story", { ...c.story, heading: e.target.value })} /></Field>
          <Field label="Tagline"><input className="pf-input" value={c.brand.tagline} onChange={(e) => set("brand", { ...c.brand, tagline: e.target.value })} /></Field>
        </div>
        <Field label="Story"><textarea className="pf-input" rows={6} value={c.story.body} maxLength={2000} onChange={(e) => set("story", { ...c.story, body: e.target.value })} /></Field>
      </Panel>

      <Panel title="Colours" hint="Page, text, and buttons. The button text switches between black and white to stay readable.">
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {(["paper", "ink", "accent"] as const).map((k) => (
            <label key={k} className="pf-field" style={{ minWidth: 120 }}>
              <span className="pf-flabel">{{ paper: "Page", ink: "Text", accent: "Buttons" }[k]}</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={c.theme[k]} onChange={(e) => set("theme", { ...c.theme, [k]: e.target.value })}
                  style={{ width: 42, height: 42, border: "1px solid var(--rule-strong)", borderRadius: 10, background: "none", padding: 2 }} />
                <span className="mono" style={{ fontSize: 13 }}>{c.theme[k]}</span>
              </span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Contact">
        <div className="pf-row2">
          <Field label="Phone"><input className="pf-input" value={c.contact.phone} onChange={(e) => set("contact", { ...c.contact, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="pf-input" value={c.contact.email} onChange={(e) => set("contact", { ...c.contact, email: e.target.value })} /></Field>
        </div>
        <Field label="Address"><input className="pf-input" value={c.contact.address} onChange={(e) => set("contact", { ...c.contact, address: e.target.value })} /></Field>
      </Panel>

      <div className="pf-panel" style={{ position: "sticky", bottom: 12, zIndex: 5, padding: 14, display: "grid", gap: 10, backdropFilter: "blur(14px)" }}>
        {errors.length > 0 && (
          <div className="pf-msg err" role="alert">
            <b>Not saved.</b> {errors.slice(0, 5).join(" · ")}
          </div>
        )}
        {done && <p className="pf-msg ok" role="status">{done}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input className="pf-input" style={{ flex: "1 1 220px" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed? (for the history)" maxLength={200} />
          <button type="button" className="pf-btn" disabled={!dirty || pending} onClick={() => save(false)}>Save draft</button>
          <button type="button" className="pf-btn primary" disabled={!dirty || pending} onClick={() => save(true)}>{pending ? "Saving…" : "Save & publish"}</button>
          <a className="pf-btn quiet" href={liveUrl} target="_blank" rel="noreferrer">View live site ↗</a>
        </div>
        <p className="pf-sub" style={{ margin: 0 }}>{dirty ? "Unsaved changes." : "Everything is saved."}</p>
      </div>
    </div>
  );
}

/** "menus[0].sections[1].items[5].name is required" -> "Dinner › From the Fire › dish 6: name is required" */
function humanize(error: string, c: SiteContent): string {
  const m = /^menus\[(\d+)\](?:\.sections\[(\d+)\])?(?:\.items\[(\d+)\])?\.?(\w+)?\s(.*)$/.exec(error);
  if (m) {
    const menu = c.menus[Number(m[1])];
    const sec = m[2] !== undefined ? menu?.sections[Number(m[2])] : undefined;
    const item = m[3] !== undefined ? sec?.items[Number(m[3])] : undefined;
    const where = [menu?.name || "Menu", sec?.name, item ? item.name || `dish ${Number(m[3]) + 1}` : undefined].filter(Boolean).join(" › ");
    const field = { name: "needs a name", priceCents: "price must be a number", id: "has a duplicate" }[m[4] ?? ""] ?? `${m[4] ?? ""} ${m[5]}`.trim();
    return `${where}: ${field}`;
  }
  const labels: Record<string, string> = {
    "brand.name": "Restaurant name", "hero.headline": "Headline", "hero.image": "Photo link", "theme.paper": "Page colour",
    "theme.ink": "Text colour", "theme.accent": "Button colour", "contact.mapUrl": "Map link", "announcement": "Notice bar",
  };
  for (const [k, v] of Object.entries(labels)) if (error.startsWith(k)) return error.replace(k, v);
  return error.replace(/^hours\[(\d+)\]\.(days|hours)/, (_, i, f) => `Hours row ${Number(i) + 1} ${f === "days" ? "days" : "times"}`);
}

function PriceInput({ cents, onChange }: { cents: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(dollars(cents));
  return (
    <input className="pf-input mono" inputMode="decimal" value={text} placeholder="MP" aria-label="Price"
      onChange={(e) => { setText(e.target.value); onChange(toCents(e.target.value)); }} />
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="pf-panel">
      <h2>{title}</h2>
      <div className="pf-body">
        {hint && <p className="pf-sub" style={{ margin: 0 }}>{hint}</p>}
        {children}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="pf-field"><span className="pf-flabel">{label}</span>{children}</label>;
}
