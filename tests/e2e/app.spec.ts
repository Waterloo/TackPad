import { test, expect } from '@playwright/test';

test('homepage has a root div', async ({ page }) => {
  await page.goto('/');
  const appHost = await page.locator('body > div').first();
  await expect(appHost).toBeVisible();
});
