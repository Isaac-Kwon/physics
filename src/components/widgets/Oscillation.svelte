<script lang="ts">
  /*
   * Two-flavour approximation (one mixing angle, one mass splitting):
   *   P(nu_a -> nu_b) = sin^2(2 theta) sin^2(1.27 dm2 [eV^2] L [km] / E [GeV]),   survival = 1 - P.
   * Atmospheric / accelerator pair: dm2 = 2.5e-3 eV^2, sin^2 2theta = 1.   Solar / reactor pair: dm2 = 7.5e-5 eV^2, sin^2 2theta = 0.85.
   * Round numbers; no matter effects, no CP violation, no third flavour.
   */
  import './_widget.css';
  import './_widget3.css';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber, formatSci } from '../../lib/format';
  import { OSC_PAIRS, firstMaxLoverE, oscP } from './_physics3';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const sig = (n: number, d = 3) => formatNumber(lang, n, { maximumSignificantDigits: d });
  const pct = (n: number) => formatNumber(lang, n * 100, { maximumFractionDigits: 1 }) + ' %';

  const L0 = 1, L1 = 20000, E0 = 0.001, E1 = 1000;
  const tOf = (v: number, a: number, b: number) => Math.log(v / a) / Math.log(b / a);
  const vOf = (tt: number, a: number, b: number) => a * (b / a) ** tt;

  let tL = $state(tOf(295, L0, L1));
  let tE = $state(tOf(0.6, E0, E1));
  let pair = $state<'atm' | 'sol'>('atm');
  const L = $derived(vOf(tL, L0, L1));
  const E = $derived(vOf(tE, E0, E1));
  const par = $derived(OSC_PAIRS[pair]);
  const LE = $derived(L / E);
  const P = $derived(oscP(par.sin22, par.dm2, LE));
  const phase = $derived(1.27 * par.dm2 * LE);
  const fmtE = (e: number) => (e < 1 ? `${sig(e * 1000)} MeV` : `${sig(e)} GeV`);
  const fmtL = (l: number) => `${sig(l)} km`;

  const presets = [
    { k: 'reactor', L: 53, E: 0.004, pair: 'sol' as const },
    { k: 't2k', L: 295, E: 0.6, pair: 'atm' as const },
    { k: 'dune', L: 1300, E: 2.5, pair: 'atm' as const },
    { k: 'atm', L: 12700, E: 1, pair: 'atm' as const },
  ];
  function apply(p: (typeof presets)[number]) {
    tL = tOf(p.L, L0, L1);
    tE = tOf(p.E, E0, E1);
    pair = p.pair;
  }

  // plot: P vs L/E (km/GeV), log x from 1 to 2e5
  const W = 460, H = 270, ML = 46, MR = 12, MT = 44, MB = 42;
  const X0 = 1, X1 = 2e5;
  const px = (v: number) => ML + ((Math.log10(v) - Math.log10(X0)) / (Math.log10(X1) - Math.log10(X0))) * (W - ML - MR);
  const py = (p: number) => H - MB - p * (H - MB - MT);
  // where the oscillation is too fast to resolve on screen (< ~4 px per period) the curve shows its average, sin^2(2theta)/2
  const shown = (pp: { dm2: number; sin22: number }, v: number) => {
    const w = Math.min(Math.max((1.27 * pp.dm2 * v - 15) / 15, 0), 1);
    return (1 - w) * oscP(pp.sin22, pp.dm2, v) + (w * pp.sin22) / 2;
  };
  const curve = (pp: { dm2: number; sin22: number }) => {
    const n = 6000;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const v = X0 * (X1 / X0) ** (i / n);
      d += `${i ? 'L' : 'M'}${px(v).toFixed(1)} ${py(shown(pp, v)).toFixed(1)}`;
    }
    return d;
  };
  const dAtm = curve(OSC_PAIRS.atm);
  const dSol = curve(OSC_PAIRS.sol);
  const xticks = [1, 10, 100, 1e3, 1e4, 1e5];
</script>

<div class="w">
  <h3 class="w-title">{t('widget.Oscillation.title')}</h3>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {W} {H}" role="img" aria-label={t('widget.Oscillation.view')}>
        <line class="axis" x1={ML} x2={W - MR} y1={H - MB} y2={H - MB} />
        <line class="axis" x1={ML} x2={ML} y1={MT} y2={H - MB} />
        {#each xticks as v}
          <line class="axis" x1={px(v)} x2={px(v)} y1={H - MB} y2={H - MB + 4} />
          <text class="n" x={px(v)} y={H - MB + 16} text-anchor="middle">{formatSci(lang, v)}</text>
        {/each}
        {#each [0, 0.5, 1] as v}
          <line class="guide" x1={ML} x2={W - MR} y1={py(v)} y2={py(v)} />
          <text class="n" x={ML - 6} y={py(v) + 4} text-anchor="end">{formatNumber(lang, v)}</text>
        {/each}
        <text x={(ML + W - MR) / 2} y={H - 6} text-anchor="middle">{t('widget.Oscillation.axisX')}</text>
        <text x={ML + 6} y={MT + 12}>{t('widget.Oscillation.axisY')}</text>
        <!-- the pair that is not selected: faint and dashed -->
        <path d={pair === 'atm' ? dSol : dAtm} class="guide dash" style="stroke:var(--fg-faint)" />
        <path d={pair === 'atm' ? dAtm : dSol} class="acc" />
        <!-- first maximum -->
        <line class="guide dot" x1={px(firstMaxLoverE(par.dm2))} x2={px(firstMaxLoverE(par.dm2))} y1={MT} y2={H - MB} />
        <text class="halo" x={px(firstMaxLoverE(par.dm2)) + 4} y={MT + 14}>{t('widget.Oscillation.firstMax')}</text>
        <!-- current point -->
        <line class="ink thin" x1={px(LE)} x2={px(LE)} y1={MT} y2={H - MB} />
        <circle cx={px(LE)} cy={py(P)} r="5" fill="var(--bg)" stroke="var(--fg)" stroke-width="2" />
        <text class="halo strong n" x={Math.min(px(LE) + 8, W - 90)} y={MT + 28}>L/E = {sig(LE)}</text>
        <text class="halo" x={ML} y={14}>{t('widget.Oscillation.legendCur', { pair: t('widget.Oscillation.pair.' + pair) })}</text>
        <text class="halo" x={ML} y={28}>{t('widget.Oscillation.legendOther', { pair: t('widget.Oscillation.pair.' + (pair === 'atm' ? 'sol' : 'atm')) })}</text>
      </svg>
      <figcaption>{t('widget.Oscillation.cap')}</figcaption>
    </figure>
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="osc-l"><span>{t('widget.Oscillation.L')}</span><span class="w-val">{sig(L)} <span class="w-unit">km</span></span></label>
        <input id="osc-l" type="range" min="0" max="1" step="0.001" bind:value={tL} aria-valuetext={fmtL(L)} />
      </div>
      <div class="w-ctl">
        <label for="osc-e"><span>{t('widget.Oscillation.E')}</span><span class="w-val">{fmtE(E)}</span></label>
        <input id="osc-e" type="range" min="0" max="1" step="0.001" bind:value={tE} aria-valuetext={fmtE(E)} />
      </div>
      <fieldset>
        <legend>{t('widget.Oscillation.pairLegend')}</legend>
        <label><input type="radio" name="osc-pair" value="atm" bind:group={pair} /> {t('widget.Oscillation.pair.atm')}</label>
        <label><input type="radio" name="osc-pair" value="sol" bind:group={pair} /> {t('widget.Oscillation.pair.sol')}</label>
      </fieldset>
      <div class="w-marks" role="group" aria-label={t('widget.Oscillation.presets')}>
        {#each presets as p}
          <button type="button" onclick={() => apply(p)}>{t('widget.Oscillation.preset.' + p.k)}</button>
        {/each}
      </div>
      <div aria-live="polite" style="display:grid;gap:var(--space-2)">
        <div>
          <div class="w-lab" style="display:flex;justify-content:space-between"><span>{t('widget.Oscillation.survive')}</span><span class="w-val">{pct(1 - P)}</span></div>
          <div class="w-bar" role="presentation"><span style="width:{(1 - P) * 100}%"></span></div>
        </div>
        <div>
          <div class="w-lab" style="display:flex;justify-content:space-between"><span>{t('widget.Oscillation.appear')}</span><span class="w-val">{pct(P)}</span></div>
          <div class="w-bar" role="presentation"><span style="width:{P * 100}%"></span></div>
        </div>
        <dl class="w-read">
          <dt>L/E</dt><dd>{sig(LE)}<span class="w-unit">km/GeV</span></dd>
          <dt>1.27 Δm² L/E</dt><dd>{sig(phase)}<span class="w-unit">rad</span></dd>
        </dl>
      </div>
    </div>
  </div>
  <p class="w-note">{t('widget.Oscillation.note')}</p>
</div>
