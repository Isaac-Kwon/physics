<script lang="ts">
  /*
   * Two uniform discs, R = 7 fm, separated by b.
   * A = 2R^2 acos(b/2R) - (b/2) sqrt(4R^2 - b^2);  N_part ~ 416 A/(pi R^2);  centrality ~ (b/2R)^2 * 100 %.
   * eps = (<y^2> - <x^2>)/(<y^2> + <x^2>) of the lens, by grid sampling (uniform density), x along b.
   */
  import './_widget.css';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { R_PB_FM as R, lensArea, lensEpsilon, lensPath } from './_physics';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const fmt = (n: number, d = 1) => formatNumber(lang, n, { maximumFractionDigits: d, minimumFractionDigits: d });

  let b = $state(6);
  const A = $derived(lensArea(b));
  const overlap = $derived(b < 2 * R - 0.05);
  const npart = $derived((416 * A) / (Math.PI * R * R));
  const cent = $derived(Math.min((b / (2 * R)) ** 2 * 100, 100));
  const eps = $derived(lensEpsilon(b));
  const k = 13; // px per fm
  const path = $derived(lensPath(b, R, k));
</script>

<div class="w">
  <h3 class="w-title">{t('widget.ImpactParameter.title')}</h3>
  <div class="w-ctl">
    <label for="ip-b"><span>{t('widget.ImpactParameter.slider')}</span><span class="w-val">{fmt(b)} <span class="w-unit">fm</span></span></label>
    <input id="ip-b" type="range" min="0" max="15" step="0.1" bind:value={b} aria-valuetext="{fmt(b)} fm" />
  </div>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="-230 -105 460 210" role="img" aria-label={t('widget.ImpactParameter.view')}>
              <circle cx={(-b / 2) * k} cy="0" r={R * k} fill="var(--bg-sunken)" stroke="var(--fg-faint)" stroke-width="1.5" />
        <circle cx={(b / 2) * k} cy="0" r={R * k} fill="var(--bg-sunken)" stroke="var(--fg-faint)" stroke-width="1.5" />
        {#if overlap}
          <path d={path} fill="var(--accent)" fill-opacity="0.35" stroke="var(--accent)" stroke-width="1.5" />
        {/if}
        <line class="guide" x1="-225" x2="225" y1="0" y2="0" stroke-dasharray="3 3" />
        <line x1={(-b / 2) * k} x2={(b / 2) * k} y1="0" y2="0" stroke="var(--fg)" stroke-width="1.5" />
        <text x="0" y="-6" text-anchor="middle" class="n strong">b</text>
        <text x="-225" y="101" text-anchor="start">{t('widget.ImpactParameter.spectators')}: {t('widget.ImpactParameter.grey')}</text>
        {#if overlap}<text x="225" y="101" text-anchor="end" class="strong">{t('widget.ImpactParameter.participants')}: {t('widget.ImpactParameter.shaded')}</text>{/if}
      </svg>
      <figcaption>{t('widget.ImpactParameter.view')}</figcaption>
    </figure>
    <div aria-live="polite">
      <dl class="w-read">
        <dt>b</dt><dd>{fmt(b)}<span class="w-unit">fm</span></dd>
        <dt>{t('widget.ImpactParameter.area')}</dt><dd>{overlap ? fmt(A, 0) : t('widget.ImpactParameter.noOverlap')}{#if overlap}<span class="w-unit">fm²</span>{/if}</dd>
        <dt>{t('widget.ImpactParameter.npart')}</dt><dd>{fmt(npart, 0)}</dd>
        <dt>{t('widget.ImpactParameter.centrality')}</dt><dd>{fmt(cent, 0)}<span class="w-unit">%</span></dd>
        <dt>{t('widget.ImpactParameter.eps')}</dt><dd>{overlap ? fmt(eps, 2) : '—'}</dd>
      </dl>
      <div class="w-bar" aria-hidden="true" style="margin-top:var(--space-2)"><span style="width:{overlap ? Math.max(eps, 0) * 100 : 0}%"></span></div>
    </div>
  </div>
  <p class="w-note">{t('widget.ImpactParameter.note')}</p>
</div>
