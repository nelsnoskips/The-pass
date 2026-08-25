"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Native cross-fades between routes, in place of the hard cut.
 *
 * The App Router navigates on the client, so the document-level
 * `@view-transition` rule never fires — that one is for real page
 * loads. This intercepts internal navigations instead and hands the
 * router push to `document.startViewTransition`, which is the same
 * browser machinery, just driven manually.
 *
 * Nothing is imported to do it. The API is the platform's, and the
 * whole cost is one listener; browsers without it fall straight through
 * to an ordinary push and navigate exactly as before.
 *
 * It listens in the capture phase and takes the navigation over
 * outright. Next's own Link handler calls preventDefault on the way up,
 * so a listener in the bubble phase only ever sees a click that has
 * already been dealt with — the first version of this fired on nothing
 * at all. Capturing means arriving first, and arriving first means the
 * push has to be ours.
 *
 * Deliberately narrow: only plain left-clicks, only same-origin, and
 * never when the visitor has signalled intent to open elsewhere with a
 * modifier key, a middle click, a download, or a target. Anything that
 * is not obviously an in-page navigation is left alone and reaches
 * Next untouched.
 */
export function ViewTransitions() {
  const router = useRouter();

  useEffect(() => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (typeof doc.startViewTransition !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;

      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // A jump within the same document is a scroll, not a navigation.
      if (url.pathname === location.pathname && url.hash) return;

      e.preventDefault();
      e.stopPropagation();
      doc.startViewTransition!(() => {
        router.push(url.pathname + url.search + url.hash);
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return null;
}
