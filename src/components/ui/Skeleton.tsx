/**
 * Skeleton.tsx - スケルトンローディングコンポーネント
 * ローディング中のプレースホルダーを表示し、体感速度を向上
 */

import React from 'react';
import { colors } from '../../theme/colors';

interface SkeletonProps {
  /** 幅（CSSの値、例: '100%', '200px'） */
  width?: string;
  /** 高さ（CSSの値、例: '20px', '100%'） */
  height?: string;
  /** 円形にするか */
  circle?: boolean;
  /** 角丸の半径 */
  borderRadius?: string;
  /** アニメーションを無効にする */
  noAnimation?: boolean;
  /** カスタムスタイル */
  style?: React.CSSProperties;
  /** クラス名 */
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  circle = false,
  borderRadius = '4px',
  noAnimation = false,
  style,
  className = '',
}) => {
  return (
    <>
      <div
        className={`skeleton ${noAnimation ? 'no-animation' : ''} ${className}`}
        style={{
          width: circle ? height : width,
          height,
          borderRadius: circle ? '50%' : borderRadius,
          backgroundColor: 'var(--color-surface-tertiary)',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
      >
        {!noAnimation && (
          <div
            className="skeleton-shimmer"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.4) 50%,
                transparent 100%
              )`,
              animation: 'skeleton-shimmer 1.5s infinite',
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes skeleton-shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .skeleton {
          user-select: none;
          pointer-events: none;
        }
      `}</style>
    </>
  );
};

/**
 * カード型スケルトン - CompactRecordCard用
 */
export const SkeletonRecordCard: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        borderRadius: '12px',
        backgroundColor: 'var(--color-surface-primary)',
        border: `1px solid var(--color-border-light)`,
      }}
    >
      {/* 写真サムネイル */}
      <Skeleton width="80px" height="80px" borderRadius="8px" />

      {/* 情報部分 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Skeleton width="60%" height="18px" borderRadius="4px" />
        <Skeleton width="80%" height="14px" borderRadius="4px" />
        <Skeleton width="40%" height="14px" borderRadius="4px" />
      </div>

      {/* サイズバッジ */}
      <div
        style={{
          alignSelf: 'flex-start',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <Skeleton width="60px" height="24px" borderRadius="8px" />
      </div>
    </div>
  );
};

/**
 * 写真カード型スケルトン - ModernRecordCard用
 */
export const SkeletonPhotoCard: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '350px',
        backgroundColor: 'var(--color-surface-secondary)',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 写真部分 */}
      <Skeleton width="100%" height="100%" borderRadius="0" />

      {/* 日付バッジ（右上） */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
        }}
      >
        <Skeleton width="80px" height="28px" borderRadius="16px" />
      </div>

      {/* サイズバッジ（左上） */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
        }}
      >
        <Skeleton width="70px" height="28px" borderRadius="16px" />
      </div>

      {/* 情報オーバーレイ（下部） */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          right: '16px',
        }}
      >
        <Skeleton width="50%" height="24px" borderRadius="4px" style={{ marginBottom: '8px' }} />
        <Skeleton width="70%" height="16px" borderRadius="4px" />
      </div>
    </div>
  );
};

/**
 * リスト型スケルトン - 複数のカードを表示
 */
interface SkeletonListProps {
  count?: number;
  cardType?: 'compact' | 'photo';
  gap?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 3,
  cardType = 'compact',
  gap = '12px',
}) => {
  const CardComponent = cardType === 'compact' ? SkeletonRecordCard : SkeletonPhotoCard;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, index) => (
        <CardComponent key={index} />
      ))}
    </div>
  );
};

/**
 * テキスト型スケルトン - 複数行のテキスト
 */
interface SkeletonTextProps {
  lines?: number;
  gap?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  gap = '8px',
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '60%' : '100%'}
          height="16px"
        />
      ))}
    </div>
  );
};
