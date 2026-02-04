"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center font-medium tracking-wide transition-all duration-200 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3C34] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] hover:scale-[1.02]";
    const variants = {
      primary:
        "bg-[#1A3C34] text-[#F9F7F2] shadow-[0_4px_14px_rgba(26,60,52,0.25)] hover:bg-[#152e28] hover:shadow-[0_6px_20px_rgba(26,60,52,0.3)]",
      secondary:
        "bg-[#F9F7F2] text-[#1A3C34] border border-[#D4DCD6] shadow-sm hover:bg-[#D4DCD6]/30 hover:border-[#1A3C34]/40",
      ghost:
        "text-[#1A3C34]/80 hover:bg-[#D4DCD6]/40 hover:text-[#1A3C34]",
    };
    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-12 px-8 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
