// 釣果記録一覧コンポーネント

import React, { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { TestIds } from '../constants/testIds';
import { FishingRecordCard } from './FishingRecordCard';
import { AdvancedSearchFilter } from './AdvancedSearchFilter';
import { SavedSearchManager } from './SavedSearchManager';
import { DataExportModal } from './DataExportModal';
import { DataImportModal } from './DataImportModal';
import { StatisticsDashboard } from './StatisticsDashboard';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import { Icon } from './ui/Icon';
import {
  Calendar,
  Fish,
  MapPin,
  Ruler,
  RefreshCw,
  Anchor,
  Plus,
  BarChart3,
  Search,
  Upload,
  Download,
  AlertTriangle,
  FileText,
  Scroll,
} from 'lucide-react';
import type { FishingRecord } from '../types';

interface FishingRecordListProps {
  records: FishingRecord[];
  loading?: boolean;
  error?: string;
  onRecordClick?: (record: FishingRecord) => void;
  onRecordEdit?: (record: FishingRecord) => void;
  onRecordDelete?: (record: FishingRecord) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  sortBy?: keyof FishingRecord;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: keyof FishingRecord, sortOrder: 'asc' | 'desc') => void;
  onDataRefresh?: () => void;
}

type SortOption = {
  key: keyof FishingRecord;
  label: string;
  icon: ReactNode;
};

const sortOptions: SortOption[] = [
  { key: 'date', label: '日付', icon: <Icon icon={Calendar} size={14} decorative /> },
  { key: 'fishSpecies', label: '魚種', icon: <Icon icon={Fish} size={14} decorative /> },
  { key: 'location', label: '場所', icon: <Icon icon={MapPin} size={14} decorative /> },
  { key: 'size', label: 'サイズ', icon: <Icon icon={Ruler} size={14} decorative /> },
  { key: 'updatedAt', label: '更新日時', icon: <Icon icon={RefreshCw} size={14} decorative /> }
];

export const FishingRecordList: React.FC<FishingRecordListProps> = ({
  records,
  loading = false,
  error,
  onRecordClick,
  onRecordEdit,
  onRecordDelete,
  onLoadMore,
  hasMore = false,
  searchQuery = '',
  onSearchChange,
  sortBy = 'date',
  sortOrder = 'desc',
  onSortChange,
  onDataRefresh
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);

  // 高度な検索機能
  const {
    filters,
    updateFilters,
    filteredRecords,
    searchStats,
    savedSearches,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    loadSavedSearches,
    activeFilterCount,
    isFiltersEmpty
  } = useAdvancedSearch(records);

  // 保存された検索の初期化
  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  // レガシー検索クエリとの統合
  useEffect(() => {
    if (searchQuery.trim() && filters.searchQuery !== searchQuery) {
      updateFilters({
        ...filters,
        searchQuery
      });
    }
  }, [searchQuery, filters, updateFilters]);

  // レガシー検索変更の通知
  useEffect(() => {
    if (onSearchChange && filters.searchQuery !== searchQuery) {
      onSearchChange(filters.searchQuery);
    }
  }, [filters.searchQuery, onSearchChange, searchQuery]);

  // ソート処理
  const sortedRecords = useMemo(() => {
    const sorted = [...filteredRecords].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }, [filteredRecords, sortBy, sortOrder]);

  // 検索入力ハンドラー
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  }, [onSearchChange]);

  // ソート変更ハンドラー
  const handleSortChange = useCallback((newSortBy: keyof FishingRecord) => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'desc' ? 'asc' : 'desc';
    onSortChange?.(newSortBy, newSortOrder);
  }, [sortBy, sortOrder, onSortChange]);

  // インポート完了ハンドラー
  const handleImportComplete = useCallback(() => {
    setShowImportModal(false);
    onDataRefresh?.();
  }, [onDataRefresh]);

  // スケルトンローダー
  const SkeletonCard = () => (
    <div style={{
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem',
      backgroundColor: '#fff',
      animation: 'skeleton-loading 1.5s ease-in-out infinite'
    }}>
      <div style={{
        height: '1.5rem',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        marginBottom: '0.5rem',
        width: '60%'
      }} />
      <div style={{
        height: '1rem',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        marginBottom: '0.75rem',
        width: '40%'
      }} />
      <div style={{
        height: '1rem',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        marginBottom: '0.5rem',
        width: '80%'
      }} />
      <div style={{
        height: '1rem',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        width: '30%'
      }} />
    </div>
  );

  return (
    <div data-testid={TestIds.FISHING_RECORDS_LIST} style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{
            margin: 0,
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            color: '#333'
          }}>
            <Icon icon={Anchor} size="md" decorative />
            記録一覧
          </h2>
          <button
            data-testid={TestIds.ADD_RECORD_BUTTON}
            onClick={() => window.location.hash = '#form'}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Icon icon={Plus} size="sm" decorative /> 新規記録
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <span style={{
            fontSize: '0.875rem',
            color: '#6c757d',
            padding: '0.375rem 0.75rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '20px'
          }}>
            <Icon icon={BarChart3} size={14} decorative /> {filteredRecords.length}件
            {!isFiltersEmpty && ` / ${records.length}件中`}
          </span>

          {!isFiltersEmpty && (
            <span style={{
              fontSize: '0.75rem',
              color: '#007bff',
              padding: '0.25rem 0.5rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '12px'
            }}>
              フィルター適用中
            </span>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: showFilters ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            aria-expanded={showFilters}
            aria-label="基本検索の表示切り替え"
          >
            <Icon icon={Search} size={14} decorative /> {showFilters ? '隠す' : '基本検索'}
          </button>

          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: showAdvancedSearch ? '#007bff' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              position: 'relative'
            }}
            aria-expanded={showAdvancedSearch}
            aria-label="高度な検索の表示切り替え"
          >
            <Icon icon={Search} size={14} decorative /> {showAdvancedSearch ? '隠す' : '高度な検索'}
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#dc3545',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            aria-label="データエクスポート"
          >
            <Icon icon={Upload} size={14} decorative /> エクスポート
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            aria-label="データインポート"
          >
            <Icon icon={Download} size={14} decorative /> インポート
          </button>

          <button
            onClick={() => setShowStatistics(true)}
            disabled={records.length === 0}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: records.length === 0 ? '#6c757d' : '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: records.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: records.length === 0 ? 0.6 : 1
            }}
            aria-label="統計ダッシュボード"
          >
            <Icon icon={BarChart3} size={14} decorative /> 統計
          </button>
        </div>
      </div>

      {/* 検索・フィルター */}
      {showFilters && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #dee2e6'
        }}>
          {/* 検索入力 */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="search-input"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 'bold',
                fontSize: '0.875rem'
              }}
            >
              <Icon icon={Search} size={14} decorative /> 検索
            </label>
            <input
              id="search-input"
              type="text"
              placeholder="魚種、場所、メモで検索..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* ソートオプション */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '0.875rem'
            }}>
              <Icon icon={FileText} size={14} decorative /> 並び順
            </label>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleSortChange(option.key)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: sortBy === option.key ? '#007bff' : '#fff',
                    color: sortBy === option.key ? 'white' : '#333',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease'
                  }}
                  aria-pressed={sortBy === option.key}
                >
                  {option.icon} {option.label}
                  {sortBy === option.key && (
                    <span style={{ fontSize: '0.75rem' }}>
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 高度な検索・フィルター */}
      {showAdvancedSearch && (
        <>
          <SavedSearchManager
            savedSearches={savedSearches}
            onLoadSearch={loadSavedSearch}
            onDeleteSearch={deleteSavedSearch}
            onSaveCurrentSearch={saveSearch}
            currentFilters={filters}
            activeFilterCount={activeFilterCount}
          />
          <AdvancedSearchFilter
            records={records}
            filters={filters}
            onFiltersChange={updateFilters}
            isVisible={true}
            onToggle={() => setShowAdvancedSearch(false)}
          />
        </>
      )}

      {/* 検索統計 */}
      {!isFiltersEmpty && searchStats && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{
            margin: '0 0 0.75rem 0',
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#333'
          }}>
            <Icon icon={BarChart3} size={14} decorative /> 検索結果の統計
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            fontSize: '0.875rem'
          }}>
            <div>
              <strong>結果:</strong> {searchStats.filtered}件 ({searchStats.filterRate}%)
            </div>
            {searchStats.sizeStats.count > 0 && (
              <div>
                <strong>サイズ:</strong> 平均{searchStats.sizeStats.average}cm,
                最大{searchStats.sizeStats.max}cm, 最小{searchStats.sizeStats.min}cm
              </div>
            )}
            {searchStats.fishSpeciesCounts.length > 0 && (
              <div>
                <strong>上位魚種:</strong> {searchStats.fishSpeciesCounts.slice(0, 3).map(([species, count]) => `${species}(${count})`).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <Icon icon={AlertTriangle} size={14} decorative /> {error}
        </div>
      )}

      {/* レコード一覧 */}
      <div data-testid={TestIds.FISHING_RECORDS_CONTAINER} role="list" aria-label="記録一覧">
        {loading && sortedRecords.length === 0 ? (
          // 初回ローディング時のスケルトン
          Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))
        ) : sortedRecords.length === 0 ? (
          // 空状態
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#6c757d'
          }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <Icon icon={Anchor} size={48} color="secondary" decorative />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>記録がありません</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              {searchQuery ? '検索条件に一致する記録が見つかりませんでした' : 'まだ記録がありません'}
            </p>
          </div>
        ) : (
          // レコード表示
          sortedRecords.map((record) => (
            <div key={record.id} role="listitem" data-testid={TestIds.RECORD_ITEM(record.id)}>
              <FishingRecordCard
                record={record}
                onClick={onRecordClick}
                onEdit={onRecordEdit}
                onDelete={onRecordDelete}
              />
            </div>
          ))
        )}
      </div>

      {/* もっと読み込むボタン */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={onLoadMore}
            disabled={loading}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: loading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                読み込み中...
              </>
            ) : (
              <>
                <Icon icon={Scroll} size={14} decorative /> もっと見る
              </>
            )}
          </button>
        </div>
      )}

      {/* CSS アニメーション */}
      <style>{`
        @keyframes skeleton-loading {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ホバーエフェクト */
        button:not(:disabled):hover {
          filter: brightness(1.1);
        }

        button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          .fishing-record-list {
            padding: 0.5rem;
          }

          input, button {
            font-size: 16px; /* iOSのズーム防止 */
          }
        }
      `}</style>

      {/* データエクスポートモーダル */}
      <DataExportModal
        records={records}
        isVisible={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* データインポートモーダル */}
      <DataImportModal
        isVisible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />

      {/* 統計ダッシュボード */}
      <StatisticsDashboard
        records={records}
        isVisible={showStatistics}
        onClose={() => setShowStatistics(false)}
      />
    </div>
  );
};