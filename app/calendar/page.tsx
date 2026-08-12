import {
  CalendarView,
  type LinkedPerformance,
} from "@/components/calendar/CalendarView";
import { canEditCalendar, getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getCalendarItems,
  getCampaign,
  getCampaignSeries,
  getLocations,
} from "@/lib/data/demo";

export const metadata = { title: "Marketing Calendar — The Pass" };

export default async function CalendarPage() {
  const user = await getCurrentUser();
  const anchor = demoAnchor();
  const items = getCalendarItems(user, anchor);
  const locations = getLocations(user);

  // Summarized performance for linked campaigns over each item's live dates.
  const linkedPerformance: Record<string, LinkedPerformance[]> = {};
  for (const item of items) {
    if (item.linkedCampaignIds.length === 0 || item.startDate > anchor) continue;
    const perf: LinkedPerformance[] = [];
    for (const campaignId of item.linkedCampaignIds) {
      const campaign = getCampaign(user, campaignId);
      if (!campaign) continue;
      const series = getCampaignSeries(
        campaignId,
        { start: item.startDate, end: item.endDate },
        anchor,
      );
      perf.push({
        campaignName: campaign.name,
        spendCents: series.reduce((s, p) => s + p.spendCents, 0),
        conversions: series.reduce((s, p) => s + p.conversions, 0),
      });
    }
    if (perf.length > 0) linkedPerformance[item.id] = perf;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="micro-label text-champagne">Marketing Calendar</p>
        <h1 className="mt-1 font-display text-[26px] text-ink">
          What&apos;s planned next
        </h1>
        <p className="mt-1 text-[13px] text-slate">
          Promotions, events, and campaign plans across every location — in
          each restaurant&apos;s local timezone. Planning only: nothing here
          publishes to ad platforms.
        </p>
      </div>
      <CalendarView
        items={items}
        locations={locations}
        canEdit={canEditCalendar(user)}
        today={anchor}
        linkedPerformance={linkedPerformance}
      />
    </div>
  );
}
