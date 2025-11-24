/**
 * ReAuthPrompt コンポーネントテスト (Issue #216)
 *
 * @description
 * セッション期限切れ再認証プロンプトの再接続中状態テスト
 * E2EテストからComponent Testへ移行（TC-SM-010/011/012 + 追加テストケース）
 *
 * @version 1.0.0 - Issue #216対応：E2Eテストからの移行
 * @changes
 * - TC-SM-010〜012: E2Eテストから移行
 * - TC-SM-013〜017: QAエンジニアレビューに基づく追加テストケース
 * @since 2025-11-24
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReAuthPrompt } from '../features/SessionManagement/ReAuthPrompt';
import { TestIds } from '../../constants/testIds';

describe('ReAuthPrompt', () => {
  beforeEach(async () => {
    // CI環境ではJSDOM初期化を確実に待つ
    if (process.env.CI) {
      await waitFor(() => {
        if (!document.body || document.body.children.length === 0) {
          throw new Error('JSDOM not ready');
        }
      }, { timeout: 5000, interval: 100 });
    } else {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // scrollIntoViewのモック (JSDOMはサポートしていないため)
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  /**
   * ヘルパー関数: ReAuthPromptのレンダリング
   * DRY原則に基づく共通セットアップ
   */
  const renderReAuthPrompt = (isReconnecting: boolean, overrides = {}) => {
    const defaultProps = {
      unsavedCount: 0,
      onReconnect: vi.fn(),
      onExport: vi.fn(),
      onClose: vi.fn(),
      isReconnecting,
      ...overrides,
    };
    return {
      ...render(<ReAuthPrompt {...defaultProps} />),
      props: defaultProps,
    };
  };

  describe('再接続中状態（isReconnecting=true）', () => {
    it('[TC-SM-010] 再接続ボタンが無効化され、再度クリックできないこと', async () => {
      const user = userEvent.setup();
      let isReconnecting = false;

      const onReconnect = vi.fn(() => {
        isReconnecting = true;
      });

      const { rerender } = render(
        <ReAuthPrompt
          unsavedCount={0}
          onReconnect={onReconnect}
          onExport={vi.fn()}
          isReconnecting={isReconnecting}
        />
      );

      const reconnectButton = await screen.findByTestId(TestIds.RECONNECT_AND_SAVE_BUTTON);
      expect(reconnectButton).not.toBeDisabled();

      // 1回目のクリック
      await user.click(reconnectButton);
      expect(onReconnect).toHaveBeenCalledTimes(1);

      // 親コンポーネントが状態を更新する想定でrerender
      rerender(
        <ReAuthPrompt
          unsavedCount={0}
          onReconnect={onReconnect}
          onExport={vi.fn()}
          isReconnecting={true}
        />
      );

      await waitFor(() => {
        expect(reconnectButton).toBeDisabled();
      });

      expect(reconnectButton).toHaveTextContent('再接続中');

      // 無効化されたボタンをクリックしても何も起こらないことを確認
      await user.click(reconnectButton);
      expect(onReconnect).toHaveBeenCalledTimes(1); // 1回のまま
    });

    it('[TC-SM-011] エクスポートボタンが無効化されること', async () => {
      renderReAuthPrompt(true);

      const exportButton = await screen.findByTestId(TestIds.EXPORT_NOW_BUTTON);
      expect(exportButton).toBeDisabled();
    });

    it('[TC-SM-012] 閉じるボタンが無効化されること', async () => {
      renderReAuthPrompt(true);

      const closeButton = await screen.findByTestId(TestIds.SESSION_MODAL_CLOSE_BUTTON);
      expect(closeButton).toBeDisabled();
    });

    it('[TC-SM-014] 再接続中は3つのボタンすべてが同時に無効化されること', async () => {
      renderReAuthPrompt(true);

      const reconnectButton = await screen.findByTestId(TestIds.RECONNECT_AND_SAVE_BUTTON);
      const exportButton = await screen.findByTestId(TestIds.EXPORT_NOW_BUTTON);
      const closeButton = await screen.findByTestId(TestIds.SESSION_MODAL_CLOSE_BUTTON);

      expect(reconnectButton).toBeDisabled();
      expect(exportButton).toBeDisabled();
      expect(closeButton).toBeDisabled();
    });

    it('[TC-SM-015] 再接続中の再接続ボタンをクリックしてもonReconnectが呼ばれないこと', async () => {
      const user = userEvent.setup();
      const onReconnect = vi.fn();

      render(
        <ReAuthPrompt
          unsavedCount={0}
          onReconnect={onReconnect}
          onExport={vi.fn()}
          isReconnecting={true}
        />
      );

      const reconnectButton = await screen.findByTestId(TestIds.RECONNECT_AND_SAVE_BUTTON);
      expect(reconnectButton).toBeDisabled();

      // 無効化されたボタンをクリック
      await user.click(reconnectButton);

      // コールバックが呼ばれないことを確認
      expect(onReconnect).not.toHaveBeenCalled();
    });

    it('[TC-SM-016] 再接続中のエクスポートボタンをクリックしてもonExportが呼ばれないこと', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn();

      render(
        <ReAuthPrompt
          unsavedCount={0}
          onReconnect={vi.fn()}
          onExport={onExport}
          isReconnecting={true}
        />
      );

      const exportButton = await screen.findByTestId(TestIds.EXPORT_NOW_BUTTON);
      await user.click(exportButton);

      expect(onExport).not.toHaveBeenCalled();
    });

    it('[TC-SM-017] 再接続中の×ボタンをクリックしてもonCloseが呼ばれないこと', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <ReAuthPrompt
          unsavedCount={0}
          onReconnect={vi.fn()}
          onExport={vi.fn()}
          onClose={onClose}
          isReconnecting={true}
        />
      );

      const closeButton = await screen.findByTestId(TestIds.SESSION_MODAL_CLOSE_BUTTON);
      await user.click(closeButton);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('再接続完了後（isReconnecting=false）', () => {
    it('[TC-SM-013] 再接続完了後、すべてのボタンが再度有効化されること', async () => {
      const { rerender } = render(
        <ReAuthPrompt
          unsavedCount={0}
          onReconnect={vi.fn()}
          onExport={vi.fn()}
          onClose={vi.fn()}
          isReconnecting={true}
        />
      );

      const reconnectButton = await screen.findByTestId(TestIds.RECONNECT_AND_SAVE_BUTTON);
      const exportButton = await screen.findByTestId(TestIds.EXPORT_NOW_BUTTON);
      const closeButton = await screen.findByTestId(TestIds.SESSION_MODAL_CLOSE_BUTTON);

      expect(reconnectButton).toBeDisabled();
      expect(exportButton).toBeDisabled();
      expect(closeButton).toBeDisabled();

      // 再接続完了
      rerender(
        <ReAuthPrompt
          unsavedCount={0}
          onReconnect={vi.fn()}
          onExport={vi.fn()}
          onClose={vi.fn()}
          isReconnecting={false}
        />
      );

      await waitFor(() => {
        expect(reconnectButton).not.toBeDisabled();
        expect(exportButton).not.toBeDisabled();
        expect(closeButton).not.toBeDisabled();
      });
    });
  });
});
