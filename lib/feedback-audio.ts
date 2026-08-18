/**
 * The room's sound, synthesised rather than sampled.
 *
 * Nothing here loads a file: the griddle, the amp hum, the pedal clicks
 * and the feedback swell are all made from noise buffers and oscillators
 * at runtime. That keeps the whole sound design at a few kilobytes of
 * code, means it never blocks a paint, and lets the sizzle track the
 * pressure knob continuously instead of crossfading between takes.
 *
 * It is also, deliberately, quiet. The brief is a premium room with the
 * volume up, not a website that shouts at you — so the bed sits around
 * -30dB and the loudest single event is the one feedback swell.
 */

type Voice = "sizzle" | "hum";

export class FeedbackAudio {
  private ctx: AudioContext;
  private master: GainNode;
  private noise: AudioBuffer;
  private voices = new Map<Voice, { gain: GainNode; stop: () => void }>();
  private sizzleGain: GainNode | null = null;

  private constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.noise = makeNoise(ctx);
  }

  /** Must be called from a user gesture — browsers require it. */
  static create(): FeedbackAudio | null {
    const Ctor =
      typeof window !== "undefined"
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        : undefined;
    if (!Ctor) return null;
    return new FeedbackAudio(new Ctor());
  }

  async start() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.ramp(this.master.gain, 0.9, 0.6);
    this.startSizzle();
    this.startHum();
  }

  stop() {
    this.ramp(this.master.gain, 0, 0.35);
  }

  close() {
    this.voices.forEach((v) => v.stop());
    this.voices.clear();
    void this.ctx.close();
  }

  /* ------------------------------------------------------ the bed --- */

  /** Filtered noise: a flat top with something on it. */
  private startSizzle() {
    if (this.voices.has("sizzle")) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;

    // Band-passed high so it reads as fat spitting rather than as hiss.
    const band = this.ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 3200;
    band.Q.value = 0.6;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.012;
    this.sizzleGain = gain;

    src.connect(band).connect(gain).connect(this.master);
    src.start();
    this.voices.set("sizzle", { gain, stop: () => src.stop() });
  }

  /** Mains hum through a cabinet: the room is switched on. */
  private startHum() {
    if (this.voices.has("hum")) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.02;

    const fundamental = this.ctx.createOscillator();
    fundamental.type = "sine";
    fundamental.frequency.value = 60;
    const harmonic = this.ctx.createOscillator();
    harmonic.type = "sine";
    harmonic.frequency.value = 120;
    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.value = 0.35;

    fundamental.connect(gain);
    harmonic.connect(harmonicGain).connect(gain);
    gain.connect(this.master);
    fundamental.start();
    harmonic.start();

    this.voices.set("hum", {
      gain,
      stop: () => {
        fundamental.stop();
        harmonic.stop();
      },
    });
  }

  /** The griddle gets louder as pressure comes on. 0—1. */
  setPressure(level: number) {
    if (!this.sizzleGain) return;
    const clamped = Math.min(1, Math.max(0, level));
    // Squared, because loudness is perceptual and a linear ramp reads
    // as though the knob does nothing for the first half of its travel.
    this.ramp(this.sizzleGain.gain, 0.012 + clamped * clamped * 0.075, 0.12);
  }

  /* ---------------------------------------------------- one-shots --- */

  /** A footswitch: a click with a body, not a tick. */
  click() {
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 2.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.06);

    src.connect(filter).connect(gain).connect(this.master);
    src.start(now);
    src.stop(now + 0.08);
  }

  /** The smash: a low thump with the noise of contact on top. */
  thump() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  /**
   * The one loud moment: a resonant peak climbing into feedback, then
   * cut. Short on purpose — a swell that outstays its welcome is the
   * difference between a venue and a novelty.
   */
  swell() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.5);

    // A tight resonant peak is what makes it read as a speaker feeding
    // back rather than as a synth sweep.
    const peak = this.ctx.createBiquadFilter();
    peak.type = "bandpass";
    peak.frequency.setValueAtTime(400, now);
    peak.frequency.exponentialRampToValueAtTime(2400, now + 0.5);
    peak.Q.value = 12;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.34);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc.connect(peak).connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  private ramp(param: AudioParam, to: number, seconds: number) {
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(Math.max(param.value, 0.0001), now);
    param.linearRampToValueAtTime(to, now + seconds);
  }
}

/** Two seconds of white noise, reused by every voice that needs it. */
function makeNoise(ctx: AudioContext): AudioBuffer {
  const frames = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}
