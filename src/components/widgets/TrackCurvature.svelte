<script lang="ts">
  /*
   * Transverse plane, field B out of the page, track starts at the centre along +x:
   *   r [m] = p_T [GeV/c] / (0.3 B [T])     (p = q B r)
   *   sagitta over a chord L = 1 m:  s = L^2 / (8 r)   (exact: r - sqrt(r^2 - L^2/4), drawn exactly)
   *   momentum resolution (Gluckstern, N points, spatial resolution sigma_x):  sigma_p/p = p sigma_x sqrt(720/(N+4)) / (0.3 B L^2)
   *   here sigma_x = 10 um, N = 10, so sigma_p/p ~ 6e-5 p[GeV/c] at B = 4 T: proportional to p and to 1/B (schematic).
   * Positive charge turns clockwise with B out of the page (F = q v x B, v = +x, B = +z gives force along -y).
   */
  import './_widget.css';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const sig = (n: number, d = 3) => formatNumber(lang, n, { maximumSignificantDigits: d });
  const n1 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 1, minimumFractionDigits: 1 });

  let B = $state(3.8);
  let tp = $state(0.5);
  let sign = $state(1);
  const P0 = 0.1, P1 = 100;
  const p = $derived(P0 * (P1 / P0) ** tp);
  const RT = 1.2; // tracker radius [m]
  const LCH = 1.0; // chord for the sagitta [m]
  const SIGX = 10e-6, NPTS = 10;

  const r = $derived(B > 0 ? p / (0.3 * B) : Infinity);
  const sag = $derived(Number.isFinite(r) ? (LCH * LCH) / (8 * r) : 0); // m
  const relRes = $derived(B > 0 ? (p * SIGX * Math.sqrt(720 / (NPTS + 4))) / (0.3 * B * LCH * LCH) : Infinity);
  const straight = $derived(sag < 1e-3);
  const looper = $derived(Number.isFinite(r) && 2 * r < RT);

  // drawing: 1 m = k px, centre at (cx, cy); y up in physics, down in SVG
  const k = 150, cx = 200, cy = 190, VW = 400, VH = 385;
  const X = (u: number) => cx + k * u;
  const Y = (v: number) => cy - k * v;
  const pt = (phi: number) => [r * Math.sin(phi), -sign * r * (1 - Math.cos(phi))] as const;
  const phiExit = $derived(looper ? 2 * Math.PI : 2 * Math.asin(Math.min(RT / (2 * r), 1)));
  const path = $derived.by(() => {
    if (!Number.isFinite(r)) return `M${X(0)},${Y(0)}L${X(RT)},${Y(0)}`;
    const n = 120;
    return Array.from({ length: n + 1 }, (_, i) => {
      const [u, v] = pt((phiExit * i) / n);
      return `${i ? 'L' : 'M'}${X(u).toFixed(1)},${Y(v).toFixed(1)}`;
    }).join('');
  });
  // sagitta: chord O -> P (|OP| = L along the arc), from chord midpoint to the arc
  const sagGeom = $derived.by(() => {
    if (!Number.isFinite(r) || 2 * r < LCH) return null;
    const phiL = 2 * Math.asin(LCH / (2 * r));
    const P = pt(phiL), M = pt(phiL / 2);
    const mid = [P[0] / 2, P[1] / 2];
    return { P, M, mid };
  });
  const circ = $derived(Number.isFinite(r) && r < 12 ? { cu: 0, cv: -sign * r, r } : null);
  const ticks = [0.5, 1.0];
</script>

<div class="w">
  <h3 class="w-title">{t('widget.TrackCurvature.title')}</h3>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {VW} {VH}" role="img" aria-label={t('widget.TrackCurvature.view', { sense: sign > 0 ? t('widget.TrackCurvature.cw') : t('widget.TrackCurvature.ccw') })}>
        <circle cx={X(0)} cy={Y(0)} r={k * RT} fill="var(--bg-sunken)" stroke="var(--fg)" stroke-width="1.2" />
        {#each ticks as m}
          <circle cx={X(0)} cy={Y(0)} r={k * m} fill="none" stroke="var(--line)" />
        {/each}
        <text class="n" x={X(0) + k * RT * 0.72} y={Y(0) - k * RT * 0.72 - 6}>R = {formatNumber(lang, RT)} m</text>
        {#if circ}
          <circle cx={X(circ.cu)} cy={Y(circ.cv)} r={k * circ.r} fill="none" stroke="var(--fg-muted)" stroke-width="1" stroke-dasharray="5 4" />
        {/if}
        {#if sagGeom}
          <line x1={X(0)} y1={Y(0)} x2={X(sagGeom.P[0])} y2={Y(sagGeom.P[1])} stroke="var(--fg)" stroke-width="1" />
          <line x1={X(sagGeom.mid[0])} y1={Y(sagGeom.mid[1])} x2={X(sagGeom.M[0])} y2={Y(sagGeom.M[1])} stroke="var(--fg)" stroke-width={Math.max(2, 0)} />
          <text class="strong halo" x={X(sagGeom.mid[0]) + 6} y={Y(sagGeom.mid[1]) + (sign > 0 ? -8 : 16)}>s</text>
          <text class="n" x={X(sagGeom.P[0]) - 4} y={Y(sagGeom.P[1]) + (sign > 0 ? 16 : -8)} text-anchor="end">L = {formatNumber(lang, LCH)} m</text>
        {/if}
        <path d={path} fill="none" stroke="var(--accent)" stroke-width="2.4" />
        <circle cx={X(0)} cy={Y(0)} r="3.5" fill="var(--fg)" />
        <!-- field symbol: out of page -->
        <circle cx="24" cy="26" r="9" fill="none" stroke="var(--fg)" stroke-width="1.3" />
        <circle cx="24" cy="26" r="2.4" fill="var(--fg)" />
        <text x="38" y="30">B ⊙</text>
      </svg>
      <figcaption>{t('widget.TrackCurvature.cap')} {t('widget.TrackCurvature.convention')}</figcaption>
    </figure>
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="tc-b"><span>{t('widget.TrackCurvature.b')}</span><span class="w-val">{n1(B)} <span class="w-unit">T</span></span></label>
        <input id="tc-b" type="range" min="0" max="4" step="0.1" bind:value={B} aria-valuetext="{n1(B)} T" />
      </div>
      <div class="w-ctl">
        <label for="tc-p"><span>{t('widget.TrackCurvature.p')}</span><span class="w-val">{sig(p)} <span class="w-unit">GeV/c</span></span></label>
        <input id="tc-p" type="range" min="0" max="1" step="0.001" bind:value={tp} aria-valuetext="{sig(p)} GeV/c" />
      </div>
      <fieldset>
        <legend>{t('widget.TrackCurvature.charge')}</legend>
        <label><input type="radio" name="tc-q" value={1} bind:group={sign} /> +1</label>
        <label><input type="radio" name="tc-q" value={-1} bind:group={sign} /> −1</label>
      </fieldset>
      <dl class="w-read" aria-live="polite">
        <dt>{t('widget.TrackCurvature.radius')}</dt><dd>{Number.isFinite(r) ? sig(r) : '∞'}<span class="w-unit">m</span></dd>
        <dt>{t('widget.TrackCurvature.sag')}</dt><dd>{Number.isFinite(r) ? sig(sag * 1000) : '0'}<span class="w-unit">mm</span></dd>
        <dt>{t('widget.TrackCurvature.dir')}</dt><dd>{B === 0 ? t('widget.TrackCurvature.none') : sign > 0 ? t('widget.TrackCurvature.cw') : t('widget.TrackCurvature.ccw')}</dd>
        <dt>σ<sub>p</sub>/p ≈</dt><dd>{Number.isFinite(relRes) ? (relRes >= 1 ? '> 100' : sig(relRes * 100, 2)) : '—'}<span class="w-unit">%</span></dd>
      </dl>
      <p class="w-note" style="color:var(--fg)" aria-live="polite">
        {#if B === 0}{t('widget.TrackCurvature.noField')}{:else if looper}{t('widget.TrackCurvature.looper')}{:else if straight}{t('widget.TrackCurvature.straight')}{:else}{t('widget.TrackCurvature.ok')}{/if}
      </p>
    </div>
  </div>
  <p class="w-note">{t('widget.TrackCurvature.note')}</p>
</div>
