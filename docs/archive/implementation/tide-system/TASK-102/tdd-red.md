# TASK-102: 調和解析エンジン - Red Phase（失敗テスト実装）

## 概要
TDD Red Phaseとして、調和解析エンジンの全機能に対するテストを実装。
意図的に失敗するテストを作成し、実装のガイドラインとする。

## 実装ファイル

### テストファイル作成
✅ `src/services/tide/__tests__/HarmonicAnalysisEngine.test.ts` 作成完了

## Red Phase テスト結果

### ❌ **期待通りの失敗**
```
Error: Failed to resolve import "../HarmonicAnalysisEngine" from "src/services/tide/__tests__/HarmonicAnalysisEngine.test.ts". Does the file exist?

 Test Files  1 failed (1)
      Tests  no tests
```

**失敗理由**: `HarmonicAnalysisEngine`クラスが存在しないため、インポートエラーが発生。これは期待通りの結果。

## 実装済みテストケース

### 1. 分潮定義システムテスト (8テスト)
- **TC-H001~H006**: 主要6分潮の角周波数精度テスト
  - M2: 28.984104°/hour
  - S2: 30.000000°/hour
  - K1: 15.041069°/hour
  - O1: 13.943035°/hour
  - Mf: 1.098033°/hour
  - Mm: 0.544375°/hour
- **TC-H007**: 分潮周期と角周波数の整合性テスト
- **TC-H008**: 天体位置からの分潮係数計算テスト

### 2. 潮位計算エンジンテスト (6テスト)
- **TC-H009**: 単一M2分潮の潮位計算
- **TC-H010**: 複数分潮の合成計算
- **TC-H011**: 全6分潮の合成計算
- **TC-H012**: 24時間での潮位連続性
- **TC-H013**: ゼロ振幅での計算
- **TC-H014**: 極端な振幅での計算

### 3. 満潮・干潮検出システムテスト (5テスト)
- **TC-H015**: 単純なM2分潮での満潮・干潮検出
- **TC-H016**: 満潮・干潮時刻の精度検証
- **TC-H017**: 複数分潮での極値検出
- **TC-H018**: 短時間での極値検出
- **TC-H019**: フラットな潮位での極値検出

### 4. 潮汐強度計算システムテスト (3テスト)
- **TC-H020**: 潮位変化率の計算
- **TC-H021**: 強度スケールの妥当性
- **TC-H022**: 上げ潮・下げ潮の判定

### 5. 統合テスト (2テスト)
- **TC-H023**: 天体計算エンジンとの連携
- **TC-H024**: 24時間連続計算の安定性

### 6. パフォーマンステスト (3テスト)
- **TC-H025**: 単一時刻計算が1ms以内
- **TC-H026**: 24時間分計算が100ms以内
- **TC-H027**: 極値検出パフォーマンス

### 7. エラーハンドリングテスト (4テスト)
- **TC-H028**: 無効な日時でエラー
- **TC-H029**: 空の調和定数配列でエラー
- **TC-H030**: 未知の分潮名でエラー
- **TC-H031**: null入力でエラー

## テスト設計の特徴

### 包括的なカバレッジ
- **総計31テストケース**: 全機能を網羅
- **境界値テスト**: 極端なケース（ゼロ振幅、極大振幅等）
- **エラーケース**: 不正入力に対する適切なハンドリング
- **パフォーマンス**: 実用性能の保証

### 現実的な精度要件
- **角周波数**: ±0.000001°/hour精度
- **潮位計算**: 現実的な誤差範囲
- **時刻精度**: ±10分（実用レベル）
- **計算速度**: <1ms（単一時刻）、<100ms（24時間）

### インターフェース設計
```typescript
interface HarmonicAnalysisEngine {
  // 分潮管理
  getConstituentFrequency(name: string): number;
  getConstituentPeriod(name: string): number;
  calculateConstituentFactors(dateTime: Date): ConstituentFactor[];

  // 潮位計算
  calculateTideLevel(dateTime: Date, harmonicConstants: HarmonicConstant[]): number;

  // 極値検出
  findTidalExtremes(startDate: Date, endDate: Date, harmonicConstants: HarmonicConstant[]): TidalExtreme[];

  // 潮汐強度
  calculateTideStrength(dateTime: Date, harmonicConstants: HarmonicConstant[]): TideStrength;
}
```

## Red Phase成功基準

✅ **テスト失敗確認**
- [x] インポートエラーでテストが失敗
- [x] 31テストケースが定義済み
- [x] 型定義が正しく参照されている
- [x] 現実的なテストデータを使用

✅ **設計品質確認**
- [x] インターフェースが明確に定義されている
- [x] エラーハンドリングが考慮されている
- [x] パフォーマンス要件が明確
- [x] 天体計算エンジンとの連携が設計されている

## 依存関係と型定義

### 必要な型定義（types/tide.ts）
- `HarmonicConstant`: 調和定数（振幅・位相）
- `TidalExtreme`: 満潮・干潮情報
- `TideStrength`: 潮汐強度情報
- `ConstituentFactor`: 分潮係数情報

### 依存サービス
- `CelestialCalculator`: 天体位置計算（TASK-101）
- `celestial-utils`: 角度・時刻変換ユーティリティ
- `astronomical-constants`: 天文定数

## Next Steps

Red Phase完了。次はGreen Phase（最小実装）でテストを通す実装を行う。

### Green Phase実装方針
1. **HarmonicAnalysisEngine クラス作成**
2. **分潮定義システム実装** - 基本的な6分潮定義
3. **潮位計算エンジン実装** - 調和解析公式の実装
4. **極値検出アルゴリズム実装** - 数値微分による検出
5. **潮汐強度計算実装** - 変化率ベースの強度算出

### 実装順序
1. 基本インターフェース → 分潮定義 → 潮位計算 → 極値検出 → 強度計算 → エラーハンドリング
2. パフォーマンステストは最後に検証