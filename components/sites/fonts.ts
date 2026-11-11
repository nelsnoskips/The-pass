import { Fraunces, Hanken_Grotesk } from "next/font/google";

/* The Classic theme's pairing. Shared by the live site and the editor's
   preview so the two can never drift. */
export const siteDisplay = Fraunces({ variable: "--font-site-display", subsets: ["latin"], display: "swap" });
export const siteBody = Hanken_Grotesk({ variable: "--font-site-body", subsets: ["latin"], display: "swap" });
