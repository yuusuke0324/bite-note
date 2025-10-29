// ErrorBoundaryコンポーネントの単体テスト

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  // コンソールエラーをモックして、テスト時のノイズを防ぐ
  const originalError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('エラーが発生しない場合は子コンポーネントを正常に表示する', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('正常なコンポーネント')).toBeInTheDocument();
  });

  it('エラーが発生した場合はエラーメッセージを表示する', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    expect(screen.getByText(/予期しないエラーが発生しました/)).toBeInTheDocument();
  });

  it('エラー発生時にリロードボタンが表示される', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: 'ページ再読み込み' });
    expect(reloadButton).toBeInTheDocument();
  });

  it('開発環境でエラー詳細が表示される', () => {
    // NODE_ENVをdevelopmentに設定
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // 開発環境でのエラー詳細表示を確認
    expect(screen.getByText('エラー詳細（開発用）')).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();

    // 元の環境変数を復元
    process.env.NODE_ENV = originalEnv;
  });

  it('複数の子コンポーネントがある場合も正常に動作する', () => {
    render(
      <ErrorBoundary>
        <div>コンポーネント1</div>
        <ThrowError shouldThrow={false} />
        <div>コンポーネント3</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('コンポーネント1')).toBeInTheDocument();
    expect(screen.getByText('正常なコンポーネント')).toBeInTheDocument();
    expect(screen.getByText('コンポーネント3')).toBeInTheDocument();
  });

  it('ネストしたErrorBoundaryでも正常に動作する', () => {
    render(
      <ErrorBoundary>
        <div>外側のコンポーネント</div>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    expect(screen.getByText('外側のコンポーネント')).toBeInTheDocument();
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
  });
});