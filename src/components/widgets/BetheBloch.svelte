<script lang="ts">
  /*
   * Schematic, simplified Bethe-Bloch, z = 1, schematic density effect (see _physics.ts):
   *   -dE/dx ~ (1/beta^2) [ ln(2 m_e c^2 beta^2 gamma^2 / I) - beta^2 ],  I = 188 eV,
   * normalised so a MIP (beta gamma = 3.5) = 1. Momentum axis 0.1 - 10 GeV/c (log).
   * mode="pid": also shows a particle selector with beta and the time-of-flight delay over 4 m.
   */
  import './_widget.css';
  import { scaleLog } from 'd3';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { SPECIES, betaOf, dEdx } from './_physics';

  let { lang = 'en', mode = 'general' }: { lang?: Lang; mode?: string } = $props();
  const t = useT(lang);
  const pid = $derived(mode === 'pid');
  const sig = (n: number, d = 3) => formatNumber(lang, n, { maximumSignificantDigits: d });
  const f2 = (n: number) => formatNumber(lang, n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let tp = $state(0.55); // slider position 0..1 on log axis
  let sel = $state('p');
  const P0 = 0.1, P1 = 10;
  const p = $derived(P0 * (P1 / P0) ** tp);

  const W = 520, H = 340, L = 46, B = 40, Tp = 10, Rt = 70;
  const x = scaleLog().domain([P0, P1]).range([L, W - Rt]);
  const y = scaleLog().domain([0.7, 150]).range([H - B, Tp]);
  const grid = Array.from({ length: 121 }, (_, i) => P0 * (P1 / P0) ** (i / 120));
  const curves = SPECIES.map((s) => ({ ...s, d: grid.map((q, i) => `${i ? 'L' : 'M'}${x(q).toFixed(1)} ${y(dEdx(q, s.m)).toFixed(1)}`).join('') }));
  // end labels, de-overlapped (min 13 px apart)
  const endLabels = (() => {
    const a = SPECIES.map((s) => ({ id: s.id, sym: s.sym, y: y(dEdx(P1, s.m)) })).sort((u, v) => u.y - v.y);
    for (let i = 1; i < a.length; i++) if (a[i].y - a[i - 1].y < 13) a[i].y = a[i - 1].y + 13;
    return a;
  })();

  const vals = $derived(SPECIES.map((s) => ({ ...s, v: dEdx(p, s.m), beta: betaOf(p, s.m) })));
  const dotLabels = $derived.by(() => {
    const a = vals.map((v) => ({ sym: v.sym, y: y(v.v) })).sort((u, v) => u.y - v.y);
    for (let i = 1; i < a.length; i++) if (a[i].y - a[i - 1].y < 12) a[i].y = a[i - 1].y + 12;
    return a;
  });
  const close = $derived.by(() => {
    const out: string[] = [];
    for (let i = 0; i < vals.length; i++)
      for (let j = i + 1; j < vals.length; j++) if (Math.abs(Math.log(vals[i].v / vals[j].v)) < 0.1) out.push(`${vals[i].sym}/${vals[j].sym}`);
    return out;
  });
  const cur = $derived(vals.find((v) => v.id === sel)!);
  const tof = $derived((4 / 0.299792458) * (1 / cur.beta - 1)); // ns over 4 m
  const ticks = [0.1, 0.2, 0.5, 1, 2, 5, 10];
  const yticks = [1, 2, 5, 10, 20, 50, 100];
</script>

<div class="w">
  <h3 class="w-title">{t('widget.BetheBloch.title')}</h3>
  <div class="w-ctl">
    <label for="bb-p"><span>{t('widget.BetheBloch.slider')}</span><span class="w-val">{sig(p)} <span class="w-unit">GeV/c</span></span></label>
    <input id="bb-p" type="range" min="0" max="1" step="0.001" bind:value={tp} aria-valuetext="{sig(p)} GeV/c" />
  </div>
  {#if pid}
    <fieldset>
      <legend>{t('widget.BetheBloch.species')}</legend>
      {#each SPECIES as s}
        <label><input type="radio" name="bb-sp" value={s.id} bind:group={sel} /> {s.sym} ({t('widget.BetheBloch.name.' + s.id)})</label>
      {/each}
    </fieldset>
  {/if}
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {W} {H}" role="img" aria-label={t('widget.BetheBloch.view')}>
        <line class="axis" x1={L} x2={W - Rt} y1={H - B} y2={H - B} />
        <line class="axis" x1={L} x2={L} y1={Tp} y2={H - B} />
        {#each ticks as v}
          <line class="axis" x1={x(v)} x2={x(v)} y1={H - B} y2={H - B + 4} />
          <text class="n" x={x(v)} y={H - B + 16} text-anchor="middle">{formatNumber(lang, v)}</text>
        {/each}
        {#each yticks as v}
          <line class="guide" x1={L} x2={W - Rt} y1={y(v)} y2={y(v)} />
          <text class="n" x={L - 6} y={y(v) + 4} text-anchor="end">{v}</text>
        {/each}
        <text x={(L + W - Rt) / 2} y={H - 6} text-anchor="middle">{t('widget.BetheBloch.axisX')}</text>
        <text class="halo" x={L + 4} y={Tp + 10}>{t('widget.BetheBloch.axisY')}</text>

        {#each curves as c}
          <path d={c.d} fill="none" stroke={pid && sel === c.id ? 'var(--accent)' : 'var(--fg)'} stroke-width={pid && sel === c.id ? 2.5 : 1.4} stroke-dasharray={c.dash} />
        {/each}
        {#each endLabels as l}
          <text class="strong" x={W - Rt + 6} y={l.y + 4} font-weight={pid && sel === l.id ? 700 : 400}>{l.sym}</text>
        {/each}

        <line x1={x(p)} x2={x(p)} y1={Tp} y2={H - B} stroke="var(--accent)" stroke-width="1" />
        {#each vals as v}
          <circle cx={x(p)} cy={y(v.v)} r={pid && sel === v.id ? 5 : 3.5} fill={pid && sel === v.id ? 'var(--accent)' : 'var(--bg)'} stroke="var(--fg)" stroke-width="1.3" />
        {/each}
        {#each dotLabels as l}
          <text x={x(p) + 9} y={l.y + 4} class="strong halo">{l.sym}</text>
        {/each}
      </svg>
      <figcaption>{t('widget.BetheBloch.view')}</figcaption>
    </figure>
    <div aria-live="polite" style="display:grid;gap:var(--space-3)">
      <table>
        <thead><tr><th>{t('widget.BetheBloch.particle')}</th><th style="text-align:right">{t('widget.BetheBloch.dedx')}</th>{#if pid}<th style="text-align:right">{t('widget.BetheBloch.beta')}</th>{/if}</tr></thead>
        <tbody>
          {#each vals as v}
            <tr style={pid && sel === v.id ? 'font-weight:650' : ''}>
              <td>{v.sym} ({t('widget.BetheBloch.name.' + v.id)})</td><td class="num">{f2(v.v)}</td>{#if pid}<td class="num">{sig(v.beta, 4)}</td>{/if}
            </tr>
          {/each}
        </tbody>
      </table>
      {#if pid}
        <dl class="w-read"><dt>{t('widget.BetheBloch.tof')} ({cur.sym})</dt><dd>{sig(tof, 3)}<span class="w-unit">ns</span></dd></dl>
      {/if}
      <p class="w-note" style="color:var(--fg)">{close.length ? t('widget.BetheBloch.close', { pairs: close.join(', ') }) : t('widget.BetheBloch.separated')}</p>
    </div>
  </div>
  <p class="w-note">{t('widget.BetheBloch.note')}</p>
</div>
