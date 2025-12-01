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

    it('renders unified info panel with fish species, size, and weight', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecord} />);

      await waitFor(() => {
        // Check unified info panel contains all information (query within glass layer only)
        const glassLayer = container.querySelector('.glass-panel-glass');
        const speciesText = glassLayer?.querySelector('.photo-hero-card__species-text');
        expect(speciesText).toHaveTextContent('Seabass');

        // Check measurements
        const measurements = glassLayer?.querySelectorAll('.photo-hero-card__measurement');
        expect(measurements?.length).toBe(2);
        expect(measurements?.[0]).toHaveTextContent('60cm');
        expect(measurements?.[1]).toHaveTextContent('3.5kg');
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
        // Best catch badge is now inside top-right area
        const bestCatchBadge = container.querySelector('.photo-hero-card__best-catch-badge');
        expect(bestCatchBadge).toBeInTheDocument();
        // Query within glass layer to avoid duplicate text from shadow layer
        const glassLayer = bestCatchBadge?.querySelector('.glass-badge-glass');
        expect(glassLayer).toHaveTextContent('Best');
      });

      expect(container.querySelector('.photo-hero-card--best-catch')).toBeInTheDocument();
    });

    it('does not render size measurement when size is undefined', async () => {
      const recordNoSize = { ...mockRecord, size: undefined };
      const { container } = render(<PhotoHeroCard record={recordNoSize} />);

      await waitFor(() => {
        const speciesText = container.querySelector('.photo-hero-card__species-text');
        expect(speciesText).toHaveTextContent('Seabass');

        // Only weight measurement should exist (query within glass layer only, not shadow)
        const glassLayer = container.querySelector('.glass-panel-glass');
        const measurements = glassLayer?.querySelectorAll('.photo-hero-card__measurement');
        expect(measurements?.length).toBe(1);
        expect(measurements?.[0]).toHaveTextContent('3.5kg');
      });
    });

    it('does not render weight measurement when weight is undefined', async () => {
      const recordNoWeight = { ...mockRecord, weight: undefined };
      const { container } = render(<PhotoHeroCard record={recordNoWeight} />);

      await waitFor(() => {
        const speciesText = container.querySelector('.photo-hero-card__species-text');
        expect(speciesText).toHaveTextContent('Seabass');

        // Only size measurement should exist (query within glass layer only, not shadow)
        const glassLayer = container.querySelector('.glass-panel-glass');
        const measurements = glassLayer?.querySelectorAll('.photo-hero-card__measurement');
        expect(measurements?.length).toBe(1);
        expect(measurements?.[0]).toHaveTextContent('60cm');
      });
    });

    it('renders "0cm" when size is 0', async () => {
      const recordZeroSize = { ...mockRecord, size: 0 };
      const { container } = render(<PhotoHeroCard record={recordZeroSize} />);

      await waitFor(() => {
        const glassLayer = container.querySelector('.glass-panel-glass');
        const measurements = glassLayer?.querySelectorAll('.photo-hero-card__measurement');
        expect(measurements?.[0]).toHaveTextContent('0cm');
      });
    });

    it('renders "0kg" when weight is 0', async () => {
      const recordZeroWeight = { ...mockRecord, weight: 0 };
      const { container } = render(<PhotoHeroCard record={recordZeroWeight} />);

      await waitFor(() => {
        const glassLayer = container.querySelector('.glass-panel-glass');
        const measurements = glassLayer?.querySelectorAll('.photo-hero-card__measurement');
        expect(measurements?.[1]).toHaveTextContent('0kg');
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

  describe('Placeholder State (FishIcon)', () => {
    it('renders FishIcon when photoId is undefined', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecordWithoutPhoto} />);

      await waitFor(() => {
        // FishIcon should be rendered with the fish-icon class
        expect(container.querySelector('.photo-hero-card__fish-icon')).toBeInTheDocument();
      });

      // Check FishIcon has data-testid
      const fishIcon = container.querySelector('[data-testid="photo-hero-card-fish-icon"]');
      expect(fishIcon).toBeInTheDocument();
    });

    it('FishIcon is aria-hidden since card itself has aria-label', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecordWithoutPhoto} />);

      await waitFor(() => {
        const fishIcon = container.querySelector('.fish-icon-container');
        // FishIcon is decorative within PhotoHeroCard (card has its own aria-label)
        expect(fishIcon).toHaveAttribute('aria-hidden', 'true');
        expect(fishIcon).not.toHaveAttribute('role');
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

      expect(screen.getByText('写真の読み込みに失敗しました')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /再試行/i })).toBeInTheDocument();
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
        expect(screen.getByRole('button', { name: /再試行/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /再試行/i });
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
        const speciesText = container.querySelector('.photo-hero-card__species-text');
        expect(speciesText).toHaveTextContent('Very Long Fish Species Name That Should Be Truncated');
      });
    });

    it('sets title attribute on location for tooltip', async () => {
      const { container } = render(<PhotoHeroCard record={mockRecordWithLongText} />);

      await waitFor(() => {
        const locationElement = container.querySelector('.photo-hero-card__location-text');
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
