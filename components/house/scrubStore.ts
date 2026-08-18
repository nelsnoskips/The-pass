/**
 * Hero scrub progress, shared between the layers that answer to it.
 *
 * The rotisserie film and the bird counter are in different branches of
 * the tree — one in the hero, one in the masthead — and threading a
 * context through the page for a single number that changes sixty times
 * a second would re-render half the document. A module-scoped store lets
 * each subscriber take the value and update only itself.
 *
 * 0 is the top of the page; 1 is the hero fully resolved.
 */

let progress = 0;
const listeners = new Set<(p: number) => void>();

export function setScrubProgress(p: number): void {
  // Sub-perceptual changes are not worth a render.
  if (Math.abs(p - progress) < 0.004) return;
  progress = p;
  for (const l of listeners) l(p);
}

export function subscribeScrub(fn: (p: number) => void): () => void {
  listeners.add(fn);
  fn(progress);
  return () => {
    listeners.delete(fn);
  };
}
