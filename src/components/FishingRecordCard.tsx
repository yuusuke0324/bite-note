// 釣果記録カードコンポーネント

import React, { useState, useEffect } from 'react';
import { LocationDisplay } from './LocationDisplay';
import { photoService } from '../lib/photo-service';
import type { FishingRecord } from '../types';
import { logger } from '../lib/errors/logger';

interface FishingRecordCardProps {
  record: FishingRecord;
  onClick?: (record: FishingRecord) => void;
  onEdit?: (record: FishingRecord) => void;
  onDelete?: (record: FishingRecord) => void;
  showActions?: boolean;
  className?: string;
}

export const FishingRecordCard: React.FC<FishingRecordCardProps> = ({
  record,
  onClick,
  onEdit,
  onDelete,
  showActions = true,
  className = ''
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  // 写真の読み込み
  useEffect(() => {
    let isMounted = true;

    if (record.photoId) {
      setPhotoLoading(true);
      photoService.getPhotoDataUrl(record.photoId, true)
        .then((result) => {
          if (isMounted && result.success && result.data) {
            setPhotoUrl(result.data);
          }
        })
        .catch((error) => {
          logger.error('写真の読み込みエラー', { error });
        })
        .finally(() => {
          if (isMounted) {
            setPhotoLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [record.photoId]);
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }).format(date);
  };

  const formatSize = (size?: number) => {
    if (size === undefined || size === null) return '記録なし';
    return `${size}cm`;
  };

  const handleCardClick = () => {
    onClick?.(record);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(record);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('この記録を削除しますか？')) {
      onDelete?.(record);
    }
  };

  const formatLocation = (location: string) => {
    return location.length > 20 ? `${location.substring(0, 20)}...` : location;
  };

  return (
    <div
      className={`fishing-record-card ${className}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`釣果記録: ${record.fishSpecies}, ${formatDate(record.date)}, ${record.location}`}
      style={{
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {/* ヘッダー部分 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.75rem',
        gap: '1rem'
      }}>
        {/* 写真サムネイル */}
        {record.photoId && (
          <div style={{
            width: '80px',
            height: '80px',
            flexShrink: 0,
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {photoLoading ? (
              <div style={{ color: '#999', fontSize: '0.75rem' }}>読込中...</div>
            ) : photoUrl ? (
              <img
                src={photoUrl}
                alt={record.fishSpecies}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <span style={{ fontSize: '2rem' }}>📷</span>
            )}
          </div>
        )}

        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 0.25rem 0',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🐟 {record.fishSpecies}
          </h3>
          <p style={{
            margin: '0',
            fontSize: '0.875rem',
            color: '#6c757d'
          }}>
            📅 {formatDate(record.date)}
          </p>
        </div>

        {/* サイズ表示 */}
        <div style={{
          backgroundColor: record.size ? '#e3f2fd' : '#f8f9fa',
          color: record.size ? '#1976d2' : '#6c757d',
          padding: '0.25rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.875rem',
          fontWeight: 'bold',
          minWidth: 'fit-content',
          alignSelf: 'flex-start'
        }}>
          📏 {formatSize(record.size)}
        </div>
      </div>

      {/* 場所情報 */}
      <div style={{
        marginBottom: '0.75rem'
      }}>
        <div style={{
          fontSize: '0.875rem',
          color: '#333',
          marginBottom: '0.25rem'
        }}>
          🗺️ {formatLocation(record.location)}
        </div>
        {record.coordinates && (
          <LocationDisplay
            coordinates={record.coordinates}
            showAddress={true}
            showCoordinates={false}
            showAccuracy={false}
            compact={true}
          />
        )}
        {record.coordinates && (
          <a
            href={`https://maps.google.com/?q=${record.coordinates.latitude},${record.coordinates.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: '0.75rem',
              color: '#007bff',
              textDecoration: 'none',
              padding: '0.125rem 0.375rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '12px'
            }}
            title="Googleマップで表示"
          >
            🗺️ 地図
          </a>
        )}
      </div>

      {/* メモ（ある場合のみ表示） */}
      {record.notes && (
        <div style={{
          marginBottom: '0.75rem',
          padding: '0.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          borderLeft: '3px solid #dee2e6'
        }}>
          <p style={{
            margin: '0',
            fontSize: '0.875rem',
            color: '#666',
            fontStyle: 'italic',
            lineHeight: '1.4',
            maxHeight: '3em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            💭 {record.notes}
          </p>
        </div>
      )}

      {/* フッター部分 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #f0f0f0'
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: '#999'
        }}>
          {record.updatedAt.toLocaleDateString('ja-JP')} {record.updatedAt.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
          })} 更新
        </div>

        {showActions && (
          <div style={{
            display: 'flex',
            gap: '0.5rem'
          }}>
            <button
              onClick={handleEditClick}
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title="編集"
              aria-label={`${record.fishSpecies}の記録を編集`}
            >
              ✏️ 編集
            </button>

            <button
              onClick={handleDeleteClick}
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title="削除"
              aria-label={`${record.fishSpecies}の記録を削除`}
            >
              🗑️ 削除
            </button>
          </div>
        )}
      </div>

      {/* ホバーエフェクト用のスタイル */}
      <style>{`
        .fishing-record-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
          transform: translateY(-2px);
        }

        .fishing-record-card button:hover {
          filter: brightness(1.1);
        }

        .fishing-record-card button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          .fishing-record-card {
            padding: 0.75rem;
            margin-bottom: 0.75rem;
          }

          .fishing-record-card h3 {
            font-size: 1.125rem;
          }

          .fishing-record-card button {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};