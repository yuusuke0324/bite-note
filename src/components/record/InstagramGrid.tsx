/**
 * InstagramGrid - Instagram-style grid layout for fishing records
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
import './InstagramGrid.css';

export interface InstagramGridProps {
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
    <div className="instagram-grid__empty-state" role="status">
      <div className="instagram-grid__empty-content">
        <Fish size={80} className="instagram-grid__empty-icon" aria-hidden="true" />
        <h2 className="instagram-grid__empty-title">
          No fishing records yet
        </h2>
        <p className="instagram-grid__empty-description">
          Record your first catch and start building your fishing journal
        </p>
        {onCreateRecord && (
          <button
            type="button"
            className="instagram-grid__empty-cta"
            onClick={onCreateRecord}
            aria-label="Create your first fishing record"
          >
            <Plus size={20} aria-hidden="true" />
            <span>Create First Record</span>
          </button>
        )}
      </div>
    </div>
  );
};

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
      className={`instagram-grid instagram-grid--skeleton ${className}`}
      aria-busy="true"
      aria-label="Loading fishing records"
    >
      {skeletons.map((index) => (
        <SkeletonPhotoHeroCard key={`skeleton-${index}`} variant="grid" />
      ))}
    </div>
  );
};

export const InstagramGrid: React.FC<InstagramGridProps> = ({
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
      className={`instagram-grid ${className}`}
      role="grid"
      aria-label="Fishing records gallery"
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

InstagramGrid.displayName = 'InstagramGrid';

export default InstagramGrid;
