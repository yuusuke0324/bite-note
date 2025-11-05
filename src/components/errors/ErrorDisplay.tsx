/**
 * ErrorDisplay.tsx - エラー表示コンテナ
 * errorManagerからのエラーを受け取り、適切なUIコンポーネントで表示
 */

import React, { useEffect, useState, useCallback } from 'react';
import { errorManager } from '../../lib/errors/ErrorManager';
import type { ErrorDisplayCallback } from '../../lib/errors/ErrorManager';
import type { AppError } from '../../lib/errors/ErrorTypes';
import type { ErrorDisplayOptions } from '../../lib/errors/ErrorTypes';
import { ErrorToast } from './ErrorToast';
import { ErrorModal } from './ErrorModal';

interface DisplayedError {
  id: string;
  error: AppError | Error;
  options: ErrorDisplayOptions;
  timestamp: number;
}

export const ErrorDisplay: React.FC = () => {
  const [toastErrors, setToastErrors] = useState<DisplayedError[]>([]);
  const [modalError, setModalError] = useState<DisplayedError | null>(null);

  // エラー表示ハンドラー
  const handleDisplayError: ErrorDisplayCallback = useCallback(
    (error: AppError | Error, options: ErrorDisplayOptions) => {
      const displayedError: DisplayedError = {
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        error,
        options,
        timestamp: Date.now()
      };

      // 表示タイプに応じて処理
      switch (options.displayType) {
        case 'toast':
          setToastErrors((prev) => [...prev, displayedError]);
          break;
        case 'modal':
          setModalError(displayedError);
          break;
        case 'boundary':
          // ErrorBoundaryで処理されるため、ここでは何もしない
          break;
      }
    },
    []
  );

  // errorManagerにコールバックを登録
  useEffect(() => {
    const unregister = errorManager.registerDisplayCallback(handleDisplayError);
    return unregister;
  }, [handleDisplayError]);

  // Toast削除ハンドラー
  const handleToastClose = useCallback((id: string) => {
    setToastErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Modal削除ハンドラー
  const handleModalClose = useCallback(() => {
    setModalError(null);
  }, []);

  return (
    <>
      {/* Toast通知エリア */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: 'none'
        }}
      >
        {toastErrors.map((displayedError) => (
          <div key={displayedError.id} style={{ pointerEvents: 'auto' }}>
            <ErrorToast
              error={displayedError.error}
              onClose={() => handleToastClose(displayedError.id)}
              autoHideDuration={displayedError.options.autoHideDuration ?? 5000}
              showIcon={displayedError.options.showIcon}
            />
          </div>
        ))}
      </div>

      {/* モーダルエラー */}
      {modalError && (
        <ErrorModal
          error={modalError.error}
          onClose={handleModalClose}
          showStackTrace={modalError.options.showStackTrace}
        />
      )}
    </>
  );
};
