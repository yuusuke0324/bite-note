/**
 * LocationRankingSection.tsx - 人気の釣り場ランキングセクション
 * 記録数が多い釣り場のトップ3を表示
 */

import React, { useMemo } from 'react';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';
import type { FishingRecord } from '../../types';
import { Icon } from '../ui/Icon';
import { Trophy, MapPin, Medal } from 'lucide-react';

interface LocationRanking {
  location: string;
  count: number;
  rank: number;
}

interface LocationRankingSectionProps {
  records: FishingRecord[];
  onLocationClick?: (location: string) => void;
  className?: string;
}

export const LocationRankingSection: React.FC<LocationRankingSectionProps> = ({
  records,
  onLocationClick,
  className = ''
}) => {
  // 釣り場ランキングを生成
  const locationRanking = useMemo((): LocationRanking[] => {
    if (records.length === 0) return [];

    const locationCounts = new Map<string, number>();

    // 各釣り場の記録数をカウント
    records.forEach(record => {
      const count = locationCounts.get(record.location) || 0;
      locationCounts.set(record.location, count + 1);
    });

    // 記録数順にソートしてトップ3を取得
    const sorted = Array.from(locationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return sorted.map(([location, count], index) => ({
      location,
      count,
      rank: index + 1,
    }));
  }, [records]);

  // ランキングアイコン（メダルアイコンと色で表現）
  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return 'var(--color-text-tertiary)';
    }
  };

  if (locationRanking.length === 0) {
    return (
      <div
        className={`location-ranking-section ${className}`}
        style={{
          padding: '24px',
          borderRadius: '16px',
          backgroundColor: 'var(--color-surface-secondary)',
          textAlign: 'center',
        }}
      >
        <div style={{
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <Icon icon={MapPin} size={48} color="secondary" decorative />
        </div>
        <p style={{
          ...textStyles.body.medium,
          color: 'var(--color-text-secondary)',
          margin: 0,
        }}>
          まだ釣り場の記録がありません
        </p>
      </div>
    );
  }

  return (
    <div className={`location-ranking-section ${className}`}>
      {/* ヘッダー */}
      <h2 style={{
        margin: '0 0 12px 0',
        ...textStyles.title.medium,
        color: 'var(--color-text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Icon icon={Trophy} size={24} color="warning" decorative />
        <span>人気の釣り場</span>
      </h2>

      {/* ランキングリスト */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {locationRanking.map((item) => (
          <div
            key={item.location}
            onClick={() => onLocationClick?.(item.location)}
            role={onLocationClick ? 'button' : undefined}
            tabIndex={onLocationClick ? 0 : undefined}
            onKeyDown={(e) => {
              if (onLocationClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onLocationClick(item.location);
              }
            }}
            aria-label={`${item.rank}位: ${item.location}, ${item.count}件の記録`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-surface-primary)',
              border: `1px solid ${'var(--color-border-light)'}`,
              cursor: onLocationClick ? 'pointer' : 'default',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 2px rgba(60,64,67,.1)',
            }}
            className={onLocationClick ? 'hover-compact-card' : ''}
          >
            {/* ランクアイコン */}
            <div style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon icon={Medal} size={28} decorative style={{ color: getRankColor(item.rank) }} />
            </div>

            {/* 釣り場名 */}
            <div style={{
              flex: 1,
              minWidth: 0,
            }}>
              <div style={{
                ...textStyles.body.large,
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.location}
              </div>
              <div style={{
                ...textStyles.body.small,
                color: 'var(--color-text-secondary)',
              }}>
                {item.count}件の記録
              </div>
            </div>

            {/* 順位表示 */}
            <div style={{
              ...textStyles.body.large,
              fontWeight: '700',
              color: item.rank === 1 ? colors.primary[600] : 'var(--color-text-tertiary)',
              flexShrink: 0,
            }}>
              #{item.rank}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
