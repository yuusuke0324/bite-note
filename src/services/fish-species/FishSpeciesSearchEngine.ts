/**
 * 魚種検索エンジン
 *
 * @description
 * 魚種マスターデータの高速検索を実現する検索エンジン
 * 前方一致インデックスによるO(1)検索、カタカナ→ひらがな正規化による表記揺れ吸収
 *
 * @performance
 * - インデックス構築: < 10ms (200種)
 * - 検索実行: < 1ms (O(1) Map検索)
 * - メモリ使用量: ~500KB (200種)
 *
 * @version 2.7.1
 * @since 2025-10-25
 */

import type {
  FishSpecies,
  FishSearchOptions,
  FishSearchResult,
  SearchEngineInitOptions,
  FishDatabaseStats,
  FishCategory
} from '../../types';
import { logger } from '../../lib/errors';
import { performanceMonitor } from '../../lib/performance-monitor';

/**
 * 魚種検索エンジンクラス
 */
export class FishSpeciesSearchEngine {
  /** 魚種データのマップ（id → FishSpecies） */
  private species: Map<string, FishSpecies>;

  /** 前方一致インデックス（prefix → speciesIds[]） */
  private prefixIndex: Map<string, string[]>;

  /** 初期化オプション */
  private options: SearchEngineInitOptions;

  /** インデックス構築完了フラグ */
  private isIndexed: boolean = false;

  /**
   * コンストラクタ
   *
   * @param speciesData - 魚種データ配列
   * @param options - 初期化オプション
   */
  constructor(
    speciesData: FishSpecies[] = [],
    options: Partial<SearchEngineInitOptions> = {}
  ) {
    this.species = new Map();
    this.prefixIndex = new Map();
    this.options = {
      maxPrefixLength: options.maxPrefixLength ?? 3,
      caseInsensitive: options.caseInsensitive ?? true,
      normalizeKana: options.normalizeKana ?? true,
      debug: options.debug ?? false
    };

    if (speciesData.length > 0) {
      this.buildIndex(speciesData);
    }
  }

  /**
   * インデックスを構築
   *
   * @param data - 魚種データ配列
   */
  buildIndex(data: FishSpecies[]): void {
    performanceMonitor.measure('fish-species-index-build', () => {
      // データマップを構築
      this.species = new Map(data.map(s => [s.id, s]));
      this.prefixIndex = new Map();

      // 各魚種についてインデックスを構築
      data.forEach(species => {
        // 検索対象となるすべてのキーワードを収集
        const searchTerms = [
          species.standardName,
          ...species.aliases,
          ...species.regionalNames
        ];

        // 学名も検索対象に含める（オプション）
        if (species.scientificName) {
          searchTerms.push(species.scientificName);
        }

        // 各検索キーワードについてプレフィックスインデックスを作成
        searchTerms.forEach(term => {
          const normalized = this.normalize(term);

          // 1文字から最大プレフィックス長までのインデックスを作成
          for (let i = 1; i <= Math.min(normalized.length, this.options.maxPrefixLength || 10); i++) {
            const prefix = normalized.substring(0, i);

            if (!this.prefixIndex.has(prefix)) {
              this.prefixIndex.set(prefix, []);
            }

            const ids = this.prefixIndex.get(prefix)!;
            // 重複を避けて追加
            if (!ids.includes(species.id)) {
              ids.push(species.id);
            }
          }
        });
      });

      this.isIndexed = true;
    });

    if (this.options.debug) {
      logger.debug('FishSpeciesSearchEngine インデックス構築完了', {
        speciesCount: data.length,
        indexEntries: this.prefixIndex.size
      });
    }
  }

  /**
   * テキストを正規化（カタカナ→ひらがな、小文字化）
   *
   * @param text - 正規化対象のテキスト
   * @returns 正規化されたテキスト
   */
  private normalize(text: string): string {
    let normalized = text.trim();

    // カタカナ→ひらがな正規化
    if (this.options.normalizeKana) {
      normalized = normalized.replace(/[ァ-ン]/g, s =>
        String.fromCharCode(s.charCodeAt(0) - 0x60)
      );
    }

    // 小文字化
    if (this.options.caseInsensitive) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * 魚種を検索
   *
   * @param query - 検索クエリ
   * @param options - 検索オプション
   * @returns 検索結果の配列
   */
  search(query: string, options: FishSearchOptions = {}): FishSpecies[] {
    return performanceMonitor.measure('fish-species-search', () => {
      let results: FishSpecies[] = [];

      // 空クエリの場合は全データからフィルタリング
      if (!query || query.trim().length === 0) {
        results = Array.from(this.species.values());
      } else {
        // クエリを正規化
        const normalized = this.normalize(query);

        // 前方一致検索を実行
        results = this.performPrefixSearch(normalized);
      }

      // フィルタリング処理（空クエリ・通常検索共通）
      results = this.applyFilters(results, options);

      // ソート（人気度順）
      if (options.sortByPopularity !== false) {
        results.sort((a, b) => b.popularity - a.popularity);
      }

      // 件数制限
      const limit = options.limit ?? 10;
      results = results.slice(0, limit);

      if (this.options.debug) {
        logger.debug(`魚種検索実行`, {
          query,
          resultCount: results.length
        });
      }

      return results;
    });
  }

  /**
   * 前方一致検索を実行
   *
   * @param normalizedQuery - 正規化されたクエリ
   * @returns マッチした魚種の配列
   */
  private performPrefixSearch(normalizedQuery: string): FishSpecies[] {
    // 3文字プレフィックスで候補を取得
    const prefix = normalizedQuery.slice(0, this.options.maxPrefixLength || 3);
    const candidateIds = this.prefixIndex.get(prefix) || [];

    // 候補から前方一致フィルタリング
    return candidateIds
      .map(id => this.species.get(id)!)
      .filter(Boolean)
      .filter(fish => {
        // 各検索対象フィールドを正規化してチェック
        const normalizedStandard = this.normalize(fish.standardName);
        const normalizedScientific = fish.scientificName ? this.normalize(fish.scientificName) : '';
        const normalizedAliases = fish.aliases.map(a => this.normalize(a));
        const normalizedRegional = fish.regionalNames.map(r => this.normalize(r));

        return (
          normalizedStandard.startsWith(normalizedQuery) ||
          normalizedScientific.startsWith(normalizedQuery) ||
          normalizedAliases.some(alias => alias.startsWith(normalizedQuery)) ||
          normalizedRegional.some(regional => regional.startsWith(normalizedQuery))
        );
      });
  }

  /**
   * フィルタを適用
   *
   * @param results - フィルタ対象の魚種配列
   * @param options - 検索オプション
   * @returns フィルタリング後の魚種配列
   */
  private applyFilters(results: FishSpecies[], options: FishSearchOptions): FishSpecies[] {
    let filtered = results;

    if (options.category) {
      filtered = filtered.filter(s => s.category === options.category);
    }
    if (options.season) {
      filtered = filtered.filter(s => s.season.includes(options.season!));
    }
    if (options.habitat) {
      filtered = filtered.filter(s => s.habitat.includes(options.habitat!));
    }

    return filtered;
  }

  /**
   * 詳細な検索結果を取得（マッチ情報付き）
   *
   * @param query - 検索クエリ
   * @param options - 検索オプション
   * @returns 詳細な検索結果の配列
   */
  searchDetailed(query: string, options: FishSearchOptions = {}): FishSearchResult[] {
    const species = this.search(query, options);
    const normalized = this.normalize(query);

    return species.map(s => {
      // どのフィールドでマッチしたかを判定
      let matchedField: FishSearchResult['matchedField'] = 'standardName';
      let matchedText = s.standardName;

      if (this.normalize(s.standardName).startsWith(normalized)) {
        matchedField = 'standardName';
        matchedText = s.standardName;
      } else {
        const matchedAlias = s.aliases.find(a => this.normalize(a).startsWith(normalized));
        if (matchedAlias) {
          matchedField = 'aliases';
          matchedText = matchedAlias;
        } else {
          const matchedRegional = s.regionalNames.find(r => this.normalize(r).startsWith(normalized));
          if (matchedRegional) {
            matchedField = 'regionalNames';
            matchedText = matchedRegional;
          } else if (s.scientificName && this.normalize(s.scientificName).startsWith(normalized)) {
            matchedField = 'scientificName';
            matchedText = s.scientificName;
          }
        }
      }

      // スコア計算（完全一致ほど高スコア）
      const score = matchedText === query ? 100 :
                    this.normalize(matchedText) === normalized ? 90 :
                    matchedField === 'standardName' ? 80 :
                    matchedField === 'aliases' ? 70 :
                    matchedField === 'regionalNames' ? 60 : 50;

      return {
        species: s,
        score,
        matchedField,
        matchedText
      };
    });
  }

  /**
   * 人気魚種を取得
   *
   * @param limit - 取得件数
   * @returns 人気魚種の配列
   */
  getPopular(limit: number = 10): FishSpecies[] {
    return Array.from(this.species.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * カテゴリ別に魚種を取得
   *
   * @param category - カテゴリ
   * @param limit - 取得件数
   * @returns 魚種の配列
   */
  getByCategory(category: FishCategory, limit: number = 10): FishSpecies[] {
    return Array.from(this.species.values())
      .filter(s => s.category === category)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * IDで魚種を取得
   *
   * @param id - 魚種ID
   * @returns 魚種オブジェクト、存在しない場合はundefined
   */
  getById(id: string): FishSpecies | undefined {
    return this.species.get(id);
  }

  /**
   * データベース統計情報を取得
   *
   * @returns 統計情報
   */
  getStats(): FishDatabaseStats {
    const byCategory: Record<FishCategory, number> = {
      '青魚': 0,
      '白身魚': 0,
      '根魚': 0,
      '回遊魚': 0,
      'エギング': 0,
      'その他': 0
    };

    const bySource: Record<'official' | 'user', number> = {
      'official': 0,
      'user': 0
    };

    let lastUpdated = new Date(0);

    this.species.forEach(s => {
      byCategory[s.category]++;
      bySource[s.source]++;

      if (s.updatedAt && s.updatedAt > lastUpdated) {
        lastUpdated = s.updatedAt;
      }
    });

    // インデックスサイズの概算（バイト）
    const indexSize = this.prefixIndex.size * 50; // 1エントリあたり約50バイト

    return {
      totalSpecies: this.species.size,
      byCategory,
      bySource,
      lastUpdated,
      indexSize
    };
  }

  /**
   * インデックスをクリア
   */
  clear(): void {
    this.species.clear();
    this.prefixIndex.clear();
    this.isIndexed = false;
  }

  /**
   * インデックス構築済みかどうかを返す
   */
  isReady(): boolean {
    return this.isIndexed;
  }
}
