/**
 * TASK-202: 潮汐ヘルパー関数
 *
 * TideSummaryCardコンポーネントで使用するヘルパー関数群
 * - 潮汐タイプ別カラーマッピング
 * - 強度別カラー分け
 * - イベントフィルタリング
 * - 次イベント検索
 */

import type { TideEvent, TideType } from '../types/tide';

/**
 * 潮汐タイプ別のカラー情報
 */
export interface TideTypeColorInfo {
  bg: string;      // 背景色（Tailwind class）
  text: string;    // テキスト色（Tailwind class）
  icon: string;    // アイコン（絵文字）
  label: string;   // 日本語ラベル
}

/**
 * 潮汐タイプに応じたカラー情報を取得
 *
 * Designer仕様:
 * - 大潮（spring）: bg-blue-700（濃い青） + 白文字
 * - 中潮（medium）: bg-blue-500（通常の青） + 白文字
 * - 小潮（neap）: bg-blue-300（薄い青） + 灰色文字
 * - 長潮/若潮: bg-gray-400（グレー） + 灰色文字
 *
 * WCAG 2.1 AA準拠のコントラスト比を確保
 *
 * @param tideType - 潮汐タイプ
 * @returns カラー情報（背景色、テキスト色、アイコン、ラベル）
 */
export function getTideTypeColor(tideType: TideType): TideTypeColorInfo {
  const colorMap: Record<TideType, TideTypeColorInfo> = {
    spring: {
      bg: 'bg-blue-700',
      text: 'text-white',
      icon: '🌊',
      label: '大潮'
    },
    medium: {
      bg: 'bg-blue-500',
      text: 'text-white',
      icon: '🌊',
      label: '中潮'
    },
    neap: {
      bg: 'bg-blue-300',
      text: 'text-gray-800',
      icon: '🌊',
      label: '小潮'
    },
    long: {
      bg: 'bg-gray-400',
      text: 'text-gray-800',
      icon: '🌊',
      label: '長潮'
    },
    young: {
      bg: 'bg-gray-400',
      text: 'text-gray-800',
      icon: '🌊',
      label: '若潮'
    }
  };

  return colorMap[tideType];
}

/**
 * 潮汐強度に応じたプログレスバーの色を取得
 *
 * Designer仕様:
 * - 80-100%: 赤（bg-red-500） - 強い
 * - 50-79%: 黄（bg-yellow-500） - 中程度
 * - 0-49%: 青（bg-blue-400） - 弱い
 *
 * @param strength - 潮汐強度（0-100%）
 * @returns プログレスバーの色（Tailwind class）
 */
export function getTideStrengthColor(strength: number): string {
  if (strength >= 80) {
    return 'bg-red-500';
  }
  if (strength >= 50) {
    return 'bg-yellow-500';
  }
  return 'bg-blue-400';
}

/**
 * 今日のイベントのみをフィルタリング
 *
 * 指定された日付と同じ日のイベントのみを抽出し、時刻順にソートして返す
 *
 * @param events - 潮汐イベント配列
 * @param targetDate - 対象日付
 * @returns 今日のイベント配列（時刻順）
 */
export function filterTodayEvents(
  events: TideEvent[],
  targetDate: Date
): TideEvent[] {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();

  return events
    .filter(event => {
      const eventDate = event.time;
      return (
        eventDate.getFullYear() === targetYear &&
        eventDate.getMonth() === targetMonth &&
        eventDate.getDate() === targetDay
      );
    })
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * 現在時刻より後の最初のイベントを検索
 *
 * @param events - 潮汐イベント配列
 * @param currentTime - 現在時刻
 * @returns 次のイベント、または null（次イベントがない場合）
 */
export function findNextEvent(
  events: TideEvent[],
  currentTime: Date
): TideEvent | null {
  const futureEvents = events.filter(
    event => event.time.getTime() >= currentTime.getTime()
  );

  if (futureEvents.length === 0) {
    return null;
  }

  // 時刻順にソートして最初のイベントを返す
  futureEvents.sort((a, b) => a.time.getTime() - b.time.getTime());
  return futureEvents[0];
}
