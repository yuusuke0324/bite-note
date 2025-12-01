/**
 * RecentRecordsSection.tsx - 最近の記録セクション
 * ホーム画面に最新6件の記録をRecordGridで表示
 *
 * @updated Phase 1-5 (Issue #322): CompactRecordCard → RecordGrid
 */

import React, { useMemo } from 'react';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';
import { RecordGrid } from '../record/RecordGrid';
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
  // 最新6件の記録を取得（RecordGridの2行分）
  const recentRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [records]);

  if (records.length === 0) {
    return (
      <div
        className={`recent-records-section ${className}`}
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
          <Icon icon={Fish} size={48} color="secondary" decorative />
        </div>
        <p style={{
          ...textStyles.body.medium,
          color: 'var(--color-text-secondary)',
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
          color: 'var(--color-text-primary)',
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

      {/* レコードリスト - RecordGridを使用 */}
      <RecordGrid
        records={recentRecords}
        onRecordClick={onRecordClick}
      />
    </div>
  );
};
