import { reservationsAgent } from "./agents/reservations";
import { reviewsAgent } from "./agents/reviews";
import { websiteAgent } from "./agents/website";
import type { AgentSpec } from "./runner";

/** Every agent that can be run, by id. Adding an agent means adding it here. */
export const RUNNABLE_AGENTS: Record<string, () => AgentSpec> = {
  reservations: () => reservationsAgent(),
  website: () => websiteAgent(),
  reviews: () => reviewsAgent(),
};
