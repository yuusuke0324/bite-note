// 削除確認モーダルコンポーネント

import React, { useEffect } from 'react';
import type { FishingRecord } from '../types';
import { Icon } from './ui/Icon';
import { AlertTriangle, Fish, Calendar, MapPin, Ruler, Trash2 } from 'lucide-react';
import { colors } from '../theme/colors';

interface DeleteConfirmModalProps {
  record: FishingRecord;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  record,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  // ESCキーでキャンセル
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isLoading]);

  // 背景クリックでキャンセル
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: '1rem'
      }}
      onClick={handleBackgroundClick}
      aria-label="削除確認ダイアログ"
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          backgroundColor: colors.surface.primary,
          borderRadius: '12px',
          padding: '2rem',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
          border: `1px solid ${colors.border.light}`,
          animation: 'modalSlideIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* アイコンとタイトル */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <Icon icon={AlertTriangle} size={48} color="error" decorative />
          </div>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: colors.text.primary,
            marginBottom: '0.5rem'
          }}>
            記録を削除しますか？
          </h2>
          <p style={{
            margin: 0,
            fontSize: '0.875rem',
            color: colors.text.secondary
          }}>
            この操作は取り消すことができません
          </p>
        </div>

        {/* 削除対象の記録情報 */}
        <div style={{
          backgroundColor: colors.surface.secondary,
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          border: `1px solid ${colors.border.light}`
        }}>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: colors.text.primary,
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Icon icon={Fish} size={18} color="primary" decorative /> {record.fishSpecies}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: colors.text.secondary,
            marginBottom: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Icon icon={Calendar} size={14} color="secondary" decorative /> {formatDate(record.date)}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: colors.text.secondary,
            marginBottom: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Icon icon={MapPin} size={14} color="secondary" decorative /> {record.location}
          </div>
          {record.size && (
            <div style={{
              fontSize: '0.875rem',
              color: colors.text.secondary,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Icon icon={Ruler} size={14} color="secondary" decorative /> {record.size}cm
            </div>
          )}
        </div>

        {/* ボタン */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isLoading ? '#dc3545' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              opacity: isLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                削除中...
              </>
            ) : (
              <>
                <Icon icon={Trash2} size={16} decorative /> 削除する
              </>
            )}
          </button>
        </div>
      </div>

      {/* CSS アニメーション */}
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ホバーエフェクト */
        button:not(:disabled):hover {
          filter: brightness(1.1);
        }

        button:focus {
          outline: 2px solid #60a5fa;
          outline-offset: 2px;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          .delete-confirm-modal {
            margin: 1rem;
            padding: 1.5rem;
          }

          .delete-confirm-modal h2 {
            font-size: 1.25rem;
          }

          .delete-confirm-modal .buttons {
            flex-direction: column;
          }

          .delete-confirm-modal button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};