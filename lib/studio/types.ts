export type ProjectStage =
  | "lead" | "proposal_sent" | "building" | "in_review" | "approved" | "live" | "archived";

export const STAGE_LABELS: Record<ProjectStage, string> = {
  lead: "Lead",
  proposal_sent: "Proposal sent",
  building: "Building",
  in_review: "In review",
  approved: "Approved",
  live: "Live",
  archived: "Archived",
};

/** The order the studio board reads in, left to right. */
export const STAGE_ORDER: ProjectStage[] = [
  "lead", "proposal_sent", "building", "in_review", "approved", "live", "archived",
];

export type Client = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  segment: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

/** One reviewable build of a project: a label the client reads and the
    path it is served from on this domain. */
export type ProjectMock = {
  label: string;
  path: string;
};

export type Project = {
  id: string;
  client_id: string;
  name: string;
  stage: ProjectStage;
  mock_path: string | null;
  /** Empty for a single-mock project, which falls back to mock_path. */
  mocks: ProjectMock[];
  live_url: string | null;
  status_token: string | null;
  monthly_fee: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewRound = {
  id: string;
  project_id: string;
  token: string;
  round: number;
  status: "open" | "submitted" | "closed";
  note: string | null;
  /** The mock label the client chose, on a round that offered several. */
  chosen: string | null;
  created_at: string;
  submitted_at: string | null;
  seen_at: string | null;
};

export type ReviewComment = {
  id: string;
  round_id: string;
  kind: "comment" | "edit";
  page_path: string;
  selector: string | null;
  x_pct: number | null;
  y_pct: number | null;
  original_text: string | null;
  suggested_text: string | null;
  body: string | null;
  author: string | null;
  resolved: boolean;
  created_at: string;
};

/** One row of a generated quote's pricing table. */
export type ProposalLineItem = {
  item: string;
  list: string;
  yours: string;
  /** Renders `yours` as the green "Included"/"Free" chip rather than plain text. */
  highlight?: boolean;
};

export type Proposal = {
  id: string;
  client_id: string | null;
  slug: string;
  company: string;
  contact_name: string | null;
  headline: string;
  intro: string | null;
  monthly_fee: string | null;
  line_items: ProposalLineItem[];
  includes: string | null;
  footnote: string | null;
  pullquote: string | null;
  valid_days: number;
  status: string;
  created_at: string;
  updated_at: string;
};
