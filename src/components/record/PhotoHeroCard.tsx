/**
 * PhotoHeroCard - Photo-first card component with Glass Morphism overlay
 *
 * Features:
 * - 2-layer photo structure (blurred background + original foreground)
 * - Glass Morphism badges and panels for information overlay
 * - Responsive design (mobile/tablet/desktop)
 * - Accessibility compliant (WCAG 2.1 AA)
 * - Reduced motion support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Calendar, Trophy, AlertCircle, RefreshCw, Fish } from 'lucide-react';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassPanel } from '../ui/GlassPanel';
import { SkeletonPhotoHeroCard } from '../ui/SkeletonPhotoHeroCard';
import { photoService } from '../../lib/photo-service';
import { logger } from '../../lib/errors/logger';
import type { FishingRecord } from '../../types';
import './PhotoHeroCard.css';

export interface PhotoHeroCardProps {
  /** Fishing record data */
  record: FishingRecord;
  /** Click handler */
  onClick?: (record: FishingRecord) => void;
  /** Whether this is a "best catch" record */
  isBestCatch?: boolean;
  /** Loading state - shows skeleton */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Layout variant: default (full width) or grid (square aspect ratio) */
  variant?: 'default' | 'grid';
}

/**
 * Format date for display
 */
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Format size with unit
 */
const formatSize = (size?: number): string | null => {
  if (size === undefined || size === null) return null;
  return `${size}cm`;
};

/**
 * Format weight with unit
 */
const formatWeight = (weight?: number): string | null => {
  if (weight === undefined || weight === null) return null;
  return `${weight}kg`;
};

export const PhotoHeroCard: React.FC<PhotoHeroCardProps> = ({
  record,
  onClick,
  isBestCatch = false,
  loading = false,
  className = '',
  variant = 'default',
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Load photo data
  const loadPhoto = useCallback(async () => {
    if (!record.photoId) return;

    setImageError(false);
    setImageLoaded(false);

    try {
      const result = await photoService.getPhotoDataUrl(record.photoId, false);
      if (result.success && result.data) {
        setPhotoUrl(result.data);
      } else {
        setImageError(true);
        logger.error('Photo load failed', { photoId: record.photoId, error: result.error });
      }
    } catch (error) {
      setImageError(true);
      logger.error('Photo load error', { error });
    }
  }, [record.photoId]);

  useEffect(() => {
    let isMounted = true;

    if (record.photoId) {
      loadPhoto().then(() => {
        if (!isMounted) return;
      });
    }

    return () => {
      isMounted = false;
    };
  }, [record.photoId, loadPhoto]);

  // Retry handler for photo loading errors
  const handleRetry = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsRetrying(true);
      await loadPhoto();
      setIsRetrying(false);
    },
    [loadPhoto]
  );

  // Click handler
  const handleClick = useCallback(() => {
    onClick?.(record);
  }, [onClick, record]);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(record);
      }
    },
    [onClick, record]
  );

  // Image handlers
  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  // Show skeleton during loading state
  if (loading) {
    return <SkeletonPhotoHeroCard variant={variant} className={className} />;
  }

  const hasPhoto = record.photoId && photoUrl && !imageError;
  const showErrorState = record.photoId && imageError;
  const sizeText = formatSize(record.size);
  const weightText = formatWeight(record.weight);
  const dateText = formatDate(record.date);

  // Generate alt text for the photo
  const photoAltText = `${record.fishSpecies}${sizeText ? ` ${sizeText}` : ''}`;

  return (
    <div
      className={`photo-hero-card photo-hero-card--${variant} ${isBestCatch ? 'photo-hero-card--best-catch' : ''} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${record.fishSpecies}${sizeText ? ` ${sizeText}` : ''} at ${record.location}`}
    >
      {/* Photo Container */}
      <div className="photo-hero-card__photo-container">
        {hasPhoto ? (
          <>
            {/* Background Layer: Blurred photo for visual effect */}
            <div className="photo-hero-card__photo-background" aria-hidden="true">
              <img
                src={photoUrl}
                alt=""
                loading="lazy"
                onError={handleImageError}
              />
            </div>
            {/* Foreground Layer: Original photo */}
            <div className="photo-hero-card__photo-foreground">
              <img
                src={photoUrl}
                alt={photoAltText}
                onError={handleImageError}
                onLoad={handleImageLoad}
                className={imageLoaded ? 'loaded' : ''}
              />
            </div>
          </>
        ) : showErrorState ? (
          /* Error State: Photo load failed */
          <div className="photo-hero-card__error-state" role="alert">
            <AlertCircle size={48} aria-hidden="true" />
            <p>Photo failed to load</p>
            <button
              type="button"
              className="photo-hero-card__retry-button"
              onClick={handleRetry}
              disabled={isRetrying}
              aria-label="Retry loading photo"
            >
              <RefreshCw size={16} className={isRetrying ? 'spinning' : ''} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        ) : (
          /* Placeholder: No photo available */
          /* TODO: Replace with FishIcon component after #321 is completed */
          <div
            className="photo-hero-card__placeholder"
            role="img"
            aria-label={`No photo - ${record.fishSpecies} placeholder`}
          >
            <div className="photo-hero-card__placeholder-content">
              <Fish size={64} aria-hidden="true" />
              <span className="photo-hero-card__placeholder-text">No Photo</span>
            </div>
          </div>
        )}
      </div>

      {/* Overlay: Badges */}
      <div className="photo-hero-card__badges">
        <div className="photo-hero-card__badges-left">
          <GlassBadge
            variant="species"
            icon={<Fish size={16} />}
            className="photo-hero-card__species-badge"
          >
            {record.fishSpecies}
          </GlassBadge>
        </div>
        <div className="photo-hero-card__badges-right">
          {sizeText && (
            <GlassBadge variant="size" className="photo-hero-card__size-badge">
              {sizeText}
            </GlassBadge>
          )}
          {weightText && (
            <GlassBadge variant="size" className="photo-hero-card__weight-badge">
              {weightText}
            </GlassBadge>
          )}
          {isBestCatch && (
            <GlassBadge variant="default" className="photo-hero-card__best-catch-badge">
              <Trophy size={14} aria-hidden="true" />
              <span>Best</span>
            </GlassBadge>
          )}
        </div>
      </div>

      {/* Overlay: Info Panel */}
      <GlassPanel position="bottom-left" className="photo-hero-card__info-panel">
        <div className="photo-hero-card__info">
          <span className="photo-hero-card__location" title={record.location}>
            <MapPin size={14} aria-hidden="true" />
            <span className="photo-hero-card__location-text">{record.location}</span>
          </span>
          <span className="photo-hero-card__date">
            <Calendar size={14} aria-hidden="true" />
            <span>{dateText}</span>
          </span>
        </div>
      </GlassPanel>
    </div>
  );
};

PhotoHeroCard.displayName = 'PhotoHeroCard';

export default PhotoHeroCard;
