import { googleAdsAuthorizeUrl, googleAdsConfigured } from "@/lib/ads/google-ads";
import { oauthStart } from "@/lib/integrations/oauth-routes";

export const dynamic = "force-dynamic";
export const GET = oauthStart({
  provider: "google_ads", label: "Google Ads", configured: googleAdsConfigured,
  callbackPath: "/api/integrations/google-ads/callback", authorizeUrl: googleAdsAuthorizeUrl,
});
