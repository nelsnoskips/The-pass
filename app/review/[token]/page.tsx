import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewWorkspace } from "@/components/review/ReviewWorkspace";
import { getReviewByToken } from "@/lib/studio/review";
import { isConfigured } from "@/lib/db";
import "./review.css";

export const metadata: Metadata = {
  title: "Review your site | The Pass",
  robots: { index: false, follow: false },
};

// The token is the credential, so nothing here may be cached or
// prerendered: a review must reflect the round's current state.
export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isConfigured()) {
    return (
      <div className="rv-done">
        <p className="rv-eyebrow">Not configured</p>
        <h1>The review tool isn&rsquo;t connected yet.</h1>
        <p>
          Set <code>DATABASE_URL</code> and run <code>npm run db:migrate</code>, then this
          link will open the mock with the annotation layer over it.
        </p>
      </div>
    );
  }

  const ctx = await getReviewByToken(token);
  if (!ctx) notFound();

  if (ctx.round.status === "closed") {
    return (
      <div className="rv-done">
        <p className="rv-eyebrow">Round {ctx.round.round}</p>
        <h1>This round is closed.</h1>
        <p>
          The notes on {ctx.project.name} have been actioned. If you need to add
          something, reply to the email this link came from and we&rsquo;ll open a new round.
        </p>
      </div>
    );
  }

  if (!ctx.project.mock_path) {
    return (
      <div className="rv-done">
        <p className="rv-eyebrow">Round {ctx.round.round}</p>
        <h1>The mock isn&rsquo;t attached yet.</h1>
        <p>This link works, but there&rsquo;s nothing on it to look at. We&rsquo;ll be in touch shortly.</p>
      </div>
    );
  }

  return (
    <ReviewWorkspace
      token={token}
      projectName={ctx.project.name}
      clientName={ctx.clientName}
      mockPath={ctx.project.mock_path}
      round={ctx.round.round}
      alreadySubmitted={ctx.round.status === "submitted"}
    />
  );
}
