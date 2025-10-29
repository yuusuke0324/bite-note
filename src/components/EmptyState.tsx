// 空状態表示コンポーネント

import React from 'react';

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
  const getDefaultIcon = () => {
    switch (type) {
      case 'noRecords':
        return '🎣';
      case 'noSearchResults':
        return '🔍';
      case 'gpsError':
        return '📍';
      case 'noPhotos':
        return '📷';
      case 'offline':
        return '📶';
      default:
        return '📄';
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
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px'
        };
      case 'offline':
        return {
          ...baseStyle,
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px'
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
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
          color: '#333',
          marginBottom: '0.75rem'
        }}
      >
        {title}
      </h3>

      {/* 説明 */}
      <p
        style={{
          fontSize: '1rem',
          color: '#666',
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
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#007bff';
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
            backgroundColor: '#e3f2fd',
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#1976d2'
          }}
        >
          💡 ヒント: 日付、場所、魚種、サイズなどを記録して釣果を管理しましょう
        </div>
      )}

      {type === 'gpsError' && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#fff',
            border: '1px solid #ffeaa7',
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#856404'
          }}
        >
          <strong>解決方法：</strong>
          <ul style={{ textAlign: 'left', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
            <li>ブラウザの位置情報許可設定を確認</li>
            <li>WiFiやGPSが有効になっているか確認</li>
            <li>手動で場所を入力することも可能です</li>
          </ul>
        </div>
      )}
    </div>
  );
};