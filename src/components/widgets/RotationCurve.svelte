<script lang="ts">
  /*
   * Same model functions as the dm.rotation scene (both import them from ./_physics3.ts).
   *   Disc (exponential, scale length a, spherical approximation for the enclosed mass):
   *       M_d(r) = M_d [1 - e^(-r/a) (1 + r/a)],   v_d^2 = G M_d(r) / r
   *   Halo (pseudo-isothermal, core radius r_c = 5 kpc), parametrised by v_flat^2 = 4 pi G rho_0 r_c^2:
   *       M_h(r) = (v_flat^2 / G) [r - r_c arctan(r / r_c)],   v_h^2 = v_flat^2 [1 - (r_c / r) arctan(r / r_c)]
   *   Total: v^2 = v_d^2 + v_h^2.   G = 4.301e-6 kpc (km/s)^2 / M_sun.
   * Schematic model, not data. The shaded band is +-10 % around the total speed at 10 kpc ("flat").
   */
  import './_widget.css';
  import './_widget3.css';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber, formatSci } from '../../lib/format';
  import { ROT, discMass, haloMass, vDisc, vHalo, vTotal } from './_physics3';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const sig = (n: number, d = 3) => formatNumber(lang, n, { maximumSignificantDigits: d });
  const f0 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 0 });
  const f1 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  let md = $state(ROT.MdDefault / 1e10); // 1e10 Msun
  let vf = $state(ROT.vFlatDefault);
  let a = $state(ROT.aKpc);
  const Md = $derived(md * 1e10);

  const W = 480, H = 300, ML = 46, MR = 76, MT = 12, MB = 42;
  const YM = 400;
  const px = (r: number) => ML + (r / ROT.rMax) * (W - ML - MR);
  const py = (v: number) => H - MB - (v / YM) * (H - MB - MT);
  const N = 120;
  const curve = (f: (r: number) => number) => Array.from({ length: N }, (_, i) => { const r = ((i + 1) / N) * ROT.rMax; return `${i ? 'L' : 'M'}${px(r).toFixed(1)} ${py(f(r)).toFixed(1)}`; }).join('');
  const dDisc = $derived(curve((r) => vDisc(r, Md, a)));
  const dHalo = $derived(curve((r) => vHalo(r, vf)));
  const dTot = $derived(curve((r) => vTotal(r, Md, vf, a)));
  const v10 = $derived(vTotal(10, Md, vf, a));
  const v25 = $derived(vTotal(25, Md, vf, a));
  const ratio = $derived(haloMass(25, vf) / discMass(25, Md, a));
  const bandLo = $derived(0.9 * v10);
  const bandHi = $derived(1.1 * v10);
  // end-of-curve labels, nudged apart so they never overlap
  const labels = $derived.by(() => {
    const ends = [
      { k: 'lDisc', y: py(vDisc(ROT.rMax, Md, a)) },
      { k: 'lHalo', y: py(vHalo(ROT.rMax, vf)) },
      { k: 'lTotal', y: py(vTotal(ROT.rMax, Md, vf, a)) },
    ].sort((p, q) => p.y - q.y);
    for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 14);
    return ends;
  });
  const noHalo = $derived(vf < 5);
  const falls = $derived(v25 < 0.9 * v10);
  const reset = () => { md = ROT.MdDefault / 1e10; vf = ROT.vFlatDefault; a = ROT.aKpc; };
</script>

<div class="w">
  <h3 class="w-title">{t('widget.RotationCurve.title')}</h3>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {W} {H}" role="img" aria-label={t('widget.RotationCurve.view')}>
        <line class="axis" x1={ML} x2={W - MR} y1={H - MB} y2={H - MB} />
        <line class="axis" x1={ML} x2={ML} y1={MT} y2={H - MB} />
        {#each [0, 10, 20, 30] as r}
          <line class="axis" x1={px(r)} x2={px(r)} y1={H - MB} y2={H - MB + 4} />
          <text class="n" x={px(r)} y={H - MB + 16} text-anchor="middle">{r}</text>
        {/each}
        {#each [0, 100, 200, 300, 400] as v}
          <line class="guide" x1={ML} x2={W - MR} y1={py(v)} y2={py(v)} />
          <text class="n" x={ML - 6} y={py(v) + 4} text-anchor="end">{v}</text>
        {/each}
        <text x={(ML + W) / 2} y={H - 6} text-anchor="middle">{t('widget.RotationCurve.axisX')}</text>
        <text x={ML + 6} y={MT + 8}>{t('widget.RotationCurve.axisY')}</text>
        <rect class="band" x={px(10)} y={py(bandHi)} width={px(ROT.rMax) - px(10)} height={py(bandLo) - py(bandHi)} />
        <text class="halo" x={px(ROT.rMax)} y={py(bandHi) - 5} text-anchor="end">{t('widget.RotationCurve.flat')}</text>
        <path d={dDisc} class="ink dash" />
        <path d={dHalo} class="ink dot" style="stroke-width:2" />
        <path d={dTot} class="acc" stroke-width="2.4" />
        {#each labels as l}
          <text class="halo strong" x={px(ROT.rMax) + 6} y={l.y + 4}>{t('widget.RotationCurve.' + l.k)}</text>
        {/each}
        <circle cx={px(10)} cy={py(v10)} r="3.5" fill="var(--fg)" />
        <circle cx={px(25)} cy={py(v25)} r="3.5" fill="var(--fg)" />
      </svg>
      <figcaption>{t('widget.RotationCurve.cap')}</figcaption>
    </figure>
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="rot-m"><span>{t('widget.RotationCurve.md')}</span><span class="w-val">{f1(md)} × 10¹⁰ <span class="w-unit">M☉</span></span></label>
        <input id="rot-m" type="range" min="1" max="10" step="0.1" bind:value={md} aria-valuetext="{f1(md)} × 10¹⁰ M☉" />
      </div>
      <div class="w-ctl">
        <label for="rot-v"><span>{t('widget.RotationCurve.vflat')}</span><span class="w-val">{f0(vf)} <span class="w-unit">km/s</span></span></label>
        <input id="rot-v" type="range" min="0" max="300" step="5" bind:value={vf} aria-valuetext="{f0(vf)} km/s" />
      </div>
      <div class="w-ctl">
        <label for="rot-a"><span>{t('widget.RotationCurve.a')}</span><span class="w-val">{f1(a)} <span class="w-unit">kpc</span></span></label>
        <input id="rot-a" type="range" min="1.5" max="6" step="0.1" bind:value={a} aria-valuetext="{f1(a)} kpc" />
      </div>
      <div class="w3-row"><button type="button" class="w3-btn" onclick={reset}>{t('widget.RotationCurve.reset')}</button></div>
      <dl class="w-read" aria-live="polite">
        <dt>{t('widget.RotationCurve.v10')}</dt><dd>{f0(v10)}<span class="w-unit">km/s</span></dd>
        <dt>{t('widget.RotationCurve.v25')}</dt><dd>{f0(v25)}<span class="w-unit">km/s</span></dd>
        <dt>{t('widget.RotationCurve.mratio')}</dt><dd>{sig(ratio, 2)}<span class="w-unit">{t('widget.RotationCurve.model')}</span></dd>
      </dl>
      <p class="w-note" style="color:var(--fg)" aria-live="polite">{noHalo ? t('widget.RotationCurve.noHalo') : falls ? t('widget.RotationCurve.falls') : t('widget.RotationCurve.flatMsg')}</p>
    </div>
  </div>
  <p class="w-note">{t('widget.RotationCurve.note')}</p>
</div>
