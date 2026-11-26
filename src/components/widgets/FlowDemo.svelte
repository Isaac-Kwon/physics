<script lang="ts">
  /*
   * v2 ~ k * kappa * eps, k ~ 0.2 (rough hydrodynamic response), kappa in [0,1] = rescattering strength.
   * dN/dphi ~ 1 + 2 v2 cos(2 phi); phi sampled by inverting F(phi) = phi + v2 sin(2 phi) with 500 fixed uniform draws.
   * Source ellipse semi-axes: a_x^2 : a_y^2 = (1 - eps) : (1 + eps)  =>  (<y^2>-<x^2>)/(<y^2>+<x^2>) = eps.
   */
  import './_widget.css';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { rng } from './_physics';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const fmt = (n: number, d = 2) => formatNumber(lang, n, { maximumFractionDigits: d, minimumFractionDigits: d });

  const K = 0.2;
  const N = 500;
  const NB = 36;
  let eps = $state(0.3);
  let kappa = $state(1);
  const v2 = $derived(K * kappa * eps);

  const us = (() => {
    const r = rng(2026);
    return Array.from({ length: N }, () => r() * 2 * Math.PI);
  })();
  const phis = $derived(
    us.map((target) => {
      let lo = 0;
      let hi = 2 * Math.PI;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (mid + v2 * Math.sin(2 * mid) < target) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }),
  );
  const rays = $derived(
    phis
      .map((p) => {
        const c = Math.cos(p);
        const s = Math.sin(p);
        return `M${(120 + 92 * c).toFixed(1)} ${(120 - 92 * s).toFixed(1)}L${(120 + 104 * c).toFixed(1)} ${(120 - 104 * s).toFixed(1)}`;
      })
      .join(''),
  );
  const ax = $derived(54 * Math.sqrt(1 - eps));
  const ay = $derived(54 * Math.sqrt(1 + eps));

  const polar = $derived(
    Array.from({ length: 181 }, (_, i) => {
      const p = (i / 180) * 2 * Math.PI;
      const r = 70 * (1 + 2 * v2 * Math.cos(2 * p));
      return `${i ? 'L' : 'M'}${(120 + r * Math.cos(p)).toFixed(1)} ${(120 - r * Math.sin(p)).toFixed(1)}`;
    }).join(''),
  );

  // histogram
  const bins = $derived.by(() => {
    const h = new Array(NB).fill(0);
    for (const p of phis) h[Math.min(NB - 1, Math.floor((p / (2 * Math.PI)) * NB))]++;
    return h as number[];
  });
  const W = 240, Hh = 200, X0 = 28, Y0 = 170, YMAX = 30;
  const hx = (p: number) => X0 + (p / (2 * Math.PI)) * (W - X0 - 6);
  const hy = (c: number) => Y0 - (c / YMAX) * (Y0 - 14);
  const histPath = $derived(
    bins.map((c, i) => `${i ? 'L' : 'M'}${hx((i / NB) * 2 * Math.PI).toFixed(1)} ${hy(c).toFixed(1)}L${hx(((i + 1) / NB) * 2 * Math.PI).toFixed(1)} ${hy(c).toFixed(1)}`).join(''),
  );
  const expPath = $derived(
    Array.from({ length: 121 }, (_, i) => {
      const p = (i / 120) * 2 * Math.PI;
      return `${i ? 'L' : 'M'}${hx(p).toFixed(1)} ${hy((N / NB) * (1 + 2 * v2 * Math.cos(2 * p))).toFixed(1)}`;
    }).join(''),
  );
</script>

<div class="w">
  <h3 class="w-title">{t('widget.FlowDemo.title')}</h3>
  <div class="w-body" style="grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))">
    <div class="w-ctl">
      <label for="fd-e"><span>{t('widget.FlowDemo.eps')}</span><span class="w-val">{fmt(eps)}</span></label>
      <input id="fd-e" type="range" min="0" max="0.6" step="0.01" bind:value={eps} aria-valuetext={fmt(eps)} />
    </div>
    <div class="w-ctl">
      <label for="fd-k"><span>{t('widget.FlowDemo.kappa')}</span><span class="w-val">κ = {fmt(kappa)}</span></label>
      <input id="fd-k" type="range" min="0" max="1" step="0.01" bind:value={kappa} aria-valuetext="κ {fmt(kappa)}" />
    </div>
    <div class="w-ctl" aria-live="polite">
      <span class="w-lab"><span>{t('widget.FlowDemo.v2')} ≈ {fmt(K, 1)}·κ·ε</span><span class="w-val">{fmt(v2, 3)}</span></span>
    </div>
  </div>
  <div class="w-body w-body--3">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 240 240" role="img" aria-label={t('widget.FlowDemo.source')}>
        <line class="guide" x1="0" x2="240" y1="120" y2="120" />
        <line class="guide" x1="120" x2="120" y1="0" y2="240" />
        <ellipse cx="120" cy="120" rx={ax} ry={ay} fill="var(--accent)" fill-opacity="0.25" stroke="var(--accent)" stroke-width="1.5" />
        <path d={rays} stroke="var(--fg)" stroke-width="0.8" fill="none" />
        <text x="236" y="236" text-anchor="end">{t('widget.FlowDemo.inplane')} →</text>
      </svg>
      <figcaption>{t('widget.FlowDemo.source')}</figcaption>
    </figure>
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 240 240" role="img" aria-label={t('widget.FlowDemo.polar')}>
        <line class="guide" x1="0" x2="240" y1="120" y2="120" />
        <line class="guide" x1="120" x2="120" y1="0" y2="240" />
        <circle cx="120" cy="120" r="70" fill="none" stroke="var(--fg-faint)" stroke-dasharray="3 3" />
        <path d={polar} class="acc" />
        <text x="236" y="236" text-anchor="end">{t('widget.FlowDemo.inplane')} →</text>
        <text x="4" y="12">↑ {t('widget.FlowDemo.outplane')}</text>
      </svg>
      <figcaption>{t('widget.FlowDemo.polar')} · {t('widget.FlowDemo.iso')}</figcaption>
    </figure>
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {W} {Hh}" role="img" aria-label={t('widget.FlowDemo.hist')}>
        <line class="axis" x1={X0} x2={W - 6} y1={Y0} y2={Y0} />
        <line class="axis" x1={X0} x2={X0} y1="10" y2={Y0} />
        {#each [0, 1, 2] as i}
          <text class="n" x={hx(i * Math.PI)} y={Y0 + 14} text-anchor="middle">{['0', 'π', '2π'][i]}</text>
        {/each}
        <text class="n" x={X0 - 4} y={hy(0) + 4} text-anchor="end">0</text>
        <text class="n" x={X0 - 4} y={hy(30) + 4} text-anchor="end">30</text>
        <path d={histPath} stroke="var(--fg)" stroke-width="1.2" fill="none" />
        <path d={expPath} class="acc" />
        <text x={X0 + 4} y={Y0 + 30}>φ (rad)</text>
        <text x={W - 6} y="10" text-anchor="end" class="strong">{t('widget.FlowDemo.sampled')}</text>
      </svg>
      <figcaption>{t('widget.FlowDemo.hist')} · {t('widget.FlowDemo.expected')}</figcaption>
    </figure>
  </div>
  <p class="w-note">{t('widget.FlowDemo.note')}</p>
</div>
