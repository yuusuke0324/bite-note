// リトライ可能アクションコンポーネント

import { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { RetryService } from '../lib/retry-service';

export interface RetryableActionProps<T = unknown> {
  action: () => Promise<T>;
  onSuccess: (result: T) => void;
  onError: (error: Error) => void;
  maxRetries: number;
  buttonText: string;
  retryDelay?: number;
  errorMessage?: string;
  disabled?: boolean;
  className?: string;
}

export const RetryableAction = <T = unknown,>({
  action,
  onSuccess,
  onError,
  maxRetries,
  buttonText,
  retryDelay = 1000,
  errorMessage,
  disabled = false,
  className = ''
}: RetryableActionProps<T>) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const retryService = new RetryService();

  const executeAction = async () => {
    setIsLoading(true);
    setHasError(false);
    setLastError(null);

    try {
      const result = await retryService.execute(action, {
        maxRetries,
        delay: retryDelay,
        backoff: 'exponential'
      });

      setRetryCount(0);
      onSuccess(result);
    } catch (error) {
      const err = error as Error;
      setHasError(true);
      setLastError(err);
      setRetryCount(prev => prev + 1);
      onError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    executeAction();
  };

  const getButtonStyle = () => {
    if (hasError) {
      return {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease'
      };
    }

    return {
      padding: '0.75rem 1.5rem',
      backgroundColor: isLoading ? '#6c757d' : '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      fontSize: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      opacity: disabled ? 0.6 : 1,
      transition: 'all 0.2s ease'
    };
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <span
            style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid #fff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          実行中...
        </>
      );
    }

    if (hasError) {
      return (
        <>
          <RefreshCw size={16} aria-hidden="true" /> 再試行 {retryCount > 0 && `(${retryCount}回目)`}
        </>
      );
    }

    return buttonText;
  };

  return (
    <div className={className}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <button
        onClick={hasError ? handleRetry : executeAction}
        disabled={disabled || isLoading}
        style={getButtonStyle()}
      >
        {getButtonContent()}
      </button>

      {hasError && lastError && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '4px',
            color: 'var(--color-text-primary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} color="#fbbf24" aria-hidden="true" />
            <strong>エラーが発生しました</strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {errorMessage || lastError.message}
          </p>
          {retryCount > 0 && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#fbbf24' }}>
              再試行回数: {retryCount}/{maxRetries + 1}
            </p>
          )}
        </div>
      )}
    </div>
  );
};