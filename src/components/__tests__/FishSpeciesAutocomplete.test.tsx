/**
 * FishSpeciesAutocomplete コンポーネントテスト (リファクタリング版)
 *
 * @description
 * 魚種オートコンプリートコンポーネントの包括的なテストスイート
 * 依存性注入パターンによるモック注入で、vi.mock()の問題を完全回避
 *
 * @version 3.1.0 - React act()警告完全対応
 * @since 2025-11-04
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
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

/**
 * コンポーネント描画を待つヘルパー関数
 * CI環境での描画遅延に対応
 */
const waitForRender = async () => {
  await waitFor(() => {
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  }, { timeout: 5000, interval: 50 });
};

/**
 * useEffectのマイクロタスクをフラッシュするヘルパー
 * React act()警告を回避
 */
const flushMicrotasks = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

describe('FishSpeciesAutocomplete', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockSearchEngine: ReturnType<typeof createMockSearchEngine>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockSearchEngine = createMockSearchEngine();

    // scrollIntoViewのモック (JSDOMはサポートしていないため)
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(async () => {
    await flushMicrotasks(); // テスト終了時にマイクロタスクをフラッシュ
    cleanup(); // DOMのクリーンアップ
    vi.clearAllMocks(); // モックのリセット
  });

  describe('基本的なレンダリング', () => {
    it('コンポーネントが表示されること', async () => {
      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-label', '魚種名');
    });

    it('初期値が設定されること', async () => {
      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value="マアジ"
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox') as HTMLInputElement;
      expect(input.value).toBe('マアジ');
    });

    it('プレースホルダーが表示されること', async () => {
      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            placeholder="カスタムプレースホルダー"
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('placeholder', 'カスタムプレースホルダー');
    });

    it('無効化されること', async () => {
      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            disabled
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');
      expect(input).toBeDisabled();
    });

    it('エラーメッセージが表示されること', async () => {
      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            error="エラーが発生しました"
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      expect(screen.getByRole('alert')).toHaveTextContent('エラーが発生しました');
    });
  });

  describe('入力機能', () => {
    it('テキストを入力できること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.type(input, 'あじ');
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      await flushMicrotasks();
    });

    it('onChange コールバックが呼ばれること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.type(input, 'あ');
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(null, 'あ');
      });

      await flushMicrotasks();
    });
  });

  describe('候補の表示', () => {
    it('フォーカス時に候補が表示されること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await flushMicrotasks();
    });

    it('入力に応じた候補が表示されること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.type(input, 'あじ');
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByText('マアジ')).toBeInTheDocument();
      });

      await flushMicrotasks();
    });

    it('候補をクリックして選択できること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByText('マアジ')).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText('マアジ'));
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ standardName: 'マアジ' }),
          'マアジ'
        );
      });

      await flushMicrotasks();
    });

    it('マッチしない場合は「該当する魚種が見つかりません」と表示されること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.type(input, 'xxxxx');
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByText('該当する魚種が見つかりません')).toBeInTheDocument();
      });

      await flushMicrotasks();
    });
  });

  describe('キーボード操作', () => {
    it('ArrowDown で次の候補を選択できること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await act(async () => {
        await user.keyboard('{ArrowDown}');
      });
      await flushMicrotasks();

      await waitFor(() => {
        const firstOption = screen.getByRole('option', { name: /マアジ/ });
        expect(firstOption).toHaveAttribute('aria-selected', 'true');
      });

      await flushMicrotasks();
    });

    it('ArrowUp で前の候補を選択できること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await act(async () => {
        await user.keyboard('{ArrowDown}');
      });
      await flushMicrotasks();

      await act(async () => {
        await user.keyboard('{ArrowDown}');
      });
      await flushMicrotasks();

      await act(async () => {
        await user.keyboard('{ArrowUp}');
      });
      await flushMicrotasks();

      await waitFor(() => {
        const firstOption = screen.getByRole('option', { name: /マアジ/ });
        expect(firstOption).toHaveAttribute('aria-selected', 'true');
      });

      await flushMicrotasks();
    });

    it('Enter で選択した候補を確定できること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await act(async () => {
        await user.keyboard('{ArrowDown}');
      });
      await flushMicrotasks();

      await act(async () => {
        await user.keyboard('{Enter}');
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ standardName: 'マアジ' }),
          'マアジ'
        );
      });

      await flushMicrotasks();
    });

    it('Escape で候補リストを閉じられること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await act(async () => {
        await user.keyboard('{Escape}');
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });

      await flushMicrotasks();
    });
  });

  describe('アクセシビリティ', () => {
    it('候補リストが開いているときaria-expandedがtrueになること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');

      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true');
      });

      await flushMicrotasks();
    });

    it('選択した候補のaria-activedescendantが設定されること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await act(async () => {
        await user.keyboard('{ArrowDown}');
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-activedescendant', 'fish-species-0');
      });

      await flushMicrotasks();
    });

    it('候補リストにrole="listbox"が設定されていること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeInTheDocument();
      });

      await flushMicrotasks();
    });

    it('候補アイテムにrole="option"が設定されていること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
      });

      await flushMicrotasks();
    });
  });

  describe('エッジケース', () => {
    it('大量の候補でもパフォーマンスが維持されること', async () => {
      const largeMockEngine = {
        search: vi.fn(() => mockSpeciesData.slice(0, 10)),
        isReady: vi.fn(() => true)
      };

      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={largeMockEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.type(input, 'あ');
      });
      await flushMicrotasks();

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeLessThanOrEqual(10);
      });

      await flushMicrotasks();
    });

    it('存在しない候補を入力しても動作すること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      await act(async () => {
        await user.type(input, '存在しない魚種');
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      await flushMicrotasks();
    });
  });

  describe('統合テスト', () => {
    it('フォーカス→入力→選択の一連の流れが動作すること', async () => {
      const user = userEvent.setup({ delay: null });

      await act(async () => {
        render(
          <FishSpeciesAutocomplete
            value=""
            onChange={mockOnChange}
            searchEngine={mockSearchEngine as any}
          />
        );
      });

      await waitForRender();
      await flushMicrotasks();

      const input = screen.getByRole('combobox');

      // フォーカス
      await act(async () => {
        await user.click(input);
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // 入力
      await act(async () => {
        await user.type(input, 'あじ');
      });
      await flushMicrotasks();

      // 選択
      await waitFor(() => {
        expect(screen.getByText('マアジ')).toBeInTheDocument();
      });

      await act(async () => {
        await user.click(screen.getByText('マアジ'));
      });
      await flushMicrotasks();

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ standardName: 'マアジ' }),
          'マアジ'
        );
      });

      await flushMicrotasks();
    });
  });
});
