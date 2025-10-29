/**
 * ResponsiveChartContainer 型定義
 * TASK-201: ResponsiveChartContainer実装
 */

import type { DeviceType } from '../../utils/responsive/types';

/**
 * コンテナサイズ情報
 */
export interface ContainerSize {
  width: number;
  height: number;
}

/**
 * レスポンシブチャート設定
 */
export interface ResponsiveChartConfig {
  minWidth: number;
  minHeight: number;
  aspectRatio: number;
  device: DeviceType;
}

/**
 * ResponsiveChartContainer Props
 */
export interface ResponsiveChartContainerProps {
  children: React.ReactNode;

  // サイズ設定
  minWidth?: number;        // デフォルト: 600
  minHeight?: number;       // デフォルト: 300
  aspectRatio?: number;     // デフォルト: 2.0

  // レスポンシブ設定
  responsive?: boolean;     // デフォルト: true
  debounceMs?: number;      // デフォルト: 100

  // スタイル設定
  className?: string;
  style?: React.CSSProperties;

  // イベントハンドラー
  onSizeChange?: (size: ContainerSize) => void;
  onDeviceChange?: (device: DeviceType) => void;

  // TASK-001連携
  enableViewportDetection?: boolean; // デフォルト: true
}

/**
 * コンテナ内部状態
 */
export interface ContainerState {
  // 現在のサイズ
  containerSize: ContainerSize;

  // デバイス情報
  currentDevice: DeviceType;

  // 計算されたSVGサイズ
  svgSize: ContainerSize;

  // 読み込み状態
  isInitialized: boolean;
}