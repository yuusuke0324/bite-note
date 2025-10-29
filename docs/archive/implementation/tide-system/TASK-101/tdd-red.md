# TASK-101: 天体計算エンジン - テスト実装（Red Phase）

## 目的
失敗するテストを実装し、TDDの Red → Green → Refactor サイクルを開始する。
実装前にテストを書くことで、求められる機能を明確化する。

## テストファイル作成

### 1. テストディレクトリ準備

✅ `/src/services/tide/__tests__/` ディレクトリ作成完了

### 2. 失敗するテスト実装

✅ `CelestialCalculator.test.ts` 作成完了

- **テストケース数**: 23個
- **カバー範囲**: 月齢計算、太陽位置、月位置、統合計算、パフォーマンス、エラーハンドリング、境界値
- **天文データ**: 2024年天文年鑑の公式値を使用

### 3. Red Phase 確認

✅ テスト実行結果: **失敗**（期待通り）

```
Error: Failed to resolve import "../CelestialCalculator" from "src/services/tide/__tests__/CelestialCalculator.test.ts". Does the file exist?
```

**失敗理由**: `CelestialCalculator` クラスが未実装

### 4. 実装すべき機能（テストから明確化）

#### CelestialCalculator クラス
- `calculateMoonPhase(date: Date): MoonPhase`
- `calculateCelestialPositions(date: Date): CelestialPosition`
- `calculateAll(date: Date): { moonPhase, positions }`

#### ユーティリティ関数
- `normalizeAngle(angle: number): number`
- `julianDay(date: Date): number`

#### 精度要件（テストから）
- 月齢: ±0.1日
- 太陽・月位置: ±1度
- 計算時間: 50ms/回
- 大量計算: 5秒/365回

### 5. Next Step

Green Phase で最小実装を行い、テストを通す。