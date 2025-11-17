/**
 * ErrorBoundaryコンポーネントの単体テスト (Issue #115対応版)
 *
 * @description
 * エラーバウンダリコンポーネントの包括的なテストスイート
 * React Testing Libraryのベストプラクティスに従い、CI環境でのDOM参照問題を解消
 *
 * @version 2.0.0 - Issue #115対応：screen → within(container)、vi.spyOn()パターン採用
 * @changes
 * - `screen` → `within(result.container)` に置換（CI環境での<body />empty問題を解決）
 * - console.error モックを vi.spyOn() パターンに変更（より堅牢なモック管理）
 * - describe.skip を削除（テストを復活）
 * @since 2025-11-17
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, within } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// エラーを発生させるコンポーネント
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>正常なコンポーネント</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(async () => {
    // CI環境でのJSDOM初期化待機（FishSpeciesAutocompleteパターン）
    if (process.env.CI) {
      await waitFor(() => {
        if (!document.body || document.body.children.length === 0) {
          throw new Error('JSDOM not ready');
        }
      }, { timeout: 5000, interval: 100 });
    } else {
      // ローカル環境は高速化のため最小限
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs(); // 環境変数のスタブをクリーンアップ

    // CI環境ではroot containerを保持（FishSpeciesAutocompleteパターン）
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  it('エラーが発生しない場合は子コンポーネントを正常に表示する', () => {
    const result = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(within(result.container).getByText('正常なコンポーネント')).toBeInTheDocument();
  });

  it('エラーが発生した場合はエラーメッセージを表示する', () => {
    // vi.spyOn()パターンでconsole.errorをモック（より堅牢なモック管理）
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(within(result.container).getByText('エラーが発生しました')).toBeInTheDocument();
    expect(within(result.container).getByText(/予期しないエラーが発生しました/)).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('エラー発生時にリロードボタンが表示される', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = within(result.container).getByRole('button', { name: 'ページ再読み込み' });
    expect(reloadButton).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  describe('開発環境でのエラー詳細表示', () => {
    it('開発環境でエラー詳細が表示される', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // vi.stubEnv()を使用してNODE_ENVを安全に変更（CI環境での後続テストへの影響を防ぐ）
      vi.stubEnv('NODE_ENV', 'development');

      const result = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // 開発環境でのエラー詳細表示を確認
      expect(within(result.container).getByText('エラー詳細（開発用）')).toBeInTheDocument();
      expect(within(result.container).getByText(/Test error/)).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  it('複数の子コンポーネントがある場合も正常に動作する', () => {
    const result = render(
      <ErrorBoundary>
        <div>コンポーネント1</div>
        <ThrowError shouldThrow={false} />
        <div>コンポーネント3</div>
      </ErrorBoundary>
    );

    expect(within(result.container).getByText('コンポーネント1')).toBeInTheDocument();
    expect(within(result.container).getByText('正常なコンポーネント')).toBeInTheDocument();
    expect(within(result.container).getByText('コンポーネント3')).toBeInTheDocument();
  });

  it('ネストしたErrorBoundaryでも正常に動作する', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = render(
      <ErrorBoundary>
        <div>外側のコンポーネント</div>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    expect(within(result.container).getByText('外側のコンポーネント')).toBeInTheDocument();
    expect(within(result.container).getByText('エラーが発生しました')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});