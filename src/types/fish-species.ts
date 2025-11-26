/**
 * 魚種オートコンプリートシステム 型定義
 *
 * @description
 * 魚種マスターデータと検索エンジン用の型定義
 * 表記揺れ対応・高速検索を実現するためのデータ構造
 *
 * @version 2.7.0
 * @since 2025-10-25
 */

/**
 * 魚のカテゴリ分類
 */
export type FishCategory =
  | "青魚"      // サバ、アジ、イワシなど
  | "白身魚"    // タイ、ヒラメ、カレイなど
  | "根魚"      // カサゴ、メバル、ソイなど
  | "回遊魚"    // カツオ、マグロ、ブリなど
  | "エギング"  // イカ、タコ
  | "その他";   // 上記以外

/**
 * 季節（釣れやすい時期）
 */
export type Season = "春" | "夏" | "秋" | "冬";

/**
 * 生息域・釣り場タイプ
 */
export type Habitat =
  | "沿岸"      // 海岸線近く
  | "堤防"      // 防波堤
  | "磯"        // 岩場
  | "船"        // 船釣り
  | "河川"      // 川
  | "湖沼";     // 湖・沼

/**
 * データソース種別
 */
export type FishDataSource =
  | "official"  // 公式マスターデータ（WEB魚図鑑など）
  | "user";     // ユーザー追加データ

/**
 * JSONファイルから読み込む魚種データの型定義
 *
 * @description
 * fish-species.jsonのスキーマ定義
 * createdAtとupdatedAtはISO 8601文字列として保存されている
 */
export interface FishSpeciesJson {
  id: string;
  standardName: string;
  scientificName: string;
  aliases: string[];
  regionalNames: string[];
  category: string; // FishCategoryにキャスト必要
  season: string[]; // Season[]にキャスト必要
  habitat: string[]; // Habitat[]にキャスト必要
  popularity: number;
  image?: string;
  source: 'official' | 'user';
  createdAt?: string; // ISO 8601文字列
  updatedAt?: string; // ISO 8601文字列
}

/**
 * 魚種マスターデータ
 *
 * @description
 * 魚種の標準情報を格納する基本データ構造
 * 表記揺れ対応のため、複数の名称パターンを保持
 *
 * @example
 * {
 *   id: "ma-aji",
 *   standardName: "マアジ",
 *   scientificName: "Trachurus japonicus",
 *   aliases: ["アジ", "あじ", "鯵", "真鯵"],
 *   regionalNames: ["アオアジ", "キアジ"],
 *   category: "青魚",
 *   season: ["春", "夏", "秋"],
 *   habitat: ["沿岸", "堤防", "磯"],
 *   popularity: 95,
 *   image: "https://example.com/images/ma-aji.jpg",
 *   source: "official"
 * }
 */
export interface FishSpecies {
  /**
   * 一意識別子（kebab-case、例: "ma-aji", "kuro-dai"）
   */
  id: string;

  /**
   * 標準和名（カタカナ表記、例: "マアジ", "クロダイ"）
   */
  standardName: string;

  /**
   * 学名（ラテン語、例: "Trachurus japonicus"）
   */
  scientificName: string;

  /**
   * 別名・表記揺れ（ひらがな・カタカナ・漢字混在可）
   * 例: ["アジ", "あじ", "鯵", "真鯵", "マアジ"]
   */
  aliases: string[];

  /**
   * 地方名（地域による呼び名）
   * 例: ["アオアジ", "キアジ", "ヒラアジ"]
   */
  regionalNames: string[];

  /**
   * 魚のカテゴリ分類
   */
  category: FishCategory;

  /**
   * 釣れやすい季節（複数可）
   */
  season: Season[];

  /**
   * 生息域・釣り場タイプ（複数可）
   */
  habitat: Habitat[];

  /**
   * 人気度スコア（0-100、検索結果の並び順に使用）
   * 100: 最も人気、0: 最も人気がない
   */
  popularity: number;

  /**
   * 魚の画像URL（オプション）
   */
  image?: string;

  /**
   * データソース種別
   */
  source: FishDataSource;

  /**
   * データ作成日時（オプション）
   * データ更新履歴の追跡、古いデータの識別に使用
   */
  createdAt?: Date;

  /**
   * 最終更新日時（オプション）
   * データ鮮度の判定、更新判断に使用
   */
  updatedAt?: Date;
}

/**
 * 検索結果アイテム
 *
 * @description
 * 検索エンジンが返す結果の構造
 * マッチ度とマッチしたフィールドの情報を含む
 */
export interface FishSearchResult {
  /**
   * マッチした魚種データ
   */
  species: FishSpecies;

  /**
   * マッチスコア（0-100、高いほど関連性が高い）
   */
  score: number;

  /**
   * どのフィールドでマッチしたか
   */
  matchedField: 'standardName' | 'aliases' | 'regionalNames' | 'scientificName';

  /**
   * マッチした実際のテキスト
   */
  matchedText: string;
}

/**
 * 検索オプション
 */
export interface FishSearchOptions {
  /**
   * 最大結果件数（デフォルト: 10）
   */
  limit?: number;

  /**
   * カテゴリフィルタ
   */
  category?: FishCategory;

  /**
   * 季節フィルタ
   */
  season?: Season;

  /**
   * 生息域フィルタ
   */
  habitat?: Habitat;

  /**
   * 人気度でソート（デフォルト: true）
   */
  sortByPopularity?: boolean;
}

/**
 * 前方一致インデックスのエントリ
 *
 * @description
 * 高速検索のための内部データ構造
 * Map<prefix, FishSpecies[]> 形式で使用
 */
export interface PrefixIndexEntry {
  /**
   * 前方一致キー（正規化済み、1-3文字）
   */
  prefix: string;

  /**
   * マッチする魚種IDのリスト
   */
  speciesIds: string[];
}

/**
 * 魚種データベース統計情報
 */
export interface FishDatabaseStats {
  /**
   * 総魚種数
   */
  totalSpecies: number;

  /**
   * カテゴリ別件数
   */
  byCategory: Record<FishCategory, number>;

  /**
   * データソース別件数
   */
  bySource: Record<FishDataSource, number>;

  /**
   * 最終更新日時
   */
  lastUpdated: Date;

  /**
   * インデックスサイズ（バイト）
   */
  indexSize: number;
}

/**
 * 検索エンジンの初期化オプション
 */
export interface SearchEngineInitOptions {
  /**
   * インデックス構築時の最大プレフィックス長（デフォルト: 3）
   */
  maxPrefixLength?: number;

  /**
   * 大文字小文字を区別しない（デフォルト: true）
   */
  caseInsensitive?: boolean;

  /**
   * カタカナ→ひらがな正規化（デフォルト: true）
   */
  normalizeKana?: boolean;

  /**
   * デバッグログ出力（デフォルト: false）
   */
  debug?: boolean;
}

/**
 * ユーザー登録魚種のバリデーションルール
 *
 * @description
 * ユーザーが新しい魚種を登録する際の入力検証ルール
 * データ品質の維持と不適切なコンテンツの防止
 *
 * @version 2.7.1
 * @since 2025-10-25
 */
export interface UserSpeciesValidationRules {
  /**
   * 標準和名のバリデーション
   */
  standardName: {
    /**
     * 最小文字数（デフォルト: 2）
     */
    minLength: number;

    /**
     * 最大文字数（デフォルト: 20）
     */
    maxLength: number;

    /**
     * 許可する文字パターン（日本語のみ）
     * @example /^[ぁ-んァ-ヶー一-龠々]+$/
     */
    pattern: RegExp;

    /**
     * 禁止語リスト（不適切な単語）
     */
    forbiddenWords: string[];
  };

  /**
   * ユーザーあたりの登録可能魚種数上限（デフォルト: 100）
   */
  maxUserSpecies: number;

  /**
   * 入力サニタイゼーション
   */
  sanitization: {
    /**
     * 前後の空白を削除（デフォルト: true）
     */
    trim: boolean;

    /**
     * 特殊文字を削除（デフォルト: false）
     */
    removeSpecialChars: boolean;
  };
}

/**
 * ユーザー入力バリデーションエラー
 */
export interface UserSpeciesValidationError {
  /**
   * エラーコード
   */
  code:
    | 'TOO_SHORT'           // 文字数が少なすぎる
    | 'TOO_LONG'            // 文字数が多すぎる
    | 'INVALID_PATTERN'     // 不正な文字が含まれる
    | 'FORBIDDEN_WORD'      // 禁止語が含まれる
    | 'MAX_SPECIES_REACHED' // 登録上限に達している
    | 'DUPLICATE_NAME';     // 既存の魚種名と重複

  /**
   * エラーメッセージ（ユーザー表示用）
   */
  message: string;

  /**
   * エラー詳細（デバッグ用）
   */
  details?: string;
}

/**
 * ユーザー入力バリデーション結果
 */
export interface UserSpeciesValidationResult {
  /**
   * バリデーション成功フラグ
   */
  valid: boolean;

  /**
   * エラー情報（バリデーション失敗時）
   */
  error?: UserSpeciesValidationError;

  /**
   * サニタイズ後の値（成功時）
   */
  sanitizedValue?: string;
}

/**
 * データソース取得時のコンプライアンス設定
 *
 * @description
 * 外部サイトからデータを取得する際の法的・倫理的遵守事項
 * スクレイピング時のベストプラクティス
 *
 * @version 2.7.1
 * @since 2025-10-25
 */
export interface DataAcquisitionCompliance {
  /**
   * データソース情報
   */
  source: {
    /**
     * ソース名
     */
    name: string;

    /**
     * ソースURL
     */
    url: string;

    /**
     * robots.txt URL
     */
    robotsTxtUrl: string;

    /**
     * 利用規約URL
     */
    termsOfServiceUrl?: string;
  };

  /**
   * コンプライアンスチェック項目
   */
  compliance: {
    /**
     * robots.txtの確認済みフラグ
     */
    robotsTxtChecked: boolean;

    /**
     * 利用規約の確認済みフラグ
     */
    termsOfServiceChecked: boolean;

    /**
     * データ取得許可の有無
     */
    permissionGranted: boolean;

    /**
     * 許可取得方法（メール、フォーム等）
     */
    permissionMethod?: string;
  };

  /**
   * レート制限設定
   */
  rateLimit: {
    /**
     * リクエスト間隔（ミリ秒）
     */
    intervalMs: number;

    /**
     * 最大同時リクエスト数
     */
    maxConcurrent: number;

    /**
     * User-Agent文字列
     */
    userAgent: string;
  };

  /**
   * データ取得日時
   */
  acquiredAt?: Date;

  /**
   * データライセンス情報
   */
  license?: {
    /**
     * ライセンス種別
     */
    type: string;

    /**
     * 著作権表示
     */
    attribution?: string;
  };
}

/**
 * 低スペック端末向けパフォーマンス設定
 *
 * @description
 * 古いデバイスや低スペック端末での動作を保証するための設定
 *
 * @version 2.7.1
 * @since 2025-10-25
 */
export interface LowSpecDeviceConfig {
  /**
   * 低スペック端末と判定する基準
   */
  detection: {
    /**
     * メモリ容量閾値（GB）
     */
    maxMemoryGB?: number;

    /**
     * CPU コア数閾値
     */
    maxCpuCores?: number;

    /**
     * ユーザーエージェントパターン
     */
    userAgentPatterns?: RegExp[];
  };

  /**
   * 低スペック端末向けパフォーマンス目標
   */
  performanceTargets: {
    /**
     * インデックス構築時間（ミリ秒）
     */
    indexBuildMs: number;

    /**
     * 検索実行時間（ミリ秒）
     */
    searchMs: number;

    /**
     * UI描画時間（ミリ秒）
     */
    uiRenderMs: number;
  };

  /**
   * 機能制限オプション
   */
  limitations: {
    /**
     * 検索結果の最大件数
     */
    maxSearchResults: number;

    /**
     * 仮想スクロールの有効化
     */
    enableVirtualScroll: boolean;

    /**
     * 画像の読み込み無効化
     */
    disableImages: boolean;
  };
}
