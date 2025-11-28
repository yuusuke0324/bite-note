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
import { fishSpeciesSearchEngine } from '../lib/fish-species-service';
import './FishSpeciesAutocomplete.css';
import { logger } from '../lib/errors/logger';

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
  className = ''
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 検索結果の計算（派生状態）
  // Issue #38: グローバルシングルトンを使用してact()警告を解決
  const suggestions = useMemo(() => {
    try {
      return fishSpeciesSearchEngine.search(inputValue, { limit: 10 });
    } catch (error) {
      logger.error('検索エラー', { error });
      return [];
    }
  }, [inputValue]);

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
   * Note: キーボード操作時はblurタイマーをキャンセルして状態更新の競合を防止
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Issue #246: キーボード操作時はblurタイマーをキャンセル
    // CI環境ではReact状態更新が遅延し、blurタイマーと競合する可能性がある
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

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
   * Note: blur時のタイマーをキャンセルして状態リセットを防止
   */
  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsOpen(true);
  }, []);

  /**
   * ブラーハンドラ
   * Note: setTimeoutでキーボード操作との競合を防止
   * キーイベント処理後にドロップダウンを閉じる
   */
  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
      blurTimeoutRef.current = null;
    }, 150);
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

  // Issue #38: グローバルシングルトンを使用してact()警告を解決
  return (
    <div className={`fish-species-autocomplete ${className}`} data-testid="fish-species-autocomplete">
      <div className="input-wrapper">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          name="species-search-input"
          inputMode="search"
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
