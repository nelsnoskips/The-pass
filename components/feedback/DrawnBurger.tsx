"use client";

/**
 * The burger, drawn.
 *
 * This is what stands in every image slot before the photography lands,
 * and it is built to be presentable rather than apologetic: the same
 * five frames as the shoot, in the room's own palette, with each
 * ingredient on its own track so the knob can drop them in one at a
 * time exactly as it will with the stills.
 *
 * Once `public/images/feedback/stage-*.png` exists, `Plate` uses the
 * photograph instead and none of this renders. Nothing else changes.
 */

export type DrawnBurgerProps = {
  /** 0—4, matching the five frames. */
  stage: number;
  /** How far through the current frame, 0—1. Drives the drops. */
  progress?: number;
  className?: string;
};

/**
 * The cheese drape: a lip that runs the width of the patty with drips
 * of varying length hanging off it. Built rather than hand-drawn,
 * because melted cheese scallops and a hand-written sawtooth reads as
 * teeth.
 */
const CHEESE_PATH = (() => {
  const left = 116;
  const right = 524;
  const top = 300;
  const lip = 312;
  const bumps = 9;
  const width = (right - left) / bumps;
  let d = `M${left} ${top} q204 -46 408 0 L${right} ${lip}`;
  for (let i = 0; i < bumps; i += 1) {
    const from = right - i * width;
    const to = right - (i + 1) * width;
    const drop = 13 + ((i * 7) % 3) * 10;
    d += ` C ${from - width * 0.18} ${lip + drop}, ${to + width * 0.18} ${lip + drop}, ${to} ${lip}`;
  }
  return `${d} Z`;
})();

/** Each ingredient drops on its own track, offset so they land in turn. */
function track(stage: number, progress: number, appearsAt: number, lead = 0) {
  if (stage < appearsAt) return { opacity: 0, y: -160 };
  if (stage > appearsAt) return { opacity: 1, y: 0 };
  // Landing inside its own frame: eased, and finished well before the
  // frame is, so the stage reads as settled rather than still moving.
  const t = Math.min(1, Math.max(0, (progress - lead) / (0.55 - lead)));
  const eased = 1 - Math.pow(1 - t, 3);
  return { opacity: Math.min(1, t * 2.2), y: (1 - eased) * -150 };
}

export function DrawnBurger({ stage, progress = 1, className }: DrawnBurgerProps) {
  const patty = track(stage, progress, 1);
  const onion = track(stage, progress, 2);
  const cheese = track(stage, progress, 3);
  const finish = track(stage, progress, 4);

  return (
    <svg viewBox="0 0 640 470" className={className} aria-hidden>
      <defs>
        <linearGradient id="fbk-bun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E4B878" />
          <stop offset="55%" stopColor="#C98B44" />
          <stop offset="100%" stopColor="#9C6229" />
        </linearGradient>
        <linearGradient id="fbk-bun-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C98B44" />
          <stop offset="100%" stopColor="#7E4D1B" />
        </linearGradient>
        <linearGradient id="fbk-patty" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A4520" />
          <stop offset="40%" stopColor="#3E2112" />
          <stop offset="100%" stopColor="#1C0E07" />
        </linearGradient>
        <linearGradient id="fbk-raw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C96D65" />
          <stop offset="60%" stopColor="#8E3A38" />
          <stop offset="100%" stopColor="#54201E" />
        </linearGradient>
        <linearGradient id="fbk-cheese" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7C868" />
          <stop offset="100%" stopColor="#D6811C" />
        </linearGradient>
        <radialGradient id="fbk-contact" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FF9B3A" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FF9B3A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Where the meat meets the steel: the hottest thing in frame. */}
      <ellipse cx="320" cy="412" rx="260" ry="40" fill="url(#fbk-contact)" />

      {stage === 0 ? (
        /* Frame 1 — a ball of chuck, not yet touched. */
        <g>
          <ellipse cx="320" cy="416" rx="104" ry="18" fill="#000" opacity="0.5" />
          <circle cx="320" cy="300" r="102" fill="url(#fbk-raw)" />
          <path
            d="M248 258 q42 -36 92 -28 q54 8 74 42"
            fill="none"
            stroke="#DC908A"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>
      ) : (
        <g>
          <ellipse cx="320" cy="410" rx="228" ry="18" fill="#000" opacity="0.55" />

          {/* Bottom bun — laid down with the finished frame. */}
          <g opacity={finish.opacity} transform={`translate(0 ${finish.y})`}>
            <path
              d="M104 416 q-10 -34 32 -48 q66 -22 184 -22 q118 0 184 22 q42 14 32 48 z"
              fill="url(#fbk-bun-b)"
            />
          </g>

          {/* The patty: pressed thin, with the lacy crust the whole
              concept is named for hanging off both edges. */}
          <g opacity={patty.opacity} transform={`translate(0 ${patty.y + 18})`}>
            <path
              d="M92 348 q26 -38 90 -46 q138 -18 276 0 q64 8 90 46
                 l-18 -8 -16 12 -20 -10 -18 12 -22 -8 -20 10 -24 -10 -22 10 -24 -10
                 -24 10 -22 -10 -20 10 -22 -12 -18 10 -20 -12 -16 8 z"
              fill="url(#fbk-patty)"
            />
            <path
              d="M92 348 q26 -38 90 -46 q138 -18 276 0 q64 8 90 46"
              fill="none"
              stroke="#B4652A"
              strokeWidth="7"
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>

          {/* Griddled onion, pressed down into the crust. */}
          <g opacity={onion.opacity} transform={`translate(0 ${onion.y + 6})`}>
            {[
              "M150 312 q66 -22 142 -16",
              "M244 304 q78 -24 164 -8",
              "M352 314 q62 -24 126 -8",
              "M178 322 q96 -16 192 -4",
            ].map((d, i) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke={i % 2 ? "#EFE0C6" : "#C79A5E"}
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.9"
              />
            ))}
          </g>

          {/* Double American, running over the edge on both sides. */}
          <g opacity={cheese.opacity} transform={`translate(0 ${cheese.y})`}>
            <path d={CHEESE_PATH} fill="url(#fbk-cheese)" />
          </g>

          {/* Pickles and the top bun arrive together on the last frame. */}
          <g opacity={finish.opacity} transform={`translate(0 ${finish.y})`}>
            <ellipse cx="212" cy="284" rx="42" ry="11" fill="#79882C" />
            <ellipse cx="326" cy="280" rx="44" ry="11" fill="#8B9836" />
            <ellipse cx="438" cy="285" rx="40" ry="11" fill="#79882C" />
            <path
              d="M104 276 q-6 -126 216 -130 q222 4 216 130 z"
              fill="url(#fbk-bun)"
            />
            <path
              d="M168 196 q152 -54 304 0"
              fill="none"
              stroke="#F3D69F"
              strokeWidth="12"
              strokeLinecap="round"
              opacity="0.4"
            />
          </g>
        </g>
      )}
    </svg>
  );
}
