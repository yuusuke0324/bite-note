// シンプルな写真ベース記録一覧（フォールバック版）

import React from 'react';
import { AlertTriangle, Fish, Camera, FileText } from 'lucide-react';
import { PhotoBasedRecordCard } from './PhotoBasedRecordCard';
import type { FishingRecord } from '../types';

interface SimplePhotoListProps {
  records: FishingRecord[];
  loading?: boolean;
  error?: string;
  onRecordClick?: (record: FishingRecord) => void;
  onRecordEdit?: (record: FishingRecord) => void;
  onRecordDelete?: (record: FishingRecord) => void;
  onDataRefresh?: () => void;
}

export const SimplePhotoList: React.FC<SimplePhotoListProps> = ({
  records,
  loading = false,
  error,
  onRecordClick,
  onRecordEdit,
  onRecordDelete,
  onDataRefresh
}) => {
  // エラー表示
  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#ef4444',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '8px',
        margin: '1rem 0'
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={24} color="#F59E0B" aria-hidden="true" /> データの読み込みに失敗しました
        </h3>
        <p>{error}</p>
        <button
          onClick={onDataRefresh}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          再読み込み
        </button>
      </div>
    );
  }

  // 写真ありとなしで分離
  const recordsWithPhotos = records.filter(record => record.photoId);
  const recordsWithoutPhotos = records.filter(record => !record.photoId);

  return (
    <div>
      {/* ヘッダー */}
      <div style={{
        backgroundColor: 'var(--color-surface-secondary)',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        border: `1px solid var(--color-border-light)`
      }}>
        <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Camera size={24} color="#60a5fa" aria-hidden="true" /> 写真で確認 ({records.length}件)
        </h2>
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Camera size={14} color="var(--color-text-secondary)" aria-hidden="true" /> 写真付き: {recordsWithPhotos.length}件
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FileText size={14} color="var(--color-text-secondary)" aria-hidden="true" /> 写真なし: {recordsWithoutPhotos.length}件
          </span>
        </div>
      </div>

      {/* 読み込み中 */}
      {loading && records.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: `4px solid var(--color-border-light)`,
            borderTop: '4px solid #60a5fa',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          読み込み中...
        </div>
      ) : records.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          backgroundColor: 'var(--color-surface-secondary)',
          borderRadius: '8px',
          border: `1px solid var(--color-border-light)`
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Fish size={48} color="#9CA3AF" aria-hidden="true" />
          </div>
          <h3 style={{ color: 'var(--color-text-primary)' }}>記録がありません</h3>
          <p>デバッグタブでテスト記録を作成してみましょう！</p>
        </div>
      ) : (
        <>
          {/* 写真付き記録 */}
          {recordsWithPhotos.length > 0 && (
            <div>
              <h3 style={{
                marginBottom: '1rem',
                color: 'var(--color-text-primary)',
                fontSize: '1.125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Camera size={20} color="#60a5fa" aria-hidden="true" /> 写真付き記録 ({recordsWithPhotos.length}件)
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '2rem'
              }}>
                {recordsWithPhotos.map((record) => (
                  <PhotoBasedRecordCard
                    key={`${record.id}-${record.photoId || 'no-photo'}`}
                    record={record}
                    onClick={onRecordClick}
                    onEdit={onRecordEdit}
                    onDelete={onRecordDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 写真なし記録 */}
          {recordsWithoutPhotos.length > 0 && (
            <div>
              <h3 style={{
                marginBottom: '1rem',
                color: 'var(--color-text-primary)',
                fontSize: '1.125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FileText size={20} color="var(--color-text-secondary)" aria-hidden="true" /> 写真なし記録 ({recordsWithoutPhotos.length}件)
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
              }}>
                {recordsWithoutPhotos.map((record) => (
                  <PhotoBasedRecordCard
                    key={`${record.id}-${record.photoId || 'no-photo'}`}
                    record={record}
                    onClick={onRecordClick}
                    onEdit={onRecordEdit}
                    onDelete={onRecordDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};