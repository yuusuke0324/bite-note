/**
 * Iconコンポーネントの単体テスト
 *
 * @description
 * Lucide Reactベースの統一アイコンコンポーネントのテストスイート
 * CI環境での並列実行時のDOM参照問題を回避するため、
 * `screen` → `container.querySelector` パターンを採用
 *
 * @version 1.0.0
 * @since 2025-11-26 Issue #208
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, waitFor, within } from '@testing-library/react';
import { Search, Fish, Camera, Home } from 'lucide-react';
import { Icon } from '../ui/Icon';
import { ICON_SIZES } from '../../types/icon';

describe('Icon', () => {
  beforeEach(async () => {
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
    // CI環境ではroot containerを保持
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  describe('基本レンダリング', () => {
    it('アイコンコンポーネントを正しくレンダリングする', () => {
      const { container } = render(<Icon icon={Search} aria-label="検索" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-label', '検索');
    });

    it('SVG要素としてレンダリングされる', () => {
      const { container } = render(<Icon icon={Fish} decorative />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.tagName.toLowerCase()).toBe('svg');
    });
  });

  describe('サイズ設定', () => {
    it.each([
      ['xs', ICON_SIZES.xs],
      ['sm', ICON_SIZES.sm],
      ['md', ICON_SIZES.md],
      ['lg', ICON_SIZES.lg],
      ['xl', ICON_SIZES.xl],
    ] as const)(
      'size="%s" でサイズ %dpx が適用される',
      (preset, expectedSize) => {
        const { container } = render(
          <Icon icon={Camera} size={preset} decorative />
        );
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('width', String(expectedSize));
        expect(svg).toHaveAttribute('height', String(expectedSize));
      }
    );

    it('数値でサイズを直接指定できる', () => {
      const { container } = render(<Icon icon={Home} size={28} decorative />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '28');
      expect(svg).toHaveAttribute('height', '28');
    });

    it('デフォルトでmd（20px）が適用される', () => {
      const { container } = render(<Icon icon={Search} decorative />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
    });
  });

  describe('ストローク幅', () => {
    it('デフォルトのstrokeWidthは2', () => {
      const { container } = render(<Icon icon={Fish} decorative />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('stroke-width', '2');
    });

    it('カスタムstrokeWidthを適用できる', () => {
      const { container } = render(
        <Icon icon={Fish} strokeWidth={1.5} decorative />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('stroke-width', '1.5');
    });
  });

  describe('クラス名', () => {
    it('flex-shrink-0クラスがデフォルトで適用される', () => {
      const { container } = render(<Icon icon={Search} decorative />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('flex-shrink-0');
    });

    it('カスタムclassNameを追加できる', () => {
      const { container } = render(
        <Icon icon={Camera} className="text-blue-600 custom-class" decorative />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-blue-600');
      expect(svg).toHaveClass('custom-class');
      expect(svg).toHaveClass('flex-shrink-0');
    });

    it('colorプリセットでカラークラスが適用される', () => {
      const { container } = render(
        <Icon icon={Home} color="primary" decorative />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-blue-600');
    });
  });

  describe('アクセシビリティ', () => {
    it('aria-labelを設定できる', () => {
      const { container } = render(
        <Icon icon={Search} aria-label="検索アイコン" />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', '検索アイコン');
    });

    it('aria-label設定時はrole="img"が付与される', () => {
      const { container } = render(
        <Icon icon={Fish} aria-label="魚アイコン" />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAttribute('aria-label', '魚アイコン');
    });

    it('decorative=trueでaria-hidden="true"が設定される', () => {
      const { container } = render(<Icon icon={Camera} decorative />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('decorative=trueの場合はaria-labelがあってもrole="img"は付与されない', () => {
      const { container } = render(
        <Icon icon={Home} aria-label="ホーム" decorative />
      );
      const svg = container.querySelector('svg');
      expect(svg).not.toHaveAttribute('role');
    });

    it('aria-labelがない場合はaria-hidden="true"が設定される', () => {
      const { container } = render(<Icon icon={Search} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('追加プロパティ', () => {
    it('data-testid等の追加属性を渡せる', () => {
      const { container } = render(
        <Icon icon={Fish} data-testid="fish-icon" decorative />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('data-testid', 'fish-icon');
    });
  });
});
