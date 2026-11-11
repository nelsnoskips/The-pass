import type { ReactNode } from "react";

/**
 * One button, one form, its values in hidden fields. Server-action forms
 * don't reliably send the clicked button's own name/value, so a choice
 * between several buttons must never ride on the button itself.
 */
export function FormButton({
  action, fields, className = "pf-btn small", children, disabled, title, pressed,
}: {
  action: (form: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
  pressed?: boolean;
}) {
  return (
    <form action={action} style={{ display: "contents" }}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className={className} disabled={disabled} title={title} aria-pressed={pressed}>{children}</button>
    </form>
  );
}
