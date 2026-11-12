"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { AppIcon } from "@/components/app/AppIcon";
import { PREVIEW_MESSAGE, PREVIEW_READY } from "@/components/app/AppContext";
import { initialsOf, LIMITS, parseAppConfig, sameConfig, TILES, type AppConfig, type AppField, type TileId } from "@/lib/app/config";
import { saveAppAction } from "@/lib/platform/app-actions";
import { networkError } from "./safe-call";

const LEAVE = "You have unsaved changes to your app. Leave this page?";

/**
 * The app builder: the app's settings on the left, the real app on a
 * phone on the right. The phone shows the draft as you type (the
 * builder posts each edit into the preview frame); Save draft keeps it,
 * Publish puts it on guests' phones.
 */
export function AppBuilder({ org, slug, initial, published, tiles, siteAnnouncement, siteColours }: {
  org: string;
  slug: string;
  initial: AppConfig;
  published: AppConfig | null;
  /** Whether each button can show in the app, and why not. */
  tiles: Record<TileId, { available: boolean; why: string | null }>;
  siteAnnouncement: string;
  siteColours: { accent: string; background: string };
}) {
  const [c, setC] = useState<AppConfig>(initial);
  const [saved, setSaved] = useState<AppConfig>(initial);
  const [live, setLive] = useState<AppConfig | null>(published);
  const [serverErrors, setServerErrors] = useState<{ field: AppField; message: string }[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [moved, setMoved] = useState("");
  const [pending, start] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);
  const router = useRouter();

  const check = useMemo(() => parseAppConfig(c, { adjust: true }), [c]);
  const errors = check.ok ? serverErrors : check.errors;
  const errorFor = (f: AppField) => errors.find((e) => e.field === f)?.message;
  const dirty = !sameConfig(c, saved);
  const unpublished = !sameConfig(check.ok ? check.config : c, live);

  // Guard both a reload/close and in-app links (the sidebar) while there are unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const guard = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;
      if (!window.confirm(LEAVE)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("click", guard, true);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("click", guard, true); };
  }, [dirty]);

  // The preview follows every edit that would save.
  const send = useRef<() => void>(() => {});
  useEffect(() => {
    send.current = () => {
      if (check.ok) frame.current?.contentWindow?.postMessage({ type: PREVIEW_MESSAGE, config: check.config }, window.location.origin);
    };
    const t = setTimeout(() => send.current(), 120);
    return () => clearTimeout(t);
  }, [check]);
  useEffect(() => {
    const onReady = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && (e.data as { type?: string })?.type === PREVIEW_READY) send.current();
    };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, []);

  const set = <K extends keyof AppConfig>(k: K, v: AppConfig[K]) => { setC((p) => ({ ...p, [k]: v })); setDone(null); setServerErrors([]); };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= c.tiles.length) return;
    const next = [...c.tiles];
    [next[i], next[j]] = [next[j], next[i]];
    set("tiles", next);
    const id = next[j].id;
    setMoved(`${TILES[id].label} moved to position ${j + 1} of ${next.length}.`);
    // Keep focus on the button that moved, or its partner once it reaches an end.
    requestAnimationFrame(() => {
      const same = document.getElementById(`tile-${id}-${dir < 0 ? "up" : "down"}`) as HTMLButtonElement | null;
      const other = document.getElementById(`tile-${id}-${dir < 0 ? "down" : "up"}`) as HTMLButtonElement | null;
      (same && !same.disabled ? same : other)?.focus();
    });
  };

  const save = (publish: boolean) => {
    if (!check.ok) { setDone(null); return; }
    start(async () => {
      try {
        const r = await saveAppAction(org, c, publish);
        setServerErrors(r.errors);
        if (r.errors.length || !r.config) return;
        setC(r.config); setSaved(r.config); setNotes(r.notes);
        if (r.published) setLive(r.config);
        setDone(publish ? "Published. Guests get it the next time they open the app." : "Draft saved. Guests won't see it until you publish.");
        router.refresh();
      } catch (err) {
        if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
        setServerErrors([{ field: "name", message: networkError() }]);
      }
    });
  };

  const field = (f: AppField) => ({ "aria-invalid": errorFor(f) ? true : undefined, "aria-describedby": errorFor(f) ? `app-${f}-err` : undefined });
  const counter = (v: string, max: number) => <span className={`pf-count${v.length > max ? " over" : ""}`}>{v.length}/{max}</span>;
  const pendingNote = check.ok && check.notes.length ? check.notes : [];

  return (
    <div className="pf-appb">
      <div className="pf-appb-form">
        <Panel title="Name and welcome">
          <Field label="App name" f="name" error={errorFor("name")} extra={counter(c.name, LIMITS.name)}>
            <input id="app-name" className="pf-input" value={c.name} onChange={(e) => set("name", e.target.value)} {...field("name")} />
          </Field>
          <Field label="Name under the icon" hint="Phones cut long names short on the home screen." f="shortName" error={errorFor("shortName")} extra={counter(c.shortName, LIMITS.shortName)}>
            <input id="app-shortName" className="pf-input" value={c.shortName} onChange={(e) => set("shortName", e.target.value)} {...field("shortName")} />
          </Field>
          <Field label="Welcome line" f="welcome" error={errorFor("welcome")} extra={counter(c.welcome, LIMITS.welcome)}>
            <input id="app-welcome" className="pf-input" value={c.welcome} placeholder="Greek coastal cooking, open late." onChange={(e) => set("welcome", e.target.value)} {...field("welcome")} />
          </Field>
          <Field label="Announcement" hint="A line across the top of the app's home. Leave empty to hide it." f="announcement" error={errorFor("announcement")} extra={counter(c.announcement, LIMITS.announcement)}>
            <input id="app-announcement" className="pf-input" value={c.announcement} placeholder="Closed Thanksgiving Day — open again Friday at 5" onChange={(e) => set("announcement", e.target.value)} {...field("announcement")} />
          </Field>
          {siteAnnouncement && siteAnnouncement !== c.announcement && (
            <button type="button" className="pf-btn small" style={{ justifySelf: "start" }} onClick={() => set("announcement", siteAnnouncement)}>
              Use the website&rsquo;s notice
            </button>
          )}
        </Panel>

        <Panel title="Look" hint="Text in the app is black or white, whichever reads on your colours. An accent that would be hard to see is shaded until it isn't.">
          <div className="pf-appb-colours">
            {(["accent", "background"] as const).map((k) => (
              <div key={k} className="pf-field">
                <label className="pf-flabel" htmlFor={`app-${k}`}>{k === "accent" ? "Accent (buttons, top bar, icon)" : "Background"}</label>
                <span className="pf-appb-colour">
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(c[k]) ? c[k] : "#000000"} aria-label={`${k === "accent" ? "Accent" : "Background"} colour picker`}
                    onChange={(e) => set(k, e.target.value)} />
                  <input id={`app-${k}`} className="pf-input mono" value={c[k]} maxLength={7} spellCheck={false}
                    onChange={(e) => set(k, e.target.value.trim())} {...field(k)} />
                </span>
                {errorFor(k) && <span id={`app-${k}-err`} className="pf-field-err">{errorFor(k)}</span>}
              </div>
            ))}
          </div>
          {pendingNote.map((n) => <p key={n} className="pf-msg" style={{ background: "var(--warn-soft)", color: "var(--ink)", margin: 0 }}>{n}</p>)}
          <button type="button" className="pf-btn small" style={{ justifySelf: "start" }}
            onClick={() => { set("accent", siteColours.accent); setC((p) => ({ ...p, background: siteColours.background })); }}>
            Match my website
          </button>
          <fieldset className="pf-appb-icon">
            <legend className="pf-flabel">Icon</legend>
            <AppIcon config={check.ok ? check.config : { ...c, accent: /^#[0-9a-f]{6}$/i.test(c.accent) ? c.accent : "#444444" }} size={56} />
            <label className="pf-appb-radio">
              <input type="radio" name="app-icon" checked={c.icon.mode === "initials"} onChange={() => set("icon", { mode: "initials", glyph: "" })} />
              <span>Initials ({initialsOf(c.name)})</span>
            </label>
            <label className="pf-appb-radio">
              <input type="radio" name="app-icon" checked={c.icon.mode === "glyph"} onChange={() => set("icon", { mode: "glyph", glyph: c.icon.glyph || initialsOf(c.name)[0] })} />
              <span>One character</span>
            </label>
            {c.icon.mode === "glyph" && (
              <input id="app-icon" className="pf-input mono" style={{ width: 64, textAlign: "center" }} value={c.icon.glyph} maxLength={1} aria-label="Icon character"
                onChange={(e) => set("icon", { mode: "glyph", glyph: e.target.value.toUpperCase() })} {...field("icon")} />
            )}
            {errorFor("icon") && <span id="app-icon-err" className="pf-field-err">{errorFor("icon")}</span>}
          </fieldset>
        </Panel>

        <Panel title="Home screen buttons" hint="In this order, two to a row. Greyed buttons are switched on but won't show until that part of the business is on.">
          <p className="pf-sr" aria-live="polite">{moved}</p>
          <ol className="pf-tiles">
            {c.tiles.map((t, i) => {
              const s = tiles[t.id];
              const label = TILES[t.id].label;
              return (
                <li key={t.id} className={`pf-tile${s.available ? "" : " unavailable"}${t.on ? "" : " off"}`}>
                  <span className="pf-tile-text">
                    <b>{label}</b>
                    <span>{!s.available ? s.why : t.on ? (s.why ?? TILES[t.id].hint) : "Hidden"}</span>
                  </span>
                  <button type="button" role="switch" aria-checked={t.on} aria-label={`Show ${label}`} className="pf-switch"
                    onClick={() => set("tiles", c.tiles.map((x) => (x.id === t.id ? { ...x, on: !x.on } : x)))} />
                  <span className="pf-tile-move">
                    <button type="button" id={`tile-${t.id}-up`} className="pf-btn small quiet" aria-label={`Move ${label} up`} disabled={i === 0} onClick={() => move(i, -1)}>Move up</button>
                    <button type="button" id={`tile-${t.id}-down`} className="pf-btn small quiet" aria-label={`Move ${label} down`} disabled={i === c.tiles.length - 1} onClick={() => move(i, 1)}>Move down</button>
                  </span>
                </li>
              );
            })}
          </ol>
          {errorFor("tiles") && <p className="pf-field-err">{errorFor("tiles")}</p>}
        </Panel>

        <div className="pf-panel pf-appb-save">
          {errors.length > 0 && (
            <div className="pf-msg err" role="alert"><b>Not saved.</b> {errors.map((e) => e.message).join(" ")}</div>
          )}
          {done && <p className="pf-msg ok" role="status">{done}{notes.length ? ` ${notes.join(" ")}` : ""}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="pf-btn" disabled={!dirty || pending || !check.ok} onClick={() => save(false)}>Save draft</button>
            <button type="button" className="pf-btn primary" disabled={!unpublished || pending || !check.ok} onClick={() => save(true)}>{pending ? "Saving…" : dirty ? "Save & publish" : "Publish"}</button>
            <a className="pf-btn quiet" href={`/s/${slug}/app`} target="_blank" rel="noreferrer">Open the live app ↗</a>
          </div>
          <p className="pf-sub" style={{ margin: 0 }}>
            {dirty ? <span className="pf-pill warn dot">Unsaved changes</span>
              : unpublished ? <span className="pf-pill warn dot">Unpublished changes</span>
              : <span className="pf-pill go dot">Guests have this version</span>}
          </p>
        </div>
      </div>

      <aside className="pf-appb-preview" aria-label="Preview">
        <div className="pf-phone">
          <iframe ref={frame} src={`/s/${slug}/app?preview=draft`} title="Your app, as guests will see it (draft)" className="pf-phone-screen" />
        </div>
        <p className="pf-sub" style={{ textAlign: "center", margin: 0 }}>Your draft, live as you type. Tap around: it&rsquo;s the real app.</p>
      </aside>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
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

function Field({ label, hint, f, error, extra, children }: { label: string; hint?: string; f: AppField; error?: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className="pf-field">
      <span className="pf-appb-label"><label className="pf-flabel" htmlFor={`app-${f}`}>{label}</label>{extra}</span>
      {children}
      {hint && <span className="pf-sub" style={{ margin: 0, fontSize: 12.5 }}>{hint}</span>}
      {error && <span id={`app-${f}-err`} className="pf-field-err">{error}</span>}
    </div>
  );
}
