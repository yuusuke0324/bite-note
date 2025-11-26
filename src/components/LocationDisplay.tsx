// 位置情報表示コンポーネント

import React, { useState, useEffect } from 'react';
import { GeolocationService } from '../lib/geolocation-service';
import type { Coordinates } from '../types';

interface LocationDisplayProps {
  coordinates?: Coordinates;
  showAddress?: boolean;
  showCoordinates?: boolean;
  showAccuracy?: boolean;
  compact?: boolean;
  style?: React.CSSProperties;
}

export const LocationDisplay: React.FC<LocationDisplayProps> = ({
  coordinates,
  showAddress = true,
  showCoordinates = false,
  showAccuracy = true,
  compact = false,
  style
}) => {
  const [address, setAddress] = useState<string>('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string>('');

  useEffect(() => {
    if (!coordinates || !showAddress) return;

    const geolocationService = new GeolocationService();

    const fetchAddress = async () => {
      setLoadingAddress(true);
      setAddressError('');

      const result = await geolocationService.getAddressFromCoordinates(coordinates);

      if (result.success) {
        setAddress(result.data || '');
      } else {
        setAddressError(result.error?.message || '住所の取得に失敗しました');
      }

      setLoadingAddress(false);
    };

    fetchAddress();
  }, [coordinates, showAddress]);

  if (!coordinates) {
    return (
      <div style={style}>
        <span style={{ color: '#666', fontSize: '0.9rem' }}>
          📍 位置情報なし
        </span>
      </div>
    );
  }

  const formatCoordinates = (coords: Coordinates) => {
    const lat = coords.latitude.toFixed(6);
    const lng = coords.longitude.toFixed(6);
    return `${lat}, ${lng}`;
  };

  const formatAccuracy = (accuracy?: number) => {
    if (!accuracy) return '';
    if (accuracy < 1000) {
      return `±${Math.round(accuracy)}m`;
    }
    return `±${(accuracy / 1000).toFixed(1)}km`;
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: compact ? 'row' : 'column',
    alignItems: compact ? 'center' : 'flex-start',
    gap: compact ? '0.5rem' : '0.25rem',
    fontSize: compact ? '0.85rem' : '0.9rem',
    ...style
  };

  return (
    <div style={containerStyle}>
      {showAddress && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#007bff' }}>📍</span>
          {loadingAddress ? (
            <span style={{ color: '#666' }}>住所を取得中...</span>
          ) : addressError ? (
            <span style={{ color: '#dc3545', fontSize: '0.8rem' }}>
              {addressError}
            </span>
          ) : address ? (
            <span style={{ color: '#333' }}>{address}</span>
          ) : (
            <span style={{ color: '#666' }}>住所不明</span>
          )}
        </div>
      )}

      {showCoordinates && (
        <div style={{
          color: '#666',
          fontSize: compact ? '0.75rem' : '0.8rem',
          fontFamily: 'monospace'
        }}>
          🌐 {formatCoordinates(coordinates)}
        </div>
      )}

      {showAccuracy && coordinates.accuracy && (
        <div style={{
          color: '#666',
          fontSize: compact ? '0.75rem' : '0.8rem'
        }}>
          📏 精度: {formatAccuracy(coordinates.accuracy)}
        </div>
      )}
    </div>
  );
};