/**
 * While a platform page loads: the shell stays, and quiet shapes stand
 * where the heading, numbers and panels will be.
 */
export default function Loading() {
  return (
    <div className="pf-skel" role="status" aria-live="polite" aria-busy="true">
      <span className="pf-sr">Loading…</span>
      <i className="h" />
      <div className="row"><i /><i /><i /></div>
      <i className="panel" />
    </div>
  );
}
