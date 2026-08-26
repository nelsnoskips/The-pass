/**
 * The site's public address.
 *
 * Behind Netlify's proxy an incoming request's URL carries the internal
 * deploy origin (main--something.netlify.app), not the domain the
 * visitor typed. Building redirects and emailed links from it mostly
 * works — the deploy URL serves the same site — but the session cookie
 * then belongs to that host, so a sign-in link lands you authenticated
 * on netlify.app and still signed out on madisonfour.com.
 *
 * Netlify sets URL to the site's primary address. SITE_URL overrides it
 * for anywhere that does not, and the request origin is the last
 * resort so local development keeps working.
 */
export function siteUrl(req: Request): string {
  const configured = process.env.SITE_URL ?? process.env.URL;
  if (configured) return configured.replace(/\/+$/, "");

  // x-forwarded-host is what a proxy sets to the host the client asked
  // for; prefer it over the rewritten request URL.
  const fwdHost = req.headers.get("x-forwarded-host");
  if (fwdHost) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${fwdHost}`;
  }

  return new URL(req.url).origin;
}

export function siteLink(req: Request, path: string): URL {
  return new URL(path, `${siteUrl(req)}/`);
}
