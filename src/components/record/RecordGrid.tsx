/**
 * RecordGrid - Grid layout for fishing records
 *
 * Features:
 * - Responsive grid layout (2/3/4 columns)
 * - Uses PhotoHeroCard with variant="grid"
 * - Keyboard navigation support (arrow keys)
 * - Empty state with CTA
 * - Loading skeleton state
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { Fish, Plus } from 'lucide-react';
import { PhotoHeroCard } from './PhotoHeroCard';
import { SkeletonPhotoHeroCard } from '../ui/SkeletonPhotoHeroCard';
import { useGridNavigation } from '../../hooks/useGridNavigation';
import type { FishingRecord } from '../../types';
import './RecordGrid.css';

export interface RecordGridProps {
  /** Array of fishing records to display */
  records: FishingRecord[];
  /** Callback when a record card is clicked */
  onRecordClick?: (record: FishingRecord) => void;
  /** Loading state - shows skeleton grid */
  loading?: boolean;
  /** Number of skeleton cards to show during loading (default: 8) */
  skeletonCount?: number;
  /** Additional CSS classes */
  className?: string;
  /** Callback for empty state CTA button */
  onCreateRecord?: () => void;
}

/**
 * Empty state component shown when no records exist
 */
const EmptyStateCard: React.FC<{ onCreateRecord?: () => void }> = ({ onCreateRecord }) => {
  return (
    <div className="record-grid__empty-state" role="status">
      <div className="record-grid__empty-content">
        <Fish size={80} className="record-grid__empty-icon" aria-hidden="true" />
        <h2 className="record-grid__empty-title">
          まだ記録がありません
        </h2>
        <p className="record-grid__empty-description">
          最初の釣果を記録して、釣り日記を始めましょう
        </p>
        {onCreateRecord && (
          <button
            type="button"
            className="record-grid__empty-cta"
            onClick={onCreateRecord}
            aria-label="最初の釣果記録を作成"
          >
            <Plus size={20} aria-hidden="true" />
            <span>最初の記録を作成</span>
          </button>
        )}
      </div>
    </div>
  );
};

EmptyStateCard.displayName = 'RecordGrid.EmptyStateCard';

/**
 * Loading skeleton grid component
 */
const SkeletonGrid: React.FC<{ count: number; className?: string }> = ({ count, className = '' }) => {
  const skeletons = useMemo(
    () => Array.from({ length: count }, (_, i) => i),
    [count]
  );

  return (
    <div
      className={`record-grid record-grid--skeleton ${className}`}
      aria-busy="true"
      aria-label="釣果記録を読み込み中"
    >
      {skeletons.map((index) => (
        <SkeletonPhotoHeroCard key={`skeleton-${index}`} variant="grid" />
      ))}
    </div>
  );
};

SkeletonGrid.displayName = 'RecordGrid.SkeletonGrid';

export const RecordGrid: React.FC<RecordGridProps> = ({
  records,
  onRecordClick,
  loading = false,
  skeletonCount = 8,
  className = '',
  onCreateRecord,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation hook
  const { handleKeyDown } = useGridNavigation({
    containerRef: gridRef,
    itemSelector: '.photo-hero-card',
  });

  // Memoized click handler factory
  const handleRecordClick = useCallback(
    (record: FishingRecord) => {
      onRecordClick?.(record);
    },
    [onRecordClick]
  );

  // Show loading skeleton
  if (loading) {
    return <SkeletonGrid count={skeletonCount} className={className} />;
  }

  // Show empty state
  if (records.length === 0) {
    return <EmptyStateCard onCreateRecord={onCreateRecord} />;
  }

  // Calculate grid dimensions for ARIA
  const columnCount = 4; // Max columns (will be less on smaller screens via CSS)
  const rowCount = Math.ceil(records.length / columnCount);

  return (
    <div
      ref={gridRef}
      className={`record-grid ${className}`}
      role="grid"
      aria-label="釣果記録ギャラリー"
      aria-rowcount={rowCount}
      aria-colcount={columnCount}
      onKeyDown={handleKeyDown}
    >
      {records.map((record) => (
        <PhotoHeroCard
          key={record.id}
          record={record}
          onClick={handleRecordClick}
          variant="grid"
        />
      ))}
    </div>
  );
};

RecordGrid.displayName = 'RecordGrid';

export default RecordGrid;
