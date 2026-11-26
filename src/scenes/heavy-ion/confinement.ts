/**
 * hi.confinement — Canvas2D, steps. Lengths are in fm (a scale bar is always drawn).
 *   string      a proton: three quarks (colour charges r, g, b) in a ~0.8 fm radius region, joined by gluon field lines
 *   stretch     one quark is pulled out; a flux tube of CONSTANT thickness joins it to the other two; stored energy E = κ r
 *   break       at r ≈ 1 fm the tube snaps; a new q q̄ pair appears at the break → a meson and a baryon, no free quark
 *   deconfined  many overlapping hadrons dissolve into one region where quarks and gluons move freely (QGP)
 * Quantities: string tension κ ≈ 1 GeV/fm (HI.STRING_TENSION_GEV_FM), breaking separation ~1 fm. Antiquarks are rings.
 * Each state auto-plays (≈2–3 s) in steps mode; setProgress, if called, scrubs the same motion.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { approach, clamp, createCanvas2D, gaussian, mulberry32, smooth } from '../shared/canvas2d';
import { FONT_MONO, FONT_SANS } from '../shared/plot';
import { HI } from '../../data/heavy-ion';
import { QCOL } from './_s1-common';

const STATES = ['string', 'stretch', 'break', 'deconfined'] as const;
const KAPPA = HI.STRING_TENSION_GEV_FM.value; // GeV/fm
const R_BREAK = 1.0; // fm
const DUR = [1, 2.4, 2.2, 3.2];

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const rnd = mulberry32(7);
    const colors = [QCOL.r, QCOL.g, QCOL.b];
    const antiColors = [QCOL.ar, QCOL.ag, QCOL.ab];

    // plasma dots (fm units, relative to centre)
    interface Dot {
      x: number;
      y: number;
      hx: number;
      hy: number;
      vx: number;
      vy: number;
      col: number;
      anti: boolean;
    }
    const dots: Dot[] = [];
    const hadrons: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    for (let k = 0; k < 6; k++) hadrons.push({ x: 0.95 * Math.cos((k * Math.PI) / 3 + 0.3), y: 0.95 * Math.sin((k * Math.PI) / 3 + 0.3) });
    for (const hd of hadrons) {
      const a0 = rnd() * Math.PI * 2;
      for (let j = 0; j < 3; j++) {
        const a = a0 + (j * 2 * Math.PI) / 3;
        const hx = hd.x + 0.26 * Math.cos(a);
        const hy = hd.y + 0.26 * Math.sin(a);
        const va = rnd() * Math.PI * 2;
        dots.push({ x: hx, y: hy, hx, hy, vx: Math.cos(va), vy: Math.sin(va), col: j, anti: false });
      }
    }
    // a few extra q q̄ pairs: plasma at high T has pairs, net baryon number stays what it was
    for (let k = 0; k < 5; k++) {
      for (const anti of [false, true]) {
        const a = rnd() * Math.PI * 2;
        const r = 1.6 * Math.sqrt(rnd());
        const va = rnd() * Math.PI * 2;
        dots.push({ x: r * Math.cos(a), y: r * Math.sin(a), hx: r * Math.cos(a), hy: r * Math.sin(a), vx: Math.cos(va), vy: Math.sin(va), col: Math.floor(rnd() * 3), anti });
      }
    }
    const R_PLASMA = 2.1;
    const SPEED = 0.75; // fm/s on screen (schematic; real quarks are relativistic)
    function sim(dt: number, dec: number) {
      for (const d of dots) {
        const turn = gaussian(rnd) * 2.2 * dt;
        const c = Math.cos(turn);
        const s = Math.sin(turn);
        const vx = d.vx * c - d.vy * s;
        const vy = d.vx * s + d.vy * c;
        d.vx = vx;
        d.vy = vy;
        d.x += d.vx * SPEED * dt * dec;
        d.y += d.vy * SPEED * dt * dec;
        const k = 1 - dec;
        d.x += (d.hx - d.x) * Math.min(1, 6 * dt) * k;
        d.y += (d.hy - d.y) * Math.min(1, 6 * dt) * k;
        const r = Math.hypot(d.x, d.y);
        if (r > R_PLASMA - 0.1) {
          const nx = d.x / r;
          const ny = d.y / r;
          const dot = d.vx * nx + d.vy * ny;
          if (dot > 0) {
            d.vx -= 2 * dot * nx;
            d.vy -= 2 * dot * ny;
          }
          d.x = nx * (R_PLASMA - 0.1);
          d.y = ny * (R_PLASMA - 0.1);
        }
      }
    }

    // state
    let idx = 0;
    let tt = 0;
    let auto = true;
    let pull = 0;
    let snap = 0;
    let scene3 = 0;
    let dec = 0;
    let DR = 6;

    const L = (k: string) => ctx.label(k);
    const num = (v: number, d = 2) => ctx.formatNumber(v, { minimumFractionDigits: d, maximumFractionDigits: d });

    const c = createCanvas2D(ctx, (g, s) => {
      if (auto && !ctx.reducedMotion) tt = Math.min(1, tt + s.dt / DUR[idx]);
      const pullT = idx === 0 ? 0 : idx === 1 ? tt : 1;
      const snapT = idx < 2 ? 0 : idx === 2 ? tt : 1;
      const s3T = idx === 3 ? 1 : 0;
      const decT = idx === 3 ? smooth(0.25, 1, tt) : 0;
      const tau = 0.25;
      pull = approach(pull, pullT, s.dt, tau);
      snap = approach(snap, snapT, s.dt, tau);
      scene3 = approach(scene3, s3T, s.dt, 0.35);
      dec = approach(dec, decT, s.dt, 0.25);
      if (scene3 > 0.01 || idx === 3) sim(s.dt, dec);
      const moving = (auto && tt < 1) || Math.abs(pull - pullT) > 0.002 || Math.abs(snap - snapT) > 0.002 || Math.abs(scene3 - s3T) > 0.002 || Math.abs(dec - decT) > 0.002 || (idx === 3 && s.dt > 0);
      c.animate = moving;
      draw(g, s.w, s.h);
    });

    function txt(g: CanvasRenderingContext2D, str: string, x: number, y: number, o: { a?: number; align?: CanvasTextAlign; mono?: boolean; base?: CanvasTextBaseline } = {}) {
      g.save();
      g.font = o.mono ? FONT_MONO : FONT_SANS;
      g.fillStyle = ctx.theme.fg;
      g.globalAlpha = (o.a ?? 0.85) * 1;
      g.textAlign = o.align ?? 'left';
      g.textBaseline = o.base ?? 'middle';
      g.fillText(str, x, y);
      g.restore();
    }
    function dotAt(g: CanvasRenderingContext2D, x: number, y: number, col: number, anti: boolean, r = DR, a = 1) {
      g.save();
      g.globalAlpha = a;
      if (anti) {
        g.strokeStyle = antiColors[col];
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, r - 1, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.fillStyle = colors[col];
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    function gluon(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, a: number, amp = 3.2) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 6) return;
      const n = Math.max(8, Math.round(len / 3));
      const nx = -(y2 - y1) / len;
      const ny = (x2 - x1) / len;
      const waves = Math.max(2, Math.round(len / 13));
      g.save();
      g.strokeStyle = ctx.theme.fg;
      g.globalAlpha = a;
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const o = Math.sin(t * waves * Math.PI * 2) * amp * Math.sin(Math.PI * t);
        const px = x1 + (x2 - x1) * t + nx * o;
        const py = y1 + (y2 - y1) * t + ny * o;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
      g.restore();
    }
    function tube(g: CanvasRenderingContext2D, x1: number, x2: number, y: number, a: number) {
      if (a < 0.01 || x2 - x1 < 1) return;
      g.save();
      g.globalAlpha = a;
      g.strokeStyle = ctx.theme.accent;
      g.lineWidth = 7; // constant thickness: tension does not depend on r
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x1, y);
      g.lineTo(x2, y);
      g.stroke();
      g.restore();
    }

    function draw(g: CanvasRenderingContext2D, W: number, H: number) {
      const S = (1 - scene3) * Math.min(W / 5.2, H / 3.6) + scene3 * Math.min(W / 7, H / 5.6);
      DR = Math.max(5, S * 0.055);
      const cx = W * 0.5 + S * 0.1;
      const cy = H * 0.46;
      const X = (fm: number) => cx + fm * S;
      const Y = (fm: number) => cy + fm * S;
      const hadA = 1 - scene3;
      // ---- hadron-level picture (string / stretch / break)
      if (hadA > 0.01) {
        g.save();
        g.globalAlpha = hadA;
        const dqx = 0.15;
        const r = 0.45 + pull * (R_BREAK - 0.45);
        const q1x = dqx - r;
        const sm = smooth(0.4, 1, snap);
        const mid = (q1x + dqx) / 2;
        const gap = 0.1 * smooth(0.1, 1, snap);
        const shift = 0.45 * sm;
        const xL = q1x - shift; // left quark
        const xAnti = mid - gap - shift; // new antiquark (on the meson)
        const xNew = mid + gap + shift; // new quark (on the baryon)
        const xD = dqx + shift; // diquark centre
        const bag = (1 - smooth(0, 0.45, pull)) * (1 - snap);
        // bag
        if (bag > 0.01) {
          g.save();
          g.globalAlpha = bag * 0.9 * hadA;
          const gr = g.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), 0.84 * S);
          gr.addColorStop(0, 'rgba(255,181,71,0.0)');
          gr.addColorStop(1, 'rgba(255,181,71,0.16)');
          g.fillStyle = gr;
          g.beginPath();
          g.arc(X(0), Y(0), 0.84 * S, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = ctx.theme.accent;
          g.globalAlpha = bag * 0.55 * hadA;
          g.lineWidth = 1;
          g.beginPath();
          g.arc(X(0), Y(0), 0.84 * S, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        }
        // gluon field lines between quarks (proton)
        const q = [
          { x: -0.3, y: 0 },
          { x: 0.15, y: -0.28 },
          { x: 0.15, y: 0.28 },
        ];
        if (bag > 0.01) {
          gluon(g, X(q[0].x), Y(q[0].y), X(q[1].x), Y(q[1].y), 0.5 * bag);
          gluon(g, X(q[0].x), Y(q[0].y), X(q[2].x), Y(q[2].y), 0.5 * bag);
          gluon(g, X(q[1].x), Y(q[1].y), X(q[2].x), Y(q[2].y), 0.5 * bag);
        } else {
          // diquark partners stay linked
          gluon(g, X(xD), Y(-0.28), X(xD), Y(0.28), 0.5 * (1 - bag));
        }
        // flux tube(s)
        const tubeA = smooth(0.02, 0.2, pull);
        tube(g, X(xL), X(xAnti), Y(0), tubeA);
        tube(g, X(xNew), X(xD), Y(0), tubeA);
        // diquark-to-tube junction
        // hadron outlines after break
        if (sm > 0.05) {
          g.save();
          g.setLineDash([3, 4]);
          g.strokeStyle = ctx.theme.fg;
          g.lineWidth = 1;
          g.globalAlpha = 0.35 * sm * hadA;
          g.beginPath();
          g.arc(X((xL + xAnti) / 2), Y(0), 0.42 * S, 0, Math.PI * 2);
          g.stroke();
          g.beginPath();
          g.arc(X((xNew + xD) / 2 + 0.05), Y(0), 0.62 * S, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        }
        // quarks
        const x1 = bag > 0.3 ? q[0].x : xL;
        const mix = clamp(bag * 1.0);
        const qx0 = -0.3 * mix + xL * (1 - mix);
        void x1;
        dotAt(g, X(qx0), Y(0), 0, false);
        const dxq = 0.15 * mix + xD * (1 - mix);
        dotAt(g, X(dxq), Y(-0.28), 1, false);
        dotAt(g, X(dxq), Y(0.28), 2, false);
        // new pair
        const pairA = smooth(0, 0.2, snap);
        if (pairA > 0.01) {
          dotAt(g, X(xAnti), Y(0), 0, true, DR * pairA + 1, pairA); // anti-red completes the red quark's meson
          dotAt(g, X(xNew), Y(0), 0, false, DR * pairA + 1, pairA); // red quark completes the baryon
        }
        // labels
        if (idx === 0 || bag > 0.3) {
          txt(g, L('proton'), X(0), Y(0.84) + 18, { align: 'center', a: 0.8 * bag });
          txt(g, L('gluons'), X(0.15), Y(-0.28) - 14, { align: 'center', a: 0.6 * bag, mono: false });
        }
        if (pull > 0.15 && snap < 0.1) {
          txt(g, L('tube'), X((xL + xD) / 2), Y(0) - 0.55 * S, { align: 'center', a: 0.85 * smooth(0.15, 0.5, pull) * (1 - snap * 8) });
        }
        if (snap > 0.25) {
          const a = smooth(0.25, 0.6, snap);
          g.save();
          g.strokeStyle = ctx.theme.fg;
          g.globalAlpha = 0.45 * a;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(X(mid), Y(0) - 14);
          g.lineTo(X(mid), Y(0) - 46);
          g.stroke();
          g.restore();
          txt(g, L('pair'), X(mid), Y(0) - 56, { align: 'center', a: 0.9 * a });
          txt(g, L('meson'), X((xL + xAnti) / 2), Y(0) + 0.62 * S + 14, { align: 'center', a: 0.85 * sm });
          txt(g, L('baryon'), X((xNew + xD) / 2 + 0.05), Y(0) + 0.82 * S + 14, { align: 'center', a: 0.85 * sm });
        }
        // energy bar
        const barA = smooth(0.02, 0.25, pull);
        if (barA > 0.01) {
          const E = KAPPA * r * (1 - smooth(0, 0.3, snap));
          const bx = W * 0.1;
          const bw = Math.min(W * 0.3, 260);
          const by = H * 0.86;
          const full = 1.2; // GeV axis max
          g.save();
          g.globalAlpha = barA * hadA;
          g.fillStyle = ctx.theme.fg;
          g.globalAlpha = 0.14 * barA * hadA;
          g.fillRect(bx, by, bw, 8);
          g.globalAlpha = 0.9 * barA * hadA;
          g.fillStyle = ctx.theme.accent;
          g.fillRect(bx, by, (bw * E) / full, 8);
          g.restore();
          txt(g, L('energy'), bx, by - 14, { a: 0.85 * barA });
          txt(g, `r = ${num(r)} fm`, bx, by + 22, { mono: true, a: 0.8 * barA });
          txt(g, `E ≈ κ r = ${num(E)} GeV`, bx + bw, by + 22, { mono: true, a: 0.8 * barA, align: 'right' });
        }
        g.restore();
      }
      // ---- plasma picture
      if (scene3 > 0.01) {
        const a = scene3;
        g.save();
        g.globalAlpha = a;
        // hadron outlines (dissolving)
        const oa = (1 - dec) * 0.4;
        if (oa > 0.01) {
          g.save();
          g.setLineDash([3, 4]);
          g.strokeStyle = ctx.theme.fg;
          g.lineWidth = 1;
          g.globalAlpha = oa * a;
          for (const hd of hadrons) {
            g.beginPath();
            g.arc(X(hd.x), Y(hd.y), 0.62 * S, 0, Math.PI * 2);
            g.stroke();
          }
          g.restore();
        }
        // gluon lines among nearby dots
        for (let i = 0; i < dots.length; i++) {
          for (let j = i + 1; j < dots.length; j++) {
            const d = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
            if (d < 0.5 && d > 0.05) gluon(g, X(dots[i].x), Y(dots[i].y), X(dots[j].x), Y(dots[j].y), 0.4 * (1 - d / 0.5) * a, 2);
          }
        }
        for (const d of dots) dotAt(g, X(d.x), Y(d.y), d.col, d.anti, DR * 0.85, a);
        // boundary
        g.save();
        g.setLineDash([5, 5]);
        g.strokeStyle = ctx.theme.accent;
        g.globalAlpha = 0.6 * dec * a;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(X(0), Y(0), R_PLASMA * S, 0, Math.PI * 2);
        g.stroke();
        g.restore();
        txt(g, L('qgp'), X(0), Y(-R_PLASMA) - 14, { align: 'center', a: 0.95 * dec * a });
        txt(g, L('overlap'), X(0), Y(R_PLASMA) + 18, { align: 'center', a: 0.8 * (1 - dec) * a });
        txt(g, L('plasmaNote'), X(0), Y(R_PLASMA) + 18, { align: 'center', a: 0.8 * dec * a });
        g.restore();
      }
      // ---- fixed furniture: scale bar, colour legend
      g.save();
      g.strokeStyle = ctx.theme.fg;
      g.globalAlpha = 0.6;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(W - 24 - S, H - 28);
      g.lineTo(W - 24, H - 28);
      g.moveTo(W - 24 - S, H - 32);
      g.lineTo(W - 24 - S, H - 24);
      g.moveTo(W - 24, H - 32);
      g.lineTo(W - 24, H - 24);
      g.stroke();
      g.restore();
      txt(g, `1 fm`, W - 24 - S / 2, H - 42, { align: 'center', mono: true, a: 0.7 });
      // legend
      const lx = 20;
      let ly = 24;
      for (let i = 0; i < 3; i++) dotAt(g, lx + 6 + i * 16, ly, i, false, 5);
      txt(g, L('legendQuark'), lx + 58, ly, { a: 0.7 });
      ly += 20;
      dotAt(g, lx + 6, ly, 0, true, 5);
      dotAt(g, lx + 22, ly, 1, true, 5);
      dotAt(g, lx + 38, ly, 2, true, 5);
      txt(g, L('legendAnti'), lx + 58, ly, { a: 0.7 });
    }

    const apply = (i: number, p: number, imm: boolean) => {
      idx = i;
      tt = p;
      auto = false;
      if (imm || ctx.reducedMotion) {
        const pullT = i === 0 ? 0 : i === 1 ? p : 1;
        pull = pullT;
        snap = i < 2 ? 0 : i === 2 ? p : 1;
        scene3 = i === 3 ? 1 : 0;
        dec = i === 3 ? smooth(0.25, 1, p) : 0;
        if (i === 3) for (let k = 0; k < 90; k++) sim(0.04, dec);
      }
      c.animate = true;
      c.invalidate();
    };
    return {
      setState(state: string, opts: SetStateOptions) {
        const i = Math.max(0, STATES.indexOf(state as (typeof STATES)[number]));
        if (opts.immediate || ctx.reducedMotion) {
          apply(i, 1, true);
          return;
        }
        // animate in the scroll direction: forward plays the motion, backward shows the finished state
        apply(i, opts.direction > 0 ? 0 : 1, false);
        auto = opts.direction > 0;
      },
      setProgress(p) {
        tt = clamp(p);
        auto = false;
        c.animate = true;
        c.invalidate();
      },
      resize: c.resize,
      setActive: c.setActive,
      dispose: c.dispose,
    };
  },
};
export default mod;
