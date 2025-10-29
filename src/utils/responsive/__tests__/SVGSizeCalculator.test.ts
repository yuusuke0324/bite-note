/**
 * SVGSizeCalculator テスト
 * TASK-001: レスポンシブユーティリティ実装
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { SVGSizeCalculator } from '../SVGSizeCalculator';
import type { ViewportInfo, SVGSizeCalculation, DeviceType } from '../types';

describe('SVGSizeCalculator', () => {
  let calculator: SVGSizeCalculator;

  beforeEach(() => {
    calculator = new SVGSizeCalculator();
  });

  describe('calculateSize', () => {
    test('should calculate size for mobile viewport', () => {
      // Given: モバイルビューポート
      const viewport: ViewportInfo = {
        width: 375,
        height: 667,
        deviceType: 'mobile',
        orientation: 'portrait',
        pixelRatio: 2
      };

      // When: サイズを計算
      const result = calculator.calculateSize(viewport);

      // Then: 適切なサイズが計算される
      expect(result).toEqual({
        containerWidth: expect.any(Number),
        containerHeight: expect.any(Number),
        chartWidth: expect.any(Number),
        chartHeight: expect.any(Number),
        margins: expect.objectContaining({
          top: expect.any(Number),
          right: expect.any(Number),
          bottom: expect.any(Number),
          left: expect.any(Number)
        }),
        scaleFactor: expect.any(Number),
        isMinimumSize: expect.any(Boolean)
      });
    });

    test('should calculate size for tablet viewport', () => {
      const viewport: ViewportInfo = {
        width: 768,
        height: 1024,
        deviceType: 'tablet',
        orientation: 'portrait',
        pixelRatio: 1
      };

      const result = calculator.calculateSize(viewport);

      expect(result.containerWidth).toBeGreaterThan(0);
      expect(result.containerHeight).toBeGreaterThan(0);
      expect(result.chartWidth).toBeGreaterThan(0);
      expect(result.chartHeight).toBeGreaterThan(0);
    });

    test('should calculate size for desktop viewport', () => {
      const viewport: ViewportInfo = {
        width: 1920,
        height: 1080,
        deviceType: 'desktop',
        orientation: 'landscape',
        pixelRatio: 1
      };

      const result = calculator.calculateSize(viewport);

      expect(result.containerWidth).toBeGreaterThan(0);
      expect(result.containerHeight).toBeGreaterThan(0);
    });
  });

  describe('minimum size guarantee', () => {
    test('should enforce minimum width of 600px', () => {
      const viewport: ViewportInfo = {
        width: 320, // 最小幅未満
        height: 568,
        deviceType: 'mobile',
        orientation: 'portrait',
        pixelRatio: 2
      };

      const result = calculator.calculateSize(viewport);

      expect(result.containerWidth).toBeGreaterThanOrEqual(600);
      expect(result.isMinimumSize).toBe(true);
    });

    test('should enforce minimum height of 300px', () => {
      const viewport: ViewportInfo = {
        width: 800,
        height: 200, // 最小高さ未満
        deviceType: 'tablet',
        orientation: 'landscape',
        pixelRatio: 1
      };

      const result = calculator.calculateSize(viewport);

      expect(result.containerHeight).toBeGreaterThanOrEqual(300);
      expect(result.isMinimumSize).toBe(true);
    });

    test('should not enforce minimum for large screens', () => {
      const viewport: ViewportInfo = {
        width: 1920,
        height: 1080,
        deviceType: 'desktop',
        orientation: 'landscape',
        pixelRatio: 1
      };

      const result = calculator.calculateSize(viewport);

      expect(result.isMinimumSize).toBe(false);
    });
  });

  describe('aspect ratio maintenance', () => {
    test('should maintain 2:1 aspect ratio', () => {
      const viewport: ViewportInfo = {
        width: 800,
        height: 600,
        deviceType: 'tablet',
        orientation: 'landscape',
        pixelRatio: 1
      };

      const result = calculator.calculateSize(viewport);

      const aspectRatio = result.containerWidth / result.containerHeight;
      expect(aspectRatio).toBeCloseTo(2.0, 1);
    });

    test('should adjust height when width is constrained', () => {
      const viewport: ViewportInfo = {
        width: 600, // 最小幅
        height: 800,
        deviceType: 'mobile',
        orientation: 'portrait',
        pixelRatio: 1
      };

      const result = calculator.calculateSize(viewport);

      expect(result.containerWidth).toBe(600);
      expect(result.containerHeight).toBe(300); // 600 / 2
    });
  });

  describe('viewport width constraint', () => {
    test('should limit to 90% of viewport width', () => {
      const viewport: ViewportInfo = {
        width: 1000,
        height: 800,
        deviceType: 'desktop',
        orientation: 'landscape',
        pixelRatio: 1
      };

      const result = calculator.calculateSize(viewport);

      expect(result.containerWidth).toBeLessThanOrEqual(viewport.width * 0.9);
    });
  });

  describe('performance', () => {
    test('should calculate size within 10ms', () => {
      const viewport: ViewportInfo = {
        width: 1920,
        height: 1080,
        deviceType: 'desktop',
        orientation: 'landscape',
        pixelRatio: 1
      };

      const startTime = performance.now();
      calculator.calculateSize(viewport);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10);
    });
  });
});