<script lang="ts">
  /*
   * Summed kinetic energy of the two electrons, E in units of Q (Xe-136: Q = 2.458 MeV, K = E / m_e):
   *   2 nu beta beta continuum:  f(K) ~ K (Q - K)^5 (1 + 2K + 4K^2/3 + K^3/3 + K^4/30)      (approximate shape, K and Q in m_e units)
   *   0 nu beta beta:            a line at E = Q.
   * Both are smeared with a Gaussian of FWHM = f x Q (sigma = FWHM / 2.355); area(2nu) = 1, area(0nu) = the chosen ratio. Log vertical axis.
   * Region of interest (ROI) = Q +- FWHM; S/B = 0nu counts / 2nu counts inside it. Schematic: no real half-lives.
   */
  import './_widget.css';
  import './_widget3.css';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber, formatSci } from '../../lib/format';
  import { Q_XE136_MEV, dbdModel } from './_physics3';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const sig = (n: number, d = 2) => formatNumber(lang, n, { maximumSignificantDigits: d });

  const F0 = 0.002, F1 = 0.1, R0 = 1e-8, R1 = 1e-3;
  let tf = $state(Math.log(0.02 / F0) / Math.log(F1 / F0));
  let tr = $state(Math.log(1e-5 / R0) / Math.log(R1 / R0));
  const fwhm = $derived(F0 * (F1 / F0) ** tf);
  const ratio = $derived(R0 * (R1 / R0) ** tr);
  const m = $derived(dbdModel(ratio, fwhm));

  const W = 480, H = 300, ML = 50, MR = 12, MT = 30, MB = 44;
  const XM = 1.2;
  const px = (x: number) => ML + (x / XM) * (W - ML - MR);
  const YLO = -10, YHI = 0.5;
  const py = (v: number) => H - MB - ((Math.log10(Math.max(v, 1e-12)) - YLO) / (YHI - YLO)) * (H - MB - MT);
  const line = (a: number[]) =>
    a
      .map((v, i) => ({ x: m.x[i], v }))
      .filter((p) => p.v > 1e-10)
      .map((p, i) => `${i ? 'L' : 'M'}${px(p.x).toFixed(1)} ${py(p.v).toFixed(1)}`)
      .join('');
  const dTotal = $derived(line(m.total));
  const d2 = $derived(line(m.two));
  const visible = $derived(m.sOverB > 1);
</script>

<div class="w">
  <h3 class="w-title">{t('widget.DbdSpectrum.title')}</h3>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {W} {H}" role="img" aria-label={t('widget.DbdSpectrum.view')}>
        <line class="axis" x1={ML} x2={W - MR} y1={H - MB} y2={H - MB} />
        <line class="axis" x1={ML} x2={ML} y1={MT} y2={H - MB} />
        {#each [0, 0.25, 0.5, 0.75, 1] as v}
          <line class="axis" x1={px(v)} x2={px(v)} y1={H - MB} y2={H - MB + 4} />
          <text class="n" x={px(v)} y={H - MB + 16} text-anchor="middle">{formatNumber(lang, v)}</text>
        {/each}
        {#each [-10, -8, -6, -4, -2, 0] as e}
          <line class="guide" x1={ML} x2={W - MR} y1={py(10 ** e)} y2={py(10 ** e)} />
          <text class="n" x={ML - 6} y={py(10 ** e) + 4} text-anchor="end">{formatSci(lang, 10 ** e)}</text>
        {/each}
        <text x={(ML + W) / 2} y={H - 6} text-anchor="middle">{t('widget.DbdSpectrum.axisX')}</text>
        <text x={ML} y={14}>{t('widget.DbdSpectrum.axisY')}</text>
        <rect class="band" x={px(m.roi[0])} y={MT} width={px(m.roi[1]) - px(m.roi[0])} height={H - MB - MT} />
        <text class="halo" x={px(m.roi[0]) - 4} y={MT + 12} text-anchor="end">{t('widget.DbdSpectrum.roi')}</text>
        <path d={d2} class="ink dash" />
        <path d={dTotal} class="acc" stroke-width="2" />
                <text class="halo strong" x={px(1)} y={Math.max(py(m.zero[Math.round(1 / (XM / (m.x.length - 1)))]) - 10, MT + 34)} text-anchor="middle">{t('widget.DbdSpectrum.zero')}</text>
        <g transform="translate({px(0.04)},{py(1e-6)})">
          <line class="ink dash" x1="0" x2="22" y1="0" y2="0" />
          <text class="halo" x="28" y="4">{t('widget.DbdSpectrum.two')}</text>
          <line class="acc" x1="0" x2="22" y1="16" y2="16" stroke-width="2" />
          <text class="halo" x="28" y="20">{t('widget.DbdSpectrum.sum')}</text>
        </g>
        <line class="guide dot" x1={px(1)} x2={px(1)} y1={MT} y2={H - MB} />
      </svg>
      <figcaption>{t('widget.DbdSpectrum.cap', { q: formatNumber(lang, Q_XE136_MEV, { minimumFractionDigits: 3 }) })}</figcaption>
    </figure>
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="dbd-f"><span>{t('widget.DbdSpectrum.res')}</span><span class="w-val">{sig(fwhm * 100)} <span class="w-unit">% FWHM</span></span></label>
        <input id="dbd-f" type="range" min="0" max="1" step="0.005" bind:value={tf} aria-valuetext="{sig(fwhm * 100)} % FWHM" />
      </div>
      <div class="w-ctl">
        <label for="dbd-r"><span>{t('widget.DbdSpectrum.ratio')}</span><span class="w-val">{formatSci(lang, ratio, { digits: 1, force: true })}</span></label>
        <input id="dbd-r" type="range" min="0" max="1" step="0.005" bind:value={tr} aria-valuetext={formatSci(lang, ratio, { digits: 1, force: true })} />
      </div>
      <dl class="w-read" aria-live="polite">
        <dt>{t('widget.DbdSpectrum.sigmaE')}</dt><dd>{sig((fwhm * Q_XE136_MEV * 1000) / 2.3548)}<span class="w-unit">keV</span></dd>
        <dt>{t('widget.DbdSpectrum.nSig')}</dt><dd>{formatSci(lang, m.nSig, { digits: 1, force: true })}</dd>
        <dt>{t('widget.DbdSpectrum.nBg')}</dt><dd>{formatSci(lang, m.nBg, { digits: 1, force: true })}</dd>
        <dt>S / B</dt><dd>{formatSci(lang, m.sOverB, { digits: 1 })}</dd>
      </dl>
      <p class="w-note" style="color:var(--fg)" aria-live="polite">{visible ? t('widget.DbdSpectrum.visible') : t('widget.DbdSpectrum.swamped')}</p>
    </div>
  </div>
  <p class="w-note">{t('widget.DbdSpectrum.note')}</p>
</div>
