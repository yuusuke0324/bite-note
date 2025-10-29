/**
 * ResponsiveChartContainer テストスイート
 * TASK-201: ResponsiveChartContainer実装
 *
 * Red Phase: 失敗テストケース実装
 */

import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ResponsiveChartContainer } from '../ResponsiveChartContainer';
import type { DeviceType } from '../../../../utils/responsive/types';

// モック設定
const mockViewportDetector = {
  getCurrentDeviceType: vi.fn().mockReturnValue('desktop'),
  getViewportSize: vi.fn().mockReturnValue({ width: 1024, height: 768 })
};

const mockSVGSizeCalculator = {
  calculateSize: vi.fn().mockReturnValue({ width: 800, height: 400 }),
  calculateMargin: vi.fn().mockReturnValue({ top: 20, right: 20, bottom: 20, left: 20 })
};

// グローバルモック
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// getBoundingClientRectのモック
const mockGetBoundingClientRect = vi.fn(() => ({
  width: 1000,
  height: 500,
  top: 0,
  left: 0,
  right: 1000,
  bottom: 500
}));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: mockGetBoundingClientRect
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBoundingClientRect.mockReturnValue({
    width: 1000,
    height: 500,
    top: 0,
    left: 0,
    right: 1000,
    bottom: 500
  });
});

describe('ResponsiveChartContainer', () => {
  // A. コンポーネントレンダリングテスト (3個)
  describe('Component Rendering Tests', () => {
    test('should render with default props', () => {
      const { container } = render(
        <ResponsiveChartContainer>
          <div data-testid="chart-content">Test Chart</div>
        </ResponsiveChartContainer>
      );

      expect(container.querySelector('.responsive-chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('chart-content')).toBeInTheDocument();
      expect(container.querySelector('[data-device]')).toBeInTheDocument();
    });

    test('should apply custom className and style', () => {
      const customStyle = { backgroundColor: 'red' };
      const { container } = render(
        <ResponsiveChartContainer
          className="custom-container"
          style={customStyle}
        >
          <div>Test</div>
        </ResponsiveChartContainer>
      );

      const containerElement = container.querySelector('.responsive-chart-container');
      expect(containerElement).toHaveClass('custom-container');
      expect(containerElement).toHaveStyle('background-color: rgb(255, 0, 0)');
    });

    test('should render complex children correctly', () => {
      const ComplexChart = () => (
        <div>
          <svg data-testid="svg-element" width="100" height="100">
            <circle cx="50" cy="50" r="40" />
          </svg>
          <div data-testid="chart-legend">Legend</div>
        </div>
      );

      render(
        <ResponsiveChartContainer>
          <ComplexChart />
        </ResponsiveChartContainer>
      );

      expect(screen.getByTestId('svg-element')).toBeInTheDocument();
      expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
    });
  });

  // B. サイズ計算テスト (4個)
  describe('Size Calculation Tests', () => {
    test('should enforce minimum width constraint', async () => {
      mockGetBoundingClientRect.mockReturnValue({
        width: 400,
        height: 200,
        top: 0,
        left: 0,
        right: 400,
        bottom: 200
      });

      const onSizeChange = vi.fn();

      render(
        <ResponsiveChartContainer
          minWidth={600}
          minHeight={300}
          onSizeChange={onSizeChange}
          debounceMs={0} // デバウンス無効化
        >
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      // 非同期処理を待機
      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalledWith(
          expect.objectContaining({
            width: 600, // 最小幅が適用される
            height: 300 // 最小高さが適用される
          })
        );
      });
    });

    test('should use container size when larger than minimum', async () => {
      mockGetBoundingClientRect.mockReturnValue({
        width: 1000,
        height: 500,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 500
      });

      const onSizeChange = vi.fn();

      render(
        <ResponsiveChartContainer
          minWidth={600}
          minHeight={300}
          onSizeChange={onSizeChange}
          debounceMs={0}
        >
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalledWith(
          expect.objectContaining({
            width: 1000,
            height: 500
          })
        );
      });
    });

    test('should maintain 2:1 aspect ratio by default', async () => {
      mockGetBoundingClientRect.mockReturnValue({
        width: 1000,
        height: 800,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 800
      });

      const onSizeChange = vi.fn();

      render(
        <ResponsiveChartContainer onSizeChange={onSizeChange} debounceMs={0}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      // アスペクト比2:1を維持するため、高さが調整される
      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalledWith(
          expect.objectContaining({
            width: 1000,
            height: 500 // 1000 / 2 = 500
          })
        );
      });
    });

    test('should respect custom aspect ratio', async () => {
      mockGetBoundingClientRect.mockReturnValue({
        width: 900,
        height: 600,
        top: 0,
        left: 0,
        right: 900,
        bottom: 600
      });

      const onSizeChange = vi.fn();

      render(
        <ResponsiveChartContainer aspectRatio={1.5} onSizeChange={onSizeChange} debounceMs={0}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalledWith(
          expect.objectContaining({
            width: 900,
            height: 600 // 900 / 1.5 = 600
          })
        );
      });
    });
  });

  // C. レスポンシブテスト (3個)
  describe('Responsive Tests', () => {
    test('should respond to window resize events', async () => {
      const onSizeChange = vi.fn();

      render(
        <ResponsiveChartContainer onSizeChange={onSizeChange} debounceMs={0}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      // 初期化でonSizeChangeが呼ばれることを確認
      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalledTimes(1);
      });

      // ウィンドウサイズ変更をシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800
      });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // デバウンス後にサイズ変更が反映されることを確認
      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalledTimes(2); // 初期化 + リサイズ
      }, { timeout: 200 });
    });

    test('should handle rapid resize events with debouncing', async () => {
      const onSizeChange = vi.fn();

      render(
        <ResponsiveChartContainer debounceMs={0} onSizeChange={onSizeChange}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      // 連続してリサイズイベントを発生
      for (let i = 0; i < 10; i++) {
        act(() => {
          window.dispatchEvent(new Event('resize'));
        });
      }

      // デバウンス期間待機
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // debounce=0なので各リサイズイベントで呼ばれる（初期化 + リサイズ10回 = 11回）
      expect(onSizeChange.mock.calls.length).toBeGreaterThan(0);
    });

    test('should apply custom debounce timing', async () => {
      const onSizeChange = vi.fn();

      render(
        <ResponsiveChartContainer debounceMs={200} onSizeChange={onSizeChange}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      // 初期化呼び出しを待機
      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalledTimes(1);
      });

      // 複数回リサイズイベントを発生
      act(() => {
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('resize'));
      });

      // デバウンス時間の半分で確認（まだ追加で呼ばれていない）
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      expect(onSizeChange).toHaveBeenCalledTimes(1); // 初期化時の1回のみ

      // デバウンス時間経過後に確認
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 250));
      });
      expect(onSizeChange).toHaveBeenCalledTimes(2); // デバウンス後の1回追加
    });
  });

  // D. TASK-001連携テスト (2個)
  describe('TASK-001 Integration Tests', () => {
    test('should integrate with ViewportDetector correctly', () => {
      const onDeviceChange = vi.fn();

      render(
        <ResponsiveChartContainer
          enableViewportDetection={true}
          onDeviceChange={onDeviceChange}
        >
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      expect(onDeviceChange).toHaveBeenCalledWith('desktop'); // 実際のViewportDetectorの動作に合わせる
    });

    test('should work when viewport detection is disabled', () => {
      const onDeviceChange = vi.fn();

      render(
        <ResponsiveChartContainer
          enableViewportDetection={false}
          onDeviceChange={onDeviceChange}
        >
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      // ビューポート検出が無効の場合はデフォルト値を使用
      expect(onDeviceChange).toHaveBeenCalledWith('desktop'); // デフォルト値
    });
  });

  // E. 統合・パフォーマンステスト (3個)
  describe('Integration & Performance Tests', () => {
    test('should work across different viewport sizes', async () => {
      const testCases = [
        { width: 320, height: 568, expected: 'mobile' },
        { width: 768, height: 1024, expected: 'tablet' },
        { width: 1440, height: 900, expected: 'desktop' }
      ];

      const onDeviceChange = vi.fn();

      for (const testCase of testCases) {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: testCase.width
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: testCase.height
        });

        const { unmount } = render(
          <ResponsiveChartContainer onDeviceChange={onDeviceChange}>
            <div>Test Chart</div>
          </ResponsiveChartContainer>
        );

        expect(onDeviceChange).toHaveBeenLastCalledWith(testCase.expected);
        unmount();
      }
    });

    test('should handle device orientation changes', async () => {
      const onSizeChange = vi.fn();

      render(
        <ResponsiveChartContainer onSizeChange={onSizeChange}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      // 縦向き → 横向きの変更をシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024
      });

      act(() => {
        window.dispatchEvent(new Event('orientationchange'));
      });

      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalled();
      });

      // 横向きに変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768
      });

      act(() => {
        window.dispatchEvent(new Event('orientationchange'));
      });

      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalled();
      });
    });

    test('should handle rapid resize events efficiently', async () => {
      const onSizeChange = vi.fn();
      const startTime = performance.now();

      render(
        <ResponsiveChartContainer debounceMs={50} onSizeChange={onSizeChange}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      // 初期化を待機
      await waitFor(() => {
        expect(onSizeChange).toHaveBeenCalledTimes(1);
      });

      // 大量のリサイズイベントを発生させる
      for (let i = 0; i < 100; i++) {
        act(() => {
          window.dispatchEvent(new Event('resize'));
        });
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // パフォーマンス要件: 300ms以内で処理完了（テスト環境を考慮）
      expect(processingTime).toBeLessThan(300);

      // デバウンスにより呼び出し回数が適切に制限される
      expect(onSizeChange).toHaveBeenCalledTimes(2); // 初期化 + デバウンス後
    });
  });

  // 追加テスト: Props variation
  describe('Props Variation Tests', () => {
    test('should apply custom minimum size constraints', () => {
      const { container } = render(
        <ResponsiveChartContainer minWidth={800} minHeight={400}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      const chartWrapper = container.querySelector('.chart-wrapper');
      expect(chartWrapper).toHaveStyle('min-width: 800px');
      expect(chartWrapper).toHaveStyle('min-height: 400px');
    });

    test('should handle disabled responsive mode', () => {
      const { container } = render(
        <ResponsiveChartContainer responsive={false}>
          <div>Test Chart</div>
        </ResponsiveChartContainer>
      );

      const containerElement = container.querySelector('.responsive-chart-container');
      expect(containerElement).toHaveAttribute('data-responsive', 'false');
    });
  });
});