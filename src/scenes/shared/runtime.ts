/**
 * Scene runtime (PLAN §4.2/§4.3): finds every [data-scene-root] on the page, lazily mounts the scene module when the
 * root is near the viewport, pauses it off-screen and forwards resize. scroll.ts drives it via getController().
 */
import type { SceneContext, SceneInstance, SceneModule, SetStateOptions } from './types';
import { getSharedRenderer } from './renderer';
import { prefersReducedMotion, qualityHint } from '../../lib/device';
import { useT } from '../../i18n';
import { NUMBER_LOCALE, type Lang } from '../../i18n';

export interface SceneController {
  id: string;
  root: HTMLElement;
  setState(state: string, opts: SetStateOptions): void;
  setProgress(p: number): void;
}

const controllers = new WeakMap<HTMLElement, SceneController>();
export const getController = (root: HTMLElement) => controllers.get(root);

function readTheme(): SceneContext['theme'] {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  return { accent: v('--accent', '#5fe1ff'), accent2: v('--accent-2', '#fff'), bg: v('--bg', '#05060a'), fg: v('--fg', '#e8e9ee'), grid: v('--grid', '#1a1e29') };
}

function createController(root: HTMLElement): SceneController {
  const id = root.dataset.sceneId ?? '';
  const lang = (root.dataset.lang ?? 'en') as Lang;
  const container = root.querySelector<HTMLElement>('[data-scene-canvas]')!;
  const t = useT(lang);
  let instance: SceneInstance | null = null;
  let pending: { state: string; opts: SetStateOptions } | null = root.dataset.initialState ? { state: root.dataset.initialState, opts: { direction: 1, immediate: true } } : null;
  let progress: number | null = null;
  let active = false;
  let started = false;

  const controller: SceneController = {
    id,
    root,
    setState(state, opts) {
      if (instance) instance.setState(state, opts);
      else pending = { state, opts: { ...opts, immediate: true } };
    },
    setProgress(p) {
      if (instance) instance.setProgress?.(p);
      else progress = p;
    },
  };
  controllers.set(root, controller);

  async function start() {
    if (started) return;
    started = true;
    try {
      const { scenes } = await import('../registry');
      const loader = scenes[id];
      if (!loader) return; // build-time placeholder already shown
      const mod: SceneModule = (await loader()).default;
      const ctx: SceneContext = {
        container,
        getRenderer: getSharedRenderer,
        theme: readTheme(),
        lang,
        label: (key) => t(`scene.${id}.${key}`) === `scene.${id}.${key}` ? key : t(`scene.${id}.${key}`),
        formatNumber: (n, o) => new Intl.NumberFormat(NUMBER_LOCALE[lang], o).format(n),
        reducedMotion: prefersReducedMotion(),
        quality: qualityHint(),
      };
      instance = await mod.mount(ctx);
      root.dataset.sceneReady = '';
      const r = container.getBoundingClientRect();
      instance.resize(r.width, r.height);
      const init = pending ?? { state: mod.states[0], opts: { direction: 1 as const, immediate: true } };
      if (init.state) instance.setState(init.state, init.opts);
      if (progress !== null) instance.setProgress?.(progress);
      instance.setActive(active);
    } catch (err) {
      console.warn(`[scene ${id}]`, err);
      const msg = document.createElement('p');
      msg.className = 'scene__error';
      msg.textContent = t('scrolly.scene.error');
      container.appendChild(msg);
    }
  }

  new IntersectionObserver(
    (es) => {
      if (es.some((e) => e.isIntersecting)) {
        void start();
      }
    },
    { rootMargin: '100% 0px' },
  ).observe(root);

  new IntersectionObserver((es) => {
    active = es[es.length - 1].isIntersecting;
    instance?.setActive(active);
  }).observe(root);

  new ResizeObserver((es) => {
    const r = es[0].contentRect;
    instance?.resize(r.width, r.height);
  }).observe(container);

  return controller;
}

export function initScenes(): SceneController[] {
  return [...document.querySelectorAll<HTMLElement>('[data-scene-root]')]
    .filter((el) => !el.hasAttribute('data-missing'))
    .map((el) => controllers.get(el) ?? createController(el));
}
