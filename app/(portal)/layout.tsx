import Link from "next/link";
import { Wordmark } from "@/components/marketing/PassMark";
import { PortalNav } from "@/components/portal/PortalNav";
import { getPortalClient } from "@/lib/portal";
import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/studio/session";

export const metadata = {
  title: "Project Room — The Pass",
  robots: { index: false, follow: false },
};

/**
 * The Project Room shell: the studio brand on cream, deliberately calmer
 * than the marketing dashboard. Design clients see their project here;
 * clients who also run The Pass marketing get a bridge to /dashboard.
 */
/* A page whose output depends on who is asking cannot be prerendered:
   at build time there is no cookie, so the session check would bake in
   its own redirect and serve that to everyone, signed in or not. */
export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The real gate. Middleware only proves a cookie is present; this
  // proves it is a live session, because it can reach the database and
  // the edge runtime cannot. When the portal grows real client logins
  // this becomes a client-session check rather than a studio one.
  if (!(await getSessionEmail())) redirect("/studio/login");

  const client = getPortalClient();

  return (
    <div className="mk flex min-h-screen flex-col bg-[#F1EDE5]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-[#0A0A09] focus:px-4 focus:py-2 focus:text-[#F1EDE5]"
      >
        Skip to content
      </a>

      <header className="border-b border-[#0A0A09]/15">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 py-5 sm:px-8">
          <Link href="/portal" aria-label="Project room home">
            <Wordmark tone="dark" compact />
          </Link>
          <PortalNav />
          <div className="hidden items-baseline gap-5 lg:flex">
            {client.hasMarketingDashboard && (
              <Link
                href="/dashboard"
                className="mk-label text-[#1A1310]/55 transition-colors hover:text-[#0A0A09]"
              >
                Marketing Dashboard
              </Link>
            )}
            <span className="mk-label text-[#4B1719]">{client.restaurant}</span>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-14 sm:px-8 sm:py-16">
        {children}
      </main>

      <footer className="border-t border-[#0A0A09]/15">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-baseline justify-between gap-4 px-5 py-6 sm:px-8">
          <p className="mk-label text-[#1A1310]/45">
            The Pass by Madison Four
          </p>
          <p className="text-[13px] text-[#1A1310]/60">
            Questions, anytime:{" "}
            <a
              href="mailto:hello@madisonfour.com"
              className="border-b border-[#4B1719]/30 text-[#4B1719] transition-colors hover:border-[#4B1719]"
            >
              hello@madisonfour.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
