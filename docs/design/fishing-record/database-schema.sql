-- 釣果記録アプリ データベーススキーマ
-- 対象: IndexedDB (Dexie.js)
-- 注意: IndexedDBはNoSQLなので、このSQLは論理設計として記述

-- ====================
-- 釣果記録テーブル
-- ====================

-- 釣果記録のメインテーブル
CREATE TABLE fishing_records (
    -- 一意のID（UUID v4）
    id VARCHAR(36) PRIMARY KEY,

    -- 釣行日時（ISO 8601形式）
    date DATETIME NOT NULL,

    -- 釣り場所（自由入力テキスト）
    location VARCHAR(255) NOT NULL,

    -- 魚の種類
    fish_species VARCHAR(100) NOT NULL,

    -- 魚のサイズ（cm、任意）
    size DECIMAL(5,2) NULL,

    -- 写真のBlob ID（任意）
    photo_id VARCHAR(36) NULL,

    -- GPS緯度（任意）
    latitude DECIMAL(10,7) NULL,

    -- GPS経度（任意）
    longitude DECIMAL(10,7) NULL,

    -- GPS精度（メートル、任意）
    gps_accuracy DECIMAL(8,2) NULL,

    -- 作成日時
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 更新日時
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- メモ・コメント（将来拡張用）
    notes TEXT NULL,

    -- データバージョン（スキーマ変更対応）
    schema_version INTEGER NOT NULL DEFAULT 1
);

-- ====================
-- 写真データテーブル
-- ====================

-- 写真データを格納するテーブル
CREATE TABLE photos (
    -- 写真の一意ID（UUID v4）
    id VARCHAR(36) PRIMARY KEY,

    -- 元のファイル名
    filename VARCHAR(255) NOT NULL,

    -- MIMEタイプ
    mime_type VARCHAR(50) NOT NULL,

    -- ファイルサイズ（バイト）
    file_size INTEGER NOT NULL,

    -- 画像データ（Blob）
    -- 注意: IndexedDBではblobプロパティとして格納
    blob_data BLOB NOT NULL,

    -- アップロード日時
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 画像の幅（ピクセル）
    width INTEGER NULL,

    -- 画像の高さ（ピクセル）
    height INTEGER NULL,

    -- 圧縮後の品質情報
    compression_quality DECIMAL(3,2) NULL
);

-- ====================
-- アプリケーション設定テーブル
-- ====================

-- ユーザー設定を格納するテーブル
CREATE TABLE app_settings (
    -- 設定のキー
    setting_key VARCHAR(100) PRIMARY KEY,

    -- 設定値（JSON形式）
    setting_value TEXT NOT NULL,

    -- 設定値の型
    value_type VARCHAR(20) NOT NULL, -- 'string', 'number', 'boolean', 'object'

    -- 最終更新日時
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================
-- 潮汐情報テーブル（新規追加）
-- ====================

-- 潮汐計算結果キャッシュテーブル
CREATE TABLE tide_cache (
    -- キャッシュキー（緯度,経度,日付の組み合わせ）
    cache_key VARCHAR(100) PRIMARY KEY,

    -- 緯度（小数点以下2桁まで）
    latitude DECIMAL(8,6) NOT NULL,

    -- 経度（小数点以下2桁まで）
    longitude DECIMAL(9,6) NOT NULL,

    -- 対象日付
    target_date DATE NOT NULL,

    -- 潮汐情報（JSON形式でHybridTideInfoを格納）
    tide_data TEXT NOT NULL,

    -- 計算アルゴリズムバージョン
    algorithm_version VARCHAR(50) NOT NULL DEFAULT 'hybrid-astronomical-v1',

    -- 計算精度
    accuracy VARCHAR(10) NOT NULL, -- 'high', 'medium', 'low'

    -- 計算時間（ミリ秒）
    calculation_time INTEGER NOT NULL,

    -- 信頼度スコア（0-100）
    confidence_score INTEGER NOT NULL,

    -- 作成日時
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 最終アクセス日時（LRUキャッシュ用）
    last_accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 潮汐地域補正データテーブル
CREATE TABLE tide_regional_data (
    -- ステーションID
    station_id VARCHAR(50) PRIMARY KEY,

    -- ステーション名
    station_name VARCHAR(100) NOT NULL,

    -- 緯度
    latitude DECIMAL(8,6) NOT NULL,

    -- 経度
    longitude DECIMAL(9,6) NOT NULL,

    -- M2振幅補正係数
    m2_amplitude DECIMAL(5,3) NOT NULL DEFAULT 1.0,

    -- M2位相補正（度）
    m2_phase DECIMAL(5,2) NOT NULL DEFAULT 0.0,

    -- S2振幅補正係数
    s2_amplitude DECIMAL(5,3) NOT NULL DEFAULT 1.0,

    -- S2位相補正（度）
    s2_phase DECIMAL(5,2) NOT NULL DEFAULT 0.0,

    -- 共鳴効果補正係数
    resonance_factors TEXT NULL, -- JSON形式

    -- データ品質フラグ
    data_quality VARCHAR(10) NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'

    -- 最終更新日時
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================
-- メタデータテーブル
-- ====================

-- アプリケーションのメタデータ
CREATE TABLE app_metadata (
    -- メタデータのキー
    meta_key VARCHAR(100) PRIMARY KEY,

    -- メタデータの値
    meta_value TEXT NOT NULL,

    -- 作成日時
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 更新日時
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================
-- インデックス定義
-- ====================

-- 釣果記録の検索用インデックス
CREATE INDEX idx_fishing_records_date ON fishing_records(date DESC);
CREATE INDEX idx_fishing_records_created_at ON fishing_records(created_at DESC);
CREATE INDEX idx_fishing_records_fish_species ON fishing_records(fish_species);
CREATE INDEX idx_fishing_records_location ON fishing_records(location);
CREATE INDEX idx_fishing_records_gps ON fishing_records(latitude, longitude);

-- 写真データの検索用インデックス
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at DESC);
CREATE INDEX idx_photos_mime_type ON photos(mime_type);
CREATE INDEX idx_photos_file_size ON photos(file_size);

-- 設定の検索用インデックス
CREATE INDEX idx_app_settings_updated_at ON app_settings(updated_at DESC);

-- ====================
-- 初期データ
-- ====================

-- デフォルト設定値
INSERT INTO app_settings (setting_key, setting_value, value_type) VALUES
('theme', '"light"', 'string'),
('defaultSort', '"date"', 'string'),
('defaultUseGPS', 'true', 'boolean'),
('imageQuality', '0.8', 'number'),
('maxImageSize', '5', 'number');

-- アプリケーションメタデータ
INSERT INTO app_metadata (meta_key, meta_value) VALUES
('db_version', '1.0.0'),
('app_version', '1.0.0'),
('install_date', datetime('now')),
('last_backup_date', ''),
('total_records', '0');

-- 潮汐地域補正データの初期データ（主要釣り場）
INSERT INTO tide_regional_data (station_id, station_name, latitude, longitude, m2_amplitude, m2_phase, s2_amplitude, s2_phase, data_quality) VALUES
('tokyo_bay', '東京湾', 35.6762, 139.6503, 1.45, 25.0, 0.68, 28.0, 'high'),
('osaka_bay', '大阪湾', 34.6937, 135.5023, 1.32, 22.0, 0.61, 25.0, 'high'),
('ise_bay', '伊勢湾', 34.8516, 136.9092, 1.78, 35.0, 0.82, 38.0, 'high'),
('suruga_bay', '駿河湾', 35.0281, 138.5644, 0.95, 15.0, 0.44, 18.0, 'medium'),
('sagami_bay', '相模湾', 35.2131, 139.3720, 0.88, 12.0, 0.41, 15.0, 'medium'),
('sendai_bay', '仙台湾', 38.2682, 141.0182, 0.76, 8.0, 0.35, 11.0, 'medium');

-- ====================
-- IndexedDB Dexie.js スキーマ定義
-- ====================

/*
// Dexie.jsでのスキーマ定義例
const db = new Dexie('FishingRecordDB');

db.version(1).stores({
  // 釣果記録テーブル
  fishing_records: '&id, date, fish_species, location, created_at, [latitude+longitude]',

  // 写真データテーブル
  photos: '&id, uploaded_at, mime_type, file_size',

  // アプリケーション設定テーブル
  app_settings: '&setting_key, updated_at',

  // メタデータテーブル
  app_metadata: '&meta_key, updated_at',

  // 潮汐キャッシュテーブル（新規追加）
  tide_cache: '&cache_key, target_date, last_accessed_at, [latitude+longitude]',

  // 潮汐地域補正データテーブル（新規追加）
  tide_regional_data: '&station_id, [latitude+longitude], data_quality'
});

// 複合インデックスの定義
db.fishing_records.defineHook('ready', function() {
  // 日付範囲での検索を最適化
  this.addHook('creating', function(primKey, obj, trans) {
    obj.date_timestamp = new Date(obj.date).getTime();
  });
});
*/

-- ====================
-- データ制約とバリデーション
-- ====================

-- 釣果記録の制約
-- CHECK (size >= 0 AND size <= 999); -- サイズは0-999cmの範囲
-- CHECK (latitude >= -90 AND latitude <= 90); -- 緯度の有効範囲
-- CHECK (longitude >= -180 AND longitude <= 180); -- 経度の有効範囲
-- CHECK (gps_accuracy >= 0); -- GPS精度は正の値
-- CHECK (LENGTH(location) <= 255); -- 場所名の文字数制限
-- CHECK (LENGTH(fish_species) <= 100); -- 魚種名の文字数制限

-- 写真データの制約
-- CHECK (file_size > 0 AND file_size <= 5242880); -- ファイルサイズ5MB以下
-- CHECK (width > 0 AND height > 0); -- 画像サイズは正の値
-- CHECK (compression_quality >= 0 AND compression_quality <= 1); -- 圧縮品質0-1

-- ====================
-- ビュー定義
-- ====================

-- 釣果記録の概要ビュー（一覧表示用）
CREATE VIEW fishing_records_summary AS
SELECT
    fr.id,
    fr.date,
    fr.location,
    fr.fish_species,
    fr.size,
    CASE WHEN fr.photo_id IS NOT NULL THEN 1 ELSE 0 END as has_photo,
    fr.created_at
FROM fishing_records fr
ORDER BY fr.date DESC;

-- 写真付き釣果記録ビュー
CREATE VIEW fishing_records_with_photos AS
SELECT
    fr.*,
    p.filename as photo_filename,
    p.mime_type as photo_mime_type,
    p.file_size as photo_file_size
FROM fishing_records fr
LEFT JOIN photos p ON fr.photo_id = p.id;

-- 統計情報ビュー
CREATE VIEW fishing_statistics AS
SELECT
    COUNT(*) as total_records,
    COUNT(DISTINCT fish_species) as unique_species,
    COUNT(DISTINCT location) as unique_locations,
    AVG(size) as average_size,
    MAX(size) as max_size,
    COUNT(photo_id) as records_with_photos,
    MIN(date) as first_record_date,
    MAX(date) as last_record_date
FROM fishing_records;

-- ====================
-- データマイグレーション用
-- ====================

-- スキーマバージョン管理
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 初期バージョン
INSERT INTO schema_migrations (version, description) VALUES
(1, 'Initial schema creation');

-- ====================
-- パフォーマンス最適化
-- ====================

-- 大量データ対応のためのパーティション戦略（概念的）
-- IndexedDBでは年別でのデータベース分割を検討
-- 例: FishingRecordDB_2024, FishingRecordDB_2025

-- キャッシュ戦略
-- - 最新50件の記録をメモリキャッシュ
-- - 写真は遅延読み込み
-- - サムネイル用の小さい画像を別途保存

-- ====================
-- バックアップ・リストア用
-- ====================

-- エクスポート用クエリ（全データ）
/*
SELECT
    'fishing_records' as table_name,
    json_group_array(
        json_object(
            'id', id,
            'date', date,
            'location', location,
            'fish_species', fish_species,
            'size', size,
            'photo_id', photo_id,
            'latitude', latitude,
            'longitude', longitude,
            'gps_accuracy', gps_accuracy,
            'created_at', created_at,
            'updated_at', updated_at,
            'notes', notes
        )
    ) as data
FROM fishing_records

UNION ALL

SELECT
    'photos' as table_name,
    json_group_array(
        json_object(
            'id', id,
            'filename', filename,
            'mime_type', mime_type,
            'file_size', file_size,
            'uploaded_at', uploaded_at
            -- blob_dataは別途Base64エンコードして処理
        )
    ) as data
FROM photos;
*/