// 写真メタデータと天気情報関連の型定義

import type { Coordinates } from './entities';

// 天気情報
export interface WeatherData {
  condition: string;        // 天気状況（晴れ、雨、曇り等）
  temperature: number;      // 気温 (°C)
  humidity: number;         // 湿度 (%)
  windSpeed: number;        // 風速 (m/s)
  pressure: number;         // 気圧 (hPa)
  icon: string;            // 天気アイコンID
  description: string;      // 詳細説明
}

// 海洋データ
export interface MarineData {
  seaTemperature: number;   // 海面水温 (°C)
  waveHeight: number;       // 波高 (m)
  waveDirection: number;    // 波向き (°)
  currentVelocity?: number; // 海流速度 (m/s) - オプション
  currentDirection?: number; // 海流方向 (°) - オプション
}

// 海洋データ取得結果
export interface MarineResult {
  success: boolean;
  data?: MarineData;
  error?: {
    message: string;
    code?: string;
  };
}

// カメラ情報
export interface CameraInfo {
  make?: string;           // メーカー
  model?: string;          // 機種
  lens?: string;           // レンズ情報
  aperture?: string;       // F値
  shutterSpeed?: string;   // シャッター速度
  iso?: string;            // ISO感度
  focalLength?: string;    // 焦点距離
  settings?: {
    fNumber?: number;      // F値
    exposureTime?: string; // 露出時間
    iso?: number;          // ISO感度
  };
}

// 写真メタデータ
export interface PhotoMetadata {
  coordinates?: Coordinates;  // GPS座標
  datetime?: Date;           // 撮影日時
  camera?: CameraInfo;       // カメラ情報
  location?: string;         // 住所（逆ジオコーディング結果）
  weather?: WeatherData;     // 天気情報
}

// 自動入力用データ
export interface AutoFillData {
  location?: string;
  coordinates?: Coordinates;
  date?: Date;
  datetime?: Date;
  weather?: WeatherData;
  seaTemperature?: number;  // 海面水温 (°C)
  source?: 'exif' | 'manual' | 'gps';
}

// プライバシー設定
export interface PrivacySettings {
  photoMetadataConsent: boolean;      // 写真メタデータ利用同意
  weatherDataConsent: boolean;        // 天気データ取得同意
  locationSharingConsent: boolean;    // 位置情報共有同意
  lastConsentDate: Date;              // 最終同意日時
}

// 地理情報API結果
export interface GeocodeResult {
  success: boolean;
  address?: string;
  error?: {
    code: string;
    message: string;
  };
}

// 天気API結果
export interface WeatherResult {
  success: boolean;
  data?: WeatherData;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// EXIFデータ抽出結果
export interface ExifExtractionResult {
  success: boolean;
  metadata?: PhotoMetadata;
  error?: {
    code: 'NO_EXIF' | 'INVALID_FILE' | 'PROCESSING_ERROR';
    message: string;
  };
}

// API制限管理
export interface ApiUsage {
  service: 'weather' | 'geocoding';
  requestCount: number;
  lastRequestTime: Date;
  dailyLimit: number;
  resetTime: Date;
}

// 天気API設定
export interface WeatherApiConfig {
  apiKey: string;
  baseUrl: string;
  dailyLimit: number;
  cacheDuration: number; // ミリ秒
}