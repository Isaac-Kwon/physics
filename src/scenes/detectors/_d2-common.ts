/** Private helpers for the detectors bundle D2 (not a scene). */
import { approach, clamp, smooth } from '../shared/canvas2d';
import type { SceneContext } from '../shared/types';

export type Lv = Record<string, number>;

/** Move every level toward its target (snaps when dt = 0). */
export function stepLevels(lv: Lv, tgt: Lv, dt: number, tau = 0.4) {
  for (const k of Object.keys(tgt)) lv[k] = approach(lv[k] ?? 0, tgt[k], dt, tau);
}

/** Per-state clock for intro animations. Under reduced motion every phase reports "finished". */
export function makeClock(ctx: SceneContext) {
  let t = 0;
  return {
    reset() {
      t = 0;
    },
    finish() {
      t = 1e3;
    },
    tick(dt: number) {
      t += dt;
    },
    get t() {
      return ctx.reducedMotion ? 1e3 : t;
    },
    /** 0 to 1 over [t0, t0 + dur] seconds after the state started. */
    p(t0: number, dur: number) {
      return ctx.reducedMotion ? 1 : smooth(0, 1, (t - t0) / dur);
    },
  };
}

/** Wide (side-by-side) or stacked layout of a main drawing and a side panel. */
export function split(w: number, h: number, frac = 0.58) {
  const wide = w > h * 1.15;
  const narrow = w < 560;
  if (wide) {
    const mw = Math.round(w * frac);
    return { wide, narrow, main: { x: 8, y: 8, w: mw - 16, h: h - 16 }, side: { x: mw + 8, y: 8, w: w - mw - 16, h: h - 16 } };
  }
  const mh = Math.round(h * frac);
  return { wide, narrow, main: { x: 8, y: 8, w: w - 16, h: mh - 12 }, side: { x: 8, y: mh + 4, w: w - 16, h: h - mh - 12 } };
}

export const a01 = (x: number) => clamp(x, 0, 1);
export { smooth, clamp };
