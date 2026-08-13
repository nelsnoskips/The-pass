import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { OutcomePicker } from "@/components/welcome/OutcomePicker";
import { Badge } from "@/components/ui/Badge";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getBrand,
  getIntegrationConnections,
  getLocations,
} from "@/lib/data/demo";
import { STRATEGIST } from "@/lib/data/seed";

export const metadata = { title: "Welcome — The Pass" };

export default async function WelcomePage() {
  const user = await getCurrentUser();
  const brand = getBrand();
  const anchor = demoAnchor();
  const locations = getLocations(user);
  const connections = getIntegrationConnections(anchor);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="rounded-2xl bg-ink px-8 py-10 text-white shadow-[var(--shadow-card)]">
        <p className="micro-label text-champagne">Welcome to The Pass</p>
        <h1 className="mt-3 font-display text-[30px] leading-tight">
          {brand.name}, your marketing now has a command center.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/70">
          Every restaurant location. Every campaign. Every meaningful result.
          One clear view — watched daily by your marketing team.
        </p>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
        <p className="micro-label text-champagne">Your strategist</p>
        <div className="mt-3 flex items-center gap-4">
          <span
            aria-hidden
            className="flex h-14 w-14 items-center justify-center rounded-full bg-champagne-soft font-display text-[20px] text-[#8a6d3b]"
          >
            {STRATEGIST.name.split(" ").map((p) => p[0]).join("")}
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">{STRATEGIST.name}</p>
            <p className="text-[13px] text-slate">{STRATEGIST.role}</p>
            <p className="text-[12.5px] text-slate">
              {STRATEGIST.email} · {STRATEGIST.phone}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-slate">
          Alexis reviews your account weekly, surfaces opportunities, and posts
          a note with every meaningful change. You&apos;ll always see the work
          behind the results.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
        <p className="micro-label text-champagne">Your locations & data</p>
        <ul className="mt-3 space-y-2 text-[13.5px]">
          {locations.map((loc) => (
            <li key={loc.id} className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald" aria-hidden />
              <span className="font-medium text-ink">{loc.name}</span>
              <span className="text-slate">— reporting in {loc.timezone}</span>
            </li>
          ))}
          {connections.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald" aria-hidden />
              <span className="font-medium text-ink">
                {c.platform === "google" ? "Google Ads" : "Meta Ads"} connected
              </span>
              <Badge tone="champagne">Demo mode</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
        <p className="micro-label text-champagne">What matters most to you?</p>
        <p className="mb-3 mt-1 text-[13px] text-slate">
          Pick your primary business outcomes — your briefing and return
          reporting lead with these.
        </p>
        <OutcomePicker userId={user.id} />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
        <p className="micro-label text-champagne">Estimated vs. tracked revenue</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink">
          Until your POS or reservation platform is connected, revenue is{" "}
          <strong>estimated</strong> from values you approve — for example, $50
          per reservation. Estimated figures are always labeled. When
          transaction data is connected, you&apos;ll see <strong>tracked
          revenue</strong> instead, clearly marked.
        </p>
      </section>

      <div className="pb-4 text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-cobalt px-6 py-3 text-[14px] font-semibold text-white hover:bg-cobalt/90"
        >
          Read your first Daily Pass briefing
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
