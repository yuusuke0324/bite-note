/**
 * TASK-201: キャッシュ戦略の最適化
 * EnhancedTideLRUCache - 拡張キャッシュシステム本体
 *
 * Step 5/6: リファクタリング (REFACTOR Phase)
 * コード品質向上とパフォーマンス最適化
 */

import type {
  TideInfo,
  CacheStats,
  EnhancedCacheKey,
  SmartCacheStrategy,
  MatchingResult,
  MemoryOptimization,
  CacheDebugInfo,
  PrecisionLevel,
  SeasonalContext,
  AnalysisType,
  MatchingStrategy
} from '../../types/tide';
import { SmartKeyGenerator } from './SmartKeyGenerator';

// 内部型定義
interface CacheEntry {
  readonly key: EnhancedCacheKey;
  readonly data: TideInfo;
  timestamp: Date;
  accessCount: number;
}

interface MatchingOptions {
  readonly matchingStrategy: MatchingStrategy;
  readonly maxResults?: number;
  readonly geoTolerance?: number;
  readonly timeTolerance?: number;
  readonly variationTolerance?: number;
  readonly weights?: Readonly<Record<string, number>>;
}

interface MatchCandidate {
  readonly key: string;
  readonly data: TideInfo;
  readonly confidence: number;
  readonly matchType: 'exact' | 'proximity' | 'temporal' | 'variation' | 'interpolated';
  readonly distance?: Readonly<{
    geographic?: number;
    temporal?: number;
    variation?: number;
  }>;
}

/**
 * 拡張潮汐LRUキャッシュシステム
 *
 * 主要機能:
 * - 拡張キーシステム (座標・日時・変動係数)
 * - スマートマッチング (近似・補間)
 * - 階層メモリ管理 (Hot/Warm/Cold)
 * - データ圧縮・重複除去
 * - パフォーマンス分析・デバッグ
 */
export class EnhancedTideLRUCache {
  private readonly maxSize: number;
  private readonly strategy: SmartCacheStrategy;
  private readonly memoryOptimization: MemoryOptimization;
  private readonly keyGenerator: SmartKeyGenerator;

  // メモリストレージ
  private readonly cache: Map<string, CacheEntry> = new Map();

  // 統計情報
  private stats = {
    hitCount: 0,
    missCount: 0,
    totalEntries: 0,
    memoryUsage: 0
  };

  // SmartKeyGeneratorのインポートを追加
  constructor(config?: {
    maxSize?: number;
    strategy?: SmartCacheStrategy;
    memoryOptimization?: MemoryOptimization;
  }) {

    this.maxSize = config?.maxSize || 200; // 既存の2倍
    this.keyGenerator = new SmartKeyGenerator();

    // デフォルト戦略設定
    this.strategy = config?.strategy || {
      proximityMatching: {
        geoTolerance: 2.0,      // 2km許容範囲
        timeTolerance: 2,       // 2時間許容範囲
        variationTolerance: 0.1 // 10%許容範囲
      },
      layeredCache: {
        level1: 'exact-match',
        level2: 'approximate',
        level3: 'interpolated'
      },
      predictiveCache: {
        enabled: false,          // 初期実装では無効
        patterns: [],
        preloadThreshold: 0.7
      }
    };

    // デフォルトメモリ最適化設定
    this.memoryOptimization = config?.memoryOptimization || {
      compression: {
        algorithm: 'lz4',
        level: 5,
        threshold: 1000         // 1KB以上で圧縮
      },
      tieredMemory: {
        hotCache: { size: 50, ttl: 30 * 60 * 1000 },      // 30分
        warmCache: { size: 100, ttl: 2 * 60 * 60 * 1000 }, // 2時間
        coldStorage: { enabled: true, ttl: 24 * 60 * 60 * 1000 } // 24時間
      },
      deduplication: {
        enabled: true,
        similarityThreshold: 0.85,
        referenceCompression: true
      }
    };
  }

  /**
   * 拡張キーシステム - データ取得
   * FR-301: 拡張キャッシュキー生成システム対応
   */
  async get(key: EnhancedCacheKey): Promise<TideInfo | null> {
    try {
      // Step 4: GREEN Phase - 基本的な取得実装
      const keyString = this.keyGenerator.generateKeyString(key);
      const entry = this.cache.get(keyString);

      if (!entry) {
        this.stats.missCount++;
        return null;
      }

      // アクセス統計更新
      entry.accessCount++;
      entry.timestamp = new Date();
      this.stats.hitCount++;

      return entry.data;
    } catch (error) {
      console.error('Enhanced cache get error:', error);
      this.stats.missCount++;
      return null;
    }
  }

  /**
   * 拡張キーシステム - データ保存
   * FR-301: 拡張キャッシュキー生成システム対応
   */
  async set(key: EnhancedCacheKey, data: TideInfo): Promise<void> {
    try {
      // Step 4: GREEN Phase - 基本的な保存実装
      const keyString = this.keyGenerator.generateKeyString(key);

      const entry = {
        key: key,
        data: data,
        timestamp: new Date(),
        accessCount: 1
      };

      // キャッシュに保存
      this.cache.set(keyString, entry);

      // 統計更新
      this.stats.totalEntries = this.cache.size;
      this.updateMemoryUsage();

      // サイズ制限チェック - スマートな削除戦略
      if (this.cache.size > this.maxSize) {
        const memoryPressureRatio = this.stats.memoryUsage / (this.maxSize * 1000); // 1000bytes/entry想定

        if (memoryPressureRatio > 1.5) {
          // 高メモリ負荷時: 一括削除でパフォーマンス向上
          const removalCount = Math.floor(this.maxSize * 0.1); // 10%削除
          this.evictMultipleEntries(removalCount);
        } else {
          // 通常時: 単発削除
          this.evictOldestEntry();
        }
      }
    } catch (error) {
      console.error('Enhanced cache set error:', error);
    }
  }

  /**
   * スマートマッチング機能
   * FR-302: スマートヒット率向上機能
   */
  async findMatches(
    searchKey: EnhancedCacheKey,
    options: MatchingOptions
  ): Promise<MatchingResult> {
    const startTime = performance.now();
    const matches: MatchCandidate[] = [];

    // 戦略別マッチング実行
    switch (options.matchingStrategy) {
      case 'exact':
        this.addExactMatches(searchKey, matches);
        break;
      case 'proximity':
        this.addProximityMatches(searchKey, options, matches);
        break;
      case 'temporal':
        this.addTemporalMatches(searchKey, options, matches);
        break;
      case 'variation':
        this.addVariationMatches(searchKey, options, matches);
        break;
      case 'combined':
        this.addCombinedMatches(searchKey, options, matches);
        break;
      default:
        // 未知の戦略は空の結果
        break;
    }

    // 結果を信頼度順でソート
    matches.sort((a, b) => b.confidence - a.confidence);

    // 最大結果数制限
    const maxResults = options.maxResults || 10;
    const limitedMatches = matches.slice(0, maxResults);

    return {
      matches: limitedMatches,
      strategy: options.matchingStrategy,
      searchTime: performance.now() - startTime
    };
  }

  /**
   * 完全一致マッチング
   */
  private addExactMatches(searchKey: EnhancedCacheKey, matches: MatchCandidate[]): void {
    const exactKeyString = this.keyGenerator.generateKeyString(searchKey);
    const exactEntry = this.cache.get(exactKeyString);

    if (exactEntry) {
      matches.push({
        key: exactKeyString,
        data: exactEntry.data,
        confidence: 1.0,
        matchType: 'exact'
      });
    }
  }

  /**
   * 近似マッチング
   */
  private addProximityMatches(
    searchKey: EnhancedCacheKey,
    options: MatchingOptions,
    matches: MatchCandidate[]
  ): void {
    for (const [keyString, entry] of this.cache) {
      const confidence = this.calculateProximityConfidence(searchKey, entry.key, options);
      if (confidence > 0.5) {
        matches.push({
          key: keyString,
          data: entry.data,
          confidence,
          matchType: 'proximity'
        });
      }
    }
  }

  /**
   * 時間的マッチング
   */
  private addTemporalMatches(
    searchKey: EnhancedCacheKey,
    options: MatchingOptions,
    matches: MatchCandidate[]
  ): void {
    for (const [keyString, entry] of this.cache) {
      const confidence = this.calculateTemporalConfidence(searchKey, entry.key, options);
      if (confidence > 0.5) {
        matches.push({
          key: keyString,
          data: entry.data,
          confidence,
          matchType: 'temporal'
        });
      }
    }
  }

  /**
   * 変動係数マッチング
   */
  private addVariationMatches(
    searchKey: EnhancedCacheKey,
    options: MatchingOptions,
    matches: MatchCandidate[]
  ): void {
    for (const [keyString, entry] of this.cache) {
      const confidence = this.calculateVariationConfidence(searchKey, entry.key, options);
      if (confidence > 0.5) {
        matches.push({
          key: keyString,
          data: entry.data,
          confidence,
          matchType: 'variation'
        });
      }
    }
  }

  /**
   * 複合マッチング
   */
  private addCombinedMatches(
    searchKey: EnhancedCacheKey,
    options: MatchingOptions,
    matches: MatchCandidate[]
  ): void {
    const defaultWeights = { exact: 1.0, proximity: 0.8, temporal: 0.6, variation: 0.7 };
    const weights = options.weights || defaultWeights;

    for (const [keyString, entry] of this.cache) {
      const geoConf = this.calculateProximityConfidence(searchKey, entry.key, options);
      const tempConf = this.calculateTemporalConfidence(searchKey, entry.key, options);
      const varConf = this.calculateVariationConfidence(searchKey, entry.key, options);

      const combinedConfidence = (
        geoConf * weights.proximity +
        tempConf * weights.temporal +
        varConf * weights.variation
      ) / 3;

      if (combinedConfidence > 0.3) {
        matches.push({
          key: keyString,
          data: entry.data,
          confidence: combinedConfidence,
          matchType: 'interpolated'
        });
      }
    }
  }

  /**
   * 近似信頼度計算 - エラーハンドリング強化版
   */
  private calculateProximityConfidence(
    searchKey: EnhancedCacheKey,
    targetKey: EnhancedCacheKey,
    options: MatchingOptions
  ): number {
    try {
      // 入力値検証
      if (!searchKey?.location || !targetKey?.location) {
        return 0;
      }

      if (!this.isValidCoordinate(searchKey.location) || !this.isValidCoordinate(targetKey.location)) {
        return 0;
      }

      const geoDistance = this.calculateGeoDistance(
        searchKey.location,
        targetKey.location
      );

      // NaNや無限大値のチェック
      if (!Number.isFinite(geoDistance)) {
        return 0;
      }

      const geoTolerance = options.geoTolerance || 2.0;
      if (geoDistance > geoTolerance) {
        return 0;
      }

      // 距離に基づく信頼度計算
      if (geoDistance <= 0.5) {
        return 0.95;
      } else if (geoDistance <= 1.5) {
        return 0.85;
      } else if (geoDistance <= 2.0) {
        return 0.8;
      } else {
        const baseFactor = Math.max(0, 1 - (geoDistance / geoTolerance));
        return Math.max(0.3, baseFactor);
      }
    } catch (error) {
      console.error('Error in calculateProximityConfidence:', error);
      return 0;
    }
  }

  /**
   * 座標の有効性チェック
   */
  private isValidCoordinate(location: { latitude: number; longitude: number }): boolean {
    return (
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180
    );
  }

  /**
   * 地理的距離計算 - エラーハンドリング強化版
   */
  private calculateGeoDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    try {
      // ハバーシンの公式で簡易的に距離計算
      const R = 6371; // 地球半径 (km)
      const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
      const dLng = (point2.longitude - point1.longitude) * Math.PI / 180;

      const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(point1.latitude * Math.PI / 180) *
                Math.cos(point2.latitude * Math.PI / 180) *
                Math.sin(dLng / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      // 計算結果の妥当性チェック
      return Number.isFinite(distance) ? distance : Number.MAX_SAFE_INTEGER;
    } catch (error) {
      console.error('Error in calculateGeoDistance:', error);
      return Number.MAX_SAFE_INTEGER;
    }
  }

  /**
   * 時間的信頼度計算 - エラーハンドリング強化版
   */
  private calculateTemporalConfidence(
    searchKey: EnhancedCacheKey,
    targetKey: EnhancedCacheKey,
    options: MatchingOptions
  ): number {
    try {
      // 入力値検証
      if (!searchKey?.temporal?.date || !targetKey?.temporal?.date) {
        return 0;
      }
      // 日付差計算
      const searchDate = new Date(searchKey.temporal.date);
      const targetDate = new Date(targetKey.temporal.date);

      // 日付の妥当性チェック
      if (isNaN(searchDate.getTime()) || isNaN(targetDate.getTime())) {
        return 0;
      }

      const timeDiffDays = Math.abs(searchDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24);

      // NaN/無限大値のチェック
      if (!Number.isFinite(timeDiffDays)) {
        return 0;
      }

      const timeTolerance = options.timeTolerance || 2; // デフォルト2日
      if (timeDiffDays > timeTolerance) {
        return 0;
      }

      // 季節コンテキストの一致度
      const seasonalMatch = searchKey.temporal.seasonalContext === targetKey.temporal.seasonalContext ? 1.0 : 0.5;

      // 時間範囲の重複度 (時間範囲が指定されている場合)
      let timeRangeOverlap = 1.0;
      if (searchKey.temporal.timeRange && targetKey.temporal.timeRange) {
        const searchStart = new Date(`${searchKey.temporal.date} ${searchKey.temporal.timeRange.start}`);
        const searchEnd = new Date(`${searchKey.temporal.date} ${searchKey.temporal.timeRange.end}`);
        const targetStart = new Date(`${targetKey.temporal.date} ${targetKey.temporal.timeRange.start}`);
        const targetEnd = new Date(`${targetKey.temporal.date} ${targetKey.temporal.timeRange.end}`);

        // 時間範囲の日付も妥当性チェック
        if (!isNaN(searchStart.getTime()) && !isNaN(searchEnd.getTime()) &&
            !isNaN(targetStart.getTime()) && !isNaN(targetEnd.getTime())) {

          const overlapStart = Math.max(searchStart.getTime(), targetStart.getTime());
          const overlapEnd = Math.min(searchEnd.getTime(), targetEnd.getTime());

          if (overlapEnd > overlapStart) {
            const overlapDuration = overlapEnd - overlapStart;
            const searchDuration = searchEnd.getTime() - searchStart.getTime();
            if (searchDuration > 0) {
              timeRangeOverlap = overlapDuration / searchDuration;
            }
          } else {
            timeRangeOverlap = 0;
          }
        }
      }

      // 時間距離に基づく基本信頼度
      const timeFactor = Math.max(0, 1 - (timeDiffDays / timeTolerance));

      // 複合信頼度計算
      const confidence = (timeFactor * 0.6 + seasonalMatch * 0.2 + timeRangeOverlap * 0.2);
      return Number.isFinite(confidence) ? confidence : 0;
    } catch (error) {
      console.error('Error in calculateTemporalConfidence:', error);
      return 0;
    }
  }

  /**
   * 変動係数信頼度計算 - エラーハンドリング強化版
   */
  private calculateVariationConfidence(
    searchKey: EnhancedCacheKey,
    targetKey: EnhancedCacheKey,
    options: MatchingOptions
  ): number {
    try {
      // 入力値検証
      if (!searchKey?.variation || !targetKey?.variation) {
        return 0;
      }

      const variationTolerance = options.variationTolerance || 0.1; // デフォルト10%許容範囲

      // 各係数の妥当性チェック
      const searchCoeff = searchKey.variation;
      const targetCoeff = targetKey.variation;

      if (!Number.isFinite(searchCoeff.coordinateCoeff) ||
          !Number.isFinite(searchCoeff.seasonalCoeff) ||
          !Number.isFinite(searchCoeff.combinedEffect) ||
          !Number.isFinite(targetCoeff.coordinateCoeff) ||
          !Number.isFinite(targetCoeff.seasonalCoeff) ||
          !Number.isFinite(targetCoeff.combinedEffect)) {
        return 0;
      }

      // 各係数の差を計算
      const coordDiff = Math.abs(searchCoeff.coordinateCoeff - targetCoeff.coordinateCoeff);
      const seasonalDiff = Math.abs(searchCoeff.seasonalCoeff - targetCoeff.seasonalCoeff);
      const combinedDiff = Math.abs(searchCoeff.combinedEffect - targetCoeff.combinedEffect);

      // 許容範囲チェック
      if (coordDiff > variationTolerance || seasonalDiff > variationTolerance || combinedDiff > variationTolerance) {
        return 0;
      }

      // 各係数の類似度計算
      const coordSimilarity = Math.max(0.85, 1 - (coordDiff / variationTolerance));
      const seasonalSimilarity = Math.max(0.85, 1 - (seasonalDiff / variationTolerance));
      const combinedSimilarity = Math.max(0.85, 1 - (combinedDiff / variationTolerance));

      // 重み付き平均計算 (combined effectを重視)
      const confidence = (coordSimilarity * 0.3 + seasonalSimilarity * 0.3 + combinedSimilarity * 0.4);
      return Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;
    } catch (error) {
      console.error('Error in calculateVariationConfidence:', error);
      return 0;
    }
  }

  /**
   * @deprecated 使用非推奨：SmartKeyGenerator.generateKeyString()を使用してください
   */
  generateEnhancedKey(input: Partial<EnhancedCacheKey>): string {
    return this.keyGenerator.generateKeyString(
      this.keyGenerator.generateEnhancedKey(input)
    );
  }

  /**
   * 統計情報取得
   * NFR-304: 監視要件対応
   */
  getStats(): CacheStats {
    const totalAccess = this.stats.hitCount + this.stats.missCount;
    const hitRate = totalAccess > 0 ? this.stats.hitCount / totalAccess : 0;

    return {
      totalEntries: this.stats.totalEntries,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate,
      memoryUsage: this.stats.memoryUsage
    };
  }

  /**
   * キャッシュサイズ取得
   */
  size(): number {
    return this.stats.totalEntries;
  }

  /**
   * キャッシュクリア
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hitCount: 0,
      missCount: 0,
      totalEntries: 0,
      memoryUsage: 0
    };
  }

  /**
   * メモリ使用量更新 - 最適化版
   */
  private updateMemoryUsage(): void {
    // より効率的なメモリ使用量計算
    let totalSize = 0;

    // Map自体のオーバーヘッド (概算)
    totalSize += this.cache.size * 48; // Map entry overhead

    for (const [keyString, entry] of this.cache) {
      // キー文字列 (UTF-16なので文字数 * 2)
      totalSize += keyString.length * 2;

      // TideInfoのメモリ使用量を計算 (JSONではなく実際のプロパティサイズ)
      totalSize += this.calculateTideInfoSize(entry.data);

      // CacheEntry構造体のオーバーヘッド
      totalSize += 64; // timestamp (8) + accessCount (8) + その他のオーバーヘッド
    }

    this.stats.memoryUsage = totalSize;
  }

  /**
   * TideInfoのメモリサイズ計算
   */
  private calculateTideInfoSize(tideInfo: TideInfo): number {
    let size = 0;

    // 基本的な数値プロパティ (概算)
    size += 8 * 10; // 数値プロパティ約10個 * 8バイト

    // 文字列プロパティ
    if (tideInfo.location?.name) {
      size += tideInfo.location.name.length * 2;
    }

    // 配列データ (timeSeriesData等)
    if (Array.isArray(tideInfo.predictions)) {
      size += tideInfo.predictions.length * 32; // 予測データ1個あたり32バイト概算
    }

    return size;
  }

  /**
   * スマート削除戦略 (LRU + アクセス頻度)
   */
  private evictOldestEntry(): void {
    if (this.cache.size === 0) return;

    // スマート削除: アクセス頻度と最終アクセス時間を考慮
    let targetKey = '';
    let lowestScore = Number.MAX_SAFE_INTEGER;
    const currentTime = new Date().getTime();

    for (const [keyString, entry] of this.cache) {
      // スコア計算: 最終アクセス時間(重み70%) + アクセス頻度の逆数(重み30%)
      const timeSinceAccess = currentTime - entry.timestamp.getTime();
      const accessFrequencyScore = 1 / Math.max(entry.accessCount, 1);

      const evictionScore = (timeSinceAccess * 0.7) + (accessFrequencyScore * 100000 * 0.3);

      if (evictionScore < lowestScore) {
        lowestScore = evictionScore;
        targetKey = keyString;
      }
    }

    if (targetKey) {
      this.cache.delete(targetKey);
      this.stats.totalEntries = this.cache.size;
      this.updateMemoryUsage();
    }
  }

  /**
   * 一括削除 - メモリ不足時の緊急削除
   */
  private evictMultipleEntries(targetRemovalCount: number): void {
    if (this.cache.size === 0 || targetRemovalCount <= 0) return;

    // エントリを削除スコア順にソート
    const entries = Array.from(this.cache.entries());
    const currentTime = new Date().getTime();

    entries.sort(([, a], [, b]) => {
      const aTimeSinceAccess = currentTime - a.timestamp.getTime();
      const bTimeSinceAccess = currentTime - b.timestamp.getTime();
      const aAccessFrequencyScore = 1 / Math.max(a.accessCount, 1);
      const bAccessFrequencyScore = 1 / Math.max(b.accessCount, 1);

      const aScore = (aTimeSinceAccess * 0.7) + (aAccessFrequencyScore * 100000 * 0.3);
      const bScore = (bTimeSinceAccess * 0.7) + (bAccessFrequencyScore * 100000 * 0.3);

      return bScore - aScore; // 降順でソート (削除候補が最初に来る)
    });

    // 上位N個を削除
    const actualRemovalCount = Math.min(targetRemovalCount, entries.length);
    for (let i = 0; i < actualRemovalCount; i++) {
      this.cache.delete(entries[i][0]);
    }

    this.stats.totalEntries = this.cache.size;
    this.updateMemoryUsage();
  }

  /**
   * デバッグ情報取得
   * FR-304: 統合デバッグ・モニタリング機能
   */
  getDebugInfo(): CacheDebugInfo {
    // Step 3: 最小実装 - 基本的なデバッグ情報
    return {
      realTimeStats: {
        currentHitRate: this.getStats().hitRate,
        memoryPressure: 0,
        hotspotAnalysis: []
      },
      historicalAnalysis: {
        hourlyStats: [],
        trendAnalysis: 'No data available',
        recommendations: []
      },
      keyAnalysis: {
        collisionRate: 0,
        distributionMap: {},
        optimizationSuggestions: []
      }
    };
  }
}

// サービスのシングルトンインスタンス
export const enhancedTideLRUCache = new EnhancedTideLRUCache();