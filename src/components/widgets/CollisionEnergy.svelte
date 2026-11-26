<script lang="ts">
  /*
   * gamma = sqrt(s_NN) / (2 m_N), m_N = 0.938 GeV;  thickness L = 14 fm / gamma;
   * stopping fraction f = 1 / (1 + (sqrt(s_NN)/15 GeV)^2)  (schematic, smooth transition ~10-20 GeV).
   */
  import './_widget.css';
  import { interpolateRgb } from 'd3';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { D_PB_FM, SQRTS_MAX, SQRTS_MIN, gammaOf, sqrtsFromT, stopFraction, tFromSqrts, thicknessFm } from './_physics';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const fmt = (n: number, d = 2) => formatNumber(lang, n, { maximumFractionDigits: d });
  const sig = (n: number, s = 3) => formatNumber(lang, n, { maximumSignificantDigits: s });

  let tt = $state(tFromSqrts(5020 > SQRTS_MAX ? SQRTS_MAX : 5020));
  const s = $derived(sqrtsFromT(tt));
  const gamma = $derived(gammaOf(s));
  const L = $derived(thicknessFm(s));
  const f = $derived(stopFraction(s));
  const regime = $derived(f < 0.25 ? 'transparent' : f > 0.75 ? 'stopped' : 'mixed');
  const marks = [
    { k: 'fair', s: 4 },
    { k: 'bes', s: 19.6 },
    { k: 'rhic', s: 200 },
    { k: 'lhc', s: 5360 },
  ];

  // drawing: height 130 px = 14 fm
  const H = 130;
  const px = $derived(Math.max((L / D_PB_FM) * H, 2));
  const col = $derived(interpolateRgb('#f4c76b', '#a8281c')(f));
</script>

<div class="w">
  <h3 class="w-title">{t('widget.CollisionEnergy.title')}</h3>
  <div class="w-ctl">
    <label for="ce-s"><span>{t('widget.CollisionEnergy.slider')}</span><span class="w-val">{sig(s, 3)} <span class="w-unit">GeV</span></span></label>
    <input id="ce-s" type="range" min="0" max="1" step="0.001" bind:value={tt} aria-valuetext="{sig(s, 3)} GeV" />
    <div class="w-marks">
      {#each marks as m}
        <button type="button" onclick={() => (tt = tFromSqrts(Math.min(Math.max(m.s, SQRTS_MIN), SQRTS_MAX)))}>{t('widget.CollisionEnergy.mark.' + m.k)} · {fmt(m.s, 1)} GeV</button>
      {/each}
    </div>
  </div>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 480 170" role="img" aria-label={t('widget.CollisionEnergy.view')}>
        <line class="guide" x1="0" x2="480" y1="85" y2="85" />
        <ellipse cx={240 - 14 - px / 2} cy="85" rx={px / 2} ry={H / 2} fill="var(--bg-raised)" stroke="var(--fg)" stroke-width="1.5" />
        <ellipse cx={240 + 14 + px / 2} cy="85" rx={px / 2} ry={H / 2} fill="var(--bg-raised)" stroke="var(--fg)" stroke-width="1.5" />
        <circle cx="240" cy="85" r="9" fill={col} stroke="var(--fg-muted)" stroke-width="1" />
        <text x="240" y="165" text-anchor="middle">{t('widget.CollisionEnergy.centre')}</text>
        <text x="8" y="14">→</text>
        <text x="472" y="14" text-anchor="end">←</text>
        <text class="n" x="240" y="12" text-anchor="middle">L = {fmt(L, L < 1 ? 3 : 1)} fm</text>
      </svg>
      <figcaption>{t('widget.CollisionEnergy.view')}</figcaption>
    </figure>
    <div class="w-row" style="display:grid;gap:var(--space-3)">
      <div aria-live="polite">
        <dl class="w-read">
          <dt>√s_NN</dt><dd>{sig(s)}<span class="w-unit">GeV</span></dd>
          <dt>{t('widget.CollisionEnergy.gamma')}</dt><dd>{gamma < 100 ? fmt(gamma, 1) : fmt(Math.round(gamma), 0)}</dd>
          <dt>{t('widget.CollisionEnergy.thickness')}</dt><dd>{L < 0.1 ? sig(L, 2) : fmt(L, 1)}<span class="w-unit">fm</span></dd>
        </dl>
      </div>
      <div class="w-ctl">
        <span class="w-lab"><span>{t('widget.CollisionEnergy.stopbar')}</span><span class="w-val">{fmt(f * 100, 0)} %</span></span>
        <div class="w-bar" aria-hidden="true"><span style="width:{f * 100}%"></span></div>
        <strong aria-live="polite">{t('widget.CollisionEnergy.' + regime)}</strong>
      </div>
    </div>
  </div>
  <p class="w-note">{t('widget.CollisionEnergy.note')}</p>
</div>
