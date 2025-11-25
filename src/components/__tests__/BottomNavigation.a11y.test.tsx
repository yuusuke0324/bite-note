/**
 * BottomNavigation アクセシビリティテスト
 *
 * @description
 * WAI-ARIA Tabs Pattern準拠のアクセシビリティテスト
 * - WCAG 2.1 AA準拠を検証
 * - タブパターンのARIA属性を確認
 * - キーボードナビゲーション検証
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 * @version 1.0.0
 * @since 2025-11-25
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { BottomNavigation } from '../navigation/BottomNavigation';

// jest-axeのカスタムマッチャーを追加
expect.extend(toHaveNoViolations);

const mockItems = [
  {
    id: 'form',
    label: '記録',
    icon: <span>📝</span>,
    active: true,
    testId: 'nav-form',
  },
  {
    id: 'list',
    label: '一覧',
    icon: <span>📋</span>,
    active: false,
    testId: 'nav-list',
  },
  {
    id: 'stats',
    label: '統計',
    icon: <span>📊</span>,
    active: false,
    testId: 'nav-stats',
  },
];

describe('BottomNavigation アクセシビリティテスト', () => {
  const mockOnItemClick = vi.fn();

  describe('基本的なアクセシビリティ', () => {
    it('WCAG 2.1 AA違反がないこと', async () => {
      const { container } = render(
        <BottomNavigation items={mockItems} onItemClick={mockOnItemClick} />
      );

      const results = await axe(container, {
        rules: {
          // ページ全体のランドマークはコンポーネントテストでは除外
          region: { enabled: false },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('WCAG 2.1 AA違反がないこと（バッジ表示時）', async () => {
      const itemsWithBadge = [
        ...mockItems.slice(0, 2),
        { ...mockItems[2], badge: 5 },
      ];

      const { container } = render(
        <BottomNavigation items={itemsWithBadge} onItemClick={mockOnItemClick} />
      );

      const results = await axe(container, {
        rules: {
          region: { enabled: false },
        },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('ARIA属性の検証（Tabs Pattern）', () => {
    it('各タブにrole="tab"があること', () => {
      render(
        <BottomNavigation items={mockItems} onItemClick={mockOnItemClick} />
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('アクティブなタブにaria-selected="true"があること', () => {
      render(
        <BottomNavigation items={mockItems} onItemClick={mockOnItemClick} />
      );

      const activeTab = screen.getByTestId('nav-form');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });

    it('非アクティブなタブにaria-selected="false"があること', () => {
      render(
        <BottomNavigation items={mockItems} onItemClick={mockOnItemClick} />
      );

      const inactiveTab = screen.getByTestId('nav-list');
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    });

    it('アクティブなタブにaria-current="page"があること', () => {
      render(
        <BottomNavigation items={mockItems} onItemClick={mockOnItemClick} />
      );

      const activeTab = screen.getByTestId('nav-form');
      expect(activeTab).toHaveAttribute('aria-current', 'page');
    });

    it('非アクティブなタブにaria-currentがないこと', () => {
      render(
        <BottomNavigation items={mockItems} onItemClick={mockOnItemClick} />
      );

      const inactiveTab = screen.getByTestId('nav-list');
      expect(inactiveTab).not.toHaveAttribute('aria-current');
    });

    it('各タブに適切なaria-labelがあること', () => {
      render(
        <BottomNavigation items={mockItems} onItemClick={mockOnItemClick} />
      );

      const formTab = screen.getByTestId('nav-form');
      const listTab = screen.getByTestId('nav-list');
      const statsTab = screen.getByTestId('nav-stats');

      expect(formTab).toHaveAttribute('aria-label', '記録');
      expect(listTab).toHaveAttribute('aria-label', '一覧');
      expect(statsTab).toHaveAttribute('aria-label', '統計');
    });
  });

  describe('キーボードアクセシビリティ', () => {
    it('Tabキーでフォーカス可能であること', async () => {
      const user = userEvent.setup();

      render(
        <BottomNavigation items={mockItems} onItemClick={mockOnItemClick} />
      );

      await user.tab();

      const firstTab = screen.getByTestId('nav-form');
      expect(firstTab).toHaveFocus();
    });

    it('各タブがフォーカス可能（tabIndex=0）であること', () => {
      render(
        <BottomNavigation items={mockItems} onItemClick={mockOnItemClick} />
      );

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('tabindex', '0');
      });
    });

    it('Enterキーでタブを選択できること', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();

      render(
        <BottomNavigation items={mockItems} onItemClick={onItemClick} />
      );

      await user.tab();
      await user.tab(); // 2番目のタブに移動
      await user.keyboard('{Enter}');

      expect(onItemClick).toHaveBeenCalledWith('list');
    });

    it('Spaceキーでタブを選択できること', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();

      render(
        <BottomNavigation items={mockItems} onItemClick={onItemClick} />
      );

      await user.tab();
      await user.tab(); // 2番目のタブに移動
      await user.keyboard(' ');

      expect(onItemClick).toHaveBeenCalledWith('list');
    });
  });

  describe('タブ切り替え時のaria-selected更新', () => {
    it('タブクリックでaria-selectedが更新されること', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();

      const { rerender } = render(
        <BottomNavigation items={mockItems} onItemClick={onItemClick} />
      );

      // 初期状態: formがアクティブ
      expect(screen.getByTestId('nav-form')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByTestId('nav-list')).toHaveAttribute(
        'aria-selected',
        'false'
      );

      // listタブをクリック
      await user.click(screen.getByTestId('nav-list'));
      expect(onItemClick).toHaveBeenCalledWith('list');

      // 状態更新後に再レンダー
      const updatedItems = mockItems.map((item) => ({
        ...item,
        active: item.id === 'list',
      }));

      rerender(
        <BottomNavigation items={updatedItems} onItemClick={onItemClick} />
      );

      // listがアクティブに
      expect(screen.getByTestId('nav-form')).toHaveAttribute(
        'aria-selected',
        'false'
      );
      expect(screen.getByTestId('nav-list')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  describe('バッジのアクセシビリティ', () => {
    it('バッジが表示されてもWCAG違反がないこと', async () => {
      const itemsWithBadge = mockItems.map((item, i) =>
        i === 1 ? { ...item, badge: 5 } : item
      );

      const { container } = render(
        <BottomNavigation items={itemsWithBadge} onItemClick={mockOnItemClick} />
      );

      const results = await axe(container, {
        rules: {
          region: { enabled: false },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('大きな数字（99+）のバッジでもWCAG違反がないこと', async () => {
      const itemsWithLargeBadge = mockItems.map((item, i) =>
        i === 1 ? { ...item, badge: 150 } : item
      );

      const { container } = render(
        <BottomNavigation
          items={itemsWithLargeBadge}
          onItemClick={mockOnItemClick}
        />
      );

      const results = await axe(container, {
        rules: {
          region: { enabled: false },
        },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('フォーカス管理', () => {
    it('タブクリック後もフォーカスが維持されること', async () => {
      const user = userEvent.setup();

      render(
        <BottomNavigation items={mockItems} onItemClick={mockOnItemClick} />
      );

      const listTab = screen.getByTestId('nav-list');
      await user.click(listTab);

      // クリックしたタブにフォーカスが維持される
      expect(listTab).toHaveFocus();
    });
  });
});
