/** Device detection for quality scaling and motion preferences (PLAN §4.3, §3.6). Client-only helpers. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Particle-count multiplier 0.25–1 from coarse device signals. */
export function qualityHint(): number {
  if (typeof navigator === 'undefined') return 1;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  let q = 1;
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  if (cores <= 4) q = Math.min(q, 0.6);
  if (cores <= 2 || mem <= 2) q = Math.min(q, 0.35);
  if (nav.connection?.saveData) q = Math.min(q, 0.35);
  if (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 500) q = Math.min(q, 0.6);
  return Math.max(0.25, q);
}

export function dprCap(): number {
  return Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
}

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
