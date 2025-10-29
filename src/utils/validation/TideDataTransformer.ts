/**
 * TideDataTransformer - 潮汐データ変換クラス
 * TASK-002: データ検証・変換ユーティリティ実装
 */

import type { ITideDataTransformer, RawTideData, TideChartData } from './types';
import { TideDataValidator } from './TideDataValidator';

/**
 * 潮汐データトランスフォーマー
 */
export class TideDataTransformer implements ITideDataTransformer {
  private validator: TideDataValidator;

  constructor() {
    this.validator = new TideDataValidator();
  }

  /**
   * 生データをチャート形式に変換
   */
  transform(rawData: RawTideData[]): TideChartData[] {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    // データを変換
    const chartData: TideChartData[] = rawData.map(item => {
      const timestamp = new Date(item.time);
      return {
        x: timestamp.getTime(),
        y: item.tide,
        timestamp
      };
    });

    // 時刻順でソート
    chartData.sort((a, b) => a.x - b.x);

    return chartData;
  }

  /**
   * 検証してから変換
   */
  validateAndTransform(rawData: RawTideData[]): TideChartData[] {
    // 検証実行
    this.validator.validateDataArray(rawData);

    // 変換実行
    return this.transform(rawData);
  }
}