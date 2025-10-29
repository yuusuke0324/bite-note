// GPS・位置情報関連の型定義

import type { Coordinates } from './entities';

/** GPS取得の設定 */
export interface GeolocationOptions {
  /** 高精度取得フラグ */
  enableHighAccuracy: boolean;
  /** タイムアウト（ミリ秒） */
  timeout: number;
  /** 最大キャッシュ時間（ミリ秒） */
  maximumAge: number;
}

/** GPS取得結果 */
export interface GeolocationResult {
  /** 取得成功フラグ */
  success: boolean;
  /** 位置情報 */
  coordinates?: Coordinates;
  /** エラー情報 */
  error?: GeolocationError;
}

/** GPS取得エラー */
export interface GeolocationError {
  /** エラーコード */
  code: number;
  /** エラーメッセージ */
  message: string;
}