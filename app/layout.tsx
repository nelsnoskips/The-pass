import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { StickyBookingFooter } from "@/components/booking/StickyBookingFooter";
import { ChatWidget } from "@/components/chat/ChatWidget";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aesthetix | The Science of Natural",
  description:
    "Medical grade results in a sanctuary setting. High-end Med Spa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable}`}
    >
      <body className="min-h-screen antialiased bg-[#F9F7F2] font-sans text-[#0f281e]">
        <Navbar />
        {children}
        <StickyBookingFooter />
        <ChatWidget />
      </body>
    </html>
  );
}
