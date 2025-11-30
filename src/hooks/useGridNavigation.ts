/**
 * useGridNavigation - Keyboard navigation hook for grid layouts
 *
 * Provides arrow key navigation within a grid of focusable elements.
 * Automatically adapts to responsive column count.
 */

import { useCallback, type RefObject } from 'react';

interface UseGridNavigationOptions {
  /** Reference to the grid container element */
  containerRef: RefObject<HTMLElement>;
  /** CSS selector for focusable grid items */
  itemSelector: string;
}

interface UseGridNavigationReturn {
  /** Keyboard event handler to attach to the grid container */
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Calculate current column count based on CSS grid computed style
 */
const getColumnCount = (container: HTMLElement): number => {
  const computedStyle = window.getComputedStyle(container);
  const gridTemplateColumns = computedStyle.getPropertyValue('grid-template-columns');

  if (!gridTemplateColumns || gridTemplateColumns === 'none') {
    return 1;
  }

  // Count the number of column values (space-separated)
  const columns = gridTemplateColumns.split(' ').filter((col) => col.trim() !== '');
  return columns.length;
};

/**
 * Get all focusable items within the grid
 */
const getFocusableItems = (container: HTMLElement, selector: string): HTMLElement[] => {
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
};

/**
 * Find the index of the currently focused element
 */
const getCurrentIndex = (items: HTMLElement[]): number => {
  return items.findIndex((item) => item === document.activeElement);
};

export const useGridNavigation = ({
  containerRef,
  itemSelector,
}: UseGridNavigationOptions): UseGridNavigationReturn => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const items = getFocusableItems(container, itemSelector);

      if (items.length === 0) return;

      const currentIndex = getCurrentIndex(items);

      // If no item is focused, don't handle the event
      if (currentIndex === -1) return;

      const columns = getColumnCount(container);
      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowRight':
          nextIndex = currentIndex + 1;
          break;
        case 'ArrowLeft':
          nextIndex = currentIndex - 1;
          break;
        case 'ArrowDown':
          nextIndex = currentIndex + columns;
          break;
        case 'ArrowUp':
          nextIndex = currentIndex - columns;
          break;
        case 'Home':
          // Move to first item
          nextIndex = 0;
          break;
        case 'End':
          // Move to last item
          nextIndex = items.length - 1;
          break;
        default:
          // Don't handle other keys
          return;
      }

      // Bounds checking
      if (nextIndex >= 0 && nextIndex < items.length) {
        e.preventDefault();
        items[nextIndex].focus();
      }
    },
    [containerRef, itemSelector]
  );

  return { handleKeyDown };
};

export default useGridNavigation;
