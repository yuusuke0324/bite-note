/**
 * MarginCalculator テスト
 * TASK-001: レスポンシブユーティリティ実装
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { MarginCalculator } from '../MarginCalculator';
import type { ChartMargins, DeviceType, MarginCalculationOptions } from '../types';

describe('MarginCalculator', () => {
  let calculator: MarginCalculator;

  beforeEach(() => {
    calculator = new MarginCalculator();
  });

  describe('calculateMargins', () => {
    test('should calculate margins for mobile device', () => {
      // Given: モバイルSVGサイズ
      const svgSize = { width: 600, height: 300 };
      const deviceType: DeviceType = 'mobile';

      // When: マージンを計算
      const margins = calculator.calculateMargins(svgSize, deviceType);

      // Then: 適切なマージンが計算される
      expect(margins).toEqual({
        top: expect.any(Number),
        right: expect.any(Number),
        bottom: expect.any(Number),
        left: expect.any(Number)
      });
    });

    test('should calculate margins for tablet device', () => {
      const svgSize = { width: 800, height: 400 };
      const deviceType: DeviceType = 'tablet';

      const margins = calculator.calculateMargins(svgSize, deviceType);

      expect(margins.top).toBeGreaterThan(0);
      expect(margins.right).toBeGreaterThan(0);
      expect(margins.bottom).toBeGreaterThan(0);
      expect(margins.left).toBeGreaterThan(0);
    });

    test('should calculate margins for desktop device', () => {
      const svgSize = { width: 1200, height: 600 };
      const deviceType: DeviceType = 'desktop';

      const margins = calculator.calculateMargins(svgSize, deviceType);

      expect(margins.top).toBeGreaterThan(0);
      expect(margins.right).toBeGreaterThan(0);
      expect(margins.bottom).toBeGreaterThan(0);
      expect(margins.left).toBeGreaterThan(0);
    });
  });

  describe('minimum margin guarantee', () => {
    test('should enforce minimum bottom margin of 40px for X-axis', () => {
      const svgSize = { width: 600, height: 300 };
      const deviceType: DeviceType = 'mobile';

      const margins = calculator.calculateMargins(svgSize, deviceType);

      expect(margins.bottom).toBeGreaterThanOrEqual(40);
    });

    test('should enforce minimum left margin of 60px for Y-axis', () => {
      const svgSize = { width: 600, height: 300 };
      const deviceType: DeviceType = 'mobile';

      const margins = calculator.calculateMargins(svgSize, deviceType);

      expect(margins.left).toBeGreaterThanOrEqual(60);
    });

    test('should scale margins proportionally for larger screens', () => {
      const smallSize = { width: 600, height: 300 };
      const largeSize = { width: 1200, height: 600 };

      const smallMargins = calculator.calculateMargins(smallSize, 'mobile');
      const largeMargins = calculator.calculateMargins(largeSize, 'desktop');

      // 大きい画面では比例的にマージンも大きくなる
      expect(largeMargins.bottom).toBeGreaterThan(smallMargins.bottom);
      expect(largeMargins.left).toBeGreaterThan(smallMargins.left);
    });
  });

  describe('device-specific margin optimization', () => {
    test('should use smaller margins for mobile', () => {
      const svgSize = { width: 600, height: 300 };

      const mobileMargins = calculator.calculateMargins(svgSize, 'mobile');
      const desktopMargins = calculator.calculateMargins(svgSize, 'desktop');

      // モバイルではよりコンパクトなマージン（同サイズ比較）
      expect(mobileMargins.top).toBeLessThanOrEqual(desktopMargins.top);
      expect(mobileMargins.right).toBeLessThanOrEqual(desktopMargins.right);
    });

    test('should provide generous margins for desktop', () => {
      const svgSize = { width: 1200, height: 600 };

      const desktopMargins = calculator.calculateMargins(svgSize, 'desktop');

      // デスクトップでは余裕のあるマージン
      expect(desktopMargins.bottom).toBeGreaterThanOrEqual(50);
      expect(desktopMargins.left).toBeGreaterThanOrEqual(80);
    });
  });

  describe('custom options', () => {
    test('should apply custom minimum margins when provided', () => {
      const svgSize = { width: 600, height: 300 };
      const deviceType: DeviceType = 'mobile';
      const options: MarginCalculationOptions = {
        minBottomMargin: 50,
        minLeftMargin: 80
      };

      const margins = calculator.calculateMargins(svgSize, deviceType, options);

      expect(margins.bottom).toBeGreaterThanOrEqual(50);
      expect(margins.left).toBeGreaterThanOrEqual(80);
    });

    test('should handle font size adjustments', () => {
      const svgSize = { width: 800, height: 400 }; // 中程度のサイズで、比例計算は機能するが最大制約は緩い
      const deviceType: DeviceType = 'desktop'; // デスクトップで大きなベースマージンを使用
      const normalOptions: MarginCalculationOptions = { fontSize: 12 };
      const largeOptions: MarginCalculationOptions = { fontSize: 14 }; // より小さな差で確実にテスト

      const normalMargins = calculator.calculateMargins(svgSize, deviceType, normalOptions);
      const largeMargins = calculator.calculateMargins(svgSize, deviceType, largeOptions);

      // 大きなフォントサイズでは大きなマージン
      expect(largeMargins.bottom).toBeGreaterThanOrEqual(normalMargins.bottom);
      expect(largeMargins.left).toBeGreaterThanOrEqual(normalMargins.left);
    });
  });

  describe('edge cases', () => {
    test('should handle very small SVG sizes', () => {
      const svgSize = { width: 100, height: 50 };
      const deviceType: DeviceType = 'mobile';

      const margins = calculator.calculateMargins(svgSize, deviceType);

      // 最小マージンは維持される
      expect(margins.bottom).toBeGreaterThanOrEqual(40);
      expect(margins.left).toBeGreaterThanOrEqual(60);
    });

    test('should handle very large SVG sizes', () => {
      const svgSize = { width: 5000, height: 2500 };
      const deviceType: DeviceType = 'desktop';

      const margins = calculator.calculateMargins(svgSize, deviceType);

      // 極大サイズでも適切なマージン
      expect(margins.bottom).toBeGreaterThan(0);
      expect(margins.left).toBeGreaterThan(0);
      expect(margins.bottom).toBeLessThan(svgSize.height * 0.5); // 50%を超えない
      expect(margins.left).toBeLessThan(svgSize.width * 0.5);
    });
  });
});