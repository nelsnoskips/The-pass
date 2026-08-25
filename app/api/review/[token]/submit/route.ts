import { NextResponse } from "next/server";
import { submitReview, type IncomingComment } from "@/lib/studio/review";
import { isConfigured } from "@/lib/db";
import { sendMail } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Guards against a runaway client and against a hand-rolled POST. */
const MAX_COMMENTS = 200;
const MAX_LEN = 4000;

const clip = (v: unknown) =>
  typeof v === "string" ? v.slice(0, MAX_LEN) : null;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!isConfigured()) {
    return NextResponse.json({ error: "Review storage is not configured." }, { status: 503 });
  }

  let payload: { author?: unknown; comments?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const raw = Array.isArray(payload.comments) ? payload.comments : [];
  if (raw.length === 0) {
    return NextResponse.json({ error: "Nothing to submit." }, { status: 400 });
  }
  if (raw.length > MAX_COMMENTS) {
    return NextResponse.json({ error: "Too many notes in one submission." }, { status: 413 });
  }

  const comments: IncomingComment[] = raw.map((c: Record<string, unknown>) => ({
    kind: c.kind === "edit" ? "edit" : "comment",
    pagePath: clip(c.pagePath) ?? "/",
    selector: clip(c.selector),
    xPct: typeof c.xPct === "number" ? c.xPct : null,
    yPct: typeof c.yPct === "number" ? c.yPct : null,
    originalText: clip(c.originalText),
    suggestedText: clip(c.suggestedText),
    body: clip(c.body),
  }));

  const author = clip(payload.author);
  const result = await submitReview(token, author, comments);

  if (!result) {
    return NextResponse.json({ error: "This review link is no longer open." }, { status: 404 });
  }

  // The comments are already committed. Mail is a notification, so a
  // failure here must not turn a successful submission into an error
  // the client sees — they would resubmit and duplicate everything.
  const edits = comments.filter((c) => c.kind === "edit").length;
  await sendMail({
    subject: `Review submitted — ${result.inserted} note${result.inserted === 1 ? "" : "s"}`,
    text: [
      `${author ?? "A client"} submitted round ${result.round.round}.`,
      `${result.inserted} note${result.inserted === 1 ? "" : "s"}, ${edits} of them text edits.`,
      "",
      ...comments.map((c, i) =>
        c.kind === "edit"
          ? `${i + 1}. [edit] ${c.pagePath}\n   was: ${c.originalText}\n   now: ${c.suggestedText}${c.body ? `\n   note: ${c.body}` : ""}`
          : `${i + 1}. [comment] ${c.pagePath}\n   ${c.body ?? "(no text)"}`,
      ),
    ].join("\n"),
  });

  return NextResponse.json({ ok: true, inserted: result.inserted });
}
