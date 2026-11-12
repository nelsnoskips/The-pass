import { redirect } from "next/navigation";

/** /stations/<id> → /agents/<id>, where a station's page lives. */
export default async function StationAlias({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org, id } = await params;
  redirect(`/r/${encodeURIComponent(org)}/agents/${encodeURIComponent(id)}`);
}
