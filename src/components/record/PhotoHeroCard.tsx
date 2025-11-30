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
import { MapPin, Calendar, Trophy, AlertCircle, RefreshCw, Fish, Ruler, Scale } from 'lucide-react';
import { LineChart, Line, ReferenceDot, XAxis, YAxis } from 'recharts';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassPanel } from '../ui/GlassPanel';
import { SkeletonPhotoHeroCard } from '../ui/SkeletonPhotoHeroCard';
import { FishIcon } from '../ui/FishIcon';
import type { TideChartData } from '../chart/tide/types';
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
  /** Tide chart data for overlay (detail view only) */
  tideChartData?: TideChartData[];
  /** Fishing time for tide chart marker (format: "HH:mm") */
  fishingTime?: string;
  /** Whether tide data is loading */
  tideLoading?: boolean;
}

/**
 * Format date for display based on context variant
 * - grid: Compact format "5/5 09:35"
 * - default: Medium format "5月5日(月) 09:35"
 */
const formatDate = (date: Date, variant: 'default' | 'grid'): string => {
  if (variant === 'grid') {
    // Compact format for grid: "5/5 09:35"
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  }
  // Medium format for default: "5月5日(月) 09:35"
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
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

/**
 * CompactTideChart - Compact tide chart for PhotoHeroCard overlay
 * Uses Recharts directly with minimal margin for 180x100px display
 */
interface CompactTideChartProps {
  data: TideChartData[];
  fishingTime?: string;
}

const CompactTideChart: React.FC<CompactTideChartProps> = ({ data, fishingTime }) => {
  // Find fishing time marker position
  const fishingMarker = fishingTime
    ? data.find((point) => point.time === fishingTime)
    : undefined;

  return (
    <LineChart
      data={data}
      width={180}
      height={100}
      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
    >
      {/* Hidden axes required for ReferenceDot positioning */}
      <XAxis dataKey="time" hide />
      <YAxis dataKey="tide" hide domain={['dataMin', 'dataMax']} />
      {/* Tide curve - blue smooth line */}
      <Line
        type="basis"
        dataKey="tide"
        stroke="#60a5fa"
        strokeWidth={2}
        dot={false}
        activeDot={false}
        isAnimationActive={false}
      />
      {/* Fishing time marker - orange dot */}
      {fishingMarker && (
        <ReferenceDot
          x={fishingMarker.time}
          y={fishingMarker.tide}
          r={4}
          fill="#fb923c"
          stroke="#fff"
          strokeWidth={1}
        />
      )}
    </LineChart>
  );
};

export const PhotoHeroCard: React.FC<PhotoHeroCardProps> = ({
  record,
  onClick,
  isBestCatch = false,
  loading = false,
  className = '',
  variant = 'default',
  tideChartData,
  fishingTime,
  tideLoading = false,
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
  const dateText = formatDate(record.date, variant);

  // Generate alt text for the photo
  const photoAltText = `${record.fishSpecies}${sizeText ? ` ${sizeText}` : ''}`;

  return (
    <div
      className={`photo-hero-card photo-hero-card--${variant} ${isBestCatch ? 'photo-hero-card--best-catch' : ''} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${record.fishSpecies}${sizeText ? ` ${sizeText}` : ''} ${record.location}にて`}
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
            <p>写真の読み込みに失敗しました</p>
            <button
              type="button"
              className="photo-hero-card__retry-button"
              onClick={handleRetry}
              disabled={isRetrying}
              aria-label="写真の読み込みを再試行"
            >
              <RefreshCw size={16} className={isRetrying ? 'spinning' : ''} />
              {isRetrying ? '再試行中...' : '再試行'}
            </button>
          </div>
        ) : (
          /* Placeholder: No photo available - using FishIcon with species-specific colors */
          <FishIcon
            species={record.fishSpecies}
            size={variant === 'grid' ? 64 : 80}
            className="photo-hero-card__fish-icon"
            data-testid="photo-hero-card-fish-icon"
            aria-hidden={true} /* PhotoHeroCard自体にaria-labelがあるため装飾的 */
          />
        )}
      </div>

      {/* Overlay: Unified Info Panel (top-left) */}
      <GlassPanel position="top-left" className="photo-hero-card__info-panel">
        <div className="photo-hero-card__info-unified">
          <div className="photo-hero-card__info-row">
            <Calendar size={14} aria-hidden="true" />
            <span>{dateText}</span>
          </div>
          <div className="photo-hero-card__info-row">
            <Fish size={14} aria-hidden="true" />
            <span className="photo-hero-card__species-text">{record.fishSpecies}</span>
          </div>
          {(sizeText || weightText) && (
            <div className="photo-hero-card__info-row photo-hero-card__measurements">
              {sizeText && (
                <span className="photo-hero-card__measurement">
                  <Ruler size={14} aria-hidden="true" />
                  <span>{sizeText}</span>
                </span>
              )}
              {weightText && (
                <span className="photo-hero-card__measurement">
                  <Scale size={14} aria-hidden="true" />
                  <span>{weightText}</span>
                </span>
              )}
            </div>
          )}
          <div className="photo-hero-card__info-row">
            <MapPin size={14} aria-hidden="true" />
            <span className="photo-hero-card__location-text" title={record.location}>{record.location}</span>
          </div>
        </div>
      </GlassPanel>

      {/* Top-right area: Tide Chart and/or Best Badge (only render when there's content) */}
      {(tideChartData || tideLoading || isBestCatch) && (
        <div className="photo-hero-card__top-right">
          {/* Compact Tide Chart Overlay (detail view only) */}
          {tideChartData && tideChartData.length > 0 && (
            <div
              className="photo-hero-card__tide-chart-overlay"
              aria-label="潮汐グラフ"
              data-testid="photo-hero-card-tide-chart"
            >
              <CompactTideChart data={tideChartData} fishingTime={fishingTime} />
            </div>
          )}
          {/* Tide Loading Indicator */}
          {tideLoading && !tideChartData && (
            <div
              className="photo-hero-card__tide-loading"
              aria-label="潮汐データ読み込み中"
              data-testid="photo-hero-card-tide-loading"
            >
              <div className="photo-hero-card__tide-loading-spinner" />
            </div>
          )}
          {/* Best Catch Badge */}
          {isBestCatch && (
            <GlassBadge variant="default" className="photo-hero-card__best-catch-badge">
              <Trophy size={14} aria-hidden="true" />
              <span>Best</span>
            </GlassBadge>
          )}
        </div>
      )}
    </div>
  );
};

PhotoHeroCard.displayName = 'PhotoHeroCard';

export default PhotoHeroCard;
