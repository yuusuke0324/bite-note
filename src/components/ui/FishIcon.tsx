/**
 * FishIcon - Fish Species Icon with Background
 *
 * @description
 * 写真なし記録用のプレースホルダーコンポーネント。
 * 魚種に応じた背景色とアイコンを表示し、ライト/ダークモード対応。
 *
 * @version 1.0.0
 * @since 2025-11-30 Issue #321
 */

import { forwardRef } from 'react';
import { Fish } from 'lucide-react';
import { getFishColor, getFishIconType } from '../../theme/fishColors';
import { useTheme } from '../../hooks/useTheme';
import { SquidIcon } from './icons/SquidIcon';

import './FishIcon.css';

export interface FishIconProps {
  /** 魚種名 */
  species: string;
  /** アイコンのサイズ（px） */
  size?: number;
  /** 追加のCSSクラス */
  className?: string;
  /** data-testid属性 */
  'data-testid'?: string;
  /** 装飾的要素として扱う場合はtrue（親要素にaria-labelがある場合） */
  'aria-hidden'?: boolean;
}

/**
 * 魚種別アイコン＋背景色コンポーネント
 *
 * @description
 * 写真がない記録のプレースホルダーとして使用。
 * 魚種に応じた背景色（ダークモード対応）と、
 * 魚類はFishアイコン、イカ・タコ類はSquidIconを表示。
 *
 * @example
 * ```tsx
 * // 魚類
 * <FishIcon species="シーバス" size={64} />
 *
 * // イカ類
 * <FishIcon species="アオリイカ" size={64} />
 *
 * // 写真なし記録カード内で使用
 * {!hasPhoto && (
 *   <FishIcon species={record.fishSpecies} size={80} />
 * )}
 * ```
 */
export const FishIcon = forwardRef<HTMLDivElement, FishIconProps>(
  ({ species, size = 64, className = '', 'data-testid': testId, 'aria-hidden': ariaHidden }, ref) => {
    const { isDark } = useTheme();
    const backgroundColor = getFishColor(species, isDark);
    const iconType = getFishIconType(species);

    return (
      <div
        ref={ref}
        className={`fish-icon-container ${className}`}
        style={{
          backgroundColor,
        }}
        role={ariaHidden ? undefined : 'img'}
        aria-label={ariaHidden ? undefined : `${species}のアイコン`}
        aria-hidden={ariaHidden}
        data-testid={testId}
      >
        {iconType === 'squid' ? (
          <SquidIcon size={size} color="white" strokeWidth={1.5} />
        ) : (
          <Fish size={size} color="white" strokeWidth={1.5} />
        )}
      </div>
    );
  }
);

FishIcon.displayName = 'FishIcon';
