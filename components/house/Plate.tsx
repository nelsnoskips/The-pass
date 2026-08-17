import Image from "next/image";
import { existsSync } from "fs";
import { join } from "path";

/**
 * A photograph slot that never looks broken. If the file has landed in
 * public/images/house it renders; if not, the space stays reserved and
 * captioned so the layout reads finished while the shoot catches up.
 * Checked at build time, so there is no runtime cost.
 */
export function Plate({
  src,
  alt,
  label,
  className = "",
  imgClassName = "object-cover",
  sizes = "(max-width: 1024px) 100vw, 50vw",
  priority = false,
}: {
  src: string;
  alt: string;
  label: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const present = existsSync(join(process.cwd(), "public", src));

  return (
    <div className={`hse-plate ${present ? "" : "hse-plate-empty"} ${className}`}>
      {present ? (
        <Image src={src} alt={alt} fill quality={86} sizes={sizes} priority={priority} className={imgClassName} />
      ) : (
        <p className="hse-label px-4 text-center text-[#16130F]/40">{label}</p>
      )}
    </div>
  );
}
