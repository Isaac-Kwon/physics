// Screenshot helper for agents and reviewers.
//   node scripts/dev/shoot.mjs <baseUrl> <outDir> <path-without-leading-slash> [--dark] [--mobile] [--full] [--wait=ms] [--scroll=0.3]
// e.g. node scripts/dev/shoot.mjs http://localhost:4420/physics ./shots en/lab/scenes/hi.flow/ --full
// (No leading slash: Git Bash on Windows rewrites /en/... into a Windows path.)
// Prints console errors; exits 1 if any.
import { chromium, devices } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const [base, out, p, ...flags] = process.argv.slice(2);
const has = (f) => flags.includes(f);
const val = (k, d) => (flags.find((f) => f.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext(has('--mobile') ? { ...devices['Pixel 7'] } : { viewport: { width: 1440, height: 900 } });
if (has('--dark')) await ctx.addInitScript(() => localStorage.setItem('physics.theme', 'dark'));
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(base.replace(/\/$/, '') + '/' + p.replace(/^\/+/, ''), { waitUntil: 'networkidle' });
if (has('--full')) {
  // scroll through so lazy scenes mount, then back to top
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 600) {
    await page.evaluate((v) => scrollTo(0, v), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => scrollTo(0, 0));
}
const s = Number(val('scroll', 0));
if (s) await page.evaluate((f) => scrollTo(0, document.documentElement.scrollHeight * f), s);
await page.waitForTimeout(Number(val('wait', 1500)));
const name = (p.replace(/[^\w.-]+/g, '_').replace(/^_|_$/g, '') || 'root') + (has('--dark') ? '-dark' : '') + (has('--mobile') ? '-m' : '') + (s ? `-${s}` : '') + '.png';
const file = path.join(out, name);
await page.screenshot({ path: file, fullPage: has('--full') });
console.log(file);
if (errors.length) console.log('CONSOLE ERRORS:\n  ' + [...new Set(errors)].join('\n  '));
await browser.close();
process.exit(errors.length ? 1 : 0);
