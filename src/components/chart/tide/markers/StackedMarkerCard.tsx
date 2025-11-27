/**
 * StackedMarkerCard.tsx - Glassmorphism stacked marker component
 * Issue #273: TideChart fishing marker enhancement
 *
 * Accessibility:
 * - WCAG 2.1 AA compliant
 * - Keyboard navigation (Tab, Enter, Escape)
 * - Screen reader support (ARIA)
 * - Focus management
 * - Minimum tap target 44x44px
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Fish, X } from 'lucide-react';
import type { MarkerGroup, FishingMarkerData } from './types';
import styles from './StackedMarkerCard.module.css';

/**
 * Props for StackedMarkerCard component
 */
export interface StackedMarkerCardProps {
  /** Marker group data */
  group: MarkerGroup;
  /** Index of this marker in the group list */
  index: number;
  /** Theme mode */
  theme?: 'light' | 'dark' | 'high-contrast';
  /** Whether this marker is expanded */
  isExpanded?: boolean;
  /** Callback when marker is clicked */
  onClick?: (index: number) => void;
  /** Callback when marker is closed */
  onClose?: (index: number) => void;
  /** Callback when a record is clicked */
  onRecordClick?: (record: FishingMarkerData) => void;
  /** Additional CSS class */
  className?: string;
  /** Test ID */
  testId?: string;
}

/**
 * StackedMarkerCard - Glassmorphism marker card showing grouped fishing records
 */
export const StackedMarkerCard = React.memo<StackedMarkerCardProps>(
  ({
    group,
    index,
    theme = 'light',
    isExpanded = false,
    onClick,
    onClose,
    onRecordClick,
    className,
    testId,
  }) => {
    const cardRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const firstRecordRef = useRef<HTMLButtonElement>(null);
    const [focusedRecordIndex, setFocusedRecordIndex] = useState(-1);

    const recordCount = group.records.length;
    const hasMultipleRecords = recordCount > 1;

    // Generate CSS classes based on theme
    const cardClasses = [
      styles.card,
      theme === 'dark' && styles.cardDark,
      theme === 'high-contrast' && styles.cardHighContrast,
      isExpanded && styles.cardExpanded,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const listClasses = [
      styles.listContainer,
      theme === 'dark' && styles.listContainerDark,
    ]
      .filter(Boolean)
      .join(' ');

    // Handle card click
    const handleCardClick = useCallback(() => {
      onClick?.(index);
    }, [onClick, index]);

    // Handle close button click
    const handleCloseClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose?.(index);
      },
      [onClose, index]
    );

    // Handle record click
    const handleRecordClick = useCallback(
      (record: FishingMarkerData) => {
        onRecordClick?.(record);
      },
      [onRecordClick]
    );

    // Handle keyboard navigation on card
    const handleCardKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            onClick?.(index);
            break;
          case 'Escape':
            if (isExpanded) {
              e.preventDefault();
              onClose?.(index);
            }
            break;
        }
      },
      [onClick, onClose, index, isExpanded]
    );

    // Handle keyboard navigation in list
    const handleListKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const records = group.records;
        const currentIndex = focusedRecordIndex;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setFocusedRecordIndex((prev) =>
              prev < records.length - 1 ? prev + 1 : prev
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setFocusedRecordIndex((prev) => (prev > 0 ? prev - 1 : prev));
            break;
          case 'Home':
            e.preventDefault();
            setFocusedRecordIndex(0);
            break;
          case 'End':
            e.preventDefault();
            setFocusedRecordIndex(records.length - 1);
            break;
          case 'Enter':
            e.preventDefault();
            if (currentIndex >= 0 && currentIndex < records.length) {
              onRecordClick?.(records[currentIndex]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            onClose?.(index);
            cardRef.current?.focus();
            break;
        }
      },
      [group.records, focusedRecordIndex, onRecordClick, onClose, index]
    );

    // Focus management when expanded
    useEffect(() => {
      if (isExpanded && firstRecordRef.current) {
        setFocusedRecordIndex(0);
        firstRecordRef.current.focus();
      } else if (!isExpanded) {
        setFocusedRecordIndex(-1);
      }
    }, [isExpanded]);

    // Click outside to close
    useEffect(() => {
      if (!isExpanded) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (
          listRef.current &&
          !listRef.current.contains(e.target as Node) &&
          cardRef.current &&
          !cardRef.current.contains(e.target as Node)
        ) {
          onClose?.(index);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isExpanded, onClose, index]);

    // Generate ARIA label
    const ariaLabel = hasMultipleRecords
      ? `${group.time} fishing records, ${recordCount} catches. Press Enter to expand.`
      : `${group.time} fishing record: ${group.records[0]?.species || 'Unknown'}`;

    // Check if parent is handling positioning (x, y are 0)
    const parentHandlesPosition = group.x === 0 && group.y === 0;

    return (
      <div
        style={{
          position: parentHandlesPosition ? 'relative' : 'absolute',
          left: parentHandlesPosition ? undefined : group.x,
          top: parentHandlesPosition ? undefined : group.y,
          transform: parentHandlesPosition ? 'translate(-50%, -100%)' : 'translate(-50%, -100%)',
        }}
        data-testid={testId || `stacked-marker-${index}`}
      >
        {/* Main Card Button */}
        <button
          ref={cardRef}
          className={cardClasses}
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          aria-label={ariaLabel}
          aria-expanded={isExpanded}
          aria-haspopup={hasMultipleRecords ? 'listbox' : undefined}
          type="button"
        >
          <span className={styles.iconContainer}>
            <Fish className={styles.icon} aria-hidden="true" />
          </span>
          {hasMultipleRecords && (
            <span className={styles.badge} aria-hidden="true">
              {recordCount}
            </span>
          )}
          <span className={styles.srOnly}>
            {`${recordCount} fishing ${recordCount === 1 ? 'record' : 'records'} at ${group.time}`}
          </span>
        </button>

        {/* Expanded List */}
        {isExpanded && (
          <div
            ref={listRef}
            className={listClasses}
            role="listbox"
            aria-label={`Fishing records at ${group.time}`}
            onKeyDown={handleListKeyDown}
          >
            {/* Close Button */}
            <button
              className={styles.closeButton}
              onClick={handleCloseClick}
              aria-label="Close record list"
              type="button"
            >
              <X size={16} aria-hidden="true" />
            </button>

            {/* Header */}
            <div className={styles.listHeader}>
              <Fish size={16} className={styles.icon} aria-hidden="true" />
              <h3 className={styles.listTitle}>Catches</h3>
              <span className={styles.listCount}>({recordCount})</span>
            </div>

            {/* Record List */}
            {group.records.map((record, recordIndex) => (
              <button
                key={record.id}
                ref={recordIndex === 0 ? firstRecordRef : undefined}
                className={styles.recordItem}
                onClick={() => handleRecordClick(record)}
                role="option"
                aria-selected={focusedRecordIndex === recordIndex}
                tabIndex={focusedRecordIndex === recordIndex ? 0 : -1}
                type="button"
              >
                <span className={styles.recordTime}>{record.time}</span>
                <span className={styles.recordSpecies}>
                  {record.species || 'Unknown species'}
                </span>
                {record.size && (
                  <span className={styles.recordSize}>{record.size}cm</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

StackedMarkerCard.displayName = 'StackedMarkerCard';
