// シンプルな写真ベース記録一覧（フォールバック版）

import React from 'react';
import { PhotoBasedRecordCard } from './PhotoBasedRecordCard';
import type { FishingRecord } from '../types';
import { Icon } from './ui/Icon';
import { AlertTriangle, Camera, FileText, Fish } from 'lucide-react';

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
        backgroundColor: '#f8d7da',
        color: '#721c24',
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        margin: '1rem 0'
      }}>
        <h3><Icon icon={AlertTriangle} size={24} color="warning" decorative /> データの読み込みに失敗しました</h3>
        <p>{error}</p>
        <button
          onClick={onDataRefresh}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
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
        backgroundColor: '#f8f9fa',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        border: '1px solid #dee2e6'
      }}>
        <h2 style={{ margin: 0, color: '#333', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon icon={Camera} size={24} decorative /> 写真で確認 ({records.length}件)
        </h2>
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          color: '#6c757d'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Icon icon={Camera} size={14} decorative /> 写真付き: {recordsWithPhotos.length}件
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Icon icon={FileText} size={14} decorative /> 写真なし: {recordsWithoutPhotos.length}件
          </span>
        </div>
      </div>

      {/* 読み込み中 */}
      {loading && records.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#6c757d'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #dee2e6',
            borderTop: '4px solid #007bff',
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
          color: '#6c757d',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <Icon icon={Fish} size={48} color="secondary" decorative />
          </div>
          <h3>釣果記録がありません</h3>
          <p>デバッグタブでテスト記録を作成してみましょう！</p>
        </div>
      ) : (
        <>
          {/* 写真付き記録 */}
          {recordsWithPhotos.length > 0 && (
            <div>
              <h3 style={{
                marginBottom: '1rem',
                color: '#333',
                fontSize: '1.125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Icon icon={Camera} size={18} decorative /> 写真付き記録 ({recordsWithPhotos.length}件)
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
                color: '#333',
                fontSize: '1.125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Icon icon={FileText} size={18} decorative /> 写真なし記録 ({recordsWithoutPhotos.length}件)
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