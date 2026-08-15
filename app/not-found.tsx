import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A09] px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#B79A68]">404</p>
      <h1 className="font-display mt-6 max-w-[520px] text-[34px] leading-[1.1] text-[#F1EDE5] sm:text-[44px]">
        This table isn&rsquo;t set.
      </h1>
      <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-[#F1EDE5]/60">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="bg-[#F1EDE5] px-6 py-3 text-[12px] uppercase tracking-[0.18em] text-[#0A0A09] transition-opacity hover:opacity-85"
        >
          Back to the homepage
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 py-3 text-[12px] uppercase tracking-[0.18em] text-[#F1EDE5]/70 transition-colors hover:text-[#F1EDE5]"
        >
          <span aria-hidden className="h-1 w-1 rounded-full bg-[#83A978]" />
          Client login
        </Link>
      </div>
    </div>
  );
}
