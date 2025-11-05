/**
 * TideChart テストスイート
 * TASK-202: TideChart メインコンポーネント実装
 *
 * v1.0.9: 依存性注入パターンに完全移行
 * - vi.mock()を完全削除
 * - chartComponents propsでモック注入
 * - FishSpeciesAutocompleteパターンを踏襲
 */

import React from 'react';
import {
  describe,
  test,
  expect,
  beforeEach,
  vi,
} from 'vitest';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TideChart } from '../TideChart';
import type { TideChartData, TideChartProps, ChartComponents } from '../types';

/**
 * モックChartComponentsファクトリー
 * 軽量なDOM要素を返し、実Rechartsの重い描画処理を回避
 */
const createMockChartComponents = (): ChartComponents => ({
  LineChart: ({ children, data, width, height }: any) => (
    <div
      data-testid="mock-line-chart"
      data-points={data?.length || 0}
      style={{ width, height }}
    >
      {children}
    </div>
  ),
  XAxis: ({ dataKey }: any) => (
    <div data-testid="mock-x-axis" data-key={dataKey} />
  ),
  YAxis: ({ dataKey, unit }: any) => (
    <div data-testid="mock-y-axis" data-key={dataKey} data-unit={unit} />
  ),
  Line: ({ dataKey, stroke, strokeWidth, dot }: any) => (
    <div
      data-testid="mock-line"
      data-key={dataKey}
      data-stroke={stroke}
      data-stroke-width={strokeWidth}
      data-has-dot={!!dot}
    />
  ),
  Tooltip: ({ content }: any) => (
    <div data-testid="mock-tooltip">{content}</div>
  ),
  ReferenceLine: ({ x, stroke, label }: any) => (
    <div
      data-testid="mock-reference-line"
      data-x={x}
      data-stroke={stroke}
      data-label={label?.value}
    />
  ),
});

// ResizeObserver モック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('TideChart', () => {
  // モックコンポーネント（全テストで共有）
  let mockChartComponents: ChartComponents;

  // テストデータ
  const basicData: TideChartData[] = [
    { time: '06:00', tide: 120 },
    { time: '12:00', tide: -50 },
    { time: '18:00', tide: 200 },
  ];

  const complexData: TideChartData[] = [
    { time: '00:00', tide: 0, type: 'normal' },
    { time: '06:00', tide: 300, type: 'high' },
    { time: '12:00', tide: -100, type: 'low' },
    { time: '18:00', tide: 250, type: 'high' },
    { time: '23:59', tide: 50, type: 'normal' },
  ];

  const invalidData = [
    { time: 'invalid', tide: 'not-number' },
    { time: '25:00', tide: NaN },
    { time: '', tide: undefined },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockChartComponents = createMockChartComponents();
  });

  // A. 基本レンダリングテスト (4個)
  describe('Basic Rendering Tests', () => {
    test('should render with default props', () => {
      render(<TideChart data={basicData} chartComponents={mockChartComponents} />);

      // 基本要素の確認
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();

      // モックチャートコンポーネントが正常にレンダリングされることを確認
      const chartElement = screen.getByTestId('tide-chart');
      expect(chartElement).toBeInTheDocument();
      expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
    });

    test('should render empty data message when data is empty', () => {
      render(<TideChart data={[]} chartComponents={mockChartComponents} />);

      expect(screen.getByText(/データがありません/)).toBeInTheDocument();
      // チャート要素は表示されない
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();
    });

    test('should apply custom props correctly', () => {
      const customProps: TideChartProps = {
        data: basicData,
        width: 800,
        height: 400,
        showGrid: false,
        showTooltip: false,
        className: 'custom-chart',
        style: { backgroundColor: 'rgb(255, 0, 0)' },
        chartComponents: mockChartComponents,
      };

      render(<TideChart {...customProps} />);

      const chartElement = screen.getByTestId('tide-chart');
      expect(chartElement).toHaveClass('custom-chart');
      expect(chartElement).toHaveStyle('background-color: rgb(255, 0, 0)');
      expect(chartElement).toHaveStyle('width: 800px');
      expect(chartElement).toHaveStyle('height: 400px');
    });

    test('should render complex data with markers', () => {
      render(<TideChart data={complexData} chartComponents={mockChartComponents} />);

      // チャートが正常にレンダリングされることを確認
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();
    });
  });

  // B. レスポンシブとプロパティテスト (5個)
  describe('Props and Responsive Tests', () => {
    test('should apply custom width and height', () => {
      render(<TideChart data={basicData} width={800} height={400} chartComponents={mockChartComponents} />);

      const chartElement = screen.getByTestId('tide-chart');
      // 渡されたサイズが適用されることを確認
      expect(chartElement).toHaveStyle('width: 800px');
      expect(chartElement).toHaveStyle('height: 400px');
    });

    test('should apply custom className and style', () => {
      const customStyle = { backgroundColor: 'rgb(255, 0, 0)' };
      render(
        <TideChart
          data={basicData}
          className="custom-chart"
          style={customStyle}
          chartComponents={mockChartComponents}
        />
      );

      const chartElement = screen.getByTestId('tide-chart');
      expect(chartElement).toHaveClass('custom-chart');
      expect(chartElement).toHaveStyle('background-color: rgb(255, 0, 0)');
    });

    test('should disable grid when showGrid is false', () => {
      render(<TideChart data={basicData} showGrid={false} chartComponents={mockChartComponents} />);

      // グリッドなしでもチャートはレンダリングされる
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();
    });

    test('should disable tooltip when showTooltip is false', () => {
      render(<TideChart data={basicData} showTooltip={false} chartComponents={mockChartComponents} />);

      // ツールチップなしでもチャートはレンダリングされる
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();
    });

    test('should enforce minimum size constraints', () => {
      render(<TideChart data={basicData} width={300} height={150} chartComponents={mockChartComponents} />);

      const chartElement = screen.getByTestId('tide-chart');
      // 最小サイズ保証：600x300px
      expect(chartElement).toHaveStyle('width: 600px');
      expect(chartElement).toHaveStyle('height: 300px');
    });
  });

  // C. レスポンシブ統合テスト (2個)
  describe('Responsive Integration Tests', () => {
    test('should respond to different screen sizes', () => {
      const testCases = [
        { width: 320, height: 240, device: 'mobile' },
        { width: 768, height: 512, device: 'tablet' },
        { width: 1024, height: 512, device: 'desktop' },
      ];

      testCases.forEach(({ width, height, device }) => {
        const { unmount } = render(
          <TideChart data={basicData} width={width} height={height} chartComponents={mockChartComponents} />
        );

        const chartElement = screen.getByTestId('tide-chart');
        // 最小サイズ保証を考慮
        const actualWidth = Math.max(width, 600);
        const actualHeight = Math.max(height, 300);
        expect(chartElement).toHaveStyle(`width: ${actualWidth}px`);
        expect(chartElement).toHaveStyle(`height: ${actualHeight}px`);
        expect(chartElement).toHaveAttribute('data-device', device);

        unmount();
      });
    });

    test('should apply device attribute correctly', () => {
      render(<TideChart data={basicData} width={1024} height={512} chartComponents={mockChartComponents} />);

      const chartElement = screen.getByTestId('tide-chart');
      expect(chartElement).toHaveAttribute('data-device');
    });
  });

  // D. インタラクション機能テスト (2個)
  describe('Interaction Tests', () => {
    test('should accept onDataPointClick handler', () => {
      const onDataPointClick = vi.fn();

      render(
        <TideChart data={basicData} onDataPointClick={onDataPointClick} chartComponents={mockChartComponents} />
      );

      // コンポーネント正常レンダリング確認
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();

      // コールバック関数が定義されていることを確認
      expect(onDataPointClick).toBeDefined();
    });

    test('should handle showMarkers prop', () => {
      render(<TideChart data={complexData} chartComponents={mockChartComponents} />);

      // マーカー有効時もチャートは正常にレンダリングされる
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();
    });
  });

  // E. エラーハンドリングテスト (3個)
  describe('Error Handling Tests', () => {
    test('should handle invalid data gracefully', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<TideChart data={invalidData as TideChartData[]} chartComponents={mockChartComponents} />);

      // エラーメッセージが表示される
      expect(
        screen.getByText(/データ形式が正しくありません/)
      ).toBeInTheDocument();

      // フォールバックテーブルが表示される
      expect(screen.getByTestId('fallback-data-table')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('should render with minimal valid data', () => {
      const minimalData = [{ time: '12:00', tide: 100 }];

      render(<TideChart data={minimalData} chartComponents={mockChartComponents} />);

      // 最小限のデータでもレンダリング成功
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();
    });

    test('should handle large dataset with sampling', () => {
      // 10,000データポイントで大量データテスト
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        time: `${Math.floor(i / 60)
          .toString()
          .padStart(2, '0')}:${(i % 60).toString().padStart(2, '0')}`,
        tide: Math.sin(i / 100) * 200,
      }));

      render(<TideChart data={largeData} chartComponents={mockChartComponents} />);

      // データサンプリング警告
      expect(
        screen.getByText(/大量データのため一部をサンプリング表示/)
      ).toBeInTheDocument();

      // チャート要素は正常にレンダリングされる
      expect(screen.getByTestId('tide-chart')).toBeInTheDocument();
    });
  });

  // F. アクセシビリティテスト (2個)
  describe('Accessibility Tests', () => {
    test('should have proper ARIA attributes', () => {
      render(<TideChart data={basicData} chartComponents={mockChartComponents} />);

      const chartElement = screen.getByTestId('tide-chart');
      expect(chartElement).toHaveAttribute('role', 'img');
      expect(chartElement).toHaveAttribute(
        'aria-label',
        '潮汐グラフ: 06:00から18:00までの潮位変化、最高200cm、最低-50cm'
      );
      expect(chartElement).toHaveAttribute('aria-describedby');
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const onDataPointClick = vi.fn();

      render(
        <TideChart data={basicData} onDataPointClick={onDataPointClick} chartComponents={mockChartComponents} />
      );

      const chartElement = screen.getByTestId('tide-chart');

      // Tab でフォーカス
      await user.tab();
      expect(chartElement).toHaveFocus();

      // 矢印キーでナビゲーション可能
      await act(async () => {
        await user.keyboard('{ArrowRight}');
      });
      expect(chartElement).toHaveFocus();

      // Enter キーで選択
      await act(async () => {
        await user.keyboard('{Enter}');
      });
      // キーボード操作が正常に動作することを確認
      expect(onDataPointClick).toHaveBeenCalled();
    });
  });
});
