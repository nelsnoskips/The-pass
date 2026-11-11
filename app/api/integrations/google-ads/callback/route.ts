import { connectGoogleAds, syncGoogleAds } from "@/lib/ads/google-ads";
import { db } from "@/lib/db";
import { oauthCallback } from "@/lib/integrations/oauth-routes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const GET = oauthCallback({
  provider: "google_ads", label: "Google Ads", callbackPath: "/api/integrations/google-ads/callback",
  complete: (orgId, code, redirectUri, actor) => connectGoogleAds(db()!, orgId, code, redirectUri, actor),
  after: (orgId) => syncGoogleAds(db()!, orgId, 30),
});
