/**
 * RippleEffectコンポーネントの単体テスト
 *
 * @description
 * Material Design風リップル効果コンポーネントのテストスイート
 * CI環境での並列実行時のDOM参照問題を回避するため、
 * `screen` → `container.querySelector` パターンを採用
 *
 * @version 1.0.0
 * @since 2025-12-03 Issue #326
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { RippleEffect } from '../animation/RippleEffect';

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

describe('RippleEffect', () => {
  beforeEach(async () => {
    // Default: prefers-reduced-motion: no-preference
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
    it('renders children correctly', () => {
      const { container } = render(
        <RippleEffect>
          <button>Click me</button>
        </RippleEffect>
      );
      expect(container.querySelector('button')).toHaveTextContent('Click me');
    });

    it('applies ripple-container class', () => {
      const { container } = render(
        <RippleEffect>
          <span>Content</span>
        </RippleEffect>
      );
      expect(container.querySelector('.ripple-container')).toBeInTheDocument();
    });

    it('merges custom className', () => {
      const { container } = render(
        <RippleEffect className="custom-class">
          <span>Content</span>
        </RippleEffect>
      );
      const rippleContainer = container.querySelector('.ripple-container');
      expect(rippleContainer).toHaveClass('custom-class');
    });

    it('passes through additional props', () => {
      const { container } = render(
        <RippleEffect data-testid="test-ripple" role="button">
          <span>Content</span>
        </RippleEffect>
      );
      const rippleContainer = container.querySelector('[data-testid="test-ripple"]');
      expect(rippleContainer).toBeInTheDocument();
      expect(rippleContainer).toHaveAttribute('role', 'button');
    });
  });

  describe('Ripple creation on click', () => {
    it('creates ripple element on click', async () => {
      const { container } = render(
        <RippleEffect>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer, {
          clientX: 50,
          clientY: 50,
        });
      });

      const ripple = container.querySelector('.ripple');
      expect(ripple).toBeInTheDocument();
    });

    it('positions ripple at click location', async () => {
      const { container } = render(
        <RippleEffect>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      // Mock getBoundingClientRect
      vi.spyOn(rippleContainer, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      await act(async () => {
        fireEvent.click(rippleContainer, {
          clientX: 50,
          clientY: 50,
        });
      });

      const ripple = container.querySelector('.ripple') as HTMLElement;
      expect(ripple).toBeInTheDocument();
      expect(ripple.style.left).toBe('50px');
      expect(ripple.style.top).toBe('50px');
    });

    it('applies custom color to ripple', async () => {
      const customColor = 'rgba(255, 0, 0, 0.5)';
      const { container } = render(
        <RippleEffect color={customColor}>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer, {
          clientX: 50,
          clientY: 50,
        });
      });

      const ripple = container.querySelector('.ripple') as HTMLElement;
      expect(ripple.style.backgroundColor).toBe(customColor);
    });

    it('removes ripple after duration', async () => {
      vi.useFakeTimers();

      const { container } = render(
        <RippleEffect duration={600}>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer, {
          clientX: 50,
          clientY: 50,
        });
      });

      expect(container.querySelector('.ripple')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(700);
      });

      expect(container.querySelector('.ripple')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('creates multiple ripples on multiple clicks', async () => {
      const { container } = render(
        <RippleEffect>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer, { clientX: 30, clientY: 30 });
        fireEvent.click(rippleContainer, { clientX: 50, clientY: 50 });
        fireEvent.click(rippleContainer, { clientX: 70, clientY: 70 });
      });

      const ripples = container.querySelectorAll('.ripple');
      expect(ripples.length).toBe(3);
    });
  });

  describe('Disabled state', () => {
    it('does not create ripple when disabled', async () => {
      const { container } = render(
        <RippleEffect disabled>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer, {
          clientX: 50,
          clientY: 50,
        });
      });

      expect(container.querySelector('.ripple')).not.toBeInTheDocument();
    });

    it('still calls onClick when disabled', async () => {
      const handleClick = vi.fn();
      const { container } = render(
        <RippleEffect disabled onClick={handleClick}>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer);
      });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('prefers-reduced-motion', () => {
    it('applies ripple-reduced class when motion is reduced', async () => {
      window.matchMedia = mockMatchMedia(true);

      const { container } = render(
        <RippleEffect>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer, {
          clientX: 50,
          clientY: 50,
        });
      });

      const ripple = container.querySelector('.ripple');
      expect(ripple).toHaveClass('ripple-reduced');
    });

    it('uses shorter cleanup duration for reduced motion', async () => {
      vi.useFakeTimers();
      window.matchMedia = mockMatchMedia(true);

      const { container } = render(
        <RippleEffect duration={600}>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer, {
          clientX: 50,
          clientY: 50,
        });
      });

      expect(container.querySelector('.ripple')).toBeInTheDocument();

      // Reduced motion uses 300ms instead of 600ms
      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      expect(container.querySelector('.ripple')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('marks ripple elements as aria-hidden', async () => {
      const { container } = render(
        <RippleEffect>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer, {
          clientX: 50,
          clientY: 50,
        });
      });

      const ripple = container.querySelector('.ripple');
      expect(ripple).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('onClick callback', () => {
    it('calls onClick callback when clicked', async () => {
      const handleClick = vi.fn();
      const { container } = render(
        <RippleEffect onClick={handleClick}>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer);
      });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('passes event to onClick callback', async () => {
      const handleClick = vi.fn();
      const { container } = render(
        <RippleEffect onClick={handleClick}>
          <span>Click me</span>
        </RippleEffect>
      );

      const rippleContainer = container.querySelector('.ripple-container')!;

      await act(async () => {
        fireEvent.click(rippleContainer);
      });

      expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({ type: 'click' }));
    });
  });
});
