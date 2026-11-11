import { NextResponse } from "next/server";
import { endMemberSession } from "@/lib/platform/session";
import { siteLink } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await endMemberSession();
  return NextResponse.redirect(siteLink(req, "/login"), 303);
}
