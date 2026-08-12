/**
 * Circular 0–100 score ring. Meaning is not carried by color alone — the
 * numeric score and label are always rendered beside it.
 */
export function ScoreRing({
  value,
  size = 96,
  stroke = 8,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * c;
  const color = value >= 80 ? "var(--emerald)" : value >= 60 ? "var(--cobalt)" : value >= 40 ? "var(--warning)" : "var(--error)";
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Pass Score ${value} out of 100`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="tnum"
        style={{ fontSize: size * 0.3, fontWeight: 700, fill: "var(--ink)" }}
      >
        {value}
      </text>
    </svg>
  );
}
