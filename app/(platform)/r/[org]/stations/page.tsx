import { redirect } from "next/navigation";

/** /stations is the name people see; the page lives at /agents, which keeps every old link working. */
export default async function StationsAlias({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ agent?: string }> }) {
  const { org } = await params;
  const { agent } = await searchParams;
  redirect(`/r/${encodeURIComponent(org)}/agents${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`);
}
