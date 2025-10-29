// エクスポート・インポート関連の型定義

import type { FishingRecord } from './entities';
import type { AppSettings } from './state';

/** エクスポートデータの形式 */
export interface ExportData {
  /** データ形式のバージョン */
  version: string;
  /** エクスポート日時 */
  exportedAt: Date;
  /** 釣果記録リスト */
  records: FishingRecord[];
  /** 写真データ（Base64エンコード） */
  photos: ExportPhotoData[];
  /** アプリ設定 */
  settings: AppSettings;
}

/** エクスポート用写真データ */
export interface ExportPhotoData {
  /** 写真ID */
  id: string;
  /** Base64エンコードされた画像データ */
  data: string;
  /** MIMEタイプ */
  mimeType: string;
  /** 元のファイル名 */
  filename: string;
}

/** インポート結果 */
export interface ImportResult {
  /** インポート成功フラグ */
  success: boolean;
  /** インポートされた記録数 */
  importedRecords: number;
  /** インポートされた写真数 */
  importedPhotos: number;
  /** スキップされたアイテム数 */
  skippedItems: number;
  /** エラー情報 */
  errors: string[];
}