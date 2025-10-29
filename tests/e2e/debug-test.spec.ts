import { test, expect } from '@playwright/test';

test('debug: check page content', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // スクリーンショットを撮る
  await page.screenshot({ path: 'test-results/debug-homepage.png', fullPage: true });

  // すべてのボタンを確認
  const buttons = await page.locator('button').all();
  console.log(`Found ${buttons.length} buttons`);

  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    const testId = await buttons[i].getAttribute('data-testid');
    console.log(`Button ${i}: text="${text}", testId="${testId}"`);
  }

  // HTML全体を確認
  const html = await page.content();
  console.log('Page HTML length:', html.length);

  // tide-chartという文字列があるか確認
  const hasTideChart = html.includes('tide-chart');
  console.log('Has "tide-chart":', hasTideChart);
});
