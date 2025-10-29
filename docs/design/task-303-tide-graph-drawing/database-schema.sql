-- ==========================================
-- TASK-303: 潮汐グラフ描画改善 データベーススキーマ
-- ==========================================
-- 注意: この改善はフロントエンド描画に特化しており、
--      データベーススキーマの変更は行わない。
--      必要に応じてキャッシュやログテーブルの追加を検討。

-- ==========================================
-- 既存テーブル（変更なし）
-- ==========================================

-- 釣果記録テーブル（既存のまま使用）
-- fishing_records (
--   id UUID PRIMARY KEY,
--   date TIMESTAMP NOT NULL,
--   location_name VARCHAR(255),
--   coordinates POINT, -- PostGIS POINT型
--   species VARCHAR(100),
--   user_id UUID,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- 地域データテーブル（既存のまま使用）
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
-- TASK-303専用テーブル（オプション）
-- ==========================================

-- グラフ描画エラーログテーブル（監視・改善用）
CREATE TABLE IF NOT EXISTS tide_chart_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- エラー情報
    error_code VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),

    -- コンテキスト情報
    component_name VARCHAR(100),
    user_agent TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,
    device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop')),

    -- データ情報
    data_point_count INTEGER,
    chart_width INTEGER,
    chart_height INTEGER,
    data_validation_errors JSONB,

    -- タイムスタンプ
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    fishing_record_id UUID REFERENCES fishing_records(id) ON DELETE SET NULL,

    -- セッション情報
    session_id VARCHAR(255),
    request_id VARCHAR(255)
);

-- エラーログのインデックス
CREATE INDEX idx_tide_chart_errors_code ON tide_chart_error_logs (error_code);
CREATE INDEX idx_tide_chart_errors_severity ON tide_chart_error_logs (severity);
CREATE INDEX idx_tide_chart_errors_occurred_at ON tide_chart_error_logs (occurred_at);
CREATE INDEX idx_tide_chart_errors_device_type ON tide_chart_error_logs (device_type);
CREATE INDEX idx_tide_chart_errors_component ON tide_chart_error_logs (component_name);

-- パフォーマンス監視テーブル（オプション）
CREATE TABLE IF NOT EXISTS tide_chart_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- パフォーマンス指標
    render_time_ms INTEGER NOT NULL,
    data_processing_time_ms INTEGER NOT NULL,
    validation_time_ms INTEGER NOT NULL,
    total_time_ms INTEGER NOT NULL,
    re_render_count INTEGER DEFAULT 1,

    -- チャート情報
    data_point_count INTEGER NOT NULL,
    chart_width INTEGER NOT NULL,
    chart_height INTEGER NOT NULL,
    responsive_mode BOOLEAN DEFAULT true,

    -- 環境情報
    device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    viewport_width INTEGER,
    viewport_height INTEGER,
    user_agent TEXT,

    -- 関連データ
    fishing_record_id UUID REFERENCES fishing_records(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- タイムスタンプ
    measured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255)
);

-- パフォーマンスログのインデックス
CREATE INDEX idx_tide_chart_perf_render_time ON tide_chart_performance_logs (render_time_ms);
CREATE INDEX idx_tide_chart_perf_device_type ON tide_chart_performance_logs (device_type);
CREATE INDEX idx_tide_chart_perf_measured_at ON tide_chart_performance_logs (measured_at);
CREATE INDEX idx_tide_chart_perf_data_points ON tide_chart_performance_logs (data_point_count);

-- ユーザー設定テーブル（グラフ表示設定用・オプション）
CREATE TABLE IF NOT EXISTS user_chart_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 表示設定
    show_grid BOOLEAN DEFAULT true,
    show_tooltip BOOLEAN DEFAULT true,
    show_event_markers BOOLEAN DEFAULT true,

    -- 色設定
    line_color VARCHAR(7) DEFAULT '#2563eb', -- HEX color
    grid_color VARCHAR(7) DEFAULT '#e5e7eb',
    event_color VARCHAR(7) DEFAULT '#dc2626',

    -- アクセシビリティ設定
    high_contrast BOOLEAN DEFAULT false,
    large_fonts BOOLEAN DEFAULT false,
    keyboard_navigation BOOLEAN DEFAULT false,

    -- レスポンシブ設定
    preferred_aspect_ratio DECIMAL(3,1) DEFAULT 2.0,
    min_chart_height INTEGER DEFAULT 300,

    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id)
);

-- ユーザー設定のインデックス
CREATE INDEX idx_user_chart_prefs_user_id ON user_chart_preferences (user_id);

-- ==========================================
-- ビュー定義
-- ==========================================

-- エラーログ統計ビュー
CREATE OR REPLACE VIEW tide_chart_error_stats AS
SELECT
    error_code,
    severity,
    COUNT(*) as occurrence_count,
    MIN(occurred_at) as first_occurrence,
    MAX(occurred_at) as latest_occurrence,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(DISTINCT device_type) as affected_device_types,
    ROUND(AVG(data_point_count), 0) as avg_data_points
FROM tide_chart_error_logs
WHERE occurred_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY error_code, severity
ORDER BY occurrence_count DESC;

-- パフォーマンス統計ビュー
CREATE OR REPLACE VIEW tide_chart_performance_stats AS
SELECT
    device_type,
    COUNT(*) as measurement_count,
    ROUND(AVG(render_time_ms), 2) as avg_render_time_ms,
    ROUND(AVG(data_processing_time_ms), 2) as avg_processing_time_ms,
    ROUND(AVG(total_time_ms), 2) as avg_total_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_time_ms) as p95_total_time_ms,
    ROUND(AVG(data_point_count), 0) as avg_data_points,
    COUNT(CASE WHEN total_time_ms > 1000 THEN 1 END) as slow_renders
FROM tide_chart_performance_logs
WHERE measured_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY device_type
ORDER BY device_type;

-- デイリーパフォーマンストレンドビュー
CREATE OR REPLACE VIEW tide_chart_daily_performance AS
SELECT
    DATE(measured_at) as measurement_date,
    device_type,
    COUNT(*) as render_count,
    ROUND(AVG(total_time_ms), 2) as avg_total_time_ms,
    ROUND(AVG(data_point_count), 0) as avg_data_points,
    COUNT(CASE WHEN total_time_ms > 1000 THEN 1 END) as slow_render_count
FROM tide_chart_performance_logs
WHERE measured_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(measured_at), device_type
ORDER BY measurement_date DESC, device_type;

-- ==========================================
-- 関数定義
-- ==========================================

-- エラーログ記録関数
CREATE OR REPLACE FUNCTION log_tide_chart_error(
    p_error_code VARCHAR(50),
    p_error_message TEXT,
    p_severity VARCHAR(20),
    p_component_name VARCHAR(100) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_viewport_width INTEGER DEFAULT NULL,
    p_viewport_height INTEGER DEFAULT NULL,
    p_device_type VARCHAR(20) DEFAULT NULL,
    p_data_point_count INTEGER DEFAULT NULL,
    p_chart_width INTEGER DEFAULT NULL,
    p_chart_height INTEGER DEFAULT NULL,
    p_data_validation_errors JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_fishing_record_id UUID DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL,
    p_request_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_log_id UUID;
BEGIN
    INSERT INTO tide_chart_error_logs (
        error_code, error_message, severity, component_name,
        user_agent, viewport_width, viewport_height, device_type,
        data_point_count, chart_width, chart_height, data_validation_errors,
        user_id, fishing_record_id, session_id, request_id
    ) VALUES (
        p_error_code, p_error_message, p_severity, p_component_name,
        p_user_agent, p_viewport_width, p_viewport_height, p_device_type,
        p_data_point_count, p_chart_width, p_chart_height, p_data_validation_errors,
        p_user_id, p_fishing_record_id, p_session_id, p_request_id
    ) RETURNING id INTO new_log_id;

    RETURN new_log_id;
END;
$$ LANGUAGE plpgsql;

-- パフォーマンスログ記録関数
CREATE OR REPLACE FUNCTION log_tide_chart_performance(
    p_render_time_ms INTEGER,
    p_data_processing_time_ms INTEGER,
    p_validation_time_ms INTEGER,
    p_total_time_ms INTEGER,
    p_re_render_count INTEGER DEFAULT 1,
    p_data_point_count INTEGER DEFAULT NULL,
    p_chart_width INTEGER DEFAULT NULL,
    p_chart_height INTEGER DEFAULT NULL,
    p_responsive_mode BOOLEAN DEFAULT true,
    p_device_type VARCHAR(20) DEFAULT NULL,
    p_viewport_width INTEGER DEFAULT NULL,
    p_viewport_height INTEGER DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_fishing_record_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_log_id UUID;
BEGIN
    INSERT INTO tide_chart_performance_logs (
        render_time_ms, data_processing_time_ms, validation_time_ms, total_time_ms,
        re_render_count, data_point_count, chart_width, chart_height, responsive_mode,
        device_type, viewport_width, viewport_height, user_agent,
        fishing_record_id, user_id, session_id
    ) VALUES (
        p_render_time_ms, p_data_processing_time_ms, p_validation_time_ms, p_total_time_ms,
        p_re_render_count, p_data_point_count, p_chart_width, p_chart_height, p_responsive_mode,
        p_device_type, p_viewport_width, p_viewport_height, p_user_agent,
        p_fishing_record_id, p_user_id, p_session_id
    ) RETURNING id INTO new_log_id;

    RETURN new_log_id;
END;
$$ LANGUAGE plpgsql;

-- ユーザー設定取得関数
CREATE OR REPLACE FUNCTION get_user_chart_preferences(p_user_id UUID)
RETURNS user_chart_preferences AS $$
DECLARE
    prefs user_chart_preferences;
BEGIN
    SELECT * INTO prefs
    FROM user_chart_preferences
    WHERE user_id = p_user_id;

    -- デフォルト設定を返す（ユーザー設定が存在しない場合）
    IF NOT FOUND THEN
        SELECT
            gen_random_uuid(),
            p_user_id,
            true, true, true,  -- show_grid, show_tooltip, show_event_markers
            '#2563eb', '#e5e7eb', '#dc2626',  -- line_color, grid_color, event_color
            false, false, false,  -- high_contrast, large_fonts, keyboard_navigation
            2.0, 300,  -- preferred_aspect_ratio, min_chart_height
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        INTO prefs;
    END IF;

    RETURN prefs;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- データ整合性制約
-- ==========================================

-- エラーログのデータ制約
ALTER TABLE tide_chart_error_logs
ADD CONSTRAINT check_error_code_not_empty
CHECK (LENGTH(TRIM(error_code)) > 0);

ALTER TABLE tide_chart_error_logs
ADD CONSTRAINT check_positive_dimensions
CHECK (
    (viewport_width IS NULL OR viewport_width > 0) AND
    (viewport_height IS NULL OR viewport_height > 0) AND
    (chart_width IS NULL OR chart_width > 0) AND
    (chart_height IS NULL OR chart_height > 0)
);

-- パフォーマンスログのデータ制約
ALTER TABLE tide_chart_performance_logs
ADD CONSTRAINT check_positive_times
CHECK (
    render_time_ms >= 0 AND
    data_processing_time_ms >= 0 AND
    validation_time_ms >= 0 AND
    total_time_ms >= 0 AND
    re_render_count >= 1
);

ALTER TABLE tide_chart_performance_logs
ADD CONSTRAINT check_positive_chart_dimensions
CHECK (
    chart_width > 0 AND
    chart_height > 0 AND
    (viewport_width IS NULL OR viewport_width > 0) AND
    (viewport_height IS NULL OR viewport_height > 0)
);

-- ユーザー設定のデータ制約
ALTER TABLE user_chart_preferences
ADD CONSTRAINT check_valid_colors
CHECK (
    line_color ~ '^#[0-9a-fA-F]{6}$' AND
    grid_color ~ '^#[0-9a-fA-F]{6}$' AND
    event_color ~ '^#[0-9a-fA-F]{6}$'
);

ALTER TABLE user_chart_preferences
ADD CONSTRAINT check_positive_dimensions_prefs
CHECK (
    preferred_aspect_ratio > 0 AND
    min_chart_height > 0
);

-- ==========================================
-- 自動更新トリガー
-- ==========================================

-- ユーザー設定の更新時刻自動更新
CREATE OR REPLACE FUNCTION update_chart_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chart_preferences_timestamp
    BEFORE UPDATE ON user_chart_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_chart_preferences_timestamp();

-- ==========================================
-- データ保持ポリシー
-- ==========================================

-- 古いエラーログの自動削除（90日後）
CREATE OR REPLACE FUNCTION cleanup_old_chart_error_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM tide_chart_error_logs
    WHERE occurred_at < CURRENT_DATE - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 古いパフォーマンスログの自動削除（30日後）
CREATE OR REPLACE FUNCTION cleanup_old_chart_performance_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM tide_chart_performance_logs
    WHERE measured_at < CURRENT_DATE - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- セキュリティ設定
-- ==========================================

-- アプリケーション用ユーザーへの権限付与
-- GRANT SELECT, INSERT ON tide_chart_error_logs TO app_user;
-- GRANT SELECT, INSERT ON tide_chart_performance_logs TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON user_chart_preferences TO app_user;
-- GRANT SELECT ON tide_chart_error_stats TO app_user;
-- GRANT SELECT ON tide_chart_performance_stats TO app_user;
-- GRANT EXECUTE ON FUNCTION log_tide_chart_error TO app_user;
-- GRANT EXECUTE ON FUNCTION log_tide_chart_performance TO app_user;
-- GRANT EXECUTE ON FUNCTION get_user_chart_preferences TO app_user;

-- 読み取り専用ユーザー（監視・分析用）
-- GRANT SELECT ON tide_chart_error_logs TO monitoring_user;
-- GRANT SELECT ON tide_chart_performance_logs TO monitoring_user;
-- GRANT SELECT ON tide_chart_error_stats TO monitoring_user;
-- GRANT SELECT ON tide_chart_performance_stats TO monitoring_user;
-- GRANT SELECT ON tide_chart_daily_performance TO monitoring_user;

-- ==========================================
-- 注意事項
-- ==========================================

/*
TASK-303: 潮汐グラフ描画改善におけるデータベース設計の考慮事項:

1. 主要な改善は フロントエンド描画に集中
   - 既存テーブルの構造変更は行わない
   - 新規テーブルは監視・ログ・設定用のみ

2. エラーログテーブル
   - グラフ描画エラーの追跡・分析用
   - ユーザー体験の改善に活用
   - 自動削除により容量管理

3. パフォーマンスログテーブル
   - 描画性能の監視・最適化用
   - デバイス別の性能分析
   - 1秒以内描画の要件達成確認

4. ユーザー設定テーブル
   - 個人のグラフ表示設定
   - アクセシビリティ対応
   - 色覚多様性への配慮

5. 統計ビュー
   - 運用監視とパフォーマンス分析
   - エラー傾向の把握
   - 改善効果の測定

6. セキュリティ
   - 個人情報の適切な管理
   - アクセス権限の分離
   - データ保持期間の制限

7. 保守性
   - 自動クリーンアップ機能
   - 統計情報の定期更新
   - インデックスによる高速検索
*/

-- 統計情報更新
ANALYZE tide_chart_error_logs;
ANALYZE tide_chart_performance_logs;
ANALYZE user_chart_preferences;