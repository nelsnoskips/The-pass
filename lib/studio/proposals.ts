import { db } from "@/lib/db";
import type { Proposal, ProposalLineItem } from "./types";

/**
 * Generated quotes.
 *
 * The two hand-built proposals (/proposals/hals, /proposals/rebellion)
 * stay as they are — they are already sent, and a sent quote should not
 * change shape because a template did. Everything generated from here
 * renders through /proposals/[slug] instead, off the same stylesheet,
 * so old and new look identical to a reader.
 */
export async function listProposals(): Promise<Proposal[]> {
  const sql = db();
  if (!sql) return [];
  return sql<Proposal[]>`select * from proposals order by updated_at desc`;
}

export async function getProposal(slug: string): Promise<Proposal | null> {
  const sql = db();
  if (!sql) return null;
  const rows = await sql<Proposal[]>`
    select * from proposals where slug = ${slug} limit 1
  `;
  return rows[0] ?? null;
}

export type ProposalInput = {
  slug: string;
  company: string;
  contactName?: string | null;
  headline: string;
  intro?: string | null;
  monthlyFee?: number | null;
  lineItems: ProposalLineItem[];
  includes?: string | null;
  footnote?: string | null;
  pullquote?: string | null;
  validDays?: number;
  clientId?: string | null;
};

export async function upsertProposal(input: ProposalInput): Promise<Proposal | null> {
  const sql = db();
  if (!sql) return null;
  const [row] = await sql<Proposal[]>`
    insert into proposals
      (client_id, slug, company, contact_name, headline, intro, monthly_fee,
       line_items, includes, footnote, pullquote, valid_days)
    values
      (${input.clientId ?? null}, ${input.slug}, ${input.company},
       ${input.contactName ?? null}, ${input.headline}, ${input.intro ?? null},
       ${input.monthlyFee ?? null}, ${sql.json(input.lineItems)},
       ${input.includes ?? null}, ${input.footnote ?? null},
       ${input.pullquote ?? null}, ${input.validDays ?? 30})
    on conflict (slug) do update set
      company      = excluded.company,
      contact_name = excluded.contact_name,
      headline     = excluded.headline,
      intro        = excluded.intro,
      monthly_fee  = excluded.monthly_fee,
      line_items   = excluded.line_items,
      includes     = excluded.includes,
      footnote     = excluded.footnote,
      pullquote    = excluded.pullquote,
      valid_days   = excluded.valid_days,
      updated_at   = now()
    returning *
  `;
  return row;
}

/**
 * Slugs that already exist as hand-built pages under app/proposals/.
 * A static route always wins over the dynamic [slug] one, so a generated
 * quote saved under one of these would be silently unreachable — the
 * studio would show a link that served somebody else's document.
 */
export const RESERVED_SLUGS = new Set(["hals", "rebellion"]);

/** URL-safe, collision-resistant enough for a handful of quotes a month. */
export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
