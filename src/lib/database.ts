// IndexedDBデータベース設定とDexie.jsラッパー

import Dexie, { type Table } from 'dexie';
import type { FishingRecord, PhotoData } from '../types';
import type { TideCacheRecord, RegionalDataRecord } from '../types/tide';

// ジオコーディングキャッシュのインターフェース
export interface GeocodeCache {
  id?: number;
  cacheKey: string;
  address: string;
  timestamp: number;
  expiresAt: number;
}

// データベース内のテーブル定義
export interface FishingRecordDB extends Dexie {
  fishing_records: Table<FishingRecord>;
  photos: Table<PhotoData>;
  app_settings: Table<AppSetting>;
  app_metadata: Table<AppMetadata>;
  // 潮汐システム関連テーブル
  tide_cache: Table<TideCacheRecord>;
  tide_regional_data: Table<RegionalDataRecord>;
  // ジオコーディングキャッシュテーブル
  geocode_cache: Table<GeocodeCache>;
}

// アプリケーション設定のインターフェース
export interface AppSetting {
  setting_key: string;
  setting_value: string;
  value_type: 'string' | 'number' | 'boolean' | 'object';
  updated_at: Date;
}

// アプリメタデータのインターフェース
export interface AppMetadata {
  meta_key: string;
  meta_value: string;
  created_at: Date;
  updated_at: Date;
}

// データベースクラスの定義
class FishingDatabase extends Dexie implements FishingRecordDB {
  fishing_records!: Table<FishingRecord>;
  photos!: Table<PhotoData>;
  app_settings!: Table<AppSetting>;
  app_metadata!: Table<AppMetadata>;
  // 潮汐システム関連テーブル
  tide_cache!: Table<TideCacheRecord>;
  tide_regional_data!: Table<RegionalDataRecord>;
  // ジオコーディングキャッシュテーブル
  geocode_cache!: Table<GeocodeCache>;

  constructor() {
    super('FishingRecordDB');

    // バージョン1のスキーマ定義
    this.version(1).stores({
      // 釣果記録テーブル - プライマリキーとインデックス定義
      fishing_records: '&id, date, fish_species, location, created_at, [coordinates.latitude+coordinates.longitude]',

      // 写真データテーブル
      photos: '&id, uploaded_at, mime_type, file_size',

      // アプリケーション設定テーブル
      app_settings: '&setting_key, updated_at',

      // メタデータテーブル
      app_metadata: '&meta_key, updated_at'
    });

    // バージョン2: 潮汐システム追加
    this.version(2).stores({
      // 既存テーブルは変更なし
      fishing_records: '&id, date, fish_species, location, created_at, [coordinates.latitude+coordinates.longitude]',
      photos: '&id, uploaded_at, mime_type, file_size',
      app_settings: '&setting_key, updated_at',
      app_metadata: '&meta_key, updated_at',

      // 潮汐キャッシュテーブル - 緯度経度と日付で複合インデックス
      tide_cache: '++id, cacheKey, createdAt, expiresAt, lastAccessed',

      // 潮汐地域データテーブル - 地域IDと座標でインデックス
      tide_regional_data: '++id, regionId, [latitude+longitude], isActive, createdAt'
    });

    // バージョン3: ジオコーディングキャッシュ追加
    this.version(3).stores({
      fishing_records: '&id, date, fish_species, location, created_at, [coordinates.latitude+coordinates.longitude]',
      photos: '&id, uploaded_at, mime_type, file_size',
      app_settings: '&setting_key, updated_at',
      app_metadata: '&meta_key, updated_at',
      tide_cache: '++id, cacheKey, createdAt, expiresAt, lastAccessed',
      tide_regional_data: '++id, regionId, [latitude+longitude], isActive, createdAt',
      // ジオコーディングキャッシュテーブル - キャッシュキーと有効期限でインデックス
      geocode_cache: '++id, &cacheKey, expiresAt, timestamp'
    });

    // データベース初期化時のフック
    this.on('ready', this.initializeDatabase.bind(this));
  }

  // データベース初期化処理
  private async initializeDatabase() {
    // デフォルト設定が存在しない場合は追加
    const settingsCount = await this.app_settings.count();
    if (settingsCount === 0) {
      await this.addDefaultSettings();
    }

    // メタデータの初期化
    const metadataCount = await this.app_metadata.count();
    if (metadataCount === 0) {
      await this.addDefaultMetadata();
    }
  }

  // デフォルト設定の追加
  private async addDefaultSettings(): Promise<void> {
    const defaultSettings: AppSetting[] = [
      {
        setting_key: 'theme',
        setting_value: '"light"',
        value_type: 'string',
        updated_at: new Date()
      },
      {
        setting_key: 'defaultSort',
        setting_value: '"date"',
        value_type: 'string',
        updated_at: new Date()
      },
      {
        setting_key: 'defaultUseGPS',
        setting_value: 'true',
        value_type: 'boolean',
        updated_at: new Date()
      },
      {
        setting_key: 'imageQuality',
        setting_value: '0.8',
        value_type: 'number',
        updated_at: new Date()
      },
      {
        setting_key: 'maxImageSize',
        setting_value: '5',
        value_type: 'number',
        updated_at: new Date()
      }
    ];

    await this.app_settings.bulkAdd(defaultSettings);
  }

  // デフォルトメタデータの追加
  private async addDefaultMetadata(): Promise<void> {
    const now = new Date();
    const defaultMetadata: AppMetadata[] = [
      {
        meta_key: 'db_version',
        meta_value: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        meta_key: 'app_version',
        meta_value: '1.0.0',
        created_at: now,
        updated_at: now
      },
      {
        meta_key: 'install_date',
        meta_value: now.toISOString(),
        created_at: now,
        updated_at: now
      },
      {
        meta_key: 'last_backup_date',
        meta_value: '',
        created_at: now,
        updated_at: now
      },
      {
        meta_key: 'total_records',
        meta_value: '0',
        created_at: now,
        updated_at: now
      }
    ];

    await this.app_metadata.bulkAdd(defaultMetadata);
  }

  // 設定値の取得（型安全）
  async getSetting<T>(key: string): Promise<T | null> {
    const setting = await this.app_settings.get(key);
    if (!setting) return null;

    try {
      return JSON.parse(setting.setting_value) as T;
    } catch {
      // JSONパースに失敗した場合は文字列として返す
      return setting.setting_value as unknown as T;
    }
  }

  // 設定値の更新
  async updateSetting<T>(key: string, value: T, valueType: AppSetting['value_type']): Promise<void> {
    const settingValue = typeof value === 'string' ? value : JSON.stringify(value);

    await this.app_settings.put({
      setting_key: key,
      setting_value: settingValue,
      value_type: valueType,
      updated_at: new Date()
    });
  }

  // メタデータの取得
  async getMetadata(key: string): Promise<string | null> {
    const metadata = await this.app_metadata.get(key);
    return metadata?.meta_value || null;
  }

  // メタデータの更新
  async updateMetadata(key: string, value: string): Promise<void> {
    const now = new Date();
    await this.app_metadata.put({
      meta_key: key,
      meta_value: value,
      created_at: now, // 既存の場合は変更されない
      updated_at: now
    });
  }
}

// データベースインスタンスのシングルトン
export const db = new FishingDatabase();