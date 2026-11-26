/**
 * nu.sources — where neutrinos come from, on one logarithmic energy axis (10⁻⁴ eV … 10²¹ eV; plot() with x log).
 * Every band is an energy range; the vertical position carries no meaning (rows are only sorted by energy so the labels do not collide).
 * Ranges (approximate, textbook): relic ~10⁻⁴–10⁻³ eV (thermal, T_ν ≈ 1.9 K) · geo ν̄ up to ≈3.3 MeV · reactor ν̄ ≈0.1–10 MeV ·
 * solar pp < 0.42 MeV, ⁸B up to ≈15 MeV · supernova ≈10–50 MeV (SN 1987A detected ≈ 5–40 MeV) · atmospheric 0.1 GeV – 10 TeV (flux falls with energy) ·
 * accelerator beams ≈0.1–30 GeV · astrophysical ≳10 TeV to beyond 100 PeV; KM3-230213A ≈ 220 PeV (NU.KM3_EVENT_PEV).
 */
import type { SceneModule } from '../shared/types';
import { plot } from '../shared/plot';
import { NU } from '../../data/neutrinos';
import { createStage, textWidth, txt, type G } from './_n1-common';

const STATES = ['cosmic-background', 'geo-reactor', 'sun', 'supernova', 'atmosphere', 'accelerator', 'astro', 'overview'] as const;

interface Band {
  k: string;
  lo: number;
  hi: number;
  row: number;
  note?: string;
  fade?: boolean;
  more?: boolean;
  left?: boolean;
}
const EV = { MeV: 1e6, GeV: 1e9, TeV: 1e12, PeV: 1e15 };
const BANDS: Band[] = [
  { k: 'relic', lo: 1e-4, hi: 1e-3, row: 0 },
  { k: 'geo', lo: 1e5, hi: 3.3 * EV.MeV, row: 1, note: '< 3.3 MeV' },
  { k: 'reactor', lo: 1e5, hi: 10 * EV.MeV, row: 2, note: '0.1–10 MeV' },
  { k: 'pp', lo: 5e4, hi: 0.42 * EV.MeV, row: 3, left: true, note: '< 0.42 MeV' },
  { k: 'b8', lo: 1 * EV.MeV, hi: 15 * EV.MeV, row: 3, note: 'to 15 MeV' },
  { k: 'sn', lo: 10 * EV.MeV, hi: 50 * EV.MeV, row: 4, note: '10–50 MeV' },
  { k: 'atm', lo: 0.1 * EV.GeV, hi: 10 * EV.TeV, row: 5, fade: true, note: '0.1 GeV–10 TeV' },
  { k: 'acc', lo: 0.1 * EV.GeV, hi: 30 * EV.GeV, row: 6, note: '0.1–30 GeV' },
  { k: 'astro', lo: 10 * EV.TeV, hi: 1e18, row: 7, more: true, note: '> 10 TeV' },
];
const FOCUS: Record<string, string[]> = {
  'cosmic-background': ['relic'],
  'geo-reactor': ['geo', 'reactor'],
  sun: ['pp', 'b8'],
  supernova: ['sn'],
  atmosphere: ['atm'],
  accelerator: ['acc'],
  astro: ['astro'],
  overview: BANDS.map((b) => b.k),
};
type P = Record<string, number>;
const TARGETS: Record<string, P> = {};
for (const st of STATES) {
  TARGETS[st] = Object.fromEntries(BANDS.map((b) => [b.k, st === 'overview' ? 0.8 : FOCUS[st].includes(b.k) ? 1 : 0.16]));
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2 } = ctx.theme;
    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      draw(g: G, s, p) {
        const { w, h } = s;
        const R = { x: 24, y: 20, w: w - 24 - 26, h: h - 20 - 54 };
        const pl = plot(
          g,
          ctx,
          R,
          {
            min: 1e-4,
            max: 1e21,
            label: L('axis'),
            ticks: [
              { v: 1e-3, label: 'meV' },
              { v: 1, label: 'eV' },
              { v: 1e3, label: 'keV' },
              { v: 1e6, label: 'MeV' },
              { v: 1e9, label: 'GeV' },
              { v: 1e12, label: 'TeV' },
              { v: 1e15, label: 'PeV' },
              { v: 1e18, label: 'EeV' },
            ],
            log: true,
          },
          { min: 0, max: 1, ticks: [] },
        );
        pl.axes();
        const rowH = R.h / 8;
        const bh = Math.min(14, rowH * 0.42);
        for (const b of BANDS) {
          const f = p[b.k];
          const y = R.y + (b.row + 0.5) * rowH;
          const x0 = pl.X(b.lo);
          const x1 = pl.X(b.hi);
          g.save();
          if (b.fade) {
            const gr = g.createLinearGradient(x0, 0, x1, 0);
            gr.addColorStop(0, accent);
            gr.addColorStop(1, 'rgba(61,123,255,0.12)');
            g.fillStyle = gr;
          } else g.fillStyle = accent;
          g.globalAlpha = 0.14 + 0.76 * f;
          g.fillRect(x0, y - bh / 2, Math.max(2, x1 - x0), bh);
          g.restore();
          if (b.more) {
            // open-ended: no upper limit is drawn
            g.save();
            g.strokeStyle = accent;
            g.globalAlpha = 0.14 + 0.76 * f;
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(x1 + 2, y);
            g.lineTo(x1 + 12, y);
            g.moveTo(x1 + 8, y - 3.5);
            g.lineTo(x1 + 12, y);
            g.lineTo(x1 + 8, y + 3.5);
            g.stroke();
            g.restore();
          }
          // label: beside the band on the side with room
          const name = L(b.k);
          const note = b.note && f > 0.9 ? b.note : '';
          const wl = textWidth(g, name) + (note ? textWidth(g, note, true) + 8 : 0);
          const xr = x1 + (b.more ? 20 : 8);
          const right = !b.left && xr + wl < R.x + R.w;
          const a = 0.35 + 0.65 * f;
          const xs = right ? xr : x0 - 8;
          if (right) {
            txt(g, name, xs, y, { alpha: a });
            if (note) txt(g, note, xs + textWidth(g, name) + 8, y, { mono: true, alpha: 0.7 * a });
          } else {
            if (note) txt(g, note, xs, y, { mono: true, align: 'right', alpha: 0.7 * a });
            txt(g, name, xs - (note ? textWidth(g, note, true) + 8 : 0), y, { align: 'right', alpha: a });
          }
        }
        // markers
        const sn = p.sn;
        if (sn > 0.5) {
          const x = pl.X(2e7);
          const y = R.y + 4.5 * rowH;
          g.save();
          g.strokeStyle = accent2;
          g.lineWidth = 1.25;
          g.globalAlpha = Math.min(1, sn);
          g.beginPath();
          g.moveTo(x, y - bh / 2 - 2);
          g.lineTo(x, y - bh / 2 - 12);
          g.stroke();
          g.restore();
          txt(g, 'SN 1987A', x, y - bh / 2 - 22, { align: 'center', color: accent2, alpha: sn });
        }
        const as = p.astro;
        if (as > 0.5) {
          const pev = NU.KM3_EVENT_PEV.value as number;
          const x = pl.X(pev * EV.PeV);
          const y = R.y + 7.5 * rowH;
          pl.dot(pev * EV.PeV, 1 - 7.5 / 8, 4, accent2);
          g.save();
          g.strokeStyle = accent2;
          g.globalAlpha = Math.min(1, as);
          g.lineWidth = 1.25;
          g.beginPath();
          g.moveTo(x, y - 5);
          g.lineTo(x, y - bh / 2 - 12);
          g.stroke();
          g.restore();
          txt(g, `KM3-230213A · ${pev} PeV`, Math.min(x, R.x + R.w - 4), y - bh / 2 - 22, { align: x > R.x + R.w - 90 ? 'right' : 'center', color: accent2, alpha: as });
        }
      },
    });
  },
} satisfies SceneModule;
export default mod;
