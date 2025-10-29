# TASK-301: 統合テストスイートの拡張 - テストケース設計

## 📋 テストケース概要

**対象**: 統合テストスイートの拡張
**テスト種別**: E2E統合テスト、パフォーマンステスト、アクセシビリティテスト
**テストレベル**: システム統合レベル

## 🎯 テストケース分類

### 1. 異なる釣果記録での潮汐グラフ比較テスト

#### TC-301-001: 東京湾夏期記録での表示確認
```typescript
describe('TC-301-001: Tokyo Bay Summer Record', () => {
  test('should display accurate tide pattern for Tokyo Bay summer record', async ({ page }) => {
    // Given: 東京湾での夏期釣果記録
    const tokyoBaySummerRecord = {
      location: { latitude: 35.6762, longitude: 139.6503 },
      date: '2024-07-15T12:00:00Z',
      fishCaught: ['スズキ', 'アジ'],
      tideCondition: 'spring' // 大潮
    };

    // When: 釣果記録の詳細画面を開き、潮汐グラフを表示
    // Then: 正確な潮汐パターンが表示される
    // And: 動的スケール調整により適切な軸範囲が設定される
    // And: 大潮の特徴的なパターンが視覚的に確認できる
  });
});
```

#### TC-301-002: 相模湾冬期記録での動的スケール確認
```typescript
describe('TC-301-002: Sagami Bay Winter Record', () => {
  test('should adapt scale dynamically for winter conditions', async ({ page }) => {
    // Given: 相模湾での冬期釣果記録（小潮条件）
    const sagamiBayWinterRecord = {
      location: { latitude: 35.3213, longitude: 139.5459 },
      date: '2024-01-20T14:00:00Z',
      fishCaught: ['カワハギ'],
      tideCondition: 'neap' // 小潮
    };

    // When: 潮汐グラフを表示
    // Then: 小潮の小さな潮位変化に合わせてスケールが調整される
    // And: TASK-101の動的スケール機能が正しく動作する
    // And: 0.5m-2.0m程度の範囲でグラフが表示される
  });
});
```

#### TC-301-003: キャッシュ効果による高速化確認
```typescript
describe('TC-301-003: Cache Performance Verification', () => {
  test('should improve load times with cache strategy', async ({ page }) => {
    // Given: 既に一度表示した地域の釣果記録
    const cachedLocation = { latitude: 34.6937, longitude: 135.5023 }; // 大阪湾

    // When: 同じ地域の別の日付の記録を表示
    // Then: TASK-201のキャッシュ戦略により高速化される
    // And: 初回ロード < 2秒、2回目以降 < 1秒
    // And: ネットワークリクエストが削減される
  });
});
```

#### TC-301-004: 複数地域の比較表示
```typescript
describe('TC-301-004: Multiple Location Comparison', () => {
  test('should handle various regional tide patterns', async ({ page }) => {
    const testCases = [
      { name: '東京湾', location: { latitude: 35.6762, longitude: 139.6503 }, expectedRange: [0, 2.5] },
      { name: '広島湾', location: { latitude: 34.3853, longitude: 132.4553 }, expectedRange: [0, 4.0] },
      { name: '有明海', location: { latitude: 33.1833, longitude: 130.2167 }, expectedRange: [-1, 6.0] },
      { name: '瀬戸内海', location: { latitude: 34.3400, longitude: 133.9167 }, expectedRange: [0, 3.5] }
    ];

    // 各地域の特徴的な潮汐パターンを確認
  });
});
```

### 2. レスポンシブ対応のE2Eテスト

#### TC-301-005: デスクトップレスポンシブ表示
```typescript
describe('TC-301-005: Desktop Responsive Display', () => {
  const desktopSizes = [
    { name: 'Full HD', width: 1920, height: 1080 },
    { name: 'HD', width: 1366, height: 768 },
    { name: 'Large Desktop', width: 2560, height: 1440 }
  ];

  desktopSizes.forEach(size => {
    test(`should display correctly on ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
      // Given: 指定サイズでのブラウザ表示
      // When: 潮汐グラフを表示
      // Then: 適切なレイアウトとサイズで表示される
      // And: 全ての要素が視認可能
      // And: スクロールが不要
    });
  });
});
```

#### TC-301-006: タブレット向け表示確認
```typescript
describe('TC-301-006: Tablet Display Verification', () => {
  const tabletSizes = [
    { name: 'iPad', width: 768, height: 1024, orientation: 'portrait' },
    { name: 'iPad Landscape', width: 1024, height: 768, orientation: 'landscape' },
    { name: 'Android Tablet', width: 800, height: 1280, orientation: 'portrait' }
  ];

  tabletSizes.forEach(device => {
    test(`should work on ${device.name}`, async ({ page }) => {
      // タッチ操作対応の確認
      // 画面回転時の表示継続性
      // グラフの可読性維持
    });
  });
});
```

#### TC-301-007: モバイル端末での操作性
```typescript
describe('TC-301-007: Mobile Device Usability', () => {
  const mobileDevices = [
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Pixel 5', width: 393, height: 851 },
    { name: 'iPhone SE', width: 375, height: 667 }
  ];

  mobileDevices.forEach(device => {
    test(`should be usable on ${device.name}`, async ({ page }) => {
      // Given: モバイルデバイスサイズ
      // When: 潮汐グラフをタッチ操作
      // Then: スムーズなスクロール・ズーム
      // And: 適切なタッチターゲットサイズ
      // And: 読みやすいフォントサイズ
    });
  });
});
```

### 3. パフォーマンス回帰テストの自動化

#### TC-301-008: レンダリング性能測定
```typescript
describe('TC-301-008: Rendering Performance', () => {
  test('should meet performance requirements', async ({ page }) => {
    // Given: パフォーマンス測定の準備
    const performanceObserver = new PerformanceObserver((list) => {
      // パフォーマンスメトリクスの収集
    });

    // When: 潮汐グラフをロード
    // Then: First Contentful Paint < 1.5秒
    // And: Largest Contentful Paint < 2秒
    // And: Cumulative Layout Shift < 0.1
    // And: First Input Delay < 100ms
  });
});
```

#### TC-301-009: メモリ使用量監視
```typescript
describe('TC-301-009: Memory Usage Monitoring', () => {
  test('should stay within memory limits', async ({ page }) => {
    // Given: メモリ使用量の初期状態
    let initialMemory, peakMemory, finalMemory;

    // When: 複数の釣果記録を連続表示
    for (let i = 0; i < 10; i++) {
      // 異なる地域・日付の記録を表示
      // メモリ使用量を継続監視
    }

    // Then: ピークメモリ使用量 < 100MB
    // And: メモリリークがない（最終使用量 ≈ 初期使用量）
    // And: TASK-202の基準を満たす
  });
});
```

#### TC-301-010: Lighthouse Performance Score
```typescript
describe('TC-301-010: Lighthouse Integration', () => {
  test('should achieve high Lighthouse scores', async ({ page }) => {
    // Given: Lighthouse測定環境
    const lighthouse = await import('lighthouse');

    // When: 潮汐グラフページを測定
    const results = await lighthouse.run(page.url(), {
      port: 9222,
      onlyCategories: ['performance', 'accessibility', 'best-practices']
    });

    // Then: Performance Score > 90
    // And: Accessibility Score > 95
    // And: Best Practices Score > 90
    expect(results.lhr.categories.performance.score).toBeGreaterThan(0.90);
  });
});
```

### 4. アクセシビリティテストの追加

#### TC-301-011: スクリーンリーダー対応確認
```typescript
describe('TC-301-011: Screen Reader Support', () => {
  test('should work with screen readers', async ({ page }) => {
    // Given: スクリーンリーダー環境のシミュレート
    await page.addInitScript(() => {
      // NVDA/JAWSの動作をシミュレート
    });

    // When: 潮汐グラフを音声読み上げ
    // Then: 適切なARIA属性が設定されている
    // And: alt属性でグラフ内容が説明される
    // And: 時系列データが音声で理解可能
  });
});
```

#### TC-301-012: キーボードナビゲーション
```typescript
describe('TC-301-012: Keyboard Navigation', () => {
  test('should support full keyboard navigation', async ({ page }) => {
    // Given: マウス使用不可の環境
    // When: キーボードのみで操作
    // Then: Tabキーで全要素にアクセス可能
    // And: 矢印キーでグラフ内移動
    // And: Enterキーで詳細表示
    // And: Escapeキーで閉じる操作
  });
});
```

#### TC-301-013: 色覚障害者対応確認
```typescript
describe('TC-301-013: Color Vision Deficiency Support', () => {
  test('should be accessible for color blind users', async ({ page }) => {
    // Given: 色覚障害のシミュレート（プロタノピア、デューテラノピア、トリタノピア）
    const colorBlindnessTypes = ['protanopia', 'deuteranopia', 'tritanopia'];

    for (const type of colorBlindnessTypes) {
      // When: 色覚障害フィルターを適用
      // Then: 色以外の手段でも情報が識別可能
      // And: 適切なコントラスト比が維持される
      // And: パターンや形状での区別が可能
    }
  });
});
```

### 5. クロスブラウザテスト

#### TC-301-014: Chrome系ブラウザでの動作確認
```typescript
describe('TC-301-014: Chrome Browser Compatibility', () => {
  test('should work correctly on Chrome desktop', async ({ page }) => {
    // Chromiumベースでの基本動作確認
  });

  test('should work correctly on Chrome mobile', async ({ page }) => {
    // Chrome Mobile での表示・操作確認
  });
});
```

#### TC-301-015: Firefox系ブラウザでの動作確認
```typescript
describe('TC-301-015: Firefox Browser Compatibility', () => {
  test('should maintain functionality on Firefox', async ({ page }) => {
    // FirefoxでのJavaScript API互換性確認
    // CSS Grid/Flexbox表示確認
    // Canvas描画性能確認
  });
});
```

#### TC-301-016: Safari/WebKit系での動作確認
```typescript
describe('TC-301-016: Safari WebKit Compatibility', () => {
  test('should function properly on Safari desktop', async ({ page }) => {
    // Safari固有のレンダリング確認
    // WebKit JavaScript エンジンでの動作確認
  });

  test('should work on iOS Safari', async ({ page }) => {
    // iOS Safari での表示確認
    // タッチジェスチャー対応確認
  });
});
```

### 6. エッジケーステスト

#### TC-301-017: エラー状態でのユーザビリティ
```typescript
describe('TC-301-017: Error State Usability', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Given: ネットワーク接続なし
    await page.route('**/*', route => route.abort());

    // When: 潮汐グラフを表示しようとする
    // Then: 適切なエラーメッセージが表示される
    // And: 再試行ボタンが利用可能
    // And: オフラインでも基本機能が動作
  });

  test('should handle invalid location data', async ({ page }) => {
    // 不正な座標データでの挙動確認
    // 潮汐データなし地域での対応確認
  });
});
```

#### TC-301-018: 大量データでの性能確認
```typescript
describe('TC-301-018: Large Dataset Performance', () => {
  test('should handle large fishing record datasets', async ({ page }) => {
    // Given: 1000件以上の釣果記録
    // When: リスト表示・検索・フィルタリング
    // Then: レスポンスタイム < 2秒
    // And: UIの応答性維持
    // And: メモリ使用量の適切な管理
  });
});
```

## 🎯 テスト実行計画

### Phase 1: 基本機能テスト
1. TC-301-001～004: 異なる釣果記録での表示確認
2. TC-301-017～018: エラーケース・大量データ

### Phase 2: レスポンシブ・クロスブラウザテスト
3. TC-301-005～007: レスポンシブ表示確認
4. TC-301-014～016: クロスブラウザ互換性

### Phase 3: パフォーマンス・アクセシビリティテスト
5. TC-301-008～010: パフォーマンス測定
6. TC-301-011～013: アクセシビリティ確認

## ✅ 成功基準

### 機能テスト成功基準
- 全テストケースで期待される動作を確認
- 各地域・時期の潮汐パターンが正確に表示
- 動的スケール調整とキャッシュ機能が正常動作

### パフォーマンス成功基準
- レンダリング時間 < 2秒
- メモリ使用量 < 100MB
- Lighthouse Performance Score > 90

### アクセシビリティ成功基準
- WCAG 2.1 AA準拠
- Lighthouse Accessibility Score > 95
- axe-core 違反件数 = 0

### 互換性成功基準
- Chrome/Firefox/Safari での動作確認完了
- デスクトップ・タブレット・モバイルでの表示確認完了
- 横向き・縦向き両対応での動作確認完了

---

**作成日**: 2024-09-26
**ステータス**: テストケース設計完了
**次のステップ**: テスト実装（Red Phase）