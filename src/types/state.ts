// 状態管理関連の型定義

import type { FishingRecord } from './entities';
import type { CreateFishingRecordForm, FormValidationResult } from './forms';

/** アプリケーション全体の状態 */
export interface AppState {
  /** 記録リスト */
  records: FishingRecord[];
  /** 現在選択中の記録 */
  selectedRecord?: FishingRecord;
  /** ローディング状態 */
  loading: boolean;
  /** エラー状態 */
  error?: string;
  /** UIの設定 */
  settings: AppSettings;
}

/** アプリケーション設定 */
export interface AppSettings {
  /** テーマ設定 */
  theme: Theme;
  /** 言語設定 */
  language: 'ja' | 'en';
  /** 日付フォーマット */
  dateFormat: 'YYYY/MM/DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  /** 温度単位 */
  temperatureUnit: 'celsius' | 'fahrenheit';
  /** サイズ単位 */
  sizeUnit: 'cm' | 'inch';
  /** デフォルトソート順 */
  defaultSort: 'date' | 'createdAt' | 'location' | 'fishSpecies' | 'size';
  /** GPS使用の初期値 */
  defaultUseGPS: boolean;
  /** 自動保存設定 */
  autoSave: boolean;
  /** 通知有効化 */
  enableNotifications: boolean;
  /** データ保持期間（日） */
  dataRetention: number;
  /** エクスポート形式 */
  exportFormat: 'json' | 'csv';
  /** デフォルト場所 */
  defaultLocation: string;
  /** デフォルト魚種 */
  defaultSpecies: string;
  /** チュートリアル表示 */
  showTutorial: boolean;
  /** コンパクト表示 */
  compactView: boolean;
  /** 天候情報表示 */
  showWeatherInfo: boolean;
  /** 自動位置取得 */
  autoLocation: boolean;
  /** 画像圧縮品質（0-1） */
  imageQuality: number;
  /** 最大画像サイズ（MB） */
  maxImageSize: number;
  /** 最大写真サイズ */
  maxPhotoSize: number;
}

/** フォーム状態 */
export interface FormState {
  /** フォームデータ */
  data: CreateFishingRecordForm;
  /** バリデーション結果 */
  validation: FormValidationResult;
  /** 送信中フラグ */
  isSubmitting: boolean;
  /** ダーティフラグ */
  isDirty: boolean;
}

/** アプリケーションのテーマ */
export const THEMES = ['light', 'dark', 'auto'] as const;
export type Theme = typeof THEMES[number];