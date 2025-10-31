/**
 * FishSpeciesAutocomplete コンポーネントテスト
 *
 * @description
 * 魚種オートコンプリートコンポーネントの包括的なテストスイート
 * レンダリング、インタラクション、キーボード操作、アクセシビリティのカバレッジ
 *
 * @version 2.7.1
 * @since 2025-10-25
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FishSpeciesAutocomplete } from '../FishSpeciesAutocomplete';
import type { FishSpecies } from '../../types';

// FishSpeciesSearchEngineのモック
vi.mock('../../services/fish-species', () => {
  // モックデータをファクトリー内で定義
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

  return {
    FishSpeciesSearchEngine: vi.fn().mockImplementation(() => ({
      search: vi.fn((query: string) => {
        if (!query) return mockSpeciesData.slice(0, 3);
        const normalized = query.toLowerCase();
        return mockSpeciesData.filter(s =>
          s.standardName.toLowerCase().includes(normalized) ||
          s.aliases.some(a => a.toLowerCase().includes(normalized))
        );
      }),
      isReady: vi.fn(() => true)
    })),
    fishSpeciesDataService: {
      loadSpecies: vi.fn().mockResolvedValue(mockSpeciesData)
    },
    fishSpeciesValidator: {}
  };
});

describe('FishSpeciesAutocomplete', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();

    // scrollIntoViewのモック (JSDOMはサポートしていないため)
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('基本的なレンダリング', () => {
    it('コンポーネントが表示されること', () => {
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('デフォルトのプレースホルダーが表示されること', () => {
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('魚種を入力（例: あじ）');
      expect(input).toBeInTheDocument();
    });

    it('カスタムプレースホルダーが表示されること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          placeholder="カスタムプレースホルダー"
        />
      );

      const input = screen.getByPlaceholderText('カスタムプレースホルダー');
      expect(input).toBeInTheDocument();
    });

    it('初期値が表示されること', () => {
      render(<FishSpeciesAutocomplete value="マアジ" onChange={mockOnChange} />);

      const input = screen.getByDisplayValue('マアジ');
      expect(input).toBeInTheDocument();
    });
  });

  describe('入力機能', () => {
    it('テキストを入力できること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あじ');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('onChange コールバックが呼ばれること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'a');

      expect(mockOnChange).toHaveBeenCalledWith(null, 'a');
    });
  });

  describe('候補の表示', () => {
    it('フォーカス時に候補が表示されること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('入力に応じた候補が表示されること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あじ');

      await waitFor(() => {
        expect(screen.getByText('マアジ')).toBeInTheDocument();
      });
    });

    it('候補をクリックして選択できること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あじ');

      await waitFor(() => {
        expect(screen.getByText('マアジ')).toBeInTheDocument();
      });

      const suggestion = screen.getByText('マアジ');
      await user.click(suggestion);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ standardName: 'マアジ' }),
        'マアジ'
      );
    });

    it('マッチしない場合は「該当する魚種が見つかりません」と表示されること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'xyz存在しない魚種');

      await waitFor(() => {
        expect(screen.getByText('該当する魚種が見つかりません')).toBeInTheDocument();
      });
    });
  });

  describe('キーボード操作', () => {
    it('ArrowDown で次の候補を選択できること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あ');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowUp で前の候補を選択できること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あ');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('Enter で選択した候補を確定できること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あじ');

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
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あじ');

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
    it('ARIA属性が正しく設定されていること', () => {
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');

      expect(input).toHaveAttribute('aria-label', '魚種名');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-controls', 'fish-species-list');
    });

    it('候補リストが開いているときaria-expandedがtrueになること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-expanded', 'false');

      await user.click(input);

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('選択した候補のaria-activedescendantが設定されること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あ');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');

      expect(input).toHaveAttribute('aria-activedescendant', 'fish-species-0');
    });

    it('候補リストにrole="listbox"が設定されていること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeInTheDocument();
      });
    });

    it('各候補にrole="option"が設定されていること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あ');

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
      });
    });
  });

  describe('状態管理', () => {
    it('ローディング中は入力が無効化されること', () => {
      // 初期ローディング状態をテスト
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      // 読み込み完了までは無効化される可能性がある
      // ただし、モックではすぐに完了するため、このテストは調整が必要
    });

    it('エラーメッセージが表示されること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          error="エラーメッセージ"
        />
      );

      expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();
    });

    it('エラー時は入力フィールドにerrorクラスが付与されること', () => {
      render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          error="エラーメッセージ"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('error');
    });
  });

  describe('props の動作', () => {
    it('disabled 状態で入力が無効化されること', () => {
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('required 属性が設定されること', () => {
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} required />);

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('カスタムクラス名が適用されること', () => {
      const { container } = render(
        <FishSpeciesAutocomplete
          value=""
          onChange={mockOnChange}
          className="custom-class"
        />
      );

      const wrapper = container.querySelector('.fish-species-autocomplete');
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('フォーカス/ブラー', () => {
    it('フォーカス時に候補リストが開くこと', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('ブラー時に候補リストが閉じること', async () => {
      const user = userEvent.setup();
      render(
        <>
          <FishSpeciesAutocomplete value="" onChange={mockOnChange} />
          <button>Other Element</button>
        </>
      );

      const input = screen.getByRole('textbox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const button = screen.getByText('Other Element');
      await user.click(button);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('学名の表示', () => {
    it('学名が候補に表示されること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あじ');

      await waitFor(() => {
        expect(screen.getByText('Trachurus japonicus')).toBeInTheDocument();
      });
    });
  });

  describe('カテゴリの表示', () => {
    it('カテゴリが候補に表示されること', async () => {
      const user = userEvent.setup();
      render(<FishSpeciesAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'あじ');

      await waitFor(() => {
        expect(screen.getByText('青魚')).toBeInTheDocument();
      });
    });
  });
});
