/**
 * Skeletonコンポーネントの単体テスト
 *
 * @description
 * スケルトンローディングコンポーネントのテストスイート
 * prefers-reduced-motion対応とアクセシビリティを検証
 *
 * @version 1.0.0
 * @since 2025-12-03 Issue #327
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import {
  Skeleton,
  SkeletonRecordCard,
  SkeletonPhotoCard,
  SkeletonList,
  SkeletonText,
  SkeletonPhotoHeroCard,
} from '../ui/Skeleton';

describe('Skeleton', () => {
  beforeEach(async () => {
    // CI環境でのJSDOM初期化待機
    if (process.env.CI) {
      await waitFor(
        () => {
          if (!document.body || document.body.children.length === 0) {
            throw new Error('JSDOM not ready');
          }
        },
        { timeout: 5000, interval: 100 }
      );
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });

  afterEach(() => {
    // CI環境ではroot containerを保持
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  describe('Skeleton Base Component', () => {
    it('renders with skeleton class', () => {
      const { container } = render(<Skeleton />);
      expect(container.querySelector('.skeleton')).toBeInTheDocument();
    });

    it('applies default dimensions', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toHaveStyle({ width: '100%', height: '20px' });
    });

    it('applies custom dimensions', () => {
      const { container } = render(<Skeleton width="200px" height="40px" />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toHaveStyle({ width: '200px', height: '40px' });
    });

    it('applies circle shape when circle prop is true', () => {
      const { container } = render(<Skeleton circle height="50px" />);
      const skeleton = container.querySelector('.skeleton');
      // Circle uses height for both width and height
      expect(skeleton).toHaveStyle({ width: '50px', height: '50px', borderRadius: '50%' });
    });

    it('applies custom borderRadius', () => {
      const { container } = render(<Skeleton borderRadius="8px" />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toHaveStyle({ borderRadius: '8px' });
    });

    it('applies skeleton--no-animation class when noAnimation is true', () => {
      const { container } = render(<Skeleton noAnimation />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toHaveClass('skeleton--no-animation');
    });

    it('does not apply skeleton--no-animation class when noAnimation is false', () => {
      const { container } = render(<Skeleton noAnimation={false} />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).not.toHaveClass('skeleton--no-animation');
    });

    it('applies custom className', () => {
      const { container } = render(<Skeleton className="custom-skeleton" />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toHaveClass('custom-skeleton');
    });

    it('applies custom style', () => {
      const { container } = render(<Skeleton style={{ marginTop: '10px' }} />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toHaveStyle({ marginTop: '10px' });
    });

    it('has aria-hidden="true" for accessibility', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });

    it('has role="presentation" for accessibility', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toHaveAttribute('role', 'presentation');
    });
  });

  describe('SkeletonRecordCard', () => {
    it('renders with correct structure', () => {
      const { container } = render(<SkeletonRecordCard />);
      const skeletons = container.querySelectorAll('.skeleton');
      // Thumbnail + 3 text lines + badge = 5 skeletons
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });

    it('has aria-hidden="true" for accessibility', () => {
      const { container } = render(<SkeletonRecordCard />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('aria-hidden', 'true');
    });

    it('has role="presentation" for accessibility', () => {
      const { container } = render(<SkeletonRecordCard />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('role', 'presentation');
    });
  });

  describe('SkeletonPhotoCard', () => {
    it('renders with correct structure', () => {
      const { container } = render(<SkeletonPhotoCard />);
      const skeletons = container.querySelectorAll('.skeleton');
      // Photo + badges + text overlay = 5 skeletons
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });

    it('has aria-hidden="true" for accessibility', () => {
      const { container } = render(<SkeletonPhotoCard />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('aria-hidden', 'true');
    });

    it('has role="presentation" for accessibility', () => {
      const { container } = render(<SkeletonPhotoCard />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('role', 'presentation');
    });
  });

  describe('SkeletonList', () => {
    it('renders default count of 3 cards', () => {
      const { container } = render(<SkeletonList />);
      // Count direct children of the list container (each card is a direct child)
      const list = container.firstChild as HTMLElement;
      expect(list.children.length).toBe(3);
    });

    it('renders custom count of cards', () => {
      const { container } = render(<SkeletonList count={5} />);
      const list = container.firstChild as HTMLElement;
      expect(list.children.length).toBe(5);
    });

    it('renders photo cards when cardType is "photo"', () => {
      const { container } = render(<SkeletonList cardType="photo" count={2} />);
      const list = container.firstChild as HTMLElement;
      expect(list.children.length).toBe(2);
    });

    it('applies custom gap', () => {
      const { container } = render(<SkeletonList gap="20px" />);
      const list = container.firstChild as HTMLElement;
      expect(list).toHaveStyle({ gap: '20px' });
    });
  });

  describe('SkeletonText', () => {
    it('renders default 3 lines', () => {
      const { container } = render(<SkeletonText />);
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBe(3);
    });

    it('renders custom number of lines', () => {
      const { container } = render(<SkeletonText lines={5} />);
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBe(5);
    });

    it('applies 60% width to last line', () => {
      const { container } = render(<SkeletonText lines={3} />);
      const skeletons = container.querySelectorAll('.skeleton');
      const lastLine = skeletons[skeletons.length - 1];
      expect(lastLine).toHaveStyle({ width: '60%' });
    });

    it('applies custom gap', () => {
      const { container } = render(<SkeletonText gap="12px" />);
      const list = container.firstChild as HTMLElement;
      expect(list).toHaveStyle({ gap: '12px' });
    });
  });

  describe('SkeletonPhotoHeroCard', () => {
    it('renders with skeleton class', () => {
      const { container } = render(<SkeletonPhotoHeroCard />);
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders with skeleton-photo-hero-card class', () => {
      const { container } = render(<SkeletonPhotoHeroCard />);
      expect(container.querySelector('.skeleton-photo-hero-card')).toBeInTheDocument();
    });

    it('applies default variant class', () => {
      const { container } = render(<SkeletonPhotoHeroCard />);
      expect(
        container.querySelector('.skeleton-photo-hero-card--default')
      ).toBeInTheDocument();
    });

    it('applies grid variant class', () => {
      const { container } = render(<SkeletonPhotoHeroCard variant="grid" />);
      expect(container.querySelector('.skeleton-photo-hero-card--grid')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<SkeletonPhotoHeroCard className="custom-class" />);
      expect(container.querySelector('.skeleton-photo-hero-card')).toHaveClass('custom-class');
    });

    it('has aria-hidden="true" for accessibility', () => {
      const { container } = render(<SkeletonPhotoHeroCard />);
      const card = container.querySelector('.skeleton-photo-hero-card');
      expect(card).toHaveAttribute('aria-hidden', 'true');
    });

    it('has role="presentation" for accessibility', () => {
      const { container } = render(<SkeletonPhotoHeroCard />);
      const card = container.querySelector('.skeleton-photo-hero-card');
      expect(card).toHaveAttribute('role', 'presentation');
    });
  });

  describe('CSS Classes for Animation Control', () => {
    it('skeleton class should exist for pulse animation', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toBeInTheDocument();
      // Class-based animation is controlled by CSS
      expect(skeleton?.className).toContain('skeleton');
    });

    it('skeleton--no-animation class disables animation', () => {
      const { container } = render(<Skeleton noAnimation />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton?.className).toContain('skeleton--no-animation');
    });

    it('maintains skeleton class even with noAnimation', () => {
      const { container } = render(<Skeleton noAnimation />);
      const skeleton = container.querySelector('.skeleton');
      // Both classes should be present
      expect(skeleton).toHaveClass('skeleton');
      expect(skeleton).toHaveClass('skeleton--no-animation');
    });
  });

  describe('Re-export from Skeleton.tsx', () => {
    it('exports SkeletonPhotoHeroCard from main Skeleton module', () => {
      // This test verifies the re-export works
      expect(SkeletonPhotoHeroCard).toBeDefined();
      const { container } = render(<SkeletonPhotoHeroCard />);
      expect(container.querySelector('.skeleton-photo-hero-card')).toBeInTheDocument();
    });
  });
});
