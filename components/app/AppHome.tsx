"use client";

import Link from "next/link";
import { appTiles, type AppFeatures, type TileId } from "@/lib/app/config";
import { useAppConfig } from "./AppContext";
import { AppIcon } from "./AppIcon";
import { InstallPrompt } from "./InstallPrompt";

const TILE_ICON: Record<TileId, string> = {
  order: "M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0",
  reserve: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  menu: "M6 3v8a2 2 0 0 0 2 2v8M10 3v8M8 3v8M16 21V3c2 1 3 4 3 7s-1 4-3 4",
  loyalty: "M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8z",
  gift_cards: "M3 8h18v4H3zM5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-3-5 0M12 8c1.5-3 5-3 5 0",
  hours: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  call: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  instagram: "M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM17 7h.01",
};

/** The app's home: announcement, name and welcome, then the owner's buttons. */
export function AppHome({ base, q, features, preview }: { base: string; q: string; features: AppFeatures; preview: boolean }) {
  const c = useAppConfig();
  const tiles = appTiles(c, features, base, q);
  return (
    <>
      {c.announcement && <p className="papp-announce">{c.announcement}</p>}
      <section className="papp-hero">
        <AppIcon config={c} size={64} />
        <h1>{c.name}</h1>
        {c.welcome && <p>{c.welcome}</p>}
      </section>
      {!preview && <InstallPrompt name={c.name} />}
      {tiles.length > 0 ? (
        <ul className="papp-tiles" aria-label="What you can do">
          {tiles.map((t) => {
            const inner = (
              <>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={TILE_ICON[t.id]} /></svg>
                <span>{t.label}</span>
              </>
            );
            return (
              <li key={t.id}>
                {t.external
                  ? <a href={t.href} className="papp-tile" {...(t.id === "instagram" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{inner}</a>
                  : <Link href={t.href} className="papp-tile" prefetch={t.href.includes("/app/") ? undefined : false}>{inner}</Link>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="papp-note">Nothing to show here yet.</p>
      )}
    </>
  );
}
