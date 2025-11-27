/**
 * CompactRecordCard.tsx - コンパクトな釣果記録カード
 * ホーム画面の「最近の記録」セクションで使用
 */

import React, { useState, useEffect } from 'react';
import { photoService } from '../../lib/photo-service';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';
import { Skeleton } from '../ui/Skeleton';
import type { FishingRecord } from '../../types';
import { logger } from '../../lib/errors/logger';
import { Icon } from '../ui/Icon';
import { Fish, MapPin, Clock } from 'lucide-react';

interface CompactRecordCardProps {
  record: FishingRecord;
  onClick?: (record: FishingRecord) => void;
  className?: string;
}

export const CompactRecordCard: React.FC<CompactRecordCardProps> = React.memo(({
  record,
  onClick,
  className = ''
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);
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
        }
        const photoResult = await photoService.getPhotoById(record.photoId);

        if (isMounted && photoResult.success && photoResult.data) {
          const url = URL.createObjectURL(photoResult.data.blob);
          photoUrlRef.current = url;
          setPhotoUrl(url);
        } else if (photoResult.error) {
          logger.error('CompactRecordCard: 写真取得失敗', { error: photoResult.error });
        }
      } catch (error) {
        logger.error('CompactRecordCard: 写真の読み込みエラー', { error });
      } finally {
        if (isMounted) {
          setPhotoLoading(false);
        }
      }
    };

    loadPhoto();

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    }).format(date);
  };

  const formatLocation = (location: string) => {
    return location.length > 20 ? `${location.substring(0, 20)}...` : location;
  };

  const handleClick = () => {
    onClick?.(record);
  };

  return (
    <div
      className={`compact-record-card ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`記録: ${record.fishSpecies}, ${formatDate(record.date)}, ${record.location}`}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        borderRadius: '12px',
        backgroundColor: colors.surface.primary,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `1px solid ${colors.border.light}`,
        boxShadow: '0 1px 2px rgba(60,64,67,.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(60,64,67,.2)';
        e.currentTarget.style.borderColor = colors.primary[300];
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(60,64,67,.1)';
        e.currentTarget.style.borderColor = colors.border.light;
      }}
    >
      {/* 写真サムネイル */}
      <div
        style={{
          width: '80px',
          height: '80px',
          flexShrink: 0,
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: colors.surface.tertiary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photoLoading && (
          <Skeleton width="80px" height="80px" borderRadius="8px" />
        )}

        {!photoLoading && photoUrl && (
          <img
            src={photoUrl}
            alt={`${record.fishSpecies}の写真`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {!photoLoading && !photoUrl && (
          <Icon icon={Fish} size={32} color="secondary" decorative />
        )}
      </div>

      {/* 情報部分 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minWidth: 0, // Flexboxで文字が溢れないようにする
      }}>
        {/* 魚種 */}
        <h4 style={{
          margin: '0 0 4px 0',
          ...textStyles.body.large,
          fontWeight: '600',
          color: colors.text.primary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {record.fishSpecies}
        </h4>

        {/* 場所 */}
        <div style={{
          ...textStyles.body.small,
          color: colors.text.secondary,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '4px',
        }}>
          <Icon icon={MapPin} size={14} color="secondary" decorative />
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {formatLocation(record.location)}
          </span>
        </div>

        {/* 日付 */}
        <div style={{
          ...textStyles.body.small,
          color: colors.text.tertiary,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <Icon icon={Clock} size={14} color="secondary" decorative />
          <span>{formatDate(record.date)}</span>
        </div>
      </div>

      {/* サイズ・重量バッジ（オプション） */}
      {(record.size || record.weight) && (
        <div style={{
          alignSelf: 'flex-start',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {record.size && (
            <div style={{
              backgroundColor: colors.primary[50],
              color: colors.primary[700],
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}>
              {record.size}cm
            </div>
          )}
          {record.weight && (
            <div style={{
              backgroundColor: colors.primary[50],
              color: colors.primary[700],
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}>
              {record.weight}g
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // record.idとphotoIdが同じなら再レンダリングしない
  return prevProps.record.id === nextProps.record.id &&
         prevProps.record.photoId === nextProps.record.photoId;
});
