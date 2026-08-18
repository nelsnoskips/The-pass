"use client";

import { useCallback, useState } from "react";
import { Waveform } from "./Waveform";

/**
 * An image slot that is never empty.
 *
 * Every photograph on this page is a file that may not have been shot
 * yet. Rather than ship broken frames or hard-code a flag someone has to
 * remember to flip, each slot renders its own composed stand-in and
 * swaps to the photograph the moment the file exists at that path. The
 * page is complete either way, and uploading the shoot is the entire
 * deployment step.
 */

export type PlateProps = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** What to draw when the file is not there. Defaults to a signal card. */
  fallback?: React.ReactNode;
};

export function Plate({ src, alt, className, imgClassName, fallback }: PlateProps) {
  const [missing, setMissing] = useState(false);

  /* A file that 404s during the server-rendered HTML has already failed
     by the time React attaches its onError handler, so the handler never
     fires and the slot is left showing a broken frame. Checking the
     element the moment it is attached catches exactly that case. */
  const attach = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth === 0) setMissing(true);
  }, []);

  if (missing) {
    return (
      <div className={className}>
        {fallback ?? <SignalCard label={alt} />}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Plain img rather than next/image: these are art-directed cut-outs
          on transparent grounds, sized by their container, and half of
          them will not exist at build time. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={attach}
        src={src}
        alt={alt}
        className={imgClassName}
        onError={() => setMissing(true)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

/**
 * The stand-in: the room's own ground with the signal running through
 * it and the shot named in the corner. It reads as a held frame rather
 * than as a missing asset.
 */
export function SignalCard({ label }: { label: string }) {
  return (
    <div className="fbk-griddle relative flex h-full w-full items-center justify-center overflow-hidden border border-[rgba(232,225,211,0.12)]">
      <Waveform
        className="h-1/3 w-3/4 text-[rgba(232,225,211,0.35)]"
        cycles={6}
        amplitude={0.55}
        strokeWidth={1.25}
        height={60}
      />
      <p className="fbk-label absolute bottom-2 left-2 right-2 truncate text-[10px] text-[rgba(232,225,211,0.4)]">
        {label}
      </p>
    </div>
  );
}
