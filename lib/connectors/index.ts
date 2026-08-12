import type {
  Campaign,
  DailyCampaignMetrics,
  IntegrationConnection,
} from "../types";
import type { DateRange } from "../dates";

/**
 * Connector boundary for live ad-platform syncs.
 *
 * A connector pulls raw platform data and returns the app's normalized types.
 * The sync worker upserts its output into the daily fact tables using the
 * (campaignId, date) unique key, making repeated syncs idempotent. Nothing
 * outside `lib/connectors/` ever sees a raw Google or Meta payload.
 *
 * The demo data source (`lib/data/demo.ts`) satisfies the same normalized
 * types, so enabling a live connector changes no page or component code.
 *
 * OAuth tokens are stored server-side only, encrypted at rest. Access and
 * refresh tokens are never sent to the browser and never pasted into forms.
 */
export interface AdsConnector {
  readonly platform: "google" | "meta";
  /** Whether required credentials are configured in the environment. */
  isConfigured(): boolean;
  /** Discover campaigns for mapping — users pick from a list, never type IDs. */
  listCampaigns(connection: IntegrationConnection): Promise<Campaign[]>;
  /** Pull daily metrics for a range (called with a lookback window to capture
   *  delayed conversions and attribution changes). */
  fetchDailyMetrics(
    connection: IntegrationConnection,
    range: DateRange,
  ): Promise<DailyCampaignMetrics[]>;
}

/**
 * Google Ads connector — not yet enabled.
 *
 * Required environment variables (server-side only):
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID   (manager account, optional)
 *
 * TODO(live-google): implement OAuth (read-only scope
 * https://www.googleapis.com/auth/adwords), account/campaign discovery via
 * GoogleAdsService.SearchStream, and daily metrics via the campaign report
 * with segments.date. Map micros → cents; keep external IDs as strings.
 */
export const googleAdsConnector: AdsConnector = {
  platform: "google",
  isConfigured: () =>
    Boolean(
      process.env.GOOGLE_ADS_CLIENT_ID &&
        process.env.GOOGLE_ADS_CLIENT_SECRET &&
        process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    ),
  async listCampaigns() {
    throw new Error(
      "Google Ads live connector is not configured. The app runs in demo mode.",
    );
  },
  async fetchDailyMetrics() {
    throw new Error(
      "Google Ads live connector is not configured. The app runs in demo mode.",
    );
  },
};

/**
 * Meta Ads connector — not yet enabled.
 *
 * Required environment variables (server-side only):
 *   META_APP_ID
 *   META_APP_SECRET
 *
 * TODO(live-meta): implement OAuth (ads_read scope), business + ad-account
 * selection, and daily insights via the Marketing API /insights edge with
 * time_increment=1. Preserve the attribution window on each record.
 */
export const metaAdsConnector: AdsConnector = {
  platform: "meta",
  isConfigured: () =>
    Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
  async listCampaigns() {
    throw new Error(
      "Meta Ads live connector is not configured. The app runs in demo mode.",
    );
  },
  async fetchDailyMetrics() {
    throw new Error(
      "Meta Ads live connector is not configured. The app runs in demo mode.",
    );
  },
};

export function connectorFor(platform: "google" | "meta"): AdsConnector {
  return platform === "google" ? googleAdsConnector : metaAdsConnector;
}
