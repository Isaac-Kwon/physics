/**
 * Scene contract (PLAN §4.2, §4.3). Scenes are language-independent state machines.
 *
 *   MDX (per language)            scroll engine (src/components/scrolly)        scene module
 *   <Scene id="hi.collision">  →  mounts scene when near viewport          →  mount(ctx) → SceneInstance
 *     <Step state="lorentz">   →  on step enter: setState('lorentz')      →  instance.setState(...)
 *                              →  while scrubbing (pinned): setProgress(p)  →  instance.setProgress?(p)
 *
 * Scene ids: "<prefix>.<name>"  — prefixes: hub, hi (heavy-ion), dm (dark-matter), nu (neutrinos),
 * sc (semiconductor-detectors), det (detectors), shared (cross-topic scenes such as shared.tpc).
 * Scene modules live at src/scenes/<topic-dir>/<name>.ts and are registered in src/scenes/registry.ts.
 */

export interface SceneTheme {
  /** CSS colour strings from src/data/topics.ts */
  accent: string;
  accent2: string;
  /** Neutral palette, read from CSS custom properties at mount time. */
  bg: string;
  fg: string;
  grid: string;
}

export interface SceneContext {
  /** Element the scene renders into (sized by the layout; scene must not resize it). */
  container: HTMLElement;
  /**
   * The page's single shared WebGL renderer (PLAN §4.3: one context per page).
   * Lazily created on first call. 2D scenes (Canvas2D / SVG) should not call it.
   */
  getRenderer(): Promise<import('three').WebGLRenderer>;
  theme: SceneTheme;
  lang: 'ko' | 'en' | 'it';
  /** Localised scene label lookup (keys under "scene.<id>.*" in src/i18n/*.json, falls back to key). */
  label(key: string): string;
  /** Format numbers for the current locale (Italian decimal comma, etc.). */
  formatNumber(n: number, opts?: Intl.NumberFormatOptions): string;
  reducedMotion: boolean;
  /** Quality hint from device detection: scale particle counts by this (0.25–1). */
  quality: number;
}

export interface SetStateOptions {
  /** 1 = forward through the steps, -1 = scrolling back up. */
  direction: 1 | -1;
  /** true → jump without transition (initial mount, reduced motion, deep link). */
  immediate: boolean;
}

export interface SceneInstance {
  /** Transition to a named state. Must be idempotent. */
  setState(state: string, opts: SetStateOptions): void;
  /** Continuous progress 0–1 within the current state (pinned scrub, P1). Optional. */
  setProgress?(progress: number): void;
  /** Called when the container size changes. */
  resize(width: number, height: number): void;
  /** Pause/resume the render loop when off-screen. */
  setActive(active: boolean): void;
  dispose(): void;
}

export interface SceneModule {
  /** Ordered list of state names this scene understands. MDX may only reference these. */
  readonly states: readonly string[];
  mount(ctx: SceneContext): SceneInstance | Promise<SceneInstance>;
}

/** Lazy loader map entry: import() keeps each scene out of the initial bundle. */
export type SceneLoader = () => Promise<{ default: SceneModule }>;
