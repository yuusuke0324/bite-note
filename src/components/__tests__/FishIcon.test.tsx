/**
 * FishIconコンポーネントの単体テスト
 *
 * @description
 * 写真なし記録用のFishIconコンポーネントのテストスイート。
 * 魚種別背景色、アイコン種別、テーマ対応を検証。
 *
 * @version 1.0.0
 * @since 2025-11-30 Issue #321
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { FishIcon } from '../ui/FishIcon';
import { FISH_COLORS, DEFAULT_FISH_COLOR } from '../../theme/fishColors';

/**
 * HEX色をRGB形式に変換するヘルパー関数
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 色を比較するヘルパー関数（HEXまたはRGB形式に対応）
 */
function colorsMatch(actual: string, expectedHex: string): boolean {
  // 両方をRGBに正規化して比較
  const actualNormalized = actual.toLowerCase().replace(/\s/g, '');
  const expectedRgb = hexToRgb(expectedHex).toLowerCase().replace(/\s/g, '');
  const expectedHexNormalized = expectedHex.toLowerCase();
  return actualNormalized === expectedRgb || actualNormalized === expectedHexNormalized;
}

// useThemeをモック
vi.mock('../../hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({ isDark: false, theme: 'light', toggleTheme: vi.fn() })),
}));

// モックをインポート
import { useTheme } from '../../hooks/useTheme';
const mockedUseTheme = vi.mocked(useTheme);

describe('FishIcon', () => {
  beforeEach(async () => {
    // モックを完全にリセット
    vi.resetAllMocks();

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
    // デフォルトをライトモードに設定
    mockedUseTheme.mockReturnValue({
      isDark: false,
      theme: 'light',
      toggleTheme: vi.fn(),
      setThemeMode: vi.fn(),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  describe('Rendering', () => {
    it('renders correctly', () => {
      const { container } = render(<FishIcon species="シーバス" />);
      expect(container.querySelector('.fish-icon-container')).toBeInTheDocument();
    });

    it('renders with role="img" for accessibility', () => {
      const { container } = render(<FishIcon species="シーバス" />);
      expect(container.querySelector('[role="img"]')).toBeInTheDocument();
    });

    it('includes species name in aria-label', () => {
      const { container } = render(<FishIcon species="シーバス" />);
      expect(container.querySelector('[role="img"]')).toHaveAttribute(
        'aria-label',
        'シーバスのアイコン'
      );
    });

    it('renders with custom className', () => {
      const { container } = render(<FishIcon species="シーバス" className="custom-class" />);
      expect(container.querySelector('.fish-icon-container')).toHaveClass('custom-class');
    });

    it('renders with data-testid', () => {
      const { container } = render(<FishIcon species="シーバス" data-testid="fish-icon" />);
      expect(container.querySelector('[data-testid="fish-icon"]')).toBeInTheDocument();
    });

    it('hides from screen readers when aria-hidden is true', () => {
      const { container } = render(<FishIcon species="シーバス" aria-hidden={true} />);
      const icon = container.querySelector('.fish-icon-container');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).not.toHaveAttribute('role');
      expect(icon).not.toHaveAttribute('aria-label');
    });

    it('renders SVG icon', () => {
      const { container } = render(<FishIcon species="シーバス" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Fish Species Background Colors (Light Mode)', () => {
    // ヘルパー関数: ライトモードでレンダリング
    const renderLightMode = (species: string) => {
      // テスト直前にモックを設定
      mockedUseTheme.mockReturnValue({
        isDark: false,
        theme: 'light',
        toggleTheme: vi.fn(),
        setThemeMode: vi.fn(),
      });
      return render(<FishIcon species={species} />);
    };

    // ヘルパー関数: HEX/RGB両形式に対応して色を比較
    const expectBackgroundColor = (element: HTMLElement | null, expectedHex: string) => {
      expect(element).not.toBeNull();
      const style = element!.style.backgroundColor;
      expect(colorsMatch(style, expectedHex)).toBe(true);
    };

    it('applies teal color for Seabass (シーバス)', () => {
      const { container } = renderLightMode('シーバス');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['シーバス'].light);
    });

    it('applies red color for Red Sea Bream (マダイ)', () => {
      const { container } = renderLightMode('マダイ');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['マダイ'].light);
    });

    it('applies red color for Black Sea Bream (チヌ)', () => {
      const { container } = renderLightMode('チヌ');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['チヌ'].light);
    });

    it('applies blue color for Horse Mackerel (アジ)', () => {
      const { container } = renderLightMode('アジ');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['アジ'].light);
    });

    it('applies blue color for Mackerel (サバ)', () => {
      const { container } = renderLightMode('サバ');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['サバ'].light);
    });

    it('applies purple color for Rockfish (メバル)', () => {
      const { container } = renderLightMode('メバル');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['メバル'].light);
    });

    it('applies purple-pink color for Bigfin Reef Squid (アオリイカ)', () => {
      const { container } = renderLightMode('アオリイカ');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['アオリイカ'].light);
    });

    it('applies cyan color for Yellowtail (ブリ)', () => {
      const { container } = renderLightMode('ブリ');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['ブリ'].light);
    });

    it('applies default primary color for unknown species', () => {
      const { container } = renderLightMode('未知の魚');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, DEFAULT_FISH_COLOR.light);
    });
  });

  describe('Dark Mode Colors', () => {
    // ヘルパー関数: ダークモードでレンダリング
    const renderDarkMode = (species: string) => {
      // テスト直前にモックを設定
      mockedUseTheme.mockReturnValue({
        isDark: true,
        theme: 'dark',
        toggleTheme: vi.fn(),
        setThemeMode: vi.fn(),
      });
      return render(<FishIcon species={species} />);
    };

    // ヘルパー関数: HEX/RGB両形式に対応して色を比較
    const expectBackgroundColor = (element: HTMLElement | null, expectedHex: string) => {
      expect(element).not.toBeNull();
      const style = element!.style.backgroundColor;
      expect(colorsMatch(style, expectedHex)).toBe(true);
    };

    it('applies brighter teal color for Seabass in dark mode', () => {
      const { container } = renderDarkMode('シーバス');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['シーバス'].dark);
    });

    it('applies brighter red color for Red Sea Bream in dark mode', () => {
      const { container } = renderDarkMode('マダイ');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['マダイ'].dark);
    });

    it('applies brighter blue color for Horse Mackerel in dark mode', () => {
      const { container } = renderDarkMode('アジ');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['アジ'].dark);
    });

    it('applies default primary color for unknown species in dark mode', () => {
      const { container } = renderDarkMode('未知の魚');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, DEFAULT_FISH_COLOR.dark);
    });
  });

  describe('Icon Type Selection', () => {
    it('renders SquidIcon for Bigfin Reef Squid (アオリイカ)', () => {
      const { container } = render(<FishIcon species="アオリイカ" />);
      const svg = container.querySelector('svg');
      // SquidIconはellipseを持つ（胴体）
      expect(svg?.querySelector('ellipse')).toBeInTheDocument();
    });

    it('renders SquidIcon for Spear Squid (ヤリイカ)', () => {
      const { container } = render(<FishIcon species="ヤリイカ" />);
      const svg = container.querySelector('svg');
      expect(svg?.querySelector('ellipse')).toBeInTheDocument();
    });

    it('renders SquidIcon for Octopus (マダコ)', () => {
      const { container } = render(<FishIcon species="マダコ" />);
      const svg = container.querySelector('svg');
      expect(svg?.querySelector('ellipse')).toBeInTheDocument();
    });

    it('renders Fish icon for Seabass (シーバス)', () => {
      const { container } = render(<FishIcon species="シーバス" />);
      const svg = container.querySelector('svg');
      // Lucide Fishアイコンはellipseを持たない
      expect(svg?.querySelector('ellipse')).not.toBeInTheDocument();
    });

    it('renders Fish icon for unknown species', () => {
      const { container } = render(<FishIcon species="未知の魚" />);
      const svg = container.querySelector('svg');
      expect(svg?.querySelector('ellipse')).not.toBeInTheDocument();
    });
  });

  describe('Partial Matching', () => {
    // ヘルパー関数: ライトモードでレンダリング
    const renderLightMode = (species: string) => {
      mockedUseTheme.mockReturnValue({
        isDark: false,
        theme: 'light',
        toggleTheme: vi.fn(),
        setThemeMode: vi.fn(),
      });
      return render(<FishIcon species={species} />);
    };

    // ヘルパー関数: HEX/RGB両形式に対応して色を比較
    const expectBackgroundColor = (element: HTMLElement | null, expectedHex: string) => {
      expect(element).not.toBeNull();
      const style = element!.style.backgroundColor;
      expect(colorsMatch(style, expectedHex)).toBe(true);
    };

    it('matches partial species name: シーバス（セイゴ）-> シーバス', () => {
      const { container } = renderLightMode('シーバス（セイゴ）');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['シーバス'].light);
    });

    it('matches partial species name: マダイ 40cm -> マダイ', () => {
      const { container } = renderLightMode('マダイ 40cm');
      const icon = container.querySelector('.fish-icon-container') as HTMLElement;
      expectBackgroundColor(icon, FISH_COLORS['マダイ'].light);
    });
  });

  describe('Icon Size', () => {
    it('applies default size of 64px', () => {
      const { container } = render(<FishIcon species="シーバス" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '64');
      expect(svg).toHaveAttribute('height', '64');
    });

    it('applies custom size', () => {
      const { container } = render(<FishIcon species="シーバス" size={100} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '100');
      expect(svg).toHaveAttribute('height', '100');
    });

    it('applies small size', () => {
      const { container } = render(<FishIcon species="シーバス" size={24} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });
  });

  describe('forwardRef', () => {
    it('forwards ref to container element', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<FishIcon ref={ref} species="シーバス" />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveClass('fish-icon-container');
    });
  });
});
