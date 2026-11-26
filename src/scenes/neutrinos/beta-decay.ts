/**
 * nu.beta-decay — a nucleus emits an electron; the electron spectrum is continuous up to the endpoint Q.
 *   missing-energy: only the electron is seen. Energy bar: Q = T_e + (missing). Spectrum with the sharp line a two-body decay would give.
 *   neutrino: a dashed neutrino leaves too; T_e + E_ν = Q for every event.
 * Spectrum: N(T) ∝ p·E·(Q − T)² (allowed shape, Fermi function and nuclear recoil neglected), m_e/Q = 0.5, normalised to its peak.
 * Events are drawn one at a time from that distribution (seeded); the ticks on the energy axis are the last 30 of them.
 */
import type { SceneModule } from '../shared/types';
import { approach, mulberry32, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { arrow, createStage, dot, line, nuLine, txt, para, type G } from './_n1-common';

const STATES = ['missing-energy', 'neutrino'] as const;
type P = { nu: number };
const TARGETS: Record<string, P> = { 'missing-energy': { nu: 0 }, neutrino: { nu: 1 } };

const M = 0.5; // m_e / Q
const shape = (x: number) => {
  // x = T/Q
  if (x <= 0 || x >= 1) return 0;
  const E = x + M;
  return Math.sqrt(E * E - M * M) * E * (1 - x) ** 2;
};
let PEAK = 0;
for (let i = 1; i < 1000; i++) PEAK = Math.max(PEAK, shape(i / 1000));
const spec = (x: number) => shape(x) / PEAK;

const PERIOD = 2.8;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const rnd = mulberry32(1930);
    const NEV = 120;
    const events = Array.from({ length: NEV }, () => {
      let x = 0.3;
      for (let k = 0; k < 400; k++) {
        x = rnd();
        if (rnd() < spec(x)) break;
      }
      return { x, th: (rnd() * 2 - 1) * 1.0, thn: Math.PI + (rnd() * 2 - 1) * 0.9 };
    });
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    let eShow = 0.4;

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      loop: STATES,
      draw(g: G, s, p, env) {
        const { w, h } = s;
        const wide = w >= 560 && w > h * 1.05;
        const D = wide ? { x: 0, y: 0, w: w * 0.42, h } : { x: 0, y: 0, w, h: h * 0.44 };
        const PR = wide
          ? { x: w * 0.42 + 40, y: 44, w: w * 0.58 - 40 - 28, h: h - 44 - 62 }
          : { x: 36, y: h * 0.44 + 34, w: w - 36 - 20, h: h * 0.56 - 34 - 56 };

        // --- event clock
        const tt = env.reduced ? PERIOD * (14 + 0.6) : s.t;
        const k = Math.floor(tt / PERIOD);
        const f = (tt % PERIOD) / PERIOD;
        const ev = events[k % NEV];
        eShow = approach(eShow, ev.x, s.dt, 0.25);
        const nu = p.nu;

        // --- drawing panel
        const nx = D.x + D.w * 0.42;
        const ny = D.y + D.h * 0.4;
        const rMax = Math.min(D.w * 0.42, D.h * 0.36);
        txt(g, L('decay'), D.x + D.w / 2, D.y + 22, { align: 'center', alpha: 0.9 * (1 - nu) });
        txt(g, L('decayNu'), D.x + D.w / 2, D.y + 22, { align: 'center', alpha: 0.9 * nu });
        // nucleus
        g.save();
        g.fillStyle = accent;
        g.globalAlpha = 0.28;
        g.beginPath();
        g.arc(nx, ny, 20, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 0.8;
        g.strokeStyle = accent;
        g.lineWidth = 1.25;
        g.stroke();
        g.restore();
        txt(g, L('nucleus'), nx, ny + 36, { align: 'center', alpha: 0.7 });
        // electron
        const r = rMax * Math.min(1, f / 0.7);
        const fade = 1 - smooth(0.72, 1, f);
        const ex = nx + Math.cos(ev.th) * r;
        const ey = ny + Math.sin(ev.th) * r;
        line(g, nx + Math.cos(ev.th) * 20, ny + Math.sin(ev.th) * 20, ex, ey, { color: accent, width: 1.25, alpha: 0.9 * fade });
        dot(g, ex, ey, 3.2, accent, fade);
        txt(g, 'e⁻', ex + Math.cos(ev.th) * 12 + 2, ey + Math.sin(ev.th) * 12, { align: 'left', alpha: 0.9 * fade, color: accent });
        // neutrino
        if (nu > 0.02) {
          const nxp = nx + Math.cos(ev.thn) * r;
          const nyp = ny + Math.sin(ev.thn) * r;
          nuLine(g, nx + Math.cos(ev.thn) * 20, ny + Math.sin(ev.thn) * 20, nxp, nyp, 0.8 * fade * nu, -s.t * 30);
          txt(g, 'ν̄_e', nxp + Math.cos(ev.thn) * 14 - 6, nyp + Math.sin(ev.thn) * 14, { align: 'right', alpha: 0.9 * fade * nu });
        }

        // energy bar: Q = T_e + (missing or neutrino)
        const bw = Math.min(D.w * 0.8, 300);
        const bx = D.x + (D.w - bw) / 2;
        const by = D.y + D.h * 0.8;
        const bh = 16;
        txt(g, L('barTitle'), bx, by - 20, { alpha: 0.8 });
        g.save();
        g.strokeStyle = fg;
        g.globalAlpha = 0.5;
        g.lineWidth = 1;
        g.strokeRect(bx, by, bw, bh);
        g.fillStyle = accent;
        g.globalAlpha = 0.9;
        g.fillRect(bx, by, bw * eShow, bh);
        // remainder: unknown (dashed) → neutrino (filled)
        const rx = bx + bw * eShow;
        g.globalAlpha = 0.85 * nu;
        g.fillStyle = accent2;
        g.fillRect(rx, by, bw * (1 - eShow), bh);
        g.restore();
        if (nu < 0.99) {
          g.save();
          g.globalAlpha = 1 - nu;
          g.strokeStyle = fg;
          g.setLineDash([3, 3]);
          g.lineWidth = 1;
          g.strokeRect(rx, by + 0.5, bw * (1 - eShow), bh - 1);
          g.restore();
          txt(g, '?', rx + (bw * (1 - eShow)) / 2, by + bh / 2, { align: 'center', alpha: 0.9 * (1 - nu), mono: true });
        }
        txt(g, L('electron'), bx + (bw * eShow) / 2, by + bh + 12, { align: 'center', color: accent, alpha: 0.95, mono: false });
        txt(g, L('missing'), rx + (bw * (1 - eShow)) / 2, by + bh + 12, { align: 'center', alpha: 0.85 * (1 - nu) });
        txt(g, L('nuShare'), rx + (bw * (1 - eShow)) / 2, by + bh + 12, { align: 'center', color: accent2, alpha: 0.95 * nu });

        // --- spectrum plot
        const pl = plot(
          g,
          ctx,
          PR,
          { min: 0, max: 1, label: L('xLabel'), ticks: [{ v: 0, label: '0' }, { v: 1, label: 'Q' }] },
          { min: 0, max: 1.15, label: L('yLabel'), ticks: [] },
        );
        pl.axes();
        // two-body contrast: one sharp line
        pl.vline(1, { color: fg, dash: [4, 4], alpha: 0.65, width: 1.25 });
        const twoW = Math.min(PR.w * 0.5, 190);
        para(g, L('twoBody'), pl.X(1) - 6 - twoW, pl.Y(1.1), twoW, { align: 'left', alpha: 0.75, lh: 15 });
        // continuous spectrum
        pl.curve(spec, { color: accent, width: 1.75 });
        txt(g, L('observed'), pl.X(0.5), pl.Y(0.9), { align: 'left', color: accent, alpha: 0.95 });
        // last events as ticks above the axis
        g.save();
        g.strokeStyle = accent;
        g.lineWidth = 1;
        g.globalAlpha = 0.55;
        g.beginPath();
        for (let j = Math.max(0, k - 29); j <= k; j++) {
          const x = pl.X(events[j % NEV].x);
          g.moveTo(x, PR.y + PR.h - 1);
          g.lineTo(x, PR.y + PR.h - 8);
        }
        g.stroke();
        g.restore();
        // current event
        const mx = pl.X(eShow);
        line(g, mx, pl.Y(0), mx, pl.Y(spec(eShow)), { color: accent, width: 1, alpha: 0.7, dash: [2, 3] });
        pl.dot(eShow, spec(eShow), 3.5, accent);
        // the gap between T_e and Q
        const gy = pl.Y(0.12);
        const gx0 = mx + 3;
        const gx1 = pl.X(1) - 3;
        if (gx1 - gx0 > 14) {
          const col = nu > 0.5 ? accent2 : fg;
          arrow(g, gx0, gy, gx1, gy, { color: col, width: 1.25, alpha: 0.9, head: 6 });
          arrow(g, gx1, gy, gx0, gy, { color: col, width: 1.25, alpha: 0.9, head: 6 });
        }
        const lab = (gx0 + gx1) / 2;
        const ty = gy - 14;
        txt(g, L('vanish'), Math.min(lab, PR.x + PR.w - 4), ty, { align: 'center', alpha: 0.9 * (1 - nu) });
        txt(g, L('second'), Math.min(lab, PR.x + PR.w - 4), ty, { align: 'center', alpha: 0.95 * nu, color: accent2 });
      },
    });
  },
} satisfies SceneModule;
export default mod;
