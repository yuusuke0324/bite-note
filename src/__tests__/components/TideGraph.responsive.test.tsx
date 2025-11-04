/**
 * TASK-001: TideGraph Responsive Integration Tests
 *
 * レスポンシブTideGraphコンポーネントの統合テストケース
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { TideGraph } from '../../components/TideGraph';
import type { TideGraphData } from '../../types/tide';

// テストデータ
const mockTideGraphData: TideGraphData = {
  points: [
    { time: new Date('2024-09-25T00:00:00'), level: 1.2, state: 'rising', isEvent: false },
    { time: new Date('2024-09-25T03:00:00'), level: 2.1, state: 'high', isEvent: true },
    { time: new Date('2024-09-25T06:00:00'), level: 0.8, state: 'falling', isEvent: false },
    { time: new Date('2024-09-25T09:00:00'), level: 1.9, state: 'low', isEvent: true },
    { time: new Date('2024-09-25T12:00:00'), level: 0.5, state: 'rising', isEvent: false },
    { time: new Date('2024-09-25T15:00:00'), level: 2.3, state: 'high', isEvent: true },
    { time: new Date('2024-09-25T18:00:00'), level: 0.7, state: 'falling', isEvent: false },
    { time: new Date('2024-09-25T21:00:00'), level: 2.0, state: 'low', isEvent: true },
    { time: new Date('2024-09-25T23:59:00'), level: 1.4, state: 'rising', isEvent: false }
  ],
  dateRange: {
    start: new Date('2024-09-25T00:00:00'),
    end: new Date('2024-09-25T23:59:59')
  },
  tideEvents: [
    { time: new Date('2024-09-25T03:00:00'), type: 'high' as const, level: 2.1 },
    { time: new Date('2024-09-25T09:00:00'), type: 'low' as const, level: 0.8 },
    { time: new Date('2024-09-25T15:00:00'), type: 'high' as const, level: 2.3 },
    { time: new Date('2024-09-25T21:00:00'), type: 'low' as const, level: 0.7 }
  ],
  fishingTime: new Date('2024-09-25T12:00:00'),
  maxLevel: 2.3,
  minLevel: 0.5
};

// ResizeObserver モック
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  private elements: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element): void {
    this.elements.add(element);
  }

  unobserve(element: Element): void {
    this.elements.delete(element);
  }

  disconnect(): void {
    this.elements.clear();
  }

  mockResize(dimensions: { width: number; height: number }): void {
    const entries: ResizeObserverEntry[] = Array.from(this.elements).map(element => ({
      target: element,
      contentRect: {
        width: dimensions.width,
        height: dimensions.height,
        top: 0,
        left: 0,
        bottom: dimensions.height,
        right: dimensions.width,
        x: 0,
        y: 0,
        toJSON: () => ({})
      },
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: []
    } as ResizeObserverEntry));

    act(() => {
      this.callback(entries, this);
    });
  }
}

describe('TideGraph Responsive Integration', () => {
  let mockResizeObserver: MockResizeObserver;
  let originalResizeObserver: typeof ResizeObserver;

  beforeAll(() => {
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = MockResizeObserver as any;
  });

  afterAll(() => {
    global.ResizeObserver = originalResizeObserver;
  });

  beforeEach(() => {
    mockResizeObserver = new MockResizeObserver(() => {});
    global.ResizeObserver = vi.fn().mockImplementation((callback) => {
      mockResizeObserver = new MockResizeObserver(callback);
      return mockResizeObserver;
    });
  });

  describe('basic responsive rendering', () => {
    it('should render with default responsive behavior', () => {
      render(
        <TideGraph
          data={mockTideGraphData}
          width={800}
          height={450}
        />
      );

      const svg = screen.getByTestId('tide-svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 800 450');
    });

    it('should apply responsive configuration when provided', () => {
      const responsiveConfig = {
        responsive: true,
        maxWidth: '100%',
        aspectRatio: 16/9,
        breakpoints: { mobile: 480, tablet: 768, desktop: 1024 },
        preventHorizontalScroll: true
      };

      render(
        <TideGraph
          data={mockTideGraphData}
          width={800}
          height={450}
          // @ts-expect-error - 将来の拡張Props
          responsiveConfig={responsiveConfig}
        />
      );

      const container = screen.getByTestId('tide-graph-container');
      expect(container).toHaveStyle('max-width: 100%');
    });
  });

  describe('breakpoint behavior', () => {
    it('should adapt to mobile viewport (375px)', () => {
      // モバイルビューポートをシミュレート
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      render(
        <TideGraph
          data={mockTideGraphData}
          width={375}
          height={211}
        />
      );

      const svg = screen.getByTestId('tide-svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 375 211');

      // モバイルでは文字サイズが適切に調整される
      const labels = screen.getAllByTestId('axis-label');
      labels.forEach(label => {
        const styles = window.getComputedStyle(label);
        expect(parseInt(styles.fontSize || '12')).toBeGreaterThanOrEqual(12);
      });
    });

    it('should adapt to tablet viewport (768px)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });

      render(
        <TideGraph
          data={mockTideGraphData}
          width={768}
          height={432}
        />
      );

      const svg = screen.getByTestId('tide-svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 768 432');

      const container = screen.getByTestId('tide-graph-container');
      expect(container).toHaveClass('tablet-layout');
    });

    it('should adapt to desktop viewport (1200px)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200 });

      render(
        <TideGraph
          data={mockTideGraphData}
          width={1200}
          height={675}
        />
      );

      const svg = screen.getByTestId('tide-svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 1200 675');

      const container = screen.getByTestId('tide-graph-container');
      expect(container).toHaveClass('desktop-layout');
    });
  });

  describe('horizontal scroll prevention', () => {
    it('should never exceed container width on mobile', () => {
      const containerWidth = 320; // 最小モバイル幅
      Object.defineProperty(window, 'innerWidth', { value: containerWidth });

      render(
        <TideGraph
          data={mockTideGraphData}
          width={containerWidth}
          height={180}
        />
      );

      const svg = screen.getByTestId('tide-svg');
      const boundingRect = svg.getBoundingClientRect();
      expect(boundingRect.width).toBeLessThanOrEqual(containerWidth);
    });

    it('should apply overflow-x: hidden to container', () => {
      render(
        <TideGraph
          data={mockTideGraphData}
          width={800}
          height={450}
        />
      );

      const container = screen.getByTestId('tide-graph-container');
      expect(container).toHaveStyle('overflow-x: hidden');
    });

    it('should maintain aspect ratio while preventing horizontal scroll', () => {
      const containerWidth = 375;
      const expectedHeight = Math.floor(containerWidth / (16/9));

      render(
        <TideGraph
          data={mockTideGraphData}
          width={containerWidth}
          height={expectedHeight}
        />
      );

      const svg = screen.getByTestId('tide-svg');
      const viewBox = svg.getAttribute('viewBox')?.split(' ');

      if (viewBox) {
        const width = parseInt(viewBox[2]);
        const height = parseInt(viewBox[3]);
        const actualRatio = width / height;
        expect(actualRatio).toBeCloseTo(16/9, 1);
      }
    });
  });

  describe('dynamic resizing', () => {
    it('should update dimensions on window resize', async () => {
      const { rerender } = render(
        <TideGraph
          data={mockTideGraphData}
          width={1200}
          height={675}
        />
      );

      // 初期サイズ確認
      expect(screen.getByTestId('tide-svg')).toHaveAttribute('viewBox', '0 0 1200 675');

      // 画面サイズ変更をシミュレート
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 768 });
        global.dispatchEvent(new Event('resize'));
      });

      // コンポーネントを再レンダリング（新しいpropsで）
      rerender(
        <TideGraph
          data={mockTideGraphData}
          width={768}
          height={432}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('tide-svg')).toHaveAttribute('viewBox', '0 0 768 432');
      });
    });

    it('should handle rapid resize events efficiently', async () => {
      render(
        <TideGraph
          data={mockTideGraphData}
          width={800}
          height={450}
        />
      );

      const resizeStartTime = performance.now();

      // 複数回の高速リサイズをシミュレート
      for (let i = 0; i < 5; i++) {
        act(() => {
          global.dispatchEvent(new Event('resize'));
        });
      }

      const resizeEndTime = performance.now();
      const resizeTime = resizeEndTime - resizeStartTime;

      // リサイズ処理が100ms以内に完了することを確認
      expect(resizeTime).toBeLessThan(100);
    });
  });

  describe('touch and mouse interactions', () => {
    it('should support touch interactions on mobile', async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      render(
        <TideGraph
          data={mockTideGraphData}
          width={375}
          height={211}
        />
      );

      const tideArea = screen.getByTestId('tide-area');

      // タッチイベントをシミュレート
      await user.pointer({ target: tideArea, keys: '[TouchA>]' });

      // ツールチップが表示されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('tide-tooltip')).toBeInTheDocument();
      });
    });

    it('should support mouse interactions on desktop', async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, 'innerWidth', { value: 1200 });

      render(
        <TideGraph
          data={mockTideGraphData}
          width={1200}
          height={675}
        />
      );

      const tideArea = screen.getByTestId('tide-area');

      // マウスホバーをシミュレート
      await user.hover(tideArea);

      // ツールチップが表示されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('tide-tooltip')).toBeInTheDocument();
      });
    });

    it('should ensure tooltip stays within viewport bounds', async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      render(
        <TideGraph
          data={mockTideGraphData}
          width={375}
          height={211}
        />
      );

      const tideArea = screen.getByTestId('tide-area');
      await user.hover(tideArea);

      await waitFor(() => {
        const tooltip = screen.getByTestId('tide-tooltip');
        const tooltipRect = tooltip.getBoundingClientRect();

        // ツールチップが画面の右端を超えないことを確認
        expect(tooltipRect.right).toBeLessThanOrEqual(375);
      });
    });
  });

  describe('accessibility', () => {
    it('should maintain ARIA labels across all screen sizes', () => {
      const testSizes = [375, 768, 1200];

      testSizes.forEach(width => {
        const height = Math.floor(width / (16/9));

        render(
          <TideGraph
            data={mockTideGraphData}
            width={width}
            height={height}
          />
        );

        const svg = screen.getByTestId('tide-svg');
        expect(svg).toHaveAttribute('role', 'img');
        expect(svg).toHaveAttribute('aria-label');
        expect(svg.getAttribute('aria-label')).toContain('潮汐グラフ');
      });
    });

    it('should support keyboard navigation on all screen sizes', async () => {
      const user = userEvent.setup();

      render(
        <TideGraph
          data={mockTideGraphData}
          width={800}
          height={450}
        />
      );

      // フォーカス可能な要素を見つける
      const focusableElements = screen.getAllByRole('button');

      if (focusableElements.length > 0) {
        // Tab キーでナビゲーション
        await user.tab();
        expect(focusableElements[0]).toHaveFocus();
      }
    });
  });

  describe('performance', () => {
    it('should render within 200ms', async () => {
      const renderStartTime = performance.now();

      render(
        <TideGraph
          data={mockTideGraphData}
          width={800}
          height={450}
        />
      );

      await screen.findByTestId('tide-svg');

      const renderEndTime = performance.now();
      const renderTime = renderEndTime - renderStartTime;

      expect(renderTime).toBeLessThan(200);
    });

    it('should maintain 60fps during interactions', async () => {
      const user = userEvent.setup();

      render(
        <TideGraph
          data={mockTideGraphData}
          width={800}
          height={450}
        />
      );

      const tideArea = screen.getByTestId('tide-area');
      const startTime = performance.now();

      // 高速で複数のマウス移動をシミュレート
      for (let i = 0; i < 10; i++) {
        await user.hover(tideArea);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 10回のインタラクションが167ms以内（60fps相当）で完了することを確認
      expect(totalTime).toBeLessThan(167);
    });
  });
});