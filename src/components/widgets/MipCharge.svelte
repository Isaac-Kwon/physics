<script lang="ts">
  /*
   * Minimum-ionising particle in a silicon sensor of thickness t:
   *   mean:  <dE> = 0.39 keV/um x t  ->  <N> = <dE>/w = 108 /um x t   (w = 3.6 eV per pair)
   *   most probable (Landau peak): ~80 /um x t for thick sensors (thin sensors: smaller, schematic factor 1 - 0.25 exp(-t/60 um)).
   * Distribution drawn: Moyal density f(l) = exp(-(l + e^-l)/2)/sqrt(2 pi), l = (N - MPV)/xi, a Landau stand-in (schematic).
   *   xi is chosen so that the mean = MPV + 1.27 xi matches the mean above.
   * Signal-to-noise: S/N = MPV/ENC; detection efficiency with threshold 5 x ENC = P(N > 5 ENC) from the Moyal CDF.
   */
  import './_widget.css';
  import { scaleLinear } from 'd3';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { moyal, moyalCdf, MOYAL_MEAN } from './_physics2';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const n0 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 0 });
  const n1 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  let thick = $state(300);
  let enc = $state(150);
  const mpv = $derived(80 * thick * (1 - 0.25 * Math.exp(-thick / 60)));
  const mean = $derived(108 * thick);
  const xi = $derived((mean - mpv) / MOYAL_MEAN);
  const edep = $derived((0.39 * thick) ); // keV, mean
  const sn = $derived(mpv / enc);
  const eff = $derived(1 - moyalCdf((5 * enc - mpv) / xi));

  const W = 520, H = 260, L = 44, B = 36, Tp = 12, R = 12;
  const xmax = $derived(Math.max(mean * 2.6, 6 * enc, 1500));
  const x = $derived(scaleLinear().domain([0, xmax]).range([L, W - R]));
  const peak = $derived(moyal(0) / xi);
  const y = $derived(scaleLinear().domain([0, peak * 1.12]).range([H - B, Tp]));
  const curve = $derived(
    Array.from({ length: 161 }, (_, i) => {
      const v = (i / 160) * xmax;
      return `${i ? 'L' : 'M'}${x(v).toFixed(1)} ${y(moyal((v - mpv) / xi) / xi).toFixed(1)}`;
    }).join('')
  );
  const ticks = $derived.by(() => {
    const step = [500, 1000, 2000, 5000, 10000, 20000, 50000].find((s) => xmax / s <= 6) ?? 50000;
    return Array.from({ length: Math.floor(xmax / step) + 1 }, (_, i) => i * step);
  });
  // sensor cross-section: the dots are schematic, 1 dot ~ one pair per ~0.5 um scaled to at most 120 dots
  const dots = $derived.by(() => {
    const n = Math.min(120, Math.max(6, Math.round(thick / 4)));
    const out: { cx: number; cy: number }[] = [];
    for (let i = 0; i < n; i++) out.push({ cx: (i + 0.5) / n, cy: 0 });
    return out;
  });
  const SW = 520, SH = 90;
  const sh = $derived(8 + (thick / 500) * (SH - 14));
</script>

<div class="w">
  <h3 class="w-title">{t('widget.MipCharge.title')}</h3>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {W} {H}" role="img" aria-label={t('widget.MipCharge.view')}>
        <line class="axis" x1={L} x2={W - R} y1={H - B} y2={H - B} />
        <line class="axis" x1={L} x2={L} y1={Tp} y2={H - B} />
        {#each ticks as v}
          <line class="axis" x1={x(v)} x2={x(v)} y1={H - B} y2={H - B + 4} />
          <text class="n" x={x(v)} y={H - B + 16} text-anchor="middle">{formatNumber(lang, v / 1000)}k</text>
        {/each}
        <text x={(L + W - R) / 2} y={H - 4} text-anchor="middle">{t('widget.MipCharge.axisX')}</text>
        <text class="halo" x={W - R} y={Tp + 8} text-anchor="end">{t('widget.MipCharge.axisY')}</text>
        <path d={curve} fill="none" stroke="var(--accent)" stroke-width="2" />
        <line x1={x(mpv)} x2={x(mpv)} y1={y(0)} y2={y(peak)} stroke="var(--fg)" stroke-width="1" stroke-dasharray="4 3" />
        <text class="strong halo" x={x(mpv) + 5} y={y(peak) + 12}>{t('widget.MipCharge.mpvShort')}</text>
        <line x1={x(mean)} x2={x(mean)} y1={y(0)} y2={y(moyal((mean - mpv) / xi) / xi)} stroke="var(--fg)" stroke-width="1" stroke-dasharray="1 3" />
        <text class="strong halo" x={x(mean) + 5} y={y(moyal((mean - mpv) / xi) / xi) - 4}>{t('widget.MipCharge.meanShort')}</text>
        <rect x={x(0)} y={y(peak * 1.12)} width={Math.max(x(5 * enc) - x(0), 0)} height={y(0) - y(peak * 1.12)} class="band" />
        <line x1={x(5 * enc)} x2={x(5 * enc)} y1={y(peak * 1.12)} y2={y(0)} stroke="var(--fg)" stroke-width="1.5" />
        <text class="strong halo" x={x(5 * enc) + 5} y={Tp + 24}>{t('widget.MipCharge.thr')}</text>
      </svg>
      <figcaption>{t('widget.MipCharge.schematic')}</figcaption>
      <svg class="w-svg" viewBox="0 0 {SW} {SH + 26}" role="img" aria-label={t('widget.MipCharge.xsec')}>
        <rect x="10" y="6" width={SW - 20} height={sh} fill="var(--bg-sunken)" stroke="var(--fg)" stroke-width="1.2" />
        {#each dots as d, i}
          <circle cx={10 + d.cx * (SW - 20)} cy={6 + sh * (0.25 + 0.5 * (((i * 7) % 11) / 11))} r="1.6" fill="var(--accent)" />
        {/each}
        <line x1="6" x2={SW - 6} y1={6 + sh / 2} y2={6 + sh / 2} stroke="var(--fg)" stroke-width="1.2" />
        <path d="M{SW - 14} {6 + sh / 2 - 4} l8 4 l-8 4" fill="none" stroke="var(--fg)" stroke-width="1.2" />
        <text x={SW / 2} y={sh + 24} text-anchor="middle">{t('widget.MipCharge.xsecLabel', { t: n0(thick) })}</text>
      </svg>
    </figure>
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="mc-t"><span>{t('widget.MipCharge.thickness')}</span><span class="w-val">{n0(thick)} <span class="w-unit">µm</span></span></label>
        <input id="mc-t" type="range" min="10" max="500" step="5" bind:value={thick} aria-valuetext="{n0(thick)} µm" />
      </div>
      <div class="w-ctl">
        <label for="mc-n"><span>{t('widget.MipCharge.noise')}</span><span class="w-val">{n0(enc)} <span class="w-unit">e⁻</span></span></label>
        <input id="mc-n" type="range" min="50" max="1000" step="10" bind:value={enc} aria-valuetext="{n0(enc)} electrons" />
      </div>
      <dl class="w-read" aria-live="polite">
        <dt>{t('widget.MipCharge.mpv')}</dt><dd>{n0(mpv)}<span class="w-unit">e⁻</span></dd>
        <dt>{t('widget.MipCharge.mean')}</dt><dd>{n0(mean)}<span class="w-unit">e⁻</span></dd>
        <dt>{t('widget.MipCharge.edep')}</dt><dd>{n1(edep)}<span class="w-unit">keV</span></dd>
        <dt>{t('widget.MipCharge.sn')}</dt><dd>{n0(sn)}</dd>
        <dt>{t('widget.MipCharge.eff')}</dt><dd>{n1(eff * 100)}<span class="w-unit">%</span></dd>
      </dl>
    </div>
  </div>
  <p class="w-note">{t('widget.MipCharge.note')}</p>
</div>
