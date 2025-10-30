/**
 * テストユーティリティ - TideChartテストの共通処理
 * パフォーマンス最適化のため、共通セットアップをモジュール化
 */

import { TideChartData } from '../types';
import { vi } from 'vitest';

/**
 * 共通のモックデータ（メモ化して再利用）
 */
export const createMockTideData = (): TideChartData[] => [
  { time: '00:00', tide: 120, type: 'high' },
  { time: '03:00', tide: 80 },
  { time: '06:00', tide: 40, type: 'low' },
  { time: '09:00', tide: 90 },
  { time: '12:00', tide: 150, type: 'high' },
  { time: '15:00', tide: 100 },
  { time: '18:00', tide: 30, type: 'low' },
  { time: '21:00', tide: 110 },
];

/**
 * ResizeObserverのモックをセットアップ
 */
export const setupResizeObserverMock = () => {
  const mockResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));

  global.ResizeObserver = mockResizeObserver as any;
  return mockResizeObserver;
};

/**
 * パフォーマンス警告を抑制（テスト環境では不要）
 */
export const suppressPerformanceWarnings = () => {
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.warn = vi.fn((message) => {
      if (
        typeof message === 'string' &&
        message.includes('Performance warning')
      ) {
        return;
      }
      originalConsoleWarn(message);
    });

    console.error = vi.fn((message) => {
      if (
        typeof message === 'string' &&
        (message.includes('Warning: A props object containing a "key"') ||
          message.includes('React keys must be passed directly'))
      ) {
        return;
      }
      originalConsoleError(message);
    });
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });
};

/**
 * Accessibility Test Utilities
 */
export class AccessibilityTester {
  static getAriaLabel(element: HTMLElement): string | null {
    return element.getAttribute('aria-label');
  }

  static getAriaDescribedBy(element: HTMLElement): string | null {
    return element.getAttribute('aria-describedby');
  }

  static getRole(element: HTMLElement): string | null {
    return element.getAttribute('role');
  }

  static async simulateKeyboardNavigation(user: any, keys: string[]) {
    for (const key of keys) {
      await user.keyboard(`{${key}}`);
      // テスト速度向上のため、待ち時間を短縮
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * axe検証（重い処理なので、必要な場所だけで使用）
   */
  static async expectNoA11yViolations(element: HTMLElement) {
    const { axe } = await import('jest-axe');
    const results = await axe(element);
    expect(results).toHaveNoViolations();
  }
}

/**
 * 大量データ生成（パフォーマンステスト用）
 */
export const createLargeTideData = (size: number): TideChartData[] => {
  return Array.from({ length: size }, (_, i) => ({
    time: `${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
    tide: Math.floor(Math.random() * 200),
    type: i % 10 === 0 ? ('high' as const) : undefined,
  }));
};
