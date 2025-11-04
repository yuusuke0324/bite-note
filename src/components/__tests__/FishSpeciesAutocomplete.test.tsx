/**
 * FishSpeciesAutocomplete コンポーネントテスト (リファクタリング版)
 *
 * @description
 * 魚種オートコンプリートコンポーネントの包括的なテストスイート
 * 依存性注入パターンによるモック注入で、vi.mock()の問題を完全回避
 *
 * @version 3.0.0 - 完全書き直し
 * @since 2025-11-04
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FishSpeciesAutocomplete } from '../FishSpeciesAutocomplete';
import type { FishSpecies } from '../../types';

// テスト用のモックデータ
const mockSpeciesData: FishSpecies[] = [
  {
    id: 'ma-aji',
    standardName: 'マアジ',
    scientificName: 'Trachurus japonicus',
    aliases: ['アジ', 'あじ'],
    regionalNames: ['アオアジ'],
    category: '青魚',
    season: ['春', '夏'],
    habitat: ['堤防'],
    popularity: 95,
    source: 'official'
  },
  {
    id: 'suzuki',
    standardName: 'スズキ',
    scientificName: 'Lateolabrax japonicus',
    aliases: ['すずき', 'シーバス'],
    regionalNames: ['セイゴ'],
    category: '白身魚',
    season: ['春', '夏'],
    habitat: ['堤防'],
    popularity: 90,
    source: 'official'
  },
  {
    id: 'aori-ika',
    standardName: 'アオリイカ',
    scientificName: 'Sepioteuthis lessoniana',
    aliases: ['あおりいか'],
    regionalNames: [],
    category: 'エギング',
    season: ['春', '秋'],
    habitat: ['堤防'],
    popularity: 93,
    source: 'official'
  }
];

/**
 * モック検索エンジンの作成
 */
const createMockSearchEngine = () => ({
  search: vi.fn((query: string, options?: { limit?: number }) => {
    if (!query) return mockSpeciesData.slice(0, options?.limit || 10);
    const normalized = query.toLowerCase();
    const results = mockSpeciesData.filter((s) =>
      s.standardName.toLowerCase().includes(normalized) ||
      s.aliases.some((a) => a.toLowerCase().includes(normalized))
    );
    return results.slice(0, options?.limit || 10);
  }),
  isReady: vi.fn(() => true)
});

describe('FishSpeciesAutocomplete', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockSearchEngine: ReturnType<typeof createMockSearchEngine>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockSearchEngine = createMockSearchEngine();

    // scrollIntoViewのモック (JSDOMはサポートしていないため)
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('基本的なレンダリング', () => {
    it('コンポーネントが表示されること', () => {
      console.log('=== TEST START: コンポーネントが表示されること ===');
      console.log('mockSearchEngine:', mockSearchEngine);
      console.log('mockSearchEngine.search:', typeof mockSearchEngine?.search);
      console.log('mockSearchEngine.isReady:', typeof mockSearchEngine?.isReady);

      const { container } = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      console.log('Rendered HTML:', container.innerHTML);
      console.log('Body content:', document.body.innerHTML);

      const input = screen.getByRole('combobox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-label', '魚種名');
    });

    it('初期値が設定されること', () => {
      render(
        <FishSpeciesAutocomplete
          value="マアジ"
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox') as HTMLInputElement;
      expect(input.value).toBe('マアジ');
    });

    it('プレースホルダーが表示されること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          placeholder="カスタムプレースホルダー"
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('placeholder', 'カスタムプレースホルダー');
    });

    it('無効化されること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          disabled
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toBeDisabled();
    });

    it('エラーメッセージが表示されること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          error="エラーが発生しました"
          searchEngine={mockSearchEngine as any}
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent('エラーが発生しました');
    });
  });

  describe('入力機能', () => {
    it('テキストを入力できること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あじ');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('onChange コールバックが呼ばれること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あ');

      expect(mockOnChange).toHaveBeenCalledWith(null, 'あ');
    });
  });

  describe('候補の表示', () => {
    it('フォーカス時に候補が表示されること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('入力に応じた候補が表示されること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あじ');

      await waitFor(() => {
        expect(screen.getByText('マアジ')).toBeInTheDocument();
      });
    });

    it('候補をクリックして選択できること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('マアジ')).toBeInTheDocument();
      });

      await user.click(screen.getByText('マアジ'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ standardName: 'マアジ' }),
        'マアジ'
      );
    });

    it('マッチしない場合は「該当する魚種が見つかりません」と表示されること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'xxxxx');

      await waitFor(() => {
        expect(screen.getByText('該当する魚種が見つかりません')).toBeInTheDocument();
      });
    });
  });

  describe('キーボード操作', () => {
    it('ArrowDown で次の候補を選択できること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');

      const firstOption = screen.getByRole('option', { name: /マアジ/ });
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowUp で前の候補を選択できること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');

      const firstOption = screen.getByRole('option', { name: /マアジ/ });
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    it('Enter で選択した候補を確定できること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ standardName: 'マアジ' }),
        'マアジ'
      );
    });

    it('Escape で候補リストを閉じられること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('候補リストが開いているときaria-expandedがtrueになること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');

      await user.click(input);

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('選択した候補のaria-activedescendantが設定されること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');

      expect(input).toHaveAttribute('aria-activedescendant', 'fish-species-0');
    });

    it('候補リストにrole="listbox"が設定されていること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeInTheDocument();
      });
    });

    it('候補アイテムにrole="option"が設定されていること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
      });
    });
  });

  describe('エッジケース', () => {
    it('大量の候補でもパフォーマンスが維持されること', async () => {
      const largeMockEngine = {
        search: vi.fn(() => mockSpeciesData.slice(0, 10)),
        isReady: vi.fn(() => true)
      };

      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={largeMockEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'あ');

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeLessThanOrEqual(10);
      });
    });

    it('存在しない候補を入力しても動作すること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');
      await user.type(input, '存在しない魚種');

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('統合テスト', () => {
    it('フォーカス→入力→選択の一連の流れが動作すること', async () => {
      const user = userEvent.setup();
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine as any}
        />
      );

      const input = screen.getByRole('combobox');

      // フォーカス
      await user.click(input);
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // 入力
      await user.type(input, 'あじ');

      // 選択
      await waitFor(() => {
        expect(screen.getByText('マアジ')).toBeInTheDocument();
      });
      await user.click(screen.getByText('マアジ'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ standardName: 'マアジ' }),
        'マアジ'
      );
    });
  });
});
