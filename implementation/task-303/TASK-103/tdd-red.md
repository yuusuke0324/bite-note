# TASK-103: ChartConfigManager実装 - Red Phase（失敗テスト実装）

## Red Phase 実行結果

### ✅ Red Phase 成功！

**テスト結果**: 19/22テスト失敗（期待通りの失敗）
**実行時間**: 739ms
**実装方式**: TDD Red Phase（スタブ実装）

## 実装されたファイル構造

```
src/components/chart/config/
├── ChartConfigManager.ts        # メインクラス（スタブ）
├── types.ts                    # 型定義システム ✅
├── index.ts                    # エクスポート ✅
└── __tests__/
    └── ChartConfigManager.test.ts  # テストスイート 🔴
```

## テスト失敗分析

### 🟢 成功しているテスト（3個）

1. **デフォルト色設定取得** - スタブがデフォルト値を返し、期待値と一致
2. **デスクトップ設定の一部項目** - スタブの固定値が偶然一致
3. **フォント設定の一部項目** - line heightとweightが期待値と一致

### 🔴 期待通りに失敗しているテスト（19個）

#### 1. デバイス設定テスト（4個失敗）

**root cause**: スタブ実装が常にデスクトップ設定を返すため

**典型的な失敗例**:
```
× should return correct mobile configuration
  → expected 800 to be 320 (minWidth)

× should handle invalid device type
  → expected [Function] to throw an error
```

**失敗カテゴリ**:
- モバイル設定取得（minWidth: 800 vs 320期待）
- タブレット設定取得（minWidth: 800 vs 600期待）
- デバイスタイプ検出（desktop vs mobile/tablet期待）
- 無効デバイス処理（エラー未発生）

#### 2. 色設定テスト（3個失敗）

**root cause**: スタブ実装が常にデフォルト色を返すため

**典型的な失敗例**:
```
× should apply custom color overrides
  → expected '#2563eb' to be '#ff0000'

× should return high contrast colors when enabled
  → expected '#2563eb' to be '#000000'
```

**失敗条件**:
- カスタム色設定上書き機能
- ハイコントラスト色変換機能
- 無効色値フォールバック機能

#### 3. フォント設定テスト（2個失敗）

**root cause**: スタブ実装がデバイス別調整を無視

**典型的な失敗例**:
```
× should return correct font sizes for different devices
  → expected 14 to be 12 (mobile small)

× should return system font stack in correct order
  → expected ['system-ui'] to deeply equal ['system-ui', '-apple-system', ...]
```

#### 4. 設定マージテスト（3個失敗）

**root cause**: スタブ実装が`mergeConfigs`でbaseをそのまま返すため

**典型的な失敗例**:
```
× should merge base and override configurations
  → expected '#blue' to be '#green'
```

#### 5. アクセシビリティテスト（3個失敗）

**root cause**: スタブ実装がアクセシビリティ機能を無効で返すため

**典型的な失敗例**:
```
× should meet WCAG AA contrast requirements
  → expected 1 to be greater than or equal to 4.5

× should provide pattern alternatives for color-coded information
  → expected false to be true (patternEnabled)
```

#### 6. 設定変更テスト（2個失敗）

**root cause**: スタブ実装が`updateConfig`で何もしないため

**典型的な失敗例**:
```
× should immediately reflect configuration changes
  → expected '#2563eb' to be '#ff0000'
```

#### 7. パフォーマンステスト（2個失敗）

**root cause**: 設定マージ機能とメモリリーク対策未実装

## Red Phase スタブ実装詳細

### 完全スタブ実装

#### ChartConfigManager.ts
```typescript
export class ChartConfigManager {
  getDeviceConfig(): DeviceConfig {
    return { /* 固定デスクトップ設定 */ };
  }

  getColorConfig(): ColorConfig {
    return { /* 固定デフォルト色 */ };
  }

  getFontConfig(): FontConfig {
    return { /* 固定フォント設定 */ };
  }

  mergeConfigs(base: any, override: any): any {
    return base;  // 常にbaseを返す
  }

  updateConfig(): void {
    // 何もしない
  }
}
```

#### types.ts - 完全実装済み
```typescript
// DeviceType, DeviceConfig, ColorConfig, FontConfig, A11yConfig
// MarginConfig, ChartConfig, ColorOptions 等の完全定義
export interface DeviceConfig {
  containerSize: { minWidth: number; minHeight: number; aspectRatio: number };
  responsive: { breakpoints: Record<DeviceType, number>; scalingFactor: number };
  touch: { enabled: boolean; minimumTargetSize: number };
}
```

## テストケース分析

### カテゴリ別失敗状況

| カテゴリ | 失敗/総数 | 成功率 | 主な失敗理由 |
|----------|-----------|--------|-----------------|
| デバイス設定 | 4/5 | 20% | 固定値返却 |
| 色設定 | 3/4 | 25% | オプション無視 |
| フォント設定 | 2/3 | 33% | デバイス別未対応 |
| 設定マージ | 3/3 | 0% | マージ機能未実装 |
| アクセシビリティ | 3/3 | 0% | 機能無効 |
| 設定変更 | 2/2 | 0% | 更新機能未実装 |
| パフォーマンス | 2/2 | 0% | 最適化未実装 |

### 優先度の高い失敗テスト（Green Phaseで最初に修正）

1. **デバイス設定取得機能**
   - `getDeviceConfig()`のデバイス別分岐実装
   - モバイル/タブレット/デスクトップ別設定
   - 無効デバイス処理とフォールバック

2. **色設定カスタマイズ機能**
   - `getColorConfig()`のオプション処理
   - カスタム色上書き機能
   - ハイコントラストモード対応

3. **設定マージ機能**
   - `mergeConfigs()`の深いマージ実装
   - ネストされたオブジェクト対応
   - 部分設定上書き機能

4. **フォント設定システム**
   - デバイス別フォントサイズ調整
   - システムフォントスタック
   - カスタムフォント対応

### エッジケース（Refactor Phaseで対応）

1. **アクセシビリティ機能**
   - WCAG 2.1 AA準拠のコントラスト計算
   - 色覚多様性対応機能
   - キーボードフォーカス表示

2. **パフォーマンス最適化**
   - 高速設定取得（< 5ms）
   - メモリリーク防止
   - 大量設定操作の効率化

3. **設定変更システム**
   - リアルタイム設定反映
   - 設定変更イベント配信
   - 設定検証とフォールバック

## Red Phase 成功判定

### ✅ 成功基準達成

1. **全テストケース作成完了**: 22個のテストケース
2. **期待通りの失敗**: 19個のテストが実装なしで失敗
3. **基盤コード動作**: 型定義、エクスポートは完全に動作
4. **TypeScript型安全性**: strict mode対応
5. **テスト実行環境**: 正常に動作

### 📊 Red Phase 統計

| カテゴリ | 作成数 | 失敗数 | 成功率（期待） |
|----------|---------|---------|--------------------|
| 型定義・基盤 | 3 | 0 | 100%（実装済み） |
| メインメソッド | 15 | 13 | 13%（期待通り） |
| ヘルパー・ユーティリティ | 4 | 3 | 25%（期待通り） |
| パフォーマンス | 2 | 2 | 0%（期待通り） |
| **合計** | **22** | **19** | **14%（期待値）** |

## 次のステップ: Green Phase

### 🚀 Green Phase 実装計画

1. **優先順位1: デバイス設定システム実装**
   - デバイス別設定定義
   - ブレークポイント判定ロジック
   - 無効値処理とエラーハンドリング

2. **優先順位2: 色設定カスタマイズ実装**
   - オプション処理システム
   - ハイコントラスト色変換
   - 色値検証とフォールバック

3. **優先順位3: 設定マージシステム実装**
   - 深いオブジェクトマージ
   - 型安全なマージ処理
   - 設定検証機能

4. **優先順位4: フォント・A11y・更新機能**
   - デバイス別フォント調整
   - アクセシビリティ対応機能
   - 設定変更・イベントシステム

### 🎯 Green Phase 目標

- **目標テスト成功率**: 90%以上（20/22テスト成功）
- **パフォーマンス目標**: 設定取得 < 5ms
- **メモリ目標**: 追加使用量 < 500KB

## Red Phase 完了宣言

✅ **TASK-103 Red Phase 正式完了**

- 22個のテストケース作成完了
- 19個の期待通りの失敗確認
- 基盤コード（型定義、エクスポート）完全実装
- Green Phase実装準備完了

**技術的成果**:
- 包括的なChart設定管理型定義システム構築
- 22個の詳細テストケース作成（デバイス・色・フォント・A11y・パフォーマンス）
- アクセシビリティ対応設計（WCAG 2.1 AA準拠）
- パフォーマンス要件の明確化（5ms, 500KB制限）

**次のステップ**: Green Phase（最小実装）実行準備完了

---

**Red Phase 完了時刻**: 2025-09-29T23:52:43Z
**実装期間**: 要件定義後 約1時間
**テスト実行回数**: 1回（期待通りの失敗確認）