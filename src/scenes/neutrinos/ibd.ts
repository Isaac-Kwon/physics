/**
 * nu.ibd — P9 walkthrough of inverse beta decay in a liquid-scintillator sphere (JUNO-like): nu_e-bar + p -> e+ + n.
 * One continuous camera: reactor + sphere (50 km apart, NU.JUNO_BASELINE_KM) -> the sphere cutaway (R = 17.7 m, PMT ring)
 * -> a 1 m window on the interaction vertex, drawn TO SCALE (scale bar 10 cm): positron range 1.5 cm, annihilation gammas
 * ~25 cm, neutron random walk (45 elastic steps on hydrogen, step 7 cm shrinking to ~1 cm) ending in capture ~ 20 cm away.
 * Timeline: prompt pulse at t = 0 with E_vis = E_nu - 0.78 MeV (E_nu = 4.5 MeV -> 3.7 MeV visible), delayed pulse at
 * 200 us (NU.IBD_DELAY_US) with the 2.2 MeV capture gamma (NU.N_CAPTURE_GAMMA_MEV).
 * Energy plot: prompt spectrum ~ flux(E) x sigma(E), with flux exp(0.870 - 0.160 E - 0.091 E^2) and
 * sigma ~ (E - 1.293) sqrt((E - 1.293)^2 - 0.511^2); dashed = no oscillation, solid = times 1 - 0.81 sin^2(1.27 dm21^2 L/E) at
 * L = 50 km (the fast dm31^2 wiggles are left out).
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, clamp, smooth, lerp } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { NU } from '../../data/neutrinos';
import { createStage, arrow, dim, dot, glow, line, poly, ring, txt } from './_n2-common';

const STATES = ['reactor', 'inverse-beta', 'prompt', 'delayed', 'energy', 'coincidence'] as const;
const RS = 17.7; // m
const V = { x: -8, y: 4 };
const E_NU = 4.5;
const E_PROMPT = E_NU - 0.782;
const E_DELAY = NU.N_CAPTURE_GAMMA_MEV.value as number;
const T_DELAY = 200; // us

type P = { far: number; zoom: number; world: number; tl: number; en: number; co: number };
const TARGETS: Record<string, P> = {
  reactor: { far: 1, zoom: 0, world: 1, tl: 0, en: 0, co: 0 },
  'inverse-beta': { far: 0, zoom: 1, world: 1, tl: 0, en: 0, co: 0 },
  prompt: { far: 0, zoom: 1, world: 1, tl: 1, en: 0, co: 0 },
  delayed: { far: 0, zoom: 1, world: 1, tl: 1, en: 0, co: 0 },
  energy: { far: 0, zoom: 1, world: 0, tl: 0, en: 1, co: 0 },
  coincidence: { far: 0, zoom: 1, world: 0, tl: 0, en: 0, co: 1 },
};

const flux = (E: number) => Math.exp(0.87 - 0.16 * E - 0.091 * E * E);
const sig = (E: number) => {
  const e = E - 1.293;
  return e > 0.511 ? e * Math.sqrt(e * e - 0.511 * 0.511) : 0;
};
const spec = (Ep: number) => {
  const E = Ep + 0.782;
  return flux(E) * sig(E);
};
const SPEC_MAX = Math.max(...Array.from({ length: 200 }, (_, i) => spec((i / 200) * 10)));
const DM21 = NU.DM2_SOL_EV2.value as number;
const pSurv = (Ep: number) => {
  const Egev = (Ep + 0.782) / 1000;
  return 1 - 0.81 * Math.sin(1.27 * DM21 * (NU.JUNO_BASELINE_KM.value as number) / Egev) ** 2;
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const f0 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 0 });
    const f1 = (v: number) => ctx.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const rnd = mulberry32(7);

    // neutron walk (world metres, relative to the vertex)
    const walk: [number, number][] = [[0, 0]];
    {
      let a = (25 * Math.PI) / 180;
      for (let i = 0; i < 45; i++) {
        const l = 0.07 * Math.exp(-i / 12) + 0.012;
        a = i === 0 ? a : rnd() * Math.PI * 2;
        const [x, y] = walk[walk.length - 1];
        walk.push([x + l * Math.cos(a), y + l * Math.sin(a)]);
      }
    }
    const segLen = walk.slice(1).map((p, i) => Math.hypot(p[0] - walk[i][0], p[1] - walk[i][1]));
    const totLen = segLen.reduce((s, v) => s + v, 0);
    const endN = walk[walk.length - 1];
    const dCap = Math.hypot(endN[0], endN[1]);
    const AE = (205 * Math.PI) / 180; // positron direction
    const AG = (100 * Math.PI) / 180; // annihilation gamma axis
    const AC = (300 * Math.PI) / 180; // capture gamma direction
    // singles for the coincidence view
    const singles = Array.from({ length: 16 }, () => ({ t: 40 + rnd() * 1900, e: 0.3 + rnd() * 2.9 }));
    singles.push({ t: 1030, e: 0.9 });
    const PAIR_T = 700;
    const WIN = 400;
    const pmtAng = Array.from({ length: 140 }, (_, i) => (i / 140) * Math.PI * 2);

    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { reactor: 2, 'inverse-beta': 3, prompt: 3, delayed: 6 },
      tau: 0.7,
      draw(g, s, lv, env) {
        const { w, h } = s;
        const narrow = w < 520;
        const fin = env.ts >= 1e3;
        const ts = env.ts;
        const st = env.state;

        // ---------------- camera ----------------
        const rs0 = Math.min(h * 0.3, w * 0.17);
        const s0 = rs0 / RS;
        const s1 = w / 1.1;
        const z = lv.zoom;
        const sc = Math.exp(lerp(Math.log(s0), Math.log(s1), z));
        const o0 = { x: w * 0.78, y: h * 0.42 };
        const o1 = { x: w * 0.4, y: h * 0.44 };
        const org = { x: lerp(o0.x, o1.x, z), y: lerp(o0.y, o1.y, z) };
        const fo = { x: lerp(0, V.x, z), y: lerp(0, V.y, z) };
        const Pw = (x: number, y: number): [number, number] => [org.x + (x - fo.x) * sc, org.y - (y - fo.y) * sc];

        // ---------------- far view: reactor, 50 km, sphere ----------------
        if (lv.far > 0.01) {
          const a = lv.far;
          const rx = w * 0.1;
          const ry = h * 0.42;
          poly(g, [[rx - 18, ry + 26], [rx - 11, ry - 10], [rx - 15, ry - 26], [rx + 15, ry - 26], [rx + 11, ry - 10], [rx + 18, ry + 26]], th.fg, 1.2, 0.8 * a);
          line(g, rx - 28, ry + 26, rx + 28, ry + 26, th.fg, 1.2, 0.8 * a);
          txt(g, L('reactors'), narrow ? 8 : rx, ry + 44, { color: th.fg, align: narrow ? 'left' : 'center', alpha: 0.9 * a });
          const [sx, sy] = Pw(0, 0);
          for (let i = -2; i <= 2; i++) {
            const ex = sx - Math.sqrt(Math.max(0, (rs0) ** 2 - (i * rs0 * 0.28) ** 2));
            line(g, rx + 26, ry + i * 7, ex, sy + i * rs0 * 0.28, th.fg, 1, 0.5 * a, [5, 4]);
          }
          txt(g, L('antinu'), (rx + sx) / 2, sy - rs0 * 0.7 - 6, { color: th.fg, align: 'center', alpha: 0.9 * a });
          dim(g, rx, sy + rs0 + 30, sx, sy + rs0 + 30, `≈ ${f0(NU.JUNO_BASELINE_KM.value as number)} km`, th.fg, 0.8 * a);
        }

        // ---------------- sphere cutaway (all world states) ----------------
        if (lv.world > 0.01 && sc < 40) {
          const a = lv.world;
          const [cx, cy] = Pw(0, 0);
          const R = RS * sc;
          ring(g, cx, cy, R, th.accent2, 1.2, 0.8 * a);
          g.save();
          g.globalAlpha = 0.06 * a;
          g.fillStyle = th.accent2;
          g.beginPath();
          g.arc(cx, cy, R, 0, Math.PI * 2);
          g.fill();
          g.restore();
          pmtAng.forEach((t) => dot(g, cx + (R + 5) * Math.cos(t), cy - (R + 5) * Math.sin(t), 1.7, th.fg, 0.6 * a));
          if (z < 0.4) {
            txt(g, `${f0(NU.JUNO_MASS_KT.value as number)} kt ${L('scint')}`, cx, cy + 4, { color: th.fg, align: 'center', alpha: 0.9 * a * (1 - z / 0.4) });
            if (!narrow) txt(g, L('pmtNote'), cx, cy + R + 22, { color: th.fg, align: 'center', alpha: 0.85 * a * (1 - z / 0.4) });
            dim(g, cx - R, cy - R - 14, cx + R, cy - R - 14, `${f0(2 * RS)} m`, th.fg, 0.7 * a * (1 - z / 0.4));
          }
        }

        // ---------------- zoomed interaction (to scale) ----------------
        if (lv.world > 0.01 && z > 0.3) {
          const a = lv.world * smooth(0.3, 1, z);
          const [vx, vy] = Pw(V.x, V.y);
          const M = (dx: number, dy: number): [number, number] => [vx + dx * sc, vy - dy * sc];
          const tIn = st === 'inverse-beta' ? (fin ? 9 : ts) : 9;
          const tPh = st === 'prompt' ? (fin ? 9 : ts) : st === 'delayed' || st === 'coincidence' || st === 'energy' ? 9 : st === 'inverse-beta' ? 0 : 0;
          const showAfter = st === 'inverse-beta' ? clamp((tIn - 0.8) / 0.5) : 1;
          // incoming antineutrino
          const [ax, ay] = M(-0.7, 0);
          const nuHead = st === 'inverse-beta' ? clamp(tIn / 0.8) : 1;
          line(g, ax, ay, ax + (vx - ax) * nuHead, ay + (vy - ay) * nuHead, th.fg, 1, 0.7 * a, [5, 4]);
          txt(g, L('antinuE'), ax + 4, ay - 12, { color: th.fg, alpha: 0.9 * a });
          dot(g, vx, vy, 3, th.fg, a * (showAfter < 1 ? 1 : 0.9));
          if (showAfter < 1) txt(g, 'p', vx + 8, vy + 14, { mono: true, color: th.fg, alpha: a });
          // positron: range 1.5 cm
          const dimm = st === 'delayed' ? 0.35 : 1;
          const [pex, pey] = M(0.015 * Math.cos(AE), 0.015 * Math.sin(AE));
          line(g, vx, vy, vx + (pex - vx) * showAfter, vy + (pey - vy) * showAfter, th.accent, 2, a * dimm);
          if (st === 'inverse-beta' && showAfter > 0.9) txt(g, 'e⁺', pex - 6, pey + 14, { mono: true, color: th.accent, align: 'right', alpha: a });
          // neutron's first step (inverse-beta) or the whole walk (delayed)
          const uWalk = st === 'delayed' ? (fin ? 1 : clamp(ts / 3)) : st === 'inverse-beta' ? 0 : st === 'prompt' ? 0 : 1;
          const first = st === 'inverse-beta' ? showAfter : 0;
          if (first > 0) {
            const [n1x, n1y] = M(walk[1][0] * 1.6, walk[1][1] * 1.6);
            line(g, vx, vy, vx + (n1x - vx) * first, vy + (n1y - vy) * first, th.fg, 1.2, 0.9 * a, [2, 3]);
            if (first > 0.9) {
              ring(g, n1x, n1y, 3, th.fg, 1, a);
              txt(g, 'n', n1x + 10, n1y - 8, { mono: true, color: th.fg, alpha: a });
            }
          }
          if (uWalk > 0 || st === 'energy') {
            let remain = uWalk * totLen;
            const pts: [number, number][] = [M(0, 0)];
            for (let i = 0; i < segLen.length && remain > 0; i++) {
              const f = Math.min(1, remain / segLen[i]);
              pts.push(M(walk[i][0] + (walk[i + 1][0] - walk[i][0]) * f, walk[i][1] + (walk[i + 1][1] - walk[i][1]) * f));
              remain -= segLen[i];
            }
            poly(g, pts, th.fg, 1, 0.8 * a);
            const hd = pts[pts.length - 1];
            if (uWalk < 1) dot(g, hd[0], hd[1], 2.4, th.fg, a);
          }
          // prompt: annihilation + flash 1
          const flash1 = st === 'prompt' ? (fin ? 1 : smooth(0, 0.5, tPh)) : st === 'delayed' ? 0.25 : 0;
          if (flash1 > 0.01) {
            glow(g, pex, pey, 46, th.accent2, 0.85 * flash1 * a);
            const gl = 0.25 * sc;
            const g1 = M(0.015 * Math.cos(AE) + gl * Math.cos(AG) / sc, 0.015 * Math.sin(AE) + gl * Math.sin(AG) / sc);
            const g2 = M(0.015 * Math.cos(AE) - gl * Math.cos(AG) / sc, 0.015 * Math.sin(AE) - gl * Math.sin(AG) / sc);
            const gp = st === 'prompt' ? (fin ? 1 : smooth(0.3, 1.1, tPh)) : 1;
            line(g, pex, pey, pex + (g1[0] - vx) * gp, pey + (g1[1] - vy) * gp, th.fg, 1, 0.8 * a * dimm);
            line(g, pex, pey, pex + (g2[0] - vx) * gp, pey + (g2[1] - vy) * gp, th.fg, 1, 0.8 * a * dimm);
            if (st === 'prompt') {
              txt(g, L('annih'), pex + (g1[0] - vx) + 8, pey + (g1[1] - vy) - 4, { color: th.fg, alpha: a * gp });
              txt(g, L('flash1'), pex - 30, pey + (narrow ? 70 : 40), { color: th.accent2, align: 'right', alpha: a * flash1 });
            }
          }
          // delayed: capture + flash 2
          if (st === 'delayed') {
            const [cx2, cy2] = M(endN[0], endN[1]);
            const f2 = fin ? 1 : smooth(2.9, 3.6, ts);
            if (f2 > 0.01) {
              glow(g, cx2, cy2, 34, th.accent2, 0.8 * f2 * a);
              const gl = 0.28 * sc;
              line(g, cx2, cy2, cx2 + gl * Math.cos(AC), cy2 - gl * Math.sin(AC), th.fg, 1, 0.9 * a * f2);
              txt(g, L('gamma22'), cx2 + gl * Math.cos(AC) + 6, cy2 - gl * Math.sin(AC) + 14, { color: th.fg, alpha: a * f2 });
              txt(g, L('flash2'), cx2 + 30, cy2 - 22, { color: th.accent2, alpha: a * f2 });
              ring(g, cx2, cy2, 5, th.fg, 1, 0.9 * a);
            }
            const [ex1, ey1] = M(0, 0);
            line(g, ex1, ey1, cx2, cy2, th.fg, 1, 0.6 * a * f2, [2, 3]);
            txt(g, `${f0(dCap * 100)} cm`, (ex1 + cx2) / 2 - 8, (ey1 + cy2) / 2 + 12, { mono: true, color: th.fg, align: 'right', alpha: 0.9 * a * f2 });
          }
          // scale bar and equation
          if (z > 0.9) {
            const bx = 16;
            const by = h - (lv.tl > 0.3 ? 112 : 26);
            line(g, bx, by, bx + 0.1 * sc, by, th.fg, 1.5, 0.9 * a);
            txt(g, '10 cm', bx, by - 11, { mono: true, color: th.fg, alpha: a });
            if (!narrow) txt(g, L('zoomNote'), bx + 0.1 * sc + 12, by, { color: th.fg, alpha: 0.7 * a });
          }
          const eq = st === 'inverse-beta' ? 'ν̄ₑ + p → e⁺ + n' : st === 'prompt' ? 'e⁺ + e⁻ → γ + γ' : st === 'delayed' ? 'n + p → d + γ (2.2 MeV)' : '';
          if (eq) txt(g, eq, w - 16, 18, { mono: true, color: th.fg, align: 'right', alpha: 0.95 * a });
        }

        // ---------------- timeline strip: prompt and delayed pulses ----------------
        if (lv.tl > 0.01) {
          const a = lv.tl;
          const x0 = 56;
          const x1 = w - 24;
          const yb = h - 34;
          const TX = (t: number) => x0 + ((x1 - x0) * t) / 400;
          const EY = (e: number) => yb - e * 11;
          line(g, x0, yb, x1, yb, th.fg, 1, 0.5 * a);
          [0, 100, 200, 300, 400].forEach((t) => {
            line(g, TX(t), yb, TX(t), yb + 4, th.fg, 1, 0.5 * a);
            txt(g, String(t), TX(t), yb + 14, { mono: true, color: th.fg, align: 'center', alpha: 0.6 * a });
          });
          txt(g, L('usAxis'), x1, yb + 28, { color: th.fg, align: 'right', alpha: 0.85 * a });
          [0, 2, 4].forEach((e) => {
            line(g, x0 - 4, EY(e), x0, EY(e), th.fg, 1, 0.5 * a);
            txt(g, String(e), x0 - 8, EY(e), { mono: true, color: th.fg, align: 'right', alpha: 0.6 * a });
          });
          txt(g, 'MeV', x0 - 8, EY(4) - 12, { mono: true, color: th.fg, align: 'right', alpha: 0.7 * a });
          const p1 = st === 'prompt' ? (fin ? 1 : smooth(0.4, 0.7, ts)) : 1;
          line(g, TX(0), yb, TX(0), EY(E_PROMPT), th.accent, 2.5, a * p1);
          txt(g, `${f1(E_PROMPT)} MeV`, TX(0) + 8, EY(E_PROMPT) + 4, { mono: true, color: th.accent, alpha: a * p1 });
          if (st === 'delayed') {
            const p2 = fin ? 1 : smooth(2.9, 3.4, ts);
            const clock = fin ? T_DELAY : Math.min(T_DELAY, (ts / 3) * T_DELAY);
            line(g, TX(T_DELAY), yb, TX(T_DELAY), EY(E_DELAY), th.accent, 2.5, a * p2);
            txt(g, `${f1(E_DELAY)} MeV`, TX(T_DELAY) + 8, EY(E_DELAY) + 4, { mono: true, color: th.accent, alpha: a * p2 });
            txt(g, `t = ${f0(clock)} µs`, x1, yb - 44, { mono: true, color: th.fg, align: 'right', alpha: 0.9 * a });
            line(g, TX(clock), yb - 6, TX(clock), yb, th.fg, 1.5, 0.9 * a);
          }
        }

        // ---------------- energy spectrum ----------------
        if (lv.en > 0.01) {
          const a = lv.en;
          const R = { x: 52, y: 40, w: Math.max(100, w - 76), h: h - 110 };
          const p = plot(g, ctx, R, { min: 0, max: 10, label: L('promptAxis'), ticks: [0, 2, 4, 6, 8, 10].map((v) => ({ v, label: String(v) })) }, { min: 0, max: 1.15, label: L('spectrumAxis'), ticks: [] });
          g.save();
          g.globalAlpha = a;
          p.axes();
          const draw = (f: (x: number) => number, st2: { color: string; dash?: number[]; width: number }) => {
            const pts: [number, number][] = [];
            for (let i = 0; i <= 200; i++) {
              const x = (i / 200) * 10;
              if (spec(x) > 0) pts.push([x, f(x)]);
            }
            p.path(pts, st2);
          };
          draw((x) => spec(x) / SPEC_MAX, { color: th.fg, dash: [4, 4], width: 1 });
          draw((x) => (spec(x) * pSurv(x)) / SPEC_MAX, { color: th.accent, width: 1.6 });
          p.text(narrow ? 10 : 6.4, 0.46, L('noOsc'), { align: narrow ? 'right' : 'left' });
          p.text(narrow ? 10 : 6.4, 0.2, narrow ? L('withOscS') : L('withOsc'), { align: narrow ? 'right' : 'left', color: th.accent });
          p.vline(E_PROMPT, { color: th.accent, dash: [3, 3], alpha: 0.7 });
          p.text(E_PROMPT + 0.15, 1.08, L('thisEvent'), { color: th.accent, align: 'left' });
          p.vline(1.8 - 0.782, { color: th.fg, dash: [2, 3], alpha: 0.5 });
          p.text(1.8 - 0.782 - 0.15, 0.9, L('threshold'), { align: 'right' });
          const ax = narrow ? p.X(4.6) : p.X(6.2);
          const ay = R.y + 22;
          arrow(g, ax, ay + 20, ax + 70, ay + 20, th.fg, 1.2, 0.9, 6);
          txt(g, narrow ? 'E_ν ≈ E_p + 0.8 MeV' : 'E_ν ≈ E_prompt + 0.8 MeV', ax, ay + 4, { mono: true, color: th.fg, alpha: 0.95 });
          g.restore();
        }

        // ---------------- coincidence strip ----------------
        if (lv.co > 0.01) {
          const a = lv.co;
          const x0 = 52;
          const x1 = w - 24;
          const yb = h * 0.7;
          const hh = Math.min(170, h * 0.4);
          const TX = (t: number) => x0 + ((x1 - x0) * t) / 2000;
          const EY = (e: number) => yb - (e / 4.5) * hh;
          const reveal = fin ? 1 : smooth(0, 2.5, ts);
          // window box
          const win0 = TX(PAIR_T);
          const win1 = TX(PAIR_T + WIN);
          g.save();
          g.globalAlpha = 0.1 * a;
          g.fillStyle = th.accent;
          g.fillRect(win0, EY(4.5), win1 - win0, hh);
          g.restore();
          line(g, win0, EY(4.5), win0, yb, th.accent, 1, 0.9 * a);
          line(g, win1, EY(4.5), win1, yb, th.accent, 1, 0.9 * a);
          line(g, win0, EY(4.5), win1, EY(4.5), th.accent, 1, 0.9 * a);
          txt(g, L('window'), (win0 + win1) / 2, EY(4.5) - 11, { color: th.accent, align: 'center', alpha: a });
          // energy cut of the delayed flash
          g.save();
          g.globalAlpha = 0.14 * a;
          g.fillStyle = th.fg;
          g.fillRect(win0, EY(E_DELAY + 0.3), win1 - win0, EY(E_DELAY - 0.3) - EY(E_DELAY + 0.3));
          g.restore();
          line(g, x0, yb, x1, yb, th.fg, 1, 0.5 * a);
          [0, 500, 1000, 1500, 2000].forEach((t) => {
            line(g, TX(t), yb, TX(t), yb + 4, th.fg, 1, 0.5 * a);
            txt(g, String(t), TX(t), yb + 14, { mono: true, color: th.fg, align: 'center', alpha: 0.6 * a });
          });
          txt(g, L('usAxis2'), x1, yb + 30, { color: th.fg, align: 'right', alpha: 0.85 * a });
          [0, 2, 4].forEach((e) => {
            line(g, x0 - 4, EY(e), x0, EY(e), th.fg, 1, 0.5 * a);
            txt(g, String(e), x0 - 8, EY(e), { mono: true, color: th.fg, align: 'right', alpha: 0.6 * a });
          });
          txt(g, 'MeV', x0 - 8, EY(4.5) - 4, { mono: true, color: th.fg, align: 'right', alpha: 0.7 * a });
          singles.forEach((q) => {
            if (q.t / 2000 > reveal) return;
            line(g, TX(q.t), yb, TX(q.t), EY(q.e), th.fg, 1.5, 0.5 * a);
          });
          if (reveal > PAIR_T / 2000) line(g, TX(PAIR_T), yb, TX(PAIR_T), EY(E_PROMPT), th.accent, 2.5, a);
          if (reveal > (PAIR_T + T_DELAY) / 2000) line(g, TX(PAIR_T + T_DELAY), yb, TX(PAIR_T + T_DELAY), EY(E_DELAY), th.accent, 2.5, a);
          if (reveal > 0.9) {
            txt(g, L('pair'), TX(PAIR_T + T_DELAY) + 8, EY(3.2), { color: th.accent, alpha: a });
            ring(g, TX(1030), EY(0.9), 4, th.fg, 1, 0.9 * a);
            line(g, TX(1030), EY(0.9) + 4, TX(1030), yb + 62, th.fg, 1, 0.4 * a, [2, 3]);
            txt(g, L('single'), TX(1030) + (narrow ? -90 : 6), yb + 70, { color: th.fg, alpha: 0.85 * a });
            dim(g, TX(PAIR_T), yb + 50, TX(PAIR_T + T_DELAY), yb + 50, `${f0(T_DELAY)} µs`, th.accent, 0.9 * a);
          }
        }
      },
    });
  },
};
export default mod;
