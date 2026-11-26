/**
 * demo.decay — Canvas2D. 400 unstable nuclei, each with a random exponential decay time (seeded, so identical every visit).
 * States are moments in units of the half-life; progress scrubs between this state's time and the next one.
 * The left grid shows which nuclei have decayed; the right plot shows N(t)/N0 = 2^(-t/T½) with a marker.
 */
import type { SceneInstance, SceneModule, SetStateOptions } from '../shared/types';
import { dprCap } from '../../lib/device';

const STATES = ['start', 'one', 'two', 'three'] as const;
const TIMES: Record<string, number> = { start: 0, one: 1, two: 2, three: 3 };
const N = 400;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx): SceneInstance {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    ctx.container.appendChild(canvas);
    const g = canvas.getContext('2d')!;
    const rnd = mulberry32(42);
    // decay time in half-lives: t = -log2(U)
    const tDecay = Array.from({ length: N }, () => -Math.log2(1 - rnd()));
    let w = 1;
    let h = 1;
    let time = 0;
    let target = 0;
    let raf = 0;
    let active = true;
    let stateIdx = 0;

    const fmt = (n: number) => ctx.formatNumber(n, { maximumFractionDigits: 1 });

    function draw() {
      const dpr = dprCap();
      const cw = Math.round(w * dpr);
      const ch = Math.round(h * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const wide = w > h * 1.15;
      const gridW = wide ? w * 0.52 : w;
      const gridH = wide ? h : h * 0.55;
      const cols = 20;
      const cell = Math.max(2, Math.min((gridW - 24) / cols, (gridH - 40) / (N / cols)));
      const ox = 12;
      const oy = 16;
      let alive = 0;
      for (let i = 0; i < N; i++) {
        const x = ox + (i % cols) * cell + cell / 2;
        const y = oy + Math.floor(i / cols) * cell + cell / 2;
        const dead = tDecay[i] <= time;
        if (!dead) alive++;
        g.beginPath();
        g.arc(x, y, cell * (dead ? 0.18 : 0.34), 0, Math.PI * 2);
        g.fillStyle = dead ? ctx.theme.grid : ctx.theme.accent;
        g.fill();
      }
      // plot of N/N0 vs t
      const px = wide ? gridW + 20 : 24;
      const py = wide ? 40 : gridH + 24;
      const pw = w - px - 24;
      const ph = h - py - 36;
      if (pw < 20 || ph < 20) return;
      g.strokeStyle = ctx.theme.fg;
      g.globalAlpha = 0.5;
      g.lineWidth = 1;
      g.strokeRect(px, py, pw, ph);
      g.globalAlpha = 1;
      g.strokeStyle = ctx.theme.accent;
      g.lineWidth = 2;
      g.beginPath();
      for (let s = 0; s <= 60; s++) {
        const tt = (s / 60) * 3;
        const X = px + (tt / 3) * pw;
        const Y = py + ph - 2 ** -tt * ph;
        if (s) g.lineTo(X, Y);
        else g.moveTo(X, Y);
      }
      g.stroke();
      const mx = px + (Math.min(time, 3) / 3) * pw;
      const my = py + ph - 2 ** -Math.min(time, 3) * ph;
      g.fillStyle = ctx.theme.accent2;
      g.beginPath();
      g.arc(mx, my, 5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = ctx.theme.fg;
      g.font = '12px monospace';
      g.fillText(`t = ${fmt(time)} T½`, px, py - 12);
      g.fillText(`N/N₀ = ${fmt((alive / N) * 100)} %`, px, py + ph + 22);
    }

    function tick() {
      raf = 0;
      const d = target - time;
      if (Math.abs(d) < 0.002) time = target;
      else {
        time += d * 0.12;
        raf = requestAnimationFrame(tick);
      }
      draw();
    }
    const schedule = () => {
      if (!raf && active) raf = requestAnimationFrame(tick);
    };

    return {
      setState(state: string, opts: SetStateOptions) {
        stateIdx = Math.max(0, STATES.indexOf(state as (typeof STATES)[number]));
        target = TIMES[state] ?? 0;
        if (opts.immediate || ctx.reducedMotion) {
          time = target;
          draw();
        } else schedule();
      },
      setProgress(p) {
        // Scrub between this state's time and the next state's time.
        const a = TIMES[STATES[stateIdx]];
        const b = TIMES[STATES[Math.min(stateIdx + 1, STATES.length - 1)]];
        time = target = a + (b - a) * p;
        draw();
      },
      resize(width, height) {
        w = Math.max(1, width);
        h = Math.max(1, height);
        draw();
      },
      setActive(a) {
        active = a;
        if (a) schedule();
        else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      dispose() {
        cancelAnimationFrame(raf);
        canvas.remove();
      },
    };
  },
};
export default mod;
