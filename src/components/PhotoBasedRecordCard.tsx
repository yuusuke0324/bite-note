// 写真ベースの釣果記録カードコンポーネント

import React, { useState, useEffect } from 'react';
import { photoService } from '../lib/photo-service';
import { textStyles, typography } from '../theme/typography';
import type { FishingRecord } from '../types';
import { logger } from '../lib/errors/logger';
import { Icon } from './ui/Icon';
import { Fish, MapPin, CloudSun, Waves, FileText, Ruler, Pencil, Trash2 } from 'lucide-react';

interface PhotoBasedRecordCardProps {
  record: FishingRecord;
  onClick?: (record: FishingRecord) => void;
  onEdit?: (record: FishingRecord) => void;
  onDelete?: (record: FishingRecord) => void;
  showActions?: boolean;
  className?: string;
}

export const PhotoBasedRecordCard: React.FC<PhotoBasedRecordCardProps> = React.memo(({
  record,
  onClick,
  onEdit,
  onDelete,
  showActions = true,
  className = ''
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [photoError, setPhotoError] = useState(false);
  const photoUrlRef = React.useRef<string | null>(null);

  // 写真の読み込み
  useEffect(() => {
    let isMounted = true;

    const loadPhoto = async () => {
      if (!record.photoId) {
        if (isMounted) {
          setPhotoLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setPhotoLoading(true);
          setPhotoError(false);
        }

        const photoResult = await photoService.getPhotoById(record.photoId);

        if (isMounted && photoResult.success && photoResult.data) {
          const url = URL.createObjectURL(photoResult.data.blob);
          photoUrlRef.current = url;
          setPhotoUrl(url);
        } else if (photoResult.error) {
          logger.error('PhotoBasedRecordCard: 写真の取得に失敗', { error: photoResult.error });
          if (isMounted) {
            setPhotoError(true);
          }
        }
      } catch (error) {
        logger.error('PhotoBasedRecordCard: 写真の読み込みでエラー', { error });
        if (isMounted) {
          setPhotoError(true);
        }
      } finally{
        if (isMounted) {
          setPhotoLoading(false);
        }
      }
    };

    loadPhoto();

    // クリーンアップ
    return () => {
      isMounted = false;
      if (photoUrlRef.current) {
        URL.revokeObjectURL(photoUrlRef.current);
        photoUrlRef.current = null;
      }
    };
  }, [record.photoId]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    }).format(date);
  };

  const formatSize = (size?: number) => {
    if (size === undefined || size === null) return '';
    return `${size}cm`;
  };

  const formatSeaTemperature = (temp?: number) => {
    if (temp === undefined || temp === null) return '';
    return `${temp}°C`;
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
    return location.length > 25 ? `${location.substring(0, 25)}...` : location;
  };

  return (
    <div
      className={`photo-based-record-card hover-card-lift ${className}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`記録: ${record.fishSpecies}, ${formatDate(record.date)}, ${record.location}`}
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface-primary)',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
        border: `1px solid var(--color-border-light)`,
        fontFamily: typography.fontFamily.primary,
      }}
    >
      {/* 写真部分 */}
      <div style={{
        width: '100%',
        position: 'relative',
        backgroundColor: 'var(--color-surface-tertiary)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {photoLoading && (
          <div style={{
            width: '100%',
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-surface-tertiary)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: `3px solid var(--color-border-light)`,
              borderTop: '3px solid var(--color-primary-500)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        )}

        {!photoLoading && !photoError && photoUrl && (
          <img
            src={photoUrl}
            alt={`${record.fishSpecies}の釣果写真`}
            style={{
              maxWidth: '100%',
              maxHeight: '600px',
              width: 'auto',
              height: 'auto',
              display: 'block',
              objectFit: 'contain'
            }}
          />
        )}

        {!photoLoading && (photoError || !photoUrl) && (
          <div style={{
            width: '100%',
            height: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-surface-tertiary)',
            color: '#6c757d'
          }}>
            <Icon icon={Fish} size={48} color="secondary" decorative />
            <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>写真なし</div>
          </div>
        )}

        {/* 日付バッジ */}
        <div className="date-badge" style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '500'
        }}>
          {formatDate(record.date)}
        </div>

        {/* サイズバッジ */}
        {record.size && (
          <div className="size-badge" style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            color: '#212529',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Icon icon={Ruler} size={14} decorative /> {formatSize(record.size)}
          </div>
        )}

        {/* アクションボタン */}
        {showActions && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              className="photo-card-action-btn"
              onClick={handleEditClick}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--color-primary-500)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="編集"
            >
              <Icon icon={Pencil} size={16} decorative />
            </button>
            <button
              className="photo-card-action-btn"
              onClick={handleDeleteClick}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--color-status-error)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="削除"
            >
              <Icon icon={Trash2} size={16} decorative />
            </button>
          </div>
        )}
      </div>

      {/* 情報部分 */}
      <div style={{ padding: '16px' }}>
        {/* 魚種 */}
        <h3 style={{
          margin: '0 0 12px 0',
          ...textStyles.title.large,
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Icon icon={Fish} size={24} color="primary" decorative /> {record.fishSpecies}
        </h3>

        {/* 場所 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '12px',
          ...textStyles.body.medium,
          color: 'var(--color-text-secondary)'
        }}>
          <Icon icon={MapPin} size={16} color="secondary" decorative />
          <span>{formatLocation(record.location)}</span>
        </div>

        {/* 環境条件 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {record.weather && (
            <span style={{
              backgroundColor: 'rgba(96, 165, 250, 0.2)',
              color: '#60a5fa',
              padding: '2px 6px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Icon icon={CloudSun} size={14} decorative /> {record.weather}
            </span>
          )}

          {record.temperature && (
            <span style={{
              backgroundColor: 'rgba(52, 211, 153, 0.2)',
              color: '#34d399',
              padding: '2px 6px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Icon icon={Waves} size={14} decorative /> {formatSeaTemperature(record.temperature)}
            </span>
          )}
        </div>

        {/* メモ（最初の50文字） */}
        {record.notes && (
          <div style={{
            fontSize: '0.8rem',
            color: '#6c757d',
            lineHeight: 1.4,
            marginTop: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px'
          }}>
            <Icon icon={FileText} size={14} color="secondary" decorative style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{record.notes.length > 50 ? `${record.notes.substring(0, 50)}...` : record.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // record.idとphotoIdが同じなら再レンダリングしない
  return prevProps.record.id === nextProps.record.id &&
         prevProps.record.photoId === nextProps.record.photoId;
});

// CSS アニメーション用のスタイルを追加
const style = document.createElement('style');
style.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);