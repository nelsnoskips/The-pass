import { metaAuthorizeUrl, metaConfigured } from "@/lib/ads/meta";
import { oauthStart } from "@/lib/integrations/oauth-routes";

export const dynamic = "force-dynamic";
export const GET = oauthStart({
  provider: "meta_ads", label: "Meta", configured: metaConfigured,
  callbackPath: "/api/integrations/meta/callback", authorizeUrl: metaAuthorizeUrl,
});
