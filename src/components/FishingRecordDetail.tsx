// 釣果記録詳細コンポーネント

import React, { useState } from 'react';
// import { textStyles, typography } from '../theme/typography';
import type { FishingRecord } from '../types';
import { TideIntegration } from './TideIntegration';
import { logger } from '../lib/errors/logger';

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
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007bff',
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
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}
          role="dialog"
          aria-labelledby="record-title"
          aria-describedby="record-content"
        >
          {/* ヘッダー */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #dee2e6',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
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
                  color: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🐟 {record.fishSpecies}
              </h2>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '0.5rem',
                  borderRadius: '4px'
                }}
                aria-label="詳細を閉じる"
                title="閉じる"
              >
                ✕
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
                    backgroundColor: hasPrevious ? '#007bff' : '#e9ecef',
                    color: hasPrevious ? 'white' : '#6c757d',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: hasPrevious ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem'
                  }}
                  aria-label="前の記録"
                >
                  ← 前へ
                </button>

                <span style={{
                  fontSize: '0.875rem',
                  color: '#6c757d'
                }}>
                  記録詳細
                </span>

                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: hasNext ? '#007bff' : '#e9ecef',
                    color: hasNext ? 'white' : '#6c757d',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: hasNext ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem'
                  }}
                  aria-label="次の記録"
                >
                  次へ →
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
                border: '1px solid #dee2e6',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.875rem',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  📅 釣行日
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: 'bold'
                }}>
                  {formatDate(record.date)}
                </p>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.875rem',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  🐟 魚種
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: 'bold'
                }}>
                  {record.fishSpecies}
                </p>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.875rem',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  📏 サイズ
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: record.size ? '#28a745' : '#6c757d'
                }}>
                  {formatSize(record.size)}
                </p>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.875rem',
                  color: '#6c757d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ⚖️ 重量
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: record.weight ? '#28a745' : '#6c757d'
                }}>
                  {formatWeight(record.weight)}
                </p>
              </div>
            </div>

            {/* 場所情報 */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{
                margin: '0 0 0.75rem 0',
                fontSize: '0.875rem',
                color: '#6c757d',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📍 釣り場
              </h4>
              <p style={{
                margin: '0 0 1rem 0',
                fontSize: '1.125rem',
                fontWeight: 'bold'
              }}>
                {record.location}
              </p>

              {record.coordinates && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                    📍 緯度: {record.coordinates.latitude.toFixed(6)}, 経度: {record.coordinates.longitude.toFixed(6)}
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
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        🗺️ 地図で表示
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
                      🌐 Googleマップで表示
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* メモ */}
            {record.notes && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
                border: '1px solid #ffeaa7',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.875rem',
                  color: '#856404',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  💭 メモ
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
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
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              fontSize: '0.875rem',
              color: '#6c757d',
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
            borderTop: '1px solid #dee2e6',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'white',
            borderRadius: '0 0 12px 12px'
          }}>
            {showDeleteConfirm ? (
              <>
                <span style={{
                  flex: 1,
                  color: '#dc3545',
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
                  ✏️ 編集
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
                  🗑️ 削除
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
            ✕
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