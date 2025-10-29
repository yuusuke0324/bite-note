/**
 * MarginCalculator - マージン計算ユーティリティ
 * TASK-001: レスポンシブユーティリティ実装
 */

import type {
  ChartMargins,
  DeviceType,
  MarginCalculationOptions,
  IMarginCalculator
} from './types';
import {
  MARGIN_CONSTRAINTS,
  DEFAULT_RESPONSIVE_SETTINGS,
  DEFAULT_MARGIN_OPTIONS
} from './types';

/**
 * マージン計算クラス
 */
export class MarginCalculator implements IMarginCalculator {
  /**
   * SVGサイズとデバイス種別に基づいてマージンを計算
   */
  calculateMargins(
    svgSize: { width: number; height: number },
    deviceType: DeviceType,
    options?: MarginCalculationOptions
  ): ChartMargins {
    const opts = { ...DEFAULT_MARGIN_OPTIONS, ...options };

    // デバイス別基本マージン比率を取得
    const baseMargins = this.getDeviceMarginRatios(deviceType);

    // サイズに応じた比例マージンを計算
    const proportionalMargins = this.calculateProportionalMargins(svgSize, baseMargins);

    // 最小マージンを先に適用
    const constrainedMargins = this.applyMinimumConstraints(proportionalMargins, opts);

    // フォントサイズ調整を適用（最小制約後に）
    const adjustedMargins = this.applyFontSizeAdjustment(constrainedMargins, opts);

    // 最大マージン制約を適用（SVGサイズの40%まで）
    return this.applyMaximumConstraints(adjustedMargins, svgSize);
  }

  /**
   * デバイス別マージン比率を取得
   */
  private getDeviceMarginRatios(deviceType: DeviceType): ChartMargins {
    return DEFAULT_RESPONSIVE_SETTINGS.marginRatios[deviceType];
  }

  /**
   * サイズに応じた比例マージンを計算
   */
  private calculateProportionalMargins(
    svgSize: { width: number; height: number },
    baseMargins: ChartMargins
  ): ChartMargins {
    // 極小サイズでは最小マージンを強制適用（軸ラベル表示保証のため）
    if (svgSize.width <= 100 || svgSize.height <= 50) {
      return {
        top: MARGIN_CONSTRAINTS.MIN_TOP,
        right: MARGIN_CONSTRAINTS.MIN_RIGHT,
        bottom: MARGIN_CONSTRAINTS.MIN_BOTTOM,
        left: MARGIN_CONSTRAINTS.MIN_LEFT
      };
    }

    return {
      top: Math.round((svgSize.height * baseMargins.top) / 100),
      right: Math.round((svgSize.width * baseMargins.right) / 100),
      bottom: Math.round((svgSize.height * baseMargins.bottom) / 100),
      left: Math.round((svgSize.width * baseMargins.left) / 100)
    };
  }

  /**
   * 最小マージン制約を適用
   */
  private applyMinimumConstraints(
    margins: ChartMargins,
    options: MarginCalculationOptions
  ): ChartMargins {
    return {
      top: Math.max(margins.top, MARGIN_CONSTRAINTS.MIN_TOP),
      right: Math.max(margins.right, MARGIN_CONSTRAINTS.MIN_RIGHT),
      bottom: Math.max(margins.bottom, options.minBottomMargin || MARGIN_CONSTRAINTS.MIN_BOTTOM),
      left: Math.max(margins.left, options.minLeftMargin || MARGIN_CONSTRAINTS.MIN_LEFT)
    };
  }

  /**
   * フォントサイズに基づく調整を適用
   */
  private applyFontSizeAdjustment(
    margins: ChartMargins,
    options: MarginCalculationOptions
  ): ChartMargins {
    const fontSize = options.fontSize || DEFAULT_MARGIN_OPTIONS.fontSize!;
    const fontScale = fontSize / 12; // 12pxを基準とした比率

    return {
      top: Math.round(margins.top),
      right: Math.round(margins.right),
      bottom: Math.round(margins.bottom * fontScale), // X軸ラベルに影響
      left: Math.round(margins.left * fontScale)      // Y軸ラベルに影響
    };
  }

  /**
   * 最大マージン制約を適用
   */
  private applyMaximumConstraints(
    margins: ChartMargins,
    svgSize: { width: number; height: number }
  ): ChartMargins {
    // 極小サイズでは最大制約を適用しない（軸ラベル表示保証のため）
    if (svgSize.width <= 100 || svgSize.height <= 50) {
      return margins;
    }

    const maxHorizontalMargin = svgSize.width * MARGIN_CONSTRAINTS.MAX_RATIO;
    const maxVerticalMargin = svgSize.height * MARGIN_CONSTRAINTS.MAX_RATIO;

    return {
      top: Math.round(Math.min(margins.top, maxVerticalMargin)),
      right: Math.round(Math.min(margins.right, maxHorizontalMargin)),
      bottom: Math.round(Math.min(margins.bottom, maxVerticalMargin)),
      left: Math.round(Math.min(margins.left, maxHorizontalMargin))
    };
  }
}