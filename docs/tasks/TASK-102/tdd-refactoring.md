# TASK-102: グラフパターンの多様性検証機能 - リファクタリング

## 概要

TDDのStep 5として、テストが全て通過した実装に対してリファクタリングを実施します。コードの品質、保守性、パフォーマンス、可読性を向上させつつ、既存のテスト結果を維持します。

## リファクタリング対象と改善項目

### 1. GraphPatternAnalyzer の改善

#### 現在の課題
- パターンシグネチャ生成の単純化
- 多様性計算の精度向上
- パフォーマンスの最適化

#### 改善計画
```typescript
// BEFORE: 単純なシグネチャ生成
return `${lat},${lng}@${dateStr}`;

// AFTER: より詳細で正確なシグネチャ
return `${lat}_${lng}_${month}_${season}_${tidePhase}`;
```

#### リファクタリング項目
- **座標精度の向上**: 0.01度から0.001度精度へ
- **季節考慮の強化**: 月・季節・潮汐フェーズの組み込み
- **視覚的特徴の拡張**: ピーク数、位相、周期性の詳細分析
- **キャッシュ戦略の最適化**: LRU + TTL方式への変更

### 2. VariationEffectMeasurer の改善

#### 現在の課題
- 距離計算の精度限界
- 季節効果の簡略化
- 統計的信頼性の不足

#### 改善計画
```typescript
// BEFORE: 簡単な線形距離計算
const distance = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 111;

// AFTER: 正確な地理計算と地形考慮
const distance = this.calculateGreatCircleDistance(point1, point2);
const terrainFactor = this.getTerrainCorrectionFactor(point1, point2);
const adjustedDistance = distance * terrainFactor;
```

#### リファクタリング項目
- **地理計算の精密化**: Great Circle Distance + 地形補正
- **季節変動の高精度化**: 天体力学的補正の追加
- **統計的検証の実装**: p値、信頼区間、標準誤差計算
- **複合効果モデルの改善**: 非線形相互作用の考慮

### 3. TideDebugger の改善

#### 現在の課題
- エラーハンドリングの分散
- パフォーマンス測定の不正確性
- 警告システムの不完全性

#### 改善計画
```typescript
// BEFORE: try-catch の分散配置
try {
  // 個別の処理
} catch (error) {
  console.error('Error:', error);
}

// AFTER: 中央集約エラーハンドリング
const result = await this.safeExecute(
  () => this.performCalculation(record),
  'TideDebugger.collectDebugInfo'
);
```

#### リファクタリング項目
- **エラーハンドリングの統一**: 中央集約型エラー管理
- **パフォーマンス測定の精密化**: High Resolution Timer使用
- **品質評価システムの強化**: 複数指標による総合評価
- **警告システムの階層化**: INFO/WARN/ERROR レベル分類

## 実装改善

### GraphPatternAnalyzer リファクタリング

#### 1. 高精度パターンシグネチャ生成
```typescript
/**
 * 改善されたパターンシグネチャ生成
 */
private static generateAdvancedPatternSignature(record: FishingRecord): string {
  const lat = Math.round(record.coordinates!.latitude * 1000) / 1000; // 0.001度精度
  const lng = Math.round(record.coordinates!.longitude * 1000) / 1000;

  const date = record.date instanceof Date ? record.date : new Date(record.date);
  const month = date.getMonth() + 1;
  const season = Math.floor((month - 1) / 3) + 1; // 1-4季節

  // 潮汐フェーズ計算（月齢基準）
  const tidePhase = this.calculateTidalPhase(date);

  return `${lat}_${lng}_${month}_${season}_${tidePhase}`;
}

/**
 * 潮汐フェーズ計算（新月からの日数ベース）
 */
private static calculateTidalPhase(date: Date): number {
  // 2024-01-11が新月として計算
  const newMoonReference = new Date('2024-01-11');
  const daysSinceNewMoon = Math.floor((date.getTime() - newMoonReference.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor((daysSinceNewMoon % 29.5) / 7.375); // 0-3の4段階
}
```

#### 2. 視覚的特徴の詳細分析
```typescript
/**
 * 拡張された視覚的特徴計算
 */
private static calculateEnhancedVisualFeatures(record: FishingRecord): GraphPatternInfo['visualFeatures'] {
  // 座標と日時からより精密な潮汐特徴を推定
  const coordinates = record.coordinates!;
  const date = record.date instanceof Date ? record.date : new Date(record.date);

  // 緯度による潮汐の違い（北ほど振幅小）
  const latitudeEffect = Math.cos((coordinates.latitude * Math.PI) / 180);
  const baseAmplitude = 100 * latitudeEffect;

  // 季節による振幅変動
  const dayOfYear = this.getDayOfYear(date);
  const seasonalAmplitude = Math.sin((dayOfYear * 2 * Math.PI) / 365) * 20;

  return {
    peakCount: this.estimatePeakCount(coordinates, date),
    averageAmplitude: baseAmplitude + seasonalAmplitude,
    phaseShift: this.calculatePhaseShift(coordinates),
    tideRange: this.estimateTideRange(coordinates, date)
  };
}
```

### VariationEffectMeasurer リファクタリング

#### 1. 高精度地理計算
```typescript
/**
 * Great Circle Distance計算（高精度版）
 */
private static calculateGreatCircleDistance(
  point1: AnalysisCoordinates,
  point2: AnalysisCoordinates
): number {
  const lat1Rad = this.toRadians(point1.lat);
  const lat2Rad = this.toRadians(point2.lat);
  const deltaLatRad = this.toRadians(point2.lat - point1.lat);
  const deltaLngRad = this.toRadians(point2.lng - point1.lng);

  const a = Math.sin(deltaLatRad / 2) ** 2 +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLngRad / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return this.EARTH_RADIUS_KM * c;
}

/**
 * 地形補正係数（海岸線の複雑さ考慮）
 */
private static getTerrainCorrectionFactor(
  point1: AnalysisCoordinates,
  point2: AnalysisCoordinates
): number {
  // 東京湾内（複雑な海岸線）vs 外洋（シンプル）の違いを近似
  const tokyoBayLat = [35.4, 35.8];
  const tokyoBayLng = [139.4, 140.0];

  const isPoint1InBay = this.isInRange(point1.lat, tokyoBayLat) &&
                       this.isInRange(point1.lng, tokyoBayLng);
  const isPoint2InBay = this.isInRange(point2.lat, tokyoBayLat) &&
                       this.isInRange(point2.lng, tokyoBayLng);

  if (isPoint1InBay && isPoint2InBay) return 1.2; // 湾内は複雑
  if (isPoint1InBay || isPoint2InBay) return 1.1; // 混合
  return 1.0; // 外洋間
}
```

#### 2. 統計的検証の実装
```typescript
/**
 * 統計的有意性の実際の計算
 */
static async validateStatisticalSignificance(
  result: VariationEffectResult,
  confidenceLevel: number = 0.95
): Promise<{ pValue: number; isSignificant: boolean; standardError: number }> {
  // サンプルサイズと効果量から統計検定
  const effectSize = result.combinedEffect.totalVariation;
  const sampleSize = 10; // 仮定（実際は分析データ数）

  // 標準誤差計算
  const standardError = Math.sqrt(effectSize * (1 - effectSize) / sampleSize);

  // t統計量計算
  const tStat = effectSize / standardError;
  const degreesOfFreedom = sampleSize - 1;

  // p値近似計算（簡略版）
  const pValue = this.calculatePValue(tStat, degreesOfFreedom);
  const criticalValue = this.getCriticalValue(confidenceLevel, degreesOfFreedom);

  return {
    pValue,
    isSignificant: Math.abs(tStat) > criticalValue,
    standardError
  };
}
```

### TideDebugger リファクタリング

#### 1. 中央集約エラーハンドリング
```typescript
/**
 * 安全実行ラッパー
 */
private static async safeExecute<T>(
  operation: () => Promise<T> | T,
  context: string
): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    const result = await operation();
    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${context}: ${errorMessage}`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * 改善されたデバッグ情報収集
 */
static async collectDebugInfo(record: FishingRecord): Promise<TideCalculationDebugInfo> {
  const startTime = this.getHighResolutionTime();

  // 基本検証
  const validationResult = await this.safeExecute(
    () => this.validateDataIntegrity(record),
    'DataValidation'
  );

  if (!validationResult.success) {
    return this.createErrorDebugInfo([`Validation failed: ${validationResult.error}`]);
  }

  // 計算処理
  const calculationResults = await Promise.all([
    this.safeExecute(() => this.generateBaseParameters(record), 'BaseParameters'),
    this.safeExecute(() => this.calculateCoordinateFactors(record.coordinates), 'CoordinateFactors'),
    this.safeExecute(() => this.calculateSeasonalFactors(record.date), 'SeasonalFactors')
  ]);

  const errors = calculationResults.filter(r => !r.success).map(r => r.error!);
  if (errors.length > 0) {
    return this.createErrorDebugInfo(errors);
  }

  // 成功時の処理続行...
}
```

#### 2. 階層化警告システム
```typescript
/**
 * 警告レベル定義
 */
enum WarningLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface StructuredWarning {
  level: WarningLevel;
  category: string;
  message: string;
  details?: any;
}

/**
 * 構造化警告生成
 */
private static generateStructuredWarnings(
  record: FishingRecord,
  coordinate: CoordinateVariationFactors,
  seasonal: SeasonalVariationFactors
): StructuredWarning[] {
  const warnings: StructuredWarning[] = [];

  // 距離警告
  if (coordinate.distanceFromReference > 500) {
    warnings.push({
      level: WarningLevel.WARN,
      category: 'Geographic',
      message: 'Location is far from reference point (>500km)',
      details: { distance: coordinate.distanceFromReference }
    });
  }

  // 季節変動警告
  if (Math.abs(seasonal.monthlyCorrection) > 0.08) {
    warnings.push({
      level: WarningLevel.INFO,
      category: 'Seasonal',
      message: 'Significant seasonal variation detected',
      details: { correction: seasonal.monthlyCorrection }
    });
  }

  // データ整合性エラー
  if (!this.validateDataIntegrity(record)) {
    warnings.push({
      level: WarningLevel.ERROR,
      category: 'DataIntegrity',
      message: 'Data integrity issues detected'
    });
  }

  return warnings;
}
```

## パフォーマンス最適化

### 1. メモ化とキャッシュ戦略
```typescript
/**
 * TTL付きLRUキャッシュ
 */
class TTLLRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number; accessCount: number }>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize: number = 50, ttlMs: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // TTL確認
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // LRU更新
    entry.accessCount++;
    return entry.value;
  }

  set(key: K, value: V): void {
    // 容量制限チェック
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey: K | undefined;
    let minAccessCount = Infinity;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < minAccessCount ||
          (entry.accessCount === minAccessCount && entry.timestamp < oldestTimestamp)) {
        lruKey = key;
        minAccessCount = entry.accessCount;
        oldestTimestamp = entry.timestamp;
      }
    }

    if (lruKey !== undefined) {
      this.cache.delete(lruKey);
    }
  }
}
```

### 2. バッチ処理の最適化
```typescript
/**
 * バッチ分析処理
 */
static async analyzePatternsInBatch(
  inputs: GraphPatternAnalysisInput[],
  batchSize: number = 10
): Promise<GraphPatternAnalysisResult[]> {
  const results: GraphPatternAnalysisResult[] = [];

  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);

    // 並列処理でバッチを実行
    const batchPromises = batch.map(input => this.analyzePatterns(input));
    const batchResults = await Promise.all(batchPromises);

    results.push(...batchResults);

    // CPU負荷軽減のため小休憩
    if (i + batchSize < inputs.length) {
      await this.sleep(10); // 10ms休憩
    }
  }

  return results;
}

private static sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 型安全性とインターフェース改善

### 1. より厳密な型定義
```typescript
// 改善された型定義
export interface EnhancedGraphPatternInfo extends GraphPatternInfo {
  patternSignature: string;
  uniquenessScore: number;
  confidence: number; // 信頼度スコア
  visualFeatures: {
    peakCount: number;
    averageAmplitude: number;
    phaseShift: number;
    tideRange: number;
    periodicity: number;        // 周期性
    harmonicContent: number[];  // 調和成分
  };
  statisticalMetrics: {
    variance: number;
    standardDeviation: number;
    skewness: number;
    kurtosis: number;
  };
}
```

### 2. エラー型の明確化
```typescript
export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: AnalysisErrorCode,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export enum AnalysisErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  CALCULATION_FAILED = 'CALCULATION_FAILED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  PERFORMANCE_LIMIT = 'PERFORMANCE_LIMIT'
}
```

## 品質目標

### リファクタリング後の目標値
- **テストカバレッジ**: 95%以上維持
- **処理性能**: 100件処理を3秒以内に短縮
- **メモリ効率**: ピーク使用量を50MB以下に削減
- **コード品質**: ESLint/TypeScript strict mode 完全対応
- **保守性**: Cyclomatic Complexity 10以下

### 検証項目
1. 全既存テストの継続成功
2. パフォーマンステストの新規追加
3. エラーハンドリングの堅牢性確認
4. メモリリーク検査
5. 型安全性の完全確保

このリファクタリング計画により、機能を維持しながらコード品質を大幅に向上させ、将来の拡張性と保守性を確保します。

---

**作成日**: 2024-09-26
**フェーズ**: TDD REFACTOR (5/6)
**ステータス**: 📋 計画策定完了
**次ステップ**: 実際のリファクタリング実装