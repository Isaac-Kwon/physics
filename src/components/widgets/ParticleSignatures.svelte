<script lang="ts">
  /*
   * Qualitative per-layer signatures in the detector "onion" (end view): tracker, ECAL, HCAL, muon system.
   *   e, gamma:   ECAL fraction ~1 (EM shower), leak into HCAL = remainder;   e leaves a track, gamma does not.
   *   mu:         track, MIP-like deposits in both calorimeters (~0.3 GeV ECAL, ~2 GeV HCAL), hits in the muon system.
   *   pi+-, n:    ECAL fraction f ~ 0.3 (shower starts early), HCAL 1 - f; pi has a track, n has none.
   *   nu:         nothing visible; missing transverse momentum only.
   * Fluctuation of the fractions ~ 1/sqrt(E) (fixed seeded draws per particle, so the display is stable). Not quantitative.
   */
  import './_widget.css';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';

  let { lang = 'en', mode = 'explore' }: { lang?: Lang; mode?: string } = $props();
  const t = useT(lang);
  const f0 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 0 });
  const sig = (n: number) => formatNumber(lang, n, { maximumSignificantDigits: 3 });

  const IDS = ['e', 'g', 'mu', 'pi', 'n', 'nu'] as const;
  type Id = (typeof IDS)[number];
  const SYM: Record<Id, string> = { e: 'e⁻', g: 'γ', mu: 'μ⁻', pi: 'π±', n: 'n', nu: 'ν' };
  const ZJIT: Record<Id, number> = { e: 0.7, g: -0.5, mu: 0, pi: 0.9, n: -1.1, nu: 0 };
  const PARTNER: Record<Id, Id> = { e: 'g', g: 'e', mu: 'pi', pi: 'mu', n: 'nu', nu: 'n' };

  let quiz = $state(mode === 'quiz');
  let id = $state<Id>('pi');
  let te = $state(0.5);
  const E = $derived(1 * 100 ** te);
  const cur = $derived(quiz ? target : id);

  // quiz state
  let target = $state<Id>('pi');
  let choices = $state<Id[]>(['pi', 'mu', 'n', 'e']);
  let answer = $state<Id | null>(null);
  let asked = $state(0);
  let right = $state(0);
  function nextQ() {
    const pick = IDS[Math.floor(Math.random() * IDS.length)];
    const others = IDS.filter((x) => x !== pick && x !== PARTNER[pick]).sort(() => Math.random() - 0.5).slice(0, 2);
    target = pick;
    choices = [pick, PARTNER[pick], ...others].sort(() => Math.random() - 0.5);
    te = Math.random();
    answer = null;
  }
  function setQuiz(v: boolean) {
    quiz = v;
    if (v) nextQ();
  }
  $effect(() => {
    if (mode === 'quiz') nextQ();
  });
  function pickAnswer(c: Id) {
    if (answer) return;
    answer = c;
    asked++;
    if (c === target) right++;
  }

  const MIP_E = 0.3, MIP_H = 2;
  const sg = $derived.by(() => {
    const z = ZJIT[cur] / Math.sqrt(E);
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    let track = false, ecal = 0, hcal = 0, mu = false, miss = false, kind = 'none' as 'none' | 'em' | 'mip' | 'had';
    if (cur === 'e' || cur === 'g') {
      track = cur === 'e';
      ecal = clamp(1 - 0.12 * Math.abs(z) * 3, 0.9, 1);
      hcal = 1 - ecal;
      kind = 'em';
    } else if (cur === 'mu') {
      track = true;
      mu = true;
      kind = 'mip';
    } else if (cur === 'pi' || cur === 'n') {
      track = cur === 'pi';
      ecal = clamp(0.3 + 0.4 * z, 0.05, 0.7);
      hcal = 1 - ecal;
      kind = 'had';
    } else miss = true;
    const gevE = kind === 'mip' ? MIP_E : ecal * E;
    const gevH = kind === 'mip' ? MIP_H : hcal * E;
    return { track, ecal, hcal, mu, miss, kind, gevE, gevH };
  });

  // geometry, centre (200,200); radii: tracker 22-72, ECAL 74-98, HCAL 100-140, muon 148-190
  const C = 200;
  const RING = { trk: [22, 72], ecal: [74, 98], hcal: [100, 140], mu: [148, 190] } as const;
  const A = -48 * (Math.PI / 180); // ray direction (up and right)
  const dA = 15 * (Math.PI / 180);
  const pol = (r: number, a: number) => `${(C + r * Math.cos(a)).toFixed(1)},${(C + r * Math.sin(a)).toFixed(1)}`;
  const wedge = (r0: number, r1: number, w = dA) =>
    `M${pol(r0, A - w)}L${pol(r1, A - w)}A${r1},${r1} 0 0 1 ${pol(r1, A + w)}L${pol(r0, A + w)}A${r0},${r0} 0 0 0 ${pol(r0, A - w)}Z`;
  const ring = (r0: number, r1: number) => `M${C + r1},${C}A${r1},${r1} 0 1 1 ${C - r1},${C}A${r1},${r1} 0 1 1 ${C + r1},${C}M${C + r0},${C}A${r0},${r0} 0 1 0 ${C - r0},${C}A${r0},${r0} 0 1 0 ${C + r0},${C}Z`;
  const trackPath = $derived.by(() => {
    const out: string[] = [];
    const bend = cur === 'e' ? -0.05 : cur === 'pi' ? 0.05 : 0.02; // schematic curvature (sign shows opposite charge)
    for (let i = 0; i <= 30; i++) {
      const r = (i / 30) * (cur === 'mu' ? 190 : cur === 'e' || cur === 'pi' ? 98 : 72);
      out.push(`${i ? 'L' : 'M'}${pol(r, A + bend * (r / 72) * (r / 72))}`);
    }
    return out.join('');
  });
  const trackHits = [30, 44, 58, 70];
  const muHits = [158, 170, 182];
  const layerRows = $derived([
    { key: 'trk', name: t('widget.ParticleSignatures.layer.trk'), sig: sg.track ? t('widget.ParticleSignatures.sig.track') : t('widget.ParticleSignatures.sig.notrack'), dep: '' },
    {
      key: 'ecal',
      name: t('widget.ParticleSignatures.layer.ecal'),
      sig: sg.kind === 'em' ? t('widget.ParticleSignatures.sig.em') : sg.kind === 'mip' ? t('widget.ParticleSignatures.sig.mip') : sg.kind === 'had' ? t('widget.ParticleSignatures.sig.hadEarly') : t('widget.ParticleSignatures.sig.none'),
      dep: sg.kind === 'none' ? '' : sg.kind === 'mip' ? `≈ ${sig(sg.gevE)} GeV` : `${f0(sg.ecal * 100)} % · ${sig(sg.gevE)} GeV`,
    },
    {
      key: 'hcal',
      name: t('widget.ParticleSignatures.layer.hcal'),
      sig: sg.kind === 'had' ? t('widget.ParticleSignatures.sig.had') : sg.kind === 'mip' ? t('widget.ParticleSignatures.sig.mip') : sg.kind === 'em' ? t('widget.ParticleSignatures.sig.leak') : t('widget.ParticleSignatures.sig.none'),
      dep: sg.kind === 'none' ? '' : sg.kind === 'mip' ? `≈ ${sig(sg.gevH)} GeV` : `${f0(sg.hcal * 100)} % · ${sig(sg.gevH)} GeV`,
    },
    { key: 'mu', name: t('widget.ParticleSignatures.layer.mu'), sig: sg.mu ? t('widget.ParticleSignatures.sig.muhits') : t('widget.ParticleSignatures.sig.none'), dep: '' },
    { key: 'miss', name: t('widget.ParticleSignatures.layer.miss'), sig: sg.miss ? t('widget.ParticleSignatures.sig.miss') : t('widget.ParticleSignatures.sig.none'), dep: '' },
  ]);
  const lit = $derived(layerRows.filter((r) => r.key === 'trk' ? sg.track : r.key === 'ecal' ? sg.ecal > 0.03 || sg.kind === 'mip' : r.key === 'hcal' ? sg.hcal > 0.03 || sg.kind === 'mip' : r.key === 'mu' ? sg.mu : sg.miss));
  const ariaView = $derived(
    t('widget.ParticleSignatures.view') + ' ' + (quiz ? '' : SYM[cur] + ': ') + lit.map((l) => l.name).join(', ')
  );
</script>

<div class="w">
  <h3 class="w-title">{t('widget.ParticleSignatures.title')}</h3>
  <div class="w-marks" style="gap:var(--space-4)">
    <fieldset>
      <legend>{t('widget.ParticleSignatures.modeLabel')}</legend>
      <label><input type="radio" name="ps-mode" checked={!quiz} onchange={() => setQuiz(false)} /> {t('widget.ParticleSignatures.explore')}</label>
      <label><input type="radio" name="ps-mode" checked={quiz} onchange={() => setQuiz(true)} /> {t('widget.ParticleSignatures.quiz')}</label>
    </fieldset>
  </div>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 400 400" role="img" aria-label={ariaView}>
        <defs>
          <pattern id="ps-hat" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--fg)" stroke-width="1.2" />
          </pattern>
          <marker id="ps-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0L10,5L0,10" fill="none" stroke="var(--fg)" stroke-width="1.6" /></marker>
        </defs>
        {#each [['trk', RING.trk], ['ecal', RING.ecal], ['hcal', RING.hcal], ['mu', RING.mu]] as [k, r]}
          <path d={ring(r[0], r[1])} fill-rule="evenodd" fill={k === 'hcal' ? 'var(--bg-sunken)' : 'none'} stroke="var(--fg)" stroke-width="1.2" />
        {/each}
        <circle cx={C} cy={C} r="8" fill="none" stroke="var(--fg-muted)" />
        <!-- layer labels at the bottom of each ring -->
        <text class="strong halo" x={C} y={C + 52} text-anchor="middle">{t('widget.ParticleSignatures.layer.trk')}</text>
        <text class="strong halo" x={C} y={C + 90} text-anchor="middle" style="font-size:11px">ECAL</text>
        <text class="strong halo" x={C} y={C + 124} text-anchor="middle">HCAL</text>
        <text class="strong halo" x={C} y={C + 172} text-anchor="middle">{t('widget.ParticleSignatures.layer.mu')}</text>
        <!-- deposits -->
        {#if sg.ecal > 0.03 || sg.kind === 'mip'}
          <path d={wedge(RING.ecal[0], RING.ecal[1])} fill="var(--accent)" opacity={sg.kind === 'mip' ? 0.25 : 0.25 + 0.65 * sg.ecal} stroke="var(--accent)" />
        {/if}
        {#if sg.hcal > 0.03 || sg.kind === 'mip'}
          <path d={wedge(RING.hcal[0], RING.hcal[1])} fill="var(--accent)" opacity={sg.kind === 'mip' ? 0.25 : 0.25 + 0.65 * sg.hcal} stroke="var(--accent)" />
          <path d={wedge(RING.hcal[0], RING.hcal[1])} fill="url(#ps-hat)" opacity={sg.kind === 'mip' ? 0.15 : 0.35 * sg.hcal} />
        {/if}
        {#if sg.mu}
          {#each muHits as r}
            <rect x={C + r * Math.cos(A) - 4} y={C + r * Math.sin(A) - 4} width="8" height="8" fill="var(--accent)" stroke="var(--fg)" />
          {/each}
        {/if}
        <!-- ray -->
        {#if sg.track}
          <path d={trackPath} fill="none" stroke="var(--accent)" stroke-width="2.2" />
          {#each trackHits as r}
            <circle cx={C + r * Math.cos(A)} cy={C + r * Math.sin(A)} r="2.6" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.2" />
          {/each}
        {:else if !sg.miss}
          <path d={trackPath} fill="none" stroke="var(--fg-muted)" stroke-width="1.2" stroke-dasharray="3 4" />
        {/if}
        {#if sg.miss}
          <line x1={C + 30 * Math.cos(A)} y1={C + 30 * Math.sin(A)} x2={C + 192 * Math.cos(A)} y2={C + 192 * Math.sin(A)} stroke="var(--fg)" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#ps-arr)" />
          <text class="strong halo" x={C + 112 * Math.cos(A) + 10} y={C + 112 * Math.sin(A) - 4}>{t('widget.ParticleSignatures.missShort')}</text>
        {/if}
        <circle cx={C} cy={C} r="3.5" fill="var(--fg)" />
      </svg>
      <figcaption>{t('widget.ParticleSignatures.cap')}</figcaption>
    </figure>
    <div style="display:grid;gap:var(--space-4)">
      {#if !quiz}
        <fieldset>
          <legend>{t('widget.ParticleSignatures.particle')}</legend>
          {#each IDS as p}
            <label><input type="radio" name="ps-p" value={p} bind:group={id} /> {SYM[p]} ({t('widget.ParticleSignatures.name.' + p)})</label>
          {/each}
        </fieldset>
        <div class="w-ctl">
          <label for="ps-e"><span>{t('widget.ParticleSignatures.energy')}</span><span class="w-val">{sig(E)} <span class="w-unit">GeV</span></span></label>
          <input id="ps-e" type="range" min="0" max="1" step="0.001" bind:value={te} aria-valuetext="{sig(E)} GeV" />
        </div>
      {:else}
        <fieldset aria-describedby="ps-q">
          <legend id="ps-q">{t('widget.ParticleSignatures.question')}</legend>
          <div class="ps-choices">
            {#each choices as c}
              <button type="button" class="ps-btn" class:ok={answer && c === target} class:bad={answer === c && c !== target} disabled={!!answer} onclick={() => pickAnswer(c)}>
                {SYM[c]} {t('widget.ParticleSignatures.name.' + c)}{answer && c === target ? ' ✓' : answer === c ? ' ✗' : ''}
              </button>
            {/each}
          </div>
        </fieldset>
        <div aria-live="polite" style="display:grid;gap:var(--space-2)">
          {#if answer}
            <p class="w-note" style="color:var(--fg)">
              <strong>{answer === target ? t('widget.ParticleSignatures.right') : t('widget.ParticleSignatures.wrong', { name: t('widget.ParticleSignatures.name.' + target) })}</strong>
              {t('widget.ParticleSignatures.why.' + target)}
            </p>
            <button type="button" class="ps-btn" onclick={nextQ}>{t('widget.ParticleSignatures.next')}</button>
          {/if}
          <p class="w-note">{t('widget.ParticleSignatures.score', { right, asked })}</p>
        </div>
      {/if}
      <table aria-live="polite">
        <caption class="w-note" style="text-align:left;caption-side:top;padding-bottom:4px">{quiz ? t('widget.ParticleSignatures.hidden') : `${SYM[cur]} · ${sig(E)} GeV`}</caption>
        <thead><tr><th>{t('widget.ParticleSignatures.col.layer')}</th><th>{t('widget.ParticleSignatures.col.signal')}</th><th style="text-align:right">{t('widget.ParticleSignatures.col.dep')}</th></tr></thead>
        <tbody>
          {#each layerRows as r}
            <tr><td>{r.name}</td><td>{r.sig}</td><td class="num" style="white-space:nowrap">{r.dep}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
  <p class="w-note">{t('widget.ParticleSignatures.note')}</p>
</div>

<style>
  .ps-choices { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); width: 100%; }
  .ps-btn { font: inherit; font-size: var(--fs-sm); color: var(--fg); background: none; border: 1px solid var(--fg-faint); border-radius: 0; padding: var(--space-2) var(--space-3); cursor: pointer; text-align: left; justify-self: start; }
  .ps-choices .ps-btn { justify-self: stretch; }
  .ps-btn:hover:not(:disabled) { border-color: var(--accent); }
  .ps-btn:disabled { cursor: default; }
  .ps-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .ps-btn.ok { border: 2px solid var(--accent); font-weight: 650; }
  .ps-btn.bad { border-style: dashed; text-decoration: line-through; }
</style>
