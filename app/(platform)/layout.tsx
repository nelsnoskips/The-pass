import type { Metadata } from "next";
import "./platform.css";

export const metadata: Metadata = {
  title: "The Pass",
  robots: { index: false, follow: false },
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <div className="pf">{children}</div>;
}
