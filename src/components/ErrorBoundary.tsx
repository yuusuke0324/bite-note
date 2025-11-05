// エラーバウンダリコンポーネント

import React, { Component, type ReactNode } from 'react';
import { errorManager } from '../lib/errors/ErrorManager';
import { AppError, ErrorSeverity, ErrorCategory } from '../lib/errors/ErrorTypes';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // errorManagerに統合
    const appError = error instanceof AppError
      ? error
      : new AppError({
          code: 'RENDER_ERROR',
          message: error.message || 'レンダリング中にエラーが発生しました',
          userMessage: 'コンポーネントのレンダリング処理でエラーが発生しました。ページを再読み込みしてください。',
          severity: ErrorSeverity.CRITICAL,
          category: ErrorCategory.SYSTEM,
          cause: error,
          context: {
            componentStack: errorInfo.componentStack,
          },
          recovery: {
            actions: [
              {
                label: 'ページ再読み込み',
                handler: () => window.location.reload(),
                primary: true,
              },
            ],
          },
        });

    errorManager.handleError(appError, {
      context: {
        componentStack: errorInfo.componentStack,
      },
      suppressDisplay: true, // ErrorBoundaryで独自UIを表示するため
    });

    // カスタムコールバックを実行
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            margin: '1rem'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>
            エラーが発生しました
          </h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            予期しないエラーが発生しました。ページを再読み込みするか、しばらく時間をおいてから再度お試しください。
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              リロード
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              ページ再読み込み
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '2rem', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#666' }}>
                エラー詳細（開発用）
              </summary>
              <pre
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#f1f3f4',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  overflow: 'auto'
                }}
              >
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}