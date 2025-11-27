/**
 * TASK-202: TideSummaryCardコンポーネントのテスト
 *
 * 要件:
 * - 4項目グリッド表示（潮汐タイプ・状態・次イベント・強度）
 * - 今日の潮汐イベント一覧
 * - アイコン・カラーシステム統合
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TideSummaryCard } from '../TideSummaryCard';
import { TideSummaryGrid } from '../TideSummaryGrid';
import { TideEventsList } from '../TideEventsList';
import type { TideInfo } from '../../types/tide';

// テスト用のモックデータ
const mockTideInfo: TideInfo = {
  location: { latitude: 35.6762, longitude: 139.6503 },
  date: new Date('2024-01-15T12:00:00'),
  currentState: 'rising',
  currentLevel: 120,
  tideType: 'spring',
  tideStrength: 85,
  events: [
    { time: new Date('2024-01-15T06:15:00'), type: 'high', level: 180 },
    { time: new Date('2024-01-15T12:30:00'), type: 'low', level: 45 },
    { time: new Date('2024-01-15T18:45:00'), type: 'high', level: 175 },
    { time: new Date('2024-01-16T00:30:00'), type: 'low', level: 50 }
  ],
  nextEvent: { time: new Date('2024-01-15T12:30:00'), type: 'low', level: 45 },
  calculatedAt: new Date('2024-01-15T12:00:00'),
  accuracy: 'high'
};

const mockEmptyTideInfo: TideInfo = {
  location: { latitude: 35.6762, longitude: 139.6503 },
  date: new Date('2024-01-15T12:00:00'),
  currentState: 'rising',
  currentLevel: 100,
  tideType: 'medium',
  tideStrength: 60,
  events: [],
  nextEvent: null,
  calculatedAt: new Date('2024-01-15T12:00:00'),
  accuracy: 'medium'
};

// TASK-202 Step 2: TideSummaryGrid 4項目グリッド表示のテスト
describe('TASK-202 Step 2: TideSummaryGrid 4項目グリッド表示', () => {
  beforeEach(async () => {
    // CI環境ではJSDOM初期化を確実に待つ（Tech-lead recommendation for Issue #45）
    if (process.env.CI) {
      // より長い待機時間とポーリングでbody確認
      await waitFor(() => {
        if (!document.body || document.body.children.length === 0) {
          throw new Error('JSDOM not ready');
        }
      }, { timeout: 5000, interval: 100 });
    } else {
      // ローカル環境は高速化のため最小限
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    vi.clearAllMocks();
  });

  describe('4項目グリッド表示', () => {
    it('TC-S001: 潮汐タイプが正しく表示される', () => {
      render(<TideSummaryGrid tideInfo={mockTideInfo} />);

      const tideTypeSection = screen.getByTestId('tide-type-section');
      expect(tideTypeSection).toBeInTheDocument();
      expect(screen.getByText('大潮')).toBeInTheDocument();
      expect(screen.getByText('潮汐タイプ')).toBeInTheDocument();
    });

    it('TC-S002: 現在の潮汐状態が表示される', () => {
      render(<TideSummaryGrid tideInfo={mockTideInfo} />);

      const currentStateSection = screen.getByTestId('current-state-section');
      expect(currentStateSection).toBeInTheDocument();
      expect(screen.getByText('上げ潮')).toBeInTheDocument();
      expect(screen.getByText('120cm')).toBeInTheDocument();
    });

    it('TC-S003: 次イベント情報が表示される', () => {
      render(<TideSummaryGrid tideInfo={mockTideInfo} />);

      const nextEventSection = screen.getByTestId('next-event-section');
      expect(nextEventSection).toBeInTheDocument();

      // グリッド内の次イベント情報をチェック
      expect(nextEventSection).toHaveTextContent('干潮');
      expect(nextEventSection).toHaveTextContent('12:30');
      expect(nextEventSection).toHaveTextContent('45cm');
    });

    it('TC-S004: 潮汐強度が表示される', () => {
      render(<TideSummaryGrid tideInfo={mockTideInfo} />);

      const strengthSection = screen.getByTestId('tide-strength-section');
      expect(strengthSection).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('潮汐強度')).toBeInTheDocument();
    });

    it('TC-S005: 2×2グリッドレイアウトが適用される', () => {
      render(<TideSummaryGrid tideInfo={mockTideInfo} />);

      const gridContainer = screen.getByTestId('summary-grid');
      expect(gridContainer).toBeInTheDocument();
      // レスポンシブクラスを確認: モバイル(1列) → タブレット(2×2)
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2');

      const gridItems = screen.getAllByTestId(/.*-section$/);
      expect(gridItems).toHaveLength(4);
    });

    it('TC-S006: 次イベントがない場合の表示', () => {
      render(<TideSummaryGrid tideInfo={mockEmptyTideInfo} />);

      const nextEventSection = screen.getByTestId('next-event-section');
      expect(nextEventSection).toBeInTheDocument();
      expect(screen.getByText('データなし')).toBeInTheDocument();
    });
  });
});

// TASK-202 Step 3: TideEventsList 今日の潮汐イベント一覧のテスト
describe('TASK-202 Step 3: TideEventsList 今日の潮汐イベント一覧', () => {
  beforeEach(async () => {
    // CI環境ではJSDOM初期化を確実に待つ（Tech-lead recommendation for Issue #45）
    if (process.env.CI) {
      // より長い待機時間とポーリングでbody確認
      await waitFor(() => {
        if (!document.body || document.body.children.length === 0) {
          throw new Error('JSDOM not ready');
        }
      }, { timeout: 5000, interval: 100 });
    } else {
      // ローカル環境は高速化のため最小限
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    vi.clearAllMocks();
  });

  describe('今日の潮汐イベント一覧', () => {
    it('TC-S007: イベントリストが表示される', () => {
      render(
        <TideEventsList
          events={mockTideInfo.events}
          targetDate={mockTideInfo.date}
        />
      );

      const eventsList = screen.getByTestId('tide-events-list');
      expect(eventsList).toBeInTheDocument();
    });

    it('TC-S008: 各イベントの詳細が表示される', () => {
      render(
        <TideEventsList
          events={mockTideInfo.events}
          targetDate={mockTideInfo.date}
        />
      );

      const eventItems = screen.getAllByTestId(/tide-event-/);
      expect(eventItems).toHaveLength(3); // テストデータの日付でフィルタリングされた結果

      // 最初のイベント（満潮）をチェック
      expect(screen.getByText('06:15')).toBeInTheDocument();
      expect(screen.getByText('180cm')).toBeInTheDocument();
    });

    it('TC-S009: 満潮・干潮のアイコンが表示される', () => {
      render(
        <TideEventsList
          events={mockTideInfo.events}
          targetDate={mockTideInfo.date}
        />
      );

      const highTideIcons = screen.getAllByTestId('high-tide-icon');
      const lowTideIcons = screen.getAllByTestId('low-tide-icon');

      expect(highTideIcons).toHaveLength(2); // 2回の満潮
      expect(lowTideIcons).toHaveLength(1);  // 1回の干潮
    });

    it('TC-S010: イベントが空の場合の表示', () => {
      render(
        <TideEventsList
          events={mockEmptyTideInfo.events}
          targetDate={mockEmptyTideInfo.date}
        />
      );

      const emptyState = screen.getByTestId('empty-events-state');
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText('今日の潮汐イベントがありません')).toBeInTheDocument();
    });

    it('TC-S011: イベント時刻の現在時刻との比較表示', () => {
      // 現在時刻をモック（12:00）
      const mockCurrentTime = new Date('2024-01-15T12:00:00');

      render(
        <TideEventsList
          events={mockTideInfo.events}
          targetDate={mockTideInfo.date}
          currentTime={mockCurrentTime}
        />
      );

      // 過去のイベント（06:15）は薄く表示される
      const pastEvent = screen.getByTestId('tide-event-0');
      expect(pastEvent).toHaveClass('opacity-50');

      // 未来のイベント（12:30）は通常表示
      const futureEvent = screen.getByTestId('tide-event-1');
      expect(futureEvent).not.toHaveClass('opacity-50');
    });
  });
});

// TASK-202 Step 4: TideSummaryCard統合テスト
describe('TASK-202 Step 4: TideSummaryCard統合テスト', () => {
  beforeEach(async () => {
    // CI環境ではJSDOM初期化を確実に待つ（Tech-lead recommendation for Issue #45）
    if (process.env.CI) {
      // より長い待機時間とポーリングでbody確認
      await waitFor(() => {
        if (!document.body || document.body.children.length === 0) {
          throw new Error('JSDOM not ready');
        }
      }, { timeout: 5000, interval: 100 });
    } else {
      // ローカル環境は高速化のため最小限
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    vi.clearAllMocks();
  });

  describe('アイコン・カラーシステム', () => {
    it('TC-S012: 潮汐タイプ別のカラー表示', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const tideTypeIcon = screen.getByTestId('tide-type-icon');
      expect(tideTypeIcon).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('TC-S022: カード全体の説明文', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const cardDescription = screen.getByTestId('summary-card-description');
      expect(cardDescription).toBeInTheDocument();
      expect(cardDescription).toHaveTextContent(/潮汐情報サマリー/);
    });

    it('TC-S023: キーボードナビゲーション', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const container = screen.getByTestId('summary-card-container');
      expect(container).toHaveAttribute('tabIndex', '0');

      fireEvent.keyDown(container, { key: 'Enter' });
      // キーボード操作のテスト（実装に応じて詳細化）
    });
  });

  describe('インタラクション', () => {
    it('TC-S024: クリック時の詳細表示切り替え', async () => {
      const onToggleDetails = vi.fn();
      render(<TideSummaryCard tideInfo={mockTideInfo} onToggleDetails={onToggleDetails} />);

      const toggleButton = screen.getByTestId('details-toggle-button');
      fireEvent.click(toggleButton);

      expect(onToggleDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('データ精度表示', () => {
    it('TC-S026: 高精度データのインジケーター', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const accuracyIndicator = screen.getByTestId('accuracy-indicator');
      expect(accuracyIndicator).toBeInTheDocument();
      expect(accuracyIndicator).toHaveClass('text-green-500'); // 高精度は緑
    });

    it('TC-S027: 低精度データの警告表示', () => {
      const lowAccuracyInfo = { ...mockTideInfo, accuracy: 'low' as const };
      render(<TideSummaryCard tideInfo={lowAccuracyInfo} />);

      const accuracyIndicator = screen.getByTestId('accuracy-indicator');
      expect(accuracyIndicator).toHaveClass('text-orange-500'); // 低精度は橙
      expect(screen.getByText('精度: 低')).toBeInTheDocument();
    });
  });
});

// TASK-202: 4項目グリッド + イベント一覧（Issue #26で実装済み）
describe('TASK-202: TideSummaryCardコンポーネント（残りのテスト）', () => {
  beforeEach(async () => {
    // CI環境ではJSDOM初期化を確実に待つ（Tech-lead recommendation for Issue #45）
    if (process.env.CI) {
      // より長い待機時間とポーリングでbody確認
      await waitFor(() => {
        if (!document.body || document.body.children.length === 0) {
          throw new Error('JSDOM not ready');
        }
      }, { timeout: 5000, interval: 100 });
    } else {
      // ローカル環境は高速化のため最小限
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    vi.clearAllMocks();
  });

  describe('4項目グリッド表示', () => {
    it('TC-S001: 潮汐タイプが正しく表示される', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const tideTypeSection = screen.getByTestId('tide-type-section');
      expect(tideTypeSection).toBeInTheDocument();
      expect(screen.getByText('大潮')).toBeInTheDocument();
      expect(screen.getByText('潮汐タイプ')).toBeInTheDocument();
    });

    it('TC-S002: 現在の潮汐状態が表示される', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const currentStateSection = screen.getByTestId('current-state-section');
      expect(currentStateSection).toBeInTheDocument();
      expect(screen.getByText('上げ潮')).toBeInTheDocument();
      expect(screen.getByText('120cm')).toBeInTheDocument();
    });

    it('TC-S003: 次イベント情報が表示される', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const nextEventSection = screen.getByTestId('next-event-section');
      expect(nextEventSection).toBeInTheDocument();

      // グリッド内の次イベント情報をチェック
      expect(nextEventSection).toHaveTextContent('干潮');
      expect(nextEventSection).toHaveTextContent('12:30');
      expect(nextEventSection).toHaveTextContent('45cm');
    });

    it('TC-S004: 潮汐強度が表示される', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const strengthSection = screen.getByTestId('tide-strength-section');
      expect(strengthSection).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('潮汐強度')).toBeInTheDocument();
    });

    it('TC-S005: 2×2グリッドレイアウトが適用される', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const gridContainer = screen.getByTestId('summary-grid');
      expect(gridContainer).toBeInTheDocument();
      // レスポンシブクラス: モバイル(1列) → タブレット以上(2×2)
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2');

      const gridItems = screen.getAllByTestId(/.*-section$/);
      expect(gridItems).toHaveLength(4);
    });

    it('TC-S006: 次イベントがない場合の表示', () => {
      render(<TideSummaryCard tideInfo={mockEmptyTideInfo} />);

      const nextEventSection = screen.getByTestId('next-event-section');
      expect(nextEventSection).toBeInTheDocument();
      expect(screen.getByText('データなし')).toBeInTheDocument();
    });
  });

  describe('今日の潮汐イベント一覧', () => {
    it('TC-S007: イベントリストが表示される', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const eventsList = screen.getByTestId('tide-events-list');
      expect(eventsList).toBeInTheDocument();
    });

    it('TC-S008: 各イベントの詳細が表示される', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const eventItems = screen.getAllByTestId(/tide-event-/);
      expect(eventItems).toHaveLength(3); // テストデータの日付でフィルタリングされた結果

      // 最初のイベント（満潮）をチェック
      expect(screen.getByText('06:15')).toBeInTheDocument();
      expect(screen.getByText('180cm')).toBeInTheDocument();
    });

    it('TC-S009: 満潮・干潮のアイコンが表示される', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const highTideIcons = screen.getAllByTestId('high-tide-icon');
      const lowTideIcons = screen.getAllByTestId('low-tide-icon');

      expect(highTideIcons).toHaveLength(2); // 2回の満潮
      expect(lowTideIcons).toHaveLength(1);  // 1回の干潮
    });

    it('TC-S010: イベントが空の場合の表示', () => {
      render(<TideSummaryCard tideInfo={mockEmptyTideInfo} />);

      const emptyState = screen.getByTestId('empty-events-state');
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText('今日の潮汐イベントがありません')).toBeInTheDocument();
    });

    it('TC-S011: イベント時刻の現在時刻との比較表示', () => {
      // 現在時刻をモック（12:00）- TideEventsListのデフォルトcurrentTimeはnew Date()
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00'));

      try {
        render(<TideSummaryCard tideInfo={mockTideInfo} />);

        // TideEventsListにcurrentTimeを渡すため、TideSummaryCardを直接テストではなく
        // TideEventsListで既にテストされているため、ここでは統合的に確認
        const eventsList = screen.getByTestId('tide-events-list');
        expect(eventsList).toBeInTheDocument();

        // 過去のイベント（06:15）は薄く表示される
        const pastEvent = screen.getByTestId('tide-event-0');
        expect(pastEvent).toHaveClass('opacity-50');

        // 未来のイベント（12:30）は通常表示
        const futureEvent = screen.getByTestId('tide-event-1');
        expect(futureEvent).not.toHaveClass('opacity-50');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('アイコン・カラーシステム', () => {
    it('TC-S012: 潮汐タイプ別のカラー表示', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const tideTypeSection = screen.getByTestId('tide-type-section');
      // Designer仕様（Issue #119）: 大潮は emerald-700（緑）+ bg-emerald-50
      expect(tideTypeSection).toHaveClass('text-emerald-700', 'bg-emerald-50');

      const tideTypeIcon = screen.getByTestId('tide-type-icon');
      expect(tideTypeIcon).toBeInTheDocument();
    });

    it('TC-S013: 潮汐状態別のアイコン表示', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const stateIcon = screen.getByTestId('current-state-icon');
      expect(stateIcon).toBeInTheDocument();
    });

    it('TC-S014: 強度レベルに応じた進捗バー表示', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const strengthProgress = screen.getByTestId('strength-progress');
      expect(strengthProgress).toBeInTheDocument();

      // ARIA属性の検証（Designer仕様 - Issue #119）
      expect(strengthProgress).toHaveAttribute('role', 'progressbar');
      expect(strengthProgress).toHaveAttribute('aria-valuenow', '85');
      expect(strengthProgress).toHaveAttribute('aria-valuemin', '0');
      expect(strengthProgress).toHaveAttribute('aria-valuemax', '100');
      expect(strengthProgress).toHaveAttribute('aria-label', '潮の強度: 85%');

      // 進捗バーの幅を検証
      const progressBarOuter = strengthProgress.querySelector('div');
      expect(progressBarOuter).toBeInTheDocument();
      const progressBarInner = progressBarOuter?.querySelector('div');
      expect(progressBarInner).toHaveStyle({ width: '85%' });
    });

    it('TC-S015: 小潮の場合のカラー表示', () => {
      const neapTideInfo = { ...mockTideInfo, tideType: 'neap' as const };
      render(<TideSummaryCard tideInfo={neapTideInfo} />);

      const tideTypeSection = screen.getByTestId('tide-type-section');
      // Designer仕様（Issue #119）: 小潮は slate-600（グレー）+ bg-slate-50
      expect(tideTypeSection).toHaveClass('text-slate-600', 'bg-slate-50');

      const tideTypeIcon = screen.getByTestId('tide-type-icon');
      expect(tideTypeIcon).toBeInTheDocument();
    });
  });

  describe('ローディング・エラー状態', () => {
    it('TC-S016: ローディング中にシマー効果が表示される', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} loading={true} />);

      const shimmerEffect = screen.getByTestId('summary-card-shimmer');
      expect(shimmerEffect).toBeInTheDocument();
      expect(shimmerEffect).toHaveClass('animate-pulse');
    });

    it('TC-S017: エラー状態の表示', () => {
      render(<TideSummaryCard tideInfo={null} error="データ取得に失敗しました" />);

      const errorState = screen.getByTestId('summary-card-error');
      expect(errorState).toBeInTheDocument();
      expect(screen.getByText('データ取得に失敗しました')).toBeInTheDocument();
    });

    it('TC-S018: ローディング完了後の正常表示', async () => {
      const { rerender } = render(<TideSummaryCard tideInfo={mockTideInfo} loading={true} />);

      expect(screen.getByTestId('summary-card-shimmer')).toBeInTheDocument();

      rerender(<TideSummaryCard tideInfo={mockTideInfo} loading={false} />);

      await waitFor(() => {
        expect(screen.queryByTestId('summary-card-shimmer')).not.toBeInTheDocument();
        expect(screen.getByTestId('summary-grid')).toBeInTheDocument();
      });
    });
  });

  describe('レスポンシブデザイン', () => {
    it('TC-S019: モバイル表示での適切なレイアウト', () => {
      // viewport をモバイルサイズに設定
      global.innerWidth = 375;
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const container = screen.getByTestId('summary-card-container');
      expect(container).toHaveClass('p-4'); // モバイル用のパディング
    });

    it('TC-S020: タブレット表示での適切なレイアウト', () => {
      global.innerWidth = 768;
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const container = screen.getByTestId('summary-card-container');
      expect(container).toHaveClass('md:p-6'); // タブレット用のパディング
    });
  });

  describe('アクセシビリティ', () => {
    it('TC-S021: 数値の読み上げ対応', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const strengthValue = screen.getByTestId('strength-value');
      expect(strengthValue).toHaveAttribute('aria-label', '潮汐強度85パーセント');

      const currentLevel = screen.getByTestId('current-level');
      expect(currentLevel).toHaveAttribute('aria-label', '現在の潮位120センチメートル');
    });

    it('TC-S022: カード全体の説明文', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const cardDescription = screen.getByTestId('summary-card-description');
      expect(cardDescription).toBeInTheDocument();
      expect(cardDescription).toHaveTextContent(/潮汐情報サマリー/);
    });

    it('TC-S023: キーボードナビゲーション', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const container = screen.getByTestId('summary-card-container');
      expect(container).toHaveAttribute('tabIndex', '0');

      fireEvent.keyDown(container, { key: 'Enter' });
      // キーボード操作のテスト（実装に応じて詳細化）
    });
  });

  describe('インタラクション', () => {
    it('TC-S024: クリック時の詳細表示切り替え', async () => {
      const onToggleDetails = vi.fn();
      render(<TideSummaryCard tideInfo={mockTideInfo} onToggleDetails={onToggleDetails} />);

      const toggleButton = screen.getByTestId('details-toggle-button');
      fireEvent.click(toggleButton);

      expect(onToggleDetails).toHaveBeenCalledTimes(1);
    });

    it('TC-S025: ホバー時の視覚的フィードバック', async () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const card = screen.getByTestId('summary-card-container').parentElement?.parentElement;

      expect(card).toHaveClass('hover:shadow-lg');
    });
  });

  describe('データ精度表示', () => {
    it('TC-S026: 高精度データのインジケーター', () => {
      render(<TideSummaryCard tideInfo={mockTideInfo} />);

      const accuracyIndicator = screen.getByTestId('accuracy-indicator');
      expect(accuracyIndicator).toBeInTheDocument();
      expect(accuracyIndicator).toHaveClass('text-green-500'); // 高精度は緑
    });

    it('TC-S027: 低精度データの警告表示', () => {
      const lowAccuracyInfo = { ...mockTideInfo, accuracy: 'low' as const };
      render(<TideSummaryCard tideInfo={lowAccuracyInfo} />);

      const accuracyIndicator = screen.getByTestId('accuracy-indicator');
      expect(accuracyIndicator).toHaveClass('text-orange-500'); // 低精度は橙
      expect(screen.getByText('精度: 低')).toBeInTheDocument();
    });
  });

  describe('パフォーマンス', () => {
    it('TC-S028: 大量イベントでも高速レンダリング', () => {
      const manyEvents = Array.from({ length: 50 }, (_, i) => ({
        time: new Date(`2024-01-15T${String(i % 24).padStart(2, '0')}:00:00`),
        type: i % 2 === 0 ? 'high' as const : 'low' as const,
        level: 100 + (i % 100)
      }));

      const largeDataInfo = { ...mockTideInfo, events: manyEvents };

      const startTime = performance.now();
      render(<TideSummaryCard tideInfo={largeDataInfo} />);
      const endTime = performance.now();

      // CI環境による閾値調整（CI環境はリソース変動が大きいため余裕を持たせる）
      const isCI = process.env.CI === 'true';
      const threshold = isCI ? 150 : 100; // CI: 150ms, ローカル: 100ms

      expect(endTime - startTime).toBeLessThan(threshold); // 環境別閾値以内でレンダリング
    });
  });
});