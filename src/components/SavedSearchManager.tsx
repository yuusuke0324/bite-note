// 保存された検索クエリ管理コンポーネント

import React, { useState } from 'react';
import type { SearchFilters } from './AdvancedSearchFilter';

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: Date;
}

interface SavedSearchManagerProps {
  savedSearches: SavedSearch[];
  onLoadSearch: (searchId: string) => void;
  onDeleteSearch: (searchId: string) => void;
  onSaveCurrentSearch: (name: string) => string;
  currentFilters: SearchFilters;
  activeFilterCount: number;
}

export const SavedSearchManager: React.FC<SavedSearchManagerProps> = ({
  savedSearches,
  onLoadSearch,
  onDeleteSearch,
  onSaveCurrentSearch,
  currentFilters,
  activeFilterCount
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [searchToDelete, setSearchToDelete] = useState<string | null>(null);

  // 保存されている検索のフィルター概要を生成
  const getFilterSummary = (filters: SearchFilters): string => {
    const parts: string[] = [];

    if (filters.searchQuery.trim()) {
      parts.push(`"${filters.searchQuery}"`);
    }

    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom || '開始';
      const to = filters.dateTo || '終了';
      parts.push(`期間: ${from}〜${to}`);
    }

    if (filters.sizeFrom !== undefined || filters.sizeTo !== undefined) {
      const from = filters.sizeFrom ?? '最小';
      const to = filters.sizeTo ?? '最大';
      parts.push(`サイズ: ${from}〜${to}cm`);
    }

    if (filters.locations.length > 0) {
      if (filters.locations.length === 1) {
        parts.push(`場所: ${filters.locations[0]}`);
      } else {
        parts.push(`場所: ${filters.locations.length}件`);
      }
    }

    if (filters.fishSpecies.length > 0) {
      if (filters.fishSpecies.length === 1) {
        parts.push(`魚種: ${filters.fishSpecies[0]}`);
      } else {
        parts.push(`魚種: ${filters.fishSpecies.length}件`);
      }
    }

    if (filters.hasPhoto) {
      parts.push('写真付き');
    }

    if (filters.hasGPS) {
      parts.push('GPS付き');
    }

    return parts.length > 0 ? parts.join(', ') : '条件なし';
  };

  // 新しい検索の保存
  const handleSaveSearch = () => {
    if (!newSearchName.trim()) return;

    onSaveCurrentSearch(newSearchName.trim());
    setNewSearchName('');
    setIsCreating(false);

    // 成功メッセージ（実際の実装では通知システムを使用）
    if (import.meta.env.DEV) {
      console.log(`[Dev] 検索クエリ「${newSearchName}」を保存しました`);
    }
  };

  // 検索の削除確認
  const handleDeleteConfirm = (searchId: string) => {
    onDeleteSearch(searchId);
    setSearchToDelete(null);
  };

  // 日付のフォーマット
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#f8f9fa',
          color: '#333',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        💾 保存された検索
        {savedSearches.length > 0 && (
          <span style={{
            backgroundColor: '#007bff',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {savedSearches.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div style={{
      marginBottom: '1rem',
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
        marginBottom: '1rem'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.1rem',
          fontWeight: 'bold',
          color: '#333'
        }}>
          💾 保存された検索クエリ
        </h3>
        <button
          onClick={() => setIsVisible(false)}
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

      {/* 現在の検索を保存 */}
      {activeFilterCount > 0 && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isCreating ? '1rem' : 0
          }}>
            <div>
              <h4 style={{
                margin: '0 0 0.25rem 0',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: '#1976d2'
              }}>
                現在の検索条件
              </h4>
              <p style={{
                margin: 0,
                fontSize: '0.8rem',
                color: '#666'
              }}>
                {getFilterSummary(currentFilters)}
              </p>
            </div>
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                保存
              </button>
            )}
          </div>

          {isCreating && (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={newSearchName}
                onChange={(e) => setNewSearchName(e.target.value)}
                placeholder="検索クエリ名を入力..."
                maxLength={50}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveSearch();
                  } else if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewSearchName('');
                  }
                }}
              />
              <button
                onClick={handleSaveSearch}
                disabled={!newSearchName.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: newSearchName.trim() ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: newSearchName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem'
                }}
              >
                保存
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewSearchName('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      )}

      {/* 保存された検索一覧 */}
      <div>
        {savedSearches.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6c757d'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💾</div>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              保存された検索クエリはありません
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {savedSearches
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map(search => (
                <div
                  key={search.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        margin: '0 0 0.25rem 0',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        color: '#333'
                      }}>
                        {search.name}
                      </h4>
                      <p style={{
                        margin: '0 0 0.25rem 0',
                        fontSize: '0.8rem',
                        color: '#666'
                      }}>
                        {getFilterSummary(search.filters)}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: '#999'
                      }}>
                        作成: {formatDate(search.createdAt)}
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem'
                    }}>
                      <button
                        onClick={() => onLoadSearch(search.id)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        適用
                      </button>
                      <button
                        onClick={() => setSearchToDelete(search.id)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      {searchToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1002
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h4 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.1rem',
              color: '#333'
            }}>
              検索クエリの削除
            </h4>
            <p style={{
              margin: '0 0 1.5rem 0',
              fontSize: '0.9rem',
              color: '#666'
            }}>
              この検索クエリを削除してもよろしいですか？この操作は取り消せません。
            </p>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setSearchToDelete(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDeleteConfirm(searchToDelete)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};