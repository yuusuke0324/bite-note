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
import { MapPin, Calendar, Trophy, AlertCircle, RefreshCw, Fish, Ruler, Scale, Cloud, Thermometer, Waves, Map } from 'lucide-react';
import { LineChart, Line, ReferenceDot, XAxis, YAxis } from 'recharts';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassPanel } from '../ui/GlassPanel';
import { SkeletonPhotoHeroCard } from '../ui/SkeletonPhotoHeroCard';
import { FishIcon } from '../ui/FishIcon';
import { useRipple } from '../../hooks/useRipple';
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
  /** Whether to show "tap to view map" hint (detail view only) */
  showMapHint?: boolean;
  /** Whether to use fullscreen layout (mobile detail view) */
  fullscreen?: boolean;
  /** Whether to use transparent info panel (no background) */
  transparentInfo?: boolean;
  /** Photo fit mode for fullscreen: 'cover' fills screen (may crop), 'contain' shows full photo */
  fitMode?: 'cover' | 'contain';
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
 * Calculate tide name (潮名) from lunar age
 * Based on traditional Japanese tide naming convention
 */
type TideName = '大潮' | '中潮' | '小潮' | '長潮' | '若潮';

const calculateTideName = (date: Date): TideName => {
  // Calculate lunar age (月齢) using a simplified formula
  // Reference: New moon on January 6, 2000 (known synodic month = 29.53059 days)
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
  const synodicMonth = 29.53059; // days
  const daysSinceNewMoon = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const lunarAge = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth;

  // Tide name based on lunar age (rounded to integer)
  const age = Math.round(lunarAge);

  // 大潮: 新月・満月付近 (0-1, 14-16, 28-29)
  if (age <= 1 || (age >= 14 && age <= 16) || age >= 28) return '大潮';
  // 中潮: 大潮と小潮の間 (2-4, 12-13, 17-19, 26-27)
  if ((age >= 2 && age <= 4) || (age >= 12 && age <= 13) ||
      (age >= 17 && age <= 19) || (age >= 26 && age <= 27)) return '中潮';
  // 長潮: 上弦・下弦の翌日 (7, 22)
  if (age === 7 || age === 22) return '長潮';
  // 若潮: 長潮の翌日 (8, 23)
  if (age === 8 || age === 23) return '若潮';
  // 小潮: その他 (5-6, 9-11, 20-21, 24-25)
  return '小潮';
};

/**
 * CompactTideChart - Compact tide chart for PhotoHeroCard overlay
 * Uses Recharts directly with responsive sizing
 * - Mobile (<=768px): 120x53px
 * - Desktop: 180x80px
 */
interface CompactTideChartProps {
  data: TideChartData[];
  fishingTime?: string;
  fishingDate?: Date;
}

const CompactTideChart: React.FC<CompactTideChartProps> = ({ data, fishingTime, fishingDate }) => {
  // Responsive chart size
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const chartWidth = isMobile ? 140 : 180;
  const chartHeight = isMobile ? 65 : 80;

  // Find fishing time marker position
  const fishingMarker = fishingTime
    ? data.find((point) => point.time === fishingTime)
    : undefined;

  // Calculate tide name from fishing date
  const tideName = fishingDate ? calculateTideName(fishingDate) : null;

  return (
    <div className="photo-hero-card__tide-chart-inner">
      {/* Tide name label */}
      {tideName && (
        <div className="photo-hero-card__tide-name">{tideName}</div>
      )}
      <LineChart
        data={data}
        width={chartWidth}
        height={chartHeight}
        margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
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
    </div>
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
  showMapHint = false,
  fullscreen = false,
  transparentInfo = false,
  fitMode = 'cover',
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Ripple effect for card tap
  const { createRipple } = useRipple<HTMLDivElement>({
    color: 'rgba(255, 255, 255, 0.3)',
    duration: 600,
    size: 150,
  });

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

  // Click handler with ripple effect
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      createRipple(e);
      onClick?.(record);
    },
    [onClick, record, createRipple]
  );

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
      className={`photo-hero-card card-hover-effect ${fullscreen ? `photo-hero-card--fullscreen photo-hero-card--fit-${fitMode}` : `photo-hero-card--${variant}`} ${isBestCatch ? 'photo-hero-card--best-catch' : ''} ${transparentInfo ? 'photo-hero-card--transparent-info' : ''} ${className}`}
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
          {/* 1. 日時 */}
          <div className="photo-hero-card__info-row">
            <Calendar size={14} aria-hidden="true" />
            <span>{dateText}</span>
          </div>
          {/* 2. 場所 */}
          <div className="photo-hero-card__info-row">
            <MapPin size={14} aria-hidden="true" />
            <span className="photo-hero-card__location-text" title={record.location}>{record.location}</span>
          </div>
          {/* 3. 天気・水温 */}
          {(record.weather || record.weatherData || record.temperature !== undefined || record.seaTemperature !== undefined) && (
            <div className="photo-hero-card__info-row photo-hero-card__weather-row">
              {(record.weather || record.weatherData?.condition) && (
                <span className="photo-hero-card__weather-item">
                  <Cloud size={14} aria-hidden="true" />
                  <span>{record.weather || record.weatherData?.condition}</span>
                </span>
              )}
              {(record.temperature !== undefined || record.weatherData?.temperature !== undefined) && (
                <span className="photo-hero-card__weather-item">
                  <Thermometer size={14} aria-hidden="true" />
                  <span>{record.temperature ?? record.weatherData?.temperature}°C</span>
                </span>
              )}
              {record.seaTemperature !== undefined && (
                <span className="photo-hero-card__weather-item">
                  <Waves size={14} aria-hidden="true" />
                  <span>{record.seaTemperature}°C</span>
                </span>
              )}
            </div>
          )}
          {/* 4. 魚種 */}
          <div className="photo-hero-card__info-row">
            <Fish size={14} aria-hidden="true" />
            <span className="photo-hero-card__species-text">{record.fishSpecies}</span>
          </div>
          {/* 5. サイズ・重量 */}
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
              <CompactTideChart data={tideChartData} fishingTime={fishingTime} fishingDate={record.date} />
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

      {/* Map Affordance Bar - detail view only */}
      {showMapHint && (
        <div className="photo-hero-card__map-bar" aria-hidden="true">
          <Map size={18} />
          <span>タップして地図を表示</span>
        </div>
      )}
    </div>
  );
};

PhotoHeroCard.displayName = 'PhotoHeroCard';

export default PhotoHeroCard;
