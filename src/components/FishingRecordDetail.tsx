// 釣果記録詳細コンポーネント

import React, { useState } from 'react';
// import { textStyles, typography } from '../theme/typography';
import type { FishingRecord } from '../types';
import { TideIntegration } from './TideIntegration';
import { logger } from '../lib/errors/logger';
import { Icon } from './ui/Icon';
import {
  Fish,
  Calendar,
  Ruler,
  Scale,
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatSize = (size?: number) => {
    if (size === undefined || size === null) return '記録なし';
    return `${size}cm`;
  };

  const formatWeight = (weight?: number) => {
    if (weight === undefined || weight === null) return '記録なし';
    return `${weight}g`;
  };


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
            {/* 写真表示 */}
            {photoUrl && !loading && (
              <div style={{
                marginBottom: '1.5rem',
                borderRadius: '8px',
                overflow: 'hidden',
                border: `1px solid ${'var(--color-border-light)'}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}>
                <img
                  src={photoUrl}
                  alt={`${record.fishSpecies}の写真`}
                  onClick={() => setPhotoExpanded(true)}
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    display: 'block',
                    cursor: 'pointer',
                  }}
                />
              </div>
            )}

            {/* 基本情報 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--color-surface-secondary)',
                borderRadius: '8px',
                border: `1px solid ${'var(--color-border-light)'}`
              }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <Icon icon={Calendar} size={14} decorative /> 釣行日
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  color: 'var(--color-text-primary)'
                }}>
                  {formatDate(record.date)}
                </p>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--color-surface-secondary)',
                borderRadius: '8px',
                border: `1px solid ${'var(--color-border-light)'}`
              }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <Icon icon={Fish} size={14} decorative /> 魚種
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  color: 'var(--color-text-primary)'
                }}>
                  {record.fishSpecies}
                </p>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--color-surface-secondary)',
                borderRadius: '8px',
                border: `1px solid ${'var(--color-border-light)'}`
              }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <Icon icon={Ruler} size={14} decorative /> サイズ
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: record.size ? '#34d399' : 'var(--color-text-tertiary)'
                }}>
                  {formatSize(record.size)}
                </p>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--color-surface-secondary)',
                borderRadius: '8px',
                border: `1px solid ${'var(--color-border-light)'}`
              }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <Icon icon={Scale} size={14} decorative /> 重量
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: record.weight ? '#34d399' : 'var(--color-text-tertiary)'
                }}>
                  {formatWeight(record.weight)}
                </p>
              </div>
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

            {/* 潮汐情報統合セクション */}
            <TideIntegration
              fishingRecord={record}
              onCalculateTide={async (coordinates, date) => {
                try {
                  const { TideCalculationService } = await import('../services/tide/TideCalculationService');
                  const tideService = new TideCalculationService();

                  // サービス初期化
                  await tideService.initialize();

                  // ヘルスチェックで正常性確認
                  const health = await tideService.healthCheck();
                  if (health.status !== 'healthy') {
                    throw new Error(`潮汐サービス異常: ${health.message}`);
                  }

                  // 実際の潮汐計算実行
                  const result = await tideService.calculateTideInfo(coordinates, date);

                  return result;

                } catch (error) {
                  logger.error('実データ潮汐計算失敗', {
                    recordId: record.id.slice(0, 8),
                    error: error,
                    coordinates,
                    date: date.toISOString()
                  });

                  // 実データ処理失敗時はエラーを投げる（モックには頼らない）
                  throw new Error(`潮汐計算システムエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
                }
              }}
            />

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