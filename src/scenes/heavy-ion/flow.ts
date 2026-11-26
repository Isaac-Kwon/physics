/**
 * hi.flow — end view (x–y plane) of an off-centre collision.
 *   almond → pressure gradient → momentum anisotropy (dN/dφ ∝ 1 + 2 v₂ cos 2φ) → schematic v₂(pT) with mass ordering.
 * World units: nuclear radius R = 1, reaction plane = x axis, impact parameter b = 0.9 R.
 * Colour of the overlap = energy density (inferno). Particles are drawn with their velocity vectors.
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, smooth, clamp } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { arrow, createStage, drawLens, lensDensity, lensRadius, makeLayer, splitLayout, txt, type G } from './_s3-common';

const STATES = ['almond', 'pressure', 'momentum-anisotropy', 'v2-plot'] as const;
const B = 0.9;
const V2 = 0.1;
const N = 380;
const PERIOD = 4.2;

type P = { press: number; part: number; ring: number; plot: number; L: number };
const TARGETS: Record<string, P> = {
  almond: { press: 0, part: 0, ring: 0, plot: 0, L: 0 },
  pressure: { press: 1, part: 0, ring: 0, plot: 0, L: 0 },
  'momentum-anisotropy': { press: 0, part: 1, ring: 1, plot: 0, L: 0 },
  'v2-plot': { press: 0, part: 1, ring: 1, plot: 1, L: 1 },
};

/** Schematic v2(pT) for a species of mass m (GeV): rises, saturates, heavier = lower at the same pT. */
const v2Curve = (m: number) => (pT: number) => 0.2 * Math.tanh(pT / (0.9 + 1.6 * m));
const SPECIES = [
  { key: 'pi', m: 0.14 },
  { key: 'K', m: 0.494 },
  { key: 'p', m: 0.938 },
] as const;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const rnd = mulberry32(2718);
    // Birth points sampled from the overlap density; angles from 1 + 2 v2 cos 2φ (rejection sampling).
    const pts = Array.from({ length: N }, () => {
      let x = 0,
        y = 0;
      for (let k = 0; k < 200; k++) {
        x = (rnd() * 2 - 1) * 0.6;
        y = (rnd() * 2 - 1) * 0.95;
        if (rnd() < lensDensity(B, x, y)) break;
      }
      let phi = 0;
      for (let k = 0; k < 200; k++) {
        phi = rnd() * Math.PI * 2;
        if (rnd() * (1 + 2 * V2) < 1 + 2 * V2 * Math.cos(2 * phi)) break;
      }
      return { x, y, phi, v: 0.55 + 0.5 * rnd(), d: rnd() * 0.12 };
    });
    const layer = makeLayer();
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg, grid } = ctx.theme;

    const draw = (g: G, s: { w: number; h: number; t: number }, p: P) => {
      const { w, h } = s;
      const lay = splitLayout(w, h, p.L);
      const R = lay.panel;
      const cx = R.x + R.w / 2;
      const cy = R.y + R.h / 2;
      const S = Math.max(20, Math.min(R.w, R.h) / (2 * 2.35));
      const X = (x: number) => cx + x * S;
      const Y = (y: number) => cy - y * S;
      g.save();
      g.beginPath();
      g.rect(R.x, R.y, R.w, R.h);
      g.clip();

      // Nuclei outlines, reaction-plane axes
      g.strokeStyle = fg;
      g.lineWidth = 1;
      g.globalAlpha = 0.3;
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.arc(X((sx * B) / 2), Y(0), S, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 0.35;
      g.setLineDash([3, 4]);
      g.beginPath();
      g.moveTo(X(-2.15), Y(0));
      g.lineTo(X(2.15), Y(0));
      g.moveTo(X(0), Y(-1.7));
      g.lineTo(X(0), Y(1.7));
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      const small = R.w < 520;
      if (!small) {
        txt(g, L('x'), X(2.12), Y(0) - 10, { align: 'right', alpha: 0.7 });
        txt(g, 'y', X(0) + 7, Y(1.7), { alpha: 0.6, mono: true });
      }

      // Overlap: energy density
      const u = (s.t % PERIOD) / PERIOD;
      drawLens(g, B, cx, cy, S, 1 - 0.55 * p.part);

      // Impact parameter
      if (p.press < 0.5 && p.part < 0.5 && R.w > 300) {
        const a = 1 - p.press - p.part;
        arrow(g, X(-B / 2) + 4, Y(-1.28), X(B / 2) - 4, Y(-1.28), { color: fg, alpha: 0.6 * a, width: 1, head: 5 });
        arrow(g, X(B / 2) - 4, Y(-1.28), X(-B / 2) + 4, Y(-1.28), { color: fg, alpha: 0.6 * a, width: 1, head: 5 });
        txt(g, 'b', X(0), Y(-1.28) + 12, { align: 'center', mono: true, alpha: 0.7 * a });
        txt(g, L('almond'), X(0), Y(1.45), { align: 'center', alpha: 0.75 * a });
      }

      // Pressure gradient arrows: length ∝ |∇P| ∝ 1/(distance to the edge in that direction)
      if (p.press > 0.01) {
        for (let k = 0; k < 16; k++) {
          const phi = (k * Math.PI * 2) / 16;
          const rho = lensRadius(B, phi);
          const len = (0.36 / rho) * p.press;
          const c = Math.cos(phi);
          const sn = Math.sin(phi);
          arrow(g, X(c * (rho + 0.04)), Y(sn * (rho + 0.04)), X(c * (rho + 0.04 + len)), Y(sn * (rho + 0.04 + len)), {
            color: accent,
            alpha: 0.95 * p.press,
            width: 1.5,
            head: 7,
          });
        }
        if (!small) {
          txt(g, L('steep'), X(1.55), Y(0) + 24, { align: 'left', color: accent, alpha: p.press });
          txt(g, L('gentle'), X(0) + 12, Y(1.62), { color: accent, alpha: p.press });
        }
      }

      // Free-streaming particles from the overlap, velocity vectors ∝ momentum
      if (p.part > 0.01) {
        for (const q of pts) {
          const uu = clamp((u - q.d) / (0.86 - q.d));
          if (uu <= 0) continue;
          const dist = 1.15 * q.v * smooth(0, 1, uu) * 1.0 + 0.2 * uu;
          const cx0 = Math.cos(q.phi);
          const sy0 = Math.sin(q.phi);
          const x = q.x + cx0 * dist;
          const y = q.y + sy0 * dist;
          const a = p.part * (0.25 + 0.75 * Math.min(1, uu * 5)) * (1 - smooth(0.78, 1, uu));
          const vl = 0.2 * q.v;
          g.globalAlpha = a * 0.55;
          g.strokeStyle = accent2;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(X(x), Y(y));
          g.lineTo(X(x + cx0 * vl), Y(y + sy0 * vl));
          g.stroke();
          g.globalAlpha = a;
          g.fillStyle = accent2;
          g.beginPath();
          g.arc(X(x), Y(y), 1.8, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }

      // Azimuthal distribution: r(φ) ∝ 1 + 2 v2 cos 2φ
      if (p.ring > 0.01) {
        const R0 = 1.8;
        g.globalAlpha = 0.4 * p.ring;
        g.strokeStyle = grid;
        g.lineWidth = 1;
        g.setLineDash([2, 4]);
        g.beginPath();
        g.arc(X(0), Y(0), R0 * S, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
        g.globalAlpha = p.ring;
        g.strokeStyle = accent;
        g.lineWidth = 1.75;
        g.beginPath();
        for (let i = 0; i <= 180; i++) {
          const phi = (i / 180) * Math.PI * 2;
          const r = R0 * (1 + 2 * V2 * Math.cos(2 * phi));
          const px = X(r * Math.cos(phi));
          const py = Y(r * Math.sin(phi));
          i ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
        g.globalAlpha = 1;
        if (!small) {
          txt(g, L('moreAlongX'), X(R0 * (1 + 2 * V2)) - 6, Y(0) + 16, { align: 'right', color: accent, alpha: p.ring });
          txt(g, 'dN/dφ ∝ 1 + 2v₂ cos 2φ', X(0), Y(-2.12), { align: 'center', mono: true, alpha: p.ring * 0.85 });
        }
      }
      g.restore();

      // v2(pT) plot
      layer(g, w, h, p.plot, (g2) => {
        const pl = plot(
          g2,
          ctx,
          lay.plotR,
          { min: 0, max: 3, label: L('pT'), ticks: [0, 1, 2, 3].map((v) => ({ v, label: String(v) })) },
          { min: 0, max: 0.25, label: 'v₂', ticks: [{ v: 0, label: '0' }, { v: 0.25, label: L('larger') }] },
        );
        pl.axes();
        pl.hline(0, { color: fg, dash: [4, 4], alpha: 0.5 });
        pl.text(3, 0.012, L('freeStreaming'), { align: 'right', alpha: 0.7 });
        const cols = [accent, fg, accent2];
        SPECIES.forEach((sp, i) => {
          pl.curve(v2Curve(sp.m), { color: cols[i], width: 1.75, alpha: i === 1 ? 0.75 : 1 });
          pl.text(3.06, v2Curve(sp.m)(3), L(sp.key), { color: cols[i], alpha: 1 });
        });
        pl.text(0.08, 0.235, L('massOrdering'), { alpha: 0.75 });
      });
    };

    return createStage<P>(ctx, { states: STATES, targets: TARGETS, loop: ['momentum-anisotropy', 'v2-plot'], draw: (g, s, p) => draw(g, s, p) });
  },
};
export default mod;
