// データエクスポートモーダルコンポーネント

import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, FileSpreadsheet, Calendar, Image, CheckCircle, XCircle, Loader } from 'lucide-react';
import { exportImportService } from '../lib/export-import-service';
import type { FishingRecord } from '../types';

interface DataExportModalProps {
  records: FishingRecord[];
  isVisible: boolean;
  onClose: () => void;
}

export const DataExportModal: React.FC<DataExportModalProps> = ({
  records,
  isVisible,
  onClose
}) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // エクスポート実行
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportStatus({ type: null, message: '' });

    try {
      if (exportFormat === 'json') {
        // JSONエクスポート（全データ）
        const result = await exportImportService.exportAllData();

        if (result.success && result.data) {
          const blob = exportImportService.createDownloadBlob(result.data, 'application/json');
          const filename = `fishing-records-${new Date().toISOString().split('T')[0]}.json`;
          exportImportService.downloadFile(blob, filename);

          setExportStatus({
            type: 'success',
            message: 'JSONファイルのダウンロードが開始されました。'
          });
        } else {
          setExportStatus({
            type: 'error',
            message: `エクスポートに失敗しました: ${result.error?.message}`
          });
        }
      } else if (exportFormat === 'csv') {
        // CSVエクスポート（記録のみ）
        const result = await exportImportService.exportRecordsAsCSV();

        if (result.success && result.data) {
          const blob = exportImportService.createDownloadBlob(result.data, 'text/csv;charset=utf-8');
          const filename = `fishing-records-${new Date().toISOString().split('T')[0]}.csv`;
          exportImportService.downloadFile(blob, filename);

          setExportStatus({
            type: 'success',
            message: 'CSVファイルのダウンロードが開始されました。'
          });
        } else {
          setExportStatus({
            type: 'error',
            message: `エクスポートに失敗しました: ${result.error?.message}`
          });
        }
      }
    } catch (error) {
      setExportStatus({
        type: 'error',
        message: `エクスポート中にエラーが発生しました: ${error}`
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportFormat]);

  // フィルターされた記録数の計算
  const getFilteredRecordsCount = useCallback(() => {
    if (!dateFrom && !dateTo) return records.length;

    return records.filter(record => {
      const recordDate = record.date.toISOString().split('T')[0];
      if (dateFrom && recordDate < dateFrom) return false;
      if (dateTo && recordDate > dateTo) return false;
      return true;
    }).length;
  }, [records, dateFrom, dateTo]);

  if (!isVisible) return null;

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
      zIndex: 1150 // BottomNavigation(1100)より上に表示
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface-primary)',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        border: `1px solid ${'var(--color-border-light)'}`
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Upload size={24} color="#60a5fa" aria-hidden="true" />
            データエクスポート
          </h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* エクスポート形式選択 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            color: 'var(--color-text-primary)'
          }}>
            エクスポート形式
          </label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-primary)'
            }}>
              <input
                type="radio"
                value="json"
                checked={exportFormat === 'json'}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="#60a5fa" aria-hidden="true" /> JSON (全データ)
              </span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-primary)'
            }}>
              <input
                type="radio"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={18} color="#60a5fa" aria-hidden="true" /> CSV (記録のみ)
              </span>
            </label>
          </div>
        </div>

        {/* 日付範囲フィルター */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            color: 'var(--color-text-primary)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} color="#a78bfa" aria-hidden="true" /> 日付範囲（オプション）
            </span>
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                padding: '0.5rem',
                border: `1px solid ${'var(--color-border-medium)'}`,
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)'
              }}
            />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>〜</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                padding: '0.5rem',
                border: `1px solid ${'var(--color-border-medium)'}`,
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>
        </div>

        {/* 追加オプション（JSON形式の場合） */}
        {exportFormat === 'json' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              color: 'var(--color-text-primary)'
            }}>
              追加オプション
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-primary)'
            }}>
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={(e) => setIncludePhotos(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px'
                }}
              />
              <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Image size={18} color={'var(--color-text-secondary)'} aria-hidden="true" /> 写真データを含める
              </span>
            </label>
          </div>
        )}

        {/* エクスポート対象の情報 */}
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface-secondary)',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          color: 'var(--color-text-secondary)',
          border: `1px solid ${'var(--color-border-light)'}`
        }}>
          <h4 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: 'var(--color-text-primary)'
          }}>
            エクスポート対象
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>記録: {getFilteredRecordsCount()}件</li>
            {exportFormat === 'json' && (
              <>
                <li>写真データ: {includePhotos ? '含める' : '含めない'}</li>
                <li>アプリ設定: 含める</li>
              </>
            )}
          </ul>
        </div>

        {/* エクスポート状況メッセージ */}
        {exportStatus.type && (
          <div style={{
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            backgroundColor: exportStatus.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: exportStatus.type === 'success' ? '#34d399' : '#ef4444',
            border: `1px solid ${exportStatus.type === 'success' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {exportStatus.type === 'success'
                ? <CheckCircle size={20} color="#34d399" aria-hidden="true" />
                : <XCircle size={20} color="#ef4444" aria-hidden="true" />
              }
              {exportStatus.message}
            </span>
          </div>
        )}

        {/* アクションボタン */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={isExporting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: isExporting ? 0.6 : 1
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isExporting ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isExporting ? (
              <>
                <Loader size={18} className="animate-spin" aria-hidden="true" /> エクスポート中...
              </>
            ) : (
              <>
                <Upload size={18} aria-hidden="true" /> エクスポート
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};