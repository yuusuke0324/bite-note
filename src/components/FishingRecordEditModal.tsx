// 釣果記録編集モーダルコンポーネント

import React, { useEffect, useState } from 'react';
import { FishingRecordForm } from './FishingRecordForm';
import type { FishingRecord } from '../types';
import type { CreateFishingRecordFormData } from '../lib/validation';
import { logger } from '../lib/errors/logger';
import { Icon } from './ui/Icon';
import { colors } from '../theme/colors';
import { Edit, X } from 'lucide-react';

interface FishingRecordEditModalProps {
  record: FishingRecord;
  onClose: () => void;
  onSave: (id: string, data: CreateFishingRecordFormData) => Promise<void>;
  isLoading?: boolean;
}

export const FishingRecordEditModal: React.FC<FishingRecordEditModalProps> = ({
  record,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 背景クリックでモーダルを閉じる
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // フォーム送信ハンドラー
  const handleSubmit = async (data: CreateFishingRecordFormData) => {
    try {
      setIsSubmitting(true);
      await onSave(record.id, data);
      onClose();
    } catch (error) {
      logger.error('Failed to save record', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 既存レコードのデータを編集フォーム用に変換
  const initialData: Partial<CreateFishingRecordFormData> = {
    date: record.date.toISOString().split('T')[0],
    location: record.location,
    fishSpecies: record.fishSpecies,
    size: record.size,
    notes: record.notes,
    coordinates: record.coordinates,
    useGPS: Boolean(record.coordinates)
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={handleBackgroundClick}
      aria-label="編集モーダル"
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          backgroundColor: colors.surface.primary,
          borderRadius: '12px',
          padding: '2rem',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          border: `1px solid ${colors.border.light}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: `1px solid ${colors.border.light}`
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: colors.text.primary
          }}>
            <Icon icon={Edit} size={20} decorative /> 記録を編集
          </h2>

          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              color: colors.text.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.5rem',
              height: '2.5rem'
            }}
            title="閉じる"
            aria-label="モーダルを閉じる"
          >
            <Icon icon={X} size={20} decorative />
          </button>
        </div>

        {/* 編集フォーム */}
        <FishingRecordForm
          onSubmit={handleSubmit}
          initialData={initialData}
          isLoading={isSubmitting || isLoading}
        />

        {/* フッター（キャンセルボタン） */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: `1px solid ${colors.border.light}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem'
        }}>
          <button
            onClick={onClose}
            disabled={isSubmitting || isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              opacity: isSubmitting || isLoading ? 0.6 : 1
            }}
          >
            キャンセル
          </button>
        </div>
      </div>

      {/* CSS スタイル */}
      <style>{`
        /* モーダルアニメーション */
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* ホバーエフェクト */
        button:not(:disabled):hover {
          filter: brightness(1.1);
        }

        button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          /* スマホでは全画面表示 */
          .modal-content {
            margin: 0;
            border-radius: 0;
            height: 100vh;
            max-height: none;
          }
        }
      `}</style>
    </div>
  );
};