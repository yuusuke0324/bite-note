# TASK-303: E2Eテストスイート作成 - テストケース詳細設計

## TDD Step 2/6: テストケース詳細設計

### テストケース概要

**総テストケース数**: 55個
**分類**: 5つのメインカテゴリ
**実行時間目標**: 5分以内
**通過率目標**: 82%以上 (45個以上)

## TC-E001: 基本機能E2Eテスト群 (15個)

### TC-E001-001: 基本レンダリングテスト

**テスト内容**: TideChartが正常にレンダリングされること
```typescript
test('should render TideChart component correctly', async ({ page }) => {
  await page.goto('/tide-chart');
  await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();
  await expect(page.locator('[role="img"]')).toBeVisible();
});
```
**検証項目**:
- コンポーネントが表示される
- SVG要素が存在する
- ARIA role="img"が設定されている

### TC-E001-002: データ反映確認テスト

**テスト内容**: 潮汐データがグラフに正しく反映されること
```typescript
test('should display tide data correctly', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart-data"]');

  const dataPoints = await page.locator('.recharts-line .recharts-curve').count();
  expect(dataPoints).toBeGreaterThan(0);
});
```
**検証項目**:
- データポイントが表示される
- 線グラフが描画される
- データ数が期待値と一致する

### TC-E001-003: 軸ラベル表示テスト

**テスト内容**: X軸（時間）、Y軸（潮位）が適切に表示されること
```typescript
test('should display axis labels correctly', async ({ page }) => {
  await page.goto('/tide-chart');

  await expect(page.locator('.recharts-xAxis .recharts-cartesian-axis-tick')).toBeVisible();
  await expect(page.locator('.recharts-yAxis .recharts-cartesian-axis-tick')).toBeVisible();
});
```
**検証項目**:
- X軸ラベル（時間）が表示される
- Y軸ラベル（潮位）が表示される
- ラベルが読み取り可能である

### TC-E001-004: レスポンシブ動作テスト

**テスト内容**: 画面サイズ変更に適切に対応すること
```typescript
test('should respond to screen size changes', async ({ page }) => {
  await page.goto('/tide-chart');

  // Desktop
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();

  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();
});
```
**検証項目**:
- 各画面サイズで表示される
- 最小サイズ制約が適用される
- レイアウトが適切に調整される

### TC-E001-005: データエラーハンドリングテスト

**テスト内容**: 不正データでの適切なエラー表示
```typescript
test('should handle invalid data gracefully', async ({ page }) => {
  await page.route('/api/tide-data', route => {
    route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
  });

  await page.goto('/tide-chart');
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
});
```
**検証項目**:
- エラーメッセージが表示される
- フォールバック表示が機能する
- アプリケーションがクラッシュしない

### TC-E001-006: フォールバック表示テスト

**テスト内容**: エラー時のテキストテーブル表示
```typescript
test('should show fallback text table on error', async ({ page }) => {
  await page.route('/api/tide-data', route => {
    route.fulfill({ status: 500 });
  });

  await page.goto('/tide-chart');
  await expect(page.locator('[data-testid="fallback-table"]')).toBeVisible();
});
```
**検証項目**:
- テキストテーブルが表示される
- データが表形式で表示される
- アクセシブルな形式である

### TC-E001-007: エラーメッセージテスト

**テスト内容**: ユーザーフレンドリーなエラーメッセージ
```typescript
test('should display user-friendly error messages', async ({ page }) => {
  await page.route('/api/tide-data', route => {
    route.fulfill({ status: 400, body: JSON.stringify({ error: 'INVALID_TIME_FORMAT' }) });
  });

  await page.goto('/tide-chart');
  const errorText = await page.locator('[data-testid="error-message"]').textContent();
  expect(errorText).toContain('データの形式が正しくありません');
});
```
**検証項目**:
- 技術的でない表現である
- 具体的な解決策が示される
- 多言語対応がされている

### TC-E001-008: 復旧動作テスト

**テスト内容**: 正常データへの復旧時の適切な表示切替
```typescript
test('should recover from error state correctly', async ({ page }) => {
  let errorState = true;
  await page.route('/api/tide-data', route => {
    if (errorState) {
      route.fulfill({ status: 500 });
    } else {
      route.fulfill({ status: 200, body: JSON.stringify(validTideData) });
    }
  });

  await page.goto('/tide-chart');
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

  errorState = false;
  await page.reload();
  await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();
});
```
**検証項目**:
- エラー状態から正常状態への切替
- グラフが正常に表示される
- エラーメッセージが消去される

### TC-E001-009: ホバーインタラクションテスト

**テスト内容**: データポイントホバー時の詳細表示
```typescript
test('should show tooltip on data point hover', async ({ page }) => {
  await page.goto('/tide-chart');

  const dataPoint = page.locator('.recharts-line .recharts-dot').first();
  await dataPoint.hover();

  await expect(page.locator('.recharts-tooltip-wrapper')).toBeVisible();
});
```
**検証項目**:
- ツールチップが表示される
- データ詳細が表示される
- 適切な位置に表示される

### TC-E001-010: 選択状態テスト

**テスト内容**: データポイント選択時の表示変化
```typescript
test('should highlight selected data point', async ({ page }) => {
  await page.goto('/tide-chart');

  const dataPoint = page.locator('.recharts-line .recharts-dot').first();
  await dataPoint.click();

  await expect(dataPoint).toHaveClass(/selected/);
});
```
**検証項目**:
- 選択状態が視覚的に表示される
- 複数選択の制御が適切である
- 選択解除が機能する

### TC-E001-011: フォーカス状態テスト

**テスト内容**: キーボードフォーカス時の視覚インジケーター
```typescript
test('should show focus indicator on keyboard navigation', async ({ page }) => {
  await page.goto('/tide-chart');

  await page.keyboard.press('Tab');
  const focusedElement = page.locator(':focus');

  await expect(focusedElement).toHaveCSS('outline', /2px solid/);
});
```
**検証項目**:
- フォーカスインジケーターが表示される
- 3:1コントラスト比が確保される
- Tab順序が適切である

### TC-E001-012: キーボードナビゲーションテスト

**テスト内容**: キーボードでのデータポイント移動
```typescript
test('should navigate data points with keyboard', async ({ page }) => {
  await page.goto('/tide-chart');

  await page.keyboard.press('Tab');  // チャートにフォーカス
  await page.keyboard.press('ArrowRight');  // 次のデータポイント
  await page.keyboard.press('ArrowLeft');   // 前のデータポイント
  await page.keyboard.press('Home');        // 最初のデータポイント
  await page.keyboard.press('End');         // 最後のデータポイント

  // フォーカスが適切に移動することを確認
  const focusedIndex = await page.getAttribute('[data-testid="tide-chart"]', 'data-focused-index');
  expect(parseInt(focusedIndex)).toBeGreaterThanOrEqual(0);
});
```
**検証項目**:
- Arrow キーでの移動が機能する
- Home/End キーが機能する
- フォーカス位置が適切に管理される

### TC-E001-013: テーマ切替テスト

**テスト内容**: Light, Dark, High-Contrastテーマの切替
```typescript
test('should switch themes correctly', async ({ page }) => {
  await page.goto('/tide-chart');

  // Light theme
  await page.selectOption('[data-testid="theme-selector"]', 'light');
  await expect(page.locator('[data-testid="tide-chart"]')).toHaveCSS('background-color', /rgb\(255, 255, 255\)/);

  // Dark theme
  await page.selectOption('[data-testid="theme-selector"]', 'dark');
  await expect(page.locator('[data-testid="tide-chart"]')).toHaveCSS('background-color', /rgb\(0, 0, 0\)/);

  // High contrast theme
  await page.selectOption('[data-testid="theme-selector"]', 'high-contrast');
  await expect(page.locator('[data-testid="tide-chart"]')).toHaveCSS('background-color', /rgb\(0, 0, 0\)/);
});
```
**検証項目**:
- 3種類のテーマが機能する
- 色の変更が適切に反映される
- コントラスト比が確保される

### TC-E001-014: 設定更新テスト

**テスト内容**: チャート設定の動的更新
```typescript
test('should update chart settings dynamically', async ({ page }) => {
  await page.goto('/tide-chart');

  await page.check('[data-testid="show-grid"]');
  await expect(page.locator('.recharts-cartesian-grid')).toBeVisible();

  await page.uncheck('[data-testid="show-grid"]');
  await expect(page.locator('.recharts-cartesian-grid')).not.toBeVisible();
});
```
**検証項目**:
- 設定変更が即座に反映される
- グリッド表示/非表示が機能する
- 設定状態が保持される

### TC-E001-015: 設定復元テスト

**テスト内容**: デフォルト設定への復元
```typescript
test('should restore default settings', async ({ page }) => {
  await page.goto('/tide-chart');

  // 設定を変更
  await page.selectOption('[data-testid="theme-selector"]', 'dark');
  await page.uncheck('[data-testid="show-grid"]');

  // デフォルトに復元
  await page.click('[data-testid="reset-settings"]');

  await expect(page.locator('[data-testid="theme-selector"]')).toHaveValue('light');
  await expect(page.locator('[data-testid="show-grid"]')).toBeChecked();
});
```
**検証項目**:
- すべての設定がデフォルトに戻る
- リセット操作が確実に機能する
- 状態の整合性が保たれる

## TC-E002: 視覚回帰テスト群 (12個)

### TC-E002-001: デスクトップスクリーンショット

**テスト内容**: デスクトップ表示のベースライン画像作成・比較
```typescript
test('should match desktop screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  await expect(page).toHaveScreenshot('tide-chart-desktop.png');
});
```
**検証項目**:
- ベースライン画像との一致
- レイアウトの安定性
- 視覚的回帰の検出

### TC-E002-002: タブレットスクリーンショット

**テスト内容**: タブレット表示のベースライン画像作成・比較
```typescript
test('should match tablet screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  await expect(page).toHaveScreenshot('tide-chart-tablet.png');
});
```
**検証項目**:
- タブレット特有のレイアウト
- 画面回転対応
- タッチインターフェース対応

### TC-E002-003: モバイルスクリーンショット

**テスト内容**: モバイル表示のベースライン画像作成・比較
```typescript
test('should match mobile screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  await expect(page).toHaveScreenshot('tide-chart-mobile.png');
});
```
**検証項目**:
- モバイル最適化レイアウト
- 小画面での可読性
- タッチ操作対応

### TC-E002-004: ライトテーマスクリーンショット

**テスト内容**: ライトテーマでの表示確認
```typescript
test('should match light theme screenshot', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.selectOption('[data-testid="theme-selector"]', 'light');
  await page.waitForSelector('[data-testid="tide-chart"]');

  await expect(page).toHaveScreenshot('tide-chart-light-theme.png');
});
```
**検証項目**:
- ライトテーマ色設定
- コントラスト比確保
- 可読性保証

### TC-E002-005: ダークテーマスクリーンショット

**テスト内容**: ダークテーマでの表示確認
```typescript
test('should match dark theme screenshot', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.selectOption('[data-testid="theme-selector"]', 'dark');
  await page.waitForSelector('[data-testid="tide-chart"]');

  await expect(page).toHaveScreenshot('tide-chart-dark-theme.png');
});
```
**検証項目**:
- ダークテーマ色設定
- 暗所での可読性
- アクセシビリティ配慮

### TC-E002-006: ハイコントラストテーマスクリーンショット

**テスト内容**: ハイコントラストテーマでの表示確認
```typescript
test('should match high contrast theme screenshot', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.selectOption('[data-testid="theme-selector"]', 'high-contrast');
  await page.waitForSelector('[data-testid="tide-chart"]');

  await expect(page).toHaveScreenshot('tide-chart-high-contrast.png');
});
```
**検証項目**:
- 最高コントラスト比
- 視覚障がい対応
- WCAG AAA準拠

### TC-E002-007: 正常状態スクリーンショット

**テスト内容**: 正常データ表示状態の確認
```typescript
test('should match normal state screenshot', async ({ page }) => {
  await page.route('/api/tide-data', route => {
    route.fulfill({ status: 200, body: JSON.stringify(normalTideData) });
  });

  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  await expect(page).toHaveScreenshot('tide-chart-normal-state.png');
});
```
**検証項目**:
- 標準データでの表示
- 全機能表示状態
- 正常な色・レイアウト

### TC-E002-008: エラー状態スクリーンショット

**テスト内容**: エラー表示状態の確認
```typescript
test('should match error state screenshot', async ({ page }) => {
  await page.route('/api/tide-data', route => {
    route.fulfill({ status: 500 });
  });

  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="error-message"]');

  await expect(page).toHaveScreenshot('tide-chart-error-state.png');
});
```
**検証項目**:
- エラーメッセージ表示
- フォールバック表示
- エラー時の適切なレイアウト

### TC-E002-009: ローディング状態スクリーンショット

**テスト内容**: データ読み込み中の表示確認
```typescript
test('should match loading state screenshot', async ({ page }) => {
  await page.route('/api/tide-data', route => {
    // 2秒遅延してレスポンス
    setTimeout(() => {
      route.fulfill({ status: 200, body: JSON.stringify(normalTideData) });
    }, 2000);
  });

  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="loading-indicator"]');

  await expect(page).toHaveScreenshot('tide-chart-loading-state.png');
});
```
**検証項目**:
- ローディングインジケーター
- 適切な読み込み表示
- ユーザーフィードバック

### TC-E002-010: ホバー状態スクリーンショット

**テスト内容**: データポイントホバー時の表示確認
```typescript
test('should match hover state screenshot', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const dataPoint = page.locator('.recharts-line .recharts-dot').first();
  await dataPoint.hover();
  await page.waitForSelector('.recharts-tooltip-wrapper');

  await expect(page).toHaveScreenshot('tide-chart-hover-state.png');
});
```
**検証項目**:
- ツールチップ表示
- ホバー効果
- インタラクション状態

### TC-E002-011: 選択状態スクリーンショット

**テスト内容**: データポイント選択時の表示確認
```typescript
test('should match selected state screenshot', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const dataPoint = page.locator('.recharts-line .recharts-dot').first();
  await dataPoint.click();

  await expect(page).toHaveScreenshot('tide-chart-selected-state.png');
});
```
**検証項目**:
- 選択状態のハイライト
- 選択インジケーター
- 視覚的フィードバック

### TC-E002-012: フォーカス状態スクリーンショット

**テスト内容**: キーボードフォーカス時の表示確認
```typescript
test('should match focus state screenshot', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  await page.keyboard.press('Tab');

  await expect(page).toHaveScreenshot('tide-chart-focus-state.png');
});
```
**検証項目**:
- フォーカスインジケーター
- キーボードナビゲーション状態
- アクセシビリティ表示

## TC-E003: マルチブラウザテスト群 (10個)

### TC-E003-001: Chromium基本機能テスト

**テスト内容**: Chrome環境での基本機能確認
```typescript
test.describe('Chromium tests', () => {
  test('should work correctly in Chromium', async ({ page }) => {
    await page.goto('/tide-chart');
    await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();

    // Chrome特有の機能テスト
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('navigation');
    });
    expect(performanceEntries.length).toBeGreaterThan(0);
  });
});
```
**検証項目**:
- 基本描画機能
- JavaScript実行環境
- パフォーマンス API

### TC-E003-002: Chromiumアクセシビリティテスト

**テスト内容**: Chrome環境でのアクセシビリティ確認
```typescript
test('should be accessible in Chromium', async ({ page }) => {
  await page.goto('/tide-chart');

  // axe-coreを使用したアクセシビリティチェック
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```
**検証項目**:
- ARIA属性正確性
- キーボードナビゲーション
- スクリーンリーダー対応

### TC-E003-003: Firefox基本機能テスト

**テスト内容**: Firefox環境での基本機能確認
```typescript
test.describe('Firefox tests', () => {
  test('should work correctly in Firefox', async ({ page }) => {
    await page.goto('/tide-chart');
    await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();

    // Firefox特有のレンダリング確認
    const svgElement = page.locator('svg');
    await expect(svgElement).toBeVisible();
  });
});
```
**検証項目**:
- SVGレンダリング互換性
- CSS描画差異
- JavaScript実行差異

### TC-E003-004: Firefox互換性テスト

**テスト内容**: Firefox特有の互換性確認
```typescript
test('should handle Firefox specific behaviors', async ({ page }) => {
  await page.goto('/tide-chart');

  // Firefoxでのマウスイベント処理確認
  const dataPoint = page.locator('.recharts-line .recharts-dot').first();
  await dataPoint.hover();
  await expect(page.locator('.recharts-tooltip-wrapper')).toBeVisible();
});
```
**検証項目**:
- マウスイベント処理
- CSS transform対応
- レスポンシブ動作

### TC-E003-005: WebKit基本機能テスト

**テスト内容**: Safari環境での基本機能確認
```typescript
test.describe('WebKit tests', () => {
  test('should work correctly in WebKit', async ({ page }) => {
    await page.goto('/tide-chart');
    await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();

    // Safari特有の機能確認
    const hasScrollBehavior = await page.evaluate(() => {
      return 'scrollBehavior' in document.documentElement.style;
    });
    expect(hasScrollBehavior).toBe(true);
  });
});
```
**検証項目**:
- WebKit特有機能
- CSS機能サポート
- 描画エンジン差異

### TC-E003-006: WebKit Safari特有機能テスト

**テスト内容**: Safari特有機能の確認
```typescript
test('should handle Safari specific features', async ({ page }) => {
  await page.goto('/tide-chart');

  // Safari特有のタッチイベント（シミュレーション）
  await page.touchscreen.tap(400, 300);

  // Safari特有のスクロール動作確認
  await page.mouse.wheel(0, 100);
});
```
**検証項目**:
- タッチイベント処理
- スクロール動作
- ベンダープレフィックス

### TC-E003-007: Mobile Chromeタッチ操作テスト

**テスト内容**: Android Chrome でのタッチ操作確認
```typescript
test.describe('Mobile Chrome tests', () => {
  test('should handle touch interactions on Mobile Chrome', async ({ page }) => {
    await page.goto('/tide-chart');

    // タッチスクリーン操作
    await page.touchscreen.tap(200, 300);

    // ピンチズーム操作（シミュレーション）
    await page.mouse.move(200, 300);
    await page.mouse.down();
    await page.mouse.move(250, 350);
    await page.mouse.up();
  });
});
```
**検証項目**:
- タッチイベント応答
- ジェスチャー対応
- モバイル最適化

### TC-E003-008: Mobile Chromeパフォーマンステスト

**テスト内容**: Android Chrome でのパフォーマンス確認
```typescript
test('should perform well on Mobile Chrome', async ({ page }) => {
  await page.goto('/tide-chart');

  const startTime = Date.now();
  await page.waitForSelector('[data-testid="tide-chart"]');
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(2000); // 2秒以内
});
```
**検証項目**:
- 描画速度
- リソース使用量
- バッテリー効率

### TC-E003-009: Mobile Safari iOS特有機能テスト

**テスト内容**: iOS Safari 特有機能の確認
```typescript
test.describe('Mobile Safari tests', () => {
  test('should handle iOS Safari specific features', async ({ page }) => {
    await page.goto('/tide-chart');

    // iOS特有のスクロール動作
    await page.evaluate(() => {
      window.scrollTo({ top: 100, behavior: 'smooth' });
    });

    // iOS特有のビューポート処理確認
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(viewportHeight).toBeGreaterThan(0);
  });
});
```
**検証項目**:
- iOS Safari特有動作
- ビューポート処理
- スクロール動作

### TC-E003-010: Mobile Safariパフォーマンステスト

**テスト内容**: iOS Safari でのパフォーマンス確認
```typescript
test('should perform well on Mobile Safari', async ({ page }) => {
  await page.goto('/tide-chart');

  // iOS特有のメモリ制約テスト
  const memoryInfo = await page.evaluate(() => {
    return (performance as any).memory ? {
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize
    } : null;
  });

  if (memoryInfo) {
    expect(memoryInfo.usedJSHeapSize).toBeLessThan(50000000); // 50MB以下
  }
});
```
**検証項目**:
- メモリ使用量
- 描画パフォーマンス
- リソース制約対応

## TC-E004: パフォーマンステスト群 (8個)

### TC-E004-001: 初期描画パフォーマンステスト

**テスト内容**: 初期描画が1秒以内に完了すること
```typescript
test('should render initially within 1 second', async ({ page }) => {
  const startTime = Date.now();

  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const renderTime = Date.now() - startTime;
  expect(renderTime).toBeLessThan(1000);
});
```
**検証項目**:
- 初期描画時間
- リソース読み込み時間
- レンダリング開始時間

### TC-E004-002: データ更新パフォーマンステスト

**テスト内容**: データ更新が500ms以内に反映されること
```typescript
test('should update data within 500ms', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const startTime = Date.now();

  // データ更新トリガー
  await page.click('[data-testid="refresh-data"]');
  await page.waitForSelector('[data-testid="data-updated"]');

  const updateTime = Date.now() - startTime;
  expect(updateTime).toBeLessThan(500);
});
```
**検証項目**:
- データ更新速度
- 再描画効率
- 状態管理性能

### TC-E004-003: リサイズ応答パフォーマンステスト

**テスト内容**: 画面リサイズに100ms以内で応答すること
```typescript
test('should respond to resize within 100ms', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const startTime = Date.now();

  await page.setViewportSize({ width: 800, height: 600 });
  await page.waitForFunction(() => {
    const chart = document.querySelector('[data-testid="tide-chart"]');
    return chart && chart.clientWidth <= 800;
  });

  const resizeTime = Date.now() - startTime;
  expect(resizeTime).toBeLessThan(100);
});
```
**検証項目**:
- リサイズ応答速度
- レイアウト再計算効率
- レスポンシブ性能

### TC-E004-004: 画面回転パフォーマンステスト

**テスト内容**: 画面回転時の適切な応答性能
```typescript
test('should handle orientation change efficiently', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const startTime = Date.now();

  // 縦向きから横向きへ
  await page.setViewportSize({ width: 667, height: 375 });
  await page.waitForFunction(() => {
    const chart = document.querySelector('[data-testid="tide-chart"]');
    return chart && chart.clientWidth > chart.clientHeight;
  });

  const orientationTime = Date.now() - startTime;
  expect(orientationTime).toBeLessThan(200);
});
```
**検証項目**:
- 回転応答時間
- レイアウト適応速度
- 再描画効率

### TC-E004-005: 大量データサンプリングテスト

**テスト内容**: 50,000点データでのサンプリング動作確認
```typescript
test('should handle large dataset with sampling', async ({ page }) => {
  // 50,000点のデータを生成
  const largeDataset = Array.from({ length: 50000 }, (_, i) => ({
    time: `00:${Math.floor(i / 60).toString().padStart(2, '0')}`,
    tide: Math.sin(i * 0.01) * 100
  }));

  await page.route('/api/tide-data', route => {
    route.fulfill({ status: 200, body: JSON.stringify({ data: largeDataset }) });
  });

  const startTime = Date.now();
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const renderTime = Date.now() - startTime;
  expect(renderTime).toBeLessThan(1000);

  // サンプリング確認
  const dataPoints = await page.locator('.recharts-line .recharts-dot').count();
  expect(dataPoints).toBeLessThan(1000); // サンプリングされていることを確認
});
```
**検証項目**:
- サンプリング動作
- 大量データ処理
- パフォーマンス維持

### TC-E004-006: スクロールパフォーマンステスト

**テスト内容**: 大量データでのスムーズなスクロール
```typescript
test('should scroll smoothly with large data', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const scrollTimes = [];

  for (let i = 0; i < 10; i++) {
    const startTime = Date.now();
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(50); // アニメーション完了待ち
    scrollTimes.push(Date.now() - startTime);
  }

  const avgScrollTime = scrollTimes.reduce((a, b) => a + b) / scrollTimes.length;
  expect(avgScrollTime).toBeLessThan(50);
});
```
**検証項目**:
- スクロール応答性
- アニメーション性能
- フレームレート維持

### TC-E004-007: メモリ使用量テスト

**テスト内容**: 適切なメモリ使用量の維持
```typescript
test('should maintain reasonable memory usage', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const memoryBefore = await page.evaluate(() => {
    return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
  });

  // データ更新を複数回実行
  for (let i = 0; i < 10; i++) {
    await page.click('[data-testid="refresh-data"]');
    await page.waitForTimeout(100);
  }

  const memoryAfter = await page.evaluate(() => {
    return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
  });

  const memoryIncrease = memoryAfter - memoryBefore;
  expect(memoryIncrease).toBeLessThan(10000000); // 10MB以下の増加
});
```
**検証項目**:
- メモリリークなし
- 適切なガベージコレクション
- リソース管理

### TC-E004-008: CPU使用率テスト

**テスト内容**: 適切なCPU使用率の維持
```typescript
test('should maintain reasonable CPU usage', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  const performanceEntries = await page.evaluate(() => {
    const entries = performance.getEntriesByType('measure');
    return entries.map(entry => ({
      name: entry.name,
      duration: entry.duration
    }));
  });

  // 長時間実行される処理がないことを確認
  const longRunningTasks = performanceEntries.filter(entry => entry.duration > 50);
  expect(longRunningTasks.length).toBe(0);
});
```
**検証項目**:
- CPU集約的処理なし
- 効率的な計算処理
- バックグラウンド処理適正

## TC-E005: 統合シナリオテスト群 (10個)

### TC-E005-001: 標準ユーザーワークフローテスト

**テスト内容**: 一般的な使用フローの確認
```typescript
test('should complete standard user workflow', async ({ page }) => {
  // 1. ページアクセス
  await page.goto('/tide-chart');
  await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();

  // 2. データ確認
  await expect(page.locator('.recharts-line')).toBeVisible();

  // 3. データポイントインタラクション
  const dataPoint = page.locator('.recharts-line .recharts-dot').first();
  await dataPoint.hover();
  await expect(page.locator('.recharts-tooltip-wrapper')).toBeVisible();

  // 4. 設定変更
  await page.selectOption('[data-testid="theme-selector"]', 'dark');
  await expect(page.locator('[data-testid="tide-chart"]')).toHaveCSS('background-color', /rgb\(0, 0, 0\)/);

  // 5. データ更新
  await page.click('[data-testid="refresh-data"]');
  await page.waitForSelector('[data-testid="data-updated"]');
});
```
**検証項目**:
- エンドツーエンドフロー
- ユーザーエクスペリエンス
- 機能統合確認

### TC-E005-002: エラー-復旧ワークフローテスト

**テスト内容**: エラー発生から復旧までのフロー
```typescript
test('should handle error and recovery workflow', async ({ page }) => {
  let errorState = true;

  await page.route('/api/tide-data', route => {
    if (errorState) {
      route.fulfill({ status: 500 });
    } else {
      route.fulfill({ status: 200, body: JSON.stringify(validTideData) });
    }
  });

  // 1. エラー状態の確認
  await page.goto('/tide-chart');
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="fallback-table"]')).toBeVisible();

  // 2. 復旧処理
  errorState = false;
  await page.click('[data-testid="retry-button"]');

  // 3. 正常状態への復旧確認
  await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();
  await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
});
```
**検証項目**:
- エラー検出と表示
- フォールバック機能
- 復旧処理動作

### TC-E005-003: 設定変更ワークフローテスト

**テスト内容**: 各種設定変更時の動作フロー
```typescript
test('should handle settings change workflow', async ({ page }) => {
  await page.goto('/tide-chart');

  // 1. 初期状態確認
  await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();

  // 2. テーマ変更
  await page.selectOption('[data-testid="theme-selector"]', 'high-contrast');
  await expect(page.locator('[data-testid="tide-chart"]')).toHaveCSS('background-color', /rgb\(0, 0, 0\)/);

  // 3. グリッド表示切替
  await page.uncheck('[data-testid="show-grid"]');
  await expect(page.locator('.recharts-cartesian-grid')).not.toBeVisible();

  // 4. 設定リセット
  await page.click('[data-testid="reset-settings"]');
  await expect(page.locator('[data-testid="theme-selector"]')).toHaveValue('light');
  await expect(page.locator('[data-testid="show-grid"]')).toBeChecked();
});
```
**検証項目**:
- 設定変更即座反映
- 状態管理整合性
- リセット機能動作

### TC-E005-004: アクセシビリティワークフローテスト

**テスト内容**: 支援技術使用時のフロー
```typescript
test('should complete accessibility workflow', async ({ page }) => {
  await page.goto('/tide-chart');

  // 1. キーボードナビゲーション
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveCSS('outline', /2px solid/);

  // 2. Arrow キーナビゲーション
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');

  // 3. Enter キーでの詳細表示
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="detail-popup"]')).toBeVisible();

  // 4. Escape キーでの終了
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="detail-popup"]')).not.toBeVisible();

  // 5. ARIA属性確認
  const ariaLabel = await page.getAttribute('[data-testid="tide-chart"]', 'aria-label');
  expect(ariaLabel).toContain('潮汐グラフ');
});
```
**検証項目**:
- キーボード操作フロー
- ARIA属性適用
- スクリーンリーダー対応

### TC-E005-005: ResponsiveChartContainer統合テスト

**テスト内容**: レスポンシブコンテナとの統合確認
```typescript
test('should integrate correctly with ResponsiveChartContainer', async ({ page }) => {
  await page.goto('/tide-chart');

  // 1. 初期サイズ確認
  const initialSize = await page.locator('[data-testid="chart-container"]').boundingBox();
  expect(initialSize.width).toBeGreaterThan(600);
  expect(initialSize.height).toBeGreaterThan(300);

  // 2. リサイズ動作確認
  await page.setViewportSize({ width: 400, height: 300 });
  await page.waitForTimeout(100);

  const resizedSize = await page.locator('[data-testid="chart-container"]').boundingBox();
  expect(resizedSize.width).toBe(600); // 最小サイズ制約
  expect(resizedSize.height).toBe(300);

  // 3. アスペクト比確認
  const aspectRatio = resizedSize.width / resizedSize.height;
  expect(aspectRatio).toBeCloseTo(2, 1); // 2:1比率
});
```
**検証項目**:
- コンテナ統合機能
- サイズ制約適用
- アスペクト比維持

### TC-E005-006: TideDataValidator統合テスト

**テスト内容**: データ検証との統合確認
```typescript
test('should integrate correctly with TideDataValidator', async ({ page }) => {
  // 1. 有効データでの正常動作
  await page.route('/api/tide-data', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        data: [
          { time: '00:00', tide: 100 },
          { time: '06:00', tide: 200 },
          { time: '12:00', tide: 150 }
        ]
      })
    });
  });

  await page.goto('/tide-chart');
  await expect(page.locator('[data-testid="tide-chart"]')).toBeVisible();

  // 2. 無効データでのエラーハンドリング
  await page.route('/api/tide-data', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        data: [
          { time: 'invalid', tide: 'invalid' }
        ]
      })
    });
  });

  await page.reload();
  await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
});
```
**検証項目**:
- データ検証統合
- エラー伝播機能
- 検証結果反映

### TC-E005-007: ChartConfigManager統合テスト

**テスト内容**: 設定管理との統合確認
```typescript
test('should integrate correctly with ChartConfigManager', async ({ page }) => {
  await page.goto('/tide-chart');

  // 1. デフォルト設定確認
  const defaultTheme = await page.getAttribute('[data-testid="tide-chart"]', 'data-theme');
  expect(defaultTheme).toBe('light');

  // 2. 設定変更の反映確認
  await page.selectOption('[data-testid="theme-selector"]', 'dark');
  const updatedTheme = await page.getAttribute('[data-testid="tide-chart"]', 'data-theme');
  expect(updatedTheme).toBe('dark');

  // 3. デバイス別設定確認
  await page.setViewportSize({ width: 375, height: 667 }); // Mobile
  const mobileConfig = await page.getAttribute('[data-testid="tide-chart"]', 'data-device');
  expect(mobileConfig).toBe('mobile');

  // 4. アクセシビリティ設定確認
  await page.check('[data-testid="high-contrast-mode"]');
  const accessibilityMode = await page.getAttribute('[data-testid="tide-chart"]', 'data-accessibility');
  expect(accessibilityMode).toBe('high-contrast');
});
```
**検証項目**:
- 設定管理統合
- デバイス別設定
- アクセシビリティ設定

### TC-E005-008: ErrorHandler統合テスト

**テスト内容**: エラーハンドリングとの統合確認
```typescript
test('should integrate correctly with ErrorHandler', async ({ page }) => {
  // 1. ネットワークエラー
  await page.route('/api/tide-data', route => {
    route.abort();
  });

  await page.goto('/tide-chart');
  await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
  const networkErrorText = await page.locator('[data-testid="error-message"]').textContent();
  expect(networkErrorText).toContain('データの取得に失敗しました');

  // 2. データ形式エラー
  await page.route('/api/tide-data', route => {
    route.fulfill({ status: 200, body: 'invalid json' });
  });

  await page.reload();
  await expect(page.locator('[data-testid="parse-error"]')).toBeVisible();

  // 3. フォールバック表示確認
  await expect(page.locator('[data-testid="fallback-table"]')).toBeVisible();
  const fallbackRows = await page.locator('[data-testid="fallback-table"] tr').count();
  expect(fallbackRows).toBeGreaterThan(0);
});
```
**検証項目**:
- エラー分類処理
- エラーメッセージ生成
- フォールバック表示

### TC-E005-009: ARIA統合テスト

**テスト内容**: ARIA属性の統合確認
```typescript
test('should have complete ARIA integration', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  // 1. 基本ARIA属性確認
  const role = await page.getAttribute('[data-testid="tide-chart"]', 'role');
  expect(role).toBe('img');

  const ariaLabel = await page.getAttribute('[data-testid="tide-chart"]', 'aria-label');
  expect(ariaLabel).toContain('潮汐グラフ');

  const ariaDescribedBy = await page.getAttribute('[data-testid="tide-chart"]', 'aria-describedby');
  expect(ariaDescribedBy).toBeTruthy();

  // 2. 動的ARIA更新確認
  await page.click('[data-testid="refresh-data"]');
  await page.waitForSelector('[data-testid="data-updated"]');

  const updatedLabel = await page.getAttribute('[data-testid="tide-chart"]', 'aria-label');
  expect(updatedLabel).toContain('更新されました');

  // 3. ライブリージョン確認
  const liveRegion = await page.locator('[aria-live="polite"]');
  await expect(liveRegion).toBeVisible();
});
```
**検証項目**:
- ARIA属性完全統合
- 動的更新機能
- ライブリージョン動作

### TC-E005-010: スクリーンリーダー統合テスト

**テスト内容**: スクリーンリーダー機能の統合確認
```typescript
test('should have complete screen reader integration', async ({ page }) => {
  await page.goto('/tide-chart');
  await page.waitForSelector('[data-testid="tide-chart"]');

  // 1. 概要説明確認
  const description = await page.locator('[data-testid="chart-description"]').textContent();
  expect(description).toContain('データポイント');
  expect(description).toContain('満潮');
  expect(description).toContain('干潮');

  // 2. データポイント詳細確認
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowRight');

  const pointDescription = await page.locator('[data-testid="point-description"]').textContent();
  expect(pointDescription).toContain('時刻');
  expect(pointDescription).toContain('潮位');

  // 3. 傾向分析確認
  const trendAnalysis = await page.locator('[data-testid="trend-analysis"]').textContent();
  expect(trendAnalysis).toContain('潮汐パターン');

  // 4. ナビゲーション指示確認
  const navigationHelp = await page.locator('[data-testid="navigation-help"]').textContent();
  expect(navigationHelp).toContain('矢印キー');
  expect(navigationHelp).toContain('Enterキー');
});
```
**検証項目**:
- 概要説明生成
- 詳細説明機能
- ナビゲーション支援

## 実行戦略

### テスト実行順序
1. **基本機能テスト (TC-E001)**: 全機能の基盤確認
2. **パフォーマンステスト (TC-E004)**: 性能要件確認
3. **マルチブラウザテスト (TC-E003)**: 互換性確認
4. **視覚回帰テスト (TC-E002)**: 視覚的品質確認
5. **統合シナリオテスト (TC-E005)**: エンドツーエンド確認

### 並列実行戦略
- **Browser Level**: 異なるブラウザでの並列実行
- **Test Group Level**: 独立したテストグループの並列実行
- **Resource Management**: CI環境でのリソース制約考慮

### 失敗時対応
- **Retry Strategy**: フレーク対策として最大2回リトライ
- **Screenshot Capture**: 失敗時の状態保存
- **Log Collection**: 詳細ログの収集・保存
- **Error Classification**: 失敗原因の自動分類

---

**作成日**: 2025-09-30
**テストケース設計者**: E2E Testing Specialist
**総テストケース数**: 55個
**推定実行時間**: 5分
**次フェーズ**: Red Phase実装 (tdd-red.md)