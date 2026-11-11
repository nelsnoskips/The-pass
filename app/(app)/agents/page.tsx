import { Bot, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, SectionHeading } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { AgentQueue } from "@/components/agents/AgentQueue";
import { getCurrentUser } from "@/lib/auth";
import { AGENTS, canActOnProposals, runAgents } from "@/lib/agents";
import {
  demoAnchor,
  getBrand,
  getCampaignRows,
  getKeywords,
  getSearchTerms,
} from "@/lib/data/demo";
import { CAMPAIGNS } from "@/lib/data/seed";
import { formatRangeLabel } from "@/lib/dates";
import { parseFilters, resolveRanges, type SearchParams } from "@/lib/filters";

export const metadata = { title: "Agents — The Pass" };

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  const anchor = demoAnchor();
  const { current } = resolveRanges(filters, anchor);

  const proposals = runAgents({
    rows: getCampaignRows(user, filters, current, anchor),
    range: current,
    terms: getSearchTerms(user, filters, current, anchor),
    keywords: getKeywords(user, filters, current, anchor),
    campaignName: (id) => CAMPAIGNS.find((c) => c.id === id)?.name ?? id,
  });

  const counts = new Map<string, number>();
  for (const p of proposals) counts.set(p.agent, (counts.get(p.agent) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div>
        <p className="micro-label text-champagne">Agents</p>
        <h1 className="mt-1 font-display text-[26px] text-ink">
          Your marketing, run — not just reported
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate">
          {formatRangeLabel(current)} · Agents propose, you approve.
          <InfoTip text="Every proposal is built from the same scoped numbers as your reports, with the evidence shown. Nothing is changed on Google or Meta automatically: approved changes are made by your strategist until live connections are switched on." />
        </p>
      </div>

      <section>
        <SectionHeading label="Roster" title="Who's working on your account" className="mb-3" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {AGENTS.map((a) => {
            const live = a.status === "live";
            const n = counts.get(a.id) ?? 0;
            return (
              <Card key={a.id} className={live ? "p-4" : "p-4 opacity-70"}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={
                        live
                          ? "grid h-8 w-8 place-items-center rounded-lg bg-cobalt-soft text-cobalt"
                          : "grid h-8 w-8 place-items-center rounded-lg bg-canvas text-slate"
                      }
                      aria-hidden
                    >
                      {live ? <Bot size={17} /> : <Clock size={17} />}
                    </span>
                    <h3 className="text-[14.5px] font-semibold text-ink">{a.name}</h3>
                  </div>
                  {live ? (
                    <Badge tone={n > 0 ? "cobalt" : "emerald"}>
                      {n > 0 ? `${n} to review` : "All clear"}
                    </Badge>
                  ) : (
                    <Badge tone="slate">Coming</Badge>
                  )}
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink/80">{a.summary}</p>
                <p className="mt-2 text-[11.5px] text-slate">Watches: {a.watches}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeading label="Queue" title="Proposed changes" className="mb-3" />
        <AgentQueue
          proposals={proposals}
          agents={AGENTS}
          canAct={canActOnProposals(user)}
          storageKey={`pass-agent-decisions:${getBrand().id}`}
        />
      </section>
    </div>
  );
}
