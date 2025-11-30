/**
 * SkeletonPhotoHeroCard - Loading skeleton for PhotoHeroCard
 *
 * Provides a visual placeholder during photo card loading states.
 * Uses pulse animation to indicate loading progress.
 */

import React from 'react';
import './SkeletonPhotoHeroCard.css';

export interface SkeletonPhotoHeroCardProps {
  /** Layout variant matching PhotoHeroCard */
  variant?: 'default' | 'grid';
  /** Additional CSS classes */
  className?: string;
}

export const SkeletonPhotoHeroCard: React.FC<SkeletonPhotoHeroCardProps> = ({
  variant = 'default',
  className = '',
}) => {
  return (
    <div
      className={`skeleton-photo-hero-card skeleton-photo-hero-card--${variant} ${className}`}
      aria-hidden="true"
      role="presentation"
    >
      {/* Photo skeleton */}
      <div className="skeleton skeleton-photo-hero-card__photo" />

      {/* Badge skeletons */}
      <div className="skeleton-photo-hero-card__badges">
        <div className="skeleton-photo-hero-card__badges-left">
          <div className="skeleton skeleton-photo-hero-card__badge skeleton-photo-hero-card__badge--species" />
        </div>
        <div className="skeleton-photo-hero-card__badges-right">
          <div className="skeleton skeleton-photo-hero-card__badge skeleton-photo-hero-card__badge--size" />
        </div>
      </div>

      {/* Panel skeleton */}
      <div className="skeleton skeleton-photo-hero-card__panel" />
    </div>
  );
};

SkeletonPhotoHeroCard.displayName = 'SkeletonPhotoHeroCard';

export default SkeletonPhotoHeroCard;
