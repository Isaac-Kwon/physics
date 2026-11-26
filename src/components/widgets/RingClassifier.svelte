<script lang="ts">
  /*
   * Simulated Cherenkov rings on a PMT wall (wall radius = 1, one PMT every 0.06):
   *   muon-like:     charge density ~ exp(-(r - r0)^2 / 2 sigma_s^2), sigma_s = 0.025 (sharp edge); 30 % of muons "stop" in the tank and
   *                  also fill the inside of the ring (fainter disc), the rim stays sharp.
   *   electron-like: sum of 5 sub-rings (the shower's electrons and photons), each with a random centre offset (~0.09), radius jitter (~14 %) and weight.
   *   hits ~ Poisson(brightness * density + dark noise); "difficulty" lowers the brightness and raises the dark noise.
   * Edge-sharpness metric = (r20 - r80) / r80 from the radial charge density about the charge-weighted centre, where r80 / r20 are the
   * radii at which the density has fallen to 80 % / 20 % of its peak. Simulated, not real data.
   */
  import './_widget.css';
  import './_widget3.css';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { SHARP_CUT, rng, simulateRing } from './_physics3';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const n2 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 2, minimumFractionDigits: 2 });

  let seed = $state(11);
  let difficulty = $state(0.3);
  let diffUsed = $state(0.3); // difficulty of the event on screen; a new setting applies to the next event once you have answered
  let guess = $state<'muon' | 'electron' | null>(null);
  let right = $state(0);
  let asked = $state(0);

  const isMuon = $derived(rng(seed * 7919)() < 0.5);
  const ev = $derived(simulateRing(rng(seed), isMuon, diffUsed));
  const truth = $derived(ev.muon ? 'muon' : 'electron');
  const measured = $derived(ev.edgeWidth < SHARP_CUT ? 'muon' : 'electron');

  function pick(g: 'muon' | 'electron') {
    if (guess) return;
    guess = g;
    asked++;
    if (g === truth) right++;
  }
  function next() {
    seed += 1;
    guess = null;
    diffUsed = difficulty;
  }
  function onDifficulty() {
    if (!guess) diffUsed = difficulty;
  }

  const VB = 2.1;
  const S = 400;
  const k = S / VB;
  const X = (u: number) => S / 2 + k * u;
  const Y = (v: number) => S / 2 - k * v;

  // profile plot
  const PW = 260, PH = 110, PL = 8, PB = 22;
  const maxR = 1.0;
  const pk = $derived(Math.max(...ev.profile, 1e-9));
  const nbShow = $derived(Math.round(maxR / ev.dr));
  const profPath = $derived(
    ev.profile
      .slice(0, nbShow)
      .map((v, i) => `${i ? 'L' : 'M'}${(PL + (((i + 0.5) * ev.dr) / maxR) * (PW - PL - 4)).toFixed(1)} ${(PH - PB - (v / pk) * (PH - PB - 6)).toFixed(1)}`)
      .join('')
  );
  const rEx = $derived(PL + (ev.rEdge / maxR) * (PW - PL - 4));
</script>

<div class="w">
  <h3 class="w-title">{t('widget.RingClassifier.title')}</h3>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {S} {S}" role="img" aria-label={t('widget.RingClassifier.view', { n: ev.hits.length })}>
        <circle cx={X(0)} cy={Y(0)} r={k * 1.0} fill="var(--bg-sunken)" stroke="var(--fg)" stroke-width="1.2" />
        {#each ev.hits as h}
          <circle cx={X(h.x)} cy={Y(h.y)} r={k * 0.026 * Math.min(1.5, 0.55 + 0.25 * h.q)} fill="var(--accent)" opacity={Math.min(1, 0.3 + 0.18 * h.q)} />
        {/each}
        {#if guess}
          <circle cx={X(ev.centre[0])} cy={Y(ev.centre[1])} r={k * ev.rEdge} fill="none" stroke="var(--fg)" stroke-width="1" stroke-dasharray="4 3" />
          <text class="halo" x={X(ev.centre[0]) + 6} y={Y(ev.centre[1]) - k * ev.rEdge - 5}>{t('widget.RingClassifier.edgeLabel')}</text>
        {/if}
        <text class="halo" x="8" y="18">{t('widget.RingClassifier.sim')}</text>
      </svg>
      <figcaption>{t('widget.RingClassifier.cap')}</figcaption>
    </figure>
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="rc-d"><span>{t('widget.RingClassifier.difficulty')}</span><span class="w-val">{n2(difficulty)}</span></label>
        <input id="rc-d" type="range" min="0" max="1" step="0.05" bind:value={difficulty} oninput={onDifficulty} aria-valuetext={n2(difficulty)} />
      </div>
      <div>
        <p class="w-lab" style="margin:0 0 var(--space-2);font-weight:600">{t('widget.RingClassifier.ask')}</p>
        <div class="w3-row">
          <button type="button" class="w3-btn" class:on={guess === 'muon'} disabled={!!guess} onclick={() => pick('muon')}>{t('widget.RingClassifier.muon')}</button>
          <button type="button" class="w3-btn" class:on={guess === 'electron'} disabled={!!guess} onclick={() => pick('electron')}>{t('widget.RingClassifier.electron')}</button>
        </div>
      </div>
      <div aria-live="polite" style="display:grid;gap:var(--space-2)">
        {#if guess}
          <p class="w-note" style="color:var(--fg);font-weight:600">
            {guess === truth ? t('widget.RingClassifier.right') : t('widget.RingClassifier.wrong')}
            {t('widget.RingClassifier.truth.' + truth)}{ev.stopping ? ' ' + t('widget.RingClassifier.stopping') : ''}
          </p>
          <dl class="w-read">
            <dt>{t('widget.RingClassifier.metric')}</dt><dd>{n2(ev.edgeWidth)}</dd>
            <dt>{t('widget.RingClassifier.metricSays')}</dt><dd>{t('widget.RingClassifier.verdict.' + measured)}</dd>
          </dl>
          <svg class="w-svg" viewBox="0 0 {PW} {PH}" role="img" aria-label={t('widget.RingClassifier.profView')}>
            <line class="axis" x1={PL} x2={PW - 4} y1={PH - PB} y2={PH - PB} />
            <path d={profPath} class="acc" />
            <line class="guide dash" x1={rEx} x2={rEx} y1={4} y2={PH - PB} />
            <text class="halo" x={rEx + 4} y="14">{t('widget.RingClassifier.r80')}</text>
            <text x={PL} y={PH - 6}>0</text>
            <text x={PW - 4} y={PH - 6} text-anchor="end">{t('widget.RingClassifier.profX')}</text>
          </svg>
          <button type="button" class="w3-btn" onclick={next}>{t('widget.RingClassifier.next')}</button>
        {:else}
          <p class="w-note">{t('widget.RingClassifier.prompt')}</p>
        {/if}
        <p class="w-note">{t('widget.RingClassifier.score', { right, asked })}</p>
      </div>
    </div>
  </div>
  <p class="w-note">{t('widget.RingClassifier.note', { cut: n2(SHARP_CUT) })}</p>
</div>
