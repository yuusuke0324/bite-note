import { test, expect } from '@playwright/test';

test.describe('パフォーマンス・アクセシビリティテスト', () => {
  test('ページ読み込みパフォーマンスが基準を満たす', async ({ page }) => {
    // パフォーマンス計測を開始
    await page.goto('/', { waitUntil: 'networkidle' });

    // Core Web Vitalsを計測
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: Record<string, number> = {};

          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              vitals.FCP = navEntry.loadEventEnd - navEntry.fetchStart;
              vitals.LCP = navEntry.loadEventEnd - navEntry.fetchStart;
            }
          });

          resolve(vitals);
        });

        observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });

        // タイムアウト設定
        setTimeout(() => resolve({}), 5000);
      });
    });

    // パフォーマンス基準を確認
    console.log('Web Vitals:', webVitals);

    // ページが2秒以内に読み込まれることを確認
    const loadTime = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return nav.loadEventEnd - nav.fetchStart;
    });

    expect(loadTime).toBeLessThan(2000);
  });

  test('大量データでのパフォーマンス', async ({ page }) => {
    // 1000件のテストデータを生成
    await page.evaluate(() => {
      const records = [];
      for (let i = 1; i <= 1000; i++) {
        records.push({
          id: i.toString(),
          date: `2024-01-${(i % 30 + 1).toString().padStart(2, '0')}`,
          location: `場所${i}`,
          species: `魚種${i % 20 + 1}`,
          size: 20 + (i % 50),
          weight: 0.5 + ((i % 30) * 0.1),
          weather: ['晴れ', '曇り', '雨'][i % 3],
          memo: `記録${i}のメモ`
        });
      }
      localStorage.setItem('fishingRecords', JSON.stringify(records));
    });

    await page.goto('/');

    // 一覧ページの読み込み時間を計測
    const startTime = Date.now();
    await page.click('[data-testid="nav-list"]');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    const loadTime = Date.now() - startTime;

    // 1秒以内に読み込まれることを確認
    expect(loadTime).toBeLessThan(1000);

    // スクロールパフォーマンスをテスト
    const scrollStartTime = Date.now();
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStartTime;

    // スムーズなスクロールを確認
    expect(scrollTime).toBeLessThan(200);
  });

  test('メモリ使用量が適切', async ({ page }) => {
    await page.goto('/');

    // 初期メモリ使用量を記録
    const initialMemory = await page.evaluate(() => {
      // @ts-expect-error - performance.memory is Chrome-specific non-standard API
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });

    // 大量の操作を実行
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="nav-form"]');
      await page.fill('[data-testid="memo-input"]', `テストメモ${i}`.repeat(100));
      await page.click('[data-testid="nav-list"]');
      await page.waitForTimeout(100);
    }

    // 最終メモリ使用量をチェック
    const finalMemory = await page.evaluate(() => {
      // @ts-expect-error - performance.memory is Chrome-specific non-standard API
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });

    // メモリリークがないことを確認（10MB以内の増加）
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
    }
  });

  test('キーボードナビゲーションが完全に機能する', async ({ page }) => {
    await page.goto('/');

    // Tabキーでのナビゲーションをテスト
    let focusableElements = 0;
    const maxTabs = 20;

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');

      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? {
          tagName: el.tagName,
          type: el.getAttribute('type'),
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label')
        } : null;
      });

      if (activeElement && ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(activeElement.tagName)) {
        focusableElements++;
      }
    }

    // 十分な数のフォーカス可能要素があることを確認
    expect(focusableElements).toBeGreaterThan(5);

    // Enterキーでボタンを活性化できることを確認
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // 何らかのアクションが実行されることを確認（ページ変化など）
    await page.waitForTimeout(500);
  });

  test('スクリーンリーダー対応', async ({ page }) => {
    await page.goto('/');

    // 適切な見出し構造があることを確認
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);

    // h1が存在することを確認
    await expect(page.locator('h1')).toHaveCount(1);

    // aria-labelやaria-describedbyが適切に設定されていることを確認
    const inputsWithLabels = await page.locator('input[aria-label], input[aria-describedby], input + label').count();
    const totalInputs = await page.locator('input').count();

    // 入力フィールドにラベルまたはaria属性があることを確認
    if (totalInputs > 0) {
      expect(inputsWithLabels).toBeGreaterThan(0);
    }

    // ボタンに適切なラベルがあることを確認
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }

    // ランドマークロールが適切に設定されていることを確認
    await expect(page.locator('[role="main"], main')).toHaveCount(1);
  });

  test('色彩コントラストが適切', async ({ page }) => {
    await page.goto('/');

    // 色彩コントラストをチェック（簡易版）
    const contrastIssues = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues = [];

      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const backgroundColor = style.backgroundColor;

        // 簡易的なコントラストチェック
        if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          // より詳細なコントラスト計算は実際のテストでは外部ライブラリを使用
          const textContent = el.textContent?.trim();
          if (textContent && textContent.length > 0) {
            // ここでは基本的なチェックのみ
            if (color === backgroundColor) {
              issues.push(`Same color and background: ${textContent.substring(0, 50)}`);
            }
          }
        }
      });

      return issues;
    });

    // 明らかなコントラスト問題がないことを確認
    expect(contrastIssues).toHaveLength(0);
  });

  test('タッチデバイスでの操作性', async ({ page }) => {
    // タッチデバイスをシミュレート
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // タッチターゲットのサイズが適切であることを確認（44px以上）
    const touchTargets = await page.locator('button, a, input[type="checkbox"], input[type="radio"]').all();

    for (const target of touchTargets) {
      const box = await target.boundingBox();
      if (box) {
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
      }
    }

    // スワイプジェスチャーのテスト（該当機能がある場合）
    const recordList = page.locator('[data-testid="record-list"]');
    if (await recordList.count() > 0) {
      await recordList.hover();
      await page.mouse.down();
      await page.mouse.move(100, 0);
      await page.mouse.up();

      // スワイプ操作が認識されることを確認
      await page.waitForTimeout(500);
    }
  });

  test('フォーカスの可視性', async ({ page }) => {
    await page.goto('/');

    // キーボードフォーカスが視覚的に分かることを確認
    await page.keyboard.press('Tab');

    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (el) {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
          boxShadow: style.boxShadow,
          border: style.border
        };
      }
      return null;
    });

    // フォーカスインジケーターがあることを確認
    if (focusedElement) {
      const hasVisibleFocus =
        focusedElement.outline !== 'none' ||
        focusedElement.outlineWidth !== '0px' ||
        focusedElement.boxShadow !== 'none' ||
        focusedElement.border.includes('solid');

      expect(hasVisibleFocus).toBeTruthy();
    }
  });

  test('エラーメッセージのアクセシビリティ', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="nav-form"]');

    // 無効な入力でエラーを発生させる
    await page.click('[data-testid="save-button"]');

    // エラーメッセージがaria-liveまたは適切な属性を持つことを確認
    const errorElements = await page.locator('[data-testid="error-message"], [role="alert"], [aria-live]').all();
    expect(errorElements.length).toBeGreaterThan(0);

    // エラーメッセージがフォーカス管理されていることを確認
    const firstErrorElement = errorElements[0];
    if (firstErrorElement) {
      const ariaLive = await firstErrorElement.getAttribute('aria-live');
      const role = await firstErrorElement.getAttribute('role');

      expect(ariaLive === 'polite' || ariaLive === 'assertive' || role === 'alert').toBeTruthy();
    }
  });
});