import { connectMeta, syncMeta } from "@/lib/ads/meta";
import { db } from "@/lib/db";
import { oauthCallback } from "@/lib/integrations/oauth-routes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const GET = oauthCallback({
  provider: "meta_ads", label: "Meta", callbackPath: "/api/integrations/meta/callback",
  complete: (orgId, code, redirectUri, actor) => connectMeta(db()!, orgId, code, redirectUri, actor),
  after: (orgId) => syncMeta(db()!, orgId, 30),
});
