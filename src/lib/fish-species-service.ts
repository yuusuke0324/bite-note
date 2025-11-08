/**
 * 魚種検索サービス
 *
 * @description
 * FishSpeciesSearchEngineのグローバルシングルトンインスタンス。
 * 同期的に初期化され、コンポーネント間で共有される。
 *
 * アーキテクチャ:
 * - サービス層パターン（Bite Noteの標準パターン）
 * - O(1)検索パフォーマンス（Trie構造）
 * - React act()警告の根本原因解決
 *
 * @version 1.0.0
 * @since 2025-11-08
 */

import fishSpeciesData from '../data/fish-species.json';
import { FishSpeciesSearchEngine } from '../services/fish-species/FishSpeciesSearchEngine';
import type { FishSpecies } from '../types';

/**
 * 魚種検索エンジンのグローバルシングルトン
 *
 * NOTE: 同期的に初期化されるため、コンポーネント内でのuseEffectは不要
 */
export const fishSpeciesSearchEngine = new FishSpeciesSearchEngine(
  fishSpeciesData.species as FishSpecies[],
  {
    debug: false,
    maxPrefixLength: 3,
    caseInsensitive: true,
    normalizeKana: true
  }
);
