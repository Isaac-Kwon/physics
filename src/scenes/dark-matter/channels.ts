/**
 * dm.channels — one crossing-symmetric diagram, read three ways. Left legs are dark matter χ, right legs are Standard Model particles,
 * the blob in the middle is the unknown interaction. Only the direction of time (the compass at the top left) and the arrows on the legs change:
 *   direct    time ↓  χ + N → χ + N       (top legs in, bottom legs out; the nucleus recoils)
 *   indirect  time →  χ χ → SM SM         (left legs in; products γ, e⁺, p̄, ν leave)
 *   collider  time ←  SM SM → χ χ         (right legs in; χ legs are dashed: they leave the detector unseen, missing energy)
 * Marks: the arrowhead on each leg shows whether that particle is incoming or outgoing; its size follows the blend between readings.
 */
import type { SceneModule } from '../shared/types';
import { createStage, arrow, txt, type G } from './_dm1-common';

const STATES = ['direct', 'indirect', 'collider'] as const;
type P = { wd: number; wi: number; wc: number; ang: number; ul: number; ll: number; ur: number; lr: number };
const TARGETS: Record<string, P> = {
  direct: { wd: 1, wi: 0, wc: 0, ang: Math.PI / 2, ul: 1, ur: 1, ll: -1, lr: -1 },
  indirect: { wd: 0, wi: 1, wc: 0, ang: 0, ul: 1, ll: 1, ur: -1, lr: -1 },
  collider: { wd: 0, wi: 0, wc: 1, ang: Math.PI, ul: -1, ll: -1, ur: 1, lr: 1 },
};

function wavy(g: G, x0: number, y0: number, x1: number, y1: number, amp = 3.5, wl = 11) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  g.beginPath();
  for (let d = 0; d <= len; d += 1.5) {
    const o = amp * Math.sin((d / wl) * Math.PI * 2);
    const x = x0 + ux * d - uy * o;
    const y = y0 + uy * d + ux * o;
    d === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();
}

const mod: SceneModule = {
  states: STATES,
  mount(ctx) {
    const L = (k: string) => ctx.label(k);
    const { accent, accent2, fg } = ctx.theme;
    return createStage<P>(ctx, {
      states: STATES,
      targets: TARGETS,
      draw(g, s, p) {
        const { w: W, h: H } = s;
        const cx = W / 2;
        const cy = H * 0.54;
        const Lx = Math.min(W * 0.26, 260);
        const Ly = Math.min(H * 0.24, 150);
        const legs = [
          { id: 'ul', x: cx - Lx, y: cy - Ly, chi: true, k: p.ul },
          { id: 'll', x: cx - Lx, y: cy + Ly, chi: true, k: p.ll },
          { id: 'ur', x: cx + Lx, y: cy - Ly, chi: false, k: p.ur },
          { id: 'lr', x: cx + Lx, y: cy + Ly, chi: false, k: p.lr },
        ];
        // legs
        for (const l of legs) {
          g.save();
          g.strokeStyle = l.chi ? accent : fg;
          g.globalAlpha = l.chi ? 1 : 0.8;
          g.lineWidth = l.chi ? 2 : 1.5;
          g.setLineDash(l.chi && p.wc > 0.5 ? [7, 5] : []);
          g.beginPath();
          g.moveTo(l.x, l.y);
          g.lineTo(cx, cy);
          g.stroke();
          g.restore();
          // arrowhead at 55 % of the way: points toward the vertex for an incoming particle (k > 0)
          const mx = l.x + (cx - l.x) * 0.5;
          const my = l.y + (cy - l.y) * 0.5;
          const dx = (cx - l.x) / Math.hypot(cx - l.x, cy - l.y);
          const dy = (cy - l.y) / Math.hypot(cx - l.x, cy - l.y);
          const sz = 6 * Math.abs(l.k);
          if (sz > 0.5) {
            const sg = Math.sign(l.k);
            arrow(g, mx - dx * sg * 7, my - dy * sg * 7, mx + dx * sg * 7, my + dy * sg * 7, { color: l.chi ? accent : fg, head: sz + 3 * Math.abs(l.k), width: 0.1, alpha: l.chi ? 1 : 0.85 });
          }
        }
        // vertex
        g.fillStyle = accent2;
        g.globalAlpha = 0.95;
        g.beginPath();
        g.arc(cx, cy, 14, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = fg;
        g.globalAlpha = 0.6;
        g.lineWidth = 1;
        g.stroke();
        g.globalAlpha = 1;
        g.strokeStyle = fg;
        g.globalAlpha = 0.35;
        g.beginPath();
        g.moveTo(cx, cy + 16);
        g.lineTo(cx, cy + Ly + 10);
        g.stroke();
        g.globalAlpha = 1;
        txt(g, L('unknown'), cx, cy + Ly + 24, { align: 'center', alpha: 0.8 });

        // labels on the corners
        const lab = (k: string, x: number, y: number, align: CanvasTextAlign, a: number, color?: string) => {
          if (a > 0.01) txt(g, L(k), x, y, { align, alpha: a, color });
        };
        const lx = cx - Lx - 10;
        const rx = cx + Lx + 10;
        lab('chi', lx, cy - Ly, 'right', 0.95, accent);
        lab('chi', lx, cy + Ly, 'right', 0.95, accent);
        lab('nucleusIn', rx, cy - Ly, 'left', p.wd);
        lab('nucleusOut', rx, cy + Ly, 'left', p.wd);
        lab('sm', rx, cy - Ly, 'left', p.wc);
        lab('sm', rx, cy + Ly, 'left', p.wc);
        // direct: recoil track on the outgoing nucleus leg
        if (p.wd > 0.01) {
          g.save();
          g.globalAlpha = p.wd;
          g.strokeStyle = fg;
          g.lineWidth = 3.5;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(cx + Lx * 0.78, cy + Ly * 0.78);
          g.lineTo(cx + Lx, cy + Ly);
          g.stroke();
          g.restore();
          txt(g, L('recoil'), rx, cy + Ly + 18, { align: 'left', alpha: 0.9 * p.wd });
        }
        // indirect: products leave the outgoing legs
        if (p.wi > 0.01) {
          g.save();
          g.globalAlpha = p.wi;
          g.strokeStyle = fg;
          g.lineWidth = 1.25;
          wavy(g, cx + Lx, cy - Ly, cx + Lx + Math.min(70, W * 0.1), cy - Ly - 28);
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(cx + Lx, cy + Ly);
          g.lineTo(cx + Lx + Math.min(70, W * 0.1), cy + Ly + 28);
          g.stroke();
          g.restore();
          txt(g, L('gamma'), cx + Lx + Math.min(70, W * 0.1) + 6, cy - Ly - 28, { align: 'left', alpha: 0.9 * p.wi });
          txt(g, L('anti'), cx + Lx + Math.min(70, W * 0.1) + 6, cy + Ly + 28, { align: 'left', alpha: 0.9 * p.wi });
        }
        // collider: missing energy arrow
        if (p.wc > 0.01) {
          const ax1 = Math.max(12, lx - 70);
          arrow(g, lx - 30, cy, ax1, cy, { color: accent, width: 2, head: 8, alpha: p.wc });
          txt(g, L('missing'), (lx - 30 + ax1) / 2, cy - 14, { align: 'center', color: accent, alpha: p.wc });
        }

        // title line and time compass
        const tx = 44;
        const ty = 44;
        g.save();
        g.strokeStyle = fg;
        g.globalAlpha = 0.25;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(tx, ty, 22, 0, Math.PI * 2);
        g.stroke();
        g.restore();
        arrow(g, tx - Math.cos(p.ang) * 14, ty - Math.sin(p.ang) * 14, tx + Math.cos(p.ang) * 18, ty + Math.sin(p.ang) * 18, { color: fg, width: 1.5, head: 6, alpha: 0.9 });
        txt(g, L('time'), tx, ty + 36, { align: 'center', alpha: 0.8 });
        const tl = (k: string, a: number) => a > 0.01 && txt(g, L(k), tx + 38, ty, { alpha: a });
        tl('titleDirect', p.wd);
        tl('titleIndirect', p.wi);
        tl('titleCollider', p.wc);
      },
    });
  },
};
export default mod;
