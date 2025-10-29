/**
 * TASK-303: 潮汐グラフ描画改善 TypeScript型定義
 * rechartsベースのグラフ描画に特化した型定義
 */

// ==========================================
// Core Data Types (recharts用)
// ==========================================

/**
 * recharts用の標準化された潮汐チャートデータ
 */
export interface TideChartData {
  time: string;              // "HH:mm" format (00:00-23:59)
  tide: number;              // 潮位 (cm)
  isEvent?: boolean;         // 満潮・干潮イベントマーカー
}

/**
 * 潮汐チャートデータの配列
 */
export type TideChartDataArray = TideChartData[];

/**
 * 軸ラベル情報
 */
export interface AxisLabel {
  value: string | number;
  position: number;         // 軸上の位置
  visible: boolean;         // 表示可能かどうか
}

/**
 * X軸（時間軸）ラベル
 */
export interface TimeAxisLabel extends AxisLabel {
  value: string;            // "HH:mm" format
  hour: number;             // 時間 (0-23)
}

/**
 * Y軸（潮位軸）ラベル
 */
export interface TideAxisLabel extends AxisLabel {
  value: number;            // 潮位値 (cm)
  unit: 'cm';              // 単位
}

// ==========================================
// Component Props Types
// ==========================================

/**
 * TideChartコンポーネントのプロパティ
 */
export interface TideChartProps {
  /** チャートデータ */
  data: TideChartDataArray;

  /** 幅（省略時はレスポンシブ） */
  width?: number;

  /** 高さ（省略時はレスポンシブ） */
  height?: number;

  /** レスポンシブモード */
  responsive?: boolean;

  /** グリッド表示 */
  showGrid?: boolean;

  /** ツールチップ表示 */
  showTooltip?: boolean;

  /** イベントマーカー表示 */
  showEventMarkers?: boolean;

  /** エラーハンドラー */
  onError?: (error: TideChartError) => void;

  /** データポイントクリック */
  onDataPointClick?: (data: TideChartData, index: number) => void;

  /** チャート設定 */
  config?: TideChartConfig;
}

/**
 * ResponsiveChartContainerのプロパティ
 */
export interface ResponsiveChartContainerProps {
  children: React.ReactNode;
  minWidth?: number;        // 最小幅（デフォルト: 600px）
  minHeight?: number;       // 最小高さ（デフォルト: 300px）
  aspectRatio?: number;     // アスペクト比（デフォルト: 2.0）
  className?: string;
}

/**
 * TideDataValidatorのプロパティ
 */
export interface TideDataValidatorProps {
  data: unknown;            // 検証対象データ
  onValidationResult: (result: ValidationResult) => void;
}

// ==========================================
// Configuration Types
// ==========================================

/**
 * チャート設定
 */
export interface TideChartConfig {
  /** 色設定 */
  colors: {
    line: string;           // 線の色
    area?: string;          // エリアの色
    grid: string;           // グリッドの色
    axis: string;           // 軸の色
    text: string;           // テキストの色
    event: string;          // イベントマーカーの色
  };

  /** フォント設定 */
  fonts: {
    size: number;           // フォントサイズ（デフォルト: 12px）
    family: string;         // フォントファミリー
    weight: number;         // フォントウェイト
  };

  /** マージン設定 */
  margins: {
    top: number;            // 上マージン
    right: number;          // 右マージン
    bottom: number;         // 下マージン（X軸ラベル用）
    left: number;           // 左マージン（Y軸ラベル用）
  };

  /** 軸設定 */
  axes: {
    x: AxisConfig;
    y: AxisConfig;
  };

  /** アニメーション設定 */
  animation: {
    duration: number;       // アニメーション時間（ms）
    easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };
}

/**
 * 軸設定
 */
export interface AxisConfig {
  show: boolean;            // 軸表示
  tickCount?: number;       // ティック数
  fontSize: number;         // ラベルフォントサイズ
  color: string;           // 軸とラベルの色
  width?: number;          // 軸線の幅
}

/**
 * デバイス別設定
 */
export interface DeviceSpecificConfig {
  mobile: Partial<TideChartConfig>;
  tablet: Partial<TideChartConfig>;
  desktop: Partial<TideChartConfig>;
}

// ==========================================
// Validation Types
// ==========================================

/**
 * データ検証結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validItemCount: number;
  totalItemCount: number;
  processedData?: TideChartDataArray;
}

/**
 * 検証エラー
 */
export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  fieldPath?: string;       // エラーの発生フィールド
  value?: unknown;          // エラーの値
  index?: number;           // 配列のインデックス
}

/**
 * 検証警告
 */
export interface ValidationWarning {
  code: ValidationWarningCode;
  message: string;
  fieldPath?: string;
  value?: unknown;
  index?: number;
}

/**
 * 検証エラーコード
 */
export type ValidationErrorCode =
  | 'EMPTY_DATA'            // データが空
  | 'INVALID_ARRAY'         // 配列ではない
  | 'INSUFFICIENT_DATA'     // データ不足（1点以下）
  | 'INVALID_TIME_FORMAT'   // 時刻フォーマット不正
  | 'INVALID_TIDE_VALUE'    // 潮位値不正
  | 'DUPLICATE_TIME'        // 時刻の重複
  | 'TIME_OUT_OF_RANGE'     // 時刻範囲外
  | 'TIDE_OUT_OF_RANGE';    // 潮位範囲外

/**
 * 検証警告コード
 */
export type ValidationWarningCode =
  | 'TIME_NOT_SEQUENTIAL'   // 時刻の順序不正
  | 'LARGE_TIME_GAP'        // 時刻の大きな間隔
  | 'EXTREME_TIDE_VALUE'    // 極端な潮位値
  | 'MISSING_EVENT_FLAG'    // イベントフラグ欠損
  | 'MANY_DATA_POINTS';     // データポイント過多

// ==========================================
// Error Handling Types
// ==========================================

/**
 * チャートエラー
 */
export interface TideChartError {
  code: TideChartErrorCode;
  message: string;          // ユーザー向けメッセージ
  technicalMessage?: string; // 技術者向けメッセージ
  severity: ErrorSeverity;
  timestamp: Date;
  context?: {
    component: string;
    props?: unknown;
    data?: unknown;
  };
}

/**
 * チャートエラーコード
 */
export type TideChartErrorCode =
  | 'DATA_VALIDATION_FAILED'     // データ検証失敗
  | 'CHART_RENDERING_FAILED'     // 描画失敗
  | 'INSUFFICIENT_SIZE'          // サイズ不足
  | 'RECHARTS_INIT_FAILED'       // recharts初期化失敗
  | 'SVG_CREATION_FAILED'        // SVG作成失敗
  | 'RESPONSIVE_CALC_FAILED'     // レスポンシブ計算失敗
  | 'MARGIN_CALC_FAILED'         // マージン計算失敗
  | 'AXIS_RENDER_FAILED';        // 軸描画失敗

/**
 * エラー重要度
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * エラーハンドラーオプション
 */
export interface ErrorHandlerOptions {
  showUserMessage: boolean;      // ユーザーメッセージ表示
  logToConsole: boolean;         // コンソールログ出力
  reportToService?: boolean;     // エラー報告サービス送信
  fallbackComponent?: React.ComponentType<{ error: TideChartError }>;
}

// ==========================================
// Responsive Design Types
// ==========================================

/**
 * ビューポート情報
 */
export interface ViewportInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

/**
 * デバイス種別
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * SVGサイズ計算結果
 */
export interface SVGSizeCalculation {
  containerWidth: number;
  containerHeight: number;
  chartWidth: number;
  chartHeight: number;
  margins: ChartMargins;
  scaleFactor: number;
  isMinimumSize: boolean;   // 最小サイズが適用されたか
}

/**
 * チャートマージン
 */
export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * レスポンシブ設定
 */
export interface ResponsiveSettings {
  breakpoints: {
    mobile: number;         // モバイルの閾値
    tablet: number;         // タブレットの閾値
  };
  minSizes: {
    width: number;          // 最小幅
    height: number;         // 最小高さ
  };
  aspectRatio: number;      // アスペクト比
  marginRatios: {           // マージン比率
    mobile: ChartMargins;
    tablet: ChartMargins;
    desktop: ChartMargins;
  };
}

// ==========================================
// Utility Types
// ==========================================

/**
 * 時刻フォーマット関連
 */
export interface TimeFormatUtils {
  isValidTimeString: (time: string) => boolean;
  parseTimeString: (time: string) => { hour: number; minute: number } | null;
  formatTimeString: (hour: number, minute: number) => string;
  generateTimeLabels: (interval: number) => string[];
}

/**
 * 数値検証関連
 */
export interface NumericValidationUtils {
  isValidTideValue: (value: unknown) => boolean;
  isInTideRange: (value: number) => boolean;
  sanitizeTideValue: (value: unknown) => number | null;
  formatTideValue: (value: number) => string;
}

/**
 * データ変換関連
 */
export interface DataTransformUtils {
  transformToChartData: (input: unknown) => TideChartDataArray | null;
  interpolateMissingData: (data: TideChartDataArray) => TideChartDataArray;
  sortByTime: (data: TideChartDataArray) => TideChartDataArray;
  removeDuplicates: (data: TideChartDataArray) => TideChartDataArray;
}

// ==========================================
// recharts Integration Types
// ==========================================

/**
 * recharts LineChart拡張プロパティ
 */
export interface ExtendedLineChartProps {
  data: TideChartDataArray;
  margin: ChartMargins;
  onMouseMove?: (data: any) => void;
  onMouseLeave?: () => void;
  onClick?: (data: any) => void;
}

/**
 * カスタムツールチップ用データ
 */
export interface ToolTipData {
  time: string;
  tide: number;
  isEvent: boolean;
  formattedTime: string;    // "14:30"
  formattedTide: string;    // "125.5cm"
  eventType?: 'high' | 'low';
}

/**
 * カスタムツールチップのプロパティ
 */
export interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: TideChartData;
  }>;
  label?: string;
  coordinate?: { x: number; y: number };
}

// ==========================================
// Testing Types
// ==========================================

/**
 * テスト用モックデータ生成オプション
 */
export interface MockChartDataOptions {
  pointCount?: number;              // データポイント数
  timeInterval?: number;            // 時間間隔（分）
  tideRange?: {
    min: number;
    max: number;
  };
  includeEvents?: boolean;          // イベントを含むか
  includeInvalidData?: boolean;     // 無効データを含むか
  timeSequential?: boolean;         // 時刻の順序性
}

/**
 * テスト用アサーション
 */
export interface ChartTestAssertions {
  hasValidData: (data: TideChartDataArray) => boolean;
  hasVisibleAxes: (container: HTMLElement) => boolean;
  hasCorrectMargins: (container: HTMLElement, expected: ChartMargins) => boolean;
  rendersWithoutErrors: (props: TideChartProps) => boolean;
}

// ==========================================
// Performance Monitoring Types
// ==========================================

/**
 * パフォーマンス計測結果
 */
export interface PerformanceMetrics {
  renderTime: number;               // 描画時間（ms）
  dataProcessingTime: number;       // データ処理時間（ms）
  validationTime: number;           // 検証時間（ms）
  totalTime: number;                // 総時間（ms）
  memoryUsage?: number;             // メモリ使用量（MB）
  reRenderCount: number;            // 再描画回数
}

/**
 * パフォーマンス監視設定
 */
export interface PerformanceMonitorConfig {
  enabled: boolean;
  logToConsole: boolean;
  reportThreshold: number;          // 報告閾値（ms）
  sampleRate: number;               // サンプリング率（0-1）
}

// ==========================================
// Accessibility Types
// ==========================================

/**
 * アクセシビリティ設定
 */
export interface AccessibilityConfig {
  ariaLabels: {
    chart: string;                  // チャート全体のラベル
    xAxis: string;                  // X軸のラベル
    yAxis: string;                  // Y軸のラベル
    dataPoint: string;              // データポイントのラベル
  };
  keyboardNavigation: boolean;      // キーボードナビゲーション
  screenReaderSupport: boolean;     // スクリーンリーダー対応
  highContrast: boolean;            // ハイコントラスト
  focusIndicators: boolean;         // フォーカスインジケーター
}

/**
 * スクリーンリーダー用データ
 */
export interface ScreenReaderData {
  summary: string;                  // グラフの概要
  trend: string;                    // トレンドの説明
  extremeValues: {
    highest: { time: string; value: string };
    lowest: { time: string; value: string };
  };
  dataPointDescriptions: string[];  // 各データポイントの説明
}

// ==========================================
// Constants and Enums
// ==========================================

/**
 * デフォルト設定値
 */
export const DEFAULT_CHART_CONFIG: TideChartConfig = {
  colors: {
    line: '#2563eb',
    grid: '#e5e7eb',
    axis: '#6b7280',
    text: '#374151',
    event: '#dc2626'
  },
  fonts: {
    size: 12,
    family: 'system-ui, sans-serif',
    weight: 400
  },
  margins: {
    top: 20,
    right: 20,
    bottom: 40,
    left: 60
  },
  axes: {
    x: {
      show: true,
      fontSize: 12,
      color: '#6b7280'
    },
    y: {
      show: true,
      fontSize: 12,
      color: '#6b7280'
    }
  },
  animation: {
    duration: 300,
    easing: 'ease-out'
  }
};

/**
 * レスポンシブデフォルト設定
 */
export const DEFAULT_RESPONSIVE_SETTINGS: ResponsiveSettings = {
  breakpoints: {
    mobile: 768,
    tablet: 1024
  },
  minSizes: {
    width: 600,
    height: 300
  },
  aspectRatio: 2.0,
  marginRatios: {
    mobile: { top: 15, right: 15, bottom: 35, left: 50 },
    tablet: { top: 20, right: 20, bottom: 40, left: 60 },
    desktop: { top: 25, right: 25, bottom: 45, left: 70 }
  }
};

/**
 * 検証制約
 */
export const VALIDATION_CONSTRAINTS = {
  TIME_PATTERN: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  TIDE_RANGE: { min: -1000, max: 10000 },
  MIN_DATA_POINTS: 2,
  MAX_DATA_POINTS: 1000,
  MAX_TIME_GAP_MINUTES: 120
} as const;

export default {};