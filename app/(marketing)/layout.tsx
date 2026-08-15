import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ScrollMotion } from "@/components/marketing/ScrollMotion";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mk bg-[#0A0A09]">
      <script
        // Switch the hero to its cinematic layout before first paint so
        // the still layout never flashes. ScrollMotion repeats this
        // check idempotently and picks the engine.
        dangerouslySetInnerHTML={{
          __html:
            "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('mk-cine')}catch(e){}",
        }}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-[#F1EDE5] focus:px-4 focus:py-2 focus:text-[#0A0A09]"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <ScrollMotion />
      <main id="main-content">{children}</main>
      <MarketingFooter />
    </div>
  );
}
