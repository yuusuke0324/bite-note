/**
 * FishingMap.tsx - 釣果記録マップ表示（モダンUI/UX版）
 * Material Design 3とGlass Morphismを採用した次世代デザイン
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';
import type { FishingRecord } from '../../types';
import { Icon } from '../ui/Icon';
import { Map as MapIcon, Calendar, MapPin, Ruler, BarChart3, Fish, X, Maximize2, Globe } from 'lucide-react';
import { useSwipe } from '../../hooks/useSwipe';
import { SwipeIndicator } from '../ui/SwipeIndicator';
import { SwipeHint } from '../ui/SwipeHint';
import { haversineDistance, DEFAULT_SWIPE_CONFIG } from '../../lib/swipe-utils';

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

// Fish SVGアイコンをBase64エンコード（Lucide Fish icon）
const createFishIconDataUri = (color: string = 'white') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6-3.56 0-7.56-2.53-8.5-6Z"/><circle cx="15" cy="12" r="1"/><path d="M2 12S5.5 8 6.5 12s-4.5 0-4.5 0Z"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// モダンなカスタムピンアイコン
// Issue #290: タッチターゲットサイズ44-56px（WCAG 2.1 AA準拠）
// Issue #291: 標準的な逆さティアドロップ形状
// Issue #292: ARIA属性追加（アクセシビリティ対応）
// Issue #295: 最近の釣果にパルスアニメーション
interface CreateCustomIconOptions {
  species: string;
  size?: number;
  location?: string;
  weight?: number;
  isRecent?: boolean; // Issue #295: 1週間以内の釣果
  zoomLevel?: number; // Issue #298: ズームレベル連動サイズ
  isDarkMode?: boolean; // Issue #296: ダークモード対応
}

// Issue #295: 最近の釣果判定（1週間以内）
const isRecentCatch = (date: Date | string): boolean => {
  const catchDate = typeof date === 'string' ? new Date(date) : date;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return catchDate >= oneWeekAgo;
};

// Issue #296: ダークモード検出フック
const useDarkMode = (): boolean => {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDark;
};

// Issue #346: モバイル検出フック（768px未満をモバイルとする）
// デバウンス処理でパフォーマンス最適化
const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 150); // 150ms デバウンス
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isMobile;
};

// Issue #298: ズームレベル追跡コンポーネント
const ZoomTracker: React.FC<{ onZoomChange: (zoom: number) => void }> = ({ onZoomChange }) => {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
};

// Issue #298: ズームレベルに基づくマーカーサイズ計算
const getMarkerSizeForZoom = (zoom: number, baseSize: number = 48): number => {
  // ズームレベル5（広域）〜17（詳細）に対応
  // 広域では小さく、詳細では大きく
  if (zoom <= 8) return Math.max(baseSize * 0.7, 32);
  if (zoom <= 10) return Math.max(baseSize * 0.8, 36);
  if (zoom <= 12) return Math.max(baseSize * 0.9, 40);
  if (zoom <= 14) return baseSize;
  return Math.min(baseSize * 1.15, 56); // 最大56px
};

const createCustomIcon = (options: CreateCustomIconOptions | string, size?: number) => {
  // 後方互換性のため、文字列引数もサポート
  const species = typeof options === 'string' ? options : options.species;
  const fishSize = typeof options === 'string' ? size : options.size;
  const location = typeof options === 'string' ? undefined : options.location;
  const weight = typeof options === 'string' ? undefined : options.weight;
  const isRecent = typeof options === 'string' ? false : options.isRecent ?? false;
  const zoomLevel = typeof options === 'string' ? 14 : options.zoomLevel ?? 14;
  const isDarkMode = typeof options === 'string' ? false : options.isDarkMode ?? false;

  const color = getFishSpeciesColor(species);
  // Issue #290: タッチターゲットサイズ拡大（44-56px、デフォルト48px）
  // Issue #298: ズームレベルに応じたサイズ調整
  const baseSize = fishSize ? Math.min(Math.max(fishSize / 8, 44), 56) : 48;
  const iconSize = getMarkerSizeForZoom(zoomLevel, baseSize);
  const fishIconUrl = createFishIconDataUri('white');

  // Issue #292: ARIA用のラベル生成
  const sizeLabel = fishSize ? `${fishSize}cm` : weight ? `${weight}g` : '';
  const ariaLabel = [species, location, sizeLabel].filter(Boolean).join('、');

  // Issue #295: 最近の釣果にはパルスアニメーションクラスを追加
  const recentClass = isRecent ? ' marker-recent' : '';

  // Google Maps 2024スタイル: ソフトシャドウ（2層）
  const primaryShadow = isDarkMode
    ? '0 2px 8px rgba(0,0,0,0.4), 0 8px 20px rgba(0,0,0,0.25)'
    : '0 2px 8px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1)';

  return L.divIcon({
    className: `custom-marker${isDarkMode ? ' dark-mode' : ''}`,
    html: `
      <div class="marker-wrapper${recentClass}"
           role="button"
           tabindex="0"
           aria-label="${ariaLabel}"
           data-marker-id="${species}">
        <div class="marker-pin" style="
          background: ${color};
          width: ${iconSize}px;
          height: ${iconSize}px;
          border-radius: 50%;
          box-shadow: ${primaryShadow};
          border: 3px solid rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        ">
          <img src="${fishIconUrl}" alt="" style="
            width: ${iconSize * 0.5}px;
            height: ${iconSize * 0.5}px;
            filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4));
          " />
        </div>
      </div>
    `,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
    popupAnchor: [0, -iconSize / 2 - 10],
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

  // 近隣レコード計算（スワイプナビゲーション用）
  const nearbyRecords = useMemo(() => {
    if (!selectedRecord || !selectedRecord.coordinates) return [];

    const recordsWithCoords = records.filter(r => r.coordinates && r.id !== selectedRecord.id);

    // 優先順位1: 同一釣り場（location名が完全一致）
    const sameLocation = recordsWithCoords.filter(
      r => r.location === selectedRecord.location
    );

    // 優先順位2: 近隣釣り場（距離5km以内）
    const nearby = recordsWithCoords.filter(r => {
      if (r.location === selectedRecord.location) return false; // 同一釣り場は除外
      const distance = haversineDistance(
        selectedRecord.coordinates!,
        r.coordinates!
      );
      return distance <= DEFAULT_SWIPE_CONFIG.NEARBY_DISTANCE_THRESHOLD;
    });

    // 同一釣り場 → 日付が近い順でソート
    sameLocation.sort((a, b) => b.date.getTime() - a.date.getTime());

    // 近隣釣り場 → 距離が近い順でソート
    nearby.sort((a, b) => {
      const distA = haversineDistance(selectedRecord.coordinates!, a.coordinates!);
      const distB = haversineDistance(selectedRecord.coordinates!, b.coordinates!);
      return distA - distB;
    });

    // 選択中のレコードを含めた配列を作成
    return [selectedRecord, ...sameLocation, ...nearby];
  }, [selectedRecord, records]);

  // 現在のインデックス（スワイプナビゲーション用）
  const currentNearbyIndex = useMemo(() => {
    if (!selectedRecord) return 0;
    return nearbyRecords.findIndex(r => r.id === selectedRecord.id);
  }, [selectedRecord, nearbyRecords]);

  // スワイプコールバック
  const handleMapSwipeLeft = useCallback(() => {
    if (currentNearbyIndex < nearbyRecords.length - 1) {
      setSelectedRecord(nearbyRecords[currentNearbyIndex + 1]);
    }
  }, [currentNearbyIndex, nearbyRecords]);

  const handleMapSwipeRight = useCallback(() => {
    if (currentNearbyIndex > 0) {
      setSelectedRecord(nearbyRecords[currentNearbyIndex - 1]);
    }
  }, [currentNearbyIndex, nearbyRecords]);

  // スワイプフック（MapPopup用）
  // Note: handlersは使用しない（useSwipe内でネイティブイベントリスナーを自動登録）
  const { ref: mapSwipeRef } = useSwipe<HTMLDivElement>(
    {
      threshold: DEFAULT_SWIPE_CONFIG.POPUP_THRESHOLD,
      velocityThreshold: DEFAULT_SWIPE_CONFIG.POPUP_VELOCITY_THRESHOLD,
      maxVerticalDeviation: DEFAULT_SWIPE_CONFIG.POPUP_MAX_VERTICAL_DEVIATION,
      edgeZone: DEFAULT_SWIPE_CONFIG.EDGE_ZONE,
      animationDuration: DEFAULT_SWIPE_CONFIG.POPUP_ANIMATION_DURATION,
      dampingFactor: DEFAULT_SWIPE_CONFIG.POPUP_DAMPING_FACTOR,
      disableLeft: currentNearbyIndex >= nearbyRecords.length - 1,
      disableRight: currentNearbyIndex <= 0,
    },
    {
      onSwipeLeft: handleMapSwipeLeft,
      onSwipeRight: handleMapSwipeRight,
    }
  );

  // Issue #296: ダークモード検出
  const isDarkMode = useDarkMode();

  // Issue #346: モバイル検出
  const isMobile = useIsMobile();

  // Issue #346: モバイルでサマリ表示時は他のパネルを非表示
  const shouldHideOnMobileSummary = isMobile && selectedRecord;

  // Issue #298: ズームレベル追跡
  const [zoomLevel, setZoomLevel] = useState(14);
  const handleZoomChange = useCallback((zoom: number) => {
    setZoomLevel(zoom);
  }, []);

  // Issue #297: キーボードナビゲーション用のフォーカスインデックス
  const [focusedMarkerIndex, setFocusedMarkerIndex] = useState(-1);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  // Issue #297: キーボードナビゲーション
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (recordsWithAdjustedCoordinates.length === 0) return;

    const { key } = event;

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      event.preventDefault();
      setFocusedMarkerIndex(prev => {
        const next = prev + 1;
        return next >= recordsWithAdjustedCoordinates.length ? 0 : next;
      });
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      event.preventDefault();
      setFocusedMarkerIndex(prev => {
        const next = prev - 1;
        return next < 0 ? recordsWithAdjustedCoordinates.length - 1 : next;
      });
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (focusedMarkerIndex >= 0 && focusedMarkerIndex < recordsWithAdjustedCoordinates.length) {
        const record = recordsWithAdjustedCoordinates[focusedMarkerIndex];
        setSelectedRecord(record);
        setFlyToCoords({
          latitude: record.adjustedLat,
          longitude: record.adjustedLng,
        });
      }
    } else if (key === 'Escape') {
      setSelectedRecord(null);
      setFocusedMarkerIndex(-1);
    }
  }, [recordsWithAdjustedCoordinates, focusedMarkerIndex]);

  // Issue #297: フォーカスされたマーカーに移動
  useEffect(() => {
    if (focusedMarkerIndex >= 0 && focusedMarkerIndex < recordsWithAdjustedCoordinates.length) {
      const record = recordsWithAdjustedCoordinates[focusedMarkerIndex];
      setFlyToCoords({
        latitude: record.adjustedLat,
        longitude: record.adjustedLng,
      });
    }
  }, [focusedMarkerIndex, recordsWithAdjustedCoordinates]);

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
        background: `linear-gradient(135deg, ${'var(--color-surface-secondary)'} 0%, ${'var(--color-surface-tertiary)'} 100%)`,
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
          color: 'var(--color-text-primary)',
        }}>
          GPS情報付きの記録がありません
        </h3>
        <p style={{
          ...textStyles.body.large,
          color: 'var(--color-text-secondary)',
          maxWidth: '500px',
        }}>
          位置情報ONで撮影した写真をアップロードすると、<br />
          ここに釣り場所が自動表示されます
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="application"
      aria-label="釣果マップ。矢印キーでマーカー間を移動、Enterで選択"
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--color-background-primary)',
        outline: 'none',
      }}
    >
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
          {/* マップタイルは常に明るいOSM Japan（可読性重視） */}
          {/* Issue #296: ダークモードはUIオーバーレイのみ対応 */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png"
            maxZoom={18}
          />

          {/* Issue #298: ズームレベル追跡 */}
          <ZoomTracker onZoomChange={handleZoomChange} />

          <AutoBounds records={recordsWithCoordinates} />

          <ResetView records={recordsWithCoordinates} trigger={resetTrigger} />

          {selectedRecord && selectedRecord.coordinates && !flyToCoords && (
            <FlyToLocation coordinates={selectedRecord.coordinates} />
          )}

          {flyToCoords && (
            <FlyToLocation coordinates={flyToCoords} />
          )}

          {/* Issue #294: クラスタリング実装 */}
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={60}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            iconCreateFunction={(cluster: L.MarkerCluster) => {
              const count = cluster.getChildCount();
              const size = count < 10 ? 44 : count < 50 ? 52 : 60;
              // Issue #296: ダークモード対応のクラスタスタイル
              const clusterBg = isDarkMode
                ? `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.primary[500]} 100%)`
                : `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 100%)`;
              const clusterBorder = isDarkMode ? 'rgba(255,255,255,0.5)' : 'white';
              const clusterShadow = isDarkMode
                ? `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${colors.primary[400]}66`
                : '0 4px 16px rgba(0,0,0,0.3)';
              return L.divIcon({
                html: `
                  <div class="cluster-marker" style="
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    background: ${clusterBg};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: ${size / 3}px;
                    box-shadow: ${clusterShadow};
                    border: 3px solid ${clusterBorder};
                  ">
                    ${count}
                  </div>
                `,
                className: 'custom-cluster',
                iconSize: L.point(size, size),
              });
            }}
          >
            {recordsWithAdjustedCoordinates.map((record, index) => (
              <Marker
                key={`${record.id}-marker-v3`}
                position={[record.adjustedLat, record.adjustedLng]}
                icon={createCustomIcon({
                  species: record.fishSpecies,
                  size: record.size,
                  weight: record.weight,
                  location: record.location,
                  isRecent: isRecentCatch(record.date), // Issue #295
                  zoomLevel, // Issue #298
                  isDarkMode, // Issue #296
                })}
                eventHandlers={{
                  click: () => {
                    setSelectedRecord(record);
                    setFocusedMarkerIndex(index); // Issue #297
                    // 地図をその位置に移動
                    setFlyToCoords({
                      latitude: record.adjustedLat,
                      longitude: record.adjustedLng,
                    });
                  },
                }}
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* 選択された釣果のサマリパネル（モバイル: Bottom Sheet、デスクトップ: 上部中央） */}
        {selectedRecord && (
          <div
            ref={isMobile ? mapSwipeRef : undefined}
            // Note: swipeHandlersは削除（useSwipe内でネイティブイベントリスナーを自動登録）
            style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              borderRadius: '16px',
              maxWidth: isMobile ? '90%' : '400px',
              minWidth: isMobile ? '280px' : '320px',
              zIndex: 1001,
              backgroundColor: 'var(--color-panel-bg-solid)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              padding: '16px 20px',
              border: `2px solid ${getFishSpeciesColor(selectedRecord.fishSpecies)}`,
              // iOS Safari対応: pan-x pan-yで水平・垂直両方のタッチ操作を有効化
              touchAction: isMobile ? 'pan-x pan-y' : 'auto',
            }}
          >
            {/* 閉じるボタン - iOS HIG準拠 44x44px */}
            <button
              onClick={() => setSelectedRecord(null)}
              aria-label="サマリパネルを閉じる"
              className="hover-map-close-btn"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--color-surface-tertiary)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <Icon icon={X} size={20} decorative />
            </button>

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
                color: 'var(--color-text-primary)',
              }}>
                {selectedRecord.fishSpecies}
              </h4>
            </div>

            {/* 情報グリッド - コンパクト化 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '6px 10px', // 8px 12px → 6px 10px: コンパクト化
              marginBottom: '12px', // 16px → 12px
            }}>
              <Icon icon={Calendar} size={16} color="secondary" decorative />
              <span style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                fontWeight: '500',
              }}>
                {formatDate(selectedRecord.date)}
              </span>

              <Icon icon={MapPin} size={16} color="secondary" decorative />
              <span style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                fontWeight: '500',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {selectedRecord.location}
              </span>

              {(selectedRecord.size || selectedRecord.weight) && (
                <>
                  <Icon icon={Ruler} size={16} color="secondary" decorative />
                  <span style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-text-primary)',
                    fontWeight: '600',
                  }}>
                    {selectedRecord.size && selectedRecord.weight
                      ? `${selectedRecord.size}cm / ${selectedRecord.weight}g`
                      : selectedRecord.size
                        ? `${selectedRecord.size}cm`
                        : `${selectedRecord.weight}g`
                    }
                  </span>
                </>
              )}
            </div>

            {/* アクションボタン */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  onRecordClick?.(selectedRecord);
                  setSelectedRecord(null);
                }}
                className="hover-map-detail-btn"
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
              >
                詳細を見る
              </button>

              {/* Googleマップで表示ボタン */}
              {selectedRecord.coordinates && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const { latitude, longitude } = selectedRecord.coordinates!;
                    window.open(
                      `https://www.google.com/maps?q=${latitude},${longitude}`,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }}
                  className="hover-map-google-btn"
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'transparent',
                    color: '#22c55e',
                    border: '2px solid #22c55e',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Globe size={16} />
                  Googleマップで表示
                </button>
              )}
            </div>

            {/* スワイプインジケーター（モバイルで複数レコードがある場合のみ表示） */}
            {isMobile && nearbyRecords.length > 1 && (
              <SwipeIndicator
                currentIndex={currentNearbyIndex}
                totalCount={nearbyRecords.length}
                onDotClick={(index) => {
                  setSelectedRecord(nearbyRecords[index]);
                }}
                style={{
                  marginTop: '12px',
                  justifyContent: 'center',
                }}
              />
            )}

            {/* スワイプヒント（モバイルで複数レコードがある場合、初回のみ表示） */}
            {isMobile && nearbyRecords.length > 1 && (
              <SwipeHint
                screenName="FishingMapPopup"
                text="← 近隣の記録をスワイプ →"
                style={{
                  position: 'absolute',
                  bottom: '-48px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
            )}
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
            className="hover-map-reset-btn"
            style={{
              width: '44px',
              height: '44px',
              backgroundColor: 'var(--color-panel-bg)',
              backdropFilter: 'blur(10px)',
              color: 'var(--color-text-primary)',
              border: `1px solid ${'var(--color-border-light)'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
            }}
            title="全体表示に戻す"
          >
            <Icon icon={Maximize2} size={20} decorative />
          </button>

          {/* 統計情報カード - モバイルでサマリ表示時は非表示 */}
          {!shouldHideOnMobileSummary && (
          <div style={{
            backgroundColor: 'var(--color-panel-bg)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
            padding: '12px',
            border: `1px solid ${'var(--color-border-light)'}`,
            minWidth: isMobile ? '120px' : '140px',
          }}>
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--color-text-tertiary)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600',
            }}>
              統計
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon icon={BarChart3} size={14} color="secondary" decorative /> 記録数
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-accent-text)' }}>
                  {statistics.totalRecords}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon icon={MapPin} size={14} color="secondary" decorative /> 釣り場
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-accent-text)' }}>
                  {statistics.uniqueLocations}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon icon={Fish} size={14} color="secondary" decorative /> 魚種
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-accent-text)' }}>
                  {statistics.uniqueSpecies}
                </span>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* コンパクトリスト（下部オーバーレイ） - モバイルでサマリ表示時は非表示 */}
        {!shouldHideOnMobileSummary && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'var(--color-panel-bg-solid)',
          borderTop: `1px solid ${'var(--color-border-light)'}`,
          maxHeight: '180px',
          overflowY: 'auto',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.15)',
        }}>
          <div style={{
            padding: '12px 16px 8px 16px',
            borderBottom: `1px solid ${'var(--color-border-light)'}`,
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--color-panel-bg-solid)',
            zIndex: 1,
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: '700',
              color: 'var(--color-text-primary)',
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
                className={selectedRecord?.id !== record.id ? 'hover-map-record-item' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  marginBottom: '6px',
                  borderRadius: '10px',
                  backgroundColor: selectedRecord?.id === record.id ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
                  border: selectedRecord?.id === record.id ? `2px solid rgba(96, 165, 250, 0.5)` : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
                    color: 'var(--color-text-primary)',
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {record.fishSpecies}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-tertiary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {record.location}
                  </div>
                </div>
                {(record.size || record.weight) && (
                  <div style={{
                    backgroundColor: 'rgba(96, 165, 250, 0.2)',
                    color: '#60a5fa',
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
        )}
      </div>

      {/* CSSアニメーション */}
      <style>{`
        /* Leafletのデフォルトスタイルをリセット（背景・ボーダーのみ） */
        .leaflet-marker-icon.custom-marker {
          background: none !important;
          border: none !important;
          overflow: visible !important;
        }

        .custom-marker {
          background: none !important;
          border: none !important;
        }

        /* marker-pin を強制的に正円にする */
        .marker-pin {
          width: 48px !important;
          height: 48px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          aspect-ratio: 1 / 1 !important;
          border-radius: 50% !important;
        }

        /* cluster-marker を強制的に正円にする */
        .cluster-marker {
          width: 44px !important;
          height: 44px !important;
          min-width: 44px !important;
          min-height: 44px !important;
          max-width: 44px !important;
          max-height: 44px !important;
          aspect-ratio: 1 / 1 !important;
          border-radius: 50% !important;
          box-sizing: border-box !important;
        }

        /* クラスターアイコンのLeafletコンテナをリセット */
        .leaflet-marker-icon.custom-cluster {
          background: none !important;
          border: none !important;
          overflow: visible !important;
          width: 44px !important;
          height: 44px !important;
        }

        /* MarkerClusterGroupのデフォルトスタイルを完全にリセット */
        .marker-cluster,
        .marker-cluster-small,
        .marker-cluster-medium,
        .marker-cluster-large {
          background: none !important;
          border: none !important;
        }

        .marker-cluster div,
        .marker-cluster-small div,
        .marker-cluster-medium div,
        .marker-cluster-large div {
          background: none !important;
          border: none !important;
        }

        /* Google Maps 2024スタイル: 緩やかなフロート */
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        /* 最近の釣果用パルスアニメーション */
        @keyframes modernPulse {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(0,0,0,0.15),
                        0 8px 16px rgba(0,0,0,0.1),
                        0 0 0 0 rgba(26, 115, 232, 0.5);
          }
          50% {
            box-shadow: 0 2px 8px rgba(0,0,0,0.15),
                        0 8px 16px rgba(0,0,0,0.1),
                        0 0 0 12px rgba(26, 115, 232, 0);
          }
        }

        .marker-wrapper {
          animation: gentleFloat 4s ease-in-out infinite;
        }

        /* 最近の釣果（1週間以内）にパルスアニメーション */
        .marker-wrapper.marker-recent .marker-pin {
          animation: modernPulse 2.5s ease-in-out infinite;
        }

        .marker-wrapper:hover .marker-pin {
          transform: scale(1.12);
          box-shadow: 0 4px 12px rgba(0,0,0,0.18), 0 12px 24px rgba(0,0,0,0.12);
        }

        .marker-wrapper:active .marker-pin {
          transform: scale(0.95);
        }

        .marker-wrapper:focus .marker-pin {
          outline: 3px solid #1A73E8;
          outline-offset: 2px;
        }

        /* キーボードナビゲーション用フォーカススタイル */
        .marker-wrapper:focus-visible .marker-pin {
          outline: 4px solid #FFD700;
          outline-offset: 4px;
          transform: scale(1.15);
        }

        @media (prefers-color-scheme: dark) {
          .marker-wrapper .marker-pin {
            box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 8px 20px rgba(0,0,0,0.25);
          }

          .marker-wrapper:focus .marker-pin {
            outline-color: #4DA3FF;
          }
        }

        /* Issue #294: クラスタマーカーのスタイル */
        .custom-cluster {
          background: transparent !important;
        }

        .cluster-marker {
          transition: transform 0.2s ease-out;
        }

        .cluster-marker:hover {
          transform: scale(1.1);
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
          background: ${'var(--color-border-medium)'};
          border-radius: 3px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: ${'var(--color-border-dark)'};
        }
      `}</style>
    </div>
  );
};
