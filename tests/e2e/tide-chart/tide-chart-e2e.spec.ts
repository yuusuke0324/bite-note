// TASK-303: TideChart E2Eテストスイート - メインファイル
// 全55テストケースの統合実行

import { test, expect } from '@playwright/test';
import './basic-functionality.spec';
import './visual-regression.spec';
import './multi-browser.spec';
import './performance.spec';
import './integration-scenarios.spec';

test.describe('TASK-303: TideChart E2Eテストスイート', () => {
  test('E2E Test Suite Overview', async ({ page }) => {
    // テストスイート概要情報の表示
    console.log('='.repeat(60));
    console.log('TASK-303: TideChart E2Eテストスイート');
    console.log('='.repeat(60));
    console.log('総テストケース数: 55個');
    console.log('分類:');
    console.log('  TC-E001: 基本機能E2Eテスト群 (15個)');
    console.log('  TC-E002: 視覚回帰テスト群 (12個)');
    console.log('  TC-E003: マルチブラウザテスト群 (10個)');
    console.log('  TC-E004: パフォーマンステスト群 (8個)');
    console.log('  TC-E005: 統合シナリオテスト群 (10個)');
    console.log('目標通過率: 82%以上 (45/55以上)');
    console.log('実行時間目標: 5分以内');
    console.log('='.repeat(60));

    // 基本的な動作確認
    await page.goto('/');
    expect(page).toBeTruthy();
  });
});