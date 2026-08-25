import { NextResponse } from "next/server";
import { endSession } from "@/lib/studio/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await endSession();
  return NextResponse.redirect(new URL("/studio/login", req.url), 303);
}
