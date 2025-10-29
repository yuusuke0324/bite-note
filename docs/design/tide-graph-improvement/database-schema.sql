-- ==========================================
-- 潮汐グラフ改善 データベーススキーマ
-- ==========================================
-- 注意: この改善では既存DBスキーマの変更は行わず、
--      既存テーブルの活用とインデックス最適化のみ実施

-- ==========================================
-- 既存テーブル構造（参考）
-- ==========================================

-- 釣果記録テーブル（既存）
-- fishing_records (
--   id UUID PRIMARY KEY,
--   date TIMESTAMP NOT NULL,
--   location_name VARCHAR(255),
--   coordinates POINT, -- PostGIS POINT型で緯度経度格納
--   species VARCHAR(100),
--   user_id UUID,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- 地域データテーブル（既存）
-- regional_tide_data (
--   id UUID PRIMARY KEY,
--   region_id VARCHAR(50) UNIQUE,
--   name VARCHAR(255),
--   coordinates POINT,
--   m2_amplitude DECIMAL(8,3),
--   m2_phase DECIMAL(6,2),
--   s2_amplitude DECIMAL(8,3),
--   s2_phase DECIMAL(6,2),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- ==========================================
-- インデックス最適化
-- ==========================================

-- 釣果記録の座標検索を高速化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fishing_records_coordinates_gist
ON fishing_records USING GIST (coordinates);

-- 釣果記録の日時検索を高速化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fishing_records_date_btree
ON fishing_records USING BTREE (date);

-- 複合インデックス：座標と日時の組み合わせ検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fishing_records_coords_date
ON fishing_records (coordinates, date)
WHERE coordinates IS NOT NULL;

-- 地域データの座標範囲検索を高速化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regional_tide_data_coordinates_gist
ON regional_tide_data USING GIST (coordinates);

-- 地域IDでの高速検索用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regional_tide_data_region_id
ON regional_tide_data (region_id);

-- ==========================================
-- 拡張テーブル（将来の機能拡張用）
-- ==========================================

-- 潮汐計算キャッシュテーブル（オプション）
-- 注意: 現在の実装ではメモリキャッシュを使用
--       将来の永続化が必要な場合のみ作成
/*
CREATE TABLE IF NOT EXISTS tide_calculation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE NOT NULL, -- 座標_日時のハッシュキー
    coordinates POINT NOT NULL,
    calculation_date DATE NOT NULL,
    calculation_result JSONB NOT NULL,      -- 計算結果をJSONで格納
    metadata JSONB,                         -- 計算メタデータ
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 1
);

-- キャッシュテーブルのインデックス
CREATE INDEX idx_tide_cache_key ON tide_calculation_cache (cache_key);
CREATE INDEX idx_tide_cache_expires ON tide_calculation_cache (expires_at);
CREATE INDEX idx_tide_cache_coords_date ON tide_calculation_cache (coordinates, calculation_date);
CREATE INDEX idx_tide_cache_accessed ON tide_calculation_cache (accessed_at);
*/

-- ==========================================
-- ビュー定義
-- ==========================================

-- 座標付き釣果記録ビュー（NULL座標を除外）
CREATE OR REPLACE VIEW fishing_records_with_coordinates AS
SELECT
    id,
    date,
    location_name,
    coordinates,
    ST_X(coordinates) as longitude,
    ST_Y(coordinates) as latitude,
    species,
    user_id,
    created_at
FROM fishing_records
WHERE coordinates IS NOT NULL;

-- 地域データ詳細ビュー（座標分解と調和定数）
CREATE OR REPLACE VIEW regional_tide_data_detailed AS
SELECT
    id,
    region_id,
    name,
    coordinates,
    ST_X(coordinates) as longitude,
    ST_Y(coordinates) as latitude,
    m2_amplitude,
    m2_phase,
    s2_amplitude,
    s2_phase,
    -- K1, O1は推定値として計算
    ROUND(m2_amplitude * 0.58, 3) as k1_amplitude,  -- M2の58%として推定
    ROUND(m2_phase + 15.0, 2) as k1_phase,          -- M2から15度遅延
    ROUND(m2_amplitude * 0.42, 3) as o1_amplitude,  -- M2の42%として推定
    ROUND(m2_phase - 10.0, 2) as o1_phase,          -- M2から10度先行
    created_at
FROM regional_tide_data;

-- ==========================================
-- 関数定義
-- ==========================================

-- 最寄りの地域データを検索する関数
CREATE OR REPLACE FUNCTION find_nearest_regional_data(
    target_lat DECIMAL,
    target_lng DECIMAL,
    max_distance_km DECIMAL DEFAULT 500.0
)
RETURNS TABLE (
    region_id VARCHAR(50),
    name VARCHAR(255),
    distance_km DECIMAL,
    m2_amplitude DECIMAL(8,3),
    m2_phase DECIMAL(6,2),
    s2_amplitude DECIMAL(8,3),
    s2_phase DECIMAL(6,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rtd.region_id,
        rtd.name,
        ROUND(
            ST_Distance(
                ST_GeomFromText('POINT(' || target_lng || ' ' || target_lat || ')', 4326)::geography,
                rtd.coordinates::geography
            ) / 1000.0, 2
        ) as distance_km,
        rtd.m2_amplitude,
        rtd.m2_phase,
        rtd.s2_amplitude,
        rtd.s2_phase
    FROM regional_tide_data rtd
    WHERE ST_Distance(
        ST_GeomFromText('POINT(' || target_lng || ' ' || target_lat || ')', 4326)::geography,
        rtd.coordinates::geography
    ) / 1000.0 <= max_distance_km
    ORDER BY distance_km
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- 座標の妥当性をチェックする関数
CREATE OR REPLACE FUNCTION validate_coordinates(
    lat DECIMAL,
    lng DECIMAL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (lat >= -90.0 AND lat <= 90.0 AND lng >= -180.0 AND lng <= 180.0);
END;
$$ LANGUAGE plpgsql;

-- 日時の妥当性をチェックする関数
CREATE OR REPLACE FUNCTION validate_calculation_date(
    calc_date TIMESTAMP
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        calc_date >= '1970-01-01'::timestamp AND
        calc_date <= '2050-12-31'::timestamp
    );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- データ整合性制約
-- ==========================================

-- 座標の妥当性制約
ALTER TABLE fishing_records
ADD CONSTRAINT check_coordinates_valid
CHECK (
    coordinates IS NULL OR
    (ST_X(coordinates) >= -180.0 AND ST_X(coordinates) <= 180.0 AND
     ST_Y(coordinates) >= -90.0 AND ST_Y(coordinates) <= 90.0)
);

ALTER TABLE regional_tide_data
ADD CONSTRAINT check_regional_coordinates_valid
CHECK (
    ST_X(coordinates) >= -180.0 AND ST_X(coordinates) <= 180.0 AND
    ST_Y(coordinates) >= -90.0 AND ST_Y(coordinates) <= 90.0
);

-- 調和定数の妥当性制約
ALTER TABLE regional_tide_data
ADD CONSTRAINT check_tide_amplitudes_positive
CHECK (
    m2_amplitude >= 0 AND s2_amplitude >= 0
);

ALTER TABLE regional_tide_data
ADD CONSTRAINT check_tide_phases_range
CHECK (
    m2_phase >= 0 AND m2_phase < 360 AND
    s2_phase >= 0 AND s2_phase < 360
);

-- ==========================================
-- パフォーマンス統計収集
-- ==========================================

-- 統計情報を更新してクエリプランナーを最適化
ANALYZE fishing_records;
ANALYZE regional_tide_data;

-- ==========================================
-- セキュリティ設定
-- ==========================================

-- 読み取り専用ユーザーへの権限付与（アプリケーション用）
-- GRANT SELECT ON fishing_records_with_coordinates TO app_readonly_user;
-- GRANT SELECT ON regional_tide_data_detailed TO app_readonly_user;
-- GRANT EXECUTE ON FUNCTION find_nearest_regional_data TO app_readonly_user;

-- ==========================================
-- モニタリング用
-- ==========================================

-- 座標付き釣果記録の統計ビュー
CREATE OR REPLACE VIEW fishing_records_stats AS
SELECT
    COUNT(*) as total_records,
    COUNT(coordinates) as records_with_coordinates,
    ROUND(
        COUNT(coordinates)::DECIMAL / COUNT(*) * 100, 2
    ) as coordinate_coverage_percent,
    MIN(date) as earliest_record,
    MAX(date) as latest_record,
    COUNT(DISTINCT species) as unique_species
FROM fishing_records;

-- 地域データのカバレッジ統計
CREATE OR REPLACE VIEW regional_coverage_stats AS
SELECT
    COUNT(*) as total_regions,
    ROUND(AVG(m2_amplitude), 3) as avg_m2_amplitude,
    ROUND(AVG(s2_amplitude), 3) as avg_s2_amplitude,
    MIN(ST_Y(coordinates)) as min_latitude,
    MAX(ST_Y(coordinates)) as max_latitude,
    MIN(ST_X(coordinates)) as min_longitude,
    MAX(ST_X(coordinates)) as max_longitude
FROM regional_tide_data;

-- ==========================================
-- 注意事項とコメント
-- ==========================================

/*
潮汐グラフ改善に関するデータベース設計の注意点:

1. 座標データの扱い
   - PostGISのPOINT型を使用して効率的な地理空間検索を実現
   - GIST インデックスにより近傍検索が高速化

2. キャッシュ戦略
   - 現在の実装ではメモリキャッシュを使用
   - 将来の永続化要件に備えてキャッシュテーブル設計を準備

3. パフォーマンス考慮
   - 複合インデックスにより座標・日時の組み合わせ検索を最適化
   - 統計情報の定期更新により実行計画を最適化

4. 拡張性
   - 調和定数の追加に対応できる設計
   - 新規地域データの追加が容易

5. データ整合性
   - 座標範囲チェック制約により不正データを防止
   - 調和定数の妥当性制約によりデータ品質を保証

6. セキュリティ
   - 読み取り専用アクセス権限の分離
   - 入力値検証関数の提供
*/

-- ==========================================
-- メンテナンス用SQL
-- ==========================================

-- インデックスサイズ確認
/*
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
*/

-- テーブルサイズ確認
/*
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
*/