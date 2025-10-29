/**
 * Test helpers - テスト用ヘルパー関数
 * TASK-101: TideDataValidator実装
 */

import type { RawTideData } from '../../../utils/validation/types';
import { ErrorType } from '../types';

/**
 * 有効な潮汐データを生成
 * @param count データ件数
 * @returns 有効な潮汐データ配列
 */
export function generateValidTideData(count: number): RawTideData[] {
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(Date.now() + i * 3600000).toISOString(), // 1時間間隔
    tide: Math.sin(i * 0.1) * 3 // -3 to 3 の範囲
  }));
}

/**
 * 構造エラーを作成
 * @returns 構造エラー
 */
export function createStructureError(): Error {
  const error = new Error('Data structure is corrupted') as any;
  error.code = 'STRUCTURE_ERROR';
  return error;
}

/**
 * 警告レベルエラーを作成
 * @returns 警告エラー
 */
export function createWarningError(): Error {
  const error = new Error('Minor data quality issue') as any;
  error.code = 'DATA_QUALITY_WARNING';
  return error;
}