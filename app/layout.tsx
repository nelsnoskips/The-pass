import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
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

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Pass — Restaurant Marketing Intelligence",
  description:
    "Every restaurant location. Every campaign. Every meaningful result. One clear view.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
    <html lang="en" className={`${dmSerif.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen">
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
        </div>
        <Suspense fallback={null}>
          <MobileNav />
        </Suspense>
      </body>
    </html>
  );
}
