// 釣果記録アプリ エンティティ型定義

import type { WeatherData } from './metadata';
import type { TideInfo, TideContext } from './tide';

/** 釣果記録のメインエンティティ */
export interface FishingRecord {
  /** 一意のID（UUID v4） */
  id: string;
  /** 釣行日時 */
  date: Date;
  /** 釣り場所（自由入力） */
  location: string;
  /** 魚の種類 */
  fishSpecies: string;
  /** 魚のサイズ（cm、任意） */
  size?: number;
  /** 魚の重量（g、任意） */
  weight?: number;
  /** 天候情報（任意） */
  weather?: string;
  /** 気温（℃、任意） */
  temperature?: number;
  /** 詳細天気情報（自動取得時） */
  weatherData?: WeatherData;
  /** 自動入力されたデータのフラグ */
  autoFilled?: {
    location: boolean;
    datetime: boolean;
    weather: boolean;
  };
  /** 写真のBlob ID（任意） */
  photoId?: string;
  /** 位置情報（GPS取得時） */
  coordinates?: Coordinates;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
  /** メモ・コメント（将来拡張用） */
  notes?: string;
  /** 潮汐情報（計算された潮汐データ） */
  tideInfo?: TideInfo;
  /** 潮汐コンテキスト（釣果と潮汐の関係性分析） */
  tideContext?: TideContext;
}

/** 位置情報 */
export interface Coordinates {
  /** 緯度 */
  latitude: number;
  /** 経度 */
  longitude: number;
  /** 精度（メートル） */
  accuracy?: number;
}

/** 写真データ */
export interface PhotoData {
  /** 写真のID */
  id: string;
  /** 画像データ（Blob） */
  blob: Blob;
  /** サムネイル画像データ（Blob、任意） */
  thumbnailBlob?: Blob;
  /** ファイル名 */
  filename: string;
  /** MIMEタイプ */
  mimeType: string;
  /** ファイルサイズ（バイト） */
  fileSize: number;
  /** アップロード日時 */
  uploadedAt: Date;
  /** 画像の幅（ピクセル、任意） */
  width?: number;
  /** 画像の高さ（ピクセル、任意） */
  height?: number;
  /** 圧縮品質（0-1、任意） */
  compressionQuality?: number;
}

/** 一覧表示用の軽量な記録データ */
export type RecordSummary = Pick<FishingRecord, 'id' | 'date' | 'location' | 'fishSpecies' | 'size'> & {
  /** サムネイル画像URL（任意） */
  thumbnailUrl?: string;
  /** 写真の有無 */
  hasPhoto: boolean;
};