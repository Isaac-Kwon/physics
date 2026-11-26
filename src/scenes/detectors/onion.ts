/**
 * det.onion — the barrel detector as concentric layers (CMS-like: tracker, ECAL and HCAL inside the solenoid, muon chambers in the return yoke).
 * End view (transverse plane) with a longitudinal section beside it. Radii are schematic, not to scale. One layer at a time is pulled
 * apart radially and highlighted; names and one-line roles come from the strings file.
 * The solenoid field (B out of the page inside the coil, into the page in the iron) is drawn as field symbols in the tracker and magnet steps.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D } from '../shared/canvas2d';
import { line, rect, txt } from '../common/_draw';
import { GAP, LAYERS, LAYER_IDS, R_VIEW, drawOnion, rmap } from './_d2-onion';
import { stepLevels, type Lv } from './_d2-common';

const STATES = ['assembled', 'vertex', 'tracker', 'ecal', 'hcal', 'magnet', 'muon'] as const;
type St = (typeof STATES)[number];
const HI: Record<St, number> = { assembled: -1, vertex: 1, tracker: 2, ecal: 3, hcal: 4, magnet: 5, muon: 6 };
const NAMES = ['beam', 'vertex', 'tracker', 'ecal', 'hcal', 'magnet', 'muon'] as const;

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const lv: Lv = {};
    const tgt: Lv = {};
    for (let i = 0; i < 7; i++) {
      lv['ex' + i] = 0;
      lv['em' + i] = 0;
      tgt['ex' + i] = 0;
      tgt['em' + i] = 0;
    }
    lv.field = 0;
    lv.yoke = 0;
    tgt.field = 0;
    tgt.yoke = 0;
    let state: St = 'assembled';

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      stepLevels(lv, tgt, s.dt, 0.45);
      const wide = w >= 640 && w > h * 1.15;
      const narrow = w < 560;
      const hiIdx = HI[state];
      const ex = Array.from({ length: 7 }, (_, i) => lv['ex' + i]);
      const emph = Array.from({ length: 7 }, (_, i) => lv['em' + i]);

      // ---- end view ----
      const headH = wide ? 8 : 52;
      const footH = 26;
      const S = wide ? Math.min(h - 16 - footH, w * 0.56) : Math.min(w - 16, h - headH - footH - (h > w * 1.5 ? 150 : 8));
      const cx = wide ? 8 + S / 2 : w / 2;
      const cy = (wide ? 8 : headH) + S / 2;
      const K = (S / 2) / R_VIEW;
      drawOnion(g, cx, cy, K, th, { ex, emph, base: 0.2 + 0.5 * (1 - Math.max(...emph)), field: lv.field, yoke: lv.yoke });
      // scale bar across the outer diameter
      const yb = cy + S / 2 + 14;
      const Ro = K * 1.0;
      line(g, cx - Ro, yb, cx + Ro, yb, th.fg, 1, 0.6);
      line(g, cx - Ro, yb - 4, cx - Ro, yb + 4, th.fg, 1, 0.6);
      line(g, cx + Ro, yb - 4, cx + Ro, yb + 4, th.fg, 1, 0.6);
      txt(g, `${L('scale')} · ${L('notToScale')}`, cx, yb + 12, { color: th.fg, align: 'center', alpha: 0.7 });

      // ---- text for the highlighted layer ----
      const nameOf = (i: number) => L('name.' + NAMES[i]);
      const roleOf = (i: number) => L('role.' + NAMES[i]);
      if (!wide) {
        const i = hiIdx;
        txt(g, i < 0 ? L('name.all') : nameOf(i), w / 2, 16, { color: th.accent, align: 'center', alpha: 1 });
        txt(g, i < 0 ? L('role.all') : roleOf(i), w / 2, 36, { color: th.fg, align: 'center', alpha: 0.85 });
      } else {
        const px = 8 + S + 36;
        const pw = w - px - 12;
        const rowH = 24;
        let y = 28;
        txt(g, L('layers'), px, y - 4, { color: th.fg, alpha: 0.6 });
        y += 22;
        for (let k = 1; k < 7; k++) {
          const m = emph[k];
          const on = hiIdx === k || hiIdx < 0;
          line(g, px, y, px + 18, y, m > 0.5 ? th.accent : th.fg, 1.5, on ? 0.95 : 0.35);
          txt(g, nameOf(k), px + 28, y, { color: m > 0.5 ? th.accent : th.fg, alpha: on ? 1 : 0.4 });
          txt(g, roleOf(k), px + Math.min(190, pw * 0.4), y, { color: th.fg, alpha: on ? 0.8 : 0.3 });
          y += rowH;
        }
        // side view
        const sy0 = y + 22;
        const sh = Math.min(h - sy0 - 20, pw * 0.62);
        if (sh > 80) {
          const zc = px + pw / 2;
          const rc = sy0 + 14 + sh / 2;
          const kk = (sh / 2 - 6) / R_VIEW;
          const zk = Math.min(kk, (pw / 2 - 4) / 1.5);
          txt(g, L('sideView'), px, sy0 - 6, { color: th.fg, alpha: 0.6 });
          const half = (r: number) => 0.35 + 1.1 * r;
          for (let i = 1; i < 7; i++) {
            const Ls = LAYERS[i];
            const r0 = rmap(Ls.a, ex);
            const r1 = rmap(Ls.b, ex);
            const col = emph[i] > 0.5 ? th.accent : th.fg;
            const al = (emph[i] > 0.5 ? 1 : 0.2 + 0.5 * (1 - Math.max(...emph))) * 0.95;
            const fill = emph[i] > 0.5 ? 0.12 : 0;
            [r0, r1].forEach((r) => {
              rect(g, zc - half(r) * zk, rc - r * kk, 2 * half(r) * zk, 2 * r * kk, col, 1, al);
            });
            if (fill) {
              g.save();
              g.globalAlpha = fill * emph[i];
              g.fillStyle = col;
              g.fillRect(zc - half(r1) * zk, rc - r1 * kk, 2 * half(r1) * zk, 2 * r1 * kk);
              g.restore();
            }
          }
          // beam axis
          line(g, zc - 1.6 * zk, rc, zc + 1.6 * zk, rc, th.fg, 1, 0.4, [2, 4]);
          txt(g, L('beamAxis'), zc + 1.6 * zk, rc - 8, { color: th.fg, align: 'right', alpha: 0.6 });
        }
      }
    });
    c.animate = true;

    const apply = (st: St) => {
      state = st;
      const i = HI[st];
      for (let k = 0; k < 7; k++) {
        tgt['ex' + k] = k === i ? 1 : 0;
        tgt['em' + k] = k === i ? 1 : 0;
      }
      tgt.field = st === 'tracker' || st === 'magnet' ? 0.9 : 0;
      tgt.yoke = st === 'magnet' ? 1 : 0;
    };
    apply('assembled');
    Object.assign(lv, tgt);
    void GAP;
    void LAYER_IDS;

    return {
      setState(st: string, o: SetStateOptions) {
        apply((STATES as readonly string[]).includes(st) ? (st as St) : 'assembled');
        if (o.immediate || ctx.reducedMotion) Object.assign(lv, tgt);
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;
