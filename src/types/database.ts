// データベース・API関連の型定義

import type { FishingRecord } from './entities';

/** データベース操作の結果 */
export interface DatabaseResult<T = unknown> {
  /** 操作成功フラグ */
  success: boolean;
  /** 結果データ */
  data?: T;
  /** エラー情報 */
  error?: DatabaseError;
}

/** データベースエラー */
export interface DatabaseError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** 詳細情報 */
  details?: unknown;
}

/** 記録一覧の取得パラメータ */
export interface GetRecordsParams {
  /** ページサイズ */
  limit?: number;
  /** オフセット */
  offset?: number;
  /** ソート順 */
  sortBy?: SortableField;
  /** ソート方向 */
  sortOrder?: SortOrder;
  /** 検索フィルター */
  filter?: RecordFilter;
}

/** 記録の検索フィルター */
export interface RecordFilter {
  /** 期間フィルター */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** 魚種フィルター */
  fishSpecies?: string[];
  /** 場所フィルター */
  location?: string;
  /** サイズ範囲フィルター */
  sizeRange?: {
    min: number;
    max: number;
  };
}

/** ソート可能なフィールド */
export type SortableField = keyof Pick<FishingRecord, 'date' | 'createdAt' | 'fishSpecies' | 'size'>;

/** ソート順 */
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = typeof SORT_ORDERS[number];