"use client";

import { useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

interface MembershipCardProps {
  title: string;
  price?: string;
  description: string;
  variant?: "glass" | "black";
}

export function MembershipCard({
  title,
  price,
  description,
  variant = "glass",
}: MembershipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const relX = (e.clientX - centerX) / (rect.width / 2);
    const relY = (e.clientY - centerY) / (rect.height / 2);
    x.set(relY * -8);
    y.set(relX * 8);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const rotateX = useMotionTemplate`perspective(800px) rotateX(${x}deg)`;
  const rotateY = useMotionTemplate`perspective(800px) rotateY(${y}deg)`;
  const transform = useMotionTemplate`${rotateX} ${rotateY}`;

  const isBlack = variant === "black";

  return (
    <motion.div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform, aspectRatio: "1.586/1" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative w-full max-w-[340px] flex-shrink-0 overflow-hidden rounded-2xl"
    >
      {/* Base: matte frosted glass or black metal */}
      <div
        className={`absolute inset-0 rounded-2xl ${
          isBlack
            ? "bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-[#1a1a1a]"
            : "bg-[#F9F7F2]/[0.08] backdrop-blur-xl"
        } border ${
          isBlack
            ? "border-[#2a2a2a]"
            : "border-[#F9F7F2]/15"
        }`}
      />
      {/* Noise texture */}
      <div
        className="absolute inset-0 rounded-2xl opacity-[0.4] mix-blend-soft-light"
        style={{ backgroundImage: `url("${NOISE_SVG}")` }}
      />
      {/* Holographic shimmer (gradient that moves on hover) */}
      {!isBlack && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0"
          animate={{ opacity: isHovered ? 0.35 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(212,175,55,0.15) 45%, rgba(249,247,242,0.2) 50%, rgba(212,175,55,0.12) 55%, transparent 60%)",
            backgroundSize: "200% 200%",
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={
              isHovered
                ? { backgroundPosition: ["0% 0%", "100% 100%"] }
                : { backgroundPosition: "0% 0%" }
            }
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
            style={{
              background:
                "linear-gradient(120deg, transparent 30%, rgba(212,175,55,0.08) 50%, transparent 70%)",
              backgroundSize: "200% 200%",
            }}
          />
        </motion.div>
      )}
      {/* Black card: subtle metallic edge highlight */}
      {isBlack && isHovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-60"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)",
            boxShadow: "inset 0 0 60px rgba(212,175,55,0.06)",
          }}
        />
      )}
      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-7">
        <div>
          <p className="font-editorial text-xl text-[#F9F7F2] md:text-2xl">
            {title}
          </p>
          {price && (
            <p className="mt-1 text-sm font-medium tracking-wide text-[#D4AF37]">
              {price}
            </p>
          )}
          {isBlack && (
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-[#D4AF37]/90">
              Invite Only
            </p>
          )}
        </div>
        <p className="font-sans text-sm leading-relaxed text-[#F9F7F2]/80">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
