import { qrSvgPath } from "@/lib/app/qr";

/** A QR code as SVG, drawn on the server. Dark on white so every camera reads it. */
export function QrCode({ value, size = 168, label }: { value: string; size?: number; label: string }) {
  const { path, size: n } = qrSvgPath(value);
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges" style={{ background: "#fff", borderRadius: 8, display: "block" }}>
      <path d={path} fill="#111" />
    </svg>
  );
}
