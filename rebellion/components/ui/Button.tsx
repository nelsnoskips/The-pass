import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "solid" | "outline" | "outlineLight" | "ghost";

const base =
  "micro inline-flex items-center justify-center gap-2 px-7 py-4 " +
  "transition-[background-color,color,border-color,transform] " +
  "duration-[var(--dur-micro)] ease-[var(--ease-ui)] active:translate-y-px";

const variants: Record<Variant, string> = {
  solid: "bg-oxblood text-bone hover:bg-[#8d343d]",
  outline: "border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-bone",
  outlineLight:
    "border border-bone/40 text-bone hover:border-bone hover:bg-bone hover:text-ink",
  ghost: "text-ink hover:text-oxblood px-0 py-0",
};

export function Button({
  href,
  variant = "solid",
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)} {...rest}>
      {children}
    </Link>
  );
}

/**
 * The recurring editorial link: small caps label, arrow, oxblood underline that
 * extends on hover. Used at the foot of every card and panel.
 */
export function ArrowLink({
  href,
  children,
  tone = "dark",
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "micro group inline-flex items-center gap-2",
        tone === "dark" ? "text-oxblood" : "text-bone",
        className,
      )}
    >
      <span
        className={cn(
          "border-b pb-1",
          tone === "dark" ? "border-oxblood/40" : "border-bone/40",
        )}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="translate-y-px transition-transform duration-[var(--dur-micro)] ease-[var(--ease-ui)] group-hover:translate-x-1"
      >
        →
      </span>
    </Link>
  );
}
