import { test, expect } from '@playwright/test';

test('debug: check console errors and page structure', async ({ page }) => {
  // コンソールメッセージをキャプチャ
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(`PAGE ERROR: ${error.message}`);
  });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000); // React rendering wait

  // スクリーンショット
  await page.screenshot({ path: 'test-results/debug-after-restart.png', fullPage: true });

  // すべてのボタンテキストを取得
  const buttons = await page.locator('button').all();
  console.log(`\n=== Found ${buttons.length} buttons ===`);
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    const testId = await buttons[i].getAttribute('data-testid');
    console.log(`Button ${i}: "${text?.trim()}" [data-testid="${testId}"]`);
  }

  // tide-chart関連の要素を検索
  console.log('\n=== Searching for tide-chart elements ===');
  const tideChartElements = await page.locator('[data-testid*="tide"]').all();
  console.log(`Found ${tideChartElements.length} elements with tide in testid`);

  // activeTab状態を確認（React DevTools的なアプローチ）
  const stateCheck = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.map(btn => ({
      text: btn.textContent?.trim(),
      testId: btn.getAttribute('data-testid'),
      variant: btn.className,
      style: btn.getAttribute('style')
    }));
  });
  console.log('\n=== Button State Check ===');
  console.log(JSON.stringify(stateCheck, null, 2));

  // Console errors
  if (consoleErrors.length > 0) {
    console.log('\n=== Console Errors ===');
    consoleErrors.forEach(err => console.log(err));
  }

  // All console messages
  console.log('\n=== All Console Messages ===');
  consoleMessages.forEach(msg => console.log(msg));
});
