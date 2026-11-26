<script lang="ts">
  /*
   * mu_B(sqrt s) = d / (1 + e sqrt s),   d = 1.308 GeV, e = 0.273 GeV^-1
   * T_ch(mu_B)   = a - b mu_B^2 - c mu_B^4, a = 0.166 GeV, b = 0.139 GeV^-1, c = 0.053 GeV^-3
   * (Cleymans, Oeschler, Redlich, Wheaton, PRC 73, 034905 (2006)). Plotted in MeV.
   */
  import './_widget.css';
  import { scaleLinear } from 'd3';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { SQRTS_MAX, SQRTS_MIN, Tch, muB, sqrtsFromT, tFromSqrts } from './_physics';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const fmt = (n: number, d = 0) => formatNumber(lang, n, { maximumFractionDigits: d });
  const sig = (n: number) => formatNumber(lang, n, { maximumSignificantDigits: 3 });

  let tt = $state(tFromSqrts(19.6));
  const s = $derived(sqrtsFromT(tt));
  const mu = $derived(muB(s) * 1000);
  const T = $derived(Tch(muB(s)) * 1000);
  const marks = [2.4, 7.7, 19.6, 62.4, 200, 5360];

  const W = 480, H = 330, L = 44, B = 40, Tp = 12, Rt = 12;
  const x = scaleLinear().domain([0, 1000]).range([L, W - Rt]);
  const y = scaleLinear().domain([0, 200]).range([H - B, Tp]);
  const curve = Array.from({ length: 81 }, (_, i) => {
    const m = (i / 80) * 0.8;
    return `${i ? 'L' : 'M'}${x(m * 1000).toFixed(1)} ${y(Tch(m) * 1000).toFixed(1)}`;
  }).join('');
</script>

<div class="w">
  <h3 class="w-title">{t('widget.EnergyScan.title')}</h3>
  <div class="w-ctl">
    <label for="es-s"><span>{t('widget.EnergyScan.slider')}</span><span class="w-val">{sig(s)} <span class="w-unit">GeV</span></span></label>
    <input id="es-s" type="range" min="0" max="1" step="0.001" bind:value={tt} aria-valuetext="{sig(s)} GeV" />
    <div class="w-marks">
      {#each marks as m}
        <button type="button" onclick={() => (tt = tFromSqrts(Math.min(Math.max(m, SQRTS_MIN), SQRTS_MAX)))}>{fmt(m, 1)} GeV</button>
      {/each}
    </div>
  </div>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {W} {H}" role="img" aria-label={t('widget.EnergyScan.view')}>
        <line class="axis" x1={L} x2={W - Rt} y1={H - B} y2={H - B} />
        <line class="axis" x1={L} x2={L} y1={Tp} y2={H - B} />
        {#each [0, 200, 400, 600, 800, 1000] as v}
          <line class="axis" x1={x(v)} x2={x(v)} y1={H - B} y2={H - B + 4} />
          <text class="n" x={x(v)} y={H - B + 16} text-anchor="middle">{v}</text>
        {/each}
        {#each [0, 50, 100, 150, 200] as v}
          <line class="axis" x1={L - 4} x2={L} y1={y(v)} y2={y(v)} />
          <text class="n" x={L - 7} y={y(v) + 4} text-anchor="end">{v}</text>
        {/each}
        <text x={(L + W) / 2} y={H - 6} text-anchor="middle">μ_B (MeV)</text>
        <text x={L + 6} y={Tp + 8}>T (MeV)</text>

        <!-- crossover band, lattice, mu_B ~ 0, T ~ 155-160 MeV -->
        <rect class="band" x={x(0)} y={y(160)} width={x(160) - x(0)} height={y(155) - y(160)} />
        <text class="halo" x={x(0) + 4} y={y(143)}>{t('widget.EnergyScan.crossover')}</text>

        <!-- hypothetical critical-point region -->
        <ellipse cx={x(450)} cy={y(105)} rx={x(160) - x(0)} ry={y(0) - y(26)} fill="none" stroke="var(--fg-faint)" stroke-dasharray="4 4" />
        <text class="halo" x={x(450)} y={y(105) + 4} text-anchor="middle">{t('widget.EnergyScan.critical')}</text>

        <path d={curve} class="ink" />
        <text class="halo" x={x(790)} y={y(38)} text-anchor="end">{t('widget.EnergyScan.curve')}</text>
        {#each marks as m}
          <circle cx={x(muB(m) * 1000)} cy={y(Tch(muB(m)) * 1000)} r="2.5" fill="var(--bg)" stroke="var(--fg)" />
        {/each}

        <line x1={x(mu)} x2={x(mu)} y1={y(T)} y2={H - B} stroke="var(--accent)" stroke-dasharray="3 3" />
        <line x1={L} x2={x(mu)} y1={y(T)} y2={y(T)} stroke="var(--accent)" stroke-dasharray="3 3" />
        <circle cx={x(mu)} cy={y(T)} r="5.5" class="accfill" />
        <text class="strong halo" x={x(mu) + 9} y={y(T) - 10}>{t('widget.EnergyScan.now')}</text>
      </svg>
      <figcaption>{t('widget.EnergyScan.view')}</figcaption>
    </figure>
    <div aria-live="polite">
      <dl class="w-read">
        <dt>√s_NN</dt><dd>{sig(s)}<span class="w-unit">GeV</span></dd>
        <dt>{t('widget.EnergyScan.mu')}</dt><dd>{fmt(mu)}<span class="w-unit">MeV</span></dd>
        <dt>{t('widget.EnergyScan.T')}</dt><dd>{fmt(T)}<span class="w-unit">MeV</span></dd>
      </dl>
    </div>
  </div>
  <p class="w-note">{t('widget.EnergyScan.note')}</p>
</div>
