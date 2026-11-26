import { test, expect } from '@playwright/test';

// baseURL is http://localhost:4321/physics/ (see playwright.config.ts).
// Paths are relative (no leading slash) so they resolve under /physics/.
const LANGS = ['ko', 'en', 'it'] as const;

for (const lang of LANGS) {
  test.describe(`${lang} hub`, () => {
    test(`/physics/${lang}/ returns 200 with lang="${lang}", an h1, and hreflang alternates`, async ({ page }) => {
      const response = await page.goto(`${lang}/`);
      expect(response, 'navigation response').not.toBeNull();
      expect(response!.status()).toBe(200);

      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('h1').first()).toBeVisible();

      for (const alt of LANGS) {
        await expect(
          page.locator(`link[rel="alternate"][hreflang="${alt}"]`),
          `hreflang alternate for ${alt}`,
        ).toHaveCount(1);
      }
    });
  });
}

test('root /physics/ page exists', async ({ page }) => {
  const response = await page.goto('');
  expect(response, 'navigation response').not.toBeNull();
  expect(response!.status()).toBe(200);
  await expect(page.locator('body')).toBeVisible();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('en hub loads with no console errors when reduced motion is requested', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto('en/');
    expect(response?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
