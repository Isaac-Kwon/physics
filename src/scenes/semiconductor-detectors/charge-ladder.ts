/**
 * sc.charge-ladder — energy-level picture of silicon (vertical = electron energy, to scale).
 *   ladder: full valence band, empty conduction band, gap E_g = 1.12 eV.
 *   kick:   a charged particle passes; one electron takes on average w = 3.6 eV (arrow to scale), lands high in the
 *           conduction band and relaxes to the band edge; the surplus (w − E_g ≈ 2.5 eV) goes into lattice vibrations.
 *   hole:   the empty seat is a hole (open ring); in a field the electron and the hole move in opposite directions.
 */
import type { SceneModule } from '../shared/types';
import { clamp, lerp, smooth } from '../shared/canvas2d';
import { FONT_MONO, PH, arrow, createStage, dimLine, electronDot, holeRing, line, txt, wiggle, type G } from './_sc1-common';

const STATES = ['ladder', 'kick', 'hole'] as const;
type P = { kick: number; hole: number };
const TARGETS: Record<string, P> = {
  ladder: { kick: 0, hole: 0 },
  kick: { kick: 1, hole: 0 },
  hole: { kick: 0, hole: 1 },
};

const E_TOP = 3.9; // eV above the valence-band top shown at the top of the figure
const E_BOT = -1.6;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const N = 11;
    const JUMP = 7; // index of the electron that is kicked

    const draw = (g: G, s: { w: number; h: number; t: number }, p: P, env: { state: string; ts: number; reduced: boolean }) => {
      const { w, h } = s;
      const narrow = w < 520;
      const top = 24;
      const ppe = (h - top - 30) / (E_TOP - E_BOT);
      const Y = (E: number) => top + (E_TOP - E) * ppe;
      const bl = narrow ? 34 : 48; // band left edge (room for the gap bracket)
      const br = w - (narrow ? 14 : 28);
      const bw = br - bl;
      const xs = (i: number) => bl + bw * (0.07 + (0.86 * i) / (N - 1));
      const xj = xs(JUMP);
      const Eg = PH.EG;

      // bands (floors)
      g.fillStyle = fg;
      g.globalAlpha = 0.06;
      g.fillRect(bl, Y(0), bw, Y(E_BOT) - Y(0));
      g.fillRect(bl, Y(E_TOP), bw, Y(Eg) - Y(E_TOP));
      g.globalAlpha = 1;
      line(g, bl, Y(0), br, Y(0), fg, 0.7, 1.5);
      line(g, bl, Y(Eg), br, Y(Eg), fg, 0.7, 1.5);
      txt(g, L('valence'), bl + 8, Y(E_BOT) - 9, { alpha: 0.7 });
      txt(g, L('conduction'), bl + 8, Y(E_TOP) + 12, { alpha: 0.7 });

      // gap bracket (always)
      const gx = bl - 12;
      dimLine(g, gx, Y(0), gx, Y(Eg), fg, 0.7);
      txt(g, L('gap'), bl + 10, Y(Eg / 2) - 9, { alpha: 0.8 });
      txt(g, `E_g = ${ctx.formatNumber(Eg)} eV`, bl + 10, Y(Eg / 2) + 8, { mono: true });

      // timeline
      const kickState = env.state === 'kick';
      const J = kickState ? smooth(0.9, 1.7, env.ts) : env.state === 'hole' ? 1 : 0; // jump 0..1
      const R = kickState ? smooth(1.7, 3.0, env.ts) : env.state === 'hole' ? 1 : 0; // relaxation 0..1
      const pa = kickState ? clamp(env.ts / 0.9) : 0; // particle position along its track

      // particle track (passes just left of the electron that is kicked), thin line + small dot
      if (p.kick > 0.01) {
        const x0 = xj - 90;
        const y0 = Y(E_TOP) + 70;
        const x1 = xj + 8;
        const y1 = Y(-0.18);
        line(g, x0, y0, x1 + (x1 - x0) * 0.3, y1 + (y1 - y0) * 0.3, accent2, 0.6 * p.kick, 1.5);
        electronDot(g, lerp(x0, x1, pa), lerp(y0, y1, pa), accent2, 3, p.kick * (pa < 1 ? 1 : 0.0));
        txt(g, L('particle'), x0 - 6, y0 - 8, { align: 'right', color: accent2, alpha: 0.9 * p.kick });
      }

      // electron row in the valence band (filled dots at the top of the full band)
      for (let i = 0; i < N; i++) {
        if (i === JUMP && (J > 0 || env.state === 'hole')) continue;
        electronDot(g, xs(i), Y(-0.2), accent, 3.2);
        if (ppe > 45) electronDot(g, xs(i), Y(-0.62), accent, 3.2, 0.5);
      }

      // the kicked electron: jumps to w above the valence top, then relaxes to the conduction-band edge
      const eJump = lerp(-0.2, PH.W_PAIR, J);
      const eE = lerp(eJump, Eg, R);
      const exj = kickState || env.state === 'hole' ? xj : xj;
      if (J > 0 || env.state === 'hole') {
        // hole x position and electron x position (separate in the 'hole' state under a field)
        const sep = env.state === 'hole' ? (env.ts >= 1e3 ? 0.75 : (env.ts * 0.2) % 1) : 0;
        const dx = sep * Math.min(bw * 0.2, 90);
        const ex = exj + dx;
        const hx = exj - dx;
        // surplus energy as lattice vibrations
        if (kickState && R > 0 && R < 1) {
          wiggle(g, ex + 8, Y(eE) + 4, ex + 8 + 28, Y(eE) - 14, 3, fg, 0.6 * (1 - R));
          wiggle(g, ex - 8, Y(eE) + 4, ex - 8 - 28, Y(eE) - 14, 3, fg, 0.6 * (1 - R));
        }
        electronDot(g, ex, Y(eE), accent, 4);
        holeRing(g, hx, Y(-0.2), accent2, 4.2, 1, 1.6);
        if (env.state === 'hole') {
          txt(g, L('electron'), ex, Y(Eg) - 16, { align: 'center', color: accent, alpha: p.hole });
          txt(g, L('hole'), hx, Y(-0.2) + 18, { align: 'center', color: accent2, alpha: p.hole });
          // pair bracket
          txt(g, L('pair'), (ex + hx) / 2, Y(Eg / 2) + 0, { align: 'center', alpha: 0.85 * p.hole });
          line(g, ex, Y(Eg) - 8, ex, Y(Eg / 2) - 8, fg, 0.3 * p.hole, 1, [2, 3]);
          line(g, hx, Y(0) - 8, hx, Y(Eg / 2) + 8, fg, 0.3 * p.hole, 1, [2, 3]);
          // field: both charges move apart in the electric field E (force on an electron points opposite to E)
          const fy = Y(Eg + 0.9);
          arrow(g, ex + 4, fy, ex + 34, fy, { color: accent, alpha: p.hole, width: 1.25, head: 6 });
          arrow(g, hx - 4, Y(-1.2), hx - 34, Y(-1.2), { color: accent2, alpha: p.hole, width: 1.25, head: 6 });
          txt(g, L('movesApart'), exj, Y(2.9), { align: 'center', alpha: 0.75 * p.hole });
        }
      }

      // 3.6 eV scale arrow beside the jump (to the energy scale of the figure)
      if (p.kick > 0.01) {
        const ax = xj + 26;
        const a = p.kick;
        arrow(g, ax, Y(0), ax, Y(0 + (PH.W_PAIR) * J), { color: accent, alpha: a, width: 1.5, head: 7 });
        if (J > 0.95) {
          line(g, ax - 5, Y(PH.W_PAIR), ax + 5, Y(PH.W_PAIR), accent, a, 1.5);
          txt(g, `${ctx.formatNumber(PH.W_PAIR)} eV`, ax + 12, Y(PH.W_PAIR), { mono: true, color: accent, alpha: a });
          if (!narrow) txt(g, L('meanEnergy'), ax + 12, Y(PH.W_PAIR) + 16, { alpha: 0.75 * a });
        }
        if (R > 0.55) {
          const surplus = PH.W_PAIR - Eg;
          const ym = Y(Eg + surplus / 2);
          txt(g, `≈ ${ctx.formatNumber(surplus, { maximumFractionDigits: 1 })} eV`, ax + 12, ym - 8, { mono: true, alpha: 0.85 * a * smooth(0.55, 1, R) });
          if (!narrow) txt(g, L('toLattice'), ax + 12, ym + 8, { alpha: 0.75 * a * smooth(0.55, 1, R) });
        }
      }
      g.font = FONT_MONO;
    };

    return createStage<P>(ctx, { states: STATES, targets: TARGETS, loop: ['hole'], anim: { kick: 3.2 }, draw });
  },
};
export default mod;
