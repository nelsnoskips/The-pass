/**
 * The Project Room: data layer for the design-client portal.
 *
 * Like lib/auth.ts, this ships seeded so the portal is real and testable
 * end to end. The demo client is Santorini by Georgios — the same
 * restaurant seeded in the marketing dashboard — mid-way through an
 * Opening engagement. Production replaces getPortalClient() with a real
 * session provider and the seeded project with studio-managed records;
 * nothing outside this module changes.
 */

export type MilestoneStatus = "complete" | "current" | "upcoming";

export type Milestone = {
  key: string;
  title: string;
  status: MilestoneStatus;
  /** What this stage means for the client, in one line. */
  detail: string;
  /** The payment attached to this stage, if any. */
  payment?: string;
  /** Date reached (complete) or expected (upcoming), display-ready. */
  date?: string;
};

export type RoundStatus = "current" | "superseded" | "approved";

export type DesignRound = {
  number: number;
  title: string;
  postedAt: string;
  status: RoundStatus;
  stagingUrl: string;
  /** What changed since the previous round. */
  note: string;
};

export type InvoiceStatus = "paid" | "open" | "upcoming";

export type Invoice = {
  id: string;
  label: string;
  amount: number;
  status: InvoiceStatus;
  date: string;
  /** Hosted invoice URL (Stripe) once issued. */
  hostedUrl?: string;
};

export type PortalProject = {
  package: string;
  packagePrice: number;
  restaurant: string;
  startedAt: string;
  targetLaunch: string;
  milestones: Milestone[];
  rounds: DesignRound[];
  invoices: Invoice[];
};

export type PortalClient = {
  name: string;
  restaurant: string;
  email: string;
  /** Set when the client also runs The Pass marketing dashboard. */
  hasMarketingDashboard: boolean;
};

export const STUDIO_EMAIL = "hello@madisonfour.com";

const CLIENT: PortalClient = {
  name: "Georgios Alexopoulos",
  restaurant: "Santorini by Georgios",
  email: "georgios@santorinibygeorgios.com",
  hasMarketingDashboard: true,
};

const PROJECT: PortalProject = {
  package: "The Opening",
  packagePrice: 4000,
  restaurant: "Santorini by Georgios",
  startedAt: "August 4",
  targetLaunch: "August 22",
  milestones: [
    {
      key: "discovery",
      title: "Discovery",
      status: "complete",
      detail:
        "Your market, your menu, and your guest journey, studied before anything is drawn.",
      payment: "Deposit, 40 percent",
      date: "August 4",
    },
    {
      key: "direction",
      title: "Design Direction",
      status: "current",
      detail:
        "Design rounds on live staging links until one feels like your room. Your approval starts the build.",
      payment: "30 percent on approval",
    },
    {
      key: "build",
      title: "Build",
      status: "upcoming",
      detail:
        "The approved direction becomes a fast, custom site with SEO and AEO engineered in.",
    },
    {
      key: "launch",
      title: "Launch",
      status: "upcoming",
      detail:
        "Final walkthrough, final payment, and the site goes live on your domain.",
      payment: "Final 30 percent",
      date: "Targeting August 22",
    },
  ],
  rounds: [
    {
      number: 1,
      title: "First plating",
      postedAt: "August 8",
      status: "superseded",
      stagingUrl: "https://round-1--santorini.thepass.studio",
      note: "Two directions: an evening, candlelit read and a brighter, whitewashed-terrace read.",
    },
    {
      number: 2,
      title: "The terrace direction, refined",
      postedAt: "August 13",
      status: "current",
      stagingUrl: "https://round-2--santorini.thepass.studio",
      note: "The terrace read carried forward, with the menu recomposed and reservations moved above the fold.",
    },
  ],
  invoices: [
    {
      id: "MF-2026-014",
      label: "Deposit · The Opening",
      amount: 1600,
      status: "paid",
      date: "Paid August 1",
    },
    {
      id: "MF-2026-015",
      label: "Design approval · The Opening",
      amount: 1200,
      status: "open",
      date: "Due on approval of your design direction",
    },
    {
      id: "MF-2026-016",
      label: "Launch · The Opening",
      amount: 1200,
      status: "upcoming",
      date: "Due at launch",
    },
  ],
};

export function getPortalClient(): PortalClient {
  return CLIENT;
}

export function getPortalProject(): PortalProject {
  return PROJECT;
}

export function getCurrentRound(project: PortalProject): DesignRound | undefined {
  return project.rounds.find((r) => r.status === "current");
}

export function getNextPayment(project: PortalProject): Invoice | undefined {
  return (
    project.invoices.find((i) => i.status === "open") ??
    project.invoices.find((i) => i.status === "upcoming")
  );
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
