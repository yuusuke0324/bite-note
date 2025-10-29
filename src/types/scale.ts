/**
 * 動的スケール関連の型定義
 * TASK-101: 動的縦軸スケール調整機能
 */

/** 動的スケール設定 */
export interface DynamicScale {
  min: number;        // 表示範囲の最小値（センチメートル）
  max: number;        // 表示範囲の最大値（センチメートル）
  interval: number;   // 目盛り間隔（センチメートル）
  ticks: number[];    // 目盛り値の配列（センチメートル）
  unit: string;       // 単位（"cm"）
}

/** スケール計算オプション */
export interface ScaleCalculationOptions {
  marginRatio?: number;           // マージン比率（デフォルト: 0.15）
  preferredIntervals?: number[];  // 推奨間隔リスト（デフォルト: [10, 25, 50, 100, 200]）
  maxTicks?: number;             // 最大目盛り数（デフォルト: 10）
  minTicks?: number;             // 最小目盛り数（デフォルト: 6）
  forceZero?: boolean;           // ゼロを含むスケールを強制（デフォルト: false）
}

/** スケール計算結果の詳細情報 */
export interface ScaleCalculationResult extends DynamicScale {
  dataRange: {
    min: number;      // データの最小値
    max: number;      // データの最大値
    span: number;     // データの範囲
  };
  margin: {
    lower: number;    // 下側マージン
    upper: number;    // 上側マージン
  };
  quality: {
    score: number;    // スケール品質スコア（0-1）
    tickCount: number;// 実際の目盛り数
    intervalType: 'fine' | 'standard' | 'coarse'; // 間隔タイプ
  };
}

/** SVG座標変換の設定 */
export interface SVGCoordinateConfig {
  height: number;     // SVGの高さ
  scale: DynamicScale;// 使用するスケール
  flipY?: boolean;    // Y軸反転（デフォルト: true）
}