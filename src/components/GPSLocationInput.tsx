// GPS位置取得・手動入力コンポーネント

import React, { useState, useCallback } from 'react';
import { LocationDisplay } from './LocationDisplay';
import type { Coordinates } from '../types';

interface GPSLocationInputProps {
  value?: Coordinates;
  onChange: (coordinates: Coordinates | undefined) => void;
  useGPS: boolean;
  onUseGPSChange: (useGPS: boolean) => void;
  isLoading?: boolean;
  error?: string;
  disabled?: boolean;
}

export const GPSLocationInput: React.FC<GPSLocationInputProps> = ({
  value,
  onChange,
  useGPS,
  onUseGPSChange,
  isLoading = false,
  error,
  disabled = false
}) => {
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState({
    latitude: value?.latitude?.toString() || '',
    longitude: value?.longitude?.toString() || ''
  });

  // GPS位置取得
  const handleGetCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('このブラウザはGPSに対応していません');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      });

      const coordinates: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      onChange(coordinates);
      alert('GPS位置を取得しました');

    } catch (error) {
      console.error('GPS取得エラー:', error);

      let errorMessage = 'GPS位置の取得に失敗しました';
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'GPS位置情報の使用が拒否されました';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'GPS位置情報が利用できません';
            break;
          case error.TIMEOUT:
            errorMessage = 'GPS位置取得がタイムアウトしました';
            break;
        }
      }

      alert(errorMessage);
    }
  }, [onChange]);

  // 手動入力の適用
  const handleApplyManualInput = useCallback(() => {
    const lat = parseFloat(manualInput.latitude);
    const lng = parseFloat(manualInput.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      alert('有効な緯度・経度を入力してください');
      return;
    }

    if (lat < -90 || lat > 90) {
      alert('緯度は-90から90の間で入力してください');
      return;
    }

    if (lng < -180 || lng > 180) {
      alert('経度は-180から180の間で入力してください');
      return;
    }

    const coordinates: Coordinates = {
      latitude: lat,
      longitude: lng
    };

    onChange(coordinates);
    setManualMode(false);
  }, [manualInput, onChange]);

  // 位置情報をクリア
  const handleClearLocation = useCallback(() => {
    onChange(undefined);
    setManualInput({ latitude: '', longitude: '' });
  }, [onChange]);

  // 手動入力切り替え
  const handleToggleManualMode = useCallback(() => {
    if (!manualMode && value) {
      setManualInput({
        latitude: value.latitude.toString(),
        longitude: value.longitude.toString()
      });
    }
    setManualMode(!manualMode);
  }, [manualMode, value]);

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* GPS使用設定 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={useGPS}
            onChange={(e) => onUseGPSChange(e.target.checked)}
            disabled={disabled}
          />
          <span style={{ fontWeight: 'bold' }}>GPS位置情報を使用する</span>
        </label>
      </div>

      {useGPS && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>GPS位置情報</h4>

          {/* GPS取得ボタン */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={disabled || isLoading}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: disabled || isLoading ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
                marginRight: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  GPS取得中...
                </>
              ) : (
                <>
                  📍 現在位置を取得
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleManualMode}
              disabled={disabled}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                marginRight: '0.5rem'
              }}
            >
              ✏️ 手動入力
            </button>

            {value && (
              <button
                type="button"
                onClick={handleClearLocation}
                disabled={disabled}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: disabled ? 'not-allowed' : 'pointer'
                }}
              >
                🗑️ クリア
              </button>
            )}
          </div>

          {/* 手動入力モード */}
          {manualMode && (
            <div style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#fff',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}>
              <h5 style={{ margin: '0 0 1rem 0' }}>手動で位置を入力</h5>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    緯度 (Latitude)
                  </label>
                  <input
                    data-testid="latitude"
                    type="number"
                    step="any"
                    placeholder="例: 35.6762"
                    value={manualInput.latitude}
                    onChange={(e) => setManualInput(prev => ({ ...prev, latitude: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    経度 (Longitude)
                  </label>
                  <input
                    data-testid="longitude"
                    type="number"
                    step="any"
                    placeholder="例: 139.6503"
                    value={manualInput.longitude}
                    onChange={(e) => setManualInput(prev => ({ ...prev, longitude: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleApplyManualInput}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  適用
                </button>

                <button
                  type="button"
                  onClick={() => setManualMode(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* 現在の位置情報表示 */}
          <div style={{
            backgroundColor: '#fff',
            padding: '1rem',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}>
            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>位置情報</h5>

            <LocationDisplay
              coordinates={value}
              showAddress={true}
              showCoordinates={false}
              showAccuracy={true}
              compact={false}
            />

            {value && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #eee' }}>
                <a
                  href={`https://maps.google.com/?q=${value.latitude},${value.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#007bff',
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  🗺️ Googleマップで表示
                </a>
              </div>
            )}
          </div>

          {/* エラー表示 */}
          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      )}

      {/* CSS アニメーション */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};