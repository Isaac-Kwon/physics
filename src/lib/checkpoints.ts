/**
 * Scroll checkpoints = the step text boxes of the topic page (`[data-step] .step__card`), in document order.
 *
 *  - Auto-snap (after wheel/touch scrolling only): when scrolling stops, settle on the nearest stop if that stop is a
 *    step box within 40 % of the viewport height — headings and prose nearer to the reader always win.
 *  - Keys: ↑/↓ move stop by stop in reading order (not in form fields or the Depth Gauge).
 *  - Navigation: prev()/next() walk through EVERY block of the page in reading order — layer headings, prose
 *    paragraphs, figures, widgets, asides and step boxes — so nothing is skipped (step boxes are centred,
 *    other blocks are placed just below the header). Used by the ▲▼ step arrows; gauge ticks use go(i) on boxes.
 *  - Positions are read live with getBoundingClientRect at the moment of use, so late layout changes (figures
 *    mounting, fonts, KaTeX, opened <details>) can never leave a stale snap point.
 *  - Emits `checkpoint:change` on document with { index } whenever the nearest box changes.
 *
 * Module singleton: the Depth Gauge script and the scroll engine import the same instance.
 */
type LenisLike = { scrollTo(target: number, opts?: Record<string, unknown>): void };

const SELECTOR = '[data-step] .step__card';
const SNAP_RANGE = 0.4; // fraction of viewport height
const IDLE_MS = 400;

let cards: HTMLElement[] = [];
let busy = false;
let busyTimer = 0;
let idleTimer = 0;
let current = -1;
let autoSnap = false;

const lenis = (): LenisLike | undefined => (window as unknown as { __lenis?: LenisLike }).__lenis;
const headerH = () => document.querySelector('header')?.getBoundingClientRect().height ?? 56;
/** Signed distance (px) from the box centre to the centre of the visible area below the sticky header. */
const delta = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  const h = headerH();
  return r.top + r.height / 2 - (h + (innerHeight - h) / 2);
};

export function list(): HTMLElement[] {
  if (!cards.length) cards = [...document.querySelectorAll<HTMLElement>(SELECTOR)];
  return cards;
}

function nearest(): { index: number; d: number } {
  let index = -1;
  let d = Infinity;
  list().forEach((el, i) => {
    const di = delta(el);
    if (Math.abs(di) < Math.abs(d)) {
      d = di;
      index = i;
    }
  });
  return { index, d };
}

function updateCurrent() {
  const { index, d } = nearest();
  const i = Math.abs(d) < innerHeight * 0.5 ? index : -1;
  if (i !== current) {
    current = i;
    document.dispatchEvent(new CustomEvent('checkpoint:change', { detail: { index: i } }));
  }
}

export function go(i: number) {
  const el = list()[i];
  if (!el) return;
  const target = Math.max(0, scrollY + delta(el));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  busy = true;
  clearTimeout(busyTimer);
  const done = () => {
    busy = false;
    updateCurrent();
  };
  const l = lenis();
  if (l && !reduced) {
    l.scrollTo(target, { duration: 0.7, onComplete: done });
    busyTimer = window.setTimeout(done, 1200); // safety net
  } else {
    scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    busyTimer = window.setTimeout(done, reduced ? 50 : 800);
  }
}

// ---- reading-order navigation (arrows) ----------------------------------------------------------------
type Stop = { el: HTMLElement; kind: 'step' | 'block' };
let stops: Stop[] = [];

/** Every stop on the page: layer heading, then each body block; blocks that contain step boxes contribute their boxes. */
function navList(): Stop[] {
  if (stops.length) return stops;
  const out: Stop[] = [];
  const visible = (el: HTMLElement) => el.offsetHeight > 4 && getComputedStyle(el).display !== 'none';
  const isAside = (el: HTMLElement) => el.matches('.aside, .bridge-wrap, .primer--missing');
  // Asides (Deeper/Primer links, inline Bridge notes) are not stops of their own: the first aside before a block
  // becomes that block's anchor, so the link is shown just above the block within the same stop.
  let pending: HTMLElement | null = null;
  const push = (el: HTMLElement, kind: Stop['kind']) => {
    out.push({ el: kind === 'block' && pending ? pending : el, kind });
    pending = null;
  };
  for (const layer of document.querySelectorAll<HTMLElement>('section[data-layer]')) {
    const head = layer.querySelector<HTMLElement>('.layer__head');
    const h2 = head?.querySelector('h2');
    if (head && h2 && !h2.classList.contains('visually-hidden') && visible(head)) push(head, 'block');
    const body = layer.querySelector<HTMLElement>('.layer__body');
    if (!body) continue;
    for (const child of Array.from(body.children) as HTMLElement[]) {
      if (!visible(child) || child.matches('script, style, hr')) continue;
      if (isAside(child)) {
        // floating margin notes never need a stop; inline asides anchor the next block
        if (getComputedStyle(child).float === 'none') pending ??= child;
        continue;
      }
      const boxes = child.matches(SELECTOR) ? [child] : Array.from(child.querySelectorAll<HTMLElement>(SELECTOR));
      if (boxes.length) {
        const wh = child.querySelector<HTMLElement>('.walkthrough__head');
        if (wh && visible(wh)) push(wh, 'block');
        else if (pending) push(pending, 'block');
        boxes.forEach((el) => out.push({ el, kind: 'step' }));
      } else push(child, 'block');
    }
  }
  const after = document.querySelector<HTMLElement>('.topic__after');
  if (after) for (const c of Array.from(after.children) as HTMLElement[]) if (visible(c)) push(c, 'block');
  if (pending) push(pending, 'block');
  stops = out;
  return out;
}
/** Distance from where the stop should sit: step boxes centred, other blocks just below the header. */
const stopDelta = (s: Stop) => (s.kind === 'step' ? delta(s.el) : s.el.getBoundingClientRect().top - (headerH() + 24));

function goStop(s: Stop) {
  const target = Math.max(0, scrollY + stopDelta(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  busy = true;
  clearTimeout(busyTimer);
  const done = () => {
    busy = false;
    updateCurrent();
  };
  const l = lenis();
  if (l && !reduced) {
    l.scrollTo(target, { duration: 0.6, onComplete: done });
    busyTimer = window.setTimeout(done, 1100);
  } else {
    scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    busyTimer = window.setTimeout(done, reduced ? 50 : 800);
  }
}

/** Next stop in reading order. */
export function next() {
  const all = navList();
  // If the block we are reading is taller than the screen and continues below it, move within it first.
  const cur = [...all].reverse().find((x) => stopDelta(x) <= 8);
  if (cur && cur.kind === 'block') {
    const below = cur.el.getBoundingClientRect().bottom - innerHeight;
    if (below > 24) return scrollByPx(Math.min(below + 24, innerHeight * 0.8));
  }
  const s = all.find((x) => stopDelta(x) > 8);
  if (s) goStop(s);
}

function scrollByPx(dy: number) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const l = lenis();
  if (l && !reduced) l.scrollTo(scrollY + dy, { duration: 0.5 });
  else scrollTo({ top: scrollY + dy, behavior: reduced ? 'auto' : 'smooth' });
}
/** Previous stop in reading order. */
export function prev() {
  const all = navList();
  for (let i = all.length - 1; i >= 0; i--) if (stopDelta(all[i]) < -8) return goStop(all[i]);
}
export const hasNext = () => navList().some((x) => stopDelta(x) > 8) || innerHeight + scrollY < document.documentElement.scrollHeight - 24;
export const hasPrev = () => navList().some((x) => stopDelta(x) < -8);

let lastInput: 'wheel' | 'key' | 'other' = 'other';

function onScroll() {
  updateCurrent();
  if (!autoSnap || busy || lastInput !== 'wheel') return;
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (busy) return;
    // don't fight the reader while they interact with a widget or select text
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA')) return;
    if (String(getSelection() ?? '').length > 0) return;
    // Snap only if the nearest stop of ANY kind is a step box: a heading or paragraph closer to the reading
    // position wins, so the reader is never pulled past it.
    let best: Stop | null = null;
    let bd = Infinity;
    for (const st of navList()) {
      const d = Math.abs(stopDelta(st));
      if (d < bd) {
        bd = d;
        best = st;
      }
    }
    if (best && best.kind === 'step' && bd > 2 && bd < innerHeight * SNAP_RANGE) goStop(best);
  }, IDLE_MS);
}

/** ↑/↓ keys move stop by stop (reading order), except in form fields and the Depth Gauge. */
function onKey(e: KeyboardEvent) {
  lastInput = 'key';
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const t = e.target as HTMLElement | null;
  if (t && (t.closest('input, select, textarea, [contenteditable], [data-gauge], [role="slider"]') || t.isContentEditable)) return;
  e.preventDefault();
  if (e.key === 'ArrowDown') next();
  else prev();
}

let started = false;
/** Start tracking (always) and auto-snapping (unless reduced motion: CSS scroll-snap handles that case). */
export function initCheckpoints({ snap }: { snap: boolean }) {
  autoSnap = snap;
  if (started) return;
  started = true;
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('wheel', () => (lastInput = 'wheel'), { passive: true });
  addEventListener('touchmove', () => (lastInput = 'wheel'), { passive: true });
  addEventListener('pointerdown', () => (lastInput = 'other'), { passive: true });
  addEventListener('keydown', onKey);
  addEventListener('resize', () => ((cards = []), (stops = [])), { passive: true });
  document.addEventListener('toggle', () => (stops = []), true); // opened/closed <details> change block heights
  updateCurrent();
}

export const currentIndex = () => current;
