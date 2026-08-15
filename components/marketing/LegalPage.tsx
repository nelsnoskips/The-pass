import type { ReactNode } from "react";

/** Shared shell for legal pages: dark title band under the fixed header,
 *  then a bone reading column. */
export function LegalPage({
  label,
  title,
  updated,
  children,
}: {
  label: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-[#F1EDE5]">
      <header className="bg-[#0A0A09] px-5 pb-16 pt-36 sm:px-8 sm:pt-44">
        <div className="mx-auto max-w-[760px]">
          <p className="mk-label text-[#B79A68]">{label}</p>
          <h1 className="mt-5 font-editorial text-[42px] leading-[1.05] text-[#F1EDE5] sm:text-[56px]">
            {title}
          </h1>
          <p className="mt-5 text-[13px] text-[#F1EDE5]/50">Last updated {updated}</p>
        </div>
      </header>
      <article className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[760px] space-y-10">{children}</div>
      </article>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-editorial text-[26px] leading-tight text-[#0A0A09]">
        {heading}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-[#0A0A09]/75">
        {children}
      </div>
    </section>
  );
}
