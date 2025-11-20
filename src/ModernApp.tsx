import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore, selectError, selectRecords, selectSettings, selectActions } from './stores/app-store';
import { useOnlineStatus } from './hooks/useOnlineStatus';

// モダンコンポーネント
import AppLayout from './components/layout/AppLayout';
import ModernHeader from './components/layout/ModernHeader';
import BottomNavigation from './components/navigation/BottomNavigation';
import ResponsiveGrid, { PhotoGrid } from './components/layout/ResponsiveGrid';
import ModernCard, { PhotoCard } from './components/ui/ModernCard';
import FloatingActionButton from './components/ui/FloatingActionButton';

// 既存コンポーネント
import { FishingRecordForm } from './components/FishingRecordForm';
import { FishingRecordDetail } from './components/FishingRecordDetail';
import { FishingRecordEditModal } from './components/FishingRecordEditModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { PWAUpdateNotification } from './components/PWAUpdateNotification';
import { TrendChart, type TrendChartData } from './components/chart/TrendChart';

// Phase 3 ホーム画面コンポーネント
import { RecentRecordsSection } from './components/home/RecentRecordsSection';
import { LocationRankingSection } from './components/home/LocationRankingSection';
import { SpeciesChartSection } from './components/home/SpeciesChartSection';
import { TideStatisticsSection } from './components/home/TideStatisticsSection';

// UI コンポーネント
import { Skeleton, SkeletonPhotoCard, SkeletonList } from './components/ui/Skeleton';

// 地図コンポーネント
import { FishingMap } from './components/map/FishingMap';

// オフラインインジケーター
import { OfflineIndicator } from './components/common/OfflineIndicator';

// アイコン
import Icons from './components/icons/Icons';

// テスト用定数
import { TestIds } from './constants/testIds';

// サービス
import { photoService } from './lib/photo-service';
import { fishingRecordService } from './lib/fishing-record-service';

// テーマ
import { colors } from './theme/colors';
import { textStyles } from './theme/typography';

// 型定義
import type { CreateFishingRecordFormData } from './lib/validation';
import type { FishingRecord } from './types';

// 月別表示用の型定義
interface MonthSegment {
  id: string;          // 'all' | '2024-10' | '2024-09'
  label: string;       // '全て' | '10月' | '9月'
  count: number;
  year: number;
  month: number;
}

interface MonthGroup {
  yearMonth: string;    // '2024-10'
  label: string;        // '2024年10月'
  records: FishingRecord[];
}

// フィルター状態の型定義
interface DateRangeFilter {
  start: Date | null;
  end: Date | null;
  preset?: 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';
}

interface SizeRangeFilter {
  min: number | null;
  max: number | null;
}

interface FilterState {
  searchQuery: string;
  species: string[];
  locations: string[];
  dateRange: DateRangeFilter;
  sizeRange: SizeRangeFilter;
  selectedMonth: string | null;
}

// フィルター関数群
const searchRecords = (records: FishingRecord[], query: string): FishingRecord[] => {
  if (!query.trim()) return records;

  const lowerQuery = query.toLowerCase().trim();
  return records.filter(record =>
    record.fishSpecies.toLowerCase().includes(lowerQuery) ||
    record.location.toLowerCase().includes(lowerQuery) ||
    (record.notes && record.notes.toLowerCase().includes(lowerQuery))
  );
};

const filterBySpecies = (records: FishingRecord[], species: string[]): FishingRecord[] => {
  if (species.length === 0) return records;
  return records.filter(record => species.includes(record.fishSpecies));
};

const filterByLocations = (records: FishingRecord[], locations: string[]): FishingRecord[] => {
  if (locations.length === 0) return records;
  return records.filter(record => locations.includes(record.location));
};

const filterByDateRange = (records: FishingRecord[], dateRange: DateRangeFilter): FishingRecord[] => {
  if (!dateRange.start && !dateRange.end) return records;

  return records.filter(record => {
    const recordDate = new Date(record.date);
    if (dateRange.start && recordDate < dateRange.start) return false;
    if (dateRange.end && recordDate > dateRange.end) return false;
    return true;
  });
};

const filterBySize = (records: FishingRecord[], sizeRange: SizeRangeFilter): FishingRecord[] => {
  if (sizeRange.min === null && sizeRange.max === null) return records;

  return records.filter(record => {
    if (typeof record.size !== 'number') return false;
    if (sizeRange.min !== null && record.size < sizeRange.min) return false;
    if (sizeRange.max !== null && record.size > sizeRange.max) return false;
    return true;
  });
};

const applyFilters = (records: FishingRecord[], filters: FilterState): FishingRecord[] => {
  let filtered = records;

  // 検索クエリでフィルタリング
  filtered = searchRecords(filtered, filters.searchQuery);

  // 魚種でフィルタリング
  filtered = filterBySpecies(filtered, filters.species);

  // 場所でフィルタリング
  filtered = filterByLocations(filtered, filters.locations);

  // 日付範囲でフィルタリング
  filtered = filterByDateRange(filtered, filters.dateRange);

  // サイズ範囲でフィルタリング
  filtered = filterBySize(filtered, filters.sizeRange);

  // 月別フィルター（既存の機能と統合）
  if (filters.selectedMonth && filters.selectedMonth !== 'all') {
    filtered = filtered.filter(r => {
      const recordDate = new Date(r.date);
      const yearMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
      return yearMonth === filters.selectedMonth;
    });
  }

  return filtered;
};

function ModernApp() {
  // 状態管理
  const [activeTab, setActiveTab] = useState<'home' | 'form' | 'list' | 'map' | 'debug'>('home');
  const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<FishingRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<FishingRecord | null>(null);
  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapSelectedRecordId, setMapSelectedRecordId] = useState<string | undefined>(undefined);

  // オンライン/オフライン状態（カスタムフックを使用）
  const { isOnline } = useOnlineStatus();

  // 詳細モーダル用の写真URL
  const [detailPhotoUrl, setDetailPhotoUrl] = useState<string | null>(null);
  const [detailPhotoLoading, setDetailPhotoLoading] = useState(false);
  const detailPhotoUrlRef = useRef<string | null>(null);

  // Zustand Store
  const error = useAppStore(selectError);
  const records = useAppStore(selectRecords);
  const settings = useAppStore(selectSettings);
  const appActions = useAppStore(selectActions);
  // const formData = useFormStore(selectFormData);
  // const validation = useFormStore(selectValidation);
  // const formActions = useFormStore(selectFormActions);

  // E2Eテスト用: 意図的なエラー発生
  useEffect(() => {
    if (typeof window !== 'undefined' &&
        localStorage.getItem('__test_force_error__') === 'true') {
      throw new Error('Test error for ErrorBoundary');
    }
  }, []);

  // 初期化
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        await appActions.initialize();
        // E2Eテスト用: 初期化完了フラグを設定
        document.body.setAttribute('data-app-initialized', 'true');
      } catch (error) {
        console.error('App initialization failed:', error);
        // エラー時もフラグを設定（エラー表示が出ている状態）
        document.body.setAttribute('data-app-initialized', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, [appActions]);

  // 詳細モーダルの写真読み込み
  useEffect(() => {
    let isMounted = true;

    const loadPhoto = async () => {
      if (!selectedRecord?.photoId) {
        setDetailPhotoUrl(null);
        setDetailPhotoLoading(false);
        return;
      }

      try {
        setDetailPhotoLoading(true);
        const photoResult = await photoService.getPhotoById(selectedRecord.photoId);

        if (isMounted && photoResult.success && photoResult.data) {
          if (detailPhotoUrlRef.current) {
            URL.revokeObjectURL(detailPhotoUrlRef.current);
          }

          const url = URL.createObjectURL(photoResult.data.blob);
          detailPhotoUrlRef.current = url;
          setDetailPhotoUrl(url);
        }
      } catch (error) {
        console.error('詳細モーダル: 写真の読み込みエラー:', error);
      } finally {
        if (isMounted) {
          setDetailPhotoLoading(false);
        }
      }
    };

    loadPhoto();

    return () => {
      isMounted = false;
      if (detailPhotoUrlRef.current) {
        URL.revokeObjectURL(detailPhotoUrlRef.current);
        detailPhotoUrlRef.current = null;
      }
    };
  }, [selectedRecord?.photoId]);

  // フォーム送信ハンドラー
  const handleFormSubmit = async (data: CreateFishingRecordFormData) => {
    try {
      const result = await fishingRecordService.createRecord(data);
      if (result.success) {
        await appActions.refreshRecords();
        setActiveTab('list');
      } else {
        throw new Error(result.error?.message || '記録の保存に失敗しました');
      }
    } catch (error) {
      appActions.setError(error instanceof Error ? error.message : '記録の保存に失敗しました');
    }
  };

  // 記録関連ハンドラー
  const handleRecordClick = (record: FishingRecord) => {
    setSelectedRecord(record);
  };

  const handleRecordEdit = (record: FishingRecord) => {
    setEditingRecord(record);
    setSelectedRecord(null);
  };

  const handleRecordDelete = (record: FishingRecord) => {
    setDeletingRecord(record);
    setSelectedRecord(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      setIsDeletingInProgress(true);
      await appActions.deleteRecord(deletingRecord.id);
      setDeletingRecord(null);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeletingInProgress(false);
    }
  };

  const handleDeleteCancel = () => {
    if (isDeletingInProgress) return;
    setDeletingRecord(null);
  };

  const handleEditSave = async (id: string, data: CreateFishingRecordFormData) => {
    try {
      await appActions.updateRecord(id, data);
      setEditingRecord(null);
    } catch (error) {
      console.error('Edit save failed:', error);
    }
  };

  // const handleDataRefresh = useCallback(async () => {
  //   await appActions.initialize();
  // }, [appActions]);

  // ナビゲーション設定
  const navigationItems = [
    {
      id: 'home',
      label: 'ホーム',
      icon: <Icons.Home />,
      active: activeTab === 'home',
      testId: TestIds.HOME_TAB,
    },
    {
      id: 'list',
      label: '記録一覧',
      icon: <Icons.List />,
      active: activeTab === 'list',
      badge: records.length,
      testId: TestIds.LIST_TAB,
    },
    {
      id: 'map',
      label: '地図',
      icon: <Icons.Location />,
      active: activeTab === 'map',
      badge: records.filter(r => r.coordinates).length,
      testId: TestIds.MAP_TAB,
    },
    {
      id: 'form',
      label: '新規記録',
      icon: <Icons.Add />,
      active: activeTab === 'form',
      testId: TestIds.FORM_TAB,
    },
    {
      id: 'debug',
      label: '設定',
      icon: <Icons.Settings />,
      active: activeTab === 'debug',
      testId: TestIds.DEBUG_TAB,
    },
  ];

  // ヘッダー設定
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'home': return '釣果記録';
      case 'list': return '記録一覧';
      case 'map': return '釣り場マップ';
      case 'form': return '新規記録';
      case 'debug': return '設定';
      default: return '釣果記録アプリ';
    }
  };

  const getHeaderSubtitle = () => {
    const recordsWithCoordinates = records.filter(r => r.coordinates).length;
    switch (activeTab) {
      case 'home': return `${records.length}件の記録`;
      case 'list': return '写真で振り返る';
      case 'map': return `${recordsWithCoordinates}箇所の釣り場`;
      case 'form': return '新しい釣果を記録';
      case 'debug': return 'アプリの設定';
      default: return '';
    }
  };

  // Segmented Control コンポーネント
  const SegmentedControl: React.FC<{
    segments: MonthSegment[];
    selected: string;
    onChange: (id: string) => void;
  }> = ({ segments, selected, onChange }) => {
    return (
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '8px',
        backgroundColor: colors.surface.secondary,
        borderRadius: '12px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {segments.map((segment) => (
          <button
            key={segment.id}
            onClick={() => onChange(segment.id)}
            style={{
              flex: '0 0 auto',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: selected === segment.id ? colors.primary[500] : 'transparent',
              color: selected === segment.id ? 'white' : colors.text.primary,
              fontSize: '0.875rem',
              fontWeight: selected === segment.id ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {segment.label}
            {segment.count > 0 && (
              <span style={{
                backgroundColor: selected === segment.id
                  ? 'rgba(255, 255, 255, 0.3)'
                  : colors.primary[100],
                color: selected === segment.id
                  ? 'white'
                  : colors.primary[700],
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '600',
              }}>
                {segment.count}
              </span>
            )}
          </button>
        ))}
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    );
  };

  // SearchBar コンポーネント（デバウンス機能付き）
  const SearchBar: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
  }> = ({ value, onChange, placeholder = '魚種、場所、メモで検索...', debounceMs = 300 }) => {
    const [localValue, setLocalValue] = useState(value);
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    useEffect(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onChange(localValue);
      }, debounceMs);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [localValue, onChange, debounceMs]);

    const handleClear = () => {
      setLocalValue('');
      onChange('');
    };

    return (
      <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 44px 12px 44px',
            borderRadius: '12px',
            border: `1px solid ${colors.border.light}`,
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            backgroundColor: colors.surface.primary,
            color: colors.text.primary,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.primary[500];
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primary[100]}`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.border.light;
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <span style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '1.25rem',
          pointerEvents: 'none',
          color: colors.text.secondary,
        }}>
          🔍
        </span>
        {localValue && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: colors.surface.tertiary,
              color: colors.text.secondary,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface.tertiary;
            }}
            title="クリア"
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  // FilterPanel コンポーネント
  const FilterPanel: React.FC<{
    filters: FilterState;
    onChange: (filters: FilterState) => void;
    availableSpecies: string[];
    availableLocations: string[];
    onClear: () => void;
  }> = ({ filters, onChange, availableSpecies, availableLocations, onClear }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // アクティブフィルターの数を計算
    const activeFilterCount = useMemo(() => {
      let count = 0;
      if (filters.species.length > 0) count++;
      if (filters.locations.length > 0) count++;
      if (filters.dateRange.start || filters.dateRange.end) count++;
      if (filters.sizeRange.min !== null || filters.sizeRange.max !== null) count++;
      return count;
    }, [filters]);

    const toggleSpecies = (species: string) => {
      const newSpecies = filters.species.includes(species)
        ? filters.species.filter(s => s !== species)
        : [...filters.species, species];
      onChange({ ...filters, species: newSpecies });
    };

    const toggleLocation = (location: string) => {
      const newLocations = filters.locations.includes(location)
        ? filters.locations.filter(l => l !== location)
        : [...filters.locations, location];
      onChange({ ...filters, locations: newLocations });
    };

    return (
      <div style={{ marginBottom: '16px' }}>
        {/* フィルターヘッダー */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: colors.surface.secondary,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🎛️</span>
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: colors.text.primary,
            }}>
              詳細フィルター
            </span>
            {activeFilterCount > 0 && (
              <span style={{
                backgroundColor: colors.primary[500],
                color: 'white',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '600',
              }}>
                {activeFilterCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeFilterCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.surface.tertiary,
                  color: colors.text.secondary,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.primary[100];
                  e.currentTarget.style.color = colors.primary[700];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.surface.tertiary;
                  e.currentTarget.style.color = colors.text.secondary;
                }}
              >
                クリア
              </button>
            )}
            <span style={{
              fontSize: '1rem',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease',
            }}>
              ▼
            </span>
          </div>
        </div>

        {/* フィルターコンテンツ */}
        {isExpanded && (
          <div style={{
            marginTop: '8px',
            padding: '16px',
            backgroundColor: colors.surface.secondary,
            borderRadius: '12px',
          }}>
            {/* 魚種フィルター */}
            {availableSpecies.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: colors.text.primary,
                  marginBottom: '8px',
                }}>
                  🐟 魚種
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  {availableSpecies.map(species => (
                    <button
                      key={species}
                      onClick={() => toggleSpecies(species)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: filters.species.includes(species)
                          ? colors.primary[500]
                          : colors.surface.primary,
                        color: filters.species.includes(species)
                          ? 'white'
                          : colors.text.primary,
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {species}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 場所フィルター */}
            {availableLocations.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: colors.text.primary,
                  marginBottom: '8px',
                }}>
                  📍 場所
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  {availableLocations.map(location => (
                    <button
                      key={location}
                      onClick={() => toggleLocation(location)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: filters.locations.includes(location)
                          ? colors.primary[500]
                          : colors.surface.primary,
                        color: filters.locations.includes(location)
                          ? 'white'
                          : colors.text.primary,
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* サイズ範囲フィルター */}
            <div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: colors.text.primary,
                marginBottom: '8px',
              }}>
                📏 サイズ範囲 (cm)
              </div>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}>
                <input
                  type="number"
                  placeholder="最小"
                  value={filters.sizeRange.min ?? ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : null;
                    onChange({
                      ...filters,
                      sizeRange: { ...filters.sizeRange, min: value },
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border.light}`,
                    fontSize: '0.875rem',
                    backgroundColor: colors.surface.primary,
                    color: colors.text.primary,
                  }}
                />
                <span style={{ color: colors.text.secondary }}>〜</span>
                <input
                  type="number"
                  placeholder="最大"
                  value={filters.sizeRange.max ?? ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : null;
                    onChange({
                      ...filters,
                      sizeRange: { ...filters.sizeRange, max: value },
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border.light}`,
                    fontSize: '0.875rem',
                    backgroundColor: colors.surface.primary,
                    color: colors.text.primary,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // EmptySearchResult コンポーネント
  const EmptySearchResult: React.FC<{
    searchQuery: string;
    activeFiltersCount: number;
    onClearFilters: () => void;
  }> = ({ searchQuery, activeFiltersCount, onClearFilters }) => {
    return (
      <ModernCard variant="outlined" size="lg">
        <div style={{
          textAlign: 'center',
          padding: '48px 32px',
          color: colors.text.secondary,
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔍</div>
          <div style={{
            ...textStyles.headline.small,
            marginBottom: '8px',
            color: colors.text.primary,
          }}>
            該当する記録が見つかりません
          </div>
          {searchQuery && (
            <div style={{
              ...textStyles.body.medium,
              marginBottom: '8px',
            }}>
              「{searchQuery}」の検索結果
            </div>
          )}
          {activeFiltersCount > 0 && (
            <div style={{
              ...textStyles.body.medium,
              marginBottom: '16px',
            }}>
              {activeFiltersCount}個のフィルターが有効です
            </div>
          )}
          <button
            onClick={onClearFilters}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: colors.primary[500],
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary[600];
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary[500];
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            すべてのフィルターをクリア
          </button>
        </div>
      </ModernCard>
    );
  };

  // モダンな記録カードコンポーネント（Instagram風オーバーレイデザイン）
  const ModernRecordCard: React.FC<{ record: FishingRecord; isBestCatch?: boolean }> = React.memo(({ record, isBestCatch = false }) => {
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const photoUrlRef = useRef<string | null>(null);

    useEffect(() => {
      let isMounted = true;

      const loadPhoto = async () => {
        if (!record.photoId) {
          return;
        }

        if (isMounted) {
          setPhotoLoading(true);
        }

        try {
          const result = await photoService.getPhotoById(record.photoId);

          if (isMounted && result.success && result.data) {
            const url = URL.createObjectURL(result.data.blob);
            photoUrlRef.current = url;
            setPhotoUrl(url);
          } else if (result.error) {
            console.error('ModernRecordCard: 写真取得失敗', result.error);
          }
        } catch (error) {
          console.error('ModernRecordCard: 写真の読み込みエラー:', error);
        } finally {
          if (isMounted) {
            setPhotoLoading(false);
          }
        }
      };

      loadPhoto();

      return () => {
        isMounted = false;
        if (photoUrlRef.current) {
          URL.revokeObjectURL(photoUrlRef.current);
          photoUrlRef.current = null;
        }
      };
    }, [record.photoId]);

    // 日付フォーマット用のヘルパー関数
    const formatDate = (date: Date | string | number): string => {
      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) {
          console.error('Invalid date:', date);
          return '日付不明';
        }
        return dateObj.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      } catch (error) {
        console.error('Date formatting error:', error, date);
        return '日付不明';
      }
    };

    return (
      <PhotoCard
        onClick={() => handleRecordClick(record)}
        loading={photoLoading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={TestIds.RECORD_ITEM(record.id)}
      >
        {/* 写真表示 + オーバーレイ */}
        <div
          className="modern-record-card-container"
          style={{
            width: '100%',
            height: '350px',
            backgroundColor: colors.surface.secondary,
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* 画像: 2層構造（背景ぼかし + 前景オリジナル） */}
          {photoUrl ? (
            <>
              {/* 背景レイヤー: ぼかし画像 */}
              <img
                src={photoUrl}
                alt=""
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 0,
                  filter: 'blur(20px)',
                  transform: isHovered ? 'scale(1.15)' : 'scale(1.1)',
                  opacity: 0.6,
                  objectFit: 'cover',
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
              {/* 前景レイヤー: オリジナル画像 */}
              <img
                src={photoUrl}
                alt={`${record.fishSpecies}の記録`}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </>
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.text.secondary,
              transition: 'all 0.3s ease',
            }}>
              <Icons.Fish size={64} />
            </div>
          )}

          {/* 日付バッジ（右上） */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 2,
            backgroundColor: isHovered ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}>
            <Icons.Date size={14} />
            {formatDate(record.date)}
          </div>

          {/* ベストキャッチバッジ（左上上部） */}
          {isBestCatch && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 3,
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              backdropFilter: 'blur(8px)',
              color: '#000',
              padding: '8px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isHovered ? '0 6px 16px rgba(255, 215, 0, 0.5)' : '0 3px 8px rgba(255, 215, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              🏆 {(() => {
                const bestSize = typeof record.size === 'number' ? record.size : 0;
                const bestWeight = typeof record.weight === 'number' ? record.weight : 0;
                const bestMax = Math.max(bestSize, bestWeight);
                if (bestWeight > bestSize) {
                  return `${bestMax}g - 今月最大!`;
                } else {
                  return `${bestMax}cm - 今月最大!`;
                }
              })()}
            </div>
          )}

          {/* サイズバッジ（左上下部） */}
          {(typeof record.size === 'number' && !isNaN(record.size)) ? (
            <div style={{
              position: 'absolute',
              top: isBestCatch ? '58px' : '12px',
              left: '12px',
              zIndex: 2,
              backgroundColor: isHovered ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              color: colors.primary[700],
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}>
              📏 {record.size}cm
            </div>
          ) : null}

          {/* 重量バッジ（サイズバッジの下） - ベストキャッチの場合は非表示 */}
          {!isBestCatch && (typeof record.weight === 'number' && !isNaN(record.weight)) ? (
            <div style={{
              position: 'absolute',
              top: (typeof record.size === 'number' && !isNaN(record.size)) ? '56px' : '12px',
              left: '12px',
              zIndex: 2,
              backgroundColor: isHovered ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              color: colors.secondary[700],
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}>
              ⚖️ {record.weight}g
            </div>
          ) : null}

          {/* 情報オーバーレイ（下部） */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            background: isHovered
              ? 'linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.75) 70%, transparent 100%)'
              : 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.7) 70%, transparent 100%)',
            backdropFilter: 'blur(8px)',
            padding: isHovered ? '28px 16px 20px' : '24px 16px 16px',
            color: 'white',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {/* 魚種 */}
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: isHovered ? '1.3rem' : '1.25rem',
              fontWeight: '600',
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              🐟 {record.fishSpecies}
            </h3>

            {/* 場所 */}
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              <Icons.Location size={14} />
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {record.location}
              </span>
            </div>
          </div>
        </div>
        {/* レスポンシブスタイル */}
        <style>{`
          /* モバイル対応 */
          @media (max-width: 767px) {
            .modern-record-card-container {
              height: 280px !important;
            }
          }

          /* タブレット・デスクトップ */
          @media (min-width: 768px) {
            .modern-record-card-container {
              height: 350px !important;
            }
          }

          /* 大画面 */
          @media (min-width: 1440px) {
            .modern-record-card-container {
              height: 400px !important;
            }
          }
        `}</style>
      </PhotoCard>
    );
  }, (prevProps, nextProps) => {
    // record.idとphotoIdが同じなら再レンダリングしない
    return prevProps.record.id === nextProps.record.id &&
           prevProps.record.photoId === nextProps.record.photoId;
  });

  // ホームコンテンツ
  const HomeContent = () => {
    // 今月のベストキャッチを取得（サイズが最大の記録）
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthRecords = records.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate.getMonth() === thisMonth && recordDate.getFullYear() === thisYear;
    });
    const bestCatch = thisMonthRecords.reduce((best, current) => {
      if (!best) return current;

      // サイズまたは重量のいずれかで比較（どちらも未入力の場合は0）
      const bestSize = typeof best.size === 'number' ? best.size : 0;
      const bestWeight = typeof best.weight === 'number' ? best.weight : 0;
      const currentSize = typeof current.size === 'number' ? current.size : 0;
      const currentWeight = typeof current.weight === 'number' ? current.weight : 0;

      // サイズと重量の最大値で比較（どちらか大きい方を優先）
      const bestMax = Math.max(bestSize, bestWeight);
      const currentMax = Math.max(currentSize, currentWeight);

      return currentMax > bestMax ? current : best;
    }, null as FishingRecord | null);

    // 月別釣果トレンドデータを生成（最近6ヶ月）
    const generateTrendData = (): TrendChartData[] => {
      const monthlyData = new Map<string, number>();
      const now = new Date();

      // 最近6ヶ月分の月を生成
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yearMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyData.set(yearMonth, 0);
      }

      // 記録を各月にカウント
      records.forEach(record => {
        const recordDate = new Date(record.date);
        const yearMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData.has(yearMonth)) {
          monthlyData.set(yearMonth, (monthlyData.get(yearMonth) || 0) + 1);
        }
      });

      // TrendChartDataに変換
      return Array.from(monthlyData.entries()).map(([yearMonth, count]) => {
        const [year, month] = yearMonth.split('-').map(Number);
        return {
          month: `${month}月`,
          count,
          label: `${year}年${month}月`,
        };
      });
    };

    const trendData = generateTrendData();

    if (isLoading) {
      return (
        <div style={{ padding: '12px' }}>
          {/* 統計カードのスケルトン */}
          <ResponsiveGrid
            columns={{ mobile: 4, tablet: 4, desktop: 4 }}
            gap="8px"
            style={{ marginBottom: '16px' }}
          >
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                padding: '16px',
                borderRadius: '12px',
                border: `1px solid ${colors.border.light}`,
                backgroundColor: colors.surface.primary,
              }}>
                <Skeleton width="60%" height="32px" style={{ margin: '0 auto 8px' }} />
                <Skeleton width="80%" height="14px" style={{ margin: '0 auto' }} />
              </div>
            ))}
          </ResponsiveGrid>

          {/* グラフのスケルトン */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${colors.border.light}`,
            backgroundColor: colors.surface.primary,
            marginBottom: '16px',
          }}>
            <Skeleton width="40%" height="20px" style={{ marginBottom: '16px' }} />
            <Skeleton width="100%" height="200px" borderRadius="8px" />
          </div>

          {/* ベストキャッチのスケルトン */}
          <div style={{ marginBottom: '16px' }}>
            <Skeleton width="50%" height="24px" style={{ marginBottom: '12px' }} />
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <SkeletonPhotoCard />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '12px' }}>
        {/* 統計情報 */}
        <ResponsiveGrid
          columns={{ mobile: 4, tablet: 4, desktop: 4 }}
          gap="8px"
          style={{ marginBottom: '16px' }}
        >
          <ModernCard variant="outlined" size="sm">
            <div style={{ textAlign: 'center' }}>
              <div style={{
                ...textStyles.headline.medium,
                color: colors.primary[500],
                marginBottom: '4px',
                lineHeight: 1,
              }}>
                {records.length}
              </div>
              <div style={{
                ...textStyles.body.small,
                color: colors.text.secondary,
                lineHeight: 1,
              }}>
                総記録数
              </div>
            </div>
          </ModernCard>

          <ModernCard variant="outlined" size="sm">
            <div style={{ textAlign: 'center' }}>
              <div style={{
                ...textStyles.headline.medium,
                color: colors.secondary[500],
                marginBottom: '4px',
                lineHeight: 1,
              }}>
                {new Set(records.map(r => r.fishSpecies)).size}
              </div>
              <div style={{
                ...textStyles.body.small,
                color: colors.text.secondary,
                lineHeight: 1,
              }}>
                魚種数
              </div>
            </div>
          </ModernCard>

          <ModernCard variant="outlined" size="sm">
            <div style={{ textAlign: 'center' }}>
              <div style={{
                ...textStyles.headline.medium,
                color: colors.accent[500],
                marginBottom: '4px',
                lineHeight: 1,
              }}>
                {new Set(records.map(r => r.location)).size}
              </div>
              <div style={{
                ...textStyles.body.small,
                color: colors.text.secondary,
                lineHeight: 1,
              }}>
                釣り場数
              </div>
            </div>
          </ModernCard>

          <ModernCard variant="outlined" size="sm">
            <div style={{ textAlign: 'center' }}>
              <div style={{
                ...textStyles.headline.medium,
                color: colors.semantic.success.main,
                marginBottom: '4px',
                lineHeight: 1,
              }}>
                {thisMonthRecords.length}
              </div>
              <div style={{
                ...textStyles.body.small,
                color: colors.text.secondary,
                lineHeight: 1,
              }}>
                今月の記録
              </div>
            </div>
          </ModernCard>
        </ResponsiveGrid>

        {/* 釣果トレンドグラフ */}
        {records.length > 0 && (
          <ModernCard variant="outlined" size="md" style={{ marginBottom: '16px' }}>
            <TrendChart
              data={trendData}
              type="bar"
              height={200}
              title="📈 釣果トレンド（最近6ヶ月）"
              color={colors.primary[500]}
            />
          </ModernCard>
        )}

        {/* 今月のベストキャッチ */}
        {bestCatch ? (
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{
              ...textStyles.headline.medium,
              color: colors.text.primary,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              🏆 今月のベストキャッチ
            </h2>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <ModernRecordCard record={bestCatch} isBestCatch={true} />
            </div>
          </div>
        ) : records.length > 0 ? (
          <ModernCard variant="outlined" size="lg" style={{ marginBottom: '16px' }}>
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: colors.text.secondary,
            }}>
              <Icons.Fish size={64} style={{ marginBottom: '16px' }} />
              <div style={{
                ...textStyles.headline.small,
                marginBottom: '8px',
              }}>
                今月の記録はまだありません
              </div>
              <div style={textStyles.body.medium}>
                今月の最初の釣果を記録してみましょう！
              </div>
            </div>
          </ModernCard>
        ) : (
          <ModernCard variant="outlined" size="lg" style={{ marginBottom: '16px' }}>
            <div style={{
              textAlign: 'center',
              padding: '24px',
              color: colors.text.secondary,
            }}>
              <Icons.Fish size={64} style={{ marginBottom: '12px' }} />
              <div style={{
                ...textStyles.headline.small,
                marginBottom: '8px',
              }}>
                まだ記録がありません
              </div>
              <div style={textStyles.body.medium}>
                最初の釣果を記録してみましょう！
              </div>
            </div>
          </ModernCard>
        )}

        {/* Phase 3: 追加機能セクション */}
        {records.length > 0 && (
          <>
            {/* 最近の記録セクション */}
            <div style={{ marginBottom: '16px' }}>
              <RecentRecordsSection
                records={records}
                onRecordClick={handleRecordClick}
                onViewAll={() => setActiveTab('list')}
              />
            </div>

            {/* 2カラムレイアウト: 人気の釣り場 + 魚種別記録数 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '16px',
            }}>
              {/* 人気の釣り場ランキング */}
              <div>
                <LocationRankingSection
                  records={records}
                  onLocationClick={(_location) => {
                    // 将来的に場所フィルターを適用して記録一覧へ遷移
                    setActiveTab('list');
                  }}
                />
              </div>

              {/* 魚種別の記録数 */}
              <div>
                <SpeciesChartSection
                  records={records}
                  onSpeciesClick={(_species) => {
                    // 将来的に魚種フィルターを適用して記録一覧へ遷移
                    setActiveTab('list');
                  }}
                />
              </div>
            </div>

            {/* 潮汐統計セクション */}
            <div style={{ marginBottom: '16px' }}>
              <TideStatisticsSection records={records} />
            </div>
          </>
        )}
      </div>
    );
  };

  // リストコンテンツ
  const ListContent = () => {
    // フィルター状態
    const [filters, setFilters] = useState<FilterState>({
      searchQuery: '',
      species: [],
      locations: [],
      dateRange: { start: null, end: null },
      sizeRange: { min: null, max: null },
      selectedMonth: 'all',
    });

    // 利用可能な魚種と場所を抽出（全記録から）
    const availableSpecies = useMemo(() =>
      Array.from(new Set(records.map(r => r.fishSpecies))).sort(),
      [records]
    );

    const availableLocations = useMemo(() =>
      Array.from(new Set(records.map(r => r.location))).sort(),
      [records]
    );

    // フィルター適用済みの記録を計算（メモ化）
    const filteredRecords = useMemo(() =>
      applyFilters(records, filters),
      [records, filters]
    );

    // 記録を月別にグループ化
    const groupRecordsByMonth = (records: FishingRecord[]): MonthGroup[] => {
      const groups = new Map<string, FishingRecord[]>();

      records.forEach((record) => {
        const date = new Date(record.date);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!groups.has(yearMonth)) {
          groups.set(yearMonth, []);
        }
        groups.get(yearMonth)!.push(record);
      });

      // 月別グループを配列に変換し、新しい順にソート
      return Array.from(groups.entries())
        .map(([yearMonth, records]) => {
          const [year, month] = yearMonth.split('-').map(Number);
          return {
            yearMonth,
            label: `${year}年${month}月`,
            records: records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          };
        })
        .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    };

    // MonthSegmentを生成（フィルター済みの記録から）
    const generateMonthSegments = (filteredRecords: FishingRecord[]): MonthSegment[] => {
      const groups = groupRecordsByMonth(filteredRecords);
      const segments: MonthSegment[] = [
        {
          id: 'all',
          label: '全て',
          count: filteredRecords.length,
          year: 0,
          month: 0,
        },
      ];

      // 全ての月のセグメントを追加
      groups.forEach((group) => {
        const [year, month] = group.yearMonth.split('-').map(Number);
        segments.push({
          id: group.yearMonth,
          label: `${month}月`,
          count: group.records.length,
          year,
          month,
        });
      });

      return segments;
    };

    const monthGroups = groupRecordsByMonth(filteredRecords);
    const monthSegments = generateMonthSegments(filteredRecords);

    // 選択された月の記録をフィルタリング
    const filteredGroups = filters.selectedMonth === 'all'
      ? monthGroups
      : monthGroups.filter(g => g.yearMonth === filters.selectedMonth);

    // アクティブフィルターの数を計算
    const activeFilterCount = useMemo(() => {
      let count = 0;
      if (filters.searchQuery) count++;
      if (filters.species.length > 0) count++;
      if (filters.locations.length > 0) count++;
      if (filters.dateRange.start || filters.dateRange.end) count++;
      if (filters.sizeRange.min !== null || filters.sizeRange.max !== null) count++;
      return count;
    }, [filters]);

    // フィルタークリアハンドラー
    const handleClearFilters = () => {
      setFilters({
        searchQuery: '',
        species: [],
        locations: [],
        dateRange: { start: null, end: null },
        sizeRange: { min: null, max: null },
        selectedMonth: filters.selectedMonth, // 月選択は保持
      });
    };

    // 詳細フィルタークリアハンドラー（検索以外のフィルターをクリア）
    const handleClearDetailFilters = () => {
      setFilters({
        ...filters,
        species: [],
        locations: [],
        dateRange: { start: null, end: null },
        sizeRange: { min: null, max: null },
      });
    };

    return (
      <div data-testid={TestIds.FISHING_RECORDS_LIST} style={{ padding: '16px' }}>
        {isLoading ? (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Skeleton width="100%" height="48px" borderRadius="24px" />
            </div>
            <SkeletonList count={6} cardType="photo" gap="16px" />
          </div>
        ) : records.length > 0 ? (
          <>
            {/* 検索バー */}
            <SearchBar
              value={filters.searchQuery}
              onChange={(value) => setFilters({ ...filters, searchQuery: value })}
            />

            {/* フィルターパネル */}
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              availableSpecies={availableSpecies}
              availableLocations={availableLocations}
              onClear={handleClearDetailFilters}
            />

            {/* Segmented Control（月選択） */}
            <div style={{ marginBottom: '16px' }}>
              <SegmentedControl
                segments={monthSegments}
                selected={filters.selectedMonth || 'all'}
                onChange={(id) => setFilters({ ...filters, selectedMonth: id })}
              />
            </div>

            {/* 検索結果表示 */}
            {filteredRecords.length > 0 && (activeFilterCount > 0 || filters.searchQuery) && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: colors.primary[50],
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{
                  fontSize: '0.875rem',
                  color: colors.primary[700],
                  fontWeight: '500',
                }}>
                  🔍 {filteredRecords.length}件の記録が見つかりました
                </span>
                {(activeFilterCount > 0 || filters.searchQuery) && (
                  <button
                    onClick={handleClearFilters}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: colors.primary[500],
                      color: 'white',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.primary[600];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colors.primary[500];
                    }}
                  >
                    フィルタークリア
                  </button>
                )}
              </div>
            )}

            {/* 月別グループ表示 or 検索結果なし */}
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <div key={group.yearMonth} style={{ marginBottom: '32px' }}>
                  {/* 月ヘッダー（'全て'が選択されている場合のみ表示） */}
                  {filters.selectedMonth === 'all' && (
                    <div style={{
                      position: 'sticky',
                      top: '64px', // ヘッダーの高さ分オフセット
                      zIndex: 10,
                      backgroundColor: colors.surface.primary,
                      padding: '12px 0',
                      marginBottom: '16px',
                      borderBottom: `2px solid ${colors.primary[500]}`,
                    }}>
                      <h2 style={{
                        ...textStyles.headline.small,
                        color: colors.text.primary,
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        📅 {group.label}
                        <span style={{
                          ...textStyles.body.small,
                          color: colors.text.secondary,
                          fontWeight: 'normal',
                        }}>
                          ({group.records.length}件)
                        </span>
                      </h2>
                    </div>
                  )}

                  {/* 記録カード */}
                  <PhotoGrid gap="16px">
                    {group.records.map((record) => (
                      <ModernRecordCard
                        key={`${record.id}-${record.photoId || 'no-photo'}`}
                        record={record}
                      />
                    ))}
                  </PhotoGrid>
                </div>
              ))
            ) : (
              <EmptySearchResult
                searchQuery={filters.searchQuery}
                activeFiltersCount={activeFilterCount}
                onClearFilters={handleClearFilters}
              />
            )}
          </>
        ) : (
          <ModernCard variant="outlined" size="lg">
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: colors.text.secondary,
            }}>
              <Icons.List size={64} style={{ marginBottom: '16px' }} />
              <div style={{
                ...textStyles.headline.small,
                marginBottom: '8px',
              }}>
                記録がありません
              </div>
              <div style={textStyles.body.medium}>
                新しい釣果を記録してみましょう！
              </div>
            </div>
          </ModernCard>
        )}
      </div>
    );
  };

  // フォームコンテンツ
  const FormContent = () => (
    <div style={{ padding: '16px' }}>
      <FishingRecordForm
        onSubmit={handleFormSubmit}
        isLoading={isLoading}
      />
    </div>
  );

  // デバッグコンテンツ
  const DebugContent = () => (
    <div style={{ padding: '16px' }}>
      <ModernCard variant="outlined" size="md">
        <h3 style={{
          ...textStyles.headline.small,
          color: colors.text.primary,
          marginBottom: '16px',
        }}>
          アプリ情報
        </h3>
        <div style={{
          ...textStyles.body.medium,
          color: colors.text.secondary,
          lineHeight: 1.6,
        }}>
          <p>バージョン: 2.0.0</p>
          <p>記録数: {records.length}件</p>
          <p>テーマ: {settings.theme}</p>
          <p>言語: {settings.language}</p>
          {error && (
            <p style={{ color: colors.semantic.error.main }}>
              エラー: {error}
            </p>
          )}
        </div>
      </ModernCard>
    </div>
  );

  // 地図コンテンツ
  const MapContent = () => (
    <div style={{ height: 'calc(100vh - 64px - 56px)', width: '100%' }}>
      <FishingMap
        records={records}
        onRecordClick={handleRecordClick}
        selectedRecordId={mapSelectedRecordId}
      />
    </div>
  );

  // メインコンテンツレンダリング
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeContent />;
      case 'list': return <ListContent />;
      case 'form': return <FormContent />;
      case 'map': return <MapContent />;
      case 'debug': return <DebugContent />;
      default: return <HomeContent />;
    }
  };

  return (
    <>
      {/* オフラインインジケーター */}
      <OfflineIndicator isOnline={isOnline} />

      <AppLayout
        header={
          <ModernHeader
            title={getHeaderTitle()}
            subtitle={getHeaderSubtitle()}
            actions={
              <FloatingActionButton
                icon={<Icons.Add />}
                size="md"
                onClick={() => setActiveTab('form')}
                style={{
                  display: activeTab === 'form' ? 'none' : 'flex',
                }}
              />
            }
          />
        }
        navigation={
          <BottomNavigation
            items={navigationItems}
            onItemClick={(id) => setActiveTab(id as any)}
          />
        }
      >
        {renderContent()}

      {/* モーダル */}
      {selectedRecord && (
        <FishingRecordDetail
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onEdit={() => handleRecordEdit(selectedRecord)}
          onDelete={() => handleRecordDelete(selectedRecord)}
          onNavigateToMap={(record) => {
            setSelectedRecord(null);
            setMapSelectedRecordId(record.id);
            setActiveTab('map');
          }}
          photoUrl={detailPhotoUrl ?? undefined}
          loading={detailPhotoLoading}
        />
      )}

      {editingRecord && (
        <FishingRecordEditModal
          record={editingRecord}
          onSave={handleEditSave}
          onClose={() => setEditingRecord(null)}
        />
      )}

      {deletingRecord && (
        <DeleteConfirmModal
          record={deletingRecord}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isLoading={isDeletingInProgress}
        />
      )}

        {/* PWA コンポーネント */}
        <PWAInstallPrompt />
        <PWAInstallBanner />
        <PWAUpdateNotification />
      </AppLayout>
    </>
  );
}

export default ModernApp;