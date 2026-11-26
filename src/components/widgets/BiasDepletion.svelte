<script lang="ts">
  /*
   * Abrupt one-sided junction on an n-type bulk (p+ implant on top, n+ backside):
   *   N_eff = 1/(q mu_n rho),  mu_n = 1350 cm2/Vs
   *   W = min(d, sqrt(2 eps0 eps_r (V_bi + V) / (q N_eff))),  eps_r = 11.9, V_bi = 0.6 V
   *   V_fd = q N_eff d^2 / (2 eps0 eps_r) - V_bi
   *   field: E(x) = q N_eff (W - x)/(eps0 eps_r) below V_fd (triangle);  E(x) = (V - V_fd)/d + q N_eff (d - x)/(eps0 eps_r) above (trapezoid)
   *   MIP charge Q = 80 /um x W (undepleted silicon collects nothing: schematic);  leakage I/I(V_fd) = W/d (generation current).
   */
  import './_widget.css';
  import { scaleLinear } from 'd3';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { neffFromRho, depletionWidthCm, fullDepletionV, V_BI } from './_physics2';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const n0 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 0 });
  const n1 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const sig = (n: number) => formatNumber(lang, n, { maximumSignificantDigits: 3 });

  let V = $state(0);
  let d = $state(300); // um
  let rho = $state(4); // kOhm cm
  const neff = $derived(neffFromRho(rho * 1000));
  const dCm = $derived(d * 1e-4);
  const W = $derived(depletionWidthCm(V, neff, dCm) * 1e4); // um
  const Vfd = $derived(fullDepletionV(neff, dCm));
  const full = $derived(W >= d - 1e-6);
  const Q = $derived(80 * W);
  const frac = $derived(W / d);
  const neffLabel = $derived(formatNumber(lang, neff / 1e12, { maximumFractionDigits: 2 }));

  // plot W(V)
  const PW = 330, PH = 190, L = 42, B = 34, Tp = 10, R = 10;
  const x = scaleLinear().domain([0, 300]).range([L, PW - R]);
  const y = $derived(scaleLinear().domain([0, d]).range([PH - B, Tp]));
  const wcurve = $derived(
    Array.from({ length: 121 }, (_, i) => {
      const v = (i / 120) * 300;
      return `${i ? 'L' : 'M'}${x(v).toFixed(1)} ${y(depletionWidthCm(v, neff, dCm) * 1e4).toFixed(1)}`;
    }).join('')
  );

  // cross-section
  const CW = 330, CH = 190, cx0 = 40, cx1 = 240, top = 24, hgt = 140;
  const wpx = $derived(frac * hgt);
  // field profile in units of 2 (V_fd + V_bi)/d, so E(0) = 1 at V = V_fd; drawn width 70 px at the largest value (V = 300 V)
  const slopeUnit = $derived((2 * (Vfd + V_BI)) / d); // = q N / eps, in V/um per um ... (V/um^2)
  const Eof = (xu: number) => (full ? (V - Vfd) / d + (slopeUnit / d) * (d - xu) : (slopeUnit / d) * (W - xu));
  const Emax = $derived((300 - Vfd) / d + slopeUnit);
  const fieldPath = $derived.by(() => {
    const pts: string[] = [];
    const n = 24;
    const x0 = cx1 + 24;
    const end = full ? d : W;
    for (let i = 0; i <= n; i++) {
      const xu = (end * i) / n;
      pts.push(`${(x0 + (Eof(xu) / Emax) * 70).toFixed(1)},${(top + (xu / d) * hgt).toFixed(1)}`);
    }
    return `M${x0},${top}L${pts.join('L')}L${x0},${top + (end / d) * hgt}Z`;
  });
</script>

<div class="w">
  <h3 class="w-title">{t('widget.BiasDepletion.title')}</h3>
  <div class="w-body">
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="bd-v"><span>{t('widget.BiasDepletion.bias')}</span><span class="w-val">{n0(V)} <span class="w-unit">V</span></span></label>
        <input id="bd-v" type="range" min="0" max="300" step="1" bind:value={V} aria-valuetext="{n0(V)} V" />
      </div>
      <fieldset>
        <legend>{t('widget.BiasDepletion.thickness')}</legend>
        {#each [100, 200, 300, 500] as v}
          <label><input type="radio" name="bd-d" value={v} bind:group={d} /> {v} µm</label>
        {/each}
      </fieldset>
      <fieldset>
        <legend>{t('widget.BiasDepletion.rho')}</legend>
        {#each [1, 4, 10] as v}
          <label><input type="radio" name="bd-r" value={v} bind:group={rho} /> {v} kΩ·cm</label>
        {/each}
      </fieldset>
      <dl class="w-read" aria-live="polite">
        <dt>{t('widget.BiasDepletion.neff')}</dt><dd>{neffLabel} × 10¹²<span class="w-unit">cm⁻³</span></dd>
        <dt>{t('widget.BiasDepletion.w')}</dt><dd>{n1(W)}<span class="w-unit">µm</span></dd>
        <dt>{t('widget.BiasDepletion.vfd')}</dt><dd>{n0(Vfd)}<span class="w-unit">V</span></dd>
        <dt>{t('widget.BiasDepletion.q')}</dt><dd>{n0(Q)}<span class="w-unit">e⁻ ({sig(frac * 100)} %)</span></dd>
        <dt>{t('widget.BiasDepletion.leak')}</dt><dd>{sig(frac)}</dd>
      </dl>
      <p class="w-note" style="color:var(--fg)" aria-live="polite">{full ? t('widget.BiasDepletion.full') : t('widget.BiasDepletion.partial')}</p>
    </div>
    <div style="display:grid;gap:var(--space-4)">
      <figure class="w-fig">
        <svg class="w-svg" viewBox="0 0 {CW} {CH}" role="img" aria-label={t('widget.BiasDepletion.xsec')}>
          <defs>
            <pattern id="bd-und" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--fg-faint)" stroke-width="1" />
            </pattern>
          </defs>
          <rect x={cx0} y={top} width={cx1 - cx0} height={hgt} fill="url(#bd-und)" stroke="var(--fg)" stroke-width="1.2" />
          <rect x={cx0} y={top} width={cx1 - cx0} height={wpx} fill="var(--accent)" opacity="0.3" />
          <rect x={cx0} y={top} width={cx1 - cx0} height="5" fill="var(--fg)" />
          <rect x={cx0} y={top + hgt - 5} width={cx1 - cx0} height="5" fill="var(--fg)" />
          <line x1={cx0 - 4} x2={cx1 + 4} y1={top + wpx} y2={top + wpx} stroke="var(--accent)" stroke-width="2" />
          <text class="strong halo" x={cx0 + 8} y={top + Math.max(wpx / 2, 18) + 4}>{t('widget.BiasDepletion.depleted')}</text>
          {#if !full && hgt - wpx > 20}<text class="halo" x={cx0 + 8} y={top + wpx + (hgt - wpx) / 2 + 4}>{t('widget.BiasDepletion.undepleted')}</text>{/if}
          <text x={cx0} y={top - 8}>{t('widget.BiasDepletion.top')}</text>
          <text x={cx0} y={top + hgt + 16}>{t('widget.BiasDepletion.back')}</text>
          <line x1={cx0 - 12} x2={cx0 - 12} y1={top} y2={top + wpx} stroke="var(--fg)" stroke-width="1" />
          <text class="n strong" x={cx0 - 16} y={top + wpx / 2 + 4} text-anchor="end">W</text>
          <path d={fieldPath} fill="var(--accent)" opacity="0.35" stroke="var(--accent)" stroke-width="1.5" />
          <text x={cx1 + 24} y={top - 8}>E(x)</text>
        </svg>
        <figcaption>{t('widget.BiasDepletion.xsecCap')}</figcaption>
      </figure>
      <figure class="w-fig">
        <svg class="w-svg" viewBox="0 0 {PW} {PH}" role="img" aria-label={t('widget.BiasDepletion.plot')}>
          <line class="axis" x1={L} x2={PW - R} y1={PH - B} y2={PH - B} />
          <line class="axis" x1={L} x2={L} y1={Tp} y2={PH - B} />
          {#each [0, 100, 200, 300] as v}
            <line class="axis" x1={x(v)} x2={x(v)} y1={PH - B} y2={PH - B + 4} />
            <text class="n" x={x(v)} y={PH - B + 16} text-anchor="middle">{v}</text>
          {/each}
          {#each [0, d / 2, d] as v}
            <text class="n" x={L - 5} y={y(v) + 4} text-anchor="end">{n0(v)}</text>
          {/each}
          <line class="guide" x1={L} x2={PW - R} y1={y(d)} y2={y(d)} />
          <text x={(L + PW - R) / 2} y={PH - 4} text-anchor="middle">{t('widget.BiasDepletion.axisX')}</text>
          <text class="halo" x={L + 6} y={Tp + 14}>{t('widget.BiasDepletion.axisY')}</text>
          <path d={wcurve} fill="none" stroke="var(--fg)" stroke-width="1.6" />
          {#if Vfd <= 300}
            <line x1={x(Vfd)} x2={x(Vfd)} y1={PH - B} y2={y(d)} stroke="var(--fg)" stroke-dasharray="4 3" />
            <text class="strong halo" x={x(Vfd) + 4} y={PH - B - 6}>V_fd</text>
          {/if}
          <circle cx={x(V)} cy={y(W)} r="5" fill="var(--accent)" stroke="var(--bg)" stroke-width="1.5" />
        </svg>
      </figure>
    </div>
  </div>
  <p class="w-note">{t('widget.BiasDepletion.note')}</p>
</div>
