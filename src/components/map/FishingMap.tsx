/**
 * FishingMap.tsx - 釣果記録マップ表示（モダンUI/UX版）
 * Material Design 3とGlass Morphismを採用した次世代デザイン
 */

import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';
import { photoService } from '../../lib/photo-service';
import type { FishingRecord } from '../../types';
import { logger } from '../../lib/errors/logger';
import { Icon } from '../ui/Icon';
import { Map as MapIcon, Calendar, MapPin, Ruler, BarChart3, Fish, X, Maximize2 } from 'lucide-react';

// Leafletのデフォルトアイコン修正
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface FishingMapProps {
  records: FishingRecord[];
  onRecordClick?: (record: FishingRecord) => void;
  selectedRecordId?: string;
}

// 日本の境界ボックス
const JAPAN_BOUNDS: L.LatLngBoundsExpression = [
  [20.4, 122.9],
  [45.5, 153.9]
];

// 地図の中心を自動調整
const AutoBounds: React.FC<{ records: FishingRecord[] }> = ({ records }) => {
  const map = useMap();
  const hasAdjusted = React.useRef(false);

  React.useEffect(() => {
    if (hasAdjusted.current) return;
    if (records.length === 0) return;

    const recordsWithCoordinates = records.filter(r => r.coordinates);
    if (recordsWithCoordinates.length === 0) return;

    if (recordsWithCoordinates.length === 1) {
      const record = recordsWithCoordinates[0];
      map.setView([record.coordinates!.latitude, record.coordinates!.longitude], 13);
    } else {
      const bounds = L.latLngBounds(
        recordsWithCoordinates.map(r => [r.coordinates!.latitude, r.coordinates!.longitude])
      );
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 13,
      });
    }

    hasAdjusted.current = true;
  }, [records, map]);

  return null;
};

// 魚種ごとの色定義
const getFishSpeciesColor = (species: string): string => {
  const colorMap: Record<string, string> = {
    'アオリイカ': '#9333ea',
    'メバル': '#dc2626',
    'アジ': '#2563eb',
    'シーバス': '#059669',
    'チヌ': '#eab308',
    'マダイ': '#ec4899',
  };
  return colorMap[species] || colors.primary[500];
};

// モダンなカスタムピンアイコン
const createCustomIcon = (species: string, size?: number) => {
  const color = getFishSpeciesColor(species);
  const iconSize = size ? Math.min(Math.max(size / 8, 28), 44) : 36;
  const dotSize = iconSize * 0.25;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-wrapper">
        <div class="marker-pin" style="
          background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
          width: ${iconSize}px;
          height: ${iconSize}px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow:
            0 3px 8px rgba(0,0,0,0.3),
            inset 0 -2px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <div class="marker-inner" style="
            background: rgba(255,255,255,0.25);
            width: ${iconSize * 0.7}px;
            height: ${iconSize * 0.7}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(45deg);
          ">
            <span style="
              color: white;
              font-size: ${iconSize * 0.5}px;
              font-weight: bold;
              filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4));
            ">🐟</span>
          </div>
        </div>
        <div class="marker-dot" style="
          position: absolute;
          bottom: -${dotSize / 2}px;
          left: 50%;
          transform: translateX(-50%);
          width: ${dotSize}px;
          height: ${dotSize}px;
          background: radial-gradient(circle, ${color} 0%, ${color}88 100%);
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        "></div>
      </div>
    `,
    iconSize: [iconSize, iconSize + dotSize],
    iconAnchor: [iconSize / 2, iconSize + dotSize / 2],
    popupAnchor: [0, -(iconSize + dotSize / 2)],
  });
};


// フライト機能
const FlyToLocation: React.FC<{ coordinates: { latitude: number; longitude: number } }> = ({ coordinates }) => {
  const map = useMap();

  React.useEffect(() => {
    map.flyTo([coordinates.latitude, coordinates.longitude], 14, {
      duration: 1.5,
      easeLinearity: 0.5,
    });
  }, [coordinates, map]);

  return null;
};

// デフォルト表示に戻す機能
const ResetView: React.FC<{ records: FishingRecord[]; trigger: number }> = ({ records, trigger }) => {
  const map = useMap();

  React.useEffect(() => {
    if (trigger === 0) return;

    const recordsWithCoordinates = records.filter(r => r.coordinates);
    if (recordsWithCoordinates.length === 0) return;

    if (recordsWithCoordinates.length === 1) {
      const record = recordsWithCoordinates[0];
      map.flyTo([record.coordinates!.latitude, record.coordinates!.longitude], 13, {
        duration: 1.5,
      });
    } else {
      const bounds = L.latLngBounds(
        recordsWithCoordinates.map(r => [r.coordinates!.latitude, r.coordinates!.longitude])
      );
      map.flyToBounds(bounds, {
        padding: [50, 50],
        maxZoom: 13,
        duration: 1.5,
      });
    }
  }, [trigger, records, map]);

  return null;
};

export const FishingMap: React.FC<FishingMapProps> = ({ records, onRecordClick, selectedRecordId }) => {
  const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoUrlRef = React.useRef<string | null>(null);

  const recordsWithCoordinates = useMemo(
    () => records.filter(r => r.coordinates),
    [records]
  );

  // スパイダー表示用の座標計算
  const recordsWithAdjustedCoordinates = useMemo(() => {
    const groups: Map<string, FishingRecord[]> = new Map();

    recordsWithCoordinates.forEach(record => {
      const lat = record.coordinates!.latitude.toFixed(4);
      const lng = record.coordinates!.longitude.toFixed(4);
      const key = `${lat},${lng}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    });

    const adjusted: Array<FishingRecord & { adjustedLat: number; adjustedLng: number }> = [];

    groups.forEach((groupRecords) => {
      if (groupRecords.length === 1) {
        adjusted.push({
          ...groupRecords[0],
          adjustedLat: groupRecords[0].coordinates!.latitude,
          adjustedLng: groupRecords[0].coordinates!.longitude,
        });
      } else {
        const centerLat = groupRecords[0].coordinates!.latitude;
        const centerLng = groupRecords[0].coordinates!.longitude;
        const radius = 0.002;
        const angleStep = (2 * Math.PI) / groupRecords.length;

        groupRecords.forEach((record, index) => {
          const angle = angleStep * index;
          adjusted.push({
            ...record,
            adjustedLat: centerLat + radius * Math.cos(angle),
            adjustedLng: centerLng + radius * Math.sin(angle),
          });
        });
      }
    });

    return adjusted;
  }, [recordsWithCoordinates]);

  // 詳細画面からの遷移処理
  useEffect(() => {
    if (selectedRecordId) {
      const targetRecord = recordsWithAdjustedCoordinates.find(r => r.id === selectedRecordId);
      if (targetRecord && targetRecord.coordinates) {
        setFlyToCoords({
          latitude: targetRecord.adjustedLat,
          longitude: targetRecord.adjustedLng,
        });
        setSelectedRecord(targetRecord);
      }
    }
  }, [selectedRecordId, recordsWithAdjustedCoordinates]);

  const initialView = useMemo(() => {
    if (recordsWithCoordinates.length > 0) {
      const latestRecord = recordsWithCoordinates[0];
      return {
        center: [latestRecord.coordinates!.latitude, latestRecord.coordinates!.longitude] as [number, number],
        zoom: 14,
      };
    }
    return {
      center: [36.5, 138.0] as [number, number],
      zoom: 5,
    };
  }, [recordsWithCoordinates]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 統計データ
  const statistics = useMemo(() => {
    const totalRecords = recordsWithCoordinates.length;
    const uniqueLocations = new Set(recordsWithCoordinates.map(r => r.location)).size;
    const uniqueSpecies = new Set(recordsWithCoordinates.map(r => r.fishSpecies)).size;
    const biggestCatch = recordsWithCoordinates.reduce((max, r) => {
      const currentSize = Math.max(r.size || 0, (r.weight || 0) / 10);
      const maxSize = Math.max(max.size || 0, (max.weight || 0) / 10);
      return currentSize > maxSize ? r : max;
    }, recordsWithCoordinates[0]);

    return { totalRecords, uniqueLocations, uniqueSpecies, biggestCatch };
  }, [recordsWithCoordinates]);

  // 選択されたレコードの写真を読み込む
  useEffect(() => {
    let isMounted = true;

    const loadPhoto = async () => {
      if (!selectedRecord?.photoId) {
        setPhotoUrl(null);
        setPhotoLoading(false);
        return;
      }

      try {
        setPhotoLoading(true);
        const photoResult = await photoService.getPhotoById(selectedRecord.photoId);

        if (isMounted && photoResult.success && photoResult.data) {
          // 古いURLをクリーンアップ
          if (photoUrlRef.current) {
            URL.revokeObjectURL(photoUrlRef.current);
          }

          const url = URL.createObjectURL(photoResult.data.blob);
          photoUrlRef.current = url;
          setPhotoUrl(url);
        }
      } catch (error) {
        logger.error('写真の読み込みエラー', { error });
      } finally {
        if (isMounted) {
          setPhotoLoading(false);
        }
      }
    };

    loadPhoto();

    return () => {
      isMounted = false;
      if (photoUrlRef.current) {
        URL.revokeObjectURL(photoUrlRef.current);
        photoUrlRef.current = null;
      }
    };
  }, [selectedRecord?.photoId]);

  if (recordsWithCoordinates.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        textAlign: 'center',
        background: `linear-gradient(135deg, ${colors.surface.secondary} 0%, ${colors.surface.tertiary} 100%)`,
      }}>
        <div style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <Icon icon={MapIcon} size={80} color="secondary" decorative />
        </div>
        <h3 style={{
          ...textStyles.headline.medium,
          marginBottom: '0.75rem',
          color: colors.text.primary,
        }}>
          GPS情報付きの記録がありません
        </h3>
        <p style={{
          ...textStyles.body.large,
          color: colors.text.secondary,
          maxWidth: '500px',
        }}>
          位置情報ONで撮影した写真をアップロードすると、<br />
          ここに釣り場所が自動表示されます
        </p>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: colors.background.primary,
    }}>
      {/* フルスクリーン地図 */}
      <div style={{
        flex: 1,
        width: '100%',
        position: 'relative',
      }}>
        <MapContainer
          center={initialView.center}
          zoom={initialView.zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          minZoom={5}
          maxZoom={17}
          maxBounds={JAPAN_BOUNDS}
          maxBoundsViscosity={0.9}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png"
            maxZoom={18}
          />

          <AutoBounds records={recordsWithCoordinates} />

          <ResetView records={recordsWithCoordinates} trigger={resetTrigger} />

          {selectedRecord && selectedRecord.coordinates && !flyToCoords && (
            <FlyToLocation coordinates={selectedRecord.coordinates} />
          )}

          {flyToCoords && (
            <FlyToLocation coordinates={flyToCoords} />
          )}

          {recordsWithAdjustedCoordinates.map((record) => (
            <Marker
              key={record.id}
              position={[record.adjustedLat, record.adjustedLng]}
              icon={createCustomIcon(record.fishSpecies, record.size || record.weight)}
              eventHandlers={{
                click: () => {
                  setSelectedRecord(record);
                  // 地図をその位置に移動
                  setFlyToCoords({
                    latitude: record.adjustedLat,
                    longitude: record.adjustedLng,
                  });
                },
              }}
            />
          ))}
        </MapContainer>

        {/* 選択された釣果のサマリパネル（上部中央） */}
        {selectedRecord && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            padding: '16px 20px',
            border: `2px solid ${getFishSpeciesColor(selectedRecord.fishSpecies)}`,
            maxWidth: '400px',
            minWidth: '320px',
          }}>
            {/* 閉じるボタン */}
            <button
              onClick={() => setSelectedRecord(null)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: colors.surface.tertiary,
                color: colors.text.secondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.border.medium;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.surface.tertiary;
              }}
            >
              <Icon icon={X} size={16} decorative />
            </button>

            {/* 写真（あれば表示） */}
            {photoUrl && !photoLoading && (
              <div style={{
                marginBottom: '12px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: `1px solid ${colors.border.light}`,
              }}>
                <img
                  src={photoUrl}
                  alt={`${selectedRecord.fishSpecies}の写真`}
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>
            )}

            {/* ヘッダー */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              paddingRight: '24px',
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: getFishSpeciesColor(selectedRecord.fishSpecies),
                flexShrink: 0,
                boxShadow: `0 0 0 4px ${getFishSpeciesColor(selectedRecord.fishSpecies)}22`,
              }} />
              <h4 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '700',
                color: colors.text.primary,
              }}>
                {selectedRecord.fishSpecies}
              </h4>
              {(selectedRecord.size || selectedRecord.weight) && (
                <div style={{
                  backgroundColor: colors.primary[100],
                  color: colors.primary[700],
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  marginLeft: 'auto',
                }}>
                  {selectedRecord.size ? `${selectedRecord.size}cm` : `${selectedRecord.weight}g`}
                </div>
              )}
            </div>

            {/* 情報グリッド */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '8px 12px',
              marginBottom: '16px',
            }}>
              <Icon icon={Calendar} size={18} color="secondary" decorative />
              <span style={{
                fontSize: '0.9rem',
                color: colors.text.secondary,
                fontWeight: '500',
              }}>
                {formatDate(selectedRecord.date)}
              </span>

              <Icon icon={MapPin} size={18} color="secondary" decorative />
              <span style={{
                fontSize: '0.9rem',
                color: colors.text.secondary,
                fontWeight: '500',
              }}>
                {selectedRecord.location}
              </span>

              {selectedRecord.size && selectedRecord.weight && (
                <>
                  <Icon icon={Ruler} size={18} color="secondary" decorative />
                  <span style={{
                    fontSize: '0.9rem',
                    color: colors.text.secondary,
                    fontWeight: '500',
                  }}>
                    {selectedRecord.size}cm / {selectedRecord.weight}g
                  </span>
                </>
              )}
            </div>

            {/* アクションボタン */}
            <button
              onClick={() => onRecordClick?.(selectedRecord)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: colors.primary[500],
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(26, 115, 232, 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary[600];
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 115, 232, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary[500];
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(26, 115, 232, 0.25)';
              }}
            >
              詳細を見る
            </button>
          </div>
        )}

        {/* フローティングコントロールパネル（右上） */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* 全体表示に戻すボタン */}
          <button
            onClick={() => {
              // 選択をリセット
              setSelectedRecord(null);
              setFlyToCoords(null);
              // 地図を初期表示に戻す
              setResetTrigger(prev => prev + 1);
            }}
            style={{
              width: '44px',
              height: '44px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              color: colors.text.secondary,
              border: `1px solid ${colors.border.light}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
            }}
            title="全体表示に戻す"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
              e.currentTarget.style.boxShadow = '0 6px 32px rgba(0, 0, 0, 0.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.12)';
            }}
          >
            <Icon icon={Maximize2} size={20} decorative />
          </button>

          {/* 統計情報カード */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
            padding: '12px',
            border: `1px solid ${colors.border.light}`,
            minWidth: '140px',
          }}>
            <div style={{
              fontSize: '0.7rem',
              color: colors.text.tertiary,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600',
            }}>
              統計
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon icon={BarChart3} size={14} color="secondary" decorative /> 記録数
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: colors.primary[600] }}>
                  {statistics.totalRecords}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon icon={MapPin} size={14} color="secondary" decorative /> 釣り場
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: colors.primary[600] }}>
                  {statistics.uniqueLocations}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon icon={Fish} size={14} color="secondary" decorative /> 魚種
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: colors.primary[600] }}>
                  {statistics.uniqueSpecies}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* コンパクトリスト（下部オーバーレイ） */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${colors.border.light}`,
          maxHeight: '180px',
          overflowY: 'auto',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.08)',
        }}>
          <div style={{
            padding: '12px 16px 8px 16px',
            borderBottom: `1px solid ${colors.border.light}`,
            position: 'sticky',
            top: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            zIndex: 1,
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: '700',
              color: colors.text.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <Icon icon={MapPin} size={16} color="primary" decorative /> 釣果一覧 ({recordsWithAdjustedCoordinates.length})
            </h4>
          </div>
          <div style={{ padding: '8px' }}>
            {recordsWithAdjustedCoordinates.map((record) => (
              <div
                key={record.id}
                onClick={() => {
                  // 地図上でフライして、サマリパネルを表示
                  setSelectedRecord(record);
                  setFlyToCoords({
                    latitude: record.adjustedLat,
                    longitude: record.adjustedLng,
                  });
                  // 詳細モーダルは開かない（地図に集中）
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  marginBottom: '6px',
                  borderRadius: '10px',
                  backgroundColor: selectedRecord?.id === record.id ? colors.primary[50] : 'transparent',
                  border: selectedRecord?.id === record.id ? `2px solid ${colors.primary[300]}` : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  if (selectedRecord?.id !== record.id) {
                    e.currentTarget.style.backgroundColor = colors.surface.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRecord?.id !== record.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getFishSpeciesColor(record.fishSpecies),
                  flexShrink: 0,
                  boxShadow: `0 0 0 3px ${getFishSpeciesColor(record.fishSpecies)}22`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: colors.text.primary,
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {record.fishSpecies}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: colors.text.tertiary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {record.location}
                  </div>
                </div>
                {(record.size || record.weight) && (
                  <div style={{
                    backgroundColor: colors.primary[100],
                    color: colors.primary[700],
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>
                    {record.size ? `${record.size}cm` : `${record.weight}g`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSSアニメーション */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .marker-wrapper {
          animation: float 3s ease-in-out infinite;
          position: relative;
        }

        .marker-wrapper:hover .marker-pin {
          transform: rotate(-45deg) scale(1.15);
        }

        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          padding: 0 !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
          overflow: hidden !important;
        }

        .leaflet-popup-content {
          margin: 0 !important;
          padding: 15px 20px !important;
          width: auto !important;
          min-width: 280px !important;
        }

        .leaflet-popup-tip {
          box-shadow: 0 3px 14px rgba(0,0,0,0.1) !important;
        }

        /* スクロールバーのスタイリング */
        *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        *::-webkit-scrollbar-track {
          background: transparent;
        }

        *::-webkit-scrollbar-thumb {
          background: ${colors.border.medium};
          border-radius: 3px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: ${colors.border.dark};
        }
      `}</style>
    </div>
  );
};
