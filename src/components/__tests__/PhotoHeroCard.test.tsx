/**
 * PhotoHeroCard Component Tests
 *
 * Tests for the photo-first card component including:
 * - Rendering states (photo, placeholder, error, loading)
 * - User interactions (click, keyboard)
 * - Accessibility compliance
 * - Responsive variants
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoHeroCard } from '../record/PhotoHeroCard';
import { photoService } from '../../lib/photo-service';
import type { FishingRecord } from '../../types';

// Mock the photo service
vi.mock('../../lib/photo-service', () => ({
  photoService: {
    getPhotoDataUrl: vi.fn(),
  },
}));

// Mock the logger
vi.mock('../../lib/errors/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Test data
const mockRecord: FishingRecord = {
  id: 'test-id-1',
  fishSpecies: 'Seabass',
  size: 60,
  weight: 3.5,
  location: 'Tokyo Bay',
  date: new Date('2025-01-15'),
  photoId: 'photo-1',
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-15'),
};

const mockRecordWithoutPhoto: FishingRecord = {
  ...mockRecord,
  id: 'test-id-2',
  photoId: undefined,
};

const mockRecordWithLongText: FishingRecord = {
  ...mockRecord,
  id: 'test-id-3',
  fishSpecies: 'Very Long Fish Species Name That Should Be Truncated',
  location: 'A Very Long Location Name',
};

const mockPhotoDataUrl = 'data:image/jpeg;base64,/9j/fake-photo-data';

/**
 * Helper to find text in Glass Layer (not Shadow Layer)
 * GlassBadge uses 2-layer structure, so text appears twice
 */
const findGlassLayerText = (container: HTMLElement, text: string): HTMLElement | null => {
  const glassLayers = container.querySelectorAll('.glass-badge-glass .glass-badge-text');
  for (const layer of glassLayers) {
    if (layer.textContent === text) {
      return layer as HTMLElement;
    }
  }
  return null;
};

describe('PhotoHeroCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation for successful photo load
    vi.mocked(photoService.getPhotoDataUrl).mockResolvedValue({
      success: true,
      data: mockPhotoDataUrl,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders with photo in 2-layer structure', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        expect(photoService.getPhotoDataUrl).toHaveBeenCalledWith(mockRecord.photoId, false);
      });

      // Check for 2-layer photo structure
      const background = container.querySelector('.photo-hero-card__photo-background');
      const foreground = container.querySelector('.photo-hero-card__photo-foreground');

      expect(background).toBeInTheDocument();
      expect(foreground).toBeInTheDocument();
    });

    it('renders GlassBadges with fish species and size', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        // Use helper to find text in glass layer (not shadow layer)
        expect(findGlassLayerText(container, 'Seabass')).toBeInTheDocument();
        expect(findGlassLayerText(container, '60cm')).toBeInTheDocument();
        expect(findGlassLayerText(container, '3.5kg')).toBeInTheDocument();
      });
    });

    it('renders GlassPanel with location and date', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        // Find info panel content
        const infoPanel = container.querySelector('.photo-hero-card__info-panel');
        expect(infoPanel).toBeInTheDocument();

        // Check location text
        const locationText = container.querySelector('.photo-hero-card__location-text');
        expect(locationText).toHaveTextContent('Tokyo Bay');
      });
    });

    it('renders best catch badge when isBestCatch is true', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} isBestCatch />);

      await waitFor(() => {
        expect(findGlassLayerText(container, 'Best')).toBeInTheDocument();
      });

      expect(container.querySelector('.photo-hero-card--best-catch')).toBeInTheDocument();
    });

    it('does not render size badge when size is undefined', async () => {
      const recordNoSize = { ...mockRecord, size: undefined };
      const { container } = render(<PhotoHeroCard record={recordNoSize} />);

      await waitFor(() => {
        expect(findGlassLayerText(container, 'Seabass')).toBeInTheDocument();
      });

      // No size badge should exist
      expect(container.querySelector('.photo-hero-card__size-badge')).not.toBeInTheDocument();
    });

    it('does not render weight badge when weight is undefined', async () => {
      const recordNoWeight = { ...mockRecord, weight: undefined };
      const { container } = render(<PhotoHeroCard record={recordNoWeight} />);

      await waitFor(() => {
        expect(findGlassLayerText(container, 'Seabass')).toBeInTheDocument();
      });

      // No weight badge should exist
      expect(container.querySelector('.photo-hero-card__weight-badge')).not.toBeInTheDocument();
    });

    it('renders "0cm" when size is 0', async () => {
      const recordZeroSize = { ...mockRecord, size: 0 };
      const { container } = render(<PhotoHeroCard record={recordZeroSize} />);

      await waitFor(() => {
        expect(findGlassLayerText(container, '0cm')).toBeInTheDocument();
      });
    });

    it('renders "0kg" when weight is 0', async () => {
      const recordZeroWeight = { ...mockRecord, weight: 0 };
      const { container } = render(<PhotoHeroCard record={recordZeroWeight} />);

      await waitFor(() => {
        expect(findGlassLayerText(container, '0kg')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('renders SkeletonPhotoHeroCard when loading is true', () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} loading />);

      expect(container.querySelector('.skeleton-photo-hero-card')).toBeInTheDocument();
      expect(container.querySelector('.photo-hero-card')).not.toBeInTheDocument();
    });
  });

  describe('Placeholder State', () => {
    it('renders placeholder when photoId is undefined', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecordWithoutPhoto} />);

      await waitFor(() => {
        expect(container.querySelector('.photo-hero-card__placeholder')).toBeInTheDocument();
      });

      // Check for accessible label
      const placeholder = container.querySelector('.photo-hero-card__placeholder');
      expect(placeholder).toHaveAttribute('aria-label', expect.stringContaining('No photo'));
    });

    it('displays "No Photo" text in placeholder', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecordWithoutPhoto} />);

      await waitFor(() => {
        const placeholderText = container.querySelector('.photo-hero-card__placeholder-text');
        expect(placeholderText).toHaveTextContent('No Photo');
      });
    });
  });

  describe('Error State', () => {
    it('renders error state when photo fails to load', async () => {
      vi.mocked(photoService.getPhotoDataUrl).mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Photo not found' },
      });

      const { container } = render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        expect(container.querySelector('.photo-hero-card__error-state')).toBeInTheDocument();
      });

      expect(screen.getByText('Photo failed to load')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls loadPhoto again when retry button is clicked', async () => {
      vi.mocked(photoService.getPhotoDataUrl)
        .mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Photo not found' },
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockPhotoDataUrl,
        });

      render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(photoService.getPhotoDataUrl).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const handleClick = vi.fn();
      render(<PhotoHeroCard record={mockRecord} onClick={handleClick} />);

      // Wait for photo to load
      await waitFor(() => {
        expect(photoService.getPhotoDataUrl).toHaveBeenCalled();
      });

      const card = screen.getByRole('button');
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledWith(mockRecord);
    });

    it('calls onClick when Enter key is pressed', async () => {
      const handleClick = vi.fn();
      render(<PhotoHeroCard record={mockRecord} onClick={handleClick} />);

      await waitFor(() => {
        expect(photoService.getPhotoDataUrl).toHaveBeenCalled();
      });

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledWith(mockRecord);
    });

    it('calls onClick when Space key is pressed', async () => {
      const handleClick = vi.fn();
      render(<PhotoHeroCard record={mockRecord} onClick={handleClick} />);

      await waitFor(() => {
        expect(photoService.getPhotoDataUrl).toHaveBeenCalled();
      });

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: ' ' });
      expect(handleClick).toHaveBeenCalledWith(mockRecord);
    });

    it('does not call onClick when other keys are pressed', async () => {
      const handleClick = vi.fn();
      render(<PhotoHeroCard record={mockRecord} onClick={handleClick} />);

      await waitFor(() => {
        expect(photoService.getPhotoDataUrl).toHaveBeenCalled();
      });

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Escape' });
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('applies default variant class by default', () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} />);
      expect(container.querySelector('.photo-hero-card--default')).toBeInTheDocument();
    });

    it('applies grid variant class when variant="grid"', () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} variant="grid" />);
      expect(container.querySelector('.photo-hero-card--grid')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has role="button" for interactive card', () => {
      render(<PhotoHeroCard record={mockRecord} onClick={() => {}} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has tabIndex=0 for keyboard navigation', () => {
      render(<PhotoHeroCard record={mockRecord} onClick={() => {}} />);
      expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
    });

    it('has aria-label describing the record', () => {
      render(<PhotoHeroCard record={mockRecord} />);
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Seabass'));
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Tokyo Bay'));
    });

    it('background image has aria-hidden="true"', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        const background = container.querySelector('.photo-hero-card__photo-background');
        expect(background).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('foreground image has meaningful alt text', async () => {
      render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        const foregroundImg = screen.getByAltText(/Seabass/);
        expect(foregroundImg).toBeInTheDocument();
      });
    });

    it('error state has role="alert"', async () => {
      vi.mocked(photoService.getPhotoDataUrl).mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Photo not found' },
      });

      render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Image Loading', () => {
    it('triggers onLoad when image loads successfully', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        const foregroundImg = container.querySelector('.photo-hero-card__photo-foreground img');
        expect(foregroundImg).toBeInTheDocument();
      });

      const foregroundImg = container.querySelector(
        '.photo-hero-card__photo-foreground img'
      ) as HTMLImageElement;
      fireEvent.load(foregroundImg);

      expect(foregroundImg).toHaveClass('loaded');
    });

    it('shows error state when image element fails to load', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        const foregroundImg = container.querySelector('.photo-hero-card__photo-foreground img');
        expect(foregroundImg).toBeInTheDocument();
      });

      const foregroundImg = container.querySelector(
        '.photo-hero-card__photo-foreground img'
      ) as HTMLImageElement;
      fireEvent.error(foregroundImg);

      await waitFor(() => {
        expect(container.querySelector('.photo-hero-card__error-state')).toBeInTheDocument();
      });
    });
  });

  describe('Text Truncation', () => {
    it('renders long species name (CSS handles truncation)', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecordWithLongText} />);

      await waitFor(() => {
        expect(
          findGlassLayerText(container, 'Very Long Fish Species Name That Should Be Truncated')
        ).toBeInTheDocument();
      });
    });

    it('sets title attribute on location for tooltip', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecordWithLongText} />);

      await waitFor(() => {
        const locationElement = container.querySelector('.photo-hero-card__location');
        expect(locationElement).toHaveAttribute('title', mockRecordWithLongText.location);
      });
    });
  });

  describe('Custom className', () => {
    it('applies custom className to the card', () => {
      const { container } = render(
        <PhotoHeroCard record={mockRecord} className="custom-class" />
      );

      expect(container.querySelector('.photo-hero-card.custom-class')).toBeInTheDocument();
    });
  });
});
