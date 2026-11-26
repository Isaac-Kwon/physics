/**
 * Client scroll engine (PLAN §3.4, §3.6, §4.3). Imported once per topic/lab page by TopicLayout.
 * Everything is progressive enhancement: the HTML is readable without any of this.
 *
 *  - Lenis smooth scroll (off under prefers-reduced-motion) wired into GSAP's ticker
 *  - Steps (P2): entering a [data-step] calls controller.setState(state, { direction, immediate })
 *  - Scrub (P1): the stage is pinned with CSS sticky; scroll progress through a step calls setProgress(0..1)
 *  - Portal (P3), Big Number (P4), Gallery (P6), Widgets (P5)
 *  - reduced motion: no smoothing, no scrub/pin/zoom; scenes get immediate state changes as steps enter.
 */
import { prefersReducedMotion } from './device';
import { formatSci } from './format';
import type { Lang } from '../i18n';
import { useT } from '../i18n';

const widgetLoaders = import.meta.glob('../components/widgets/*.svelte');

function initWidgets() {
  const els = document.querySelectorAll<HTMLElement>('[data-widget]:not([data-missing])');
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const el = e.target as HTMLElement;
        const name = el.dataset.widget!;
        const lang = (el.dataset.lang ?? 'en') as Lang;
        const key = Object.keys(widgetLoaders).find((p) => p.endsWith(`/${name}.svelte`));
        if (!key) continue;
        void Promise.all([import('svelte'), widgetLoaders[key]()])
          .then(([{ mount }, mod]) => {
            el.replaceChildren();
            mount((mod as { default: never }).default, { target: el, props: { lang, ...JSON.parse(el.dataset.props || '{}') } });
          })
          .catch((err) => {
            console.warn(`[widget ${name}]`, err);
            const s = el.querySelector('.widget__status');
            if (s) s.textContent = useT(lang)('scrolly.widget.error');
          });
      }
    },
    { rootMargin: '300px 0px' },
  );
  els.forEach((el) => io.observe(el));
}

export async function initScrolly(): Promise<void> {
  const reduced = prefersReducedMotion();
  const root = document.documentElement;
  root.classList.add('scrolly-on');
  initWidgets();

  const { initScenes, getController } = await import('../scenes/shared/runtime');
  initScenes();

  const hasTriggers = document.querySelector('[data-step], [data-bignumber], [data-gallery], [data-mode="portal"]');
  if (!hasTriggers) return;
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
  gsap.registerPlugin(ScrollTrigger);

  if (!reduced) {
    const { default: Lenis } = await import('lenis');
    const lenis = new Lenis({ autoRaf: false, anchors: { offset: -48 } });
    (window as unknown as { __lenis?: unknown }).__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const header = () => document.querySelector('header')?.getBoundingClientRect().height ?? 56;

  // ---- Scenes: steps / scrub / portal ----
  document.querySelectorAll<HTMLElement>('[data-scene-root]:not([data-missing])').forEach((rootEl) => {
    const ctrl = getController(rootEl);
    if (!ctrl) return;
    const mode = rootEl.dataset.mode;
    if (mode === 'portal') {
      const zoom = rootEl.querySelector<HTMLElement>('.scene__zoom');
      if (reduced) {
        rootEl.classList.add('is-static');
        return;
      }
      ScrollTrigger.create({
        trigger: rootEl,
        start: () => `top top+=${header()}`,
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          if (zoom) {
            zoom.style.transform = `scale(${1 + p ** 3 * 9})`;
            zoom.style.opacity = String(1 - Math.max(0, p - 0.8) * 5);
          }
          ctrl.setProgress(p);
        },
      });
      return;
    }
    const steps = [...rootEl.querySelectorAll<HTMLElement>('[data-step]')];
    if (!steps.length) return;
    let current = -1;
    const activate = (i: number, direction: 1 | -1) => {
      if (i === current) return;
      current = i;
      steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
      const state = steps[i].dataset.state;
      if (state) ctrl.setState(state, { direction, immediate: reduced });
      if (mode === 'scrub' && !reduced) ctrl.setProgress(direction === 1 ? 0 : 1);
    };
    steps.forEach((step, i) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 55%',
        end: 'bottom 55%',
        onEnter: () => activate(i, 1),
        onEnterBack: () => activate(i, -1),
        onUpdate: mode === 'scrub' && !reduced ? (self) => current === i && ctrl.setProgress(self.progress) : undefined,
      });
    });
  });

  // ---- P4 Big Number ----
  document.querySelectorAll<HTMLElement>('[data-bignumber]').forEach((el) => {
    if (reduced) return;
    const textEl = el.querySelector<HTMLElement>('[data-bignumber-text]');
    if (!textEl) return;
    const value = Number(el.dataset.value);
    const lang = (el.dataset.lang ?? 'en') as Lang;
    const final = textEl.textContent ?? '';
    const big = value >= 1e5;
    const state = { p: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 70%',
      once: true,
      onEnter: () =>
        gsap.to(state, {
          p: 1,
          duration: 1.8,
          ease: 'power2.out',
          onUpdate: () => {
            const v = big ? value ** state.p : value * state.p;
            textEl.textContent = formatSci(lang, v);
          },
          onComplete: () => {
            textEl.textContent = final;
          },
        }),
    });
  });

  // ---- P6 Gallery (desktop: vertical scroll drives horizontal movement) ----
  const mq = matchMedia('(min-width: 900px)');
  if (!reduced && mq.matches) {
    document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((g) => {
      const pin = g.querySelector<HTMLElement>('[data-gallery-pin]')!;
      const track = g.querySelector<HTMLElement>('[data-gallery-track]')!;
      g.classList.add('is-pinned');
      const distance = () => Math.max(0, track.scrollWidth - pin.clientWidth);
      const setHeight = () => (g.style.height = `${distance() + pin.clientHeight}px`);
      setHeight();
      new ResizeObserver(() => {
        setHeight();
        ScrollTrigger.refresh();
      }).observe(pin);
      ScrollTrigger.create({
        trigger: g,
        start: () => `top top+=${header()}`,
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => (track.style.transform = `translate3d(${-self.progress * distance()}px,0,0)`),
      });
    });
  }

  // Images/fonts/sticky layout may shift positions after load.
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}
