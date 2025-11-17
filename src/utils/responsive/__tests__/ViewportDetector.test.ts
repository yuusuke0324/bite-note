/**
 * ViewportDetector テスト
 * TASK-001: レスポンシブユーティリティ実装
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ViewportDetector } from '../ViewportDetector';
import type { ViewportInfo, DeviceType } from '../types';

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

describe('ViewportDetector', () => {
  let detector: ViewportDetector;

  beforeEach(() => {
    // 各テスト前にインスタンス作成
    detector = new ViewportDetector();

    // デフォルトサイズ設定
    mockWindowSize(1024, 768);
  });

  afterEach(() => {
    // クリーンアップ
    vi.clearAllMocks();
  });

  describe('getCurrentViewport', () => {
    test('should detect mobile viewport correctly', () => {
      // Given: モバイルサイズのビューポート
      mockWindowSize(375, 667);

      // When: ビューポート情報を取得
      const viewport = detector.getCurrentViewport();

      // Then: モバイルデバイスとして正しく検出
      expect(viewport).toEqual({
        width: 375,
        height: 667,
        deviceType: 'mobile',
        orientation: 'portrait',
        pixelRatio: expect.any(Number)
      });
    });

    test('should detect tablet viewport correctly', () => {
      // Given: タブレットサイズのビューポート
      mockWindowSize(768, 1024);

      // When: ビューポート情報を取得
      const viewport = detector.getCurrentViewport();

      // Then: タブレットデバイスとして正しく検出
      expect(viewport).toEqual({
        width: 768,
        height: 1024,
        deviceType: 'tablet',
        orientation: 'portrait',
        pixelRatio: expect.any(Number)
      });
    });

    test('should detect desktop viewport correctly', () => {
      // Given: デスクトップサイズのビューポート
      mockWindowSize(1920, 1080);

      // When: ビューポート情報を取得
      const viewport = detector.getCurrentViewport();

      // Then: デスクトップデバイスとして正しく検出
      expect(viewport).toEqual({
        width: 1920,
        height: 1080,
        deviceType: 'desktop',
        orientation: 'landscape',
        pixelRatio: expect.any(Number)
      });
    });
  });

  describe('viewport boundary detection', () => {
    test('should detect 320px as mobile', () => {
      mockWindowSize(320, 568);
      expect(detector.getCurrentViewport().deviceType).toBe('mobile');
    });

    test('should detect 767px as mobile', () => {
      mockWindowSize(767, 1024);
      expect(detector.getCurrentViewport().deviceType).toBe('mobile');
    });

    test('should detect 768px as tablet', () => {
      mockWindowSize(768, 1024);
      expect(detector.getCurrentViewport().deviceType).toBe('tablet');
    });

    test('should detect 1023px as tablet', () => {
      mockWindowSize(1023, 768);
      expect(detector.getCurrentViewport().deviceType).toBe('tablet');
    });

    test('should detect 1024px as desktop', () => {
      mockWindowSize(1024, 768);
      expect(detector.getCurrentViewport().deviceType).toBe('desktop');
    });
  });

  describe('orientation detection', () => {
    test('should detect portrait orientation', () => {
      mockWindowSize(375, 812); // width < height
      expect(detector.getCurrentViewport().orientation).toBe('portrait');
    });

    test('should detect landscape orientation', () => {
      mockWindowSize(812, 375); // width > height
      expect(detector.getCurrentViewport().orientation).toBe('landscape');
    });

    test('should handle square aspect ratio', () => {
      mockWindowSize(600, 600); // width === height
      expect(detector.getCurrentViewport().orientation).toBe('portrait'); // デフォルト
    });
  });

  describe('viewport change detection', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // フェイクタイマー環境でdetectorを再作成
      detector = new ViewportDetector();
      mockWindowSize(1024, 768);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should call callback on viewport change', async () => {
      const callback = vi.fn();
      const unsubscribe = detector.onViewportChange(callback);

      // Given: 初期状態
      mockWindowSize(375, 667);

      // When: 画面サイズが変更
      mockWindowSize(768, 1024);
      fireResizeEvent();

      // リサイズイベントのデバウンス待機（100ms）
      await vi.advanceTimersByTimeAsync(100);

      // Then: コールバックが呼ばれる
      expect(callback).toHaveBeenCalledWith({
        width: 768,
        height: 1024,
        deviceType: 'tablet',
        orientation: 'portrait',
        pixelRatio: expect.any(Number)
      });

      unsubscribe();
    });

    test('should not call callback after unsubscribe', async () => {
      const callback = vi.fn();
      const unsubscribe = detector.onViewportChange(callback);

      unsubscribe();

      mockWindowSize(1920, 1080);
      fireResizeEvent();

      // デバウンス待機（100ms）
      await vi.advanceTimersByTimeAsync(100);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('error cases', () => {
    test('should handle zero viewport size', () => {
      mockWindowSize(0, 0);

      expect(() => {
        detector.getCurrentViewport();
      }).not.toThrow();

      const viewport = detector.getCurrentViewport();
      expect(viewport.deviceType).toBe('mobile'); // デフォルト
    });

    test('should handle negative viewport size', () => {
      mockWindowSize(-100, -200);

      const viewport = detector.getCurrentViewport();
      expect(viewport.width).toBeGreaterThan(0);
      expect(viewport.height).toBeGreaterThan(0);
    });

    test('should handle extremely large viewport', () => {
      mockWindowSize(10000, 8000);

      const viewport = detector.getCurrentViewport();
      expect(viewport.deviceType).toBe('desktop');
      expect(viewport.width).toBe(10000);
      expect(viewport.height).toBe(8000);
    });
  });
});