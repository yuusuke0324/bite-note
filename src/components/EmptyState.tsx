// 空状態表示コンポーネント

import React, { type ReactNode } from 'react';
import { Icon } from './ui/Icon';
import { Anchor, Search, MapPin, Camera, Wifi, FileText, Lightbulb } from 'lucide-react';
import { colors } from '../theme/colors';

export interface EmptyStateProps {
  type: 'noRecords' | 'noSearchResults' | 'gpsError' | 'noPhotos' | 'offline';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
  illustration?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  icon,
  illustration
}) => {
  const getDefaultIcon = (): ReactNode => {
    switch (type) {
      case 'noRecords':
        return <Icon icon={Anchor} size={64} decorative />;
      case 'noSearchResults':
        return <Icon icon={Search} size={64} decorative />;
      case 'gpsError':
        return <Icon icon={MapPin} size={64} decorative />;
      case 'noPhotos':
        return <Icon icon={Camera} size={64} decorative />;
      case 'offline':
        return <Icon icon={Wifi} size={64} decorative />;
      default:
        return <Icon icon={FileText} size={64} decorative />;
    }
  };

  const getContainerStyle = () => {
    const baseStyle = {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 2rem',
      textAlign: 'center' as const,
      minHeight: '300px'
    };

    switch (type) {
      case 'gpsError':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '8px'
        };
      case 'offline':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px'
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: colors.surface.secondary,
          border: `1px solid ${colors.border.light}`,
          borderRadius: '8px'
        };
    }
  };

  return (
    <div style={getContainerStyle()}>
      {/* アイコンまたはイラスト */}
      <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>
        {illustration || (icon || getDefaultIcon())}
      </div>

      {/* タイトル */}
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: colors.text.primary,
          marginBottom: '0.75rem'
        }}
      >
        {title}
      </h3>

      {/* 説明 */}
      <p
        style={{
          fontSize: '1rem',
          color: colors.text.secondary,
          marginBottom: '2rem',
          maxWidth: '400px',
          lineHeight: 1.5
        }}
      >
        {description}
      </p>

      {/* アクションボタン */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#60a5fa',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#60a5fa';
          }}
        >
          {actionLabel}
        </button>
      )}

      {/* 追加のガイダンス */}
      {type === 'noRecords' && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: 'rgba(96, 165, 250, 0.15)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#60a5fa'
          }}
        >
          <Icon icon={Lightbulb} size={14} decorative /> ヒント: 日付、場所、魚種、サイズなどを記録して釣果を管理しましょう
        </div>
      )}

      {type === 'gpsError' && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: colors.surface.primary,
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#fbbf24'
          }}
        >
          <strong>解決方法：</strong>
          <ul style={{ textAlign: 'left', marginTop: '0.5rem', paddingLeft: '1.5rem', color: colors.text.secondary }}>
            <li>ブラウザの位置情報許可設定を確認</li>
            <li>WiFiやGPSが有効になっているか確認</li>
            <li>手動で場所を入力することも可能です</li>
          </ul>
        </div>
      )}
    </div>
  );
};