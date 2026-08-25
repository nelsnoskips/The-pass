import type { Metadata } from "next";

/**
 * Every page under here is a quote for one named prospect, prepared to
 * be forwarded and printed — not a page a search engine should ever
 * surface. Set once so a future proposal inherits it even if its own
 * page forgets to.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProposalsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
