"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionEmail } from "./session";
import { createClient, createProject, openRound, setCommentResolved, setStage } from "./clients";
import { RESERVED_SLUGS, slugify, upsertProposal } from "./proposals";
import type { ProjectStage, ProposalLineItem } from "./types";

/**
 * Every action re-checks the session. The page already redirected an
 * unauthenticated visitor, but a page guard is not an authorization
 * check — a form post does not go through the page.
 */
async function requireStudio() {
  const email = await getSessionEmail();
  if (!email) redirect("/studio/login");
  return email;
}

const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v.length ? v : null;
};

const num = (f: FormData, k: string) => {
  const v = str(f, k);
  if (!v) return null;
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export async function addClientAction(form: FormData) {
  await requireStudio();
  const name = str(form, "name");
  if (!name) return;
  const client = await createClient({
    name,
    contactName: str(form, "contact_name"),
    contactEmail: str(form, "contact_email"),
    segment: str(form, "segment"),
  });
  if (client && str(form, "project_name")) {
    await createProject({
      clientId: client.id,
      name: str(form, "project_name")!,
      mockPath: str(form, "mock_path"),
      monthlyFee: num(form, "monthly_fee"),
    });
  }
  revalidatePath("/studio");
  redirect("/studio");
}

export async function openRoundAction(form: FormData) {
  await requireStudio();
  const id = str(form, "project_id");
  if (!id) return;
  await openRound(id, str(form, "note"));
  revalidatePath(`/studio/projects/${id}`);
  revalidatePath("/studio");
}

export async function setStageAction(form: FormData) {
  await requireStudio();
  const id = str(form, "project_id");
  const stage = str(form, "stage") as ProjectStage | null;
  if (!id || !stage) return;
  await setStage(id, stage);
  revalidatePath(`/studio/projects/${id}`);
  revalidatePath("/studio");
}

export async function resolveCommentAction(form: FormData) {
  await requireStudio();
  const id = str(form, "comment_id");
  const projectId = str(form, "project_id");
  if (!id) return;
  await setCommentResolved(id, str(form, "resolved") === "1");
  if (projectId) revalidatePath(`/studio/projects/${projectId}`);
  revalidatePath("/studio");
}

/**
 * Line items arrive as three parallel arrays rather than a nested
 * structure, because that is what a plain HTML form can express. Rows
 * where the label is blank are dropped — an empty row is how someone
 * signals they did not want it, not a row of empty strings.
 */
export async function saveProposalAction(form: FormData) {
  await requireStudio();

  const company = str(form, "company");
  const headline = str(form, "headline");
  if (!company || !headline) return;

  const labels = form.getAll("item_label").map(String);
  const lists = form.getAll("item_list").map(String);
  const yours = form.getAll("item_yours").map(String);
  const highlights = new Set(form.getAll("item_highlight").map(String));

  const lineItems: ProposalLineItem[] = labels
    .map((label, i) => ({
      item: label.trim(),
      list: (lists[i] ?? "").trim(),
      yours: (yours[i] ?? "").trim(),
      highlight: highlights.has(String(i)),
    }))
    .filter((r) => r.item.length > 0);

  const slug = str(form, "slug") ?? slugify(company);

  // A hand-built page under the same name would shadow this one, so
  // refuse rather than save something that can never be opened.
  if (RESERVED_SLUGS.has(slug)) {
    redirect(`/studio/proposals/new?taken=${encodeURIComponent(slug)}`);
  }

  await upsertProposal({
    slug,
    company,
    contactName: str(form, "contact_name"),
    headline,
    intro: str(form, "intro"),
    monthlyFee: num(form, "monthly_fee"),
    lineItems,
    includes: str(form, "includes"),
    footnote: str(form, "footnote"),
    pullquote: str(form, "pullquote"),
    validDays: num(form, "valid_days") ?? 30,
  });

  revalidatePath(`/proposals/${slug}`);
  revalidatePath("/studio");
  redirect(`/proposals/${slug}`);
}
