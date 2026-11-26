/**
 * nu.interactions — Feynman-like sketches (time runs left to right; they are pictures of the process, not calculations).
 *   cc:   ν_ℓ + nucleus → ℓ⁻ + hadrons, W exchanged. Charged lepton = bright accent line (what the detector sees).
 *   nc:   ν + nucleus → ν + recoiling nucleus, Z exchanged. Outgoing ν dashed.
 *   targets: ν–e elastic scattering, ν̄ + p → e⁺ + n, coherent ν–nucleus recoil.
 *   cross-section: mean free path λ = 1/(nσ) in lead on a log length axis: n = ρN_A/A × A = 6.8×10²⁴ nucleons/cm³,
 *     σ = 10⁻³⁸ cm² (1 GeV, NU.XSEC_GEV_CM2) or 10⁻⁴³ cm² (few MeV, inverse-beta scale NU.XSEC_IBD_CM2); Earth diameter and solar radius for scale.
 */
import type { SceneModule } from '../shared/types';
import { clamp } from '../shared/canvas2d';
import { NU } from '../../data/neutrinos';
import { arrow, createStage, dot, line, logAxis, nuLine, para, sci, sup, textWidth, txt, wavy, type G } from './_n1-common';

const STATES = ['cc', 'nc', 'targets', 'cross-section'] as const;
type P = { d: number; nc: number; tg: number; xs: number };
const TARGETS: Record<string, P> = {
  cc: { d: 1, nc: 0, tg: 0, xs: 0 },
  nc: { d: 1, nc: 1, tg: 0, xs: 0 },
  targets: { d: 0, nc: 1, tg: 1, xs: 0 },
  'cross-section': { d: 0, nc: 1, tg: 0, xs: 1 },
};

const N_LEAD = 6.8e24; // nucleons per cm³
const mfpM = (sigmaCm2: number) => 1 / (N_LEAD * sigmaCm2) / 100; // metres
const LY = 9.461e15;

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    const part = (x0: number, y0: number, x1: number, y1: number, t: number) => [x0, y0, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t] as const;

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { cc: 2.2, nc: 2.2, targets: 2.2, 'cross-section': 2.2 },
      draw(g: G, s, p, env) {
        const { w, h } = s;
        const rv = Math.min(1, env.ts / 1.8);
        const ease = (a: number, b: number) => clamp((rv - a) / (b - a));
        const T = (x: number) => x * x * (3 - 2 * x);
        const nc = p.nc;
        const dt = env.reduced ? 0 : s.t * 28;

        // ---------------- cc / nc diagram
        if (p.d > 0.01) {
          const A = p.d;
          g.save();
          g.globalAlpha = A;
          const x0 = w * 0.1;
          const xv = w * 0.42;
          const x1 = w * 0.9;
          const y1 = h * 0.3; // lepton line
          const y2 = h * 0.58; // nucleus line
          const t1 = T(ease(0, 0.35));
          const tw = T(ease(0.35, 0.55));
          const t3 = T(ease(0.55, 1));
          txt(g, nc < 0.5 ? L('mapCC') : L('mapNC'), w / 2, Math.max(18, h * 0.07), { align: 'center', alpha: 0.85 });
          // incoming neutrino
          {
            const [a, b, c, d] = part(x0, y1, xv, y1, t1);
            nuLine(g, a, b, c, d, 0.85, -dt);
          }
          txt(g, L('nuIn'), x0, y1 - 16, { alpha: 0.9 });
          // nucleus in
          dot(g, x0 + 6, y2, 12, fg, 0.28);
          g.save();
          g.strokeStyle = fg;
          g.globalAlpha = 0.6 * A;
          g.beginPath();
          g.arc(x0 + 6, y2, 12, 0, Math.PI * 2);
          g.stroke();
          g.restore();
          txt(g, L('nucleus'), x0 + 6, y2 + 28, { align: 'center', alpha: 0.7 });
          {
            const [a, b, c, d] = part(x0 + 18, y2, xv, y2, t1);
            line(g, a, b, c, d, { color: fg, alpha: 0.6, width: 1.25 });
          }
          // exchanged boson
          wavy(g, xv, y1, xv, y2, { color: accent2, alpha: 0.95, amp: 4, wl: 11, grow: tw });
          if (tw > 0.7) {
            txt(g, L('W'), xv + 12, (y1 + y2) / 2, { color: accent2, alpha: (1 - nc) * 0.95, align: 'left' });
            txt(g, L('Z'), xv + 12, (y1 + y2) / 2, { color: accent2, alpha: nc * 0.95, align: 'left' });
          }
          // outgoing lepton / neutrino
          if (t3 > 0) {
            const [a, b, c, d] = part(xv, y1, x1, y1, t3);
            if (nc < 0.99) line(g, a, b, c, d, { color: accent, width: 2.2, alpha: 1 - nc });
            if (nc > 0.01) nuLine(g, a, b, c, d, 0.85 * nc, -dt);
            if (t3 > 0.9) {
              txt(g, L('lepton'), x1, y1 - 16, { align: 'right', color: accent, alpha: 1 - nc });
              txt(g, L('nuOut'), x1, y1 - 16, { align: 'right', alpha: 0.9 * nc });
            }
            // hadrons (cc)
            if (nc < 0.99) {
              const n = 5;
              for (let k = 0; k < n; k++) {
                const ang = (k / (n - 1) - 0.5) * 0.6 + 0.05;
                const len = w * 0.26 * (0.75 + 0.25 * Math.sin(k * 2.3 + 1));
                const ex = xv + Math.cos(ang) * len * t3;
                const ey = y2 + Math.sin(ang) * len * t3;
                line(g, xv, y2, ex, ey, { color: fg, alpha: 0.65 * (1 - nc), width: 1.1 });
                dot(g, ex, ey, 2.2, fg, 0.8 * (1 - nc));
              }
              if (t3 > 0.9) txt(g, L('hadrons'), xv + w * 0.26 + 10, y2 + 4, { alpha: 0.85 * (1 - nc) });
            }
            // recoiling nucleus (nc)
            if (nc > 0.01) {
              const ex = xv + w * 0.28 * t3;
              const ey = y2 + h * 0.07 * t3;
              line(g, xv, y2, ex, ey, { color: fg, alpha: 0.6 * nc, width: 1.25 });
              dot(g, ex, ey, 12, fg, 0.28 * nc);
              g.save();
              g.strokeStyle = fg;
              g.globalAlpha = 0.6 * nc;
              g.beginPath();
              g.arc(ex, ey, 12, 0, Math.PI * 2);
              g.stroke();
              g.restore();
              if (t3 > 0.9) txt(g, L('recoil'), ex + 18, ey, { alpha: 0.9 * nc });
            }
          }
          // note
          const tw2 = Math.min(w - 40, 440);
          const ny = Math.min(h * 0.84, h - 58);
          para(g, L('ccNote'), w / 2 - tw2 / 2, ny, tw2, { alpha: 0.85 * (1 - nc), lh: 16 });
          para(g, L('ncNote'), w / 2 - tw2 / 2, ny, tw2, { alpha: 0.85 * nc, lh: 16 });
          g.restore();
        }

        // ---------------- targets
        if (p.tg > 0.01) {
          const A = p.tg;
          g.save();
          g.globalAlpha = A;
          const rowH = h / 3;
          const sx0 = 22;
          const sx1 = Math.min(w * 0.5, 380);
          const tx = sx1 + 30;
          const tW = w - tx - 14;
          const rows = [
            { key: 'tEl', eq: 'ν + e⁻ → ν + e⁻', det: 'Super-Kamiokande' },
            { key: 'tP', eq: 'ν̄_e + p → e⁺ + n', det: 'JUNO' },
            { key: 'tN', eq: 'ν + N → ν + N', det: 'COHERENT' },
          ];
          rows.forEach((r, i) => {
            const cy = rowH * (i + 0.5);
            const px = sx0 + (sx1 - sx0) * 0.4;
            const t = T(ease(0.1 + i * 0.1, 0.7 + i * 0.1));
            const len = (sx1 - sx0) * 0.36;
            // incoming neutrino
            {
              const [a, b, c, d] = part(sx0, cy, px, cy, T(ease(0, 0.4)));
              nuLine(g, a, b, c, d, 0.85, -dt);
            }
            if (i === 0) {
              dot(g, px, cy, 3.5, fg, 0.9);
              if (t > 0) {
                nuLine(g, px, cy, px + len * 0.95 * t, cy - len * 0.35 * t, 0.85, -dt);
                arrow(g, px, cy, px + len * 0.8 * t, cy + len * 0.55 * t, { color: accent, width: 2, head: 7 });
                if (t > 0.9) txt(g, 'e⁻', px + len * 0.8 + 8, cy + len * 0.55, { color: accent, alpha: 0.95 });
              }
            } else if (i === 1) {
              dot(g, px, cy, 7, fg, 0.55);
              if (t > 0) {
                arrow(g, px, cy, px + len * 0.85 * t, cy - len * 0.5 * t, { color: accent, width: 2, head: 7 });
                line(g, px, cy, px + len * 0.8 * t, cy + len * 0.5 * t, { color: accent2, width: 1.5 });
                if (t > 0.9) {
                  dot(g, px + len * 0.8, cy + len * 0.5, 3.2, accent2, 1);
                  txt(g, 'e⁺', px + len * 0.85 + 8, cy - len * 0.5, { color: accent, alpha: 0.95 });
                  txt(g, 'n', px + len * 0.8 + 8, cy + len * 0.5, { color: accent2, alpha: 0.95 });
                }
              }
            } else {
              for (let k = 0; k < 7; k++) {
                const ang = k * 2.4;
                const rr = k ? 6.5 : 0;
                dot(g, px + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 3.4, k % 2 ? accent2 : fg, 0.75);
              }
              if (t > 0) {
                nuLine(g, px, cy, px + len * 0.95 * t, cy - len * 0.12 * t, 0.85, -dt);
                arrow(g, px + 4, cy + 12, px + 4 + len * 0.22 * t, cy + 12 + len * 0.2 * t, { color: accent, width: 2, head: 6 });
                if (t > 0.9) txt(g, L('recoilTiny'), px + 4 + len * 0.22 + 8, cy + 12 + len * 0.2, { alpha: 0.85 });
              }
            }
            const nameY = cy - 18;
            const yy = para(g, L(r.key), tx, nameY, tW, { alpha: 0.95, lh: 15 });
            txt(g, r.eq, tx, yy + 8, { alpha: 0.85 });
            txt(g, r.det, tx, yy + 26, { color: accent, alpha: 0.95 });
            if (i < 2) line(g, 16, rowH * (i + 1), w - 16, rowH * (i + 1), { color: fg, alpha: 0.15, width: 1 });
          });
          g.restore();
        }

        // ---------------- cross-section
        if (p.xs > 0.01) {
          const A = p.xs;
          g.save();
          g.globalAlpha = A;
          const mx = 30;
          const mw = w - mx - 26;
          const axY = h * 0.8;
          const dec: { v: number; label: string }[] = [];
          for (let e = 6; e <= 18; e += 3) dec.push({ v: 10 ** e, label: `10${sup(e)}` });
          const X = logAxis(g, mx, axY, mw, 1e6, 1e18, dec, fg);
          txt(g, L('lenAxis'), mx + mw, axY + 32, { align: 'right', alpha: 0.85 });
          const rows = [
            { key: 'earth', v: 1.2742e7, col: fg, a: 0.55 },
            { key: 'sun', v: 6.957e8, col: fg, a: 0.55 },
            { key: 'pb1GeV', v: mfpM(NU.XSEC_GEV_CM2.value), col: accent2, a: 0.95 },
            { key: 'pbMeV', v: mfpM(NU.XSEC_IBD_CM2.value), col: accent, a: 0.95 },
          ];
          const top = Math.max(26, h * 0.08);
          const rh = (axY - 30 - top) / 4;
          rows.forEach((r, i) => {
            const y = top + rh * (i + 0.5) + 6;
            const grow = T(ease(0.1 + i * 0.12, 0.7 + i * 0.12));
            const xe = X(1e6) + (X(r.v) - X(1e6)) * grow;
            g.fillStyle = r.col;
            g.globalAlpha = r.a * A;
            g.fillRect(X(1e6), y - 3, Math.max(1, xe - X(1e6)), 6);
            g.globalAlpha = A;
            txt(g, `${L(r.key)}`, mx, y - 14, { alpha: 0.9 });
            txt(g, `${sci(r.v, 2)} m`, mx + textWidth(g, L(r.key)) + 10, y - 14, { mono: true, alpha: 0.9 * grow });
          });
          // one light-year
          const xl = X(LY);
          line(g, xl, top + 6, xl, axY, { color: fg, alpha: 0.5, dash: [3, 4], width: 1 });
          txt(g, L('lightYear'), xl - 6, axY - 14, { align: 'right', alpha: 0.8 });
          const note = `λ = 1/(nσ),  n = ${sci(N_LEAD, 2)} cm⁻³`;
          txt(g, note, mx, h - 12, { mono: true, alpha: 0.65 });
          g.restore();
        }
        void accent;
      },
    });
  },
} satisfies SceneModule;
export default mod;
