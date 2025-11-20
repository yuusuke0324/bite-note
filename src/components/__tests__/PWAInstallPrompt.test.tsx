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
import { render, screen, waitFor, act } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PWAInstallPrompt } from '../PWAInstallPrompt';
import { usePWA } from '../../hooks/usePWA';

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

describe('PWAInstallPrompt - 基本機能', () => {
  let mockInstallApp: ReturnType<typeof vi.fn>;
  let mockGetIOSInstructions: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

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
  });

  it('installStateがisInstallable=trueの時、3秒後にプロンプトを表示する', async () => {
    vi.useFakeTimers();

    render(<PWAInstallPrompt />);

    // 初期状態では非表示
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 3秒進める（act()でラップ）
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // プロンプトが表示される
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('「インストール」ボタンクリックでinstallApp()を呼び出す', async () => {
    const user = userEvent.setup({ delay: null });

    vi.useFakeTimers();
    render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers(); // クリック前にリアルタイマーに戻す

    const installButton = screen.getByRole('button', { name: /^📱.*インストール$/ });

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
    render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const laterButton = screen.getByRole('button', { name: '後で' });

    await act(async () => {
      await user.click(laterButton);
    });

    await waitFor(() => {
      expect(localStorage.getItem('pwa-install-dismissed')).toBe('true');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
    render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const dialog = screen.getByRole('dialog');
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
    render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const installButton = screen.getByRole('button', { name: /^📱.*インストール$/ });

    // クリックとローディング状態確認
    await act(async () => {
      await user.click(installButton);
    });

    // ローディング表示を確認
    await waitFor(() => {
      expect(screen.getByText('インストール中...')).toBeInTheDocument();
    });

    // aria-live属性を確認
    const statusElement = document.querySelector('[aria-live="polite"]');
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveAttribute('role', 'status');
  });

  it('クローズボタンのタッチターゲットサイズが44x44pxであること', async () => {
    vi.useFakeTimers();
    render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const closeButton = screen.getByLabelText('インストールプロンプトを閉じる');
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
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockInstallApp = vi.fn().mockRejectedValue(new Error('Install failed'));

    vi.mocked(usePWA).mockReturnValue({
      installState: { isInstallable: true, isInstalled: false, platform: 'android' },
      installApp: mockInstallApp,
      getIOSInstallInstructions: vi.fn()
    });

    vi.useFakeTimers();
    render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const installButton = screen.getByRole('button', { name: /^📱.*インストール$/ });

    await act(async () => {
      await user.click(installButton);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Install failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('localStorageが利用不可の場合でもクラッシュしないこと', async () => {
    const user = userEvent.setup({ delay: null });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // localStorage.setItemをモック（失敗させる）
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn().mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    vi.useFakeTimers();
    render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const laterButton = screen.getByRole('button', { name: '後で' });

    await act(async () => {
      await user.click(laterButton);
    });

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith('[PWA] Failed to save dismiss state:', expect.any(Error));
      // UIは正常に動作（クラッシュしない）
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // 元に戻す
    Storage.prototype.setItem = originalSetItem;
    consoleWarnSpy.mockRestore();
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
    render(<PWAInstallPrompt />);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    vi.useRealTimers();

    const installButton = screen.getByRole('button', { name: /^📱.*インストール$/ });

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
