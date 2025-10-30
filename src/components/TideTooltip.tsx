/**
 * TASK-203: 潮汐ツールチップシステム
 *
 * 要件:
 * - ホバー・タップでの詳細情報表示
 * - 位置計算とツールチップ配置
 * - アニメーション効果
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface TideTooltipData {
  time: string;
  level: string;
  state: string;
  tideType?: string;
  strength?: string;
  nextEvent?: {
    type: 'high' | 'low';
    time: string;
    level: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface TooltipPosition {
  x: number;
  y: number;
}

interface TooltipTheme {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: string;
  shadow?: string;
}

interface TideTooltipProps {
  visible: boolean;
  data: TideTooltipData;
  position: TooltipPosition | 'auto';
  targetElement?: HTMLElement | null;

  // レイアウトオプション
  autoPosition?: boolean;
  offset?: { x: number; y: number };
  showCoordinates?: boolean;
  size?: 'small' | 'medium' | 'large';

  // アニメーション
  animated?: boolean;
  animationType?: 'fade' | 'scale' | 'slide';
  delay?: number;

  // インタラクション
  interactive?: boolean;
  closable?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  onClose?: () => void;

  // モバイル対応
  touchEnabled?: boolean;
  responsive?: boolean;
  swipeToClose?: boolean;

  // アクセシビリティ
  focusable?: boolean;
  highContrast?: boolean;

  // カスタマイズ
  theme?: TooltipTheme;
  customContent?: React.ReactNode;
  className?: string;
}

export const TideTooltip: React.FC<TideTooltipProps> = ({
  visible,
  data,
  position,
  targetElement,

  autoPosition = false,
  offset = { x: 10, y: -10 },
  showCoordinates = false,
  size = 'medium',

  animated = true,
  animationType = 'fade',
  delay = 0,

  interactive = false,
  closable = false,
  closeOnClickOutside = false,
  closeOnEscape = false,
  onClose,

  // _touchEnabled = false,
  responsive = true,
  swipeToClose = false,

  focusable = false,
  highContrast = false,

  theme,
  customContent,
  className = ''
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [computedPosition, setComputedPosition] = useState<TooltipPosition>({ x: 0, y: 0 });
  const [tooltipPlacement, setTooltipPlacement] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [isDelayed, setIsDelayed] = useState(delay > 0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  // レスポンシブ対応の判定
  const isMobile = useMemo(() => {
    if (!responsive) return false;
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  }, [responsive]);

  // 位置計算
  const calculatePosition = useCallback(() => {
    if (position === 'auto' && targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();

      if (!tooltipRect) return;

      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      let x = rect.left + rect.width / 2;
      let y = rect.top;
      let placement: 'top' | 'bottom' | 'left' | 'right' = 'top';

      // 自動配置ロジック
      if (autoPosition) {
        // 下端チェック
        if (y + tooltipRect.height > viewport.height) {
          y = rect.top - tooltipRect.height;
          placement = 'top';
        } else {
          y = rect.bottom;
          placement = 'bottom';
        }

        // 右端チェック
        if (x + tooltipRect.width / 2 > viewport.width) {
          x = rect.left - tooltipRect.width;
          placement = 'left';
        }

        // 左端チェック
        if (x - tooltipRect.width / 2 < 0) {
          x = rect.right;
          placement = 'right';
        }
      }

      setComputedPosition({ x: x + offset.x, y: y + offset.y });
      setTooltipPlacement(placement);
    } else if (typeof position === 'object') {
      setComputedPosition({ x: position.x + offset.x, y: position.y + offset.y });
    }
  }, [position, targetElement, autoPosition, offset]);

  // 遅延表示
  useEffect(() => {
    if (delay > 0 && visible) {
      const timer = setTimeout(() => {
        setIsDelayed(false);
      }, delay);

      return () => clearTimeout(timer);
    } else {
      setIsDelayed(false);
    }
  }, [delay, visible]);

  // 位置計算の実行
  useEffect(() => {
    if (visible && !isDelayed) {
      calculatePosition();

      // リサイズ時の再計算
      const handleResize = () => calculatePosition();
      window.addEventListener('resize', handleResize);

      return () => window.removeEventListener('resize', handleResize);
    }
  }, [visible, isDelayed, calculatePosition]);

  // 外部クリック処理
  useEffect(() => {
    if (closeOnClickOutside && visible && !isDelayed) {
      const handleClickOutside = (event: MouseEvent) => {
        if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
          onClose?.();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [closeOnClickOutside, visible, isDelayed, onClose]);

  // Escキー処理
  useEffect(() => {
    if (closeOnEscape && visible && !isDelayed) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose?.();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [closeOnEscape, visible, isDelayed, onClose]);

  // タッチ処理
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!swipeToClose) return;

    const touch = event.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, [swipeToClose]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!swipeToClose || !touchStart) return;

    const touch = event.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);

    // スワイプ判定（50px以上の移動）
    if (deltaX > 50 || deltaY > 50) {
      onClose?.();
    }

    setTouchStart(null);
  }, [swipeToClose, touchStart, onClose]);

  // テーマスタイルの構築
  const tooltipStyle = useMemo((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      left: computedPosition.x,
      top: computedPosition.y,
      zIndex: 9999,
      pointerEvents: interactive ? 'auto' : 'none',
      transition: animated ? 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',

      // 基本スタイル
      backgroundColor: theme?.backgroundColor || '#1F2937',
      color: theme?.textColor || '#FFFFFF',
      borderRadius: theme?.borderRadius || '8px',
      boxShadow: theme?.shadow || '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${theme?.borderColor || '#374151'}`,
      padding: size === 'small' ? '8px' : size === 'large' ? '16px' : '12px',
      maxWidth: size === 'small' ? '200px' : size === 'large' ? '360px' : '280px',
      minWidth: '160px',
      fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px'
    };

    // モバイルレスポンシブ
    if (isMobile) {
      Object.assign(baseStyle, {
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        top: 'auto',
        maxWidth: 'none',
        transform: 'none'
      });
    }

    // ハイコントラスト
    if (highContrast) {
      Object.assign(baseStyle, {
        backgroundColor: '#000000',
        color: '#FFFFFF',
        border: '2px solid #FFFFFF'
      });
    }

    return baseStyle;
  }, [computedPosition, interactive, animated, theme, size, isMobile, highContrast]);

  // CSS クラスの構築
  const tooltipClasses = useMemo(() => {
    const classes = [
      'relative',
      className
    ];

    if (visible && !isDelayed) {
      classes.push('opacity-100');
      if (animated) {
        const animationClass = animationType === 'scale' ? 'animate-scale-in' :
                              animationType === 'slide' ? 'animate-slide-in' :
                              'animate-fade-in';
        classes.push(animationClass);
      }
    } else {
      classes.push('opacity-0', 'pointer-events-none');
    }

    if (interactive) classes.push('cursor-pointer');
    if (tooltipPlacement === 'left') classes.push('tooltip-left');
    if (tooltipPlacement === 'top') classes.push('tooltip-top');

    return classes.filter(Boolean).join(' ');
  }, [visible, isDelayed, animated, animationType, interactive, tooltipPlacement, className]);

  // 座標フォーマット
  const formatCoordinate = (coord: number, type: 'lat' | 'lng'): string => {
    const direction = type === 'lat' ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${Math.abs(coord).toFixed(2)}°${direction}`;
  };

  if (!visible && !animated) return null;

  return (
    <div
      ref={tooltipRef}
      data-testid="tide-tooltip"
      role="tooltip"
      aria-live="polite"
      aria-label={`潮汐情報: ${data.time}, ${data.level}, ${data.state}`}
      tabIndex={focusable ? 0 : -1}
      className={tooltipClasses}
      style={tooltipStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* カスタムコンテンツ */}
      {customContent ? (
        customContent
      ) : (
        <div className="relative">
          {/* 閉じるボタン */}
          {closable && (
            <button
              data-testid="tooltip-close-button"
              onClick={onClose}
              className="absolute top-1 right-2 text-gray-400 hover:text-white bg-none border-none text-lg cursor-pointer"
              aria-label="ツールチップを閉じる"
            >
              ×
            </button>
          )}

          {/* メイン情報 */}
          <div className="flex flex-col space-y-1">
            <div className="font-semibold text-blue-300">{data.time}</div>
            <div className="text-lg font-bold">{data.level}</div>
            <div className="text-sm text-gray-300">{data.state}</div>
          </div>

          {/* 追加情報 */}
          {(data.tideType || data.strength) && (
            <div className="mt-2 pt-2 border-t border-gray-600 flex justify-between text-xs">
              {data.tideType && (
                <div className="text-yellow-300 font-medium">{data.tideType}</div>
              )}
              {data.strength && (
                <div className="text-green-300">強度: {data.strength}</div>
              )}
            </div>
          )}

          {/* 次イベント */}
          {data.nextEvent && (
            <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
              <div className="text-orange-300 font-medium">
                次の{data.nextEvent.type === 'high' ? '満潮' : '干潮'}: {data.nextEvent.time}
              </div>
              <div className="text-gray-300">{data.nextEvent.level}</div>
            </div>
          )}

          {/* 座標情報 */}
          {showCoordinates && data.coordinates && (
            <div className="mt-2 pt-2 border-t border-gray-600 flex justify-between text-xs text-gray-400">
              <span>{formatCoordinate(data.coordinates.latitude, 'lat')}</span>
              <span>{formatCoordinate(data.coordinates.longitude, 'lng')}</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scaleIn 0.2s ease-out;
        }

        .animate-slide-in {
          animation: slideIn 0.2s ease-out;
        }

        .mobile-layout {
          position: fixed !important;
          bottom: 1rem !important;
          left: 1rem !important;
          right: 1rem !important;
          top: auto !important;
          max-width: none !important;
          transform: none !important;
        }

        .high-contrast {
          background-color: black !important;
          color: white !important;
          border: 2px solid white !important;
        }

        .interactive {
          pointer-events: auto;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};