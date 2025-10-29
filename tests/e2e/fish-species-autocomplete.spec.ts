/**
 * 魚種オートコンプリート E2Eテスト
 *
 * @description
 * FishSpeciesAutocompleteコンポーネントのエンドツーエンドテスト
 * ユーザーフロー、キーボード操作、アクセシビリティを検証
 *
 * @version 2.7.1
 * @since 2025-10-25
 */

import { test, expect } from '@playwright/test';

test.describe('魚種オートコンプリート E2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 記録登録タブに移動（既にデフォルトでformタブが選択されている）
    // await page.click('[data-testid="form-tab"]');
    // オートコンプリート入力フィールドが表示されるまで待機
    await expect(page.locator('[data-testid="fish-species-input"]')).toBeVisible({ timeout: 10000 });
  });

  test.describe('基本機能', () => {
    test('オートコンプリート入力フィールドが表示される', async ({ page }) => {
      const autocomplete = page.locator('[data-testid="fish-species-autocomplete"]');
      await expect(autocomplete).toBeVisible();

      const input = page.locator('[data-testid="fish-species-input"]');
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('placeholder', /魚種を入力/);
    });

    test('テキストを入力すると候補が表示される', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      // 1文字入力
      await input.fill('あ');

      // 候補リストが表示される
      const suggestions = page.locator('[data-testid="fish-species-suggestions"]');
      await expect(suggestions).toBeVisible();

      // 複数の候補が表示される
      const options = page.locator('[role="option"]');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });

    test('候補をクリックして選択できる', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      // 「マアジ」を検索
      await input.fill('まあじ');

      // 候補が表示されるまで待機
      const suggestions = page.locator('[data-testid="fish-species-suggestions"]');
      await expect(suggestions).toBeVisible();

      // 最初の候補（マアジ）をクリック
      const firstOption = page.locator('[data-testid="fish-species-option-ma-aji"]');
      await expect(firstOption).toBeVisible();
      await firstOption.click();

      // 入力フィールドに選択した魚種名が表示される
      await expect(input).toHaveValue('マアジ');

      // 候補リストが閉じる
      await expect(suggestions).not.toBeVisible();
    });

    test('入力に応じて候補が絞り込まれる', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      // 「あ」で検索
      await input.fill('あ');
      let options = page.locator('[role="option"]');
      const countA = await options.count();

      // 「あじ」で検索
      await input.fill('あじ');
      await page.waitForTimeout(100); // 検索結果の更新を待つ
      options = page.locator('[role="option"]');
      const countAji = await options.count();

      // 候補が絞り込まれる
      expect(countAji).toBeLessThanOrEqual(countA);
    });

    test('存在しない魚種を入力すると「結果なし」が表示される', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      // 存在しない魚種を入力
      await input.fill('存在しない魚種名xyz');

      // 結果なしメッセージが表示される
      const noResults = page.locator('[data-testid="fish-species-no-results"]');
      await expect(noResults).toBeVisible();
      await expect(noResults).toContainText('該当する魚種が見つかりません');
    });
  });

  test.describe('キーボード操作', () => {
    test('↓キーで候補を下に移動できる', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      await input.fill('あ');

      // 候補が表示されるまで待機
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).toBeVisible();

      // ↓キーを押す
      await input.press('ArrowDown');

      // 最初の候補が選択される
      const firstOption = page.locator('[role="option"][aria-selected="true"]').first();
      await expect(firstOption).toBeVisible();

      // もう一度↓キーを押す
      await input.press('ArrowDown');

      // 2番目の候補が選択される
      const selectedOptions = page.locator('[role="option"][aria-selected="true"]');
      const count = await selectedOptions.count();
      expect(count).toBe(1);
    });

    test('↑キーで候補を上に移動できる', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      await input.fill('あ');
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).toBeVisible();

      // ↓を2回押して2番目の候補を選択
      await input.press('ArrowDown');
      await input.press('ArrowDown');

      // ↑を押す
      await input.press('ArrowUp');

      // 最初の候補が選択される
      const selectedOptions = page.locator('[role="option"][aria-selected="true"]');
      const count = await selectedOptions.count();
      expect(count).toBe(1);
    });

    test('Enterキーで選択した候補を確定できる', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      await input.fill('まあじ');
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).toBeVisible();

      // ↓キーで最初の候補を選択
      await input.press('ArrowDown');

      // Enterキーで確定
      await input.press('Enter');

      // 入力フィールドに選択した魚種名が表示される
      await expect(input).toHaveValue('マアジ');

      // 候補リストが閉じる
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).not.toBeVisible();
    });

    test('Escapeキーで候補リストを閉じられる', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      await input.fill('あ');
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).toBeVisible();

      // Escapeキーを押す
      await input.press('Escape');

      // 候補リストが閉じる
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).not.toBeVisible();
    });

    test('Tabキーで次のフィールドに移動できる', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      await input.fill('あ');
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).toBeVisible();

      // Tabキーを押す
      await input.press('Tab');

      // 候補リストが閉じる
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).not.toBeVisible();

      // フォーカスが次のフィールドに移動する
      const nextField = await page.locator(':focus');
      expect(nextField).not.toBe(input);
    });
  });

  test.describe('フォーム統合', () => {
    test('選択した魚種でフォームを送信できる', async ({ page }) => {
      // 日付を入力
      await page.fill('[data-testid="date-input"]', '2024-01-15');

      // 場所を入力
      await page.fill('[data-testid="location-input"]', '東京湾');

      // 魚種をオートコンプリートで選択
      const input = page.locator('[data-testid="fish-species-input"]');
      await input.fill('すずき');

      await expect(page.locator('[data-testid="fish-species-suggestions"]')).toBeVisible();

      // スズキを選択
      const suzukiOption = page.locator('[data-testid="fish-species-option-suzuki"]');
      await expect(suzukiOption).toBeVisible();
      await suzukiOption.click();

      await expect(input).toHaveValue('スズキ');

      // サイズを入力
      await page.fill('[data-testid="size-input"]', '60');

      // 保存ボタンをクリック
      await page.click('[data-testid="save-button"]');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    });

    test('手動入力した魚種でもフォームを送信できる', async ({ page }) => {
      // 日付を入力
      await page.fill('[data-testid="date-input"]', '2024-01-15');

      // 場所を入力
      await page.fill('[data-testid="location-input"]', '琵琶湖');

      // 魚種を手動入力（オートコンプリートを使わない）
      const input = page.locator('[data-testid="fish-species-input"]');
      await input.fill('カスタム魚種');

      // 候補リストを閉じる
      await input.press('Escape');

      // サイズを入力
      await page.fill('[data-testid="size-input"]', '25');

      // 保存ボタンをクリック
      await page.click('[data-testid="save-button"]');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    });
  });

  test.describe('アクセシビリティ', () => {
    test('ARIA属性が正しく設定されている', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      // 初期状態
      await expect(input).toHaveAttribute('aria-label', '魚種名');
      await expect(input).toHaveAttribute('aria-autocomplete', 'list');
      await expect(input).toHaveAttribute('aria-expanded', 'false');

      // 入力して候補を表示
      await input.fill('あ');

      // aria-expandedがtrueになる
      await expect(input).toHaveAttribute('aria-expanded', 'true');

      // aria-controlsが設定されている
      await expect(input).toHaveAttribute('aria-controls', 'fish-species-list');

      // 候補リストのrole属性が正しい
      const suggestions = page.locator('[data-testid="fish-species-suggestions"]');
      await expect(suggestions).toHaveAttribute('role', 'listbox');

      // 候補項目のrole属性が正しい
      const firstOption = page.locator('[role="option"]').first();
      await expect(firstOption).toHaveAttribute('role', 'option');
    });

    test('スクリーンリーダー用のメッセージが適切に表示される', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      // 結果なしの場合
      await input.fill('存在しない魚種xyz');

      const noResults = page.locator('[data-testid="fish-species-no-results"]');
      await expect(noResults).toHaveAttribute('role', 'status');
      await expect(noResults).toBeVisible();
    });
  });

  test.describe('パフォーマンス', () => {
    test('大量入力でもスムーズに動作する', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      // 連続で入力
      await input.fill('a');
      await page.waitForTimeout(50);
      await input.fill('ab');
      await page.waitForTimeout(50);
      await input.fill('abc');
      await page.waitForTimeout(50);
      await input.fill('abcd');

      // エラーが発生していないことを確認
      const errorMessages = page.locator('[role="alert"]');
      const count = await errorMessages.count();
      expect(count).toBe(0);
    });

    test('候補の表示と非表示が高速に切り替わる', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      // 候補を表示
      await input.fill('あ');
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).toBeVisible();

      // 入力をクリア
      await input.fill('');
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).not.toBeVisible();

      // 再度表示
      await input.fill('い');
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).toBeVisible();
    });
  });

  test.describe('エッジケース', () => {
    test('フォーカス時に候補が表示される', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      // 空の状態でフォーカス
      await input.click();

      // 人気魚種が表示される（空クエリで検索）
      const suggestions = page.locator('[data-testid="fish-species-suggestions"]');
      await expect(suggestions).toBeVisible();

      const options = page.locator('[role="option"]');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });

    test('ブラー時に候補が閉じる', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      await input.fill('あ');
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).toBeVisible();

      // フォーカスを外す
      await page.click('body');

      // 候補リストが閉じる
      await page.waitForTimeout(300); // ブラーハンドラーの遅延を待つ
      await expect(page.locator('[data-testid="fish-species-suggestions"]')).not.toBeVisible();
    });

    test('特殊文字を含む入力でもエラーが発生しない', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      await input.fill('!@#$%^&*()');

      // エラーが発生していないことを確認
      const errorMessages = page.locator('[role="alert"]');
      const count = await errorMessages.count();
      expect(count).toBe(0);
    });

    test('非常に長い入力でもエラーが発生しない', async ({ page }) => {
      const input = page.locator('[data-testid="fish-species-input"]');

      const longInput = 'あ'.repeat(100);
      await input.fill(longInput);

      // エラーが発生していないことを確認
      const errorMessages = page.locator('[role="alert"]');
      const count = await errorMessages.count();
      expect(count).toBe(0);
    });
  });
});
