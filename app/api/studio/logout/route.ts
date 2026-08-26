import { NextResponse } from "next/server";
import { endSession } from "@/lib/studio/session";
import { siteLink } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await endSession();
  return NextResponse.redirect(siteLink(req, "/studio/login"), 303);
}
