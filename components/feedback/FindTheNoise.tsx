"use client";

import { FEEDBACK } from "@/lib/feedback";
import { useEntered } from "./useScrollProgress";

/**
 * 07 / FIND THE NOISE — where the room is, and how to get fed.
 *
 * The loudest panel on the page is also the plainest: address, hours,
 * phone and two buttons, at a size nobody has to hunt for. Whatever
 * else the site is doing, this is the part that has to work at 11pm on
 * a phone with one bar.
 */

export function FindTheNoise() {
  const { ref, entered } = useEntered<HTMLElement>(0.25);

  return (
    <section
      ref={ref}
      id="locations"
      className="fbk-torn-t fbk-oxblood relative px-5 py-16 sm:px-8"
      aria-labelledby="find-heading"
    >
      <p className="fbk-label flex items-center gap-3 text-[rgba(232,225,211,0.8)]">
        <span className="border border-[rgba(232,225,211,0.5)] px-2 py-1">07</span>
        Find the noise
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h2 id="find-heading" className="fbk-display text-[clamp(52px,11vw,150px)]">
            Come
            <br />
            hungry.
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
          <Map drawn={entered} />

          <div>
            <p className="fbk-display text-[24px]">{FEEDBACK.address}</p>
            <p className="fbk-display text-[24px]">{FEEDBACK.city}</p>

            <p className="fbk-label mt-8 text-[rgba(232,225,211,0.7)]">Hours</p>
            <p className="fbk-mono mt-1 text-[14px]">{FEEDBACK.hours}</p>

            <p className="fbk-label mt-6 text-[rgba(232,225,211,0.7)]">Phone</p>
            <a
              href={`tel:${FEEDBACK.phone.replace(/[^0-9]/g, "")}`}
              className="fbk-mono mt-1 block text-[14px] underline underline-offset-4"
            >
              {FEEDBACK.phone}
            </a>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="fbk-btn fbk-btn-ghost"
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  `${FEEDBACK.address} ${FEEDBACK.city}`,
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Get directions
              </a>
              <a className="fbk-btn fbk-btn-ghost" href="/feedback/order">
                Order pickup
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The block, drawn as a blueprint rather than embedded as a map tile:
 * no third-party script, no consent banner, no layout shift, and it
 * matches the room. The real map is one tap away on the button.
 */
function Map({ drawn }: { drawn: boolean }) {
  return (
    <svg
      viewBox="0 0 320 200"
      className="w-full max-w-[360px]"
      role="img"
      aria-label={`Map: ${FEEDBACK.address}, between ${FEEDBACK.crossStreets.join(" and ")}`}
    >
      <g
        stroke="rgba(232,225,211,0.45)"
        fill="none"
        strokeWidth="1"
        style={{
          strokeDasharray: 600,
          strokeDashoffset: drawn ? 0 : 600,
          transition: "stroke-dashoffset 1200ms ease-out",
        }}
      >
        <path d="M0 58 L320 34" />
        <path d="M0 150 L320 132" />
        <path d="M236 0 L262 200" />
        <path d="M96 0 L74 200" />
        <rect x="118" y="70" width="86" height="48" />
      </g>
      <text x="118" y="26" className="fbk-mono" fontSize="9" fill="rgba(232,225,211,0.7)">
        {FEEDBACK.crossStreets[0]}
      </text>
      <text x="130" y="176" className="fbk-mono" fontSize="9" fill="rgba(232,225,211,0.7)">
        {FEEDBACK.crossStreets[1]}
      </text>
      <g
        style={{
          opacity: drawn ? 1 : 0,
          transform: drawn ? "none" : "translateY(-10px)",
          transition: "opacity 400ms ease 900ms, transform 400ms ease 900ms",
        }}
      >
        <circle cx="161" cy="94" r="19" fill="none" stroke="#E8E1D3" strokeWidth="2" />
        <text
          x="161"
          y="98"
          textAnchor="middle"
          className="fbk-mono"
          fontSize="11"
          fill="#E8E1D3"
        >
          FB
        </text>
      </g>
    </svg>
  );
}
