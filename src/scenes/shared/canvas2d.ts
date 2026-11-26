/**
 * Canvas2D scene base. Use this for every 2D scene so loops, DPR, resize and reduced motion behave the same.
 *
 *   const c = createCanvas2D(ctx, (g, s) => { ...draw using s.w, s.h, s.t (seconds), s.dt ... });
 *   c.animate = true;      // continuous loop while active (false → draw only on invalidate())
 *   c.invalidate();        // request one redraw (after a state change)
 *   // SceneInstance: resize: c.resize, setActive: c.setActive, dispose: c.dispose
 *
 * Under reduced motion the loop never runs; draw() is called on invalidate() with dt = 0 and the scene should
 * render its target state directly (use `snap` from approach()).
 */
import type { SceneContext } from './types';
import { dprCap } from '../../lib/device';

export interface FrameState {
  /** CSS pixel size of the canvas. */
  w: number;
  h: number;
  /** Seconds since mount (frozen under reduced motion). */
  t: number;
  /** Seconds since the previous frame (0 on invalidate-only frames). */
  dt: number;
}

export interface Canvas2D {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  /** Run a continuous animation loop while the scene is active (ignored under reduced motion). */
  animate: boolean;
  invalidate(): void;
  resize(width: number, height: number): void;
  setActive(active: boolean): void;
  dispose(): void;
}

export function createCanvas2D(ctx: SceneContext, draw: (g: CanvasRenderingContext2D, s: FrameState) => void): Canvas2D {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  ctx.container.appendChild(canvas);
  const g = canvas.getContext('2d')!;
  const st: FrameState = { w: 1, h: 1, t: 0, dt: 0 };
  let raf = 0;
  let active = false;
  let last = 0;
  let pending = false;

  const paint = (dt: number) => {
    const dpr = dprCap();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, st.w, st.h);
    st.dt = dt;
    draw(g, st);
  };

  const tick = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    st.t += dt;
    paint(dt);
    if (active && api.animate && !ctx.reducedMotion) raf = requestAnimationFrame(tick);
  };

  const kick = () => {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  };

  const api: Canvas2D = {
    canvas,
    g,
    animate: false,
    invalidate() {
      if (ctx.reducedMotion || !api.animate || !active) {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          paint(0);
        });
      } else kick();
    },
    resize(width, height) {
      st.w = Math.max(1, width);
      st.h = Math.max(1, height);
      const dpr = dprCap();
      canvas.width = Math.round(st.w * dpr);
      canvas.height = Math.round(st.h * dpr);
      api.invalidate();
    },
    setActive(a) {
      active = a;
      if (a) {
        if (api.animate && !ctx.reducedMotion) kick();
        else api.invalidate();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    dispose() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      canvas.remove();
    },
  };
  return api;
}

/**
 * Frame-rate-independent exponential approach: value moves toward target with time constant `tau` seconds.
 * With dt = 0 (reduced motion / static frame) it snaps to the target.
 */
export function approach(value: number, target: number, dt: number, tau = 0.35): number {
  if (dt <= 0) return target;
  return target + (value - target) * Math.exp(-dt / tau);
}

/** Deterministic PRNG so "random" scenes look the same on every visit and in every language. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal from a uniform PRNG (Box–Muller). */
export function gaussian(rnd: () => number): number {
  const u = 1 - rnd();
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Smoothstep 0→1 over [e0, e1]. */
export const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
