/**
 * SVGSizeCalculator - SVGサイズ計算ユーティリティ
 * TASK-001: レスポンシブユーティリティ実装
 */

import type {
  ViewportInfo,
  SVGSizeCalculation,
  ChartMargins,
  ISVGSizeCalculator
} from './types';
import { SIZE_CONSTRAINTS, DEFAULT_RESPONSIVE_SETTINGS } from './types';
import { MarginCalculator } from './MarginCalculator';

/**
 * SVGサイズ計算クラス
 */
export class SVGSizeCalculator implements ISVGSizeCalculator {
  private marginCalculator: MarginCalculator;

  constructor() {
    this.marginCalculator = new MarginCalculator();
  }

  /**
   * ビューポートに基づいてSVGサイズを計算
   */
  calculateSize(
    viewport: ViewportInfo,
    containerElement?: HTMLElement
  ): SVGSizeCalculation {
    // コンテナサイズを決定
    const containerSize = this.calculateContainerSize(viewport, containerElement);

    // マージンを計算（オプションも渡して一貫性を保つ）
    const margins = this.marginCalculator.calculateMargins(
      containerSize,
      viewport.deviceType,
      {
        fontSize: 12, // デフォルトフォントサイズを明示的に指定
        showAxisLabels: true
      }
    );

    // チャート領域を計算
    const chartWidth = containerSize.width - margins.left - margins.right;
    const chartHeight = containerSize.height - margins.top - margins.bottom;

    // 最小チャート領域を保証
    const adjustedSize = this.ensureMinimumChartSize(
      { width: chartWidth, height: chartHeight },
      margins,
      viewport,
      {
        originalWidth: containerSize.originalWidth,
        originalHeight: containerSize.originalHeight,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height
      }
    );

    return {
      containerWidth: adjustedSize.containerWidth,
      containerHeight: adjustedSize.containerHeight,
      chartWidth: adjustedSize.chartWidth,
      chartHeight: adjustedSize.chartHeight,
      margins: adjustedSize.margins,
      scaleFactor: this.calculateScaleFactor(viewport),
      isMinimumSize: adjustedSize.isMinimumSize
    };
  }

  /**
   * コンテナサイズを計算
   */
  private calculateContainerSize(
    viewport: ViewportInfo,
    containerElement?: HTMLElement
  ): {
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
  } {
    // 利用可能幅を計算（ビューポート幅の90%まで）
    const availableWidth = Math.min(
      viewport.width * SIZE_CONSTRAINTS.MAX_VIEWPORT_RATIO,
      containerElement?.offsetWidth || viewport.width
    );

    // アスペクト比に基づいて高さを計算（最小制約適用前）
    const originalWidth = availableWidth;
    const originalHeight = availableWidth / DEFAULT_RESPONSIVE_SETTINGS.aspectRatio;

    // 最小制約を適用
    const width = Math.max(originalWidth, SIZE_CONSTRAINTS.MIN_WIDTH);
    const height = Math.max(originalHeight, SIZE_CONSTRAINTS.MIN_HEIGHT);

    return { width, height, originalWidth, originalHeight };
  }

  /**
   * 最小チャート領域を保証
   */
  private ensureMinimumChartSize(
    chartSize: { width: number; height: number },
    margins: ChartMargins,
    __viewport: ViewportInfo,
    originalSize?: {
      originalWidth: number;
      originalHeight: number;
      viewportWidth?: number;
      viewportHeight?: number;
    }
  ): {
    containerWidth: number;
    containerHeight: number;
    chartWidth: number;
    chartHeight: number;
    margins: ChartMargins;
    isMinimumSize: boolean;
  } {
    let adjustedChartWidth = chartSize.width;
    let adjustedChartHeight = chartSize.height;
    const adjustedMargins = { ...margins };

    // 最小チャート幅を保証
    if (chartSize.width < SIZE_CONSTRAINTS.MIN_CHART_WIDTH) {
      adjustedChartWidth = SIZE_CONSTRAINTS.MIN_CHART_WIDTH;
    }

    // 最小チャート高さを保証
    if (chartSize.height < SIZE_CONSTRAINTS.MIN_CHART_HEIGHT) {
      adjustedChartHeight = SIZE_CONSTRAINTS.MIN_CHART_HEIGHT;
    }

    // 調整後のコンテナサイズを計算
    const finalContainerWidth = adjustedChartWidth + adjustedMargins.left + adjustedMargins.right;
    const finalContainerHeight = adjustedChartHeight + adjustedMargins.top + adjustedMargins.bottom;

    // 最小サイズ制約が適用されたかチェック
    let isMinimumSize = false;
    if (originalSize) {
      // アスペクト比計算前の元サイズ、またはviewportサイズで判定
      const checkWidth = originalSize.viewportWidth || originalSize.originalWidth;
      const checkHeight = originalSize.viewportHeight || originalSize.originalHeight;

      isMinimumSize =
        (checkWidth < SIZE_CONSTRAINTS.MIN_WIDTH && finalContainerWidth >= SIZE_CONSTRAINTS.MIN_WIDTH) ||
        (checkHeight < SIZE_CONSTRAINTS.MIN_HEIGHT && finalContainerHeight >= SIZE_CONSTRAINTS.MIN_HEIGHT);
    }

    return {
      containerWidth: finalContainerWidth,
      containerHeight: finalContainerHeight,
      chartWidth: adjustedChartWidth,
      chartHeight: adjustedChartHeight,
      margins: adjustedMargins,
      isMinimumSize
    };
  }

  /**
   * スケールファクターを計算
   */
  private calculateScaleFactor(viewport: ViewportInfo): number {
    // デバイス種別とピクセル比に基づくスケール調整
    const baseScale = viewport.pixelRatio || 1;

    switch (viewport.deviceType) {
      case 'mobile':
        return baseScale * 0.8; // モバイルでは若干縮小
      case 'tablet':
        return baseScale * 0.9; // タブレットでは軽微縮小
      case 'desktop':
        return baseScale; // デスクトップではそのまま
      default:
        return baseScale;
    }
  }
}