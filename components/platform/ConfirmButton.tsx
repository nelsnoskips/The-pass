"use client";

import type { ReactNode } from "react";

/** A submit button that asks first; cancelling leaves the form unsent. */
export function ConfirmButton({ message, className = "pf-btn small", children, formAction }: {
  message: string;
  className?: string;
  children: ReactNode;
  formAction?: (form: FormData) => void | Promise<void>;
}) {
  return (
    <button className={className} formAction={formAction} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
