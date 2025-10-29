# TASK-102: グラフパターンの多様性検証機能 - 要件定義

## 概要

潮汐グラフの表示において、異なる座標・日時・釣果記録で視覚的に区別可能なグラフパターンが生成されることを検証する機能を実装します。これにより、座標変動係数・季節変動係数が適切に機能し、ユーザーが各釣果記録の潮汐状況を正確に把握できることを保証します。

## 背景・課題

### 現在の問題
潮汐グラフ改善前の状況では、以下の問題が発生していました：
- 異なる日時・場所の釣果記録でも同一のグラフパターンが表示
- 縦軸スケールが常に固定で、潮位差の視覚的区別が困難
- 座標変動係数・季節変動係数の効果が不明確

### 解決目標
- 各釣果記録で固有のグラフパターンを生成
- 座標・日時による潮汐特性の違いを視覚的に表現
- 変動係数の効果を定量的に測定・検証

## 機能要件

### FR-201: グラフパターン多様性分析エンジン

**目的**: 潮汐グラフの多様性を定量的に分析し、視覚的区別可能性を検証する

**要件**:
- 複数の釣果記録での潮汐計算結果の比較分析
- グラフパターンの固有性スコア算出
- 視覚的差異の定量化（ピーク・ボトムの位置、潮位レンジ、波形特徴）
- 統計的な分散・標準偏差の計算

**入力**:
```typescript
interface GraphPatternAnalysisInput {
  fishingRecords: FishingRecord[]; // 分析対象の釣果記録
  analysisOptions?: {
    includeCoordinateVariation?: boolean; // 座標変動係数の考慮
    includeSeasonalVariation?: boolean;   // 季節変動係数の考慮
    samplingInterval?: number;            // サンプリング間隔（分）
  };
}
```

**出力**:
```typescript
interface GraphPatternAnalysisResult {
  diversity: {
    uniquenessScore: number;      // 固有性スコア (0-1)
    visualSeparability: number;   // 視覚的区別可能性 (0-1)
    patternVariance: number;      // パターン分散
  };
  patterns: GraphPatternInfo[];   // 各記録のパターン情報
  summary: {
    totalRecords: number;
    uniquePatterns: number;
    duplicatePatterns: number;
    averageDifference: number;
  };
}
```

### FR-202: 変動係数効果測定機能

**目的**: 座標変動係数・季節変動係数の効果を定量的に測定する

**要件**:
- 変動係数なし vs ありでの計算結果比較
- 各係数の個別効果測定
- 効果の統計的有意性検証
- 地理的・時間的影響範囲の分析

**入力**:
```typescript
interface VariationEffectAnalysisInput {
  baseLocation: Coordinates;     // 基準座標
  testLocations: Coordinates[];  // 測定対象座標
  dateRange: DateRange;          // 分析期間
  analysisType: 'coordinate' | 'seasonal' | 'both';
}
```

**出力**:
```typescript
interface VariationEffectResult {
  coordinateEffect?: {
    averageImpact: number;        // 平均影響度（%）
    maxImpact: number;           // 最大影響度（%）
    spatialRange: number;        // 影響範囲（km）
  };
  seasonalEffect?: {
    averageImpact: number;
    peakSeasonImpact: number;    // ピーク時影響度
    seasonalCycle: number;       // 季節サイクル強度
  };
  combinedEffect: {
    synergy: number;             // 相乗効果（%）
    totalVariation: number;      // 総変動量
  };
}
```

### FR-203: デバッグ情報表示機能

**目的**: 開発・運用時の問題診断支援のためのデバッグ情報提供

**要件**:
- 潮汐計算パラメータの詳細表示
- 変動係数の内部計算過程表示
- グラフ生成ステップの可視化
- パフォーマンス統計の収集

**出力**:
```typescript
interface TideCalculationDebugInfo {
  calculation: {
    baseParameters: HarmonicParameters;
    coordinateFactors: CoordinateVariationFactors;
    seasonalFactors: SeasonalVariationFactors;
    finalParameters: HarmonicParameters;
  };
  performance: {
    calculationTime: number;      // 計算時間（ms）
    cacheHitRate: number;        // キャッシュヒット率（%）
    memoryUsage: number;         // メモリ使用量（KB）
  };
  quality: {
    dataIntegrity: boolean;      // データ整合性
    calculationAccuracy: number; // 計算精度スコア
    warnings: string[];          // 警告メッセージ
  };
}
```

## 非機能要件

### NFR-201: パフォーマンス要件

- **分析処理時間**: 100件の釣果記録で5秒以内
- **メモリ使用量**: 分析処理で追加100MB以内
- **リアルタイム性**: デバッグ情報表示1秒以内

### NFR-202: 精度要件

- **計算精度**: 潮位値の誤差±5cm以内
- **分析精度**: パターン類似度判定95%以上の精度
- **統計的信頼性**: 95%信頼区間での分析結果

### NFR-203: 保守性要件

- **モジュラー設計**: 分析機能の独立性確保
- **拡張性**: 新しい分析指標の追加容易性
- **デバッグ性**: 問題箇所の特定支援機能

## 受け入れ基準

### AC-201: 基本多様性検証

- [ ] 異なる座標（東京湾 vs 大阪湾）で異なるグラフパターンが生成される
- [ ] 同一座標の異なる日時（春分 vs 夏至）で異なるパターンが生成される
- [ ] 固有性スコアが0.7以上（70%以上のユニーク性）を達成する
- [ ] 視覚的区別可能性スコアが0.8以上を達成する

### AC-202: 変動係数効果確認

- [ ] 座標変動係数により緯度・経度差の影響が潮位計算に反映される
- [ ] 季節変動係数により月日差の影響が潮位計算に反映される
- [ ] 変動係数なしとありで統計的有意差（p<0.05）が確認される
- [ ] 効果測定結果がドメイン知識と整合している

### AC-203: デバッグ支援機能

- [ ] 計算パラメータの詳細情報が正確に表示される
- [ ] パフォーマンス統計が適切に収集・表示される
- [ ] 問題診断に必要な情報が網羅されている
- [ ] デバッグ情報の表示・非表示が制御可能である

### AC-204: 統合性・実用性

- [ ] 既存の潮汐計算システムと統合できる
- [ ] TideGraphコンポーネントでの表示に活用できる
- [ ] 大量データでの処理が実用的な速度で動作する
- [ ] 分析結果がユーザー理解しやすい形式で提供される

## テストケース概要

### 単体テスト

1. **パターン分析ロジック**
   - 同一データでの一貫した結果確認
   - 異なるデータでの適切な差異検出
   - 固有性スコア計算の正確性確認

2. **変動係数効果測定**
   - 座標変動係数の効果測定精度
   - 季節変動係数の効果測定精度
   - 統計計算の正確性

### 統合テスト

1. **実データでの多様性確認**
   - 実際の釣果記録での分析実行
   - 期待される多様性の確認
   - パフォーマンス要件の検証

2. **システム統合確認**
   - TideCalculationServiceとの連携
   - キャッシュシステムとの統合
   - エラーハンドリングの動作確認

### E2Eテスト

1. **ユーザーシナリオ**
   - 開発者のデバッグ作業支援
   - 品質保証担当者の検証作業
   - 本番環境での監視・分析

## 実装ファイル計画

### 新規作成

- `src/utils/analysis/GraphPatternAnalyzer.ts` - パターン分析エンジン
- `src/utils/analysis/VariationEffectMeasurer.ts` - 変動係数効果測定
- `src/utils/analysis/TideDebugger.ts` - デバッグ情報収集・表示
- `src/types/analysis.ts` - 分析関連の型定義

### 更新対象

- `src/services/tide/TideCalculationService.ts` - デバッグ情報統合
- `src/types/tide.ts` - 分析関連型の追加

### テストファイル

- `src/__tests__/utils/analysis/GraphPatternAnalyzer.test.ts`
- `src/__tests__/utils/analysis/VariationEffectMeasurer.test.ts`
- `src/__tests__/utils/analysis/TideDebugger.test.ts`
- `src/__tests__/integration/TideAnalysis.integration.test.ts`

## 設計考慮事項

### アーキテクチャ

- **責任分離**: 分析・測定・デバッグ機能の独立性
- **データフロー**: 既存計算エンジンからの情報取得最小化
- **インターフェース**: 分析結果の一貫したAPI設計

### パフォーマンス最適化

- **バッチ処理**: 複数記録の効率的な一括分析
- **キャッシュ活用**: 中間計算結果のキャッシュ
- **遅延評価**: 必要時のみの詳細分析実行

### 品質保証

- **統計的妥当性**: 信頼できる分析手法の採用
- **再現性**: 同一条件での一貫した結果
- **検証可能性**: 分析結果の妥当性検証機能

### 運用考慮

- **監視機能**: 分析品質の継続監視
- **ログ出力**: 問題診断のための詳細ログ
- **設定管理**: 分析パラメータの動的調整

---

**作成日**: 2024-09-25
**担当者**: 開発チーム
**レビュー者**: プロダクトオーナー