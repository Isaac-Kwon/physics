<script lang="ts">
  /*
   * Delayed coincidence, simulated over 4 s of "detector time":
   *   singles: Poisson, 1 kHz, energies ~ exponential (mean ~1.7 MeV, natural radioactivity);
   *   true IBD pairs: 20 Hz (inflated so the statistics are visible), prompt 1-8 MeV, delayed after t ~ Exp(tau = 200 us), delayed energy 2.2 +- 0.15 MeV.
   * A pair is accepted when a delayed-like event follows a prompt-like event within the window dt (and, with the energy cut on, prompt 1-8 MeV, delayed 1.9-2.5 MeV).
   *   signal efficiency  eps = N_true,kept / N_true  ~ (1 - exp(-dt / tau)) x (energy-cut efficiency)
   *   accidental rate    R_acc ~ R_prompt R_delayed dt   (two independent Poisson streams)
   * Simulated, not real data.
   */
  import './_widget.css';
  import './_widget3.css';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber, formatSci } from '../../lib/format';
  import { IBD, countIbd, rng, simulateIbd } from './_physics3';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const sig = (n: number, d = 3) => formatNumber(lang, n, { maximumSignificantDigits: d });
  const pct = (n: number) => formatNumber(lang, n * 100, { maximumFractionDigits: 0 }) + ' %';

  let seed = $state(21);
  const ev = $derived(simulateIbd(rng(seed)));
  const DT0 = 1e-6, DT1 = 1e-3;
  let tw = $state(1);
  let cut = $state(false);
  const dt = $derived(DT0 * (DT1 / DT0) ** tw);
  const fmtDt = (d: number) => (d < 1e-3 ? `${sig(d * 1e6)} µs` : `${sig(d * 1e3)} ms`);

  const cnt = $derived(countIbd(ev, dt, cut));
  const eff = $derived(cnt.trueKept / Math.max(cnt.trueTotal, 1));
  const accHz = $derived(cnt.acc / IBD.T);
  const accTheory = $derived(cnt.rp * cnt.rd * dt);
  const sb = $derived(cnt.trueKept / Math.max(cnt.acc, 1));

  // efficiency vs accidental rate as the window is changed
  const roc = $derived.by(() => {
    const out: { dt: number; eff: number; acc: number }[] = [];
    for (let i = 0; i <= 36; i++) {
      const d = DT0 * (DT1 / DT0) ** (i / 36);
      const c = countIbd(ev, d, cut);
      out.push({ dt: d, eff: c.trueKept / Math.max(c.trueTotal, 1), acc: Math.max(c.acc / IBD.T, 0.05) });
    }
    return out;
  });

  // excerpt containing a true pair
  const first = $derived(ev.findIndex((e, i) => e.kind === 'prompt' && e.t > 0.01 && ev.some((f) => f.kind === 'delayed' && f.pair === e.pair)));
  const t0 = $derived(first >= 0 ? ev[first].t - 1.2e-3 : 0);
  const SPAN = 6e-3;
  const inEx = (e: { t: number }) => e.t >= t0 && e.t <= t0 + SPAN;

  const W = 480, H = 230, ML = 40, MR = 10, MT = 14, MB = 40;
  const sx = (tt: number) => ML + ((tt - t0) / SPAN) * (W - ML - MR);
  const sy = (e: number) => H - MB - (Math.min(e, 8) / 8) * (H - MB - MT);

  const RW = 260, RH = 220, RL = 44, RR = 10, RT = 12, RB = 40;
  const ax0 = 0.1, ax1 = 3e3;
  const rx = (a: number) => RL + ((Math.log10(a) - Math.log10(ax0)) / (Math.log10(ax1) - Math.log10(ax0))) * (RW - RL - RR);
  const ry = (e: number) => RH - RB - e * (RH - RB - RT);
  const rocPath = $derived(roc.map((p, i) => `${i ? 'L' : 'M'}${rx(p.acc).toFixed(1)} ${ry(p.eff).toFixed(1)}`).join(''));
  const exPairs = $derived(cnt.pairs.filter(([i, j]) => inEx(ev[i]) && inEx(ev[j])));
</script>

<div class="w">
  <h3 class="w-title">{t('widget.IbdCoincidence.title')}</h3>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {W} {H}" role="img" aria-label={t('widget.IbdCoincidence.view', { n: exPairs.length })}>
        <line class="axis" x1={ML} x2={W - MR} y1={H - MB} y2={H - MB} />
        <line class="axis" x1={ML} x2={ML} y1={MT} y2={H - MB} />
        {#each [0, 2, 4, 6, 8] as v}
          <line class="axis" x1={ML - 4} x2={ML} y1={sy(v)} y2={sy(v)} />
          <text class="n" x={ML - 7} y={sy(v) + 4} text-anchor="end">{v}</text>
        {/each}
        {#each [0, 1, 2, 3, 4, 5, 6] as v}
          <line class="axis" x1={sx(t0 + v * 1e-3)} x2={sx(t0 + v * 1e-3)} y1={H - MB} y2={H - MB + 4} />
          <text class="n" x={sx(t0 + v * 1e-3)} y={H - MB + 16} text-anchor="middle">{v}</text>
        {/each}
        <text x={(ML + W) / 2} y={H - 6} text-anchor="middle">{t('widget.IbdCoincidence.axisT')}</text>
        <text x={ML + 10} y={MT + 4}>{t('widget.IbdCoincidence.axisE')}</text>
        {#if first >= 0}
          <rect class="band" x={sx(ev[first].t)} y={MT} width={Math.max(1, Math.min(sx(ev[first].t + dt), W - MR) - sx(ev[first].t))} height={H - MB - MT} />
          <text class="halo" x={sx(ev[first].t) + 3} y={MT + 28}>{t('widget.IbdCoincidence.window')}</text>
        {/if}
        {#each ev as e}
          {#if inEx(e)}
            <line class="guide" x1={sx(e.t)} x2={sx(e.t)} y1={H - MB} y2={sy(e.e)} />
            {#if e.kind === 'single'}
              <circle cx={sx(e.t)} cy={sy(e.e)} r="3.2" fill="var(--bg)" stroke="var(--fg-muted)" stroke-width="1.3" />
            {:else}
              <path d="M{sx(e.t)} {sy(e.e) - 5.5}L{sx(e.t) + 5.5} {sy(e.e)}L{sx(e.t)} {sy(e.e) + 5.5}L{sx(e.t) - 5.5} {sy(e.e)}Z" fill="var(--accent)" />
            {/if}
          {/if}
        {/each}
        {#each exPairs as [i, j]}
          {#if ev[i].kind === 'prompt' && ev[j].kind === 'delayed' && ev[i].pair === ev[j].pair}
            <line class="acc" x1={sx(ev[i].t)} y1={sy(ev[i].e)} x2={sx(ev[j].t)} y2={sy(ev[j].e)} stroke-width="2.5" />
          {:else}
            <line class="ink dash" x1={sx(ev[i].t)} y1={sy(ev[i].e)} x2={sx(ev[j].t)} y2={sy(ev[j].e)} />
          {/if}
        {/each}
        <!-- legend -->
        <g transform="translate({W - 150},{MT + 4})">
          <circle cx="5" cy="4" r="3.2" fill="var(--bg)" stroke="var(--fg-muted)" stroke-width="1.3" />
          <text class="halo" x="14" y="8">{t('widget.IbdCoincidence.legSingle')}</text>
          <path d="M5 20L10 25L5 30L0 25Z" fill="var(--accent)" />
          <text class="halo" x="14" y="29">{t('widget.IbdCoincidence.legTrue')}</text>
          <line class="ink dash" x1="0" x2="10" y1="44" y2="44" />
          <text class="halo" x="14" y="48">{t('widget.IbdCoincidence.legAcc')}</text>
        </g>
      </svg>
      <figcaption>{t('widget.IbdCoincidence.cap')}</figcaption>
    </figure>
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {RW} {RH}" role="img" aria-label={t('widget.IbdCoincidence.rocView')}>
        <line class="axis" x1={RL} x2={RW - RR} y1={RH - RB} y2={RH - RB} />
        <line class="axis" x1={RL} x2={RL} y1={RT} y2={RH - RB} />
        {#each [0.1, 1, 10, 100, 1000] as v}
          <line class="axis" x1={rx(v)} x2={rx(v)} y1={RH - RB} y2={RH - RB + 4} />
          <text class="n" x={rx(v)} y={RH - RB + 16} text-anchor="middle">{formatSci(lang, v)}</text>
        {/each}
        {#each [0, 0.5, 1] as v}
          <line class="guide" x1={RL} x2={RW - RR} y1={ry(v)} y2={ry(v)} />
          <text class="n" x={RL - 6} y={ry(v) + 4} text-anchor="end">{formatNumber(lang, v)}</text>
        {/each}
        <text x={(RL + RW) / 2} y={RH - 6} text-anchor="middle">{t('widget.IbdCoincidence.axisAcc')}</text>
        <text x={RL + 6} y={RT + 8}>{t('widget.IbdCoincidence.axisEff')}</text>
        <path d={rocPath} class="acc" />
        <circle cx={rx(Math.max(accHz, 0.05))} cy={ry(eff)} r="5" fill="var(--bg)" stroke="var(--fg)" stroke-width="2" />
        <text class="halo" x={RL + 8} y={ry(0.78)}>{t('widget.IbdCoincidence.rocHint')}</text>
      </svg>
      <figcaption>{t('widget.IbdCoincidence.rocCap')}</figcaption>
    </figure>
  </div>
  <div class="w-body">
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="ibd-w"><span>{t('widget.IbdCoincidence.dt')}</span><span class="w-val">{fmtDt(dt)}</span></label>
        <input id="ibd-w" type="range" min="0" max="1" step="0.005" bind:value={tw} aria-valuetext={fmtDt(dt)} />
      </div>
      <label class="w3-check"><input type="checkbox" bind:checked={cut} /> {t('widget.IbdCoincidence.cut')}</label>
      <div class="w3-row"><button type="button" class="w3-btn" onclick={() => (seed += 1)}>{t('widget.IbdCoincidence.again')}</button></div>
    </div>
    <dl class="w-read" aria-live="polite">
      <dt>{t('widget.IbdCoincidence.kept')}</dt><dd>{cnt.trueKept} / {cnt.trueTotal}</dd>
      <dt>{t('widget.IbdCoincidence.eff')}</dt><dd>{pct(eff)}</dd>
      <dt>{t('widget.IbdCoincidence.acc')}</dt><dd>{cnt.acc}</dd>
      <dt>{t('widget.IbdCoincidence.accRate')}</dt><dd>{sig(accHz)}<span class="w-unit">Hz</span></dd>
      <dt>R<sub>p</sub> R<sub>d</sub> Δt</dt><dd>{sig(accTheory)}<span class="w-unit">Hz</span></dd>
      <dt>{t('widget.IbdCoincidence.sb')}</dt><dd>{sig(sb, 2)}</dd>
    </dl>
  </div>
  <p class="w-note">{t('widget.IbdCoincidence.note')}</p>
</div>
