/**
 * 魚種オートコンプリートコンポーネント
 *
 * @description
 * 魚種の入力補完を提供するReactコンポーネント
 * - リアルタイム検索（O(1)パフォーマンス）
 * - キーボード操作対応（↑↓ Enter Esc）
 * - WCAG 2.1 AA準拠（ARIA属性完備）
 * - モダンUI（Glassmorphism、アニメーション）
 * - レスポンシブ & ダークモード対応
 *
 * @version 3.0.0
 * @since 2025-10-25
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { FishSpecies } from '../types';
import { FishSpeciesSearchEngine } from '../services/fish-species';
import './FishSpeciesAutocomplete.css';

interface FishSpeciesAutocompleteProps {
  /**
   * 現在の入力値
   */
  value: string;

  /**
   * 値変更時のコールバック
   * @param species - 選択された魚種（null = 手動入力）
   * @param inputValue - 入力値
   */
  onChange: (species: FishSpecies | null, inputValue: string) => void;

  /**
   * プレースホルダー
   */
  placeholder?: string;

  /**
   * 無効化フラグ
   */
  disabled?: boolean;

  /**
   * エラー表示
   */
  error?: string;

  /**
   * 必須フィールド
   */
  required?: boolean;

  /**
   * カスタムクラス名
   */
  className?: string;

  /**
   * 検索エンジンインスタンス
   * Tech-lead分析 (Issue #37): null許容に変更（親での非同期初期化対応）
   */
  searchEngine: FishSpeciesSearchEngine | null;
}

/**
 * 魚種オートコンプリートコンポーネント
 */
export const FishSpeciesAutocomplete: React.FC<FishSpeciesAutocompleteProps> = ({
  value,
  onChange,
  placeholder = '魚種を入力（例: あじ）',
  disabled = false,
  error,
  required = false,
  className = '',
  searchEngine
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // 検索結果の計算（派生状態）
  // React Hooks修正 (Issue #37): 早期returnを削除し、全てのHooksを無条件で実行
  const suggestions = useMemo(() => {
    if (!searchEngine) return [];
    try {
      return searchEngine.search(inputValue, { limit: 10 });
    } catch (error) {
      console.error('検索エラー:', error);
      return [];
    }
  }, [inputValue, searchEngine]);

  /**
   * 入力値変更ハンドラ
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
    onChange(null, newValue);
  }, [onChange]);

  /**
   * 魚種選択ハンドラ
   */
  const handleSelect = useCallback((species: FishSpecies) => {
    setInputValue(species.standardName);
    setIsOpen(false);
    setSelectedIndex(-1);
    onChange(species, species.standardName);
    inputRef.current?.blur();
  }, [onChange]);

  /**
   * キーボード操作ハンドラ
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;

      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, selectedIndex, suggestions, handleSelect]);

  /**
   * フォーカスハンドラ
   */
  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * ブラーハンドラ
   * Note: onMouseDownでblurを防ぐため、setTimeoutは不要
   */
  const handleBlur = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  /**
   * 選択されたインデックスの項目にスクロール
   */
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  // ローディング状態: searchEngineがnullの場合
  // React Hooks修正 (Issue #37): 全てのHooks実行後に条件分岐
  if (!searchEngine) {
    return (
      <div className={`fish-species-autocomplete ${className}`} data-testid="fish-species-autocomplete">
        <div className="input-wrapper">
          <input
            type="text"
            role="combobox"
            disabled
            placeholder="読み込み中..."
            className="loading-input"
            aria-label="魚種名"
            aria-expanded="false"
            aria-autocomplete="list"
            aria-controls="fish-species-list"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`fish-species-autocomplete ${className}`} data-testid="fish-species-autocomplete">
      <div className="input-wrapper">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          data-testid="fish-species-input"
          aria-label="魚種名"
          aria-autocomplete="list"
          aria-controls="fish-species-list"
          aria-expanded={isOpen}
          aria-activedescendant={
            selectedIndex >= 0 ? `fish-species-${selectedIndex}` : undefined
          }
          className={error ? 'error' : ''}
        />
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id="fish-species-list"
          className="suggestions-list"
          role="listbox"
          data-testid="fish-species-suggestions"
        >
          {suggestions.map((species, index) => (
            <li
              key={species.id}
              id={`fish-species-${index}`}
              role="option"
              aria-selected={selectedIndex === index}
              className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
              data-testid={`fish-species-option-${species.id}`}
              onClick={() => handleSelect(species)}
              onMouseDown={(e) => {
                e.preventDefault(); // blurを防ぐ
                handleSelect(species);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="species-main">
                <span className="species-name">{species.standardName}</span>
                <span className="species-category">{species.category}</span>
              </div>
              {species.scientificName && (
                <div className="species-scientific">{species.scientificName}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOpen && suggestions.length === 0 && inputValue && (
        <div className="no-results" role="status" data-testid="fish-species-no-results">
          該当する魚種が見つかりません
        </div>
      )}
    </div>
  );
};
