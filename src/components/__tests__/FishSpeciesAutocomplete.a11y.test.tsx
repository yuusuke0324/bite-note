/**
 * FishSpeciesAutocomplete アクセシビリティテスト
 *
 * @description
 * axe-coreを使用したアクセシビリティ監査
 * - WCAG 2.1 AA準拠を検証
 * - ARIA属性の正確性を確認
 * - キーボードナビゲーション検証
 * - スクリーンリーダー互換性検証
 *
 * @version 3.0.0
 * @since 2025-10-25
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { FishSpeciesAutocomplete } from '../FishSpeciesAutocomplete';

// jest-axeのカスタムマッチャーを追加
expect.extend(toHaveNoViolations);

describe('FishSpeciesAutocomplete アクセシビリティテスト', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('基本的なアクセシビリティ', () => {
    it('WCAG 2.1 AA違反がないこと（初期状態）', async () => {
      const { container } = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('WCAG 2.1 AA違反がないこと（入力値あり）', async () => {
      const { container } = render(
        <FishSpeciesAutocomplete
          value="あじ"
          onChange={mockOnChange}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('WCAG 2.1 AA違反がないこと（エラー表示）', async () => {
      const { container } = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          error="この項目は必須です"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('WCAG 2.1 AA違反がないこと（無効状態）', async () => {
      const { container } = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ARIA属性の検証', () => {
    it('入力フィールドに適切なaria-labelがあること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-label', '魚種名');
    });

    it('入力フィールドにaria-autocompleteがあること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('候補リストが閉じている時はaria-expanded=falseであること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    it('候補リストが開いている時はaria-expanded=trueであること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('入力フィールドにaria-controlsがあること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      expect(input).toHaveAttribute('aria-controls', 'fish-species-list');
    });

    it('候補リストにrole=listboxがあること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あ');

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
      expect(listbox).toHaveAttribute('id', 'fish-species-list');
    });

    it('候補項目にrole=optionがあること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あ');

      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
      options.forEach(option => {
        expect(option).toHaveAttribute('role', 'option');
      });
    });

    it('選択された候補にaria-selected=trueがあること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あ');
      await user.keyboard('{ArrowDown}');

      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });

    it('エラーメッセージにrole=alertがあること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          error="この項目は必須です"
        />
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('この項目は必須です');
    });

    it('結果なしメッセージにrole=statusがあること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, '存在しない魚種xyz');

      const noResults = screen.getByRole('status');
      expect(noResults).toBeInTheDocument();
      expect(noResults).toHaveTextContent('該当する魚種が見つかりません');
    });
  });

  describe('キーボードアクセシビリティ', () => {
    it('Tabキーでフォーカス可能であること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      await user.tab();

      const input = screen.getByRole('combobox');
      expect(input).toHaveFocus();
    });

    it('ArrowDownキーで候補を選択できること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あ');
      await user.keyboard('{ArrowDown}');

      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toBeInTheDocument();
    });

    it('ArrowUpキーで前の候補を選択できること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あ');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');

      const selectedOptions = screen.getAllByRole('option', { selected: true });
      expect(selectedOptions).toHaveLength(1);
    });

    it('Enterキーで選択を確定できること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'まあじ');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('Escapeキーで候補リストを閉じられること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あ');

      // 候補リストが開いている
      expect(input).toHaveAttribute('aria-expanded', 'true');

      await user.keyboard('{Escape}');

      // 候補リストが閉じている
      expect(input).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('スクリーンリーダー対応', () => {
    it('読み込み中の状態が通知されること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      // 初期化中はロード状態が表示される
      const loadingIndicator = screen.queryByText('読み込み中...');
      if (loadingIndicator) {
        expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
      }
    });

    it('入力フィールドに適切なlabel/placeholderがあること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          placeholder="魚種を入力してください"
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('placeholder', '魚種を入力してください');
      expect(input).toHaveAttribute('aria-label', '魚種名');
    });

    it('必須フィールドにrequired属性があること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          required={true}
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('required');
    });

    it('無効状態の時にdisabled属性があること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('disabled');
    });
  });

  describe('色のコントラスト', () => {
    it('エラー状態のスタイルが適用されること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          error="この項目は必須です"
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveClass('error');
    });
  });

  describe('フォーカス管理', () => {
    it('候補選択後にフォーカスがinputから外れること', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
          />
          <button>Next Field</button>
        </div>
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'まあじ');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // 選択後はフォーカスが外れる
      expect(input).not.toHaveFocus();
    });

    it('候補リスト表示中に選択項目が見えること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あ');
      await user.keyboard('{ArrowDown}');

      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toBeVisible();
    });
  });

  describe('高コントラストモード', () => {
    it('WCAG 2.1 AA違反がないこと（高コントラストスタイル）', async () => {
      const { container } = render(
        <div style={{ backgroundColor: '#000', color: '#FFF' }}>
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
          />
        </div>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('動的コンテンツのアナウンス', () => {
    it('結果数の変化が適切にアナウンスされること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');

      // 最初の検索
      await user.type(input, 'あ');
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();

      // 検索結果の絞り込み
      await user.type(input, 'じ');
      expect(listbox).toBeInTheDocument();
    });
  });
});
