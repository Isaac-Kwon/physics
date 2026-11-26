<script lang="ts">
  /*
   * A track crosses the sensor at x0 inside pixel 0 = [0, p]. The collected charge cloud is Gaussian (sigma, from diffusion).
   *   fraction in pixel k = 1/2 [ erf((x_{k+1} - x0)/(sigma sqrt2)) - erf((x_k - x0)/(sigma sqrt2)) ],  x_k = k p
   *   analogue estimate: centroid = sum q_k x_k^c / sum q_k  (x_k^c = pixel centre);  binary estimate: centre of the pixel with the largest charge
   *   binary resolution: p/sqrt(12) (uniform hit position inside one pixel).
   * The RMS values come from 300 seeded random hits with 2 % noise (of the total charge) per pixel. Five pixels are read out.
   */
  import './_widget.css';
  import { scaleLinear } from 'd3';
  import { useT, type Lang } from '../../i18n';
  import { formatNumber } from '../../lib/format';
  import { sharing } from './_physics2';
  import { rng } from './_physics';

  let { lang = 'en' }: { lang?: Lang } = $props();
  const t = useT(lang);
  const n1 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const n0 = (n: number) => formatNumber(lang, n, { maximumFractionDigits: 0 });
  const pc = (n: number) => formatNumber(lang, n * 100, { maximumFractionDigits: 0 });

  let p = $state(50);
  let sigma = $state(8);
  let pos = $state(0.3); // fraction of the pixel
  let mode = $state('analog');
  const x0 = $derived(pos * p);
  const s = $derived(sharing(x0, p, sigma));
  const est = $derived(mode === 'analog' ? s.centroid : s.binary);
  const err = $derived(est - x0);

  const stats = $derived.by(() => {
    const r = rng(2026);
    let a = 0, b = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const xx = r() * p;
      const q = sharing(xx, p, sigma, 0.02, r);
      a += (q.centroid - xx) ** 2;
      b += (q.binary - xx) ** 2;
    }
    return { analog: Math.sqrt(a / N), binary: Math.sqrt(b / N) };
  });
  const rms = $derived(mode === 'analog' ? stats.analog : stats.binary);
  const binExp = $derived(p / Math.sqrt(12));

  const W = 520, H = 250, L = 20, B = 64, Tp = 14, R = 20;
  const x = $derived(scaleLinear().domain([-2 * p, 3 * p]).range([L, W - R]));
  const y = scaleLinear().domain([0, 1]).range([H - B, Tp]);
  const bell = $derived(
    Array.from({ length: 141 }, (_, i) => {
      const xv = -2 * p + (i / 140) * 5 * p;
      const g = Math.exp(-((xv - x0) ** 2) / (2 * sigma * sigma)); // peak-normalised, only the shape matters
      return `${i ? 'L' : 'M'}${x(xv).toFixed(1)} ${(y(0) - g * 0.55 * (y(0) - y(1))).toFixed(1)}`;
    }).join('')
  );
  const maxq = $derived(Math.max(...s.q, 1e-9));
</script>

<div class="w">
  <h3 class="w-title">{t('widget.ChargeSharing.title')}</h3>
  <div class="w-body">
    <figure class="w-fig">
      <svg class="w-svg" viewBox="0 0 {W} {H}" role="img" aria-label={t('widget.ChargeSharing.view')}>
        {#each s.ks as k, i}
          <rect x={x(k * p)} y={y(1)} width={x((k + 1) * p) - x(k * p)} height={y(0) - y(1)} fill="none" stroke="var(--line)" />
          <rect x={x(k * p) + 6} y={y(s.q[i] / maxq * 0.92)} width={x((k + 1) * p) - x(k * p) - 12} height={y(0) - y(s.q[i] / maxq * 0.92)} fill="var(--accent)" opacity={k === 0 ? 0.55 : 0.4} stroke="var(--accent)" />
          <text class="n strong" x={(x(k * p) + x((k + 1) * p)) / 2} y={y(0) + 14} text-anchor="middle">{pc(s.q[i])} %</text>
          <text class="n" x={(x(k * p) + x((k + 1) * p)) / 2} y={y(0) + 28} text-anchor="middle">{k}</text>
        {/each}
        <path d={bell} fill="none" stroke="var(--fg)" stroke-width="1.2" stroke-dasharray="3 3" />
        <line x1={x(x0)} x2={x(x0)} y1={Tp} y2={y(0)} stroke="var(--fg)" stroke-width="1.5" />
        <text class="strong halo" x={x(x0) + (est > x0 ? -4 : 4)} y={Tp + 8} text-anchor={est > x0 ? 'end' : 'start'}>{t('widget.ChargeSharing.true')}</text>
        <line x1={x(est)} x2={x(est)} y1={y(0)} y2={Tp + 14} stroke="var(--accent)" stroke-width="3" stroke-dasharray={mode === 'analog' ? '' : '6 3'} />
        <path d="M{x(est) - 6},{y(0) + 42} L{x(est) + 6},{y(0) + 42} L{x(est)},{y(0) + 33} Z" fill="var(--accent)" />
        <text class="strong halo" x={x(est) + (est > x0 ? 6 : -6)} y={Tp + 26} text-anchor={est > x0 ? 'start' : 'end'}>{mode === 'analog' ? t('widget.ChargeSharing.centroid') : t('widget.ChargeSharing.binary')}</text>
        <text x={W - R} y={y(0) + 56} text-anchor="end">{t('widget.ChargeSharing.axis')}</text>
      </svg>
      <figcaption>{t('widget.ChargeSharing.cap')}</figcaption>
    </figure>
    <div style="display:grid;gap:var(--space-4)">
      <div class="w-ctl">
        <label for="cs-x"><span>{t('widget.ChargeSharing.pos')}</span><span class="w-val">{n1(x0)} <span class="w-unit">µm</span></span></label>
        <input id="cs-x" type="range" min="0" max="1" step="0.005" bind:value={pos} aria-valuetext="{n1(x0)} µm" />
      </div>
      <div class="w-ctl">
        <label for="cs-s"><span>{t('widget.ChargeSharing.sigma')}</span><span class="w-val">{n1(sigma)} <span class="w-unit">µm</span></span></label>
        <input id="cs-s" type="range" min="2" max="20" step="0.5" bind:value={sigma} aria-valuetext="{n1(sigma)} µm" />
      </div>
      <fieldset>
        <legend>{t('widget.ChargeSharing.pitch')}</legend>
        {#each [25, 50, 100] as v}
          <label><input type="radio" name="cs-p" value={v} bind:group={p} /> {v} µm</label>
        {/each}
      </fieldset>
      <fieldset>
        <legend>{t('widget.ChargeSharing.readout')}</legend>
        <label><input type="radio" name="cs-m" value="analog" bind:group={mode} /> {t('widget.ChargeSharing.analog')}</label>
        <label><input type="radio" name="cs-m" value="binary" bind:group={mode} /> {t('widget.ChargeSharing.binary')}</label>
      </fieldset>
      <dl class="w-read" aria-live="polite">
        <dt>{t('widget.ChargeSharing.est')}</dt><dd>{n1(est)}<span class="w-unit">µm</span></dd>
        <dt>{t('widget.ChargeSharing.err')}</dt><dd>{n1(err)}<span class="w-unit">µm</span></dd>
        <dt>{t('widget.ChargeSharing.rms')}</dt><dd>{n1(rms)}<span class="w-unit">µm</span></dd>
        <dt>p/√12</dt><dd>{n1(binExp)}<span class="w-unit">µm</span></dd>
        <dt>{t('widget.ChargeSharing.gain')}</dt><dd>{n1(binExp / rms)}×</dd>
      </dl>
    </div>
  </div>
  <p class="w-note">{t('widget.ChargeSharing.note')}</p>
</div>
