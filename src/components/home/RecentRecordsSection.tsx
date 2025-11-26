/**
 * RecentRecordsSection.tsx - 最近の記録セクション
 * ホーム画面に最新5件の記録をコンパクト表示
 */

import React, { useMemo } from 'react';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';
import { CompactRecordCard } from './CompactRecordCard';
import type { FishingRecord } from '../../types';
import { Icon } from '../ui/Icon';
import { Fish, FileText, ArrowRight } from 'lucide-react';

interface RecentRecordsSectionProps {
  records: FishingRecord[];
  onRecordClick?: (record: FishingRecord) => void;
  onViewAll?: () => void;
  className?: string;
}

export const RecentRecordsSection: React.FC<RecentRecordsSectionProps> = ({
  records,
  onRecordClick,
  onViewAll,
  className = ''
}) => {
  // 最新5件の記録を取得
  const recentRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [records]);

  if (records.length === 0) {
    return (
      <div
        className={`recent-records-section ${className}`}
        style={{
          padding: '24px',
          borderRadius: '16px',
          backgroundColor: colors.surface.secondary,
          textAlign: 'center',
        }}
      >
        <div style={{
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <Icon icon={Fish} size={48} color="secondary" decorative />
        </div>
        <p style={{
          ...textStyles.body.medium,
          color: colors.text.secondary,
          margin: 0,
        }}>
          まだ記録がありません
        </p>
      </div>
    );
  }

  return (
    <div className={`recent-records-section ${className}`}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <h2 style={{
          margin: 0,
          ...textStyles.title.medium,
          color: colors.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Icon icon={FileText} size={24} color="primary" decorative />
          <span>最近の記録</span>
        </h2>

        {onViewAll && (
          <button
            onClick={onViewAll}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.primary[600],
              ...textStyles.body.medium,
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary[50];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>もっと見る</span>
            <Icon icon={ArrowRight} size={16} decorative />
          </button>
        )}
      </div>

      {/* レコードリスト */}
      <div
        className="recent-records-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '10px',
        }}
      >
        {recentRecords.map((record) => (
          <CompactRecordCard
            key={`${record.id}-${record.photoId || 'no-photo'}`}
            record={record}
            onClick={onRecordClick}
          />
        ))}
      </div>

      {/* スタイル調整用のメディアクエリ */}
      <style>
        {`
          @media (max-width: 640px) {
            .recent-records-grid {
              grid-template-columns: 1fr !important;
              gap: 10px !important;
            }
          }
          @media (min-width: 641px) and (max-width: 1024px) {
            .recent-records-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 10px !important;
            }
          }
          @media (min-width: 1025px) {
            .recent-records-grid {
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 10px !important;
            }
          }
        `}
      </style>
    </div>
  );
};
