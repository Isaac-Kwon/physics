/**
 * det.signatures — what each particle leaves in the onion (end view, see _d2-onion.ts). Qualitative: the shower amplitude stands for energy.
 *  photon: no track, ECAL shower. electron: track + ECAL shower. muon: track, MIP in ECAL and HCAL, muon-chamber hits, track continues.
 *  charged hadron: track, faint ECAL deposit, HCAL shower. neutral hadron: no track, HCAL shower. neutrino: nothing; missing pT balances the visible recoil.
 * A table of the layers lit is drawn as text so colour is never the only cue. Dashed lines are inferred flight directions, not measurements.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { createCanvas2D } from '../shared/canvas2d';
import { arrow, dot, txt } from '../common/_draw';
import { R_VIEW, drawOnion, drawSig, makeSig, type Sig } from './_d2-onion';
import { makeClock } from './_d2-common';

const STATES = ['photon', 'electron', 'muon', 'charged-hadron', 'neutral-hadron', 'neutrino'] as const;
type St = (typeof STATES)[number];
const PHI = 0.62;
const ROWS = ['tracker', 'ecal', 'hcal', 'muon'] as const;
/** What each layer records for each particle (key into labels). */
const TABLE: Record<St, string[]> = {
  photon: ['none', 'shower', 'none', 'none'],
  electron: ['track', 'shower', 'none', 'none'],
  muon: ['track', 'mip', 'mip', 'track'],
  'charged-hadron': ['track', 'faint', 'shower', 'none'],
  'neutral-hadron': ['none', 'none', 'shower', 'none'],
  neutrino: ['none', 'none', 'none', 'none'],
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const clk = makeClock(ctx);
    const sigs = {} as Record<St, Sig>;
    sigs.photon = makeSig('photon', PHI, 1, 2.2);
    sigs.electron = makeSig('electron', PHI, -1, 2.2, 0.85);
    sigs.muon = makeSig('muon', PHI, 1, 2.2);
    sigs['charged-hadron'] = makeSig('charged-hadron', PHI, 1, 2.2);
    sigs['neutral-hadron'] = makeSig('neutral-hadron', PHI, 1, 2.2);
    sigs.neutrino = makeSig('neutrino', PHI, 1, 2.2);
    const recoil = makeSig('charged-hadron', PHI + Math.PI - 0.15, -1, 2.0, 0.8);
    let state: St = 'photon';

    const c = createCanvas2D(ctx, (g, s) => {
      const { w, h } = s;
      clk.tick(s.dt);
      const wide = w >= 640 && w > h * 1.15;
      const mode = wide ? 'wide' : h < w * 0.9 ? 'compact' : 'stack';
      const rowsH = 5 * 24 + 30;
      const S = mode === 'wide' ? Math.min(h - 16, w * 0.58) : mode === 'compact' ? Math.min(h - 16, w * 0.52) : Math.min(w - 16, h - rowsH - 20);
      const cx = mode === 'stack' ? w / 2 : 8 + S / 2;
      const cy = 8 + S / 2;
      const K = S / 2 / R_VIEW;
      const prog = clk.p(0.1, 1.3);
      const sig = sigs[state];
      drawOnion(g, cx, cy, K, th, { ex: [], emph: [], base: 0.3, field: 0.45 });
      if (state === 'neutrino') {
        // visible recoil and the missing pT that balances it
        drawSig(g, cx, cy, K, th, recoil, prog, th.accent2);
        const a = PHI + Math.PI - 0.15;
        const L1 = 0.3 * K;
        // vectors drawn from the vertex, outside the tracker density: visible pT (white) and missing pT (cyan)
        const q = Math.min(1, prog * 1.5);
        arrow(g, cx, cy, cx + Math.cos(a) * L1 * q, cy - Math.sin(a) * L1 * q, th.accent2, 1.5, 0.9, 7);
        arrow(g, cx, cy, cx - Math.cos(a) * L1 * q, cy + Math.sin(a) * L1 * q, th.accent, 1.8, 1, 7);
        const tipV = [cx + Math.cos(a) * L1, cy - Math.sin(a) * L1];
        txt(g, L('visible'), tipV[0] + Math.cos(a) * 12, tipV[1] - Math.sin(a) * 12 - 8, { color: th.accent2, align: 'right', alpha: q });
        txt(g, L('missing'), cx - Math.cos(a) * (L1 + 12), cy + Math.sin(a) * (L1 + 12) - 8, { color: th.accent, align: 'left', alpha: q });
      } else drawSig(g, cx, cy, K, th, sig, prog, th.accent);
      dot(g, cx, cy, 2.5, th.fg, 0.9);
      if (state === 'photon' || state === 'neutral-hadron') txt(g, L('inferred'), cx + K * 0.2, cy - K * 0.12, { color: th.fg, alpha: 0.6 * prog });

      // table of layers lit
      const two = mode === 'compact';
      const tx = mode === 'wide' ? 8 + S + 32 : mode === 'compact' ? 8 + S + 12 : 16;
      const ty = mode === 'wide' ? 40 : mode === 'compact' ? 40 : 8 + S + 22;
      const rh = two ? 38 : 26;
      const vx = two ? 0 : Math.min(180, (w - tx) * 0.5);
      if (mode !== 'compact') txt(g, L('lit'), tx, ty - 18, { color: th.fg, alpha: 0.6 });
      const rows = [...ROWS.map((r, i) => [L('layer.' + r), TABLE[state][i], false] as const), [L('layer.met'), state === 'neutrino' ? 'imbalance' : 'none', true] as const];
      rows.forEach(([lab, v], i) => {
        const y = ty + i * rh;
        const on = v !== 'none';
        txt(g, lab, tx, y, { color: th.fg, alpha: 0.9 });
        txt(g, (on ? '✓ ' : '– ') + L('v.' + v), tx + vx, y + (two ? 15 : 0), { color: on ? th.accent : th.fg, alpha: on ? 1 : 0.45 });
      });
      if (mode !== 'compact') {
        const ky = ty + rows.length * rh + 24;
        if (state === 'neutrino') txt(g, L('recoilNote'), tx, ky - 20, { color: th.accent2, alpha: 0.8 });
        txt(g, L('qualitative'), tx, ky, { color: th.fg, alpha: 0.55 });
      }
    });
    c.animate = true;
    return {
      setState(st: string, o: SetStateOptions) {
        state = (STATES as readonly string[]).includes(st) ? (st as St) : 'photon';
        clk.reset();
        if (o.immediate || ctx.reducedMotion) clk.finish();
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;
