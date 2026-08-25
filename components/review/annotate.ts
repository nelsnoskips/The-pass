/**
 * The bit that reaches into the mock.
 *
 * The mock is served from the same origin as this page (/spec/<name>),
 * which is what makes any of this possible: a same-origin iframe can be
 * read and written from the parent, so the annotation layer is injected
 * rather than built into every mock. Nothing has to be added to a mock
 * to make it reviewable.
 */

/** A CSS path stable enough to find the same element on a re-render. */
export function selectorFor(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;

  while (node && node.nodeType === 1 && parts.length < 12) {
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    const tag = node.tagName.toLowerCase();
    if (tag === "html" || tag === "body") {
      parts.unshift(tag);
      break;
    }
    const parent: Element | null = node.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const sameTag = Array.from(parent.children).filter(
      (c) => c.tagName === node!.tagName,
    );
    parts.unshift(
      sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(node) + 1})` : tag,
    );
    node = parent;
  }

  return parts.join(" > ");
}

export function resolve(doc: Document, selector: string | null): Element | null {
  if (!selector) return null;
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

/** Where inside the element the click landed, as a fraction of its box. */
export function offsetPct(el: Element, clientX: number, clientY: number) {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return { xPct: 50, yPct: 50 };
  return {
    xPct: clamp(((clientX - r.left) / r.width) * 100),
    yPct: clamp(((clientY - r.top) / r.height) * 100),
  };
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export const PIN_STYLES = `
  .pass-a-hover { outline: 2px dashed #b79a68 !important; outline-offset: 2px !important; cursor: crosshair !important; }
  .pass-a-editing { outline: 2px solid #2f6f4f !important; outline-offset: 2px !important; background: rgba(47,111,79,.06) !important; }
  .pass-a-pin {
    position: absolute; z-index: 2147483000;
    width: 26px; height: 26px; margin: -13px 0 0 -13px;
    border-radius: 50% 50% 50% 2px;
    background: #b79a68; color: #14110d;
    font: 600 12px/26px ui-sans-serif, system-ui, sans-serif;
    text-align: center; cursor: pointer;
    box-shadow: 0 2px 10px rgba(0,0,0,.35);
    transform: rotate(-45deg);
  }
  .pass-a-pin > span { display: block; transform: rotate(45deg); }
  .pass-a-pin[data-kind="edit"] { background: #2f6f4f; color: #fff; }
  .pass-a-pin[data-active="1"] { outline: 3px solid rgba(183,154,104,.45); }
  .pass-a-armed, .pass-a-armed * { cursor: crosshair !important; }
`;

export type Draft = {
  id: string;
  kind: "comment" | "edit";
  pagePath: string;
  selector: string;
  xPct: number;
  yPct: number;
  originalText?: string;
  suggestedText?: string;
  body: string;
  /** Short label so the sidebar can say what was pinned. */
  context: string;
};

export function shortText(el: Element, max = 70): string {
  // innerText rather than textContent: a headline broken with <br>
  // concatenates into "Your buildingis alreadytalking" under
  // textContent, because it has no notion of rendered line breaks.
  const raw = (el as HTMLElement).innerText ?? el.textContent ?? "";
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length === 0) return `<${el.tagName.toLowerCase()}>`;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
