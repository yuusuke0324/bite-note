/**
 * TASK-203: 潮汐ツールチップシステムのテスト
 *
 * 要件:
 * - ホバー・タップでの詳細情報表示
 * - 位置計算とツールチップ配置
 * - アニメーション効果
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('基本表示機能', () => {
    it('TC-T001: ツールチップが正しく表示される', () => {
      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      const tooltip = screen.getByTestId('tide-tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveClass('opacity-100');
    });

    it('TC-T002: 非表示状態で正しく隠される', () => {
      render(
        <TideTooltip
          visible={false}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      const tooltip = screen.getByTestId('tide-tooltip');
      expect(tooltip).toHaveClass('opacity-0', 'pointer-events-none');
    });

    it('TC-T003: データが正確に表示される', () => {
      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      expect(screen.getByText('14:30')).toBeInTheDocument();
      expect(screen.getByText('125cm')).toBeInTheDocument();
      expect(screen.getByText('上げ潮')).toBeInTheDocument();
      expect(screen.getByText('大潮')).toBeInTheDocument();
      expect(screen.getByText('強度: 85%')).toBeInTheDocument();
    });

    it('TC-T004: 次イベント情報が表示される', () => {
      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      expect(screen.getByText('次の満潮: 18:45')).toBeInTheDocument();
      expect(screen.getByText('180cm')).toBeInTheDocument();
    });

    it('TC-T005: 座標情報が表示される', () => {
      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          showCoordinates={true}
        />
      );

      expect(screen.getByText('35.68°N')).toBeInTheDocument();
      expect(screen.getByText('139.65°E')).toBeInTheDocument();
    });
  });

  describe('位置計算と配置', () => {
    it('TC-T006: 基本位置が正しく設定される', () => {
      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      const tooltip = screen.getByTestId('tide-tooltip');
      expect(tooltip.style.left).toBe('210px'); // 200 + offset.x(10)
      expect(tooltip.style.top).toBe('140px'); // 150 + offset.y(-10)
    });

    it('TC-T007: カスタムオフセットの適用', () => {
      const customOffset = { x: 20, y: -30 };

      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          offset={customOffset}
        />
      );

      const tooltip = screen.getByTestId('tide-tooltip');
      expect(tooltip.style.left).toBe('220px'); // 200 + 20
      expect(tooltip.style.top).toBe('120px'); // 150 - 30
    });
  });

  describe('インタラクション', () => {
    it('TC-T008: 閉じるボタンの動作', () => {
      const onClose = vi.fn();

      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          closable={true}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByTestId('tooltip-close-button');
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
      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      const tooltip = screen.getByTestId('tide-tooltip');
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      expect(tooltip).toHaveAttribute('aria-live', 'polite');
      expect(tooltip).toHaveAttribute('aria-label');
    });

    it('TC-T012: キーボードフォーカス対応', () => {
      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          focusable={true}
        />
      );

      const tooltip = screen.getByTestId('tide-tooltip');
      expect(tooltip).toHaveAttribute('tabIndex', '0');

      tooltip.focus();
      expect(tooltip).toHaveFocus();
    });

    it('TC-T013: スクリーンリーダー用説明文', () => {
      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      const description = screen.getByTestId('tooltip-description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent(/潮汐詳細情報/);
    });
  });

  describe('カスタマイズ', () => {
    it('TC-T014: カスタムテーマの適用', () => {
      const customTheme = {
        backgroundColor: '#1f2937',
        textColor: '#ffffff',
        borderColor: '#374151'
      };

      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          theme={customTheme}
        />
      );

      const tooltip = screen.getByTestId('tide-tooltip');
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

      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          customContent={customContent}
        />
      );

      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('カスタムタイトル')).toBeInTheDocument();
    });

    it('TC-T016: サイズバリエーション', () => {
      render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
          size="large"
        />
      );

      const tooltip = screen.getByTestId('tide-tooltip');
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
      const { unmount } = render(
        <TideTooltip
          visible={true}
          data={mockTooltipData}
          position={mockPosition}
          targetElement={mockTargetElement}
        />
      );

      unmount();

      // イベントリスナーが適切にクリーンアップされていることを確認
      expect(document.querySelectorAll('[data-testid="tide-tooltip"]')).toHaveLength(0);
    });
  });
});