/**
 * SwipeIndicatorコンポーネントの単体テスト
 *
 * @description
 * スワイプインジケーターコンポーネントのテストスイート
 * ドット形式とテキスト形式の切り替え、アクセシビリティを検証
 *
 * @version 1.0.0
 * @since 2025-12-03 Issue #365
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SwipeIndicator } from '../ui/SwipeIndicator';

// matchMedia mock
const mockMatchMedia = (matches: boolean) => {
  return vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe('SwipeIndicator', () => {
  beforeEach(async () => {
    window.matchMedia = mockMatchMedia(false);

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
    vi.restoreAllMocks();
    // CI環境ではroot containerを保持
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  describe('Rendering', () => {
    it('renders nothing when totalCount is 0', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={0} totalCount={0} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when totalCount is 1', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={0} totalCount={1} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders dots for totalCount <= 7', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={2} totalCount={5} />
      );
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(5);
    });

    it('renders text format for totalCount > 7', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={3} totalCount={10} />
      );
      expect(container.textContent).toContain('4/10');
    });
  });

  describe('Dot Indicator', () => {
    it('marks current dot as active', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={2} totalCount={5} />
      );
      const buttons = container.querySelectorAll('button');
      expect(buttons[2].getAttribute('aria-selected')).toBe('true');
      expect(buttons[0].getAttribute('aria-selected')).toBe('false');
    });

    it('calls onDotClick when dot is clicked', () => {
      const onDotClick = vi.fn();
      const { container } = render(
        <SwipeIndicator currentIndex={0} totalCount={5} onDotClick={onDotClick} />
      );
      const buttons = container.querySelectorAll('button');
      fireEvent.click(buttons[3]);
      expect(onDotClick).toHaveBeenCalledWith(3);
    });

    it('calls onDotClick on Enter key', () => {
      const onDotClick = vi.fn();
      const { container } = render(
        <SwipeIndicator currentIndex={0} totalCount={5} onDotClick={onDotClick} />
      );
      const buttons = container.querySelectorAll('button');
      fireEvent.keyDown(buttons[2], { key: 'Enter' });
      expect(onDotClick).toHaveBeenCalledWith(2);
    });

    it('calls onDotClick on Space key', () => {
      const onDotClick = vi.fn();
      const { container } = render(
        <SwipeIndicator currentIndex={0} totalCount={5} onDotClick={onDotClick} />
      );
      const buttons = container.querySelectorAll('button');
      fireEvent.keyDown(buttons[1], { key: ' ' });
      expect(onDotClick).toHaveBeenCalledWith(1);
    });
  });

  describe('Text Indicator', () => {
    it('displays correct format', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={5} totalCount={15} />
      );
      expect(container.textContent).toBe('6/15');
    });

    it('updates when currentIndex changes', () => {
      const { container, rerender } = render(
        <SwipeIndicator currentIndex={0} totalCount={10} />
      );
      expect(container.textContent).toBe('1/10');

      rerender(<SwipeIndicator currentIndex={9} totalCount={10} />);
      expect(container.textContent).toBe('10/10');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes on container', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={2} totalCount={5} />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.getAttribute('role')).toBe('status');
      expect(wrapper.getAttribute('aria-label')).toBe('5件中3件目');
      expect(wrapper.getAttribute('aria-live')).toBe('polite');
    });

    it('has tablist role on dot container', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={0} totalCount={5} />
      );
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toBeInTheDocument();
    });

    it('has tab role on each dot', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={0} totalCount={5} />
      );
      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBe(5);
    });

    it('has correct aria-label on each dot', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={0} totalCount={3} />
      );
      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[0].getAttribute('aria-label')).toBe('3件中1件目に移動');
      expect(tabs[1].getAttribute('aria-label')).toBe('3件中2件目に移動');
      expect(tabs[2].getAttribute('aria-label')).toBe('3件中3件目に移動');
    });

    it('sets tabIndex 0 only on active dot', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={2} totalCount={5} />
      );
      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs[2].getAttribute('tabindex')).toBe('0');
      expect(tabs[0].getAttribute('tabindex')).toBe('-1');
      expect(tabs[1].getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <SwipeIndicator
          currentIndex={0}
          totalCount={5}
          className="custom-indicator"
        />
      );
      expect(container.firstChild).toHaveClass('custom-indicator');
    });

    it('applies custom style', () => {
      const { container } = render(
        <SwipeIndicator
          currentIndex={0}
          totalCount={5}
          style={{ marginTop: '20px' }}
        />
      );
      expect(container.firstChild).toHaveStyle({ marginTop: '20px' });
    });
  });

  describe('Edge cases', () => {
    it('handles boundary - exactly 7 dots', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={3} totalCount={7} />
      );
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(7);
    });

    it('handles boundary - exactly 8 items (text format)', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={3} totalCount={8} />
      );
      expect(container.textContent).toBe('4/8');
    });

    it('handles first index', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={0} totalCount={5} />
      );
      const buttons = container.querySelectorAll('button');
      expect(buttons[0].getAttribute('aria-selected')).toBe('true');
    });

    it('handles last index', () => {
      const { container } = render(
        <SwipeIndicator currentIndex={4} totalCount={5} />
      );
      const buttons = container.querySelectorAll('button');
      expect(buttons[4].getAttribute('aria-selected')).toBe('true');
    });
  });
});
