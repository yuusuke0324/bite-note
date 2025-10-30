/**
 * TASK-101: 動的縦軸スケール調整機能
 * DynamicScaleCalculator - 潮位データに基づくスケール計算
 *
 * 堅牢で高性能な動的スケール計算エンジン。
 * 潮位データの特性を分析し、視覚的に最適な縦軸スケールを自動生成します。
 */

import type { TideGraphPoint } from '../../types/tide';
import type { DynamicScale, ScaleCalculationOptions, ScaleCalculationResult } from '../../types/scale';

export class DynamicScaleCalculator {
  // パフォーマンス最適化: 計算結果のキャッシュ
  private static readonly scaleCache = new Map<string, DynamicScale>();
  private static readonly MAX_CACHE_SIZE = 100;

  // 計算定数
  private static readonly DEFAULT_MARGIN_RATIO = 0.15;
  private static readonly DEFAULT_PREFERRED_INTERVALS = [10, 25, 50, 100, 200];
  private static readonly DEFAULT_MAX_TICKS = 4; // 1画面収納のためさらに削減
  private static readonly DEFAULT_MIN_TICKS = 3; // 最小ティック数をさらに削減
  private static readonly MEAN_SEA_LEVEL_THRESHOLD = 100; // ±1m
  private static readonly DISPLAY_MARGIN_MULTIPLIER = 1.3;
  private static readonly OPTIMAL_TICK_COUNT = 4; // 最適ティック数を4に削減

  /**
   * キャッシュキーを生成する
   */
  private static generateCacheKey(
    levels: number[],
    options: Required<ScaleCalculationOptions>
  ): string {
    const dataHash = levels
      .map(l => Math.round(l * 10) / 10) // 小数点1桁で丸めてキャッシュ効率向上
      .join(',');
    const optionsHash = `${options.marginRatio}-${options.preferredIntervals.join('.')}-${options.maxTicks}-${options.minTicks}-${options.forceZero}`;
    return `${dataHash}|${optionsHash}`;
  }

  /**
   * キャッシュをクリアする
   */
  public static clearCache(): void {
    this.scaleCache.clear();
  }

  /**
   * 結果をキャッシュに保存する（LRU方式）
   */
  private static saveToCache(key: string, scale: DynamicScale): void {
    // キャッシュサイズ制限
    if (this.scaleCache.size >= this.MAX_CACHE_SIZE) {
      // 最も古いエントリを削除（Map は挿入順序を保持）
      const firstKey = this.scaleCache.keys().next().value as string;
      this.scaleCache.delete(firstKey);
    }

    // ディープコピーでキャッシュに保存
    this.scaleCache.set(key, {
      ...scale,
      ticks: [...scale.ticks]
    });
  }
  /**
   * 潮位データから動的スケールを計算する
   */
  static calculateScale(data: TideGraphPoint[], options?: ScaleCalculationOptions): DynamicScale {
    // デフォルトオプション
    const opts: Required<ScaleCalculationOptions> = {
      marginRatio: this.DEFAULT_MARGIN_RATIO,
      preferredIntervals: this.DEFAULT_PREFERRED_INTERVALS,
      maxTicks: this.DEFAULT_MAX_TICKS,
      minTicks: this.DEFAULT_MIN_TICKS,
      forceZero: false,
      ...options
    };

    // データの検証・サニタイズ
    const levels = this.validateAndSanitizeData(data);

    // キャッシュチェック
    const cacheKey = this.generateCacheKey(levels, opts);
    const cachedScale = this.scaleCache.get(cacheKey);
    if (cachedScale) {
      return { ...cachedScale }; // ディープコピーで安全性確保
    }

    // 空データまたは無効データの場合のフォールバック
    if (levels.length === 0) {
      return {
        min: -200,
        max: 200,
        interval: 100,
        ticks: [-200, -100, 0, 100, 200],
        unit: 'cm'
      };
    }

    // データ範囲の計算
    const dataMin = Math.min(...levels);
    const dataMax = Math.max(...levels);
    const dataSpan = dataMax - dataMin;

    // データが単一値の場合の特別処理
    if (dataSpan === 0) {
      const center = dataMin;
      const range = Math.max(100, Math.abs(center) * 0.5); // 最小100cm範囲
      return {
        min: center - range,
        max: center + range,
        interval: 50,
        ticks: this.generateTicks(center - range, center + range, 50),
        unit: 'cm'
      };
    }

    // 最適な間隔を決定
    const interval = this.determineOptimalInterval(dataSpan, opts.preferredIntervals);

    // マージンを考慮した表示範囲の計算
    const margin = dataSpan * opts.marginRatio;
    let displayMin = dataMin - margin;
    let displayMax = dataMax + margin;

    // ゼロを含むスケールの調整
    if (opts.forceZero || this.shouldIncludeZero(dataMin, dataMax, displayMin, displayMax)) {
      displayMin = Math.min(displayMin, 0);
      displayMax = Math.max(displayMax, 0);
    }

    // 間隔に合わせてスケールを調整
    const adjustedMin = Math.floor(displayMin / interval) * interval;
    const adjustedMax = Math.ceil(displayMax / interval) * interval;

    // 目盛りを生成
    const ticks = this.generateTicks(adjustedMin, adjustedMax, interval);

    const result: DynamicScale = {
      min: adjustedMin,
      max: adjustedMax,
      interval,
      ticks,
      unit: 'cm'
    };

    // キャッシュに保存（サイズ制限付き）
    this.saveToCache(cacheKey, result);

    return result;
  }

  /**
   * 詳細なスケール計算結果を取得する
   */
  static calculateDetailedScale(data: TideGraphPoint[], options?: ScaleCalculationOptions): ScaleCalculationResult {
    const levels = this.validateAndSanitizeData(data);
    const dataMin = levels.length > 0 ? Math.min(...levels) : 0;
    const dataMax = levels.length > 0 ? Math.max(...levels) : 0;
    const dataSpan = dataMax - dataMin;

    const scale = this.calculateScale(data, options);

    const marginLower = scale.min < dataMin ? dataMin - scale.min : 0;
    const marginUpper = scale.max > dataMax ? scale.max - dataMax : 0;

    return {
      ...scale,
      dataRange: {
        min: dataMin,
        max: dataMax,
        span: dataSpan
      },
      margin: {
        lower: marginLower,
        upper: marginUpper
      },
      quality: {
        score: this.calculateQualityScore(scale, dataSpan),
        tickCount: scale.ticks.length,
        intervalType: this.getIntervalType(scale.interval)
      }
    };
  }

  /**
   * データの検証・サニタイズ
   */
  private static validateAndSanitizeData(data: TideGraphPoint[]): number[] {
    if (!Array.isArray(data)) return [];

    return data
      .map(point => point.level)
      .filter(level => typeof level === 'number' && isFinite(level));
  }

  /**
   * データ範囲に基づいて最適な間隔を決定する
   */
  private static determineOptimalInterval(dataSpan: number, preferredIntervals: number[]): number {
    // データ範囲に応じた戦略的間隔選択
    for (const interval of preferredIntervals) {
      // マージンを考慮した実際の表示範囲を推定
      const estimatedDisplaySpan = dataSpan * this.DISPLAY_MARGIN_MULTIPLIER;
      const tickCount = Math.ceil(estimatedDisplaySpan / interval);

      if (tickCount >= this.DEFAULT_MIN_TICKS && tickCount <= this.DEFAULT_MAX_TICKS) {
        return interval;
      }
    }

    // フォールバック: データ範囲を最適目盛り数で割って適切な間隔に丸める
    const rawInterval = (dataSpan * this.DISPLAY_MARGIN_MULTIPLIER) / this.OPTIMAL_TICK_COUNT;

    // 最も近い推奨間隔に丸める
    let bestInterval = preferredIntervals[0];
    let minDiff = Math.abs(rawInterval - bestInterval);

    for (const interval of preferredIntervals) {
      const diff = Math.abs(rawInterval - interval);
      if (diff < minDiff) {
        minDiff = diff;
        bestInterval = interval;
      }
    }

    return bestInterval;
  }

  /**
   * 指定された範囲と間隔で目盛りを生成する
   */
  private static generateTicks(min: number, max: number, interval: number): number[] {
    const ticks: number[] = [];

    for (let tick = min; tick <= max; tick += interval) {
      // 浮動小数点の精度問題を回避
      ticks.push(Math.round(tick * 100) / 100);
    }

    return ticks;
  }

  /**
   * ゼロを含むスケールにすべきかどうかを判定する
   */
  private static shouldIncludeZero(dataMin: number, dataMax: number, displayMin: number, displayMax: number): boolean {
    // データが平均海面付近の場合はゼロを含む
    if (dataMin >= -this.MEAN_SEA_LEVEL_THRESHOLD && dataMax <= this.MEAN_SEA_LEVEL_THRESHOLD) {
      return true;
    }

    // 表示範囲がゼロを跨ぐ場合
    if (displayMin < 0 && displayMax > 0) {
      return true;
    }

    return false;
  }

  /**
   * スケールの品質スコアを計算する（0-1の範囲）
   */
  private static calculateQualityScore(scale: DynamicScale, dataSpan: number): number {
    const tickCount = scale.ticks.length;
    const displaySpan = scale.max - scale.min;

    // 目盛り数の適切さ（6-10が理想）
    const tickScore = tickCount >= 6 && tickCount <= 10 ? 1 : Math.max(0, 1 - Math.abs(8 - tickCount) * 0.1);

    // 効率性（データ範囲 / 表示範囲）
    const efficiencyScore = Math.min(1, dataSpan / displaySpan);

    // 総合スコア
    return (tickScore + efficiencyScore) / 2;
  }

  /**
   * 間隔のタイプを取得する
   */
  private static getIntervalType(interval: number): 'fine' | 'standard' | 'coarse' {
    if (interval <= 25) return 'fine';
    if (interval <= 100) return 'standard';
    return 'coarse';
  }
}