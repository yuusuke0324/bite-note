/**
 * useRippleカスタムフックの単体テスト
 *
 * @description
 * リップル効果を提供するカスタムフックのテストスイート
 *
 * @version 1.0.0
 * @since 2025-12-03 Issue #326
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useRipple } from '../useRipple';

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

describe('useRipple', () => {
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
    vi.useRealTimers();
    // CI環境ではroot containerを保持
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  describe('Hook initialization', () => {
    it('returns containerRef and createRipple', () => {
      const { result } = renderHook(() => useRipple());
      expect(result.current.containerRef).toBeDefined();
      expect(result.current.createRipple).toBeDefined();
      expect(typeof result.current.createRipple).toBe('function');
    });
  });

  describe('Ripple creation with component', () => {
    // Test component using useRipple
    const TestComponent: React.FC<{
      color?: string;
      duration?: number;
      size?: number;
    }> = ({ color, duration, size }) => {
      const { containerRef, createRipple } = useRipple<HTMLButtonElement>({
        color,
        duration,
        size,
      });

      return (
        <button
          ref={containerRef}
          onClick={createRipple}
          className="ripple-container"
          data-testid="test-button"
        >
          Click me
        </button>
      );
    };

    it('creates ripple element on click', async () => {
      const { container } = render(<TestComponent />);
      const button = container.querySelector('button')!;

      // Mock getBoundingClientRect
      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      await act(async () => {
        fireEvent.click(button, { clientX: 50, clientY: 25 });
      });

      const ripple = button.querySelector('.ripple');
      expect(ripple).toBeInTheDocument();
    });

    it('positions ripple at click location', async () => {
      const { container } = render(<TestComponent />);
      const button = container.querySelector('button')!;

      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 10,
        top: 20,
        right: 110,
        bottom: 70,
        width: 100,
        height: 50,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      });

      await act(async () => {
        fireEvent.click(button, { clientX: 60, clientY: 45 });
      });

      const ripple = button.querySelector('.ripple') as HTMLElement;
      expect(ripple.style.left).toBe('50px'); // 60 - 10
      expect(ripple.style.top).toBe('25px'); // 45 - 20
    });

    it('applies custom color', async () => {
      const customColor = 'rgba(0, 255, 0, 0.3)';
      const { container } = render(<TestComponent color={customColor} />);
      const button = container.querySelector('button')!;

      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      await act(async () => {
        fireEvent.click(button, { clientX: 50, clientY: 25 });
      });

      const ripple = button.querySelector('.ripple') as HTMLElement;
      expect(ripple.style.backgroundColor).toBe(customColor);
    });

    it('applies custom size', async () => {
      const customSize = 150;
      const { container } = render(<TestComponent size={customSize} />);
      const button = container.querySelector('button')!;

      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      await act(async () => {
        fireEvent.click(button, { clientX: 50, clientY: 25 });
      });

      const ripple = button.querySelector('.ripple') as HTMLElement;
      expect(ripple.style.width).toBe(`${customSize}px`);
      expect(ripple.style.height).toBe(`${customSize}px`);
      expect(ripple.style.marginLeft).toBe(`${-customSize / 2}px`);
      expect(ripple.style.marginTop).toBe(`${-customSize / 2}px`);
    });

    it('removes ripple after duration', async () => {
      vi.useFakeTimers();
      const { container } = render(<TestComponent duration={500} />);
      const button = container.querySelector('button')!;

      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      await act(async () => {
        fireEvent.click(button, { clientX: 50, clientY: 25 });
      });

      expect(button.querySelector('.ripple')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(button.querySelector('.ripple')).not.toBeInTheDocument();
    });
  });

  describe('prefers-reduced-motion', () => {
    const TestComponent: React.FC = () => {
      const { containerRef, createRipple } = useRipple<HTMLButtonElement>();

      return (
        <button
          ref={containerRef}
          onClick={createRipple}
          className="ripple-container"
        >
          Click me
        </button>
      );
    };

    it('applies ripple-reduced class when motion is reduced', async () => {
      window.matchMedia = mockMatchMedia(true);

      const { container } = render(<TestComponent />);
      const button = container.querySelector('button')!;

      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      await act(async () => {
        fireEvent.click(button, { clientX: 50, clientY: 25 });
      });

      const ripple = button.querySelector('.ripple');
      expect(ripple).toHaveClass('ripple-reduced');
    });

    it('uses 300ms cleanup duration for reduced motion', async () => {
      vi.useFakeTimers();
      window.matchMedia = mockMatchMedia(true);

      const { container } = render(<TestComponent />);
      const button = container.querySelector('button')!;

      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      await act(async () => {
        fireEvent.click(button, { clientX: 50, clientY: 25 });
      });

      expect(button.querySelector('.ripple')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      expect(button.querySelector('.ripple')).not.toBeInTheDocument();
    });
  });

  describe('Touch events', () => {
    const TestComponent: React.FC = () => {
      const { containerRef, createRipple } = useRipple<HTMLButtonElement>();

      return (
        <button
          ref={containerRef}
          onTouchStart={createRipple}
          className="ripple-container"
        >
          Touch me
        </button>
      );
    };

    it('handles touch events', async () => {
      const { container } = render(<TestComponent />);
      const button = container.querySelector('button')!;

      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      await act(async () => {
        fireEvent.touchStart(button, {
          touches: [{ clientX: 50, clientY: 25 }],
        });
      });

      const ripple = button.querySelector('.ripple') as HTMLElement;
      expect(ripple).toBeInTheDocument();
      expect(ripple.style.left).toBe('50px');
      expect(ripple.style.top).toBe('25px');
    });
  });

  describe('Default values', () => {
    it('uses default color rgba(255, 255, 255, 0.5)', async () => {
      const { result } = renderHook(() => useRipple());
      expect(result.current.createRipple).toBeDefined();

      // Create a test element
      const button = document.createElement('button');
      button.className = 'ripple-container';
      document.body.appendChild(button);

      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 50,
        width: 100,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      // Call createRipple with mock event
      const mockEvent = {
        currentTarget: button,
        clientX: 50,
        clientY: 25,
      } as React.MouseEvent<HTMLButtonElement>;

      await act(async () => {
        result.current.createRipple(mockEvent);
      });

      const ripple = button.querySelector('.ripple') as HTMLElement;
      expect(ripple.style.backgroundColor).toBe('rgba(255, 255, 255, 0.5)');

      document.body.removeChild(button);
    });
  });
});
