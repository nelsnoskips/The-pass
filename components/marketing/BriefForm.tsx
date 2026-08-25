"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { ALL_FIELDS, CHAPTERS, type Field } from "@/lib/brief";

const STORE = "m4-brief-v1";

/**
 * The intake, as a document that writes itself.
 *
 * Two things make this different from a contact form with more boxes.
 * The brief assembles beside you as you answer, so filling it in feels
 * like producing something rather than feeding a database — and by the
 * end the client has read their own brief back, which is the single
 * best way to catch a wrong assumption before it costs a fortnight.
 * And every chapter is skippable in one click, because the alternative
 * to a skippable question is not a considered answer, it is an
 * abandoned form.
 *
 * Everything is kept in localStorage as it is typed. These take twenty
 * minutes to do properly and nobody does them in one sitting; losing an
 * answer to a closed tab would be the end of the submission.
 *
 * Without JavaScript this still works: the same fields render as one
 * long ordinary form that posts to the same endpoint. A stepped intake
 * that shows nothing with JS off is a lead form that quietly loses
 * leads.
 */
export function BriefForm() {
  const [i, setI] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [restored, setRestored] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  /* Restore before first paint of the fields, so a returning visitor
     never sees their answers appear a beat late. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw);
        setValues(p.values ?? {});
        setSkipped(p.skipped ?? {});
        if (Object.keys(p.values ?? {}).length) setRestored(true);
      }
    } catch {
      /* A private window, or storage the browser refuses. Not a reason
         to break the form. */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ values, skipped }));
    } catch {}
  }, [values, skipped]);

  const chapter = CHAPTERS[i];
  const answered = ALL_FIELDS.filter((f) => (values[f.id] ?? "").trim()).length;
  const pct = Math.round((answered / ALL_FIELDS.length) * 100);

  const set = (id: string, v: string) =>
    setValues((prev) => ({ ...prev, [id]: v }));

  const toggleMulti = (id: string, opt: string) => {
    const cur = (values[id] ?? "").split(", ").filter(Boolean);
    const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
    set(id, next.join(", "));
  };

  const go = (n: number) => {
    setI(Math.max(0, Math.min(CHAPTERS.length - 1, n)));
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const skipChapter = () => {
    setSkipped((p) => ({ ...p, [chapter.id]: true }));
    go(i + 1);
  };

  /* The brief itself. Only answered fields appear, so it reads as prose
     rather than as a form with gaps. */
  const brief = useMemo(
    () =>
      CHAPTERS.map((c) => ({
        title: c.title,
        lines: c.fields
          .map((f) => {
            const v = (values[f.id] ?? "").trim();
            return v ? f.summary(v) : null;
          })
          .filter(Boolean) as string[],
      })).filter((c) => c.lines.length),
    [values],
  );

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setState("sending");
    try {
      const res = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data as unknown as Record<string, string>).toString(),
      });
      if (!res.ok) throw new Error(String(res.status));
      sendGAEvent("event", "generate_lead", { method: "brief_form" });
      setState("sent");
      try { localStorage.removeItem(STORE); } catch {}
    } catch {
      setState("error");
      const body = encodeURIComponent(
        brief.map((c) => `${c.title.toUpperCase()}\n${c.lines.join("\n")}`).join("\n\n"),
      );
      window.location.href = `mailto:hello@madisonfour.com?subject=${encodeURIComponent(
        `Project brief: ${values.company || values.name || "new enquiry"}`,
      )}&body=${body}`;
    }
  };

  if (state === "sent") {
    return (
      <div className="mx-auto max-w-[720px] py-24 text-center">
        <p className="mk-label text-[#B79A68]">Received, with thanks.</p>
        <h2 className="mt-6 font-editorial text-[38px] leading-tight text-[#F1EDE5]">
          Your brief is in.
        </h2>
        <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-relaxed text-[#F1EDE5]/65">
          We&apos;ll read it properly and come back within one business day —
          usually with two or three questions rather than a proposal, because
          the questions are what make the proposal worth reading.
        </p>
      </div>
    );
  }

  return (
    <form
      name="brief"
      method="POST"
      data-netlify="true"
      onSubmit={onSubmit}
      className="mx-auto max-w-[1400px]"
    >
      <input type="hidden" name="form-name" value="brief" />
      {/* Every answer travels, including from chapters walked past. */}
      {ALL_FIELDS.map((f) => (
        <input key={f.id} type="hidden" name={f.id} value={values[f.id] ?? ""} />
      ))}

      <div ref={top} className="scroll-mt-28 grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        {/* ── the questions ───────────────────────────────────── */}
        <div>
          <div className="flex items-baseline justify-between gap-6">
            <p className="mk-label text-[#B79A68]">
              {chapter.n} · {chapter.title}
            </p>
            <p className="mk-label text-[#F1EDE5]/40">
              {answered} of {ALL_FIELDS.length}
            </p>
          </div>

          {/* Progress, as a rule that fills. */}
          <div className="mt-4 h-px w-full bg-[#F1EDE5]/15">
            <div
              className="h-px bg-[#B79A68] transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          {restored && i === 0 && (
            <p className="mt-5 text-[13px] text-[#83A978]">
              Picked up where you left off. Everything is saved on this device
              as you type.
            </p>
          )}

          <p className="mt-8 max-w-[52ch] text-[15px] leading-relaxed text-[#F1EDE5]/60">
            {chapter.lede}
          </p>

          <div className="mt-10 space-y-9">
            {chapter.fields.map((f) => (
              <FieldRow
                key={f.id}
                f={f}
                value={values[f.id] ?? ""}
                onText={(v) => set(f.id, v)}
                onToggle={(o) => toggleMulti(f.id, o)}
              />
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-[#F1EDE5]/12 pt-8">
            {i > 0 && (
              <button type="button" onClick={() => go(i - 1)}
                className="mk-label text-[#F1EDE5]/50 transition-colors hover:text-[#F1EDE5]">
                ← Back
              </button>
            )}
            {i < CHAPTERS.length - 1 ? (
              <>
                <button type="button" onClick={() => go(i + 1)}
                  className="mk-label group inline-flex items-center gap-3 border border-[#B79A68] px-7 py-4 text-[#F1EDE5] transition-colors hover:bg-[#B79A68] hover:text-[#0A0A09]">
                  Continue
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </button>
                <button type="button" onClick={skipChapter}
                  className="mk-label text-[#F1EDE5]/45 underline decoration-[#F1EDE5]/25 underline-offset-4 transition-colors hover:text-[#F1EDE5]">
                  Skip this section
                </button>
              </>
            ) : (
              <button type="submit" disabled={state === "sending"}
                className="mk-label group inline-flex items-center gap-3 border border-[#B79A68] bg-[#B79A68] px-7 py-4 text-[#0A0A09] transition-colors hover:bg-transparent hover:text-[#F1EDE5] disabled:opacity-60">
                {state === "sending" ? "Sending…" : "Send the brief"}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            )}
          </div>

          {state === "error" && (
            <p className="mt-5 text-[13px] text-[#F1EDE5]/60">
              The form wouldn&apos;t send, so we&apos;ve opened your email
              client with the brief in it instead.
            </p>
          )}

          {/* The chapter rail: skipped ones stay reachable. */}
          <ol className="mt-10 flex flex-wrap gap-x-5 gap-y-2">
            {CHAPTERS.map((c, k) => (
              <li key={c.id}>
                <button type="button" onClick={() => go(k)}
                  className={`mk-label transition-colors ${
                    k === i ? "text-[#B79A68]"
                      : skipped[c.id] ? "text-[#F1EDE5]/25 line-through"
                      : "text-[#F1EDE5]/45 hover:text-[#F1EDE5]"
                  }`}>
                  {c.n}
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* ── the brief, assembling ───────────────────────────── */}
        <aside aria-live="polite" className="lg:sticky lg:top-28 lg:self-start">
          <p className="mk-label text-[#F1EDE5]/40">Your brief, so far</p>
          <div className="mt-5 min-h-[280px] border border-[#F1EDE5]/12 bg-[#0A0A09]/50 p-7">
            {brief.length === 0 ? (
              <p className="text-[14px] leading-relaxed text-[#F1EDE5]/35">
                Nothing yet. As you answer, this becomes the brief we work
                from — and the thing you read back before sending it, which
                is when wrong assumptions are cheapest to catch.
              </p>
            ) : (
              <div className="space-y-6">
                {brief.map((c) => (
                  <div key={c.title}>
                    <p className="mk-label text-[#B79A68]/70">{c.title}</p>
                    <ul className="mt-2.5 space-y-2">
                      {c.lines.map((l) => (
                        <li key={l} className="text-[14px] leading-relaxed text-[#F1EDE5]/75">
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </form>
  );
}

function FieldRow({
  f, value, onText, onToggle,
}: {
  f: Field;
  value: string;
  onText: (v: string) => void;
  onToggle: (opt: string) => void;
}) {
  const label = (
    <>
      <span className="text-[16px] text-[#F1EDE5]">{f.label}</span>
      {!f.required && (
        <span className="mk-label ml-3 text-[#F1EDE5]/30">Optional</span>
      )}
      {f.hint && (
        <span className="mt-1.5 block max-w-[52ch] text-[13.5px] leading-relaxed text-[#F1EDE5]/45">
          {f.hint}
        </span>
      )}
    </>
  );

  const input =
    "mt-3 w-full border-0 border-b border-[#F1EDE5]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#F1EDE5] transition-colors placeholder:text-[#F1EDE5]/25 " +
  /* Recoloured rather than removed. A border that changes shade is
     too quiet to be the only focus cue, so the ring stays — it is
     just gold instead of the browser's blue. */
  "focus:border-[#B79A68] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#B79A68]";

  if (f.type === "choice" || f.type === "multi") {
    const chosen = value.split(", ").filter(Boolean);
    return (
      <fieldset>
        <legend className="block">{label}</legend>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {f.options!.map((o) => {
            const on = f.type === "multi" ? chosen.includes(o) : value === o;
            return (
              <button
                key={o}
                type="button"
                aria-pressed={on}
                onClick={() => (f.type === "multi" ? onToggle(o) : onText(on ? "" : o))}
                className={`mk-label border px-4 py-2.5 transition-colors ${
                  on
                    ? "border-[#B79A68] bg-[#B79A68] text-[#0A0A09]"
                    : "border-[#F1EDE5]/20 text-[#F1EDE5]/70 hover:border-[#F1EDE5]/45 hover:text-[#F1EDE5]"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <label className="block">
      {label}
      {f.type === "long" ? (
        <textarea
          rows={3}
          value={value}
          placeholder={f.placeholder}
          onChange={(e) => onText(e.target.value)}
          className={`${input} resize-y leading-relaxed`}
        />
      ) : (
        <input
          type={f.type}
          value={value}
          placeholder={f.placeholder}
          required={f.required}
          onChange={(e) => onText(e.target.value)}
          className={input}
        />
      )}
    </label>
  );
}
