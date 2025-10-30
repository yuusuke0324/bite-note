/**
 * TASK-102: グラフパターンの多様性検証機能
 * 分析関連の型定義
 */

import type { FishingRecord } from './entities';

// FR-201: グラフパターン多様性分析エンジン
export interface GraphPatternAnalysisInput {
  fishingRecords: FishingRecord[];
  analysisOptions?: {
    includeCoordinateVariation?: boolean;
    includeSeasonalVariation?: boolean;
    samplingInterval?: number;
  };
}

export interface GraphPatternInfo {
  recordId: string;
  patternSignature: string;
  uniquenessScore: number;
  visualFeatures: {
    peakCount: number;
    averageAmplitude: number;
    phaseShift: number;
    tideRange: number;
  };
  tideData: {
    minLevel: number;
    maxLevel: number;
    dataPoints: number;
    samplingRate: number;
  };
}

export interface GraphPatternAnalysisResult {
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

// FR-202: 変動係数効果測定機能
export interface AnalysisCoordinates {
  lat: number;
  lng: number;
}

export interface VariationEffectAnalysisInput {
  baseLocation: AnalysisCoordinates;
  testLocations: AnalysisCoordinates[];
  dateRange: DateRange;
  analysisType: 'coordinate' | 'seasonal' | 'both';
}

export interface DateRange {
  start: string; // ISO date string
  end: string;   // ISO date string
}

export interface CoordinateEffectResult {
  averageImpact: number;        // 平均影響度（%）
  maxImpact: number;           // 最大影響度（%）
  spatialRange: number;        // 影響範囲（km）
}

export interface SeasonalEffectResult {
  averageImpact: number;
  peakSeasonImpact: number;    // ピーク時影響度
  seasonalCycle: number;       // 季節サイクル強度
}

export interface VariationEffectResult {
  coordinateEffect?: CoordinateEffectResult;
  seasonalEffect?: SeasonalEffectResult;
  combinedEffect: {
    synergy: number;             // 相乗効果（%）
    totalVariation: number;      // 総変動量
  };
}

// FR-203: デバッグ情報表示機能
export interface HarmonicParameters {
  M2: number;  // 主太陰半日潮
  S2: number;  // 主太陽半日潮
  N2: number;  // 長楕円体太陰半日潮
  K1: number;  // 太陰太陽日潮
  O1: number;  // 主太陰日潮
  P1: number;  // 主太陽日潮
  Q1: number;  // 楕円体太陰日潮
}

export interface CoordinateVariationFactors {
  latitudeEffect: number;
  longitudeEffect: number;
  distanceFromReference: number;
  geographicCorrection: number;
}

export interface SeasonalVariationFactors {
  monthlyCorrection: number;
  seasonalAmplitude: number;
  perigeeApogeeEffect: number;
  solarCorrectionFactor: number;
}

export interface TideCalculationDebugInfo {
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

// パフォーマンス分析用の型
export interface AnalysisPerformanceMetrics {
  totalProcessingTime: number;
  patternAnalysisTime: number;
  effectMeasurementTime: number;
  debugInfoCollectionTime: number;
  memoryPeakUsage: number;
  cachePerformance: {
    hitCount: number;
    missCount: number;
    hitRate: number;
  };
}

// 品質評価用の型
export interface AnalysisQualityMetrics {
  dataQuality: {
    completeness: number;        // データ完全性 (0-1)
    accuracy: number;           // 精度スコア (0-1)
    consistency: number;        // 一貫性スコア (0-1)
  };
  analysisReliability: {
    statisticalSignificance: number; // 統計的有意性 (p値)
    confidenceInterval: [number, number]; // 95%信頼区間
    sampleSizeAdequacy: boolean;  // サンプルサイズ適切性
  };
  resultValidation: {
    crossValidationScore: number; // 交差検証スコア
    domainKnowledgeAlignment: number; // ドメイン知識との整合性
    reproducibility: boolean;     // 再現性確認
  };
}