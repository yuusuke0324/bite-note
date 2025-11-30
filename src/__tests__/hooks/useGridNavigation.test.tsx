/**
 * useGridNavigation Hook Tests
 *
 * Tests for the grid keyboard navigation hook including:
 * - Arrow key navigation
 * - Home/End key navigation
 * - Edge cases (bounds checking)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useGridNavigation } from '../../hooks/useGridNavigation';

// Mock window.getComputedStyle
const mockGetComputedStyle = vi.fn();

describe('useGridNavigation', () => {
  let container: HTMLDivElement;
  let items: HTMLButtonElement[];

  beforeEach(() => {
    // Create mock container and items
    container = document.createElement('div');
    container.className = 'test-grid';
    document.body.appendChild(container);

    // Create 8 focusable items (2 rows x 4 columns)
    items = [];
    for (let i = 0; i < 8; i++) {
      const item = document.createElement('button');
      item.className = 'grid-item';
      item.textContent = `Item ${i}`;
      container.appendChild(item);
      items.push(item);
    }

    // Mock getComputedStyle to return 4 columns
    mockGetComputedStyle.mockReturnValue({
      getPropertyValue: () => '100px 100px 100px 100px',
    });
    vi.spyOn(window, 'getComputedStyle').mockImplementation(mockGetComputedStyle);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  /**
   * Helper to create a hook with a ref pointing to the container
   */
  const setupHook = () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      return useGridNavigation({
        containerRef: ref as React.RefObject<HTMLDivElement>,
        itemSelector: '.grid-item',
      });
    });
    return result;
  };

  describe('ArrowRight Navigation', () => {
    it('moves focus to the next item', () => {
      const result = setupHook();
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(document.activeElement).toBe(items[1]);
    });

    it('does not move past the last item', () => {
      const result = setupHook();
      items[7].focus(); // Last item

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      // Should still be on last item (preventDefault not called because index is out of bounds)
      expect(document.activeElement).toBe(items[7]);
    });
  });

  describe('ArrowLeft Navigation', () => {
    it('moves focus to the previous item', () => {
      const result = setupHook();
      items[2].focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(document.activeElement).toBe(items[1]);
    });

    it('does not move before the first item', () => {
      const result = setupHook();
      items[0].focus(); // First item

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      // Should still be on first item
      expect(document.activeElement).toBe(items[0]);
    });
  });

  describe('ArrowDown Navigation', () => {
    it('moves focus to the item below (same column)', () => {
      const result = setupHook();
      items[0].focus(); // First item in first row

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(document.activeElement).toBe(items[4]); // First item in second row
    });

    it('does not move below the last row', () => {
      const result = setupHook();
      items[4].focus(); // First item in second (last) row

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      // Should still be on same item
      expect(document.activeElement).toBe(items[4]);
    });
  });

  describe('ArrowUp Navigation', () => {
    it('moves focus to the item above (same column)', () => {
      const result = setupHook();
      items[5].focus(); // Second item in second row

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(document.activeElement).toBe(items[1]); // Second item in first row
    });

    it('does not move above the first row', () => {
      const result = setupHook();
      items[2].focus(); // Third item in first row

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      // Should still be on same item
      expect(document.activeElement).toBe(items[2]);
    });
  });

  describe('Home/End Navigation', () => {
    it('Home key moves focus to the first item', () => {
      const result = setupHook();
      items[5].focus();

      const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(document.activeElement).toBe(items[0]);
    });

    it('End key moves focus to the last item', () => {
      const result = setupHook();
      items[2].focus();

      const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(document.activeElement).toBe(items[7]);
    });
  });

  describe('Other Keys', () => {
    it('does not handle unrelated keys', () => {
      const result = setupHook();
      items[2].focus();

      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      // preventDefault should not be called for Tab
      expect(event.preventDefault).not.toHaveBeenCalled();
      // Focus should remain on the same item
      expect(document.activeElement).toBe(items[2]);
    });

    it('does not handle key when no item is focused', () => {
      const result = setupHook();
      document.body.focus(); // Focus outside the grid

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      // preventDefault should not be called when no item is focused
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty grid (no items)', () => {
      // Remove all items
      items.forEach((item) => container.removeChild(item));
      items = [];

      const result = setupHook();

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      // Should not throw
      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('handles single-column grid', () => {
      // Mock 1 column
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: () => '300px',
      });

      const result = setupHook();
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(document.activeElement).toBe(items[1]);
    });

    it('handles grid with no template columns (fallback to 1 column)', () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: () => 'none',
      });

      const result = setupHook();
      items[0].focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      act(() => {
        result.current.handleKeyDown(event as unknown as React.KeyboardEvent);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(document.activeElement).toBe(items[1]);
    });
  });
});
