import type { CSSProperties } from "react";
import { iconText, textOn, type AppConfig } from "@/lib/app/config";

/** The generated icon: initials or one character, on the accent colour. Same drawing as the PNG routes. */
export function AppIcon({ config, size = 40, className }: { config: Pick<AppConfig, "icon" | "name" | "accent">; size?: number; className?: string }) {
  const text = iconText(config);
  const style: CSSProperties = {
    width: size, height: size, borderRadius: size * 0.225, background: config.accent, color: textOn(config.accent),
    display: "inline-grid", placeItems: "center", flex: "none",
    font: `600 ${Math.round(size * (text.length > 1 ? 0.4 : 0.5))}px/1 var(--font-site-display, Georgia), Georgia, serif`,
    letterSpacing: text.length > 1 ? "-0.02em" : 0,
  };
  return <span className={className} style={style} aria-hidden>{text}</span>;
}
