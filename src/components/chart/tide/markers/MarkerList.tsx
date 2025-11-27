/**
 * MarkerList.tsx - Expanded list component for fishing records
 * Issue #273: TideChart fishing marker enhancement
 *
 * This component is extracted for reusability and testing purposes.
 * It displays the expanded list of fishing records within a marker group.
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Fish, X } from 'lucide-react';
import type { FishingMarkerData } from './types';
import styles from './StackedMarkerCard.module.css';

/**
 * Props for MarkerList component
 */
export interface MarkerListProps {
  /** Time label for the list */
  time: string;
  /** Fishing records to display */
  records: FishingMarkerData[];
  /** Theme mode */
  theme?: 'light' | 'dark' | 'high-contrast';
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Callback when a record is clicked */
  onRecordClick?: (record: FishingMarkerData) => void;
  /** Maximum visible records (shows "+N more" if exceeded) */
  maxVisibleRecords?: number;
  /** Additional CSS class */
  className?: string;
  /** Test ID */
  testId?: string;
}

/**
 * MarkerList - Expanded list of fishing records
 */
export const MarkerList = React.memo<MarkerListProps>(
  ({
    time,
    records,
    theme = 'light',
    onClose,
    onRecordClick,
    maxVisibleRecords = 5,
    className,
    testId,
  }) => {
    const listRef = useRef<HTMLDivElement>(null);
    const firstRecordRef = useRef<HTMLButtonElement>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);

    const displayRecords = records.slice(0, maxVisibleRecords);
    const hiddenCount = records.length - displayRecords.length;

    // Generate CSS classes
    const listClasses = [
      styles.listContainer,
      theme === 'dark' && styles.listContainerDark,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // Handle record click
    const handleRecordClick = useCallback(
      (record: FishingMarkerData) => {
        onRecordClick?.(record);
      },
      [onRecordClick]
    );

    // Handle close
    const handleClose = useCallback(() => {
      onClose?.();
    }, [onClose]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setFocusedIndex((prev) =>
              prev < displayRecords.length - 1 ? prev + 1 : prev
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
            break;
          case 'Home':
            e.preventDefault();
            setFocusedIndex(0);
            break;
          case 'End':
            e.preventDefault();
            setFocusedIndex(displayRecords.length - 1);
            break;
          case 'Enter':
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < displayRecords.length) {
              handleRecordClick(displayRecords[focusedIndex]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            handleClose();
            break;
        }
      },
      [displayRecords, focusedIndex, handleRecordClick, handleClose]
    );

    // Focus first record on mount
    useEffect(() => {
      if (firstRecordRef.current) {
        firstRecordRef.current.focus();
      }
    }, []);

    return (
      <div
        ref={listRef}
        className={listClasses}
        role="listbox"
        aria-label={`Fishing records at ${time}`}
        onKeyDown={handleKeyDown}
        data-testid={testId || 'marker-list'}
      >
        {/* Close Button */}
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close record list"
          type="button"
        >
          <X size={16} aria-hidden="true" />
        </button>

        {/* Header */}
        <div className={styles.listHeader}>
          <Fish size={16} className={styles.icon} aria-hidden="true" />
          <h3 className={styles.listTitle}>Catches</h3>
          <span className={styles.listCount}>({records.length})</span>
        </div>

        {/* Record List */}
        {displayRecords.map((record, index) => (
          <button
            key={record.id}
            ref={index === 0 ? firstRecordRef : undefined}
            className={styles.recordItem}
            onClick={() => handleRecordClick(record)}
            role="option"
            aria-selected={focusedIndex === index}
            tabIndex={focusedIndex === index ? 0 : -1}
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

        {/* Hidden count indicator */}
        {hiddenCount > 0 && (
          <div
            className={styles.recordItem}
            style={{ justifyContent: 'center', opacity: 0.7 }}
          >
            <span>+{hiddenCount} more...</span>
          </div>
        )}
      </div>
    );
  }
);

MarkerList.displayName = 'MarkerList';
