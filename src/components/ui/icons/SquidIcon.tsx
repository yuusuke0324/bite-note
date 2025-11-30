/**
 * SquidIcon - Custom SVG Icon for Squid/Octopus
 *
 * @description
 * イカ・タコ用のカスタムSVGアイコン。
 * Lucide Icons形式に準拠し、size/color/strokeWidthをサポート。
 *
 * @version 1.0.0
 * @since 2025-11-30 Issue #321
 */

import { forwardRef } from 'react';

export interface SquidIconProps {
  /** アイコンのサイズ（px） */
  size?: number;
  /** アイコンの色 */
  color?: string;
  /** 線の太さ */
  strokeWidth?: number;
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * イカ・タコ用カスタムアイコン
 *
 * @description
 * Lucide Icons形式に準拠したカスタムSVGアイコン。
 * 釣果記録で写真がない場合のプレースホルダーとして使用。
 *
 * @example
 * ```tsx
 * <SquidIcon size={64} color="white" />
 * ```
 */
export const SquidIcon = forwardRef<SVGSVGElement, SquidIconProps>(
  ({ size = 24, color = 'currentColor', strokeWidth = 1.5, className = '' }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        role="img"
        aria-hidden="true"
      >
        {/* 胴体（楕円形） */}
        <ellipse cx="12" cy="7" rx="5" ry="4" />

        {/* 足（8本） */}
        <path d="M7 11c0 0 -1 5 -1 7s1 2 1 2" />
        <path d="M9 11c0 0 -0.5 5 -0.5 7s0.5 2 0.5 2" />
        <path d="M11 11c0 0 -0.2 5 -0.2 7s0.2 2 0.2 2" />
        <path d="M13 11c0 0 0.2 5 0.2 7s-0.2 2 -0.2 2" />
        <path d="M15 11c0 0 0.5 5 0.5 7s-0.5 2 -0.5 2" />
        <path d="M17 11c0 0 1 5 1 7s-1 2 -1 2" />

        {/* 目 */}
        <circle cx="10" cy="6" r="0.75" fill={color} />
        <circle cx="14" cy="6" r="0.75" fill={color} />
      </svg>
    );
  }
);

SquidIcon.displayName = 'SquidIcon';
