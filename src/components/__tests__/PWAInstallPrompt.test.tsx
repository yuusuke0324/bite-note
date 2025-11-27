/**
 * PWAInstallPrompt アクセシビリティテスト
 *
 * Issue #53 Phase 2: Critical問題修正の検証
 * - WCAG 2.1 AA準拠（ARIA、タッチターゲット、スクリーンリーダー対応）
 * - エラーハンドリング（localStorage不可、重複クリック防止）
 *
 * @since 2025-11-08
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor, act, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PWAInstallPrompt } from '../PWAInstallPrompt';
import { usePWA } from '../../hooks/usePWA';
import { logger } from '../../lib/errors/logger';

// jest-axeのカスタムマッチャーを追加
expect.extend(toHaveNoViolations);

// usePWAフックをモック
vi.mock('../../hooks/usePWA');

// offlineQueueService をモック (usePWA内部で使用されているため)
vi.mock('../../lib/offline-queue-service', () => ({
  offlineQueueService: {
    getQueueStatus: vi.fn().mockResolvedValue({
      pendingCount: 0,
      syncingCount: 0,
      failedCount: 0,
      isQueueFull: false,
      isSyncing: false,
    }),
    syncQueue: vi.fn().mockResolvedValue({
      success: true,
      syncedCount: 0,
    }),
  },
}));

// logger をモック (console.error/warn の代わりに logger を使用)
vi.mock('../../lib/errors/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('PWAInstallPrompt - 基本機能', () => {
  let mockInstallApp: ReturnType<typeof vi.fn>;
  let mockGetIOSInstructions: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();

    // CI環境でのJSDOM初期化待機（Issue #37, #115パターン）
    if (process.env.CI) {
      await waitFor(() => {
        if (!document.body || document.body.children.length === 0) {
          throw new Error('JSDOM not ready');
        }
      }, { timeout: 5000, interval: 100 });
    }

    // デフォルトのモック設定
    mockInstallApp = vi.fn().mockResolvedValue(true);
    mockGetIOSInstructions = vi.fn().mockReturnValue({
      title: 'ホーム画面に追加',
      steps: ['ステップ1', 'ステップ2', 'ステップ3']
    });

    vi.mocked(usePWA).mockReturnValue({
      installState: {
        isInstallable: true,
        isInstalled: false,
        platform: 'android'
      },
      installApp: mockInstallApp,
      getIOSInstallInstructions: mockGetIOSInstructions
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // タイマーを確実にリセット

    // CI環境ではroot containerを保持（Issue #37パターン）
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  it('installStateがisInstallable=trueの時、3秒後にプロンプトを表示する', async () => {
    vi.useFakeTimers();

    const result = render(<PWAInstallPrompt />);

    // 初期状態では非表示
    expect(within(result.container).queryByRole('dialog')).not.toBeInTheDocument();

    // 3秒進める（act()でラップ）
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // プロンプトが表示される
    expect(within(result.container).getByRole('dialog')).toBeInTheDocument();
  });

  it('「インストール」ボタンクリックでinstallApp()を呼び出す', async () => {
    const user = userEvent.setup({ delay: null });

    vi.useFakeTimers();
    const result = render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers(); // クリック前にリアルタイマーに戻す

    const installButton = within(result.container).getByRole('button', { name: /インストール$/ });

    await act(async () => {
      await user.click(installButton);
    });

    await waitFor(() => {
      expect(mockInstallApp).toHaveBeenCalledTimes(1);
    });
  });

  it('「後で」ボタンクリックでlocalStorageに保存し非表示にする', async () => {
    const user = userEvent.setup({ delay: null });

    vi.useFakeTimers();
    const result = render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const laterButton = within(result.container).getByRole('button', { name: '後で' });

    await act(async () => {
      await user.click(laterButton);
    });

    await waitFor(() => {
      expect(localStorage.getItem('pwa-install-dismissed')).toBe('true');
      expect(within(result.container).queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

describe('PWAInstallPrompt - アクセシビリティ', () => {
  let mockInstallApp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockInstallApp = vi.fn().mockResolvedValue(true);

    vi.mocked(usePWA).mockReturnValue({
      installState: {
        isInstallable: true,
        isInstalled: false,
        platform: 'android'
      },
      installApp: mockInstallApp,
      getIOSInstallInstructions: vi.fn().mockReturnValue({
        title: 'ホーム画面に追加',
        steps: ['ステップ1', 'ステップ2', 'ステップ3']
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('WCAG 2.1 AA違反がないこと', async () => {
    vi.useFakeTimers();
    const { container } = render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    // axeはwaitForの外で実行
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('メインプロンプトにrole="dialog"があること', async () => {
    vi.useFakeTimers();
    const result = render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const dialog = within(result.container).getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-labelledby', 'install-prompt-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'install-prompt-description');
  });

  it('ローディング状態にaria-live="polite"があること', async () => {
    const user = userEvent.setup({ delay: null });

    // 1秒かかるインストール処理をモック
    const slowInstallApp = vi.fn().mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve(true), 1000));
    });

    vi.mocked(usePWA).mockReturnValue({
      installState: { isInstallable: true, isInstalled: false, platform: 'android' },
      installApp: slowInstallApp,
      getIOSInstallInstructions: vi.fn()
    });

    vi.useFakeTimers();
    const result = render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const installButton = within(result.container).getByRole('button', { name: /インストール$/ });

    // クリックとローディング状態確認
    await act(async () => {
      await user.click(installButton);
    });

    // ローディング表示を確認
    await waitFor(() => {
      expect(within(result.container).getByText('インストール中...')).toBeInTheDocument();
    });

    // aria-live属性を確認
    const statusElement = document.querySelector('[aria-live="polite"]');
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveAttribute('role', 'status');
  });

  it('クローズボタンのタッチターゲットサイズが44x44pxであること', async () => {
    vi.useFakeTimers();
    const result = render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const closeButton = within(result.container).getByLabelText('インストールプロンプトを閉じる');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveStyle({ width: '44px', height: '44px' });
  });
});

describe('PWAInstallPrompt - エラーハンドリング', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(usePWA).mockReturnValue({
      installState: {
        isInstallable: true,
        isInstalled: false,
        platform: 'android'
      },
      installApp: vi.fn().mockResolvedValue(true),
      getIOSInstallInstructions: vi.fn().mockReturnValue({
        title: 'ホーム画面に追加',
        steps: ['ステップ1', 'ステップ2', 'ステップ3']
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('installApp()が失敗した場合、エラーログを出力すること', async () => {
    const user = userEvent.setup({ delay: null });
    const mockInstallApp = vi.fn().mockRejectedValue(new Error('Install failed'));

    vi.mocked(usePWA).mockReturnValue({
      installState: { isInstallable: true, isInstalled: false, platform: 'android' },
      installApp: mockInstallApp,
      getIOSInstallInstructions: vi.fn()
    });

    vi.useFakeTimers();
    const result = render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const installButton = within(result.container).getByRole('button', { name: /インストール$/ });

    await act(async () => {
      await user.click(installButton);
    });

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith('Install failed', { error: expect.any(Error) });
    });
  });

  it('localStorageが利用不可の場合でもクラッシュしないこと', async () => {
    const user = userEvent.setup({ delay: null });

    // localStorage.setItemをモック（失敗させる）
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn().mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    vi.useFakeTimers();
    const result = render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const laterButton = within(result.container).getByRole('button', { name: '後で' });

    await act(async () => {
      await user.click(laterButton);
    });

    await waitFor(() => {
      expect(logger.warn).toHaveBeenCalledWith('Failed to save dismiss state', { error: expect.any(Error) });
      // UIは正常に動作（クラッシュしない）
      expect(within(result.container).queryByRole('dialog')).not.toBeInTheDocument();
    });

    // 元に戻す
    Storage.prototype.setItem = originalSetItem;
  });

  it('重複クリック時に複数のインストール処理が走らないこと', async () => {
    const user = userEvent.setup({ delay: null });
    const mockInstallApp = vi.fn().mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve(true), 1000));
    });

    vi.mocked(usePWA).mockReturnValue({
      installState: { isInstallable: true, isInstalled: false, platform: 'android' },
      installApp: mockInstallApp,
      getIOSInstallInstructions: vi.fn()
    });

    vi.useFakeTimers();
    const result = render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const installButton = within(result.container).getByRole('button', { name: /インストール$/ });

    // 連打
    await act(async () => {
      await user.click(installButton);
      await user.click(installButton);
      await user.click(installButton);
    });

    await waitFor(() => {
      // installAppは1回のみ呼ばれる（isInstallingで防止）
      expect(mockInstallApp).toHaveBeenCalledTimes(1);
    });
  });
});
