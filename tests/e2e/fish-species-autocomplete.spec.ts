/**
 * 魚種オートコンプリート E2Eテスト
 *
 * @description
 * FishSpeciesAutocompleteコンポーネントのエンドツーエンドテスト
 * ユーザーフロー、キーボード操作、アクセシビリティを検証
 *
 * @version 2.8.0
 * @since 2025-10-25
 */

import { test, expect } from '@playwright/test';
import { TestIds } from '../../src/constants/testIds';

test.describe('魚種オートコンプリート E2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    // ホーム画面から開始
    await page.goto('/');

    // Fixed: Issue #226 - E2Eテストの初期化パターンを統一
    // waitForAppInitはHOME_TAB待機のため、正常系フローのみで使用
    await page.waitForSelector('[data-app-initialized]', { timeout: 10000 });

    // 記録登録タブに移動
    await page.click('[data-testid="form-tab"]');
    // オートコンプリート入力フィールドが表示されるまで待機
    await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`)).toBeVisible({ timeout: 3000 });
  });

  test.describe('基本機能', () => {
    test('オートコンプリート入力フィールドが表示される', async ({ page }) => {
      const autocomplete = page.locator(`[data-testid="${TestIds.FISH_SPECIES_AUTOCOMPLETE}"]`);
      await expect(autocomplete).toBeVisible();

      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('placeholder', /魚種を入力/);
    });

    test('テキストを入力すると候補が表示される', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      // 1文字入力
      await input.fill('あ');

      // 候補リストが表示される
      const suggestions = page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`);
      await expect(suggestions).toBeVisible();

      // 複数の候補が表示される
      const options = page.locator('[role="option"]');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });

    test('候補をクリックして選択できる', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      // 「マアジ」を検索
      await input.fill('まあじ');

      // 候補が表示されるまで待機
      const suggestions = page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`);
      await expect(suggestions).toBeVisible();

      // 最初の候補（マアジ）をクリック
      const firstOption = page.locator(`[data-testid="${TestIds.FISH_SPECIES_OPTION('ma-aji')}"]`);
      await expect(firstOption).toBeVisible();
      await firstOption.click();

      // 入力フィールドに選択した魚種名が表示される
      await expect(input).toHaveValue('マアジ');

      // 候補リストが閉じる
      await expect(suggestions).not.toBeVisible();
    });

    test('入力に応じて候補が絞り込まれる', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

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
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      // 存在しない魚種を入力
      await input.fill('存在しない魚種名xyz');

      // 結果なしメッセージが表示される
      const noResults = page.locator(`[data-testid="${TestIds.FISH_SPECIES_NO_RESULTS}"]`);
      await expect(noResults).toBeVisible();
      await expect(noResults).toContainText('該当する魚種が見つかりません');
    });
  });

  test.describe('キーボード操作', () => {
    test('↓キーで候補を下に移動できる', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      await input.fill('あ');

      // 候補が表示されるまで待機
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).toBeVisible();

      const options = page.locator('[role="option"]');

      // ステップ1: 最初の↓キー → 1番目を選択
      await input.press('ArrowDown');

      // Playwrightの自動リトライ機構を活用（CI環境考慮で10秒タイムアウト）
      await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });

      // ステップ2: 2回目の↓キー → 2番目を選択
      await input.press('ArrowDown');

      // 段階的検証: 2番目が選択される → 1番目が選択解除される
      await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
      await expect(options.nth(0)).toHaveAttribute('aria-selected', 'false', { timeout: 10000 });

      // 選択が1つだけであることを確認
      const selectedOptions = page.locator('[role="option"][aria-selected="true"]');
      await expect(selectedOptions).toHaveCount(1);
    });

    // Issue #246: コンポーネント側でhandleKeyDownにclearTimeout追加で修正済み
    test('↑キーで候補を上に移動できる', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);
      const suggestions = page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`);
      const selectedOptions = page.locator('[role="option"][aria-selected="true"]');

      // 「マ」で検索すると複数の候補（マアジ、マダイ等）が表示される
      await input.fill('マ');
      await expect(suggestions).toBeVisible();

      // 候補リストを取得
      const options = page.locator('[role="option"]');
      const optionCount = await options.count();

      // 候補が2つ以上あることを確認（上下移動をテストするため）
      expect(optionCount).toBeGreaterThanOrEqual(2);

      // ステップ1: ↓で1番目を選択
      await input.press('ArrowDown');
      // Playwrightの自動リトライ機構を活用（CI環境考慮で10秒タイムアウト）
      await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
      await expect(selectedOptions).toHaveCount(1);

      // ステップ2: ↓で2番目を選択
      await input.press('ArrowDown');
      // 選択が1つだけであることを先に確認（React状態更新の完了を待つ）
      await expect(selectedOptions).toHaveCount(1, { timeout: 10000 });
      await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });

      // ステップ3: ↑で1番目に戻る
      await input.press('ArrowUp');
      // 選択が1つだけであることを先に確認（React状態更新の完了を待つ）
      await expect(selectedOptions).toHaveCount(1, { timeout: 10000 });
      await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    });

    test('Enterキーで選択した候補を確定できる', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      await input.fill('まあじ');
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).toBeVisible();

      // ↓キーで最初の候補を選択
      await input.press('ArrowDown');

      // 候補が選択されていることを確認（React状態更新を待機）
      const options = page.locator('[role="option"]');
      await expect(options.first()).toHaveAttribute('aria-selected', 'true', { timeout: 2000 });

      // Enterキーで確定
      await input.press('Enter');

      // 入力フィールドに選択した魚種名が表示される
      await expect(input).toHaveValue('マアジ');

      // 候補リストが閉じる
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).not.toBeVisible();
    });

    test('Escapeキーで候補リストを閉じられる', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      await input.fill('あ');
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).toBeVisible();

      // Escapeキーを押す
      await input.press('Escape');

      // 候補リストが閉じる
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).not.toBeVisible();
    });

    test('Tabキーで次のフィールドに移動できる', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      await input.fill('あ');
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).toBeVisible();

      // Tabキーを押す
      await input.press('Tab');

      // 候補リストが閉じる
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).not.toBeVisible();

      // フォーカスが次のフィールドに移動する
      const nextField = await page.locator(':focus');
      expect(nextField).not.toBe(input);
    });
  });

  test.describe('フォーム統合', () => {
    // Note: フォーム送信のE2Eテストは別途FishingRecordFormのテストで実施
    test.skip('選択した魚種でフォームを送信できる', async ({ page }) => {
      // 日付を入力
      await page.fill(`[data-testid="${TestIds.FISHING_DATE}"]`, '2024-01-15T10:00');

      // 場所を入力
      await page.fill(`[data-testid="${TestIds.LOCATION_NAME}"]`, '東京湾');

      // 魚種をオートコンプリートで選択
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);
      await input.fill('すずき');

      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).toBeVisible();

      // スズキを選択
      const suzukiOption = page.locator(`[data-testid="${TestIds.FISH_SPECIES_OPTION('suzuki')}"]`);
      await expect(suzukiOption).toBeVisible();
      await suzukiOption.click();

      await expect(input).toHaveValue('スズキ');

      // サイズを入力
      await page.fill(`[data-testid="${TestIds.FISH_SIZE}"]`, '60');

      // 保存ボタンをクリック
      await page.click(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);

      // 成功メッセージが表示されることを確認
      await expect(page.locator(`[data-testid="${TestIds.TOAST_SUCCESS}"]`)).toBeVisible();
    });

    test.skip('手動入力した魚種でもフォームを送信できる', async ({ page }) => {
      // 日付を入力
      await page.fill(`[data-testid="${TestIds.FISHING_DATE}"]`, '2024-01-15T10:00');

      // 場所を入力
      await page.fill(`[data-testid="${TestIds.LOCATION_NAME}"]`, '琵琶湖');

      // 魚種を手動入力（オートコンプリートを使わない）
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);
      await input.fill('カスタム魚種');

      // 候補リストを閉じる
      await input.press('Escape');

      // サイズを入力
      await page.fill(`[data-testid="${TestIds.FISH_SIZE}"]`, '25');

      // 保存ボタンをクリック
      await page.click(`[data-testid="${TestIds.SAVE_RECORD_BUTTON}"]`);

      // 成功メッセージが表示されることを確認
      await expect(page.locator(`[data-testid="${TestIds.TOAST_SUCCESS}"]`)).toBeVisible();
    });
  });

  test.describe('アクセシビリティ', () => {
    test('ARIA属性が正しく設定されている', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

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
      const suggestions = page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`);
      await expect(suggestions).toHaveAttribute('role', 'listbox');

      // 候補項目のrole属性が正しい
      const firstOption = page.locator('[role="option"]').first();
      await expect(firstOption).toHaveAttribute('role', 'option');
    });

    test('スクリーンリーダー用のメッセージが適切に表示される', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      // 結果なしの場合
      await input.fill('存在しない魚種xyz');

      const noResults = page.locator(`[data-testid="${TestIds.FISH_SPECIES_NO_RESULTS}"]`);
      await expect(noResults).toHaveAttribute('role', 'status');
      await expect(noResults).toBeVisible();
    });
  });

  test.describe('パフォーマンス', () => {
    test('大量入力でもスムーズに動作する', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      // 連続で入力
      await input.fill('a');
      await page.waitForTimeout(50);
      await input.fill('ab');
      await page.waitForTimeout(50);
      await input.fill('abc');
      await page.waitForTimeout(50);
      await input.fill('abcd');

      // 魚種入力フィールドにエラーが表示されていないことを確認
      const autocompleteSection = page.locator(`[data-testid="${TestIds.FISH_SPECIES_AUTOCOMPLETE}"]`);
      const errorInAutocomplete = autocompleteSection.locator('.error-message');
      await expect(errorInAutocomplete).not.toBeVisible();
    });

    test('候補の表示と非表示が高速に切り替わる', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      // 候補を表示
      await input.fill('あ');
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).toBeVisible();

      // 入力をクリア（注：フォーカスがあるため候補は表示されたまま）
      await input.fill('');
      // フォーカスを外して候補を閉じる
      await page.click('body');
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).not.toBeVisible();

      // 再度表示
      await input.click();
      await input.fill('い');
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).toBeVisible();
    });
  });

  test.describe('エッジケース', () => {
    test('フォーカス時に候補が表示される', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      // 空の状態でフォーカス
      await input.click();

      // 人気魚種が表示される（空クエリで検索）
      const suggestions = page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`);
      await expect(suggestions).toBeVisible();

      const options = page.locator('[role="option"]');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });

    test('ブラー時に候補が閉じる', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      await input.fill('あ');
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).toBeVisible();

      // フォーカスを外す
      await page.click('body');

      // 候補リストが閉じる
      await page.waitForTimeout(300); // ブラーハンドラーの遅延を待つ
      await expect(page.locator(`[data-testid="${TestIds.FISH_SPECIES_SUGGESTIONS}"]`)).not.toBeVisible();
    });

    test('特殊文字を含む入力でもエラーが発生しない', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      await input.fill('!@#$%^&*()');

      // 魚種入力フィールドにエラーが表示されていないことを確認
      const autocompleteSection = page.locator(`[data-testid="${TestIds.FISH_SPECIES_AUTOCOMPLETE}"]`);
      const errorInAutocomplete = autocompleteSection.locator('.error-message');
      await expect(errorInAutocomplete).not.toBeVisible();
    });

    test('非常に長い入力でもエラーが発生しない', async ({ page }) => {
      const input = page.locator(`[data-testid="${TestIds.FISH_SPECIES_INPUT}"]`);

      const longInput = 'あ'.repeat(100);
      await input.fill(longInput);

      // 魚種入力フィールドにエラーが表示されていないことを確認
      const autocompleteSection = page.locator(`[data-testid="${TestIds.FISH_SPECIES_AUTOCOMPLETE}"]`);
      const errorInAutocomplete = autocompleteSection.locator('.error-message');
      await expect(errorInAutocomplete).not.toBeVisible();
    });
  });
});
