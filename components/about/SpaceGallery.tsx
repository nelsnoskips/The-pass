"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const GALLERY_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop",
    alt: "Marble and clean surfaces",
    className: "h-64 md:h-80",
  },
  {
    src: "https://images.unsplash.com/photo-1596178060810-7621a7e5a00d?q=80&w=1200&auto=format&fit=crop",
    alt: "Fresh flowers and botanicals",
    className: "h-80 md:h-96",
  },
  {
    src: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=1200&auto=format&fit=crop",
    alt: "Skincare and texture",
    className: "h-72 md:h-84",
  },
  {
    src: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=1200&auto=format&fit=crop",
    alt: "Minimalist interior",
    className: "h-56 md:h-64",
  },
  {
    src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop",
    alt: "Spa tools and details",
    className: "h-64 md:h-72",
  },
];

export function SpaceGallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-editorial mb-12 text-center text-3xl text-[#0f281e] md:text-4xl"
        >
          The Space
        </motion.h2>

        {/* Masonry-style grid: 2 cols on small, 3 on large; varying heights */}
        <div className="columns-2 gap-4 md:columns-3 md:gap-6">
          {GALLERY_IMAGES.map((img, i) => (
            <ParallaxImage key={i} index={i} scrollYProgress={scrollYProgress} {...img} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ParallaxImage({
  src,
  alt,
  className,
  index,
  scrollYProgress,
}: {
  src: string;
  alt: string;
  className: string;
  index: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const speeds = [0.15, -0.2, 0.1, -0.15, 0.2, -0.1];
  const speed = speeds[index % speeds.length];
  const y = useTransform(scrollYProgress, [0, 1], [0, 80 * speed]);

  return (
    <motion.div
      style={{ y }}
      className="mb-4 break-inside-avoid md:mb-6"
    >
      <img
        src={src}
        alt={alt}
        className={`w-full object-cover ${className}`}
      />
    </motion.div>
  );
}
