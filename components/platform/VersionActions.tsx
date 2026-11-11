"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { publishSiteVersion } from "@/lib/platform/site-actions";

export function PublishVersionButton({ org, versionId, label }: { org: string; versionId: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" className="pf-btn small" disabled={pending}
      onClick={() => start(async () => { const r = await publishSiteVersion(org, versionId); if (r.error) alert(r.error); router.refresh(); })}>
      {pending ? "…" : label}
    </button>
  );
}
