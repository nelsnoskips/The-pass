"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const m = window.matchMedia("(display-mode: standalone)");
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}
const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * Opened from the home screen, the app has no browser back button. When
 * a guest goes from the app to a website page (booking, ordering, gift
 * cards), this bar takes them back.
 */
export function BackToApp({ base }: { base: string }) {
  const installed = useSyncExternalStore(subscribe, standalone, () => false);
  const path = usePathname();
  if (!installed || path.startsWith(`${base}/app`)) return null;
  return (
    <Link href={`${base}/app`} className="site-backtoapp">
      <span aria-hidden>←</span> Back to the app
    </Link>
  );
}
