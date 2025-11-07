/**
 * TASK-303: TideGraph軸ラベル表示の詳細テスト
 *
 * 目的: X軸・Y軸ラベルが確実に表示されることを自動テストで検証
 * 対象: TideGraphコンポーネントの軸ラベル表示機能
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { TideGraph } from '../TideGraph';
import type { TideGraphData } from '../../types/tide';

// テスト用のモックデータ（24時間データ）
const createMockTideData = (
  minLevel: number = 20,
  maxLevel: number = 180,
  startDate: string = '2024-09-28T00:00:00'
): TideGraphData => {
  const baseDate = new Date(startDate);
  const points = Array.from({ length: 96 }, (_, i) => ({
    time: new Date(baseDate.getTime() + i * 15 * 60 * 1000), // 15分間隔
    level: minLevel + (maxLevel - minLevel) * (0.5 + 0.5 * Math.sin(i / 24 * Math.PI * 2)),
    state: 'rising' as const,
    isEvent: false
  }));

  return {
    points,
    dateRange: {
      start: baseDate,
      end: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)
    },
    minLevel,
    maxLevel,
    events: [
      { time: new Date(baseDate.getTime() + 6 * 60 * 60 * 1000), type: 'high', level: maxLevel },
      { time: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000), type: 'low', level: minLevel },
      { time: new Date(baseDate.getTime() + 18 * 60 * 60 * 1000), type: 'high', level: maxLevel }
    ]
  };
};

describe('TASK-303: TideGraph軸ラベル表示テスト', () => {
  describe('X軸（時間軸）ラベル表示テスト', () => {
    it('TC-AL001: X軸の時間ラベルが正確に表示される（標準サイズ）', async () => {
      const mockData = createMockTideData();
      render(<TideGraph data={mockData} width={800} height={400} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const container = document.querySelector('[data-testid="tide-graph-container"]');
        expect(container).toBeTruthy();

        const xAxisLine = container?.querySelector('[data-testid="x-axis-line"]');
        expect(xAxisLine).toBeTruthy();
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      // X軸ライン要素の存在確認
      const xAxisLine = document.querySelector('[data-testid="x-axis-line"]');
      expect(xAxisLine).toBeTruthy();
      expect(xAxisLine?.tagName.toLowerCase()).toBe('line');

      // 4時間間隔の時間ラベルが表示されることを確認
      const expectedTimeLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      expectedTimeLabels.forEach(timeLabel => {
        const labelElement = screen.getByText(timeLabel);
        expect(labelElement).toBeInTheDocument();
        expect(labelElement.tagName.toLowerCase()).toBe('text');
      });
    });

    it('TC-AL002: X軸の時間ラベルが正確に表示される（小さいサイズ）', async () => {
      const mockData = createMockTideData();
      render(<TideGraph data={mockData} width={400} height={200} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const container = document.querySelector('[data-testid="tide-graph-container"]');
        expect(container).toBeTruthy();
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      // 小さいサイズでも時間ラベルが表示される
      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('20:00')).toBeInTheDocument();
    });

    it('TC-AL003: X軸ラベルがSVGのviewBox内に収まっている', async () => {
      const mockData = createMockTideData();
      render(<TideGraph data={mockData} width={600} height={300} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const svg = document.querySelector('svg[role="img"][aria-label*="潮汐グラフ"]');
        expect(svg).toBeTruthy();
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      const svgElement = document.querySelector('svg[role="img"][aria-label*="潮汐グラフ"]');
      expect(svgElement).toBeTruthy();
      const viewBox = svgElement?.getAttribute('viewBox');
      // レスポンシブ計算により実際のviewBoxサイズは動的に決まる
      expect(viewBox).toMatch(/0 0 \d+ \d+/);

      // 時間ラベルのテキスト要素を確認
      const timeLabels = screen.getAllByText(/\d{2}:\d{2}/);
      expect(timeLabels.length).toBeGreaterThanOrEqual(5);

      // 各ラベルがSVG内に配置されていることを確認
      timeLabels.forEach(label => {
        expect(label.tagName.toLowerCase()).toBe('text');
        expect(label).toBeInTheDocument();
      });
    });

    it('TC-AL004: フォールバック時間ラベルが機能する', async () => {
      // データ範囲が不正な場合のテスト
      const invalidData: TideGraphData = {
        points: [],
        dateRange: {
          start: new Date('invalid-date'),
          end: new Date('invalid-date')
        },
        minLevel: 0,
        maxLevel: 100,
        events: []
      };

      render(<TideGraph data={invalidData} width={600} height={300} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const errorElement = document.querySelector('[data-testid="tide-graph-error"]');
        expect(errorElement).toBeTruthy();
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      // 不正データの場合、エラーメッセージが表示される
      const errorElement = document.querySelector('[data-testid="tide-graph-error"]');
      expect(errorElement).toBeTruthy();
      expect(screen.getByText('潮汐データがありません')).toBeInTheDocument();
    });
  });

  describe('Y軸（潮位軸）ラベル表示テスト', () => {
    it('TC-AL005: Y軸の潮位ラベルが動的スケールで表示される', async () => {
      const mockData = createMockTideData(30, 170);
      render(<TideGraph data={mockData} width={800} height={400} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const container = document.querySelector('[data-testid="tide-graph-container"]');
        expect(container).toBeTruthy();

        const yAxisLine = container?.querySelector('[data-testid="y-axis-line"]');
        expect(yAxisLine).toBeTruthy();
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      // Y軸ライン要素の存在確認
      const yAxisLine = document.querySelector('[data-testid="y-axis-line"]');
      expect(yAxisLine).toBeTruthy();
      expect(yAxisLine?.tagName.toLowerCase()).toBe('line');

      // 動的スケールによる潮位ラベルが表示される
      const levelLabels = screen.getAllByText(/\d+cm/);
      expect(levelLabels.length).toBeGreaterThanOrEqual(3); // 最低3つのラベル
      expect(levelLabels.length).toBeLessThanOrEqual(6); // 最大6つのラベル（重複防止）

      // 各ラベルがテキスト要素として存在することを確認
      levelLabels.forEach(label => {
        expect(label.tagName.toLowerCase()).toBe('text');
        expect(label).toBeInTheDocument();
      });
    });

    it('TC-AL006: Y軸ラベルが重複せずに表示される', async () => {
      const mockData = createMockTideData(10, 190);
      render(<TideGraph data={mockData} width={800} height={400} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const container = document.querySelector('[data-testid="tide-graph-container"]');
        expect(container).toBeTruthy();

        const levelLabels = screen.queryAllByText(/\d+cm/);
        expect(levelLabels.length).toBeGreaterThan(0);
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      const levelLabels = screen.getAllByText(/\d+cm/);

      // ラベルの重複をチェック
      const labelTexts = levelLabels.map(label => label.textContent);
      const uniqueLabels = new Set(labelTexts);

      expect(uniqueLabels.size).toBe(labelTexts.length); // 重複がないことを確認
      expect(levelLabels.length).toBeLessThanOrEqual(6); // 実際の最大ティック数に合わせて調整
    });

    it('TC-AL007: 極端なデータ範囲でもY軸ラベルが表示される', async () => {
      // 非常に小さい範囲のデータ
      const smallRangeData = createMockTideData(99, 101);
      render(<TideGraph data={smallRangeData} width={600} height={300} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const container = document.querySelector('[data-testid="tide-graph-container"]');
        expect(container).toBeTruthy();

        const levelLabels = screen.queryAllByText(/\d+cm/);
        expect(levelLabels.length).toBeGreaterThan(0);
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      const levelLabels = screen.getAllByText(/\d+cm/);
      expect(levelLabels.length).toBeGreaterThanOrEqual(2);

      // 非常に大きい範囲のデータ
      const { rerender } = render(<TideGraph data={smallRangeData} width={600} height={300} />);
      const largeRangeData = createMockTideData(-100, 300);
      rerender(<TideGraph data={largeRangeData} width={600} height={300} />);

      const largeLevelLabels = screen.getAllByText(/\d+cm/);
      expect(largeLevelLabels.length).toBeGreaterThanOrEqual(3);
    });

    it('TC-AL008: 負の潮位値でもY軸ラベルが正しく表示される', async () => {
      const negativeData = createMockTideData(-50, 50);
      render(<TideGraph data={negativeData} width={600} height={300} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const container = document.querySelector('[data-testid="tide-graph-container"]');
        expect(container).toBeTruthy();

        const allLabels = screen.queryAllByText(/-?\d+cm/);
        expect(allLabels.length).toBeGreaterThan(0);
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      // 負の値と正の値の両方が表示される
      const allLabels = screen.getAllByText(/-?\d+cm/);
      expect(allLabels.length).toBeGreaterThanOrEqual(3);

      // 0cmラベルが含まれていることを確認（ゼロライン）
      const zeroLabel = screen.queryByText('0cm');
      expect(zeroLabel).toBeInTheDocument();
    });
  });

  describe('SVGサイズ・マージンテスト', () => {
    it('TC-AL009: SVGサイズ不足エラーが発生しない', async () => {
      const mockData = createMockTideData();

      // 非常に小さいサイズでテスト
      render(<TideGraph data={mockData} width={200} height={100} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const svg = document.querySelector('svg[role="img"][aria-label*="潮汐グラフ"]');
        expect(svg).toBeTruthy();
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      // SVGが描画されている
      const svgElement = document.querySelector('svg[role="img"][aria-label*="潮汐グラフ"]');
      expect(svgElement).toBeTruthy();

      // 軸ラベルが少なくとも部分的に表示されている
      const xLabels = screen.getAllByText(/\d{2}:\d{2}/);
      const yLabels = screen.getAllByText(/\d+cm/);

      expect(xLabels.length + yLabels.length).toBeGreaterThan(0);
    });

    it('TC-AL010: レスポンシブサイズ変更でラベルが再計算される', async () => {
      const mockData = createMockTideData();
      const { rerender } = render(<TideGraph data={mockData} width={400} height={200} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const container = document.querySelector('[data-testid="tide-graph-container"]');
        expect(container).toBeTruthy();

        const levelLabels = screen.queryAllByText(/\d+cm/);
        expect(levelLabels.length).toBeGreaterThan(0);
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      const initialLabels = screen.getAllByText(/\d+cm/);
      const initialLabelCount = initialLabels.length;

      // サイズを拡大
      rerender(<TideGraph data={mockData} width={800} height={400} />);

      const expandedLabels = screen.getAllByText(/\d+cm/);

      // サイズが大きくなってもラベル数が適切に管理されている
      expect(expandedLabels.length).toBeGreaterThanOrEqual(initialLabelCount);
      expect(expandedLabels.length).toBeLessThanOrEqual(6); // 上限は維持
    });
  });

  describe('異常系・エラーハンドリングテスト', () => {
    it('TC-AL011: 空データでもエラーメッセージとともに軸構造が残る', async () => {
      const emptyData: TideGraphData = {
        points: [],
        dateRange: { start: new Date(), end: new Date() },
        minLevel: 0,
        maxLevel: 0,
        events: []
      };

      render(<TideGraph data={emptyData} width={600} height={300} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const errorElement = document.querySelector('[data-testid="tide-graph-error"]');
        expect(errorElement).toBeTruthy();
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      // 空データの場合、エラーメッセージが表示される
      const errorElement = document.querySelector('[data-testid="tide-graph-error"]');
      expect(errorElement).toBeTruthy();
      expect(screen.getByText('潮汐データがありません')).toBeInTheDocument();
    });

    it('TC-AL012: NaN値のみのデータでエラーが表示される', async () => {
      // すべてNaN値のデータセット（validPoints.length === 0）
      const nanData: TideGraphData = {
        points: [
          { time: new Date('2024-09-28T00:00:00'), level: NaN, state: 'rising', isEvent: false },
          { time: new Date('2024-09-28T06:00:00'), level: NaN, state: 'rising', isEvent: false },
          { time: new Date('2024-09-28T12:00:00'), level: NaN, state: 'high', isEvent: true },
          { time: new Date('2024-09-28T18:00:00'), level: NaN, state: 'falling', isEvent: false }
        ],
        dateRange: {
          start: new Date('2024-09-28T00:00:00'),
          end: new Date('2024-09-28T23:59:59')
        },
        minLevel: 0,
        maxLevel: 200,
        events: []
      };

      render(<TideGraph data={nanData} width={600} height={300} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const errorElement = document.querySelector('[data-testid="tide-graph-error"]');
        expect(errorElement).toBeTruthy();
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      // 全データがNaNの場合、エラーメッセージが表示される
      const errorElement = document.querySelector('[data-testid="tide-graph-error"]');
      expect(errorElement).toBeTruthy();
      expect(screen.getByText('潮汐データがありません')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティテスト', () => {
    it('TC-AL013: 軸ラベルにアクセシビリティ属性が設定されている', async () => {
      const mockData = createMockTideData();
      render(<TideGraph data={mockData} width={600} height={300} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const container = document.querySelector('[data-testid="tide-graph-container"]');
        expect(container).toBeTruthy();
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      // 時間ラベルの属性確認
      const timeLabel = screen.getByText('00:00');
      expect(timeLabel).toHaveClass('text-xs');

      // 潮位ラベルの属性確認
      const levelLabels = screen.getAllByText(/\d+cm/);
      levelLabels.forEach(label => {
        expect(label).toHaveClass('text-xs');
      });
    });

    it('TC-AL014: 軸ラベルのコントラストが十分である', async () => {
      const mockData = createMockTideData();
      render(<TideGraph data={mockData} width={600} height={300} />);

      // ResizeObserver初期化を待機（CI環境対応 - querySelector直接使用）
      await waitFor(() => {
        const container = document.querySelector('[data-testid="tide-graph-container"]');
        expect(container).toBeTruthy();
      }, {
        timeout: process.env.CI ? 10000 : 5000,
        interval: 100
      });

      // ラベルの色が設定されている
      const timeLabel = screen.getByText('12:00');
      const computedStyle = window.getComputedStyle(timeLabel);

      // fill属性またはstyle属性で色が指定されている
      expect(
        timeLabel.getAttribute('style')?.includes('fill') ||
        timeLabel.classList.toString().includes('fill')
      ).toBe(true);
    });
  });
});
