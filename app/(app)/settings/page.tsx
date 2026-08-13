import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/Card";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
import { DEMO_USER_COOKIE, getCurrentUser } from "@/lib/auth";
import { getBrand } from "@/lib/data/demo";
import { USERS } from "@/lib/data/seed";
import { formatCents } from "@/lib/format";

export const metadata = { title: "Settings — The Pass" };

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "All brands, locations, users, settings, integrations, reports, calendar",
  marketer:
    "Reporting detail, keywords, conversions, calendar editing, exports; limited integration management",
  location_manager:
    "Assigned locations only; view reporting and calendar; calendar editing",
  viewer: "Read-only within assigned scope",
};

async function switchUser(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId") ?? "");
  if (!USERS.some((u) => u.id === userId)) return;
  const store = await cookies();
  store.set(DEMO_USER_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const brand = getBrand();

  return (
    <div className="space-y-5">
      <div>
        <p className="micro-label text-champagne">Settings</p>
        <h1 className="mt-1 font-display text-[26px] text-ink">
          Brand, roles & preferences
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <SectionHeading title="Brand settings" className="mb-3" />
          <dl className="space-y-2.5 text-[13px]">
            {[
              ["Brand", brand.name],
              ["Currency", brand.currency],
              ["Default timezone", brand.timezone],
              ["Reporting week starts", brand.weekStartsOn === 1 ? "Monday" : "Sunday"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-slate">{label}</dt>
                <dd className="font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="micro-label mb-2 mt-5 text-slate">Default conversion values</p>
          <ul className="space-y-1.5 text-[13px]">
            {Object.entries(brand.defaultConversionValues).map(([category, cents]) => (
              <li key={category} className="flex justify-between gap-3">
                <span className="capitalize text-slate">{category.replace("_", " ")}</span>
                <span className="tnum font-medium text-ink">
                  {cents === 0 ? "No value assigned" : formatCents(cents ?? null)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] text-slate">
            These drive Estimated Marketing Revenue. When a POS or reservation
            integration provides transaction revenue, it is labeled Tracked
            Revenue instead.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <SectionHeading title="Demo: switch user & role" className="mb-1" />
          <p className="mb-3 text-[12.5px] text-slate">
            The Pass enforces roles and location access in backend queries, not
            just the interface. Switch users to experience each scope — Maria
            only ever receives Miami Beach data, even if she edits the URL.
          </p>
          <div className="space-y-2">
            {USERS.map((u) => (
              <form key={u.id} action={switchUser} className="w-full">
                <input type="hidden" name="userId" value={u.id} />
                <button
                  type="submit"
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    u.id === user.id
                      ? "border-cobalt bg-cobalt-soft"
                      : "border-line hover:border-slate/40"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-ink">{u.name}</span>
                    <Badge tone={u.id === user.id ? "cobalt" : "slate"}>
                      {u.role.replace("_", " ")}
                    </Badge>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-slate">
                    {ROLE_DESCRIPTIONS[u.role]}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-slate/80">
                    {u.email} ·{" "}
                    {u.locationIds === null
                      ? "All locations"
                      : `${u.locationIds.length} location(s)`}
                  </span>
                </button>
              </form>
            ))}
          </div>
        </section>
      </div>

      <section id="notifications" className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <SectionHeading title="Notification preferences" className="mb-1" />
        <p className="mb-4 max-w-2xl text-[12.5px] text-slate">
          Notifications are restrained by design: routine metric fluctuations
          are never sent as alerts unless they exceed a configured threshold or
          persist long enough to matter.
        </p>
        <NotificationPrefs userId={user.id} />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <SectionHeading title="Data retention" className="mb-1" />
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-slate">
          Disconnecting an integration never erases historical reporting — the
          source is marked disconnected and data is preserved unless an
          authorized admin explicitly requests permanent deletion. Mapping and
          connection changes are soft-deleted and audit-logged.
        </p>
      </section>
    </div>
  );
}
