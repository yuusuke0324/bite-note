// フォーム関連の型定義

import type { Coordinates } from './entities';

/** 釣果記録作成フォームの入力データ */
export interface CreateFishingRecordForm {
  /** 釣行日時（文字列形式） */
  date: string;
  /** 釣り場所 */
  location: string;
  /** 魚の種類 */
  fishSpecies: string;
  /** 魚のサイズ（数値、任意） */
  size?: number;
  /** 魚の重量（g、任意） */
  weight?: number;
  /** 天気（任意） */
  weather?: string;
  /** 写真ファイル（任意） */
  photo?: File;
  /** 写真ID（任意） */
  photoId?: string;
  /** 座標情報（任意） */
  coordinates?: Coordinates;
  /** 海面水温（°C、任意） */
  seaTemperature?: number;
  /** メモ・コメント（任意） */
  notes?: string;
  /** GPS使用フラグ */
  useGPS: boolean;
}

/** 釣果記録更新フォームの入力データ */
export type UpdateFishingRecordForm = Partial<Omit<CreateFishingRecordForm, 'useGPS'>>;

/** フォームバリデーション結果 */
export interface FormValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラーメッセージのマップ */
  errors: Record<string, string>;
}

/** バリデーション可能なフィールド */
export type ValidatableField = keyof CreateFishingRecordForm;