import Image from "next/image";
import clsx from "clsx";
import type { Shot } from "@/lib/blue";

/**
 * A photograph in its frame.
 *
 * Every crop is declared as a focal position on the shot itself rather
 * than left to the default centre, because the supplied stills are
 * portrait and most of these containers are not: an unmanaged crop takes
 * the top off a singer's head at the first breakpoint that changes.
 */
export function BlueFrame({
  shot,
  className,
  sizes,
  priority = false,
  children,
}: {
  shot: Shot;
  className?: string;
  sizes: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={clsx("blu-frame", className)}>
      <Image
        src={shot.src}
        alt={shot.alt}
        fill
        sizes={sizes}
        quality={86}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        style={{ objectPosition: shot.pos ?? "center" }}
      />
      {children}
    </div>
  );
}
