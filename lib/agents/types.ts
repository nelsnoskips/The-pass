/**
 * Pass Agents — the first step from "reporting on the marketing" to
 * "running it". An agent reads the same scoped, normalized data the
 * reports read and returns proposals: a concrete change, the evidence
 * behind it, and an honest estimate of what it should do.
 *
 * Agents propose; people approve. Nothing here writes to Google or Meta.
 * When the live connectors land, an approved proposal becomes a queued
 * mutation; until then approval is recorded and the change is made by the
 * managing strategist. Rules stay deterministic so every proposal can be
 * traced back to the numbers that produced it.
 */

export type AgentId =
  | "paid_ads"
  | "search_terms"
  | "website"
  | "local_seo"
  | "guest_marketing"
  | "guest_support";

export type AgentStatus = "live" | "planned";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  /** One line: what the agent does for the restaurant. */
  summary: string;
  status: AgentStatus;
  /** What it watches, for the roster card. */
  watches: string;
}

export type ProposalKind =
  | "shift_budget"
  | "raise_budget"
  | "check_tracking"
  | "consolidate"
  | "add_negative"
  | "add_keyword";

export type Confidence = "high" | "medium" | "low";

export interface Evidence {
  label: string;
  value: string;
}

export interface AgentProposal {
  /** Stable across renders for the same rule + entities, so a decision
   *  recorded against it survives a reload. */
  id: string;
  agent: AgentId;
  kind: ProposalKind;
  title: string;
  /** Why, in plain language. Observations, never claimed causation. */
  rationale: string;
  /** The exact change that would be made on the platform. */
  action: string;
  evidence: Evidence[];
  /** Estimated effect over 30 days, or null when it can't be estimated
   *  honestly (e.g. a tracking check). */
  impact: string | null;
  confidence: Confidence;
  /** Where to look at the underlying data. */
  href: string;
  /** Ordering weight: higher first. */
  score: number;
}

export type Decision = "approved" | "dismissed";
