/**
 * 魚種別背景色定義
 *
 * @description
 * 写真なし記録用のFishIconコンポーネントで使用する、
 * 魚種ごとの背景色を定義。ライト/ダークモード両対応。
 *
 * @version 1.0.0
 * @since 2025-11-30 Issue #321
 */

/**
 * 魚種別カラー設定
 */
export interface FishColorConfig {
  /** ライトモード時の背景色 */
  light: string;
  /** ダークモード時の背景色 */
  dark: string;
}

/**
 * 魚種別カラーマップ
 *
 * @description
 * 魚種名をキーとして、ライト/ダークモード両方の背景色を定義。
 * ダークモードでは視認性を向上させるため、1段階明るい色を使用。
 */
export const FISH_COLORS: Record<string, FishColorConfig> = {
  // 青物系（青緑系）
  シーバス: { light: '#0d9488', dark: '#14b8a6' },
  スズキ: { light: '#0d9488', dark: '#14b8a6' },
  セイゴ: { light: '#0d9488', dark: '#14b8a6' },
  フッコ: { light: '#0d9488', dark: '#14b8a6' },

  // 赤系
  マダイ: { light: '#dc2626', dark: '#ef4444' },
  チヌ: { light: '#dc2626', dark: '#ef4444' },
  クロダイ: { light: '#dc2626', dark: '#ef4444' },
  キダイ: { light: '#dc2626', dark: '#ef4444' },
  ヘダイ: { light: '#dc2626', dark: '#ef4444' },
  キチヌ: { light: '#dc2626', dark: '#ef4444' },

  // 青系
  アジ: { light: '#2563eb', dark: '#3b82f6' },
  サバ: { light: '#2563eb', dark: '#3b82f6' },
  イワシ: { light: '#2563eb', dark: '#3b82f6' },
  カツオ: { light: '#2563eb', dark: '#3b82f6' },
  サワラ: { light: '#2563eb', dark: '#3b82f6' },

  // 紫系（根魚）
  メバル: { light: '#7c3aed', dark: '#8b5cf6' },
  カサゴ: { light: '#7c3aed', dark: '#8b5cf6' },
  アイナメ: { light: '#7c3aed', dark: '#8b5cf6' },
  ソイ: { light: '#7c3aed', dark: '#8b5cf6' },
  ハタ: { light: '#7c3aed', dark: '#8b5cf6' },
  キジハタ: { light: '#7c3aed', dark: '#8b5cf6' },
  アコウ: { light: '#7c3aed', dark: '#8b5cf6' },

  // イカ・タコ系（紫ピンク）
  アオリイカ: { light: '#9333ea', dark: '#a855f7' },
  ヤリイカ: { light: '#9333ea', dark: '#a855f7' },
  コウイカ: { light: '#9333ea', dark: '#a855f7' },
  ケンサキイカ: { light: '#9333ea', dark: '#a855f7' },
  スルメイカ: { light: '#9333ea', dark: '#a855f7' },
  マダコ: { light: '#9333ea', dark: '#a855f7' },
  イイダコ: { light: '#9333ea', dark: '#a855f7' },

  // 黄系（フラット系）
  ヒラメ: { light: '#ca8a04', dark: '#eab308' },
  カレイ: { light: '#ca8a04', dark: '#eab308' },
  マゴチ: { light: '#ca8a04', dark: '#eab308' },

  // シアン系（回遊魚）
  ブリ: { light: '#0891b2', dark: '#06b6d4' },
  カンパチ: { light: '#0891b2', dark: '#06b6d4' },
  ヒラマサ: { light: '#0891b2', dark: '#06b6d4' },
  ワラサ: { light: '#0891b2', dark: '#06b6d4' },
  イナダ: { light: '#0891b2', dark: '#06b6d4' },
  ハマチ: { light: '#0891b2', dark: '#06b6d4' },
  メジロ: { light: '#0891b2', dark: '#06b6d4' },

  // 緑系（淡水魚）
  バス: { light: '#16a34a', dark: '#22c55e' },
  ブラックバス: { light: '#16a34a', dark: '#22c55e' },
  ラージマウスバス: { light: '#16a34a', dark: '#22c55e' },
  スモールマウスバス: { light: '#16a34a', dark: '#22c55e' },
  ナマズ: { light: '#16a34a', dark: '#22c55e' },
  ライギョ: { light: '#16a34a', dark: '#22c55e' },
  コイ: { light: '#16a34a', dark: '#22c55e' },

  // オレンジ系（トラウト系）
  ニジマス: { light: '#ea580c', dark: '#f97316' },
  ヤマメ: { light: '#ea580c', dark: '#f97316' },
  イワナ: { light: '#ea580c', dark: '#f97316' },
  アマゴ: { light: '#ea580c', dark: '#f97316' },
  サクラマス: { light: '#ea580c', dark: '#f97316' },
  サケ: { light: '#ea580c', dark: '#f97316' },
};

/**
 * デフォルトカラー（未定義の魚種用）
 */
export const DEFAULT_FISH_COLOR: FishColorConfig = {
  light: '#1A73E8', // var(--color-primary-500) と同値
  dark: '#669DF6', // var(--color-primary-400) と同値
};

/**
 * 魚種に応じた背景色を取得
 *
 * @description
 * 部分一致で検索し、マッチした魚種の色を返す。
 * 例: 「シーバス（セイゴ）」→「シーバス」または「セイゴ」にマッチ
 *
 * @param species 魚種名
 * @param isDark ダークモードかどうか
 * @returns 背景色（HEX値）
 *
 * @example
 * ```tsx
 * const bgColor = getFishColor('シーバス', false); // '#0d9488'
 * const bgColorDark = getFishColor('シーバス', true); // '#14b8a6'
 * ```
 */
export function getFishColor(species: string, isDark: boolean): string {
  // 完全一致を優先
  if (FISH_COLORS[species]) {
    return isDark ? FISH_COLORS[species].dark : FISH_COLORS[species].light;
  }

  // 部分一致で検索
  const matchedKey = Object.keys(FISH_COLORS).find(
    (key) => species.includes(key) || key.includes(species)
  );

  const config = matchedKey ? FISH_COLORS[matchedKey] : DEFAULT_FISH_COLOR;
  return isDark ? config.dark : config.light;
}

/**
 * 魚種に応じたアイコン種別を取得
 *
 * @description
 * イカ・タコ類は専用のSquidIconを使用し、
 * その他の魚類はFish（Lucide）アイコンを使用する。
 *
 * @param species 魚種名
 * @returns 'fish' | 'squid'
 *
 * @example
 * ```tsx
 * const iconType = getFishIconType('アオリイカ'); // 'squid'
 * const iconType2 = getFishIconType('シーバス'); // 'fish'
 * ```
 */
export function getFishIconType(species: string): 'fish' | 'squid' {
  // 「マダコ」「イイダコ」などは「タコ」を直接含まないため「ダコ」も追加
  const squidKeywords = ['イカ', 'タコ', 'ダコ'];
  if (squidKeywords.some((keyword) => species.includes(keyword))) {
    return 'squid';
  }
  return 'fish';
}

/**
 * 全ての定義済み魚種名を取得
 *
 * @returns 定義済み魚種名の配列
 */
export function getAllFishSpecies(): string[] {
  return Object.keys(FISH_COLORS);
}
