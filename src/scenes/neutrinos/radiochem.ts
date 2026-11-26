/**
 * nu.radiochem — P9 walkthrough of the Homestake radiochemical experiment: nu_e + 37Cl -> 37Ar + e-.
 *   tank     : rock overburden (1.5 km, NU.HOMESTAKE_DEPTH_KM) above a 600 t tank (NU.HOMESTAKE_MASS_T).
 *   capture  : one chlorine atom becomes argon (chlorine grid is a schematic subsample).
 *   extract  : helium bubbles carry the argon atoms out to a trap (N counts up).
 *   count    : the trapped atoms decay with t_1/2 = 35 d (NU.AR37_HALF_LIFE_D): remaining N(t) = N0 2^(-t/35); every click
 *              is one decay time drawn from that exponential (seeded), so the clicks and the curve agree.
 *   rate     : measured about a third of the prediction (qualitative bar).
 *   needle   : 30 argon among 1e30 chlorine. Grey dots are a subsample (1 dot = 1e27 atoms), argon drawn enlarged.
 */
import type { SceneModule } from '../shared/types';
import { mulberry32, clamp, smooth } from '../shared/canvas2d';
import { plot } from '../shared/plot';
import { NU } from '../../data/neutrinos';
import { createStage, arrow, dim, dot, line, ring, txt } from './_n2-common';

const STATES = ['tank', 'capture', 'extract', 'count', 'rate', 'needle'] as const;
const NAR = 30; // atoms collected in one extraction run ("a few tens", NU.HOMESTAKE_AR_PER_EXTRACTION)
const T12 = NU.AR37_HALF_LIFE_D.value as number;
const DAYS = 140;

type P = { tank: number; cap: number; ext: number; cnt: number; rate: number; need: number };
const one = (k: keyof P): P => ({ tank: 0, cap: 0, ext: 0, cnt: 0, rate: 0, need: 0, [k]: 1 });
const TARGETS: Record<string, P> = {
  tank: one('tank'),
  capture: one('cap'),
  extract: one('ext'),
  count: one('cnt'),
  rate: one('rate'),
  needle: one('need'),
};

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const th = ctx.theme;
    const L = (k: string) => ctx.label(k);
    const rnd = mulberry32(37);
    const f0 = (v: number) => ctx.formatNumber(v, { maximumFractionDigits: 0 });
    const decayDays = Array.from({ length: NAR }, () => (-T12 / Math.LN2) * Math.log(1 - rnd() * 0.999)).sort((a, b) => a - b);
    const jit = Array.from({ length: 400 }, () => [rnd() - 0.5, rnd() - 0.5] as const);
    const argonIdx = new Set<number>();
    while (argonIdx.size < NAR) argonIdx.add(Math.floor(rnd() * 1000));
    const tankAr = Array.from({ length: NAR }, () => [rnd(), rnd()] as const);
    const tankCl = Array.from({ length: 90 }, () => [rnd(), rnd()] as const);
    const trapPos = Array.from({ length: NAR }, () => [rnd(), rnd()] as const);

    const stage = createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      anim: { capture: 4, extract: 12, count: 9, rate: 2, needle: 3 },
      draw(g, s, lv, env) {
        const { w, h } = s;
        const A = { x: 16, y: 30, w: w - 32, h: h - 46 };
        const narrow = w < 520;

        // ------------------------------------------------ tank in the rock
        if (lv.tank > 0.01) {
          const a = lv.tank;
          const ys = A.y + 6;
          g.save();
          g.globalAlpha = 0.05 * a;
          g.fillStyle = th.fg;
          g.fillRect(A.x, ys, A.w, A.h - 6);
          g.restore();
          line(g, A.x, ys, A.x + A.w, ys, th.fg, 1, 0.55 * a);
          txt(g, L('surface'), A.x + 2, ys - 9, { color: th.fg, alpha: 0.8 * a });
          const tkW = A.w * 0.5;
          const tkH = A.h * 0.2;
          const tkX = A.x + A.w * 0.3;
          const tkY = A.y + A.h * 0.7;
          g.save();
          g.globalAlpha = 0.14 * a;
          g.fillStyle = th.accent2;
          g.fillRect(tkX, tkY, tkW, tkH);
          g.restore();
          line(g, tkX, tkY, tkX + tkW, tkY, th.accent2, 1.2, a);
          line(g, tkX, tkY + tkH, tkX + tkW, tkY + tkH, th.accent2, 1.2, a);
          line(g, tkX, tkY, tkX, tkY + tkH, th.accent2, 1.2, a);
          line(g, tkX + tkW, tkY, tkX + tkW, tkY + tkH, th.accent2, 1.2, a);
          txt(g, `${L('liquid')}, ${f0(NU.HOMESTAKE_MASS_T.value as number)} t`, tkX + tkW / 2, tkY + tkH + 16, { color: th.fg, align: 'center', alpha: 0.9 * a });
          g.save();
          g.globalAlpha = a;
          dim(g, tkX - 26, ys, tkX - 26, tkY, `${ctx.formatNumber(NU.HOMESTAKE_DEPTH_KM.value as number, { minimumFractionDigits: 1 })} km`, th.fg, 0.8 * a);
          g.restore();
          for (let i = 0; i < 6; i++) {
            const x0 = tkX + tkW * (0.12 + i * 0.15);
            line(g, x0 - 22, ys + 4, x0, tkY - 2, th.fg, 1, 0.5 * a, [5, 4]);
          }
          txt(g, L('solarNu'), tkX + tkW * 0.5, ys + (narrow ? 20 : 16), { color: th.fg, align: 'center', alpha: 0.85 * a });
          txt(g, L('mine'), A.x + 2, A.y + A.h - 4, { color: th.fg, alpha: 0.6 * a });
        }

        // ------------------------------------------------ capture: 37Cl -> 37Ar
        if (lv.cap > 0.01) {
          const a = lv.cap;
          const sp = clamp(Math.min(A.w / 11, (A.h * 0.5) / 6), 18, 36);
          const cols = Math.max(4, Math.floor((A.w - 16) / sp));
          const rows = Math.max(4, Math.floor((A.h * 0.5) / sp));
          const gx = A.x + (A.w - (cols - 1) * sp) / 2;
          const gy = A.y + 56;
          const tc = Math.floor(cols / 2);
          const tr = Math.floor(rows / 2);
          const T_ARR = 1.3;
          const t = env.ts;
          const hit = t >= T_ARR;
          for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++) {
              const j = jit[(r * cols + c) % jit.length];
              const x = gx + c * sp + j[0] * 4;
              const y = gy + r * sp + j[1] * 4;
              if (r === tr && c === tc) {
                if (hit) {
                  dot(g, x, y, 6, th.accent, a);
                  ring(g, x, y, 10, th.accent, 1, 0.7 * a);
                } else dot(g, x, y, 4, th.fg, 0.5 * a);
              } else dot(g, x, y, 4, th.fg, 0.45 * a);
            }
          const tx = gx + tc * sp;
          const ty = gy + tr * sp;
          // the neutrino: a dashed line arriving from above; the electron leaves to the lower right
          const uN = hit ? 1 : Math.min(1, t / T_ARR);
          line(g, tx - 14, gy - 26, tx - 14 + 14 * uN, gy - 26 + (ty - gy + 26) * uN, th.fg, 1, 0.75 * a, [5, 4]);
          txt(g, 'νₑ', tx - 24, gy - 28, { color: th.fg, align: 'right', alpha: 0.9 * a, base: 'middle' });
          if (hit) {
            const u = clamp((t - T_ARR) / 0.7);
            const ex = tx + 10 + 70 * u;
            const ey = ty + 6 + 36 * u;
            line(g, tx + 6, ty + 4, ex, ey, th.accent, 1, 0.7 * a);
            dot(g, ex, ey, 2.2, th.fg, a);
            txt(g, 'e⁻', ex + 8, ey + 4, { mono: true, color: th.fg, alpha: 0.9 * a });
            txt(g, '³⁷Ar', tx - 14, ty - 16, { mono: true, color: th.accent, align: 'right', alpha: 0.95 * a });
          } else txt(g, '³⁷Cl', tx - 14, ty - 16, { mono: true, color: th.fg, align: 'right', alpha: 0.8 * a });
          dot(g, A.x + 6, A.y + 8, 4, th.fg, 0.45 * a);
          txt(g, L('chlorine'), A.x + 16, A.y + 8, { color: th.fg, alpha: 0.85 * a });
          dot(g, A.x + 6, A.y + 26, 5, th.accent, a);
          txt(g, L('argon'), A.x + 16, A.y + 26, { color: th.fg, alpha: 0.85 * a });
          txt(g, 'νₑ + ³⁷Cl → ³⁷Ar + e⁻', A.x + A.w / 2, gy + rows * sp + 20, { mono: true, color: th.fg, align: 'center', alpha: a });
          txt(g, L('rateNote'), A.x + A.w / 2, gy + rows * sp + 42, { color: th.fg, align: 'center', alpha: 0.85 * a });
        }

        // ------------------------------------------------ extract
        if (lv.ext > 0.01) {
          const a = lv.ext;
          const tkX = A.x;
          const tkW = A.w * 0.46;
          const tkY = A.y + A.h * 0.26;
          const tkH = A.h * 0.56;
          const pipeY = A.y + A.h * 0.1;
          const trX = A.x + A.w * 0.7;
          const trW = A.w * 0.3;
          const trY = A.y + A.h * 0.42;
          const trH = A.h * 0.3;
          g.save();
          g.globalAlpha = 0.1 * a;
          g.fillStyle = th.accent2;
          g.fillRect(tkX, tkY, tkW, tkH);
          g.restore();
          [[tkX, tkY, tkX + tkW, tkY], [tkX, tkY + tkH, tkX + tkW, tkY + tkH], [tkX, tkY, tkX, tkY + tkH], [tkX + tkW, tkY, tkX + tkW, tkY + tkH]].forEach(([x0, y0, x1, y1]) => line(g, x0, y0, x1, y1, th.accent2, 1.2, a));
          tankCl.forEach(([u, v]) => dot(g, tkX + 8 + u * (tkW - 16), tkY + 10 + v * (tkH - 20), 1.6, th.fg, 0.3 * a));
          // trap
          line(g, trX, trY, trX + trW, trY, th.fg, 1.2, 0.8 * a);
          line(g, trX, trY + trH, trX + trW, trY + trH, th.fg, 1.2, 0.8 * a);
          line(g, trX, trY, trX, trY + trH, th.fg, 1.2, 0.8 * a);
          line(g, trX + trW, trY, trX + trW, trY + trH, th.fg, 1.2, 0.8 * a);
          const pipeX = trX + trW / 2;
          line(g, tkX + tkW * 0.5, pipeY, pipeX, pipeY, th.fg, 1, 0.55 * a);
          line(g, pipeX, pipeY, pipeX, trY, th.fg, 1, 0.55 * a);
          line(g, tkX + tkW * 0.5, pipeY, tkX + tkW * 0.5, tkY, th.fg, 1, 0.35 * a, [3, 4]);
          txt(g, L('trap'), trX + trW / 2, trY + trH + 14, { color: th.fg, align: 'center', alpha: 0.85 * a });
          txt(g, L('tank'), tkX + tkW / 2, tkY + tkH + 14, { color: th.fg, align: 'center', alpha: 0.85 * a });
          // helium in (bubbles rise from the bottom)
          arrow(g, tkX + tkW * 0.8, tkY + tkH + 34, tkX + tkW * 0.8, tkY + tkH + 4, th.fg, 1, 0.8 * a, 6);
          txt(g, L('helium'), tkX + tkW * 0.8 + 10, tkY + tkH + 20, { color: th.fg, alpha: 0.85 * a });
          // atoms ride in bubbles: up to the manifold, along it, down into the trap
          const speed = 120 * Math.min(1.4, Math.max(0.7, w / 600));
          let arrived = 0;
          const tNow = env.ts >= 1e3 ? 1e3 : env.ts;
          tankAr.forEach(([u, v], i) => {
            const x0 = tkX + 14 + u * (tkW - 28);
            const y0 = tkY + 14 + v * (tkH - 28);
            const tx = pipeX + (trapPos[i][0] - 0.5) * (trW - 24);
            const ty = trY + 10 + trapPos[i][1] * (trH - 20);
            const d1 = y0 - pipeY;
            const d2 = Math.abs(tx - x0) + Math.abs(pipeX - x0) * 0; // path: up, across to x=tx, down
            const total = d1 + Math.abs(tx - x0) + (ty - pipeY);
            const dep = i * 0.14;
            const dist = env.ts >= 1e3 ? total : clamp((tNow - dep) * speed, 0, total);
            void d2;
            let x = x0;
            let y = y0;
            if (dist <= d1) y = y0 - dist;
            else if (dist <= d1 + Math.abs(tx - x0)) {
              y = pipeY;
              x = x0 + Math.sign(tx - x0) * (dist - d1);
            } else {
              x = tx;
              y = pipeY + (dist - d1 - Math.abs(tx - x0));
            }
            const done = dist >= total;
            if (done) arrived++;
            dot(g, x, y, done ? 2.8 : 3, th.accent, a);
            if (!done && dist > 0) ring(g, x, y, 6.5, th.fg, 1, 0.55 * a);
          });
          txt(g, `N = ${arrived}`, trX + trW, trY + trH + 30, { mono: true, color: th.accent, align: 'right', alpha: a });
          dot(g, trX, trY - 12, 3, th.accent, a);
          txt(g, L('arAtoms'), trX + 10, trY - 12, { color: th.fg, alpha: 0.85 * a });
        }

        // ------------------------------------------------ count: decays of the trapped argon-37
        if (lv.cnt > 0.01) {
          const a = lv.cnt;
          const R = { x: A.x + 46, y: A.y + 14, w: Math.max(80, A.w - 62), h: A.h * 0.5 };
          const p = plot(g, ctx, R, { min: 0, max: DAYS, label: L('days'), ticks: [0, 35, 70, 105, 140].map((v) => ({ v, label: String(v) })) }, { min: 0, max: NAR, label: L('left'), ticks: [0, NAR / 2, NAR].map((v) => ({ v, label: String(v) })) });
          g.save();
          g.globalAlpha = a;
          p.axes();
          p.curve((x) => NAR * Math.pow(2, -x / T12), { color: th.fg, alpha: 0.5, dash: [4, 4], width: 1 });
          p.vline(T12, { color: th.fg, dash: [2, 3], alpha: 0.4 });
          p.hline(NAR / 2, { color: th.fg, dash: [2, 3], alpha: 0.4 });
          p.text(T12 + 3, NAR * 0.62, `${T12} d  ${L('halfLife')}`, { align: 'left' });
          const clock = env.ts >= 1e3 ? DAYS : Math.min(DAYS, (env.ts / 6) * DAYS);
          // step curve of atoms remaining (one step per decay)
          let n = NAR;
          const pts: [number, number][] = [[0, NAR]];
          for (const d of decayDays) {
            if (d > clock) break;
            pts.push([d, n]);
            n--;
            pts.push([d, n]);
          }
          pts.push([clock, n]);
          p.path(pts, { color: th.accent, width: 1.5 });
          // clicks: one tick per decay
          const sy = R.y + R.h + (narrow ? 50 : 56);
          line(g, p.X(0), sy, p.X(DAYS), sy, th.fg, 1, 0.4);
          decayDays.forEach((d) => {
            if (d <= clock && d <= DAYS) line(g, p.X(d), sy - 9, p.X(d), sy + 9, th.accent, 1.2, 0.95);
          });
          txt(g, L('clicks'), R.x, sy + 24, { color: th.fg, alpha: 0.85 });
          txt(g, `t = ${f0(clock)} d`, R.x + R.w, sy + 24, { mono: true, color: th.fg, align: 'right', alpha: 0.9 });
          g.restore();
        }

        // ------------------------------------------------ rate: measured vs predicted
        if (lv.rate > 0.01) {
          const a = lv.rate;
          const grow = env.ts >= 1e3 ? 1 : smooth(0, 1.2, env.ts);
          const rw = Math.min(A.w - 60, 360);
          const R = { x: A.x + (A.w - rw) / 2, y: A.y + 18, w: rw, h: A.h * 0.7 };
          const p = plot(g, ctx, R, { min: 0, max: 2, ticks: [] }, { min: 0, max: 1.15, label: L('captures'), ticks: [0, 1].map((v) => ({ v, label: String(v) })) });
          g.save();
          g.globalAlpha = a;
          p.axes();
          const bw = R.w * 0.28;
          const bar = (cx: number, v: number, c: string, fillA: number, label: string, sub: string) => {
            const x0 = p.X(cx) - bw / 2;
            const top = p.Y(v * grow);
            g.save();
            g.globalAlpha = fillA * a;
            g.fillStyle = c;
            g.fillRect(x0, top, bw, p.Y(0) - top);
            g.restore();
            line(g, x0, top, x0 + bw, top, c, 1.5, a);
            line(g, x0, top, x0, p.Y(0), c, 1, 0.8 * a);
            line(g, x0 + bw, top, x0 + bw, p.Y(0), c, 1, 0.8 * a);
            txt(g, label, p.X(cx), p.Y(0) + 16, { color: th.fg, align: 'center', alpha: a });
            txt(g, sub, p.X(cx), p.Y(v) - 12, { color: th.fg, align: 'center', alpha: a * smooth(0.8, 1.2, env.ts >= 1e3 ? 9 : env.ts) });
          };
          bar(0.55, 1, th.accent2, 0.3, L('predicted'), L('standardModel'));
          bar(1.45, 0.33, th.accent, 0.55, L('measured'), L('aThird'));
          g.restore();
        }

        // ------------------------------------------------ needle: 30 among 1e30
        if (lv.need > 0.01) {
          const a = lv.need;
          const cols = 40;
          const rowsN = 25;
          const sp = Math.min((A.w - 16) / cols, (A.h * 0.62) / rowsN);
          const gx = A.x + (A.w - cols * sp) / 2 + sp / 2;
          const gy = A.y + 26;
          txt(g, L('needleTitle'), A.x, A.y + 4, { color: th.fg, alpha: 0.95 * a });
          const reveal = env.ts >= 1e3 ? 1 : smooth(0.4, 1.4, env.ts);
          for (let i = 0; i < cols * rowsN; i++) {
            const x = gx + (i % cols) * sp;
            const y = gy + Math.floor(i / cols) * sp;
            if (argonIdx.has(i)) {
              dot(g, x, y, Math.max(2.2, sp * 0.34), th.fg, 0.3 * a * (1 - reveal));
              dot(g, x, y, Math.max(2.4, sp * 0.4), th.accent, a * reveal);
            } else dot(g, x, y, Math.max(0.9, sp * 0.14), th.fg, 0.4 * a);
          }
          const ly = gy + rowsN * sp + 16;
          dot(g, A.x + 6, ly, 1.8, th.fg, 0.6 * a);
          txt(g, L('greyDot'), A.x + 16, ly, { color: th.fg, alpha: 0.85 * a });
          dot(g, A.x + 6, ly + 20, 3.6, th.accent, a);
          txt(g, L('argonDots'), A.x + 16, ly + 20, { color: th.fg, alpha: 0.85 * a });
        }
      },
    });
    return stage;
  },
};
export default mod;
