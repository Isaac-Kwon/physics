<script lang="ts">
  /*
   * Simulated log10(S2/S1) versus S1 (S1 in detected photons, 3-40):
   *   electron recoils (ER): centre 1.2 - 0.0025 S1, sigma 0.15, S1 uniform;   nuclear recoils (NR): centre 0.7 - 0.0025 S1, sigma 0.12, S1 ~ exponential (mean 10 photons).
   *   Cut line y_cut(S1) = level + tilt (S1 - 20): events below it are accepted as "nuclear recoils".
   *   NR acceptance = N(NR below) / N(NR);   ER leakage = N(ER below) / N(ER).  Sample: 60 + 60 events; "model" = Gaussian integral over the populations.
   * Shapes are qualitative; both bands are simulated, not real data.
   */
  import './_widget.css';
  import './_widget3.css';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { ERNR, bandMean, ernrFractions, rng, simulateErNr } from './_physics3';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const n2 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const n3 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 3, minimumFractionDigits: 3 });
  const pc = (n: number) => formatNumber(lang, n * 100, { maximumFractionDigits: n < 0.1 ? 1 : 0, minimumFractionDigits: 0 }) + ' %';

  const LEVEL0 = 0.95;
  let seed = $state(5);
  let level = $state(LEVEL0);
  let tilt = $state(0); // per 10 photons
  const ev = $derived(simulateErNr(rng(seed * 104729)));
  const line = (s: number) => level + (tilt / 10) * (s - 20);
  const below = (e: { s1: number; y: number }) => e.y < line(e.s1);
  const er = $derived(ev.filter((e) => !e.nr));
  const nr = $derived(ev.filter((e) => e.nr));
  const kEr = $derived(er.filter(below).length);
  const kNr = $derived(nr.filter(below).length);
  const pop = $derived(ernrFractions(level, tilt / 10));

  const W = 480, H = 300, ML = 46, MR = 12, MT = 12, MB = 42;
  const XM = 45, Y0 = 0.2, Y1 = 1.8;
  const px = (s: number) => ML + (s / XM) * (W - ML - MR);
  const py = (y: number) => H - MB - ((y - Y0) / (Y1 - Y0)) * (H - MB - MT);
  const tri = (x: number, y: number) => `M${x} ${y - 4.8}L${x + 4.5} ${y + 3.4}L${x - 4.5} ${y + 3.4}Z`;
  const clampY = (y: number) => Math.min(Math.max(y, Y0), Y1);
  const reset = () => { level = LEVEL0; tilt = 0; };
</script>

<div class="w">
  <h3 class="w-title">{t('widget.ErNrClassifier.title')}</h3>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {W} {H}" role="img" aria-label={t('widget.ErNrClassifier.view', { k: kNr, n: nr.length, l: kEr, m: er.length })}>
        <line class="axis" x1={ML} x2={W - MR} y1={H - MB} y2={H - MB} />
        <line class="axis" x1={ML} x2={ML} y1={MT} y2={H - MB} />
        {#each [0, 10, 20, 30, 40] as v}
          <line class="axis" x1={px(v)} x2={px(v)} y1={H - MB} y2={H - MB + 4} />
          <text class="n" x={px(v)} y={H - MB + 16} text-anchor="middle">{v}</text>
        {/each}
        {#each [0.5, 1, 1.5] as v}
          <line class="guide" x1={ML} x2={W - MR} y1={py(v)} y2={py(v)} />
          <text class="n" x={ML - 6} y={py(v) + 4} text-anchor="end">{formatNumber(lang, v, { minimumFractionDigits: 1 })}</text>
        {/each}
        <text x={(ML + W) / 2} y={H - 6} text-anchor="middle">{t('widget.ErNrClassifier.axisX')}</text>
        <text x={ML + 6} y={MT + 8}>{t('widget.ErNrClassifier.axisY')}</text>
        <!-- accepted region -->
        <path d="M{px(0)} {py(clampY(line(0)))}L{px(XM)} {py(clampY(line(XM)))}L{px(XM)} {py(Y0)}L{px(0)} {py(Y0)}Z" class="band" />
        <!-- band centres -->
        <line class="guide dash" x1={px(ERNR.s1Min)} x2={px(ERNR.s1Max)} y1={py(bandMean(ERNR.er, ERNR.s1Min))} y2={py(bandMean(ERNR.er, ERNR.s1Max))} />
        <line class="guide dash" x1={px(ERNR.s1Min)} x2={px(ERNR.s1Max)} y1={py(bandMean(ERNR.nr, ERNR.s1Min))} y2={py(bandMean(ERNR.nr, ERNR.s1Max))} />
        {#each ev as e}
          {#if e.nr}
            <path d={tri(px(e.s1), py(e.y))} fill={below(e) ? 'var(--accent)' : 'var(--bg)'} stroke="var(--accent)" stroke-width="1.4" />
          {:else}
            <circle cx={px(e.s1)} cy={py(e.y)} r="3.4" fill={below(e) ? 'var(--fg)' : 'var(--bg)'} stroke="var(--fg-muted)" stroke-width="1.4" />
          {/if}
        {/each}
        <line class="ink" x1={px(0)} x2={px(XM)} y1={py(line(0))} y2={py(line(XM))} stroke-width="2" />
        <text class="halo strong" x={px(ERNR.s1Max) - 2} y={py(1.64)} text-anchor="end">{t('widget.ErNrClassifier.er')}</text>
        <text class="halo strong" x={px(ERNR.s1Max) - 2} y={py(0.27)} text-anchor="end">{t('widget.ErNrClassifier.nr')}</text>
        <text class="halo" x={px(0.5)} y={py(0.27)}>{t('widget.ErNrClassifier.region')}</text>
        <text class="halo" x={W - MR} y={MT + 8} text-anchor="end">{t('widget.ErNrClassifier.sim')}</text>
      </svg>
      <figcaption>{t('widget.ErNrClassifier.cap')}</figcaption>
    </figure>
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="en-l"><span>{t('widget.ErNrClassifier.level')}</span><span class="w-val">{n2(level)}</span></label>
        <input id="en-l" type="range" min="0.3" max="1.5" step="0.01" bind:value={level} aria-valuetext={n2(level)} />
      </div>
      <div class="w-ctl">
        <label for="en-t"><span>{t('widget.ErNrClassifier.tilt')}</span><span class="w-val">{n3(tilt)}</span></label>
        <input id="en-t" type="range" min="-0.1" max="0.1" step="0.005" bind:value={tilt} aria-valuetext={n3(tilt)} />
      </div>
      <div class="w3-row">
        <button type="button" class="w3-btn" onclick={reset}>{t('widget.ErNrClassifier.reset')}</button>
        <button type="button" class="w3-btn" onclick={() => (seed += 1)}>{t('widget.ErNrClassifier.newEvents')}</button>
      </div>
      <dl class="w-read" aria-live="polite">
        <dt>{t('widget.ErNrClassifier.leak')}</dt><dd>{pc(kEr / er.length)} ({kEr}/{er.length})</dd>
        <dt>{t('widget.ErNrClassifier.acc')}</dt><dd>{pc(kNr / nr.length)} ({kNr}/{nr.length})</dd>
        <dt>{t('widget.ErNrClassifier.leakModel')}</dt><dd>{pc(pop.leak)}</dd>
        <dt>{t('widget.ErNrClassifier.accModel')}</dt><dd>{pc(pop.acc)}</dd>
      </dl>
      <p class="w-note" style="color:var(--fg)" aria-live="polite">{t('widget.ErNrClassifier.sentence', { leak: pc(kEr / er.length), acc: pc(kNr / nr.length) })}</p>
    </div>
  </div>
  <p class="w-note">{t('widget.ErNrClassifier.note')}</p>
</div>
