/**
 * FeedbackToast Unit Tests (Issue #155 Phase 3-3)
 * QAエンジニアレビュー対応:
 * - ARIA属性設定確認
 * - 44x44pxタッチターゲット確認
 * - アクションボタン動作
 * - 自動クローズ機能
 * - エッジケース（長いメッセージ、複数行、複数アクション）
 * - 手動クローズ
 * - アニメーション確認
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackToast } from '../FeedbackToast';
import { TestIds } from '../../constants/testIds';

describe('FeedbackToast', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA Attributes', () => {
    // 1. ARIA属性設定確認（infoトースト）
    test('should set ARIA attributes correctly for info toast', () => {
      render(
        <FeedbackToast
          type="info"
          message="テストメッセージ"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'polite');
      expect(toast).toHaveAttribute('aria-atomic', 'true');
    });

    // 2. errorトーストはassertive
    test('should set assertive aria-live for error toast', () => {
      render(
        <FeedbackToast
          type="error"
          message="エラーメッセージ"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('Touch Target Size (44x44px)', () => {
    // 3. クローズボタンの44x44pxタッチターゲット確認
    test('should maintain 44x44px touch target for close button', () => {
      render(
        <FeedbackToast
          type="success"
          message="成功"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByTestId(TestIds.TOAST_CLOSE_BUTTON);
      const styles = window.getComputedStyle(closeButton);

      expect(styles.minWidth).toBe('44px');
      expect(styles.minHeight).toBe('44px');
    });

    // 4. アクションボタンの44x44pxタッチターゲット確認
    test('should maintain 44x44px touch target for action button', () => {
      render(
        <FeedbackToast
          type="error"
          message="ストレージエラー"
          isVisible={true}
          onClose={mockOnClose}
          actions={[{ label: 'データ管理', action: vi.fn(), style: 'primary' }]}
        />
      );

      const actionButton = screen.getByTestId(TestIds.TOAST_ACTION_BUTTON);
      const styles = window.getComputedStyle(actionButton);

      expect(styles.minHeight).toBe('44px');
    });
  });

  describe('Action Button Functionality', () => {
    // 5. アクションボタンのコールバック実行
    test('should call action callback when clicked', async () => {
      const user = userEvent.setup();
      const mockAction = vi.fn();

      render(
        <FeedbackToast
          type="info"
          message="テスト"
          isVisible={true}
          onClose={mockOnClose}
          actions={[{ label: 'アクション', action: mockAction }]}
        />
      );

      const actionButton = screen.getByTestId(TestIds.TOAST_ACTION_BUTTON);
      await user.click(actionButton);

      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    // 6. 複数アクションボタンのレンダリング
    test('should render multiple action buttons', () => {
      render(
        <FeedbackToast
          type="warning"
          message="警告"
          isVisible={true}
          onClose={mockOnClose}
          actions={[
            { label: 'アクション1', action: vi.fn(), style: 'primary' },
            { label: 'アクション2', action: vi.fn(), style: 'secondary' },
          ]}
        />
      );

      const actionButtons = screen.getAllByTestId(TestIds.TOAST_ACTION_BUTTON);
      expect(actionButtons).toHaveLength(2);
    });
  });

  describe('Auto-close Functionality', () => {
    // 7. 自動クローズ（duration指定）
    test('should auto-close after duration', async () => {
      vi.useFakeTimers();

      render(
        <FeedbackToast
          type="success"
          message="成功"
          isVisible={true}
          onClose={mockOnClose}
          duration={3000}
        />
      );

      expect(mockOnClose).not.toHaveBeenCalled();

      // duration経過
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // アニメーション完了待機
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    // 8. 自動クローズ無効（duration=0）
    test('should not auto-close when duration is 0', async () => {
      vi.useFakeTimers();

      render(
        <FeedbackToast
          type="info"
          message="情報"
          isVisible={true}
          onClose={mockOnClose}
          duration={0}
        />
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockOnClose).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    // 9. 長いメッセージ
    test('should display long message correctly', () => {
      const longMessage = 'あ'.repeat(200);

      render(
        <FeedbackToast
          type="info"
          message={longMessage}
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    // 10. 複数行メッセージ
    test('should display multiline message correctly', () => {
      const multilineMessage = '行1\n行2\n行3';

      render(
        <FeedbackToast
          type="warning"
          message={multilineMessage}
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      // 複数行は改行コードでそのまま表示されるので、部分一致で検証
      expect(screen.getByText(/行1/)).toBeInTheDocument();
      expect(screen.getByText(/行2/)).toBeInTheDocument();
      expect(screen.getByText(/行3/)).toBeInTheDocument();
    });
  });

  describe('Manual Close', () => {
    // 11. 手動クローズ
    test('should close manually when close button clicked', async () => {
      const user = userEvent.setup();

      render(
        <FeedbackToast
          type="success"
          message="成功"
          isVisible={true}
          onClose={mockOnClose}
          duration={0} // 自動クローズ無効
        />
      );

      const closeButton = screen.getByTestId(TestIds.TOAST_CLOSE_BUTTON);
      await user.click(closeButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Animation', () => {
    // 12. アニメーション：表示時
    test('should animate in when visible', async () => {
      const { rerender } = render(
        <FeedbackToast
          type="info"
          message="テスト"
          isVisible={false}
          onClose={mockOnClose}
        />
      );

      // 初期状態（非表示）
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // 表示状態に変更
      rerender(
        <FeedbackToast
          type="info"
          message="テスト"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const toast = screen.getByRole('alert');
        const styles = window.getComputedStyle(toast);
        expect(styles.opacity).toBe('1'); // アニメーション後
      });
    });
  });

  describe('Icon Display', () => {
    // 13. アイコン表示（success）
    test('should display success icon', () => {
      render(
        <FeedbackToast
          type="success"
          message="成功"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('success-icon')).toBeInTheDocument();
    });

    // 14. アイコン表示（error）
    test('should display error icon', () => {
      render(
        <FeedbackToast
          type="error"
          message="エラー"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    });

    // 15. アイコン表示（warning）
    test('should display warning icon', () => {
      render(
        <FeedbackToast
          type="warning"
          message="警告"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    });

    // 16. アイコン表示（info）
    test('should display info icon', () => {
      render(
        <FeedbackToast
          type="info"
          message="情報"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });
  });

  describe('Position', () => {
    // 17. ポジション：top-right（デフォルト）
    test('should position toast at top-right by default', () => {
      render(
        <FeedbackToast
          type="info"
          message="テスト"
          isVisible={true}
          onClose={mockOnClose}
        />
      );

      const toast = screen.getByRole('alert');
      const styles = window.getComputedStyle(toast);

      expect(styles.top).toBe('1rem');
      expect(styles.right).toBe('1rem');
    });

    // 18. ポジション：bottom-center
    test('should position toast at bottom-center', () => {
      render(
        <FeedbackToast
          type="info"
          message="テスト"
          isVisible={true}
          onClose={mockOnClose}
          position="bottom-center"
        />
      );

      const toast = screen.getByRole('alert');
      const styles = window.getComputedStyle(toast);

      expect(styles.bottom).toBe('1rem');
      expect(styles.left).toBe('50%');
    });
  });
});
