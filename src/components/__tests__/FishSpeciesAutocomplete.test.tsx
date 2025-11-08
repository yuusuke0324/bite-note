/**
 * FishSpeciesAutocomplete コンポーネントテスト (Issue #38対応版)
 *
 * @description
 * 魚種オートコンプリートコンポーネントの包括的なテストスイート
 * React Testing Libraryのベストプラクティスに従い、act()警告を解消
 *
 * @version 5.0.0 - Issue #38対応：グローバルシングルトン使用、act()警告解消
 * @changes
 * - searchEngineプロパティ削除（グローバルシングルトン使用）
 * - act()による適切な状態更新ラッピング
 * - waitForによる状態安定化待機を強化
 * @since 2025-11-08
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FishSpeciesAutocomplete } from '../FishSpeciesAutocomplete';

describe('FishSpeciesAutocomplete', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // CI環境ではJSDOM初期化を確実に待つ（Tech-lead recommendation for Issue #37）
    if (process.env.CI) {
      // より長い待機時間とポーリングでbody確認
      await waitFor(() => {
        if (!document.body || document.body.children.length === 0) {
          throw new Error('JSDOM not ready');
        }
      }, { timeout: 5000, interval: 100 });
    } else {
      // ローカル環境は高速化のため最小限
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    mockOnChange = vi.fn();

    // scrollIntoViewのモック (JSDOMはサポートしていないため)
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // CI環境ではsetupTests.tsが作成したroot containerを保持するため、body.innerHTML = ''を実行しない
    // 非CI環境のみクリーンアップを実施（Issue #37 fix）
    if (!process.env.CI) {
      document.body.innerHTML = '';
    }
  });

  describe('基本的なレンダリング', () => {
    it('コンポーネントが表示されること', async () => {
      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      // CI環境では result.containerから直接クエリを実行（Issue #37 fix）
      const input = await within(result.container).findByRole('combobox');
      expect(input).toHaveAttribute('aria-label', '魚種名');
    });

    it('初期値が設定されること', async () => {
      const result = render(
        <FishSpeciesAutocomplete
          value="マアジ"
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox') as HTMLInputElement;
      expect(input.value).toBe('マアジ');
    });

    it('プレースホルダーが表示されること', async () => {
      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          placeholder="カスタムプレースホルダー"
        />
      );

      const input = await within(result.container).findByRole('combobox');
      expect(input).toHaveAttribute('placeholder', 'カスタムプレースホルダー');
    });

    it('無効化されること', async () => {
      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          disabled
        />
      );

      const input = await within(result.container).findByRole('combobox');
      expect(input).toBeDisabled();
    });

    it('エラーメッセージが表示されること', async () => {
      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          error="エラーが発生しました"
        />
      );

      await within(result.container).findByRole('combobox');
      expect(within(result.container).getByRole('alert')).toHaveTextContent('エラーが発生しました');
    });
  });

  describe('入力機能', () => {
    it('テキストを入力できること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.type(input, 'あじ');
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('onChange コールバックが呼ばれること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.type(input, 'あ');
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(null, 'あ');
      });
    });
  });

  describe('候補の表示', () => {
    it('フォーカス時に候補が表示されること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.click(input);
      });

      const listbox = await within(result.container).findByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('入力に応じた候補が表示されること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.type(input, 'あじ');
      });

      await waitFor(() => {
        expect(within(result.container).getByText('マアジ')).toBeInTheDocument();
      });
    });

    it('候補をクリックして選択できること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.click(input);
      });

      await waitFor(() => {
        expect(within(result.container).getByText('マアジ')).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(within(result.container).getByText('マアジ'));
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ standardName: 'マアジ' }),
          'マアジ'
        );
      });
    });

    it('マッチしない場合は「該当する魚種が見つかりません」と表示されること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.type(input, 'xxxxx');
      });

      await waitFor(() => {
        expect(within(result.container).getByText('該当する魚種が見つかりません')).toBeInTheDocument();
      });
    });
  });

  describe('キーボード操作', () => {
    // TODO: Issue #41 - テストデータの実際の並び順に依存しないテスト設計に改善
    it.skip('ArrowDown で次の候補を選択できること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      // 「あ」と入力してマアジを確実に候補に表示
      await act(async () => {
        await user.type(input, 'あ');
      });

      await waitFor(() => {
        expect(within(result.container).getByText('マアジ')).toBeInTheDocument();
      });

      await act(async () => {
        await user.keyboard('{ArrowDown}');
      });

      await waitFor(() => {
        const firstOption = within(result.container).getByRole('option', { name: /マアジ/ });
        expect(firstOption).toHaveAttribute('aria-selected', 'true');
      });
    });

    // TODO: Issue #41 - テストデータの実際の並び順に依存しないテスト設計に改善
    it.skip('ArrowUp で前の候補を選択できること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      // 「あ」と入力してマアジを確実に候補に表示
      await act(async () => {
        await user.type(input, 'あ');
      });

      await waitFor(() => {
        expect(within(result.container).getByText('マアジ')).toBeInTheDocument();
      });

      await act(async () => {
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{ArrowUp}');
      });

      await waitFor(() => {
        const firstOption = within(result.container).getByRole('option', { name: /マアジ/ });
        expect(firstOption).toHaveAttribute('aria-selected', 'true');
      });
    });

    // TODO: Issue #41 - テストデータの実際の並び順に依存しないテスト設計に改善
    it.skip('Enter で選択した候補を確定できること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      // 「あ」と入力してマアジを確実に候補に表示
      await act(async () => {
        await user.type(input, 'あ');
      });

      await waitFor(() => {
        expect(within(result.container).getByText('マアジ')).toBeInTheDocument();
      });

      await act(async () => {
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{Enter}');
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ standardName: 'マアジ' }),
          'マアジ'
        );
      });
    });

    it('Escape で候補リストを閉じられること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.click(input);
      });

      await within(result.container).findByRole('listbox');

      await act(async () => {
        await user.keyboard('{Escape}');
      });

      await waitFor(() => {
        expect(within(result.container).queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('Tab で候補リストを閉じられること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.click(input);
      });

      await within(result.container).findByRole('listbox');

      await act(async () => {
        await user.keyboard('{Tab}');
      });

      await waitFor(() => {
        expect(within(result.container).queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('候補リストが開いているときaria-expandedがtrueになること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');

      await act(async () => {
        await user.click(input);
      });

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('選択した候補のaria-activedescendantが設定されること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.click(input);
      });

      await within(result.container).findByRole('listbox');

      await act(async () => {
        await user.keyboard('{ArrowDown}');
      });

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-activedescendant', 'fish-species-0');
      });
    });

    it('候補リストにrole="listbox"が設定されていること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.click(input);
      });

      const listbox = await within(result.container).findByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('候補アイテムにrole="option"が設定されていること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.click(input);
      });

      await waitFor(() => {
        const options = within(result.container).getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
      });
    });
  });

  describe('エッジケース', () => {
    it('大量の候補でもパフォーマンスが維持されること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.type(input, 'あ');
      });

      await waitFor(() => {
        const options = within(result.container).getAllByRole('option');
        expect(options.length).toBeLessThanOrEqual(10);
      });
    });

    it('存在しない候補を入力しても動作すること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      await act(async () => {
        await user.type(input, '存在しない魚種');
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('統合テスト', () => {
    it('フォーカス→入力→選択の一連の流れが動作すること', async () => {
      const user = userEvent.setup({ delay: null });

      const result = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = await within(result.container).findByRole('combobox');

      // フォーカス
      await act(async () => {
        await user.click(input);
      });

      await waitFor(() => {
        expect(within(result.container).getByRole('listbox')).toBeInTheDocument();
      });

      // 入力
      await act(async () => {
        await user.type(input, 'あじ');
      });

      // 選択
      await waitFor(() => {
        expect(within(result.container).getByText('マアジ')).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(within(result.container).getByText('マアジ'));
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ standardName: 'マアジ' }),
          'マアジ'
        );
      });
    });
  });
});
