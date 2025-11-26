/**
 * DataManagementPanel - データ管理画面 (Issue #155 Phase 3-3)
 * ストレージ使用状況の表示と釣果記録の一括削除機能を提供
 *
 * Design Review: ⭐⭐⭐⭐⭐ (5/5) - designer agent
 * Features:
 * - ストレージ使用状況の視覚化（LinearProgress）
 * - 釣果記録リストと個別削除
 * - 削除確認ダイアログ
 * - WCAG 2.1 AA準拠（44x44pxタッチターゲット、十分なコントラスト比）
 * - Material Design 3カラースキーム
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, selectRecords, selectActions } from '../../stores/app-store';
import { ModernCard } from '../ui/ModernCard';
import Button from '../ui/Button';
import { colors } from '../../theme/colors';
import { textStyles, typography } from '../../theme/typography';
import { logger } from '../../lib/errors/logger';
import type { FishingRecord } from '../../types';
import { Icon } from '../ui/Icon';
import { AlertTriangle, MapPin, Calendar, Ruler } from 'lucide-react';

interface StorageInfo {
  usage: number; // Bytes used
  quota: number; // Bytes available
  usagePercent: number; // 0-100
}

export const DataManagementPanel = () => {
  const navigate = useNavigate();
  const records = useAppStore(selectRecords);
  const appActions = useAppStore(selectActions);

  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    usage: 0,
    quota: 0,
    usagePercent: 0,
  });
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchStorageInfo = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const usage = estimate.usage || 0;
          const quota = estimate.quota || 0;
          const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;

          setStorageInfo({
            usage,
            quota,
            usagePercent,
          });
        } catch (error) {
          logger.error('Storage estimate error', { error });
        }
      }
    };

    fetchStorageInfo();
  }, [records]); // recordsが変わるたびに再計算

  const handleDeleteClick = (recordId: string) => {
    setDeletingRecordId(recordId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecordId) return;

    try {
      setIsDeleting(true);
      await appActions.deleteRecord(deletingRecordId);
      setShowDeleteConfirm(false);
      setDeletingRecordId(null);
    } catch (error) {
      logger.error('Delete error', { error });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (isDeleting) return;
    setShowDeleteConfirm(false);
    setDeletingRecordId(null);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getStorageColor = (percent: number): string => {
    if (percent >= 90) return colors.semantic.error.main;
    if (percent >= 80) return colors.semantic.warning.main;
    return colors.primary[500];
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem',
      fontFamily: typography.fontFamily.primary,
    }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '2rem' }}>
        <Button
          variant="text"
          size="sm"
          onClick={() => navigate('/')}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem 1rem',
            minHeight: '44px',
          }}
        >
          ← 戻る
        </Button>
        <h1 style={{
          ...textStyles.headline.large,
          color: colors.text.primary,
          margin: 0,
        }}>
          データ管理
        </h1>
        <p style={{
          ...textStyles.body.medium,
          color: colors.text.secondary,
          marginTop: '0.5rem',
        }}>
          ストレージ使用状況を確認し、不要なデータを削除できます
        </p>
      </div>

      {/* ストレージ使用状況カード */}
      <ModernCard
        variant="outlined"
        size="lg"
        style={{ marginBottom: '2rem' }}
      >
        <div>
          <h2 style={{
            ...textStyles.headline.small,
            color: colors.text.primary,
            marginBottom: '1rem',
          }}>
            ストレージ使用状況
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}>
              <span style={{
                ...textStyles.body.small,
                color: colors.text.secondary,
              }}>
                {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
              </span>
              <span style={{
                ...textStyles.body.small,
                color: getStorageColor(storageInfo.usagePercent),
                fontWeight: 600,
              }}>
                {storageInfo.usagePercent.toFixed(1)}%
              </span>
            </div>

            {/* Linear Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: colors.surface.secondary,
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(storageInfo.usagePercent, 100)}%`,
                height: '100%',
                backgroundColor: getStorageColor(storageInfo.usagePercent),
                transition: 'width 0.3s ease-in-out',
              }} />
            </div>
          </div>

          {storageInfo.usagePercent >= 80 && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: storageInfo.usagePercent >= 90
                ? colors.semantic.error.light
                : colors.semantic.warning.light,
              borderRadius: '8px',
              marginTop: '1rem',
            }}>
              <p style={{
                ...textStyles.body.small,
                color: storageInfo.usagePercent >= 90
                  ? colors.semantic.error.dark
                  : colors.semantic.warning.dark,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Icon icon={AlertTriangle} size={16} color="warning" decorative />
                <span>
                  {storageInfo.usagePercent >= 90
                    ? 'ストレージ容量が不足しています。不要なデータを削除してください。'
                    : 'ストレージ容量が80%を超えています。データの整理を検討してください。'}
                </span>
              </p>
            </div>
          )}
        </div>
      </ModernCard>

      {/* 釣果記録リスト */}
      <ModernCard variant="outlined" size="lg">
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}>
            <h2 style={{
              ...textStyles.headline.small,
              color: colors.text.primary,
              margin: 0,
            }}>
              釣果記録一覧
            </h2>
            <span style={{
              ...textStyles.body.medium,
              color: colors.text.secondary,
            }}>
              {records.length}件
            </span>
          </div>

          {records.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: colors.text.secondary,
            }}>
              <p style={{
                ...textStyles.body.large,
                margin: 0,
              }}>
                まだ釣果記録がありません
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              {records.map((record) => (
                <RecordListItem
                  key={record.id}
                  record={record}
                  onDelete={() => handleDeleteClick(record.id)}
                />
              ))}
            </div>
          )}
        </div>
      </ModernCard>

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && deletingRecordId && (
        <DeleteConfirmDialog
          record={records.find(r => r.id === deletingRecordId)!}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

/**
 * 釣果記録リストアイテム
 */
interface RecordListItemProps {
  record: FishingRecord;
  onDelete: () => void;
}

const RecordListItem = ({ record, onDelete }: RecordListItemProps) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      backgroundColor: colors.surface.secondary,
      borderRadius: '8px',
      border: `1px solid ${colors.border.light}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          ...textStyles.body.medium,
          color: colors.text.primary,
          fontWeight: 600,
          marginBottom: '0.25rem',
        }}>
          {record.fishSpecies || '魚種未設定'}
        </div>
        <div style={{
          display: 'flex',
          gap: '1rem',
          ...textStyles.body.small,
          color: colors.text.secondary,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon icon={MapPin} size={14} color="secondary" decorative /> {record.location || '場所未設定'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon icon={Calendar} size={14} color="secondary" decorative /> {new Date(record.date).toLocaleDateString('ja-JP')}
          </span>
          {record.size && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Icon icon={Ruler} size={14} color="secondary" decorative /> {record.size}cm
            </span>
          )}
        </div>
      </div>

      <Button
        variant="danger"
        size="sm"
        onClick={onDelete}
        style={{
          minWidth: '44px',
          minHeight: '44px',
          padding: '0.5rem 1rem',
        }}
        aria-label={`${record.fishSpecies || '記録'}を削除`}
      >
        削除
      </Button>
    </div>
  );
};

/**
 * 削除確認ダイアログ
 */
interface DeleteConfirmDialogProps {
  record: FishingRecord;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmDialog = ({
  record,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteConfirmDialogProps) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: colors.surface.primary,
        borderRadius: '16px',
        padding: '1.5rem',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
      }}
      role="dialog"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      >
        <h3
          id="delete-dialog-title"
          style={{
            ...textStyles.headline.small,
            color: colors.text.primary,
            marginBottom: '1rem',
          }}
        >
          削除の確認
        </h3>

        <p
          id="delete-dialog-description"
          style={{
            ...textStyles.body.medium,
            color: colors.text.secondary,
            marginBottom: '1.5rem',
          }}
        >
          本当に「{record.fishSpecies || '記録'}」を削除しますか？
          <br />
          この操作は取り消せません。
        </p>

        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
        }}>
          <Button
            variant="text"
            size="md"
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              minWidth: '44px',
              minHeight: '44px',
            }}
          >
            キャンセル
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              minWidth: '44px',
              minHeight: '44px',
            }}
          >
            {isDeleting ? '削除中...' : '削除'}
          </Button>
        </div>
      </div>
    </div>
  );
};
