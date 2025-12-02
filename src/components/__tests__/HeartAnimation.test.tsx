/**
 * HeartAnimationコンポーネントの単体テスト
 *
 * @description
 * 保存成功時のハートアニメーションコンポーネントのテストスイート
 *
 * @version 1.0.0
 * @since 2025-12-03 Issue #324
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { HeartAnimation } from '../animation/HeartAnimation';

describe('HeartAnimation', () => {
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

  describe('表示制御', () => {
    it('visible=falseの場合は何もレンダリングしない', () => {
      const { container } = render(<HeartAnimation visible={false} />);
      expect(container.querySelector('.heart-animation-container')).toBeNull();
    });

    it('visible=trueの場合はハートアニメーションがレンダリングされる', () => {
      const { container } = render(<HeartAnimation visible={true} />);
      const heartContainer = container.querySelector('.heart-animation-container');
      expect(heartContainer).toBeInTheDocument();
    });

    it('ハートアイコン（SVG）がレンダリングされる', () => {
      const { container } = render(<HeartAnimation visible={true} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('heart-animation');
    });
  });

  describe('アクセシビリティ', () => {
    it('role="status"とaria-live="polite"を持つスクリーンリーダー用要素がある', () => {
      const { container } = render(<HeartAnimation visible={true} />);
      const srOnly = container.querySelector('.sr-only');
      expect(srOnly).toBeInTheDocument();
      expect(srOnly).toHaveAttribute('role', 'status');
      expect(srOnly).toHaveAttribute('aria-live', 'polite');
      expect(srOnly).toHaveTextContent('保存が完了しました');
    });

    it('ハートアニメーションコンテナはaria-hidden="true"で装飾的である', () => {
      const { container } = render(<HeartAnimation visible={true} />);
      const heartContainer = container.querySelector('.heart-animation-container');
      expect(heartContainer).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('アニメーション終了時のコールバック', () => {
    it('onAnimationEndコールバックが呼び出される', () => {
      const handleAnimationEnd = vi.fn();
      const { container } = render(
        <HeartAnimation visible={true} onAnimationEnd={handleAnimationEnd} />
      );

      const heartContainer = container.querySelector('.heart-animation-container');
      expect(heartContainer).toBeInTheDocument();

      // animationendイベントを発火
      fireEvent.animationEnd(heartContainer!);

      expect(handleAnimationEnd).toHaveBeenCalledTimes(1);
    });

    it('onAnimationEndが提供されていない場合でもエラーが発生しない', () => {
      const { container } = render(<HeartAnimation visible={true} />);

      const heartContainer = container.querySelector('.heart-animation-container');
      expect(heartContainer).toBeInTheDocument();

      // animationendイベントを発火（エラーが発生しないことを確認）
      expect(() => {
        fireEvent.animationEnd(heartContainer!);
      }).not.toThrow();
    });
  });

  describe('複数回の表示', () => {
    it('visibleがfalse→trueに変わると再度アニメーションが開始される', () => {
      const { container, rerender } = render(<HeartAnimation visible={false} />);

      expect(container.querySelector('.heart-animation-container')).toBeNull();

      // visible=trueに変更
      rerender(<HeartAnimation visible={true} />);
      expect(container.querySelector('.heart-animation-container')).toBeInTheDocument();
    });

    it('連続してvisibleを切り替えても正しく動作する', () => {
      const handleAnimationEnd = vi.fn();
      const { container, rerender } = render(
        <HeartAnimation visible={true} onAnimationEnd={handleAnimationEnd} />
      );

      // アニメーション終了をシミュレート
      const heartContainer = container.querySelector('.heart-animation-container');
      fireEvent.animationEnd(heartContainer!);
      expect(handleAnimationEnd).toHaveBeenCalledTimes(1);

      // 非表示→再表示
      rerender(<HeartAnimation visible={false} onAnimationEnd={handleAnimationEnd} />);
      rerender(<HeartAnimation visible={true} onAnimationEnd={handleAnimationEnd} />);

      const newHeartContainer = container.querySelector('.heart-animation-container');
      expect(newHeartContainer).toBeInTheDocument();
    });
  });

  describe('スタイリング', () => {
    it('heart-animationクラスが適用されている', () => {
      const { container } = render(<HeartAnimation visible={true} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('heart-animation');
    });

    it('ハートのサイズが80pxである', () => {
      const { container } = render(<HeartAnimation visible={true} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '80');
      expect(svg).toHaveAttribute('height', '80');
    });

    it('heart-animation-containerクラスが適用されている', () => {
      const { container } = render(<HeartAnimation visible={true} />);
      const heartContainer = container.querySelector('.heart-animation-container');
      expect(heartContainer).toBeInTheDocument();
    });
  });
});
