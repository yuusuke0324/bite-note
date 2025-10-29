# TASK-103: ChartConfigManager実装 - 要件定義

## 概要

グラフ設定を一元管理するConfigManagerを実装する。デバイス別設定分岐、色・フォント・マージン設定、アクセシビリティ対応設定を含む包括的な設定システム。

## 🎯 実装目標

### 主要機能
1. **デバイス別設定管理** - モバイル/タブレット/デスクトップ別設定
2. **色・フォント・マージン設定** - 視覚的外観のカスタマイズ
3. **アクセシビリティ対応** - WCAG 2.1 AA準拠、色覚多様性対応
4. **設定マージ機能** - デフォルト設定と個別設定の統合

## 📋 詳細要件

### REQ-401: アクセシビリティ対応

#### A41-01: ハイコントラスト対応
- **必須**: WCAG 2.1 AA準拠のコントラスト比確保
- **対象**: テキスト、グラフ線、背景色
- **基準**: テキスト 4.5:1以上、大文字 3:1以上

#### A41-02: 色覚多様性対応
- **必須**: 色のみに依存しない情報表示
- **対象**: グラフ線、凡例、ステータス表示
- **手法**: パターン、テクスチャ、形状の併用

#### A41-03: フォーカス表示
- **必須**: キーボードナビゲーション対応
- **対象**: インタラクティブ要素全て
- **仕様**: 明確なフォーカスリング表示

### REQ-501: 設定可能項目

#### S51-01: 色設定
- **必須**: グラフ線色、背景色、軸色の個別設定
- **形式**: HEX色指定対応 (#RRGGBB)
- **検証**: 有効性チェック、フォールバック色

#### S51-02: フォント設定
- **必須**: フォントサイズ、フォントファミリー変更
- **範囲**: サイズ 10-24px、システムフォント対応
- **レスポンシブ**: デバイス別自動調整

#### S51-03: マージン・スペース設定
- **必須**: グラフマージン、軸間隔の調整
- **範囲**: 最小値保証、最大値制限
- **自動計算**: デバイス別最適値算出

## 🏗️ システム設計

### クラス設計

#### ChartConfigManager
```typescript
class ChartConfigManager {
  // デバイス別設定取得
  getDeviceConfig(deviceType: DeviceType): DeviceConfig

  // 色設定管理
  getColorConfig(options?: ColorOptions): ColorConfig

  // フォント設定管理
  getFontConfig(deviceType?: DeviceType): FontConfig

  // マージン設定管理
  getMarginConfig(containerSize: Size): MarginConfig

  // 設定マージ
  mergeConfigs(base: Config, override: Partial<Config>): Config

  // アクセシビリティ対応設定
  getA11yConfig(options: A11yOptions): A11yConfig
}
```

### 型定義システム

#### 基本型
```typescript
// デバイスタイプ
type DeviceType = 'mobile' | 'tablet' | 'desktop';

// サイズ情報
interface Size {
  width: number;
  height: number;
}

// カラーパレット
interface ColorConfig {
  primary: string;      // メインライン色
  secondary: string;    // サブライン色
  background: string;   // 背景色
  grid: string;        // グリッド線色
  text: string;        // テキスト色
  accent: string;      // アクセント色
}
```

#### デバイス設定
```typescript
interface DeviceConfig {
  containerSize: {
    minWidth: number;
    minHeight: number;
    aspectRatio: number;
  };
  responsive: {
    breakpoints: Record<DeviceType, number>;
    scalingFactor: number;
  };
  touch: {
    enabled: boolean;
    minimumTargetSize: number; // 44px minimum
  };
}
```

#### フォント設定
```typescript
interface FontConfig {
  family: string[];     // フォントファミリー優先順位
  size: {
    small: number;      // 軸ラベルなど
    medium: number;     // 通常テキスト
    large: number;      // タイトルなど
  };
  weight: {
    normal: number;     // 400
    bold: number;       // 700
  };
  lineHeight: number;   // 1.4-1.6
}
```

#### アクセシビリティ設定
```typescript
interface A11yConfig {
  highContrast: {
    enabled: boolean;
    colorOverrides: Partial<ColorConfig>;
  };
  colorBlindness: {
    type?: 'protanopia' | 'deuteranopia' | 'tritanopia';
    patternEnabled: boolean;
    shapeMarkers: boolean;
  };
  reducedMotion: {
    enabled: boolean;
    animationDuration: number; // 0 if disabled
  };
  fontSize: {
    scaling: number;    // 1.0 = normal, up to 2.0
  };
}
```

## 🎨 デザイン仕様

### デフォルト色パレット

#### 通常モード
- **Primary**: #2563eb (青) - メインライン
- **Secondary**: #dc2626 (赤) - 警告・エラー
- **Background**: #ffffff (白) - 背景
- **Grid**: #e5e7eb (グレー) - グリッド線
- **Text**: #374151 (濃いグレー) - テキスト
- **Accent**: #059669 (緑) - アクセント

#### ハイコントラストモード
- **Primary**: #000000 (黒) - メインライン
- **Secondary**: #ff0000 (赤) - 警告・エラー
- **Background**: #ffffff (白) - 背景
- **Grid**: #808080 (グレー) - グリッド線
- **Text**: #000000 (黒) - テキスト
- **Accent**: #0000ff (青) - アクセント

### レスポンシブブレークポイント
- **Mobile**: 0-767px
- **Tablet**: 768-1023px
- **Desktop**: 1024px+

### フォント設定
- **Family**: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Mobile**: 12/14/16px (小/中/大)
- **Tablet**: 13/15/18px
- **Desktop**: 14/16/20px

## 🧪 テスト要件

### 単体テスト (15個)

#### デバイス設定テスト (5個)
1. モバイル設定取得テスト
2. タブレット設定取得テスト
3. デスクトップ設定取得テスト
4. 無効デバイスタイプ処理
5. ブレークポイント判定テスト

#### 色設定テスト (4個)
1. デフォルト色設定取得
2. カスタム色設定適用
3. ハイコントラスト色変換
4. 無効色値フォールバック

#### フォント設定テスト (3個)
1. デバイス別フォントサイズ取得
2. フォントファミリー優先順位
3. 行間・ウェイト設定確認

#### 設定マージテスト (3個)
1. 基本設定マージ機能
2. 部分設定上書き
3. ネストされた設定マージ

### 統合テスト (5個)

#### アクセシビリティテスト (3個)
1. WCAG コントラスト比確認
2. 色覚多様性対応確認
3. キーボードフォーカス確認

#### 設定変更テスト (2個)
1. 設定変更時の即座反映
2. 設定無効時のフォールバック

## 🔧 実装制約

### パフォーマンス要件
- **設定取得時間**: < 5ms
- **メモリ使用量**: < 500KB
- **設定変更反映**: < 100ms

### 互換性要件
- **TypeScript**: strict mode対応
- **ブラウザー**: Modern browsers (ES2020+)
- **React**: v18+ 対応

### セキュリティ要件
- **入力検証**: 色値・サイズ値の厳密な検証
- **XSS対策**: innerHTML系処理の回避
- **設定永続化**: localStorage使用時の安全性確保

## 📦 エクスポート仕様

```typescript
// src/components/chart/config/index.ts
export { ChartConfigManager } from './ChartConfigManager';
export type {
  DeviceType,
  DeviceConfig,
  ColorConfig,
  FontConfig,
  A11yConfig,
  MarginConfig,
  ChartConfig
} from './types';
```

## ✅ 受け入れ基準

### 機能要件
- [ ] デバイス別設定が正確に取得できる
- [ ] 色・フォント・マージン設定が適用される
- [ ] WCAG 2.1 AAレベルのアクセシビリティ対応
- [ ] 設定のマージ・上書きが正常に動作する

### 品質要件
- [ ] 全テストケース（20個）が成功する
- [ ] TypeScript strict mode でエラーなし
- [ ] ESLint違反なし
- [ ] 90%以上のテストカバレッジ

### パフォーマンス要件
- [ ] 設定取得が5ms以内
- [ ] メモリ使用量が500KB以内
- [ ] 設定変更反映が100ms以内

---

**要件定義完了**: 2025-09-29
**実装開始**: TASK-103 TDD Step 2/6へ
**予想実装期間**: 約2時間