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
  MessageCircle,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
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
  const [showContextMenu, setShowContextMenu] = useState(false);
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
            position: 'relative',
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
          aria-label={`${record.fishSpecies}の詳細`}
        >
          {/* 右上のアクションボタン群 */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '8px',
            zIndex: 10
          }}>
            {/* コンテキストメニューボタン */}
            {(onEdit || onDelete) && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContextMenu(!showContextMenu);
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(8px)',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                  }}
                  aria-label="アクションメニュー"
                  title="メニュー"
                >
                  <Icon icon={MoreVertical} size={18} decorative />
                </button>

                {/* ドロップダウンメニュー */}
                {showContextMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '40px',
                      right: '0',
                      background: 'rgba(30, 30, 30, 0.95)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: '140px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {onEdit && (
                      <button
                        onClick={() => {
                          setShowContextMenu(false);
                          onEdit(record);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s ease',
                          minHeight: '44px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Icon icon={Edit} size={16} decorative />
                        <span>編集</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          setShowContextMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s ease',
                          minHeight: '44px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Icon icon={Trash2} size={16} decorative />
                        <span>削除</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 閉じるボタン */}
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(8px)',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
              }}
              aria-label="詳細を閉じる"
              title="閉じる"
            >
              <Icon icon={X} size={18} decorative />
            </button>
          </div>

          {/* ナビゲーション（前後ボタン） */}
          {(hasPrevious || hasNext) && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              transform: 'translateY(-50%)',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 8px',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                style={{
                  width: '36px',
                  height: '36px',
                  background: hasPrevious ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: hasPrevious ? 'pointer' : 'not-allowed',
                  color: hasPrevious ? 'white' : 'rgba(255,255,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto'
                }}
                aria-label="前の記録"
              >
                <Icon icon={ChevronLeft} size={20} decorative />
              </button>

              <button
                onClick={onNext}
                disabled={!hasNext}
                style={{
                  width: '36px',
                  height: '36px',
                  background: hasNext ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: hasNext ? 'pointer' : 'not-allowed',
                  color: hasNext ? 'white' : 'rgba(255,255,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto'
                }}
                aria-label="次の記録"
              >
                <Icon icon={ChevronRight} size={20} decorative />
              </button>
            </div>
          )}

          {/* コンテンツ */}
          <div id="record-content">
            {/* 写真表示 - PhotoHeroCardを使用 */}
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

            {/* メモ */}
            {record.notes && (
              <div style={{
                margin: '1rem',
                padding: '1rem',
                backgroundColor: 'rgba(251, 191, 36, 0.15)',
                borderRadius: '8px',
                border: '1px solid rgba(251, 191, 36, 0.3)'
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

          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancelDelete();
            }
          }}
        >
          <div
            style={{
              background: 'rgba(30, 30, 30, 0.98)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '320px',
              width: '100%',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            role="alertdialog"
            aria-labelledby="delete-confirm-title"
            aria-describedby="delete-confirm-description"
          >
            <h3
              id="delete-confirm-title"
              style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: 'white',
                textAlign: 'center'
              }}
            >
              記録を削除
            </h3>
            <p
              id="delete-confirm-description"
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                lineHeight: 1.5
              }}
            >
              この釣果記録を削除しますか？<br />
              この操作は取り消せません。
            </p>
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'white',
                  minHeight: '48px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'white',
                  minHeight: '48px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

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