/**
 * アイコン関連の型定義
 * @module types/icon
 */

/**
 * アイコンサイズプリセット
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * アイコンサイズのピクセル値マッピング
 */
export const ICON_SIZES: Record<IconSize, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/**
 * アイコンカラープリセット
 */
export type IconColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'inherit';

/**
 * アイコンカラーのTailwind CSSクラスマッピング
 */
export const ICON_COLORS: Record<IconColor, string> = {
  primary: 'text-blue-600 dark:text-blue-400',
  secondary: 'text-gray-600 dark:text-gray-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-500 dark:text-blue-300',
  inherit: '',
};

/**
 * アイコンカテゴリ
 */
export type IconCategory =
  | 'navigation'
  | 'data'
  | 'action'
  | 'weather'
  | 'status'
  | 'other';
