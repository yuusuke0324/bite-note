/**
 * 魚種データサービス
 *
 * @description
 * 魚種マスターデータの読み込み・管理を行うサービス
 * 静的JSONファイルの読み込みとキャッシュ管理
 *
 * @version 2.7.1
 * @since 2025-10-25
 */

import type { FishSpecies } from '../../types';
import fishSpeciesData from '../../data/fish-species.json';

/**
 * 魚種データローダー設定
 */
interface DataLoaderConfig {
  /**
   * デバッグモード
   */
  debug?: boolean;

  /**
   * データソース種別フィルタ
   */
  sourceFilter?: 'official' | 'user' | 'all';
}

/**
 * 魚種データサービスクラス
 */
export class FishSpeciesDataService {
  private cache: FishSpecies[] | null = null;
  private config: DataLoaderConfig;

  constructor(config: DataLoaderConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      sourceFilter: config.sourceFilter ?? 'all'
    };
  }

  /**
   * 魚種データを読み込み
   *
   * @returns 魚種データの配列
   */
  async loadSpecies(): Promise<FishSpecies[]> {
    // キャッシュがあれば返す
    if (this.cache) {
      if (this.config.debug) {
        console.log('🐟 魚種データ: キャッシュから取得');
      }
      return this.cache;
    }

    try {
      if (this.config.debug) {
        console.log('🐟 魚種データ読み込み開始...');
        console.log(`   バージョン: ${fishSpeciesData.version}`);
        console.log(`   更新日時: ${fishSpeciesData.updatedAt}`);
        console.log(`   魚種数: ${fishSpeciesData.count}`);
      }

      // JSONデータをFishSpecies型に変換
      const species: FishSpecies[] = fishSpeciesData.species.map(s => ({
        id: s.id,
        standardName: s.standardName,
        scientificName: s.scientificName,
        aliases: s.aliases,
        regionalNames: s.regionalNames,
        category: s.category as FishSpecies['category'],
        season: s.season as FishSpecies['season'],
        habitat: s.habitat as FishSpecies['habitat'],
        popularity: s.popularity,
        image: s.image,
        source: s.source as 'official' | 'user',
        // JSONでは日付を文字列として保存しているため、必要に応じてDate型に変換
        createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
        updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(fishSpeciesData.updatedAt)
      }));

      // ソースフィルタを適用
      let filtered = species;
      if (this.config.sourceFilter && this.config.sourceFilter !== 'all') {
        filtered = species.filter(s => s.source === this.config.sourceFilter);
      }

      // キャッシュに保存
      this.cache = filtered;

      if (this.config.debug) {
        console.log(`✅ 魚種データ読み込み完了: ${filtered.length}種`);
      }

      return filtered;

    } catch (error) {
      console.error('❌ 魚種データの読み込みに失敗:', error);
      throw new Error(`魚種データの読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache = null;
    if (this.config.debug) {
      console.log('🗑️  魚種データキャッシュをクリア');
    }
  }

  /**
   * データバージョン情報を取得
   */
  getVersion(): string {
    return fishSpeciesData.version;
  }

  /**
   * 最終更新日時を取得
   */
  getLastUpdated(): Date {
    return new Date(fishSpeciesData.updatedAt);
  }

  /**
   * データ統計を取得
   */
  getDataStats(): {
    version: string;
    updatedAt: Date;
    totalCount: number;
    description: string;
  } {
    return {
      version: fishSpeciesData.version,
      updatedAt: new Date(fishSpeciesData.updatedAt),
      totalCount: fishSpeciesData.count,
      description: fishSpeciesData.description
    };
  }
}

/**
 * シングルトンインスタンス
 */
export const fishSpeciesDataService = new FishSpeciesDataService({ debug: false });
