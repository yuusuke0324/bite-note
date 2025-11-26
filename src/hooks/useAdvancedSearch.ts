// 高度な検索・フィルター機能フック

import { useState, useMemo, useCallback } from 'react';
import type { FishingRecord } from '../types';
import type { SearchFilters } from '../components/AdvancedSearchFilter';
import { logger } from '../lib/errors/logger';

const DEFAULT_FILTERS: SearchFilters = {
  searchQuery: '',
  locations: [],
  fishSpecies: []
};

export const useAdvancedSearch = (records: FishingRecord[]) => {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [savedSearches, setSavedSearches] = useState<Array<{
    id: string;
    name: string;
    filters: SearchFilters;
    createdAt: Date;
  }>>([]);

  // フィルタリングされた記録
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // テキスト検索
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const searchableText = [
          record.fishSpecies,
          record.location,
          record.notes || ''
        ].join(' ').toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // 日付範囲フィルター
      if (filters.dateFrom) {
        const recordDate = record.date.toISOString().split('T')[0];
        if (recordDate < filters.dateFrom) {
          return false;
        }
      }

      if (filters.dateTo) {
        const recordDate = record.date.toISOString().split('T')[0];
        if (recordDate > filters.dateTo) {
          return false;
        }
      }

      // サイズ範囲フィルター
      if (filters.sizeFrom !== undefined) {
        if (!record.size || record.size < filters.sizeFrom) {
          return false;
        }
      }

      if (filters.sizeTo !== undefined) {
        if (!record.size || record.size > filters.sizeTo) {
          return false;
        }
      }

      // 場所フィルター
      if (filters.locations.length > 0) {
        if (!filters.locations.includes(record.location.trim())) {
          return false;
        }
      }

      // 魚種フィルター
      if (filters.fishSpecies.length > 0) {
        if (!filters.fishSpecies.includes(record.fishSpecies.trim())) {
          return false;
        }
      }

      // 写真の有無フィルター
      if (filters.hasPhoto === true) {
        if (!record.photoId) {
          return false;
        }
      }

      // GPS座標の有無フィルター
      if (filters.hasGPS === true) {
        if (!record.coordinates) {
          return false;
        }
      }

      return true;
    });
  }, [records, filters]);

  // 検索統計
  const searchStats = useMemo(() => {
    const total = records.length;
    const filtered = filteredRecords.length;
    const filterRate = total > 0 ? Math.round((filtered / total) * 100) : 0;

    // 検索結果の統計
    const fishSpeciesCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();
    const sizeCounts: number[] = [];
    let totalSize = 0;
    let sizeCount = 0;

    filteredRecords.forEach(record => {
      // 魚種の集計
      const species = record.fishSpecies.trim();
      if (species) {
        fishSpeciesCounts.set(species, (fishSpeciesCounts.get(species) || 0) + 1);
      }

      // 場所の集計
      const location = record.location.trim();
      if (location) {
        locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
      }

      // サイズの集計
      if (record.size && record.size > 0) {
        sizeCounts.push(record.size);
        totalSize += record.size;
        sizeCount++;
      }
    });

    // サイズ統計
    const averageSize = sizeCount > 0 ? Math.round((totalSize / sizeCount) * 10) / 10 : 0;
    const maxSize = sizeCounts.length > 0 ? Math.max(...sizeCounts) : 0;
    const minSize = sizeCounts.length > 0 ? Math.min(...sizeCounts) : 0;

    return {
      total,
      filtered,
      filterRate,
      fishSpeciesCounts: Array.from(fishSpeciesCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      locationCounts: Array.from(locationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      sizeStats: {
        average: averageSize,
        max: maxSize,
        min: minSize,
        count: sizeCount
      }
    };
  }, [records, filteredRecords]);

  // フィルターの更新
  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  // フィルターのリセット
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // フィルターのクリア（個別）
  const clearFilter = useCallback((filterKey: keyof SearchFilters) => {
    setFilters(prev => {
      const updated = { ...prev };

      switch (filterKey) {
        case 'searchQuery':
          updated.searchQuery = '';
          break;
        case 'dateFrom':
        case 'dateTo':
          delete updated[filterKey];
          break;
        case 'sizeFrom':
        case 'sizeTo':
          delete updated[filterKey];
          break;
        case 'locations':
          updated.locations = [];
          break;
        case 'fishSpecies':
          updated.fishSpecies = [];
          break;
        case 'hasPhoto':
        case 'hasGPS':
          delete updated[filterKey];
          break;
      }

      return updated;
    });
  }, []);

  // 検索の保存
  const saveSearch = useCallback((name: string) => {
    const newSearch = {
      id: `search_${Date.now()}`,
      name,
      filters: { ...filters },
      createdAt: new Date()
    };

    setSavedSearches(prev => [...prev, newSearch]);

    // ローカルストレージに保存
    try {
      const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
      saved.push({
        ...newSearch,
        createdAt: newSearch.createdAt.toISOString()
      });
      localStorage.setItem('savedSearches', JSON.stringify(saved));
    } catch (error) {
      logger.error('Failed to save search', { error });
    }

    return newSearch.id;
  }, [filters]);

  // 保存された検索の読み込み
  const loadSavedSearch = useCallback((searchId: string) => {
    const search = savedSearches.find(s => s.id === searchId);
    if (search) {
      setFilters(search.filters);
      return true;
    }
    return false;
  }, [savedSearches]);

  // 保存された検索の削除
  const deleteSavedSearch = useCallback((searchId: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== searchId));

    // ローカルストレージからも削除
    try {
      const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
      const updated = saved.filter((s: any) => s.id !== searchId);
      localStorage.setItem('savedSearches', JSON.stringify(updated));
    } catch (error) {
      logger.error('Failed to delete saved search', { error });
    }
  }, []);

  // 初期化時に保存された検索を読み込み
  const loadSavedSearches = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
      const loadedSearches = saved.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }));
      setSavedSearches(loadedSearches);
    } catch (error) {
      logger.error('Failed to load saved searches', { error });
    }
  }, []);

  // アクティブフィルター数
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

  // フィルターが空かどうか
  const isFiltersEmpty = useMemo(() => {
    return activeFilterCount === 0;
  }, [activeFilterCount]);

  // 検索クエリのエクスポート（URLパラメータ用）
  const exportFiltersToURL = useCallback(() => {
    const params = new URLSearchParams();

    if (filters.searchQuery.trim()) {
      params.set('q', filters.searchQuery);
    }
    if (filters.dateFrom) {
      params.set('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params.set('dateTo', filters.dateTo);
    }
    if (filters.sizeFrom !== undefined) {
      params.set('sizeFrom', filters.sizeFrom.toString());
    }
    if (filters.sizeTo !== undefined) {
      params.set('sizeTo', filters.sizeTo.toString());
    }
    if (filters.locations.length > 0) {
      params.set('locations', filters.locations.join(','));
    }
    if (filters.fishSpecies.length > 0) {
      params.set('fishSpecies', filters.fishSpecies.join(','));
    }
    if (filters.hasPhoto) {
      params.set('hasPhoto', 'true');
    }
    if (filters.hasGPS) {
      params.set('hasGPS', 'true');
    }

    return params.toString();
  }, [filters]);

  // URLパラメータからフィルターをインポート
  const importFiltersFromURL = useCallback((searchParams: URLSearchParams) => {
    const importedFilters: SearchFilters = {
      searchQuery: searchParams.get('q') || '',
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sizeFrom: searchParams.get('sizeFrom') ? Number(searchParams.get('sizeFrom')) : undefined,
      sizeTo: searchParams.get('sizeTo') ? Number(searchParams.get('sizeTo')) : undefined,
      locations: searchParams.get('locations')?.split(',').filter(Boolean) || [],
      fishSpecies: searchParams.get('fishSpecies')?.split(',').filter(Boolean) || [],
      hasPhoto: searchParams.get('hasPhoto') === 'true' ? true : undefined,
      hasGPS: searchParams.get('hasGPS') === 'true' ? true : undefined
    };

    setFilters(importedFilters);
  }, []);

  return {
    // フィルター状態
    filters,
    updateFilters,
    resetFilters,
    clearFilter,
    isFiltersEmpty,
    activeFilterCount,

    // 検索結果
    filteredRecords,
    searchStats,

    // 保存された検索
    savedSearches,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    loadSavedSearches,

    // URL連携
    exportFiltersToURL,
    importFiltersFromURL
  };
};