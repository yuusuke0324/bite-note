/**
 * スワイプナビゲーション用ユーティリティ関数
 * @module swipe-utils
 */

/**
 * 座標インターフェース
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * 2点間の距離をメートル単位で計算（Haversine公式）
 *
 * @param coords1 - 地点1の座標
 * @param coords2 - 地点2の座標
 * @returns 距離（メートル）
 *
 * @example
 * ```ts
 * const distance = haversineDistance(
 *   { latitude: 35.6812, longitude: 139.7671 }, // 東京駅
 *   { latitude: 35.6586, longitude: 139.7454 }  // 渋谷駅
 * );
 * console.log(distance); // 約3300メートル
 * ```
 */
export function haversineDistance(
  coords1: Coordinates,
  coords2: Coordinates
): number {
  const R = 6371000; // 地球の半径（メートル）
  const φ1 = (coords1.latitude * Math.PI) / 180;
  const φ2 = (coords2.latitude * Math.PI) / 180;
  const Δφ = ((coords2.latitude - coords1.latitude) * Math.PI) / 180;
  const Δλ = ((coords2.longitude - coords1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // メートル単位
}

/**
 * スワイプ方向
 */
export type SwipeDirection = 'left' | 'right' | 'none';

/**
 * スワイプ方向を判定する
 *
 * @param deltaX - X方向の移動量（正=右、負=左）
 * @param threshold - 判定閾値（px）
 * @returns スワイプ方向
 */
export function getSwipeDirection(
  deltaX: number,
  threshold: number
): SwipeDirection {
  if (Math.abs(deltaX) < threshold) {
    return 'none';
  }
  return deltaX > 0 ? 'right' : 'left';
}

/**
 * スワイプ速度を計算する（px/ms）
 *
 * @param deltaX - X方向の移動量
 * @param duration - 経過時間（ms）
 * @returns 速度（px/ms）
 */
export function calculateSwipeVelocity(
  deltaX: number,
  duration: number
): number {
  if (duration === 0) return 0;
  return Math.abs(deltaX) / duration;
}

/**
 * エッジゾーン（iOS Safari戻るジェスチャー回避）のチェック
 *
 * @param clientX - タッチ開始X座標
 * @param edgeZone - エッジゾーン幅（px）
 * @returns エッジゾーン内かどうか
 */
export function isInEdgeZone(clientX: number, edgeZone: number): boolean {
  return clientX <= edgeZone;
}

/**
 * 垂直方向のずれが許容範囲内かチェック
 *
 * @param deltaY - Y方向の移動量
 * @param maxDeviation - 最大許容ずれ（px）
 * @returns 許容範囲内かどうか
 */
export function isVerticalDeviationAllowed(
  deltaY: number,
  maxDeviation: number
): boolean {
  return Math.abs(deltaY) <= maxDeviation;
}

/**
 * スワイプ進捗を計算（0〜1の範囲にクランプ）
 *
 * @param deltaX - X方向の移動量
 * @param threshold - スワイプ閾値
 * @returns 進捗（0〜1）
 */
export function calculateSwipeProgress(
  deltaX: number,
  threshold: number
): number {
  return Math.min(1, Math.abs(deltaX) / threshold);
}

/**
 * ハプティックフィードバックを実行
 * iOS/Android 8+でのみ動作
 *
 * @param type - フィードバックタイプ
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light'): void {
  // Vibration API（Android）
  if ('vibrate' in navigator) {
    const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
    navigator.vibrate(duration);
  }
}

/**
 * prefers-reduced-motionをチェック
 *
 * @returns ユーザーがアニメーション軽減を希望しているか
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * スプリングアニメーションのイージング関数
 * バウンス効果用
 */
export const SPRING_EASING = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';

/**
 * Material Designスタンダードイージング
 * スムーズな遷移用
 */
export const MATERIAL_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/**
 * デフォルトのスワイプ設定
 */
export const DEFAULT_SWIPE_CONFIG = {
  /** FishingRecordDetail用スワイプ閾値 */
  DETAIL_THRESHOLD: 80,
  /** MapPopup用スワイプ閾値 */
  POPUP_THRESHOLD: 60,
  /** FishingRecordDetail用速度閾値 */
  DETAIL_VELOCITY_THRESHOLD: 0.3,
  /** MapPopup用速度閾値 */
  POPUP_VELOCITY_THRESHOLD: 0.25,
  /** FishingRecordDetail用垂直ずれ許容 */
  DETAIL_MAX_VERTICAL_DEVIATION: 50,
  /** MapPopup用垂直ずれ許容 */
  POPUP_MAX_VERTICAL_DEVIATION: 40,
  /** エッジゾーン（iOS Safari対策） */
  EDGE_ZONE: 16,
  /** FishingRecordDetail用アニメーション時間 */
  DETAIL_ANIMATION_DURATION: 300,
  /** MapPopup用アニメーション時間 */
  POPUP_ANIMATION_DURATION: 250,
  /** FishingRecordDetail用減衰係数 */
  DETAIL_DAMPING_FACTOR: 0.3,
  /** MapPopup用減衰係数 */
  POPUP_DAMPING_FACTOR: 0.4,
  /** 近隣釣り場の判定距離（メートル） */
  NEARBY_DISTANCE_THRESHOLD: 5000,
} as const;
