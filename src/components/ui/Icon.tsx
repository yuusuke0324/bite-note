import type { LucideIcon, LucideProps } from 'lucide-react';
import { ICON_SIZES, ICON_COLORS, type IconSize, type IconColor } from '../../types/icon';

export interface IconProps extends Omit<LucideProps, 'ref' | 'size'> {
  /** Lucideアイコンコンポーネント */
  icon: LucideIcon;
  /** アイコンサイズ（プリセットまたはpx値） */
  size?: IconSize | number;
  /** ストローク幅 */
  strokeWidth?: number;
  /** カラープリセット */
  color?: IconColor;
  /** カスタムクラス名 */
  className?: string;
  /** アクセシビリティラベル */
  'aria-label'?: string;
  /** 装飾的アイコンかどうか（aria-hidden=true） */
  decorative?: boolean;
}

/**
 * 統一されたアイコンコンポーネント
 *
 * @example
 * ```tsx
 * import { Search } from 'lucide-react';
 * <Icon icon={Search} size="md" aria-label="検索" />
 * <Icon icon={Search} size={20} decorative />
 * ```
 */
export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 'md',
  strokeWidth = 2,
  color = 'inherit',
  className = '',
  'aria-label': ariaLabel,
  decorative = false,
  ...props
}) => {
  // サイズの解決：プリセット名またはピクセル値
  const resolvedSize = typeof size === 'string' ? ICON_SIZES[size] : size;

  // カラークラスの取得
  const colorClass = ICON_COLORS[color];

  // クラス名の結合
  const combinedClassName = [
    'flex-shrink-0',
    colorClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <IconComponent
      size={resolvedSize}
      strokeWidth={strokeWidth}
      className={combinedClassName}
      aria-label={ariaLabel}
      aria-hidden={decorative || !ariaLabel}
      role={ariaLabel && !decorative ? 'img' : undefined}
      {...props}
    />
  );
};

Icon.displayName = 'Icon';

export default Icon;
