import Image from "next/image";

/** The photographed paper stock, and the geometry each sheet needs. */
const STOCK = {
  "menu-card": { src: "/images/house/paper-menu-card.png", w: 1384, h: 975 },
  "quote-card": { src: "/images/house/paper-quote-card.png", w: 1118, h: 1127 },
  receipt: { src: "/images/house/paper-receipt.png", w: 489, h: 1492 },
  "label-strip": { src: "/images/house/paper-label-strip.png", w: 2079, h: 369 },
} as const;

const TAPE = {
  orange: { src: "/images/house/tape-orange.png", w: 1998, h: 328 },
  kraft: { src: "/images/house/tape-kraft.png", w: 2002, h: 323 },
} as const;

/**
 * Content lying on a real sheet of paper.
 *
 * The stock is photographed, not drawn, so the deckle and the creases
 * are the edge — the element itself has no border and no background,
 * and the art is stretched behind the content rather than the content
 * being fitted to the art. Padding is the caller's job, because how
 * much margin a sheet needs depends on what is printed on it.
 */
export function Prop({
  stock,
  className = "",
  children,
  sizes = "(max-width: 1024px) 100vw, 40vw",
}: {
  stock: keyof typeof STOCK;
  className?: string;
  children: React.ReactNode;
  sizes?: string;
}) {
  const { src, w, h } = STOCK[stock];
  return (
    <div className={`hse-prop ${className}`}>
      <Image
        src={src}
        alt=""
        aria-hidden
        width={w}
        height={h}
        quality={82}
        sizes={sizes}
        className="hse-prop-art"
      />
      {children}
    </div>
  );
}

/**
 * A strip of tape over a prop's edge. Positioned by the caller, since
 * the whole point is that no two pieces sit at the same angle.
 */
export function Tape({
  kind = "orange",
  className = "",
  width = 140,
}: {
  kind?: keyof typeof TAPE;
  className?: string;
  width?: number;
}) {
  const { src, w, h } = TAPE[kind];
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={w}
      height={h}
      quality={82}
      sizes={`${width}px`}
      style={{ width }}
      className={`hse-tape h-auto ${className}`}
    />
  );
}

/**
 * A photograph in a polaroid frame. The frame art has a knocked-out
 * window, so the picture is laid into that window by percentage and the
 * frame sits over it — which keeps the white border and the thick
 * bottom skirt intact instead of faking them with CSS.
 */
export function Polaroid({
  src,
  alt,
  className = "",
  sizes = "(max-width: 1024px) 100vw, 40vw",
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`relative aspect-[1213/893] ${className}`}>
      {/* The frame was photographed slightly off-square, so its opening
          is a quadrilateral and the rectangle that contains it pokes
          past the border in places. The fix is to fill that rectangle
          with the frame's own stock colour and inset the picture within
          it: anything the border does not cover reads as more polaroid
          rather than as a hole. */}
      <div className="absolute left-[4.8%] top-[6.7%] h-[70.7%] w-[90.2%] bg-[#E8E4DA]">
        <div className="absolute inset-[3.5%] overflow-hidden">
          <Image src={src} alt={alt} fill quality={84} sizes={sizes} className="object-cover" />
        </div>
      </div>
      <Image
        src="/images/house/polaroid-frame.png"
        alt=""
        aria-hidden
        fill
        quality={86}
        sizes={sizes}
        className="pointer-events-none object-fill drop-shadow-[0_12px_20px_rgba(22,19,15,0.22)]"
      />
      {children}
    </div>
  );
}
