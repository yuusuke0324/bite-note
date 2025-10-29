/**
 * ChartConfigManager 型定義
 * TASK-103: ChartConfigManager実装
 */

/**
 * デバイスタイプ
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * サイズ情報
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * カラーパレット設定
 */
export interface ColorConfig {
  primary: string;      // メインライン色
  secondary: string;    // サブライン色
  background: string;   // 背景色
  grid: string;        // グリッド線色
  text: string;        // テキスト色
  accent: string;      // アクセント色
}

/**
 * デバイス別設定
 */
export interface DeviceConfig {
  containerSize: {
    minWidth: number;
    minHeight: number;
    aspectRatio: number;
  };
  responsive: {
    breakpoints: Record<DeviceType, number>;
    scalingFactor: number;
  };
  touch: {
    enabled: boolean;
    minimumTargetSize: number; // 44px minimum
  };
}

/**
 * フォント設定
 */
export interface FontConfig {
  family: string[];     // フォントファミリー優先順位
  size: {
    small: number;      // 軸ラベルなど
    medium: number;     // 通常テキスト
    large: number;      // タイトルなど
  };
  weight: {
    normal: number;     // 400
    bold: number;       // 700
  };
  lineHeight: number;   // 1.4-1.6
}

/**
 * マージン設定
 */
export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * アクセシビリティ設定
 */
export interface A11yConfig {
  highContrast: {
    enabled: boolean;
    colorOverrides: Partial<ColorConfig>;
  };
  colorBlindness: {
    type?: 'protanopia' | 'deuteranopia' | 'tritanopia';
    patternEnabled: boolean;
    shapeMarkers: boolean;
    colorAdjustments?: Record<string, string>;
  };
  reducedMotion: {
    enabled: boolean;
    animationDuration: number; // 0 if disabled
  };
  fontSize: {
    scaling: number;    // 1.0 = normal, up to 2.0
  };
  focus: {
    visible: boolean;
    color: string;
    width: number;
    style: string;
  };
  textColor?: string;
  backgroundColor?: string;
  largeTextColor?: string;
}

/**
 * 統合チャート設定
 */
export interface ChartConfig {
  colors: ColorConfig;
  fonts: FontConfig;
  margin: MarginConfig;
  accessibility: A11yConfig;
}

/**
 * 色設定オプション
 */
export interface ColorOptions {
  overrides?: Partial<ColorConfig>;
  highContrast?: boolean;
}

/**
 * アクセシビリティオプション
 */
export interface A11yOptions {
  highContrast?: boolean;
  colorBlindness?: {
    type?: 'protanopia' | 'deuteranopia' | 'tritanopia';
    patternEnabled?: boolean;
  };
  reducedMotion?: boolean;
  focusVisible?: boolean;
}

/**
 * フォント設定オプション
 */
export interface FontOptions {
  familyOverride?: string[];
}

/**
 * 設定検証結果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * 設定変更イベント
 */
export interface ConfigChangeEvent {
  type: string;
  changes: any;
}

/**
 * 設定変更リスナー
 */
export type ConfigChangeListener = (event: ConfigChangeEvent) => void;