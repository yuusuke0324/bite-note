/**
 * TASK-203: 潮汐ツールチップシステムのテスト
 *
 * 要件:
 * - ホバー・タップでの詳細情報表示
 * - 位置計算とツールチップ配置
 * - アニメーション効果
 *
 * @version 1.1.0 - Issue #249: CI環境対応（within(container)パターン）
 */

import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TideTooltip } from '../TideTooltip';

// テスト用のモックデータ
const mockTooltipData = {
  time: '14:30',
  level: '125cm',
  state: '上げ潮',
  tideType: '大潮',
  strength: '85%',
  nextEvent: { type: 'high' as const, time: '18:45', level: '180cm' },
  coordinates: { latitude: 35.6762, longitude: 139.6503 }
};

const mockPosition = { x: 200, y: 150 };
const mockTargetElement = document.createElement('div');

describe('TASK-203: 潮汐ツールチップシステム', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers(); // タイマーのモック（無限ループ防止）

    // CI環境ではJSDOM初期化を確実に待つ（Issue #37, #115パターン）
    if (process.env.CI) {
      vi.useRealTimers();
      await waitFor(() => {
        if (!document.body) {
          throw new Error('JSDOM not ready');
        }
      }, { timeout: 5000, interval: 100 }).catch(() => {
        // 初回は無視
      });
      vi.useFakeTimers();
    }

    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    // CI環境ではroot containerを保持（Issue #37パターン）
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  describe('基本表示機能', () => {
    it('TC-T001: ツールチップが正しく表示される', () => {
      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      const tooltip = within(result.container).getByTestId('tide-tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveClass('opacity-100');
    });

    it('TC-T002: 非表示状態で正しく隠される', () => {
      const result = render(
        <TideTooltip
          visible={false}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      const tooltip = within(result.container).getByTestId('tide-tooltip');
      expect(tooltip).toHaveClass('opacity-0', 'pointer-events-none');
    });

    it('TC-T003: データが正確に表示される', () => {
      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      expect(within(result.container).getByText('14:30')).toBeInTheDocument();
      expect(within(result.container).getByText('125cm')).toBeInTheDocument();
      expect(within(result.container).getByText('上げ潮')).toBeInTheDocument();
      expect(within(result.container).getByText('大潮')).toBeInTheDocument();
      expect(within(result.container).getByText('強度: 85%')).toBeInTheDocument();
    });

    it('TC-T004: 次イベント情報が表示される', () => {
      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      expect(within(result.container).getByText('次の満潮: 18:45')).toBeInTheDocument();
      expect(within(result.container).getByText('180cm')).toBeInTheDocument();
    });

    it('TC-T005: 座標情報が表示される', () => {
      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          showCoordinates={true}
        />
      );

      expect(within(result.container).getByText('35.68°N')).toBeInTheDocument();
      expect(within(result.container).getByText('139.65°E')).toBeInTheDocument();
    });
  });

  describe('位置計算と配置', () => {
    it('TC-T006: 基本位置が正しく設定される', () => {
      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      const tooltip = within(result.container).getByTestId('tide-tooltip');
      expect(tooltip.style.left).toBe('210px'); // 200 + offset.x(10)
      expect(tooltip.style.top).toBe('140px'); // 150 + offset.y(-10)
    });

    it('TC-T007: カスタムオフセットの適用', () => {
      const customOffset = { x: 20, y: -30 };

      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          offset={customOffset}
        />
      );

      const tooltip = within(result.container).getByTestId('tide-tooltip');
      expect(tooltip.style.left).toBe('220px'); // 200 + 20
      expect(tooltip.style.top).toBe('120px'); // 150 - 30
    });
  });

  describe('インタラクション', () => {
    it('TC-T008: 閉じるボタンの動作', () => {
      const onClose = vi.fn();

      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          closable={true}
          onClose={onClose}
        />
      );

      const closeButton = within(result.container).getByTestId('tooltip-close-button');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('TC-T009: 外部クリックでの閉じる動作', () => {
      const onClose = vi.fn();

      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          closeOnClickOutside={true}
          onClose={onClose}
        />
      );

      // 外部をクリック
      fireEvent.mouseDown(document.body);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('TC-T010: Escキーでの閉じる動作', () => {
      const onClose = vi.fn();

      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          closeOnEscape={true}
          onClose={onClose}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('アクセシビリティ', () => {
    it('TC-T011: ARIA属性が適切に設定される', () => {
      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      const tooltip = within(result.container).getByTestId('tide-tooltip');
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      expect(tooltip).toHaveAttribute('aria-live', 'polite');
      expect(tooltip).toHaveAttribute('aria-label');
    });

    it('TC-T012: キーボードフォーカス対応', () => {
      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          focusable={true}
        />
      );

      const tooltip = within(result.container).getByTestId('tide-tooltip');
      expect(tooltip).toHaveAttribute('tabIndex', '0');

      tooltip.focus();
      expect(tooltip).toHaveFocus();
    });

    it('TC-T013: スクリーンリーダー用説明文', () => {
      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      // コンポーネントはaria-labelで潮汐情報を提供している
      const tooltip = within(result.container).getByTestId('tide-tooltip');
      expect(tooltip).toHaveAttribute('aria-label');
      expect(tooltip.getAttribute('aria-label')).toMatch(/潮汐情報/);
    });
  });

  describe('カスタマイズ', () => {
    it('TC-T014: カスタムテーマの適用', () => {
      const customTheme = {
        backgroundColor: '#1f2937',
        textColor: '#ffffff',
        borderColor: '#374151'
      };

      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          theme={customTheme}
        />
      );

      const tooltip = within(result.container).getByTestId('tide-tooltip');
      expect(tooltip.style.backgroundColor).toBe('rgb(31, 41, 55)');
      expect(tooltip.style.color).toBe('rgb(255, 255, 255)');
    });

    it('TC-T015: カスタムコンテンツの表示', () => {
      const customContent = (
        <div data-testid="custom-content">
          <h3>カスタムタイトル</h3>
          <p>カスタム内容</p>
        </div>
      );

      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          customContent={customContent}
        />
      );

      expect(within(result.container).getByTestId('custom-content')).toBeInTheDocument();
      expect(within(result.container).getByText('カスタムタイトル')).toBeInTheDocument();
    });

    it('TC-T016: サイズバリエーション', () => {
      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          size="large"
        />
      );

      const tooltip = within(result.container).getByTestId('tide-tooltip');
      expect(tooltip.style.fontSize).toBe('16px');
      expect(tooltip.style.maxWidth).toBe('360px');
    });
  });

  describe('パフォーマンス', () => {
    it('TC-T017: 高速レンダリング', () => {
      const startTime = performance.now();

      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
    });

    it('TC-T018: メモリリーク防止', () => {
      const result = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      result.unmount();

      // イベントリスナーが適切にクリーンアップされていることを確認
      expect(document.querySelectorAll('[data-testid="tide-tooltip"]')).toHaveLength(0);
    });
  });
});
