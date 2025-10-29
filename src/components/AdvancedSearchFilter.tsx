// 高度な検索・フィルターコンポーネント

import React, { useCallback, useMemo } from 'react';
import type { FishingRecord } from '../types';

export interface SearchFilters {
  // テキスト検索
  searchQuery: string;

  // 日付範囲フィルター
  dateFrom?: string;
  dateTo?: string;

  // サイズ範囲フィルター
  sizeFrom?: number;
  sizeTo?: number;

  // 場所フィルター
  locations: string[];

  // 魚種フィルター
  fishSpecies: string[];

  // 写真の有無
  hasPhoto?: boolean;

  // GPS座標の有無
  hasGPS?: boolean;
}

interface AdvancedSearchFilterProps {
  records: FishingRecord[];
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  isVisible: boolean;
  onToggle: () => void;
}

export const AdvancedSearchFilter: React.FC<AdvancedSearchFilterProps> = ({
  records,
  filters,
  onFiltersChange,
  isVisible,
  onToggle
}) => {
  // 利用可能な選択肢を記録から抽出
  const availableOptions = useMemo(() => {
    const locations = new Set<string>();
    const fishSpecies = new Set<string>();

    records.forEach(record => {
      if (record.location.trim()) {
        locations.add(record.location.trim());
      }
      if (record.fishSpecies.trim()) {
        fishSpecies.add(record.fishSpecies.trim());
      }
    });

    return {
      locations: Array.from(locations).sort(),
      fishSpecies: Array.from(fishSpecies).sort()
    };
  }, [records]);

  // フィルター更新ハンドラー
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  }, [filters, onFiltersChange]);

  // 配列フィルターのトグル処理
  const toggleArrayFilter = useCallback((
    key: 'locations' | 'fishSpecies',
    value: string
  ) => {
    const currentArray = filters[key];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];

    updateFilter(key, newArray);
  }, [filters, updateFilter]);

  // フィルターのリセット
  const resetFilters = useCallback(() => {
    onFiltersChange({
      searchQuery: '',
      locations: [],
      fishSpecies: []
    });
  }, [onFiltersChange]);

  // アクティブなフィルター数
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.sizeFrom !== undefined || filters.sizeTo !== undefined) count++;
    if (filters.locations.length > 0) count++;
    if (filters.fishSpecies.length > 0) count++;
    if (filters.hasPhoto !== undefined) count++;
    if (filters.hasGPS !== undefined) count++;
    return count;
  }, [filters]);

  if (!isVisible) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        padding: '0.75rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <button
          onClick={onToggle}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            color: '#007bff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🔍 高度な検索
          {activeFilterCount > 0 && (
            <span style={{
              backgroundColor: '#007bff',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: '1.5rem',
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #dee2e6',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#333'
        }}>
          🔍 高度な検索・フィルター
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              リセット
            </button>
          )}
          <button
            onClick={onToggle}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              color: '#6c757d',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* フィルター項目 */}
      <div style={{
        display: 'grid',
        gap: '1.5rem'
      }}>
        {/* テキスト検索 */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            color: '#333'
          }}>
            🔤 キーワード検索
          </label>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            placeholder="魚種、場所、メモで検索..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
        </div>

        {/* 日付範囲フィルター */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            color: '#333'
          }}>
            📅 日付範囲
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
              style={{
                padding: '0.75rem',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
            <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>〜</span>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
              style={{
                padding: '0.75rem',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        {/* サイズ範囲フィルター */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            color: '#333'
          }}>
            📏 サイズ範囲 (cm)
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <input
              type="number"
              value={filters.sizeFrom ?? ''}
              onChange={(e) => updateFilter('sizeFrom', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="最小サイズ"
              min="0"
              max="999"
              style={{
                padding: '0.75rem',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
            <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>〜</span>
            <input
              type="number"
              value={filters.sizeTo ?? ''}
              onChange={(e) => updateFilter('sizeTo', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="最大サイズ"
              min="0"
              max="999"
              style={{
                padding: '0.75rem',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        {/* 場所フィルター */}
        {availableOptions.locations.length > 0 && (
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              color: '#333'
            }}>
              📍 場所 ({filters.locations.length}件選択中)
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {availableOptions.locations.map(location => (
                <button
                  key={location}
                  onClick={() => toggleArrayFilter('locations', location)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: filters.locations.includes(location) ? '#007bff' : '#f8f9fa',
                    color: filters.locations.includes(location) ? 'white' : '#333',
                    border: '1px solid #ced4da',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 魚種フィルター */}
        {availableOptions.fishSpecies.length > 0 && (
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              color: '#333'
            }}>
              🐟 魚種 ({filters.fishSpecies.length}件選択中)
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {availableOptions.fishSpecies.map(species => (
                <button
                  key={species}
                  onClick={() => toggleArrayFilter('fishSpecies', species)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: filters.fishSpecies.includes(species) ? '#007bff' : '#f8f9fa',
                    color: filters.fishSpecies.includes(species) ? 'white' : '#333',
                    border: '1px solid #ced4da',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {species}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 追加オプション */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            color: '#333'
          }}>
            ⚙️ 追加オプション
          </label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {/* 写真の有無 */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={filters.hasPhoto === true}
                onChange={(e) => updateFilter('hasPhoto', e.target.checked ? true : undefined)}
                style={{
                  width: '18px',
                  height: '18px'
                }}
              />
              <span style={{ fontSize: '0.875rem' }}>📷 写真付きのみ</span>
            </label>

            {/* GPS座標の有無 */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={filters.hasGPS === true}
                onChange={(e) => updateFilter('hasGPS', e.target.checked ? true : undefined)}
                style={{
                  width: '18px',
                  height: '18px'
                }}
              />
              <span style={{ fontSize: '0.875rem' }}>🗺️ GPS位置情報付きのみ</span>
            </label>
          </div>
        </div>
      </div>

      {/* 適用中フィルターの表示 */}
      {activeFilterCount > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#e3f2fd',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#1976d2'
        }}>
          📊 {activeFilterCount}個のフィルターが適用中
        </div>
      )}
    </div>
  );
};