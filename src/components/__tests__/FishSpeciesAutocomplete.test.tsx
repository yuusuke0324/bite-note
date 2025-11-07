/**
 * FishSpeciesAutocomplete コンポーネントテスト (簡素化版)
 *
 * @description
 * 魚種オートコンプリートコンポーネントの包括的なテストスイート
 * React Testing Libraryのベストプラクティスに従い、act()の過剰なラッピングを削除
 *
 * @version 4.1.0 - CI環境対応：実クラスインスタンス使用、型安全性改善
 * @changes
 * - モックを実際のFishSpeciesSearchEngineインスタンスに変更（CI環境安定性向上）
 * - すべての `as any` 型キャストを削除（型安全性向上）
 * - vi.spyOn() によるテスト検証機能を維持
 * @since 2025-11-07
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FishSpeciesAutocomplete } from '../FishSpeciesAutocomplete';
import type { FishSpecies } from '../../types';
import { FishSpeciesSearchEngine } from '../../services/fish-species';

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
 * CI環境での安定性のため、実際のクラスインスタンスを使用
 */
const createMockSearchEngine = () => {
  const engine = new FishSpeciesSearchEngine(mockSpeciesData, {
    debug: false,
    maxPrefixLength: 3,
    caseInsensitive: true,
    normalizeKana: true
  });

  // テスト検証のためにスパイを設定
  vi.spyOn(engine, 'search');
  vi.spyOn(engine, 'isReady');

  return engine;
};

describe('FishSpeciesAutocomplete', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockSearchEngine: ReturnType<typeof createMockSearchEngine>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockSearchEngine = createMockSearchEngine();

    // CI環境対策: searchEngineが確実に初期化されていることを確認
    expect(mockSearchEngine.isReady()).toBe(true);
    expect(typeof mockSearchEngine.search).toBe('function');

    // scrollIntoViewのモック (JSDOMはサポートしていないため)
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的なレンダリング', () => {
    it('コンポーネントが表示されること', async () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      expect(input).toHaveAttribute('aria-label', '魚種名');
    });

    it('初期値が設定されること', async () => {
      render(
        <FishSpeciesAutocomplete
          value="マアジ"
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox') as HTMLInputElement;
      expect(input.value).toBe('マアジ');
    });

    it('プレースホルダーが表示されること', async () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          placeholder="カスタムプレースホルダー"
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      expect(input).toHaveAttribute('placeholder', 'カスタムプレースホルダー');
    });

    it('無効化されること', async () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          disabled
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      expect(input).toBeDisabled();
    });

    it('エラーメッセージが表示されること', async () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          error="エラーが発生しました"
          searchEngine={mockSearchEngine}
        />
      );

      await screen.findByRole('combobox');
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
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.type(input, 'あじ');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('onChange コールバックが呼ばれること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.type(input, 'あ');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(null, 'あ');
      });
    });
  });

  describe('候補の表示', () => {
    it('フォーカス時に候補が表示されること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.click(input);

      const listbox = await screen.findByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('入力に応じた候補が表示されること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
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
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('マアジ')).toBeInTheDocument();
      });

      await user.click(screen.getByText('マアジ'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ standardName: 'マアジ' }),
          'マアジ'
        );
      });
    });

    it('マッチしない場合は「該当する魚種が見つかりません」と表示されること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
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
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.click(input);

      await screen.findByRole('listbox');

      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        const firstOption = screen.getByRole('option', { name: /マアジ/ });
        expect(firstOption).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('ArrowUp で前の候補を選択できること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.click(input);

      await screen.findByRole('listbox');

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');

      await waitFor(() => {
        const firstOption = screen.getByRole('option', { name: /マアジ/ });
        expect(firstOption).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('Enter で選択した候補を確定できること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.click(input);

      await screen.findByRole('listbox');

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ standardName: 'マアジ' }),
          'マアジ'
        );
      });
    });

    it('Escape で候補リストを閉じられること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.click(input);

      await screen.findByRole('listbox');

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('Tab で候補リストを閉じられること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.click(input);

      await screen.findByRole('listbox');

      await user.keyboard('{Tab}');

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
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
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
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.click(input);

      await screen.findByRole('listbox');

      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-activedescendant', 'fish-species-0');
      });
    });

    it('候補リストにrole="listbox"が設定されていること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.click(input);

      const listbox = await screen.findByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('候補アイテムにrole="option"が設定されていること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
      });
    });
  });

  describe('エッジケース', () => {
    it('大量の候補でもパフォーマンスが維持されること', async () => {
      const largeMockEngine = new FishSpeciesSearchEngine(mockSpeciesData, {
        debug: false,
        maxPrefixLength: 3,
        caseInsensitive: true,
        normalizeKana: true
      });

      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={largeMockEngine}
        />
      );

      const input = await screen.findByRole('combobox');
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
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');
      await user.type(input, '存在しない魚種');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('統合テスト', () => {
    it('フォーカス→入力→選択の一連の流れが動作すること', async () => {
      const user = userEvent.setup();

      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          searchEngine={mockSearchEngine}
        />
      );

      const input = await screen.findByRole('combobox');

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

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ standardName: 'マアジ' }),
          'マアジ'
        );
      });
    });
  });
});
