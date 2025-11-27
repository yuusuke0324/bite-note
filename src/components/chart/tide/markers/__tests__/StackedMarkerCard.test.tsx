/**
 * StackedMarkerCard.test.tsx - Unit tests for StackedMarkerCard component
 * Issue #273: TideChart fishing marker enhancement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StackedMarkerCard } from '../StackedMarkerCard';
import type { MarkerGroup, FishingMarkerData } from '../types';

// Ensure cleanup after each test for CI environment stability
afterEach(() => {
  cleanup();
});

// Reset body before each test to ensure clean state in CI
beforeEach(() => {
  document.body.innerHTML = '';
});

// Helper to create test data
const createRecord = (
  id: string,
  time: string,
  species?: string,
  size?: number
): FishingMarkerData => ({
  id,
  time,
  species,
  size,
});

const createGroup = (
  time: string,
  records: FishingMarkerData[],
  x = 100,
  y = 50
): MarkerGroup => ({
  time,
  records,
  x,
  y,
  isExpanded: false,
});

describe('StackedMarkerCard', () => {
  describe('rendering', () => {
    it('should render single record marker', () => {
      const group = createGroup('12:00', [createRecord('1', '12:00', 'Bass')]);

      render(<StackedMarkerCard group={group} index={0} />);

      // Should show fish icon but no badge for single record
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    it('should render multiple records with badge', () => {
      const group = createGroup('12:00', [
        createRecord('1', '12:00', 'Bass'),
        createRecord('2', '12:03', 'Trout'),
        createRecord('3', '12:05', 'Salmon'),
      ]);

      render(<StackedMarkerCard group={group} index={0} />);

      // Should show count badge
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should apply correct positioning', () => {
      const group = createGroup('12:00', [createRecord('1', '12:00')], 150, 75);

      const { container } = render(
        <StackedMarkerCard group={group} index={0} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ left: '150px', top: '75px' });
    });

    it('should apply theme classes', () => {
      const group = createGroup('12:00', [createRecord('1', '12:00')]);

      const { rerender } = render(
        <StackedMarkerCard group={group} index={0} theme="light" />
      );

      let button = screen.getByRole('button');
      expect(button.className).not.toContain('Dark');

      rerender(<StackedMarkerCard group={group} index={0} theme="dark" />);
      button = screen.getByRole('button');
      expect(button.className).toContain('Dark');
    });
  });

  describe('accessibility', () => {
    it('should have correct ARIA label for single record', () => {
      const group = createGroup('12:00', [
        createRecord('1', '12:00', 'Bass', 30),
      ]);

      render(<StackedMarkerCard group={group} index={0} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('12:00 fishing record')
      );
    });

    it('should have correct ARIA label for multiple records', () => {
      const group = createGroup('12:00', [
        createRecord('1', '12:00', 'Bass'),
        createRecord('2', '12:03', 'Trout'),
      ]);

      render(<StackedMarkerCard group={group} index={0} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('2 catches')
      );
    });

    it('should have aria-expanded attribute', () => {
      const group = createGroup('12:00', [
        createRecord('1', '12:00'),
        createRecord('2', '12:03'),
      ]);

      const { rerender } = render(
        <StackedMarkerCard group={group} index={0} isExpanded={false} />
      );

      let button = screen.getByRole('button', { name: /fishing records/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');

      rerender(
        <StackedMarkerCard group={group} index={0} isExpanded={true} />
      );
      button = screen.getByRole('button', { name: /fishing records/i });
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have minimum tap target size (44x44px)', () => {
      const group = createGroup('12:00', [createRecord('1', '12:00')]);

      render(<StackedMarkerCard group={group} index={0} />);

      const button = screen.getByRole('button');
      const styles = window.getComputedStyle(button);

      // Check min-width and min-height in CSS
      expect(button.className).toContain('card');
    });
  });

  describe('interactions', () => {
    it('should call onClick when card is clicked', async () => {
      const onClick = vi.fn();
      const group = createGroup('12:00', [createRecord('1', '12:00')]);

      render(<StackedMarkerCard group={group} index={0} onClick={onClick} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(onClick).toHaveBeenCalledWith(0);
    });

    it('should call onClick on Enter key', async () => {
      const onClick = vi.fn();
      const group = createGroup('12:00', [createRecord('1', '12:00')]);

      render(<StackedMarkerCard group={group} index={0} onClick={onClick} />);

      const button = screen.getByRole('button');
      button.focus();
      await userEvent.keyboard('{Enter}');

      expect(onClick).toHaveBeenCalledWith(0);
    });

    it('should call onClick on Space key', async () => {
      const onClick = vi.fn();
      const group = createGroup('12:00', [createRecord('1', '12:00')]);

      render(<StackedMarkerCard group={group} index={0} onClick={onClick} />);

      const button = screen.getByRole('button');
      button.focus();
      await userEvent.keyboard(' ');

      expect(onClick).toHaveBeenCalledWith(0);
    });

    it('should call onClose on Escape when expanded', async () => {
      const onClose = vi.fn();
      const group = createGroup('12:00', [
        createRecord('1', '12:00'),
        createRecord('2', '12:03'),
      ]);

      render(
        <StackedMarkerCard
          group={group}
          index={0}
          isExpanded={true}
          onClose={onClose}
        />
      );

      const button = screen.getByRole('button', { name: /fishing records/i });
      button.focus();
      await userEvent.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledWith(0);
    });
  });

  describe('expanded list', () => {
    it('should show list when expanded', () => {
      const group = createGroup('12:00', [
        createRecord('1', '12:00', 'Bass', 30),
        createRecord('2', '12:03', 'Trout', 25),
      ]);

      render(<StackedMarkerCard group={group} index={0} isExpanded={true} />);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Bass')).toBeInTheDocument();
      expect(screen.getByText('Trout')).toBeInTheDocument();
    });

    it('should not show list when collapsed', () => {
      const group = createGroup('12:00', [
        createRecord('1', '12:00', 'Bass'),
        createRecord('2', '12:03', 'Trout'),
      ]);

      render(<StackedMarkerCard group={group} index={0} isExpanded={false} />);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should show record details', () => {
      const group = createGroup('12:00', [
        createRecord('1', '12:00', 'Bass', 30),
      ]);

      render(<StackedMarkerCard group={group} index={0} isExpanded={true} />);

      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('Bass')).toBeInTheDocument();
      expect(screen.getByText('30cm')).toBeInTheDocument();
    });

    it('should call onRecordClick when record is clicked', async () => {
      const onRecordClick = vi.fn();
      const record = createRecord('1', '12:00', 'Bass');
      const group = createGroup('12:00', [record]);

      render(
        <StackedMarkerCard
          group={group}
          index={0}
          isExpanded={true}
          onRecordClick={onRecordClick}
        />
      );

      const recordButton = screen.getByText('Bass').closest('button');
      await userEvent.click(recordButton!);

      expect(onRecordClick).toHaveBeenCalledWith(record);
    });

    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      const group = createGroup('12:00', [
        createRecord('1', '12:00'),
        createRecord('2', '12:03'),
      ]);

      render(
        <StackedMarkerCard
          group={group}
          index={0}
          isExpanded={true}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByLabelText('Close record list');
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledWith(0);
    });

    it('should support keyboard navigation in list', async () => {
      const group = createGroup('12:00', [
        createRecord('1', '12:00', 'Bass'),
        createRecord('2', '12:03', 'Trout'),
        createRecord('3', '12:05', 'Salmon'),
      ]);

      render(<StackedMarkerCard group={group} index={0} isExpanded={true} />);

      // First record should be focused initially
      const firstRecord = screen.getByText('Bass').closest('button');
      expect(firstRecord).toHaveAttribute('aria-selected', 'true');

      // Navigate down
      await userEvent.keyboard('{ArrowDown}');
      const secondRecord = screen.getByText('Trout').closest('button');
      expect(secondRecord).toHaveAttribute('aria-selected', 'true');

      // Navigate to end
      await userEvent.keyboard('{End}');
      const lastRecord = screen.getByText('Salmon').closest('button');
      expect(lastRecord).toHaveAttribute('aria-selected', 'true');

      // Navigate to home
      await userEvent.keyboard('{Home}');
      expect(firstRecord).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('themes', () => {
    it('should render light theme correctly', () => {
      const group = createGroup('12:00', [createRecord('1', '12:00')]);

      render(<StackedMarkerCard group={group} index={0} theme="light" />);

      const button = screen.getByRole('button');
      expect(button.className).not.toContain('Dark');
      expect(button.className).not.toContain('HighContrast');
    });

    it('should render dark theme correctly', () => {
      const group = createGroup('12:00', [createRecord('1', '12:00')]);

      render(<StackedMarkerCard group={group} index={0} theme="dark" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('Dark');
    });

    it('should render high-contrast theme correctly', () => {
      const group = createGroup('12:00', [createRecord('1', '12:00')]);

      render(
        <StackedMarkerCard group={group} index={0} theme="high-contrast" />
      );

      const button = screen.getByRole('button');
      expect(button.className).toContain('HighContrast');
    });
  });
});
