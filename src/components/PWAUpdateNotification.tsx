// PWA更新通知コンポーネント

import React, { useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import { Icon } from './ui/Icon';
import { RefreshCw, X } from 'lucide-react';

export const PWAUpdateNotification: React.FC = () => {
  const { updateState, updateApp, isOnline } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!updateState.updateAvailable || dismissed) {
    return null;
  }

  const handleUpdate = async () => {
    await updateApp();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#28a745',
      color: 'white',
      padding: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Icon icon={RefreshCw} size={24} decorative />
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
            アプリが更新されました
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
            {isOnline ? '最新版をご利用ください' : 'オンライン時に更新してください'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleUpdate}
          disabled={!isOnline}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: isOnline ? 'pointer' : 'not-allowed',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            opacity: isOnline ? 1 : 0.6
          }}
        >
          {isOnline ? '更新' : 'オフライン'}
        </button>
        <button
          onClick={handleDismiss}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '0.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            width: '2rem',
            height: '2rem'
          }}
          title="閉じる"
        >
          <Icon icon={X} size={16} decorative />
        </button>
      </div>

      <style>
        {`
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
            }
            to {
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};