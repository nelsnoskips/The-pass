import { appIconResponse } from "@/components/app/icon-image";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return appIconResponse(site, 192, new URL(req.url).searchParams.has("maskable"));
}
