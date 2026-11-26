<script lang="ts">
  /*
   * Simulated test beam: N telescope planes (resolution sigma_tel each, 30 mm apart, half upstream and half downstream of the DUT at z = 0).
   * Per event: a straight-line fit through the planes is extrapolated to the DUT; residual = x_DUT,measured - x_predicted.
   *   residual width: sigma_res = sqrt(sigma_DUT^2 + sigma_pred^2)
   *   sigma_pred: fit error at the DUT (about sigma_tel/sqrt(N) for a centred DUT) plus, if switched on, multiple scattering in the
   *   planes (50 um Si each, X0 = 9.37 cm): theta_0 = 13.6 MeV/(p) sqrt(x/X0)(1 + 0.038 ln(x/X0)).
   *   deduced sigma_DUT = sqrt(sigma_res^2 - sigma_pred^2), sigma_pred taken from the 20000-event telescope-only simulation.
   * Efficiency: each event is a hit with probability 99 %; the shown efficiency is hits / events. All data are simulated (seeded).
   */
  import './_widget.css';
  import { scaleLinear } from 'd3';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { simulateTb, planeZ, fitWidth, stdev } from './_physics2';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const n1 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const n0 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 0 });

  let planes = $state(6);
  let sigTel = $state(3);
  let sigDut = $state(8);
  let scatter = $state(true);
  let pBeam = $state(5);
  let nShow = $state(500);
  let playing = $state(false);
  const NMAX = 2000;

  const q = $derived({ planes, sigPlane: sigTel, sigDut, scatter, pBeam });
  const ev = $derived(simulateTb(NMAX, q));
  const ref = $derived(simulateTb(20000, { ...q, sigDut: 0 }, 777));
  const sigPred = $derived(stdev(ref.map((e) => e.pred)));
  const shown = $derived(ev.slice(0, nShow));
  const hits = $derived(shown.filter((e) => e.hit));
  const res = $derived(hits.map((e) => e.res));
  const sigRes = $derived(fitWidth(res));
  const sigDeduced = $derived(Math.sqrt(Math.max(sigRes * sigRes - sigPred * sigPred, 0)));
  const expRes = $derived(Math.sqrt(sigDut * sigDut + sigPred * sigPred));
  const eff = $derived(shown.length ? hits.length / shown.length : 0);

  function play() {
    if (playing) return;
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { nShow = NMAX; return; }
    playing = true;
    nShow = 1;
    const id = setInterval(() => {
      nShow = Math.min(NMAX, Math.round(nShow * 1.12 + 3));
      if (nShow >= NMAX) { clearInterval(id); playing = false; }
    }, 60);
  }
  const logT = $derived(Math.log(nShow) / Math.log(NMAX));

  // histogram
  const HW = 520, HH = 250, L = 40, B = 40, Tp = 12, R = 14;
  const range = $derived(Math.max(4 * expRes, 6));
  const nb = 40;
  const bw = $derived((2 * range) / nb);
  const bins = $derived.by(() => {
    const c = new Array(nb).fill(0);
    for (const r of res) {
      const i = Math.floor((r + range) / bw);
      if (i >= 0 && i < nb) c[i]++;
    }
    return c;
  });
  const gaussAmp = $derived((res.length * bw) / (sigRes * Math.sqrt(2 * Math.PI)));
  const ymax = $derived(Math.max(...bins, gaussAmp * 1.0, 4) * 1.12);
  const x = $derived(scaleLinear().domain([-range, range]).range([L, HW - R]));
  const y = $derived(scaleLinear().domain([0, ymax]).range([HH - B, Tp]));
  const gpath = $derived(
    sigRes > 0
      ? Array.from({ length: 121 }, (_, i) => {
          const v = -range + (i / 120) * 2 * range;
          return `${i ? 'L' : 'M'}${x(v).toFixed(1)} ${y(gaussAmp * Math.exp(-(v * v) / (2 * sigRes * sigRes))).toFixed(1)}`;
        }).join('')
      : ''
  );
  const xt = $derived.by(() => {
    const step = range > 40 ? 20 : range > 20 ? 10 : range > 10 ? 5 : 2;
    const out: number[] = [];
    for (let v = -Math.floor(range / step) * step; v <= range; v += step) out.push(v);
    return out;
  });

  // telescope drawing (z horizontal, transverse offsets exaggerated)
  const TW = 1000, TH = 150;
  const zs = $derived(planeZ(planes));
  const zx = scaleLinear().domain([-110, 110]).range([60, TW - 60]);
  const last = $derived(shown.length ? shown[shown.length - 1] : ev[0]);
  const exag = 7; // px per um
  const cy = TH / 2;
</script>

<div class="w">
  <h3 class="w-title">{t('widget.TestbeamResiduals.title')} <span style="font-weight:400;color:var(--fg-muted)">({t('widget.TestbeamResiduals.simulated')})</span></h3>
  <figure class="w-fig">
    <svg class="w-svg" viewBox="0 0 {TW} {TH}" role="img" aria-label={t('widget.TestbeamResiduals.view')}>
      <line class="guide" x1={zx(-110)} x2={zx(110)} y1={cy} y2={cy} />
      {#each zs as z}
        <rect x={zx(z) - 2} y={cy - 52} width="4" height="104" fill="var(--fg-muted)" />
      {/each}
      <rect x={zx(0) - 4} y={cy - 58} width="8" height="116" fill="var(--accent)" />
      <text class="strong" x={zx(0)} y={cy + 76} text-anchor="middle">DUT</text>
      <text x={zx(zs[0])} y={cy + 76} text-anchor="middle">{t('widget.TestbeamResiduals.telescope')}</text>
      <text x={zx(-110) } y={14}>{t('widget.TestbeamResiduals.beam')} →</text>
      {#if last}
        <line x1={zx(-110)} y1={cy + (last.fitInt + last.fitSlope * -110) * exag * 0.6} x2={zx(110)} y2={cy + (last.fitInt + last.fitSlope * 110) * exag * 0.6} stroke="var(--fg)" stroke-width="1.2" />
        {#each zs as z, i}
          <circle cx={zx(z)} cy={cy + last.hits[i] * exag * 0.6} r="3.2" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.4" />
        {/each}
        <circle cx={zx(0)} cy={cy + (last.fitInt) * exag * 0.6} r="3.2" fill="none" stroke="var(--fg)" stroke-width="1.4" />
        <circle cx={zx(0)} cy={cy + (last.fitInt + last.res) * exag * 0.6} r="4" fill="var(--bg)" stroke="var(--accent)" stroke-width="2" />
      {/if}
    </svg>
    <figcaption>{t('widget.TestbeamResiduals.viewCap')}</figcaption>
  </figure>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {HW} {HH}" role="img" aria-label={t('widget.TestbeamResiduals.hist')}>
        <line class="axis" x1={L} x2={HW - R} y1={HH - B} y2={HH - B} />
        <line class="axis" x1={L} x2={L} y1={Tp} y2={HH - B} />
        {#each xt as v}
          <line class="axis" x1={x(v)} x2={x(v)} y1={HH - B} y2={HH - B + 4} />
          <text class="n" x={x(v)} y={HH - B + 16} text-anchor="middle">{formatNumber(lang, v)}</text>
        {/each}
        <text x={(L + HW - R) / 2} y={HH - 6} text-anchor="middle">{t('widget.TestbeamResiduals.axisX')}</text>
        <text class="halo" x={L + 6} y={Tp + 10}>{t('widget.TestbeamResiduals.axisY')} / {n1(bw)} µm</text>
        {#each bins as c, i}
          {#if c > 0}
            <rect x={x(-range + i * bw) + 0.5} y={y(c)} width={Math.max(x(-range + (i + 1) * bw) - x(-range + i * bw) - 1, 1)} height={y(0) - y(c)} fill="var(--accent)" opacity="0.5" stroke="var(--accent)" />
          {/if}
        {/each}
        <path d={gpath} fill="none" stroke="var(--fg)" stroke-width="1.8" />
      </svg>
      <figcaption>{t('widget.TestbeamResiduals.histCap')}</figcaption>
    </figure>
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="tb-p"><span>{t('widget.TestbeamResiduals.planes')}</span><span class="w-val">{planes}</span></label>
        <input id="tb-p" type="range" min="2" max="8" step="1" bind:value={planes} aria-valuetext="{planes}" />
      </div>
      <div class="w-ctl">
        <label for="tb-t"><span>{t('widget.TestbeamResiduals.sigTel')}</span><span class="w-val">{n1(sigTel)} <span class="w-unit">µm</span></span></label>
        <input id="tb-t" type="range" min="1" max="10" step="0.5" bind:value={sigTel} aria-valuetext="{n1(sigTel)} µm" />
      </div>
      <div class="w-ctl">
        <label for="tb-d"><span>{t('widget.TestbeamResiduals.sigDut')}</span><span class="w-val">{n1(sigDut)} <span class="w-unit">µm</span></span></label>
        <input id="tb-d" type="range" min="1" max="30" step="0.5" bind:value={sigDut} aria-valuetext="{n1(sigDut)} µm" />
      </div>
      <label style="display:inline-flex;gap:var(--space-2);align-items:center"><input type="checkbox" bind:checked={scatter} /> {t('widget.TestbeamResiduals.scatter')}</label>
      {#if scatter}
        <div class="w-ctl">
          <label for="tb-b"><span>{t('widget.TestbeamResiduals.pBeam')}</span><span class="w-val">{n1(pBeam)} <span class="w-unit">GeV/c</span></span></label>
          <input id="tb-b" type="range" min="1" max="10" step="0.5" bind:value={pBeam} aria-valuetext="{n1(pBeam)} GeV/c" />
        </div>
      {/if}
      <div class="w-ctl">
        <label for="tb-n"><span>{t('widget.TestbeamResiduals.events')}</span><span class="w-val">{n0(nShow)}</span></label>
        <input id="tb-n" type="range" min="0" max="1" step="0.001" value={logT} oninput={(e) => (nShow = Math.max(1, Math.round(NMAX ** +e.currentTarget.value)))} aria-valuetext="{n0(nShow)} events" />
        <button type="button" class="tb-btn" onclick={play} disabled={playing}>{t('widget.TestbeamResiduals.play')}</button>
      </div>
      <dl class="w-read" aria-live="polite">
        <dt>σ<sub>res</sub> ({t('widget.TestbeamResiduals.fit')})</dt><dd>{n1(sigRes)}<span class="w-unit">µm</span></dd>
        <dt>σ<sub>pred</sub></dt><dd>{n1(sigPred)}<span class="w-unit">µm</span></dd>
        <dt>{t('widget.TestbeamResiduals.deduced')}</dt><dd>{n1(sigDeduced)}<span class="w-unit">µm</span></dd>
        <dt>{t('widget.TestbeamResiduals.expect')}</dt><dd>{n1(expRes)}<span class="w-unit">µm</span></dd>
        <dt>{t('widget.TestbeamResiduals.eff')}</dt><dd>{formatNumber(lang, eff * 100, { maximumFractionDigits: 1 })}<span class="w-unit">% ({hits.length}/{shown.length})</span></dd>
      </dl>
    </div>
  </div>
  <p class="w-note">{t('widget.TestbeamResiduals.note')}</p>
</div>

<style>
  .tb-btn { font: inherit; font-size: var(--fs-xs); color: var(--fg); background: none; border: 1px solid var(--fg-faint); border-radius: 0; padding: 2px var(--space-3); cursor: pointer; justify-self: start; }
  .tb-btn:hover:not(:disabled) { border-color: var(--accent); }
  .tb-btn:disabled { opacity: 0.5; cursor: default; }
  .tb-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
