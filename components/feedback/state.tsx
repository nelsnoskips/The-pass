"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FEEDBACK_POINT,
  PRESSURE_MAX,
  clampPressure,
  pressureLevel,
  stageIndexAt,
  type OrderLine,
} from "@/lib/feedback";
import { FeedbackAudio } from "@/lib/feedback-audio";
import { useStoredState } from "@/lib/useStoredState";
import { useReducedMotion } from "./useScrollProgress";

/* ------------------------------------------------------ pressure --- */

type PressureListener = (pressure: number) => void;

type PressureApi = {
  /** Current value, read without subscribing — for event handlers. */
  read: () => number;
  set: (next: number, source?: "scroll" | "input") => void;
  /** Per-frame updates for anything that writes to the DOM directly. */
  subscribe: (fn: PressureListener) => () => void;
  /** Discrete state, safe to render from. */
  stage: number;
  maxed: boolean;
  /** True once the visitor has taken hold of the knob themselves. */
  touched: boolean;
  reduced: boolean;
};

const PressureContext = createContext<PressureApi | null>(null);

/**
 * One number for the whole room.
 *
 * Pressure changes every frame while the visitor drags the knob or
 * scrolls the hero, and a dozen things on the page depend on it. So it
 * is deliberately *not* React state: the value lives in a ref, is
 * written to a CSS custom property on the root element, and is pushed
 * to subscribers that touch the DOM themselves. React only re-renders
 * when something discrete changes — which frame is showing, or whether
 * the room has hit maximum feedback.
 *
 * That is the difference between this page running at 60fps on a phone
 * and it running at 20.
 */
export function PressureProvider({ children }: { children: React.ReactNode }) {
  const value = useRef(0);
  const listeners = useRef(new Set<PressureListener>());
  const root = useRef<HTMLDivElement>(null);

  const [stage, setStage] = useState(0);
  const [maxed, setMaxed] = useState(false);
  const [touched, setTouched] = useState(false);
  const reduced = useReducedMotion();

  const set = useCallback((next: number, source: "scroll" | "input" = "input") => {
    const clamped = clampPressure(next);
    if (clamped === value.current) return;
    value.current = clamped;

    const level = pressureLevel(clamped);
    root.current?.style.setProperty("--fb-level", level.toFixed(4));
    bus.engine?.setPressure(level);
    listeners.current.forEach((fn) => fn(clamped));

    setStage((prev) => {
      const nextStage = stageIndexAt(clamped);
      return nextStage === prev ? prev : nextStage;
    });
    setMaxed((prev) => {
      const nextMaxed = clamped >= FEEDBACK_POINT;
      return nextMaxed === prev ? prev : nextMaxed;
    });
    if (source === "input") setTouched(true);
  }, []);

  const subscribe = useCallback((fn: PressureListener) => {
    listeners.current.add(fn);
    fn(value.current);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  /* Reduced motion arrives at the finished burger and stays there. */
  useEffect(() => {
    if (!reduced) return;
    // Deferred a frame so the room settles at full pressure as a paint
    // rather than as a second render pass during mount.
    const frame = requestAnimationFrame(() => set(PRESSURE_MAX, "scroll"));
    return () => cancelAnimationFrame(frame);
  }, [reduced, set]);

  const api = useMemo<PressureApi>(
    () => ({ read: () => value.current, set, subscribe, stage, maxed, touched, reduced }),
    [set, subscribe, stage, maxed, touched, reduced],
  );

  return (
    <PressureContext.Provider value={api}>
      <div ref={root} className="fbk fbk-grain min-h-screen">
        {children}
      </div>
    </PressureContext.Provider>
  );
}

export function usePressure(): PressureApi {
  const api = useContext(PressureContext);
  if (!api) throw new Error("usePressure must be used inside PressureProvider");
  return api;
}

/* --------------------------------------------------------- sound --- */

type SoundApi = {
  on: boolean;
  toggle: () => void;
  click: () => void;
  thump: () => void;
  swell: () => void;
};

const SoundContext = createContext<SoundApi | null>(null);

/* The sizzle has to follow the knob, and the knob is held a provider
   away from the audio engine. Rather than braid the two providers
   together — or lift a fast-changing value into React state so it can
   be passed down — both reach the one engine through this module bus.
   There is exactly one room, so there is exactly one amplifier. */
const bus: { engine: FeedbackAudio | null } = { engine: null };

/**
 * Sound is off until asked for, always. There is no autoplay, no
 * "unmute" nag, and no audio context created before the visitor's first
 * deliberate click — which is also what browsers require.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const engine = useRef<FeedbackAudio | null>(null);
  const [on, setOn] = useState(false);

  useEffect(
    () => () => {
      engine.current?.close();
      engine.current = null;
      bus.engine = null;
    },
    [],
  );

  const toggle = useCallback(() => {
    setOn((prev) => {
      if (prev) {
        engine.current?.stop();
        return false;
      }
      if (!engine.current) engine.current = FeedbackAudio.create();
      bus.engine = engine.current;
      void engine.current?.start();
      return engine.current !== null;
    });
  }, []);

  const api = useMemo<SoundApi>(
    () => ({
      on,
      toggle,
      click: () => on && engine.current?.click(),
      thump: () => on && engine.current?.thump(),
      swell: () => on && engine.current?.swell(),
    }),
    [on, toggle],
  );

  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  const api = useContext(SoundContext);
  if (!api) throw new Error("useSound must be used inside SoundProvider");
  return api;
}

/* --------------------------------------------------------- order --- */

type OrderApi = {
  lines: OrderLine[];
  add: (code: string) => void;
  remove: (code: string) => void;
  clear: () => void;
  qty: (code: string) => number;
  loaded: boolean;
};

const OrderContext = createContext<OrderApi | null>(null);

/**
 * The tray follows the visitor across the set list, the release and the
 * merch table, so nobody ever has to leave the room to keep ordering.
 * It survives a reload, because a burger someone chose at 11pm should
 * still be there when they come back to the tab.
 */
export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines, loaded] = useStoredState<OrderLine[]>("fbk.order", []);

  const add = useCallback(
    (code: string) => {
      setLines((prev) => {
        const found = prev.find((line) => line.code === code);
        if (!found) return [...prev, { code, qty: 1 }];
        return prev.map((line) =>
          line.code === code ? { ...line, qty: line.qty + 1 } : line,
        );
      });
    },
    [setLines],
  );

  const remove = useCallback(
    (code: string) => {
      setLines((prev) =>
        prev
          .map((line) =>
            line.code === code ? { ...line, qty: line.qty - 1 } : line,
          )
          .filter((line) => line.qty > 0),
      );
    },
    [setLines],
  );

  const clear = useCallback(() => setLines([]), [setLines]);

  const api = useMemo<OrderApi>(
    () => ({
      lines,
      add,
      remove,
      clear,
      qty: (code: string) => lines.find((l) => l.code === code)?.qty ?? 0,
      loaded,
    }),
    [lines, add, remove, clear, loaded],
  );

  return <OrderContext.Provider value={api}>{children}</OrderContext.Provider>;
}

export function useOrder(): OrderApi {
  const api = useContext(OrderContext);
  if (!api) throw new Error("useOrder must be used inside OrderProvider");
  return api;
}
