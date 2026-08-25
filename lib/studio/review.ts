import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Project, ReviewComment, ReviewRound } from "./types";

/**
 * Review rounds: the "here is the mock, tell us what to change" loop.
 *
 * The token in the URL is the client's entire credential. That is a
 * deliberate trade — asking a restaurant owner to create an account
 * before they can say "the logo is too big" loses more feedback than
 * the risk of an unguessable link leaking is worth. 24 bytes of
 * randomness is not brute-forceable, the round can be closed the
 * moment it is done, and nothing behind it is destructive: the worst a
 * leaked link allows is reading a mock and adding a comment.
 */
export function newToken() {
  return randomBytes(24).toString("base64url");
}

export type ReviewContext = {
  round: ReviewRound;
  project: Project;
  clientName: string;
  comments: ReviewComment[];
};

export async function getReviewByToken(token: string): Promise<ReviewContext | null> {
  const sql = db();
  if (!sql) return null;

  const rows = await sql<(ReviewRound & { project: Project; client_name: string })[]>`
    select r.*,
           to_jsonb(p.*) as project,
           c.name        as client_name
    from review_rounds r
    join projects p on p.id = r.project_id
    join clients  c on c.id = p.client_id
    where r.token = ${token}
    limit 1
  `;
  if (rows.length === 0) return null;

  const row = rows[0];
  const comments = await sql<ReviewComment[]>`
    select * from review_comments
    where round_id = ${row.id}
    order by created_at asc
  `;

  return {
    round: row,
    project: row.project,
    clientName: row.client_name,
    comments,
  };
}

export type IncomingComment = {
  kind: "comment" | "edit";
  pagePath: string;
  selector?: string | null;
  xPct?: number | null;
  yPct?: number | null;
  originalText?: string | null;
  suggestedText?: string | null;
  body?: string | null;
};

/**
 * Writes a whole submission in one transaction and marks the round
 * submitted. Partial saves are the failure mode that matters here: a
 * client who writes eleven notes and loses three has no way of knowing
 * which three, so either all of them land or none do.
 */
export async function submitReview(
  token: string,
  author: string | null,
  comments: IncomingComment[],
): Promise<{ round: ReviewRound; inserted: number } | null> {
  const sql = db();
  if (!sql) return null;

  return sql.begin(async (tx) => {
    const rounds = await tx<ReviewRound[]>`
      select * from review_rounds where token = ${token} limit 1
    `;
    if (rounds.length === 0) return null;
    const round = rounds[0];
    if (round.status === "closed") return null;

    for (const c of comments) {
      await tx`
        insert into review_comments
          (round_id, kind, page_path, selector, x_pct, y_pct,
           original_text, suggested_text, body, author)
        values
          (${round.id}, ${c.kind}, ${c.pagePath}, ${c.selector ?? null},
           ${c.xPct ?? null}, ${c.yPct ?? null}, ${c.originalText ?? null},
           ${c.suggestedText ?? null}, ${c.body ?? null}, ${author})
      `;
    }

    const [updated] = await tx<ReviewRound[]>`
      update review_rounds
      set status = 'submitted', submitted_at = now()
      where id = ${round.id}
      returning *
    `;

    return { round: updated, inserted: comments.length };
  }) as Promise<{ round: ReviewRound; inserted: number } | null>;
}
