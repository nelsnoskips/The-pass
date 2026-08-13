import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { nav } from "@/lib/site";

export default function NotFound() {
  return (
    <>
      <Header />
      <main
        id="main"
        className="paper-grain flex min-h-[70svh] items-center bg-bone px-6 pt-32 pb-20 md:px-10"
      >
        <div className="mx-auto max-w-[720px]">
          <p className="micro text-oxblood">404</p>
          <h1 className="display mt-4 text-[clamp(2.4rem,6vw,4.5rem)]">
            That page rebelled
          </h1>
          <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-ink-mute">
            It isn&apos;t here. The rest of the house is still open.
          </p>
          <ul className="mt-10 flex flex-wrap gap-3">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="micro border border-ink/25 px-6 py-3.5 transition-colors duration-[var(--dur-micro)] hover:border-ink hover:bg-ink hover:text-bone"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
