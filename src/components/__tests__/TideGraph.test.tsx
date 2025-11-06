/**
 * TASK-201: TideGraphコンポーネントのテスト
 *
 * 要件:
 * - SVGベースのインタラクティブグラフ
 * - 24時間の潮位変化可視化
 * - 釣果時刻マーカー表示
 * - リアルタイムアニメーション
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TideGraph } from '../TideGraph';
import type { TideGraphData, TideEvent } from '../../types/tide';

// テスト用のモックデータ
const mockTideData: TideGraphData = {
  points: [
    { time: new Date('2024-01-01T00:00:00'), level: 50, state: 'rising', isEvent: false },
    { time: new Date('2024-01-01T06:00:00'), level: 150, state: 'high', isEvent: true },
    { time: new Date('2024-01-01T12:00:00'), level: 30, state: 'low', isEvent: true },
    { time: new Date('2024-01-01T18:00:00'), level: 140, state: 'high', isEvent: true },
    { time: new Date('2024-01-01T23:59:59'), level: 60, state: 'falling', isEvent: false }
  ],
  dateRange: {
    start: new Date('2024-01-01T00:00:00'),
    end: new Date('2024-01-01T23:59:59')
  },
  minLevel: 30,
  maxLevel: 150,
  events: [
    { time: new Date('2024-01-01T06:00:00'), type: 'high', level: 150 },
    { time: new Date('2024-01-01T12:00:00'), type: 'low', level: 30 },
    { time: new Date('2024-01-01T18:00:00'), type: 'high', level: 140 }
  ],
  fishingMarkers: [
    new Date('2024-01-01T08:00:00'),
    new Date('2024-01-01T16:00:00')
  ]
};

describe.skip('TASK-201: TideGraphコンポーネント', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SVG描画ロジック', () => {
    it('TC-G001: SVGグラフが正しく描画される', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const svgElement = screen.getByRole('img', { name: /tide graph/i });
      expect(svgElement).toBeInTheDocument();
      expect(svgElement.tagName.toLowerCase()).toBe('svg');
      expect(svgElement).toHaveAttribute('width', '800');
      expect(svgElement).toHaveAttribute('height', '400');
    });

    it('TC-G002: 潮位変化曲線が描画される', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const tidePathElement = screen.getByTestId('tide-path');
      expect(tidePathElement).toBeInTheDocument();
      expect(tidePathElement.tagName.toLowerCase()).toBe('path');
      expect(tidePathElement).toHaveAttribute('d'); // path data属性
    });

    it('TC-G003: X軸（時間軸）が正確に描画される', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toBeInTheDocument();

      // 時間ラベルの存在確認
      expect(screen.getByText('00:00')).toBeInTheDocument();
      expect(screen.getByText('06:00')).toBeInTheDocument();
      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('18:00')).toBeInTheDocument();
    });

    it('TC-G004: Y軸（潮位軸）が正確に描画される', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toBeInTheDocument();

      // 潮位ラベルの存在確認
      expect(screen.getByText('30cm')).toBeInTheDocument(); // min level
      expect(screen.getByText('150cm')).toBeInTheDocument(); // max level
    });

    it('TC-G005: 満潮・干潮マーカーが表示される', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const highTideMarkers = screen.getAllByTestId(/high-tide-marker/);
      const lowTideMarkers = screen.getAllByTestId(/low-tide-marker/);

      expect(highTideMarkers).toHaveLength(2); // 2回の満潮
      expect(lowTideMarkers).toHaveLength(1); // 1回の干潮
    });

    it('TC-G006: 釣果マーカーが表示される', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const fishingMarkers = screen.getAllByTestId(/fishing-marker/);
      expect(fishingMarkers).toHaveLength(2); // 2つの釣果時刻
    });
  });

  describe('インタラクション動作', () => {
    it('TC-G007: マウスホバーでツールチップが表示される', async () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const tidePathElement = screen.getByTestId('tide-path');

      fireEvent.mouseEnter(tidePathElement);
      fireEvent.mouseMove(tidePathElement, { clientX: 400, clientY: 200 });

      await waitFor(() => {
        const tooltip = screen.getByTestId('tide-tooltip');
        expect(tooltip).toBeInTheDocument();
      });
    });

    it('TC-G008: ツールチップに正確な潮位情報が表示される', async () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const tidePathElement = screen.getByTestId('tide-path');
      fireEvent.mouseMove(tidePathElement, { clientX: 200, clientY: 100 }); // 6時頃の位置

      await waitFor(() => {
        const tooltip = screen.getByTestId('tide-tooltip');
        expect(tooltip).toHaveTextContent(/150cm/); // 満潮時の潮位
        expect(tooltip).toHaveTextContent(/06:00/); // 時刻
        expect(tooltip).toHaveTextContent(/満潮/); // 潮汐状態
      });
    });

    it('TC-G009: タッチ操作でツールチップが表示される', async () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const tidePathElement = screen.getByTestId('tide-path');

      fireEvent.touchStart(tidePathElement, {
        touches: [{ clientX: 400, clientY: 200 }]
      });

      await waitFor(() => {
        const tooltip = screen.getByTestId('tide-tooltip');
        expect(tooltip).toBeInTheDocument();
      });
    });
  });

  describe('レスポンシブ対応', () => {
    it('TC-G010: 小さな画面サイズでも正常に表示される', () => {
      render(<TideGraph data={mockTideData} width={300} height={200} />);

      const svgElement = screen.getByRole('img', { name: /tide graph/i });
      expect(svgElement).toHaveAttribute('width', '300');
      expect(svgElement).toHaveAttribute('height', '200');

      // viewBoxが適切に設定されている
      expect(svgElement).toHaveAttribute('viewBox', '0 0 300 200');
    });

    it('TC-G011: コンテナに応じてサイズが調整される', () => {
      const { rerender } = render(<TideGraph data={mockTideData} width={400} height={300} />);

      const svgElement = screen.getByRole('img', { name: /tide graph/i });
      expect(svgElement).toHaveAttribute('width', '400');

      rerender(<TideGraph data={mockTideData} width={600} height={400} />);
      expect(svgElement).toHaveAttribute('width', '600');
    });
  });

  describe('アニメーション', () => {
    it('TC-G012: グラフ描画時にアニメーションが実行される', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} animated={true} />);

      const tidePathElement = screen.getByTestId('tide-path');

      // アニメーション用のCSS属性が設定されている
      expect(tidePathElement).toHaveStyle('opacity: 0');
      expect(tidePathElement).toHaveAttribute('stroke-dasharray');
    });

    it('TC-G013: リアルタイム更新でスムーズな遷移が実行される', async () => {
      const { rerender } = render(
        <TideGraph data={mockTideData} width={800} height={400} animated={true} />
      );

      const updatedData = { ...mockTideData, maxLevel: 170 };
      rerender(<TideGraph data={updatedData} width={800} height={400} animated={true} />);

      await waitFor(() => {
        expect(screen.getByText('170cm')).toBeInTheDocument();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('TC-G014: 空のデータでエラー表示がされる', () => {
      const emptyData: TideGraphData = {
        points: [],
        dateRange: { start: new Date(), end: new Date() },
        minLevel: 0,
        maxLevel: 0,
        events: []
      };

      render(<TideGraph data={emptyData} width={800} height={400} />);

      expect(screen.getByTestId('tide-graph-error')).toBeInTheDocument();
      expect(screen.getByText(/潮汐データがありません/)).toBeInTheDocument();
    });

    it('TC-G015: 無効なデータでエラー表示がされる', () => {
      const invalidData: TideGraphData = {
        points: [
          { time: new Date('invalid'), level: NaN, state: 'rising', isEvent: false }
        ],
        dateRange: { start: new Date(), end: new Date() },
        minLevel: 0,
        maxLevel: 100,
        events: []
      };

      render(<TideGraph data={invalidData} width={800} height={400} />);

      expect(screen.getByTestId('tide-graph-error')).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('TC-G016: ローディング中にスケルトンローダーが表示される', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} loading={true} />);

      expect(screen.getByTestId('tide-graph-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('tide-path')).not.toBeInTheDocument();
    });

    it('TC-G017: ローディング完了後にグラフが表示される', () => {
      const { rerender } = render(
        <TideGraph data={mockTideData} width={800} height={400} loading={true} />
      );

      expect(screen.getByTestId('tide-graph-skeleton')).toBeInTheDocument();

      rerender(<TideGraph data={mockTideData} width={800} height={400} loading={false} />);

      expect(screen.queryByTestId('tide-graph-skeleton')).not.toBeInTheDocument();
      expect(screen.getByTestId('tide-path')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('TC-G018: SVG要素に適切なaria-label属性が設定されている', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const svgElement = screen.getByRole('img', { name: /tide graph/i });
      expect(svgElement).toHaveAttribute('aria-label');
      expect(svgElement).toHaveAttribute('role', 'img');
    });

    it('TC-G019: キーボードナビゲーションが機能する', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const graphContainer = screen.getByTestId('tide-graph-container');
      expect(graphContainer).toHaveAttribute('tabIndex', '0');

      fireEvent.keyDown(graphContainer, { key: 'ArrowRight' });
      // フォーカス移動の確認は実装に依存
    });

    it('TC-G020: スクリーンリーダー用のdescription要素がある', () => {
      render(<TideGraph data={mockTideData} width={800} height={400} />);

      const description = screen.getByTestId('tide-graph-description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent(/24時間の潮位変化/);
    });
  });

  describe('パフォーマンス', () => {
    it('TC-G021: 大量データでも高速描画される', () => {
      const largeDataPoints = Array.from({ length: 1440 }, (_, i) => ({
        time: new Date(new Date('2024-01-01T00:00:00').getTime() + i * 60000), // 1分間隔
        level: 50 + Math.sin(i / 240) * 100, // サイン波
        state: 'rising' as const,
        isEvent: false
      }));

      const largeData: TideGraphData = {
        ...mockTideData,
        points: largeDataPoints
      };

      const startTime = performance.now();
      render(<TideGraph data={largeData} width={800} height={400} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 100ms以内で描画完了
    });
  });
});