/**
 * det.matter-block — one incoming particle, one block of matter; every interaction a detector can use, one state each.
 * Drawings live in _d1-matter-a.ts (ionization, bremsstrahlung, photoelectric, Compton, pair) and _d1-matter-b.ts (showers, neutral, Cherenkov, scintillation).
 * Numbers come from src/data/detectors.ts (DET.*) and the shared Bethe–Bloch function used by the BetheBloch widget.
 */
import type { SceneModule } from '../shared/types';
import { createStage, makeLayer, type Env, type G, type Rect } from './_d1-common';
import { makeA } from './_d1-matter-a';
import { makeB } from './_d1-matter-b';

const STATES = ['ionization', 'brems', 'photon-pe', 'photon-compton', 'photon-pair', 'em-shower', 'had-shower', 'neutral', 'cherenkov', 'scintillation'] as const;
type P = Record<(typeof STATES)[number], number>;
const TARGETS = Object.fromEntries(STATES.map((s) => [s, Object.fromEntries(STATES.map((t) => [t, t === s ? 1 : 0]))])) as Record<string, P>;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const a = makeA(ctx);
    const b = makeB(ctx);
    const fns: ((g: G, A: Rect, e: Env) => void)[] = [a.ionization, a.brems, a.pe, a.compton, a.pair, b.em, b.had, b.neutral, (g, A, e) => b.cherenkov(g, A, e, 'matter'), b.scint];
    const layers = STATES.map(() => makeLayer());
    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      tau: 0.3,
      anim: Object.fromEntries(STATES.map((s) => [s, 4])),
      draw(g, s, P, env) {
        const A: Rect = { x: 12, y: 10, w: s.w - 24, h: s.h - 20 };
        fns.forEach((fn, i) => layers[i](g, s.w, s.h, P[STATES[i]], (g2) => fn(g2, A, env.state === STATES[i] ? env : { ...env, ts: 1e3 })));
      },
    });
  },
};
export default mod;
