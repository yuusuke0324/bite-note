/**
 * レスポンシブユーティリティ統合テスト
 * TASK-001: レスポンシブユーティリティ実装
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ViewportDetector } from '../ViewportDetector';
import { SVGSizeCalculator } from '../SVGSizeCalculator';
import { MarginCalculator } from '../MarginCalculator';
import type { ViewportInfo, SVGSizeCalculation } from '../types';

// テストヘルパー関数
function mockWindowSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
}

function fireResizeEvent() {
  window.dispatchEvent(new Event('resize'));
}

describe('Responsive Utilities Integration', () => {
  let detector: ViewportDetector;
  let sizeCalculator: SVGSizeCalculator;
  let marginCalculator: MarginCalculator;

  beforeEach(() => {
    detector = new ViewportDetector();
    sizeCalculator = new SVGSizeCalculator();
    marginCalculator = new MarginCalculator();

    // デフォルトサイズ設定
    mockWindowSize(1024, 768);
  });

  describe('utilities coordination', () => {
    test('should work together to calculate chart layout', () => {
      // Given: レスポンシブユーティリティセット
      mockWindowSize(800, 600);
      const viewport = detector.getCurrentViewport();
      const sizeCalculation = sizeCalculator.calculateSize(viewport);

      // Then: 一貫した計算結果（SVGSizeCalculator内部で計算されたmarginsを使用）
      const { margins } = sizeCalculation;
      expect(sizeCalculation.chartWidth).toBe(
        sizeCalculation.containerWidth - margins.left - margins.right
      );
      expect(sizeCalculation.chartHeight).toBe(
        sizeCalculation.containerHeight - margins.top - margins.bottom
      );

      // marginsが妥当な値であることを確認
      expect(margins.top).toBeGreaterThan(0);
      expect(margins.bottom).toBeGreaterThan(0);
      expect(margins.left).toBeGreaterThan(0);
      expect(margins.right).toBeGreaterThan(0);
    });

    test('should maintain consistency across device types', () => {
      const deviceSizes = [
        { width: 375, height: 667, type: 'mobile' },
        { width: 768, height: 1024, type: 'tablet' },
        { width: 1920, height: 1080, type: 'desktop' }
      ];

      const results: SVGSizeCalculation[] = [];

      deviceSizes.forEach(({ width, height, type }) => {
        mockWindowSize(width, height);
        const viewport = detector.getCurrentViewport();
        const calculation = sizeCalculator.calculateSize(viewport);

        expect(viewport.deviceType).toBe(type);
        expect(calculation.chartWidth).toBeGreaterThan(0);
        expect(calculation.chartHeight).toBeGreaterThan(0);

        results.push(calculation);
      });

      // サイズが順次大きくなることを確認
      expect(results[0].containerWidth).toBeLessThan(results[1].containerWidth);
      expect(results[1].containerWidth).toBeLessThan(results[2].containerWidth);
    });
  });

  describe('real-time updates', () => {
    test('should recalculate on viewport change', async () => {
      const results: SVGSizeCalculation[] = [];

      detector.onViewportChange((viewport) => {
        const calculation = sizeCalculator.calculateSize(viewport);
        results.push(calculation);
      });

      // 画面サイズ変更シーケンス
      mockWindowSize(375, 667); // mobile
      fireResizeEvent();

      await new Promise(resolve => setTimeout(resolve, 150)); // デバウンス待機

      mockWindowSize(768, 1024); // tablet
      fireResizeEvent();

      await new Promise(resolve => setTimeout(resolve, 150));

      mockWindowSize(1920, 1080); // desktop
      fireResizeEvent();

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(results).toHaveLength(3);
      expect(results[0].containerWidth).toBeLessThan(results[1].containerWidth);
      expect(results[1].containerWidth).toBeLessThan(results[2].containerWidth);
    });

    test('should handle rapid resize events efficiently', async () => {
      const callback = vi.fn();
      detector.onViewportChange(callback);

      // 短時間で複数回リサイズ
      for (let i = 0; i < 10; i++) {
        mockWindowSize(800 + i * 10, 600);
        fireResizeEvent();
      }

      // デバウンス処理により呼び出し回数が制限される
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('axis label guarantee validation', () => {
    test('should ensure minimum chart area for axis labels', () => {
      const testCases = [
        { width: 320, height: 568 }, // 極小モバイル
        { width: 375, height: 667 }, // iPhone
        { width: 768, height: 1024 }, // iPad
        { width: 1024, height: 768 }, // 小型ノート
        { width: 1920, height: 1080 }, // デスクトップ
      ];

      testCases.forEach(({ width, height }) => {
        mockWindowSize(width, height);
        const viewport = detector.getCurrentViewport();
        const calculation = sizeCalculator.calculateSize(viewport);

        // 軸ラベル表示に必要な最小チャート領域を確保
        expect(calculation.chartWidth).toBeGreaterThanOrEqual(200);
        expect(calculation.chartHeight).toBeGreaterThanOrEqual(150);

        // マージンが軸ラベル表示に十分
        expect(calculation.margins.bottom).toBeGreaterThanOrEqual(40);
        expect(calculation.margins.left).toBeGreaterThanOrEqual(60);
      });
    });

    test('should validate chart dimensions remain positive after margin application', () => {
      // 極小サイズでもチャート領域が正の値を維持
      mockWindowSize(200, 150);
      const viewport = detector.getCurrentViewport();
      const calculation = sizeCalculator.calculateSize(viewport);

      expect(calculation.chartWidth).toBeGreaterThan(0);
      expect(calculation.chartHeight).toBeGreaterThan(0);
      expect(calculation.containerWidth).toBeGreaterThanOrEqual(600); // 最小幅強制
      expect(calculation.containerHeight).toBeGreaterThanOrEqual(300); // 最小高さ強制
    });
  });

  describe('performance integration', () => {
    test('should complete full calculation cycle within performance budget', () => {
      const viewport: ViewportInfo = {
        width: 1920,
        height: 1080,
        deviceType: 'desktop',
        orientation: 'landscape',
        pixelRatio: 1
      };

      const startTime = performance.now();

      // 完全な計算サイクル実行
      const detection = detector.getCurrentViewport();
      const sizeCalculation = sizeCalculator.calculateSize(detection);
      const margins = marginCalculator.calculateMargins(
        { width: sizeCalculation.containerWidth, height: sizeCalculation.containerHeight },
        detection.deviceType
      );

      const endTime = performance.now();

      // 全体で15ms以内に完了
      expect(endTime - startTime).toBeLessThan(15);

      // 結果の整合性確認
      expect(sizeCalculation.margins).toEqual(margins);
    });
  });

  describe('error resilience', () => {
    test('should gracefully handle extreme viewport conditions', () => {
      const extremeCases = [
        { width: 0, height: 0 },
        { width: -100, height: -200 },
        { width: 50000, height: 30000 },
        { width: 100, height: 50 },
      ];

      extremeCases.forEach(({ width, height }) => {
        mockWindowSize(width, height);

        expect(() => {
          const viewport = detector.getCurrentViewport();
          const calculation = sizeCalculator.calculateSize(viewport);
          const margins = marginCalculator.calculateMargins(
            { width: calculation.containerWidth, height: calculation.containerHeight },
            viewport.deviceType
          );
        }).not.toThrow();
      });
    });
  });
});