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
 * 潮汐タイプ別のアイコン名（Lucideアイコン名）
 * - spring: Waves（大潮 - 活発な波）
 * - medium: Activity（中潮 - 中程度の活動）
 * - neap: Droplet（小潮 - 穏やかな水滴）
 * - long: Minus（長潮 - 平坦）
 * - young: Circle（若潮 - 円形）
 */
export type TideIconName = 'Waves' | 'Activity' | 'Droplet' | 'Minus' | 'Circle';

/**
 * 潮汐タイプ別のカラー情報
 */
export interface TideTypeColorInfo {
  bg: string;         // 背景色（Tailwind class）
  text: string;       // テキスト色（Tailwind class）
  icon: TideIconName; // アイコン名（Lucide）
  label: string;      // 日本語ラベル
}

/**
 * 潮汐タイプに応じたカラー情報を取得
 *
 * Designer仕様（Issue #119 - WCAG 2.1 AA準拠）:
 * - 大潮（spring）: emerald-700（緑 - 活発・好機） + bg-emerald-50
 * - 中潮（medium）: sky-700（空色 - 中間） + bg-sky-50
 * - 小潮（neap）: slate-600（グレー - 穏やか） + bg-slate-50
 * - 長潮/若潮: gray-600（グレー） + bg-gray-50
 *
 * アクセシビリティ対応:
 * - カラーコントラスト比: WCAG 2.1 AA基準（4.5:1以上）を満たす
 * - 色のみに依存しない: アイコン + ラベル + 背景色の組み合わせ
 * - 色覚多様性対応: 各タイプで異なるアイコンを使用
 *
 * @param tideType - 潮汐タイプ
 * @returns カラー情報（背景色、テキスト色、アイコン、ラベル）
 */
export function getTideTypeColor(tideType: TideType): TideTypeColorInfo {
  const colorMap: Record<TideType, TideTypeColorInfo> = {
    spring: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: 'Waves',
      label: '大潮'
    },
    medium: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      icon: 'Activity',
      label: '中潮'
    },
    neap: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      icon: 'Droplet',
      label: '小潮'
    },
    long: {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      icon: 'Minus',
      label: '長潮'
    },
    young: {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      icon: 'Circle',
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
