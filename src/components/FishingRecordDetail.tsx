// 釣果記録詳細コンポーネント

import React, { useState, useEffect, useMemo } from 'react';
// import { textStyles, typography } from '../theme/typography';
import type { FishingRecord } from '../types';
import type { TideChartData } from './chart/tide/types';
// TideIntegration は Issue #322 で完全削除されました
// 潮汐情報は PhotoHeroCard のオーバーレイグラフで表示
import { logger } from '../lib/errors/logger';
import { Icon } from './ui/Icon';
import { PhotoHeroCard } from './record/PhotoHeroCard';
import {
  Fish,
  MapPin,
  MessageCircle,
  Map,
  Globe,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface FishingRecordDetailProps {
  record: FishingRecord;
  onClose?: () => void;
  onEdit?: (record: FishingRecord) => void;
  onDelete?: (record: FishingRecord) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  photoUrl?: string;
  loading?: boolean;
  onNavigateToMap?: (record: FishingRecord) => void;
}

/**
 * Calculate direct tide level using harmonic analysis
 * (Copied from TideIntegration for overlay calculation)
 */
const calculateDirectTideLevel = (time: Date, coordinates: { latitude: number; longitude: number }): number => {
  const coordinateVariation = {
    latitudeFactor: 1 + (coordinates.latitude - 35) * 0.1,
    longitudeFactor: 1 + (coordinates.longitude - 135) * 0.05
  };

  const dayOfYear = Math.floor((time.getTime() - new Date(time.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const seasonalAngle = ((dayOfYear - 80) / 365) * 360;
  const latitudeEffect = Math.abs(coordinates.latitude) / 90;
  const baseSeasonalFactor = Math.cos(seasonalAngle * Math.PI / 180);

  const seasonalVariation = {
    m2Factor: 1.0 + (baseSeasonalFactor * 0.4 * latitudeEffect),
    s2Factor: 1.0 + (Math.cos((seasonalAngle + 45) * Math.PI / 180) * 0.5 * latitudeEffect),
    k1Factor: 1.0 + (Math.sin(seasonalAngle * Math.PI / 180) * 0.6 * latitudeEffect),
    o1Factor: 1.0 + (Math.sin((seasonalAngle + 90) * Math.PI / 180) * 0.45 * latitudeEffect)
  };

  const J2000_EPOCH_MS = new Date('2000-01-01T12:00:00Z').getTime();
  const hoursFromJ2000 = (time.getTime() - J2000_EPOCH_MS) / (1000 * 60 * 60);

  let tideLevel = 0;

  // M2 (12.42h period)
  const m2Frequency = 28.984104;
  const m2Amplitude = 1.0 * coordinateVariation.latitudeFactor * seasonalVariation.m2Factor;
  const m2Phase = 0 + coordinateVariation.longitudeFactor * 15;
  tideLevel += m2Amplitude * Math.cos((m2Frequency * hoursFromJ2000 + m2Phase) * Math.PI / 180);

  // S2 (12h period)
  const s2Frequency = 30.0;
  const s2Amplitude = 0.5 * coordinateVariation.longitudeFactor * seasonalVariation.s2Factor;
  const s2Phase = 0 + coordinateVariation.latitudeFactor * 20;
  tideLevel += s2Amplitude * Math.cos((s2Frequency * hoursFromJ2000 + s2Phase) * Math.PI / 180);

  // K1 (23.93h period)
  const k1Frequency = 15.041069;
  const k1Amplitude = 0.3 * coordinateVariation.latitudeFactor * seasonalVariation.k1Factor;
  const k1Phase = coordinateVariation.latitudeFactor * 80 + coordinateVariation.longitudeFactor * 25;
  tideLevel += k1Amplitude * Math.cos((k1Frequency * hoursFromJ2000 + k1Phase) * Math.PI / 180);

  // O1 (25.82h period)
  const o1Frequency = 13.943035;
  const o1Amplitude = 0.25 * coordinateVariation.longitudeFactor * seasonalVariation.o1Factor;
  const o1Phase = coordinateVariation.longitudeFactor * 120 + coordinateVariation.latitudeFactor * 35;
  tideLevel += o1Amplitude * Math.cos((o1Frequency * hoursFromJ2000 + o1Phase) * Math.PI / 180);

  return 100 + tideLevel * 30;
};

export const FishingRecordDetail: React.FC<FishingRecordDetailProps> = ({
  record,
  onClose,
  onEdit,
  onDelete,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  photoUrl,
  loading = false,
  onNavigateToMap
}) => {
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tideChartData, setTideChartData] = useState<TideChartData[] | null>(null);
  const [tideLoading, setTideLoading] = useState(false);

  // Calculate tide data for overlay when coordinates exist
  useEffect(() => {
    if (!record.coordinates) {
      setTideChartData(null);
      return;
    }

    const calculateTideForOverlay = async () => {
      setTideLoading(true);
      try {
        const fishingDate = new Date(record.date);
        const startTime = new Date(
          fishingDate.getFullYear(),
          fishingDate.getMonth(),
          fishingDate.getDate(),
          0, 0, 0, 0
        );
        const endTime = new Date(
          fishingDate.getFullYear(),
          fishingDate.getMonth(),
          fishingDate.getDate() + 1,
          0, 0, 0, 0
        );

        // Generate 24-hour data points (15-minute intervals)
        const points: TideChartData[] = [];
        for (let time = startTime.getTime(); time < endTime.getTime(); time += 15 * 60 * 1000) {
          const currentTime = new Date(time);
          const level = calculateDirectTideLevel(currentTime, record.coordinates!);
          const hours = String(currentTime.getHours()).padStart(2, '0');
          const minutes = String(currentTime.getMinutes()).padStart(2, '0');
          points.push({
            time: `${hours}:${minutes}`,
            tide: Math.round(level)
          });
        }

        setTideChartData(points);
      } catch (error) {
        logger.error('Tide overlay calculation error', { error });
        setTideChartData(null);
      } finally {
        setTideLoading(false);
      }
    };

    calculateTideForOverlay();
  }, [record.date, record.coordinates]);

  // Format fishing time for chart marker
  const fishingTimeForChart = useMemo(() => {
    const hours = record.date.getHours();
    const minutes = record.date.getMinutes();
    // Snap to nearest 15-minute interval
    const snappedMinutes = Math.round(minutes / 15) * 15;
    const finalMinutes = snappedMinutes === 60 ? 0 : snappedMinutes;
    const finalHours = snappedMinutes === 60 ? (hours + 1) % 24 : hours;
    return `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
  }, [record.date]);

  const handleEdit = () => {
    onEdit?.(record);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.(record);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (photoExpanded) {
        setPhotoExpanded(false);
      } else if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
      } else {
        onClose?.();
      }
    } else if (e.key === 'ArrowLeft' && hasPrevious) {
      onPrevious?.();
    } else if (e.key === 'ArrowRight' && hasNext) {
      onNext?.();
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderRadius: '8px',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          border: `1px solid ${'var(--color-border-light)'}`,
          color: 'var(--color-text-primary)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: `3px solid ${'var(--color-surface-secondary)'}`,
            borderTop: '3px solid #60a5fa',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span>読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* メインダイアログ */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose?.();
          }
        }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div
          style={{
            backgroundColor: 'var(--color-surface-primary)',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: `1px solid ${'var(--color-border-light)'}`
          }}
          role="dialog"
          aria-labelledby="record-title"
          aria-describedby="record-content"
        >
          {/* ヘッダー */}
          <div style={{
            padding: '1.5rem',
            borderBottom: `1px solid ${'var(--color-border-light)'}`,
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--color-surface-primary)',
            borderRadius: '12px 12px 0 0'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem'
            }}>
              <h2
                id="record-title"
                style={{
                  margin: 0,
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  color: 'var(--color-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Icon icon={Fish} size={24} decorative /> {record.fishSpecies}
              </h2>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  padding: '0.5rem',
                  borderRadius: '4px'
                }}
                aria-label="詳細を閉じる"
                title="閉じる"
              >
                <Icon icon={X} size={20} decorative />
              </button>
            </div>

            {/* ナビゲーション */}
            {(hasPrevious || hasNext) && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <button
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: hasPrevious ? '#60a5fa' : 'var(--color-surface-secondary)',
                    color: hasPrevious ? 'white' : 'var(--color-text-tertiary)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: hasPrevious ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem'
                  }}
                  aria-label="前の記録"
                >
                  <Icon icon={ChevronLeft} size={16} decorative /> 前へ
                </button>

                <span style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)'
                }}>
                  記録詳細
                </span>

                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: hasNext ? '#60a5fa' : 'var(--color-surface-secondary)',
                    color: hasNext ? 'white' : 'var(--color-text-tertiary)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: hasNext ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem'
                  }}
                  aria-label="次の記録"
                >
                  次へ <Icon icon={ChevronRight} size={16} decorative />
                </button>
              </div>
            )}
          </div>

          {/* コンテンツ */}
          <div id="record-content" style={{ padding: '1.5rem' }}>
            {/* 写真表示 - PhotoHeroCardを使用 */}
            {/* タップアクション: 座標があれば地図へ、なければ写真があれば拡大表示 */}
            {/* 詳細画面では実際の潮汐グラフをオーバーレイ表示 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <PhotoHeroCard
                record={record}
                onClick={() => {
                  if (record.coordinates && onNavigateToMap) {
                    onNavigateToMap(record);
                    onClose?.();
                  } else if (photoUrl) {
                    setPhotoExpanded(true);
                  }
                }}
                tideChartData={tideChartData ?? undefined}
                fishingTime={fishingTimeForChart}
                tideLoading={tideLoading}
              />
            </div>

            {/* 場所情報 */}
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--color-surface-secondary)',
              borderRadius: '8px',
              border: `1px solid ${'var(--color-border-light)'}`,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{
                margin: '0 0 0.75rem 0',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <Icon icon={MapPin} size={14} decorative /> 釣り場
              </h4>
              <p style={{
                margin: '0 0 1rem 0',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: 'var(--color-text-primary)'
              }}>
                {record.location}
              </p>

              {record.coordinates && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    <Icon icon={MapPin} size={14} decorative /> 緯度: {record.coordinates.latitude.toFixed(6)}, 経度: {record.coordinates.longitude.toFixed(6)}
                    {record.coordinates.accuracy && <span> (精度: ±{Math.round(record.coordinates.accuracy)}m)</span>}
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {onNavigateToMap && (
                      <button
                        onClick={() => {
                          onNavigateToMap(record);
                          onClose?.();
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#60a5fa',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Icon icon={Map} size={16} decorative /> 地図で表示
                      </button>
                    )}
                    <a
                      href={`https://maps.google.com/?q=${record.coordinates.latitude},${record.coordinates.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#34A853',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <Icon icon={Globe} size={16} decorative /> Googleマップで表示
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* メモ */}
            {record.notes && (
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(251, 191, 36, 0.15)',
                borderRadius: '8px',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.875rem',
                  color: '#fbbf24',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <Icon icon={MessageCircle} size={14} decorative /> メモ
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--color-text-primary)'
                }}>
                  {record.notes}
                </p>
              </div>
            )}

            {/* 潮汐情報は PhotoHeroCard のオーバーレイグラフで表示 */}
            {/* TideIntegration UI は Issue #322 で削除されました */}

            {/* メタデータ */}
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--color-surface-secondary)',
              borderRadius: '8px',
              border: `1px solid ${'var(--color-border-light)'}`,
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              marginTop: '1.5rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '0.5rem'
              }}>
                <div>
                  <strong>作成:</strong> {record.createdAt.toLocaleString('ja-JP')}
                </div>
                <div>
                  <strong>更新:</strong> {record.updatedAt.toLocaleString('ja-JP')}
                </div>
                <div>
                  <strong>ID:</strong> {record.id.slice(0, 8)}...
                </div>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div style={{
            padding: '1.5rem',
            borderTop: `1px solid ${'var(--color-border-light)'}`,
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'var(--color-surface-primary)',
            borderRadius: '0 0 12px 12px'
          }}>
            {showDeleteConfirm ? (
              <>
                <span style={{
                  flex: 1,
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  本当に削除しますか？
                </span>
                <button
                  onClick={handleCancelDelete}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  削除する
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Icon icon={Edit} size={16} decorative /> 編集
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Icon icon={Trash2} size={16} decorative /> 削除
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 写真拡大表示 */}
      {photoExpanded && photoUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '2rem'
          }}
          onClick={() => setPhotoExpanded(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setPhotoExpanded(false);
            }
          }}
          tabIndex={-1}
        >
          <img
            src={photoUrl}
            alt={`${record.fishSpecies}の拡大写真`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPhotoExpanded(false)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="写真を閉じる"
          >
            <Icon icon={X} size={20} decorative />
          </button>
        </div>
      )}

      {/* CSS アニメーション */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ホバーエフェクト */
        button:not(:disabled):hover {
          filter: brightness(1.1);
        }

        button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          .record-detail-dialog {
            margin: 0.5rem;
            max-height: 95vh;
          }

          .record-detail-content {
            padding: 1rem;
          }

          .record-detail-actions {
            flex-direction: column;
          }

          .record-detail-actions button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};