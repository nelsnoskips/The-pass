import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/studio/session";
import { Suspense } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { MobileNav } from "@/components/shell/MobileNav";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getIntegrationConnections,
  getLocations,
  getNotifications,
} from "@/lib/data/demo";

export const metadata = {
  title: "The Pass — Restaurant Marketing Intelligence",
};

/* A page whose output depends on who is asking cannot be prerendered:
   at build time there is no cookie, so the session check would bake in
   its own redirect and serve that to everyone, signed in or not. */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The real gate. Middleware only proves a cookie is present; this
  // proves it is a live session for an allowed address, because it can
  // reach the database and the edge runtime cannot.
  if (!(await getSessionEmail())) redirect("/studio/login");

  const user = await getCurrentUser();
  const anchor = demoAnchor();
  const locations = getLocations(user);
  const notifications = getNotifications(anchor);
  const connections = getIntegrationConnections(anchor);
  const lastSyncAt = connections
    .map((c) => c.lastSyncAt)
    .filter((v): v is string => v !== null)
    .sort()
    .at(-1);

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <Suspense fallback={null}>
        <Sidebar userName={user.name} userRole={user.role} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 border-b border-line bg-surface/80" />}>
          <Topbar
            user={user}
            locations={locations}
            notifications={notifications}
            lastSyncAt={lastSyncAt ?? null}
          />
        </Suspense>
        <main
          id="main"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10"
        >
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
    </div>
  );
}
