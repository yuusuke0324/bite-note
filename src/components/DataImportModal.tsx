// データインポートモーダルコンポーネント

import React, { useState, useCallback, useRef } from 'react';
import { exportImportService } from '../lib/export-import-service';
import type { ImportResult } from '../types';
import { Icon } from './ui/Icon';
import { Download, X, Lightbulb, Folder, Paperclip, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface DataImportModalProps {
  isVisible: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isVisible,
  onClose,
  onImportComplete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ファイル選択ハンドラー
  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = [
      'application/json',
      'text/csv',
      '.json',
      '.csv'
    ];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedTypes.includes(fileExtension)) {
      alert('JSON または CSV ファイルを選択してください。');
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  }, []);

  // ファイル入力の変更
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // ドラッグ＆ドロップ
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // インポート実行
  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

      // ファイルタイプに応じてインポート処理を切り替え
      const isCSV = fileExtension === '.csv' || selectedFile.type === 'text/csv';

      let result;

      if (isCSV) {
        const fileContent = await selectedFile.text();
        result = await exportImportService.importRecordsFromCSV(fileContent);
      } else {
        const fileContent = await selectedFile.text();
        result = await exportImportService.importData(fileContent);
      }

      if (result.success && result.data) {
        setImportResult(result.data);
        if (result.data.success) {
          // インポート成功時は親コンポーネントに通知
          setTimeout(() => {
            onImportComplete();
          }, 2000);
        }
      } else {
        setImportResult({
          success: false,
          importedRecords: 0,
          importedPhotos: 0,
          skippedItems: 0,
          errors: [result.error?.message || 'インポートに失敗しました']
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        importedRecords: 0,
        importedPhotos: 0,
        skippedItems: 0,
        errors: [`インポート中にエラーが発生しました: ${error}`]
      });
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, onImportComplete]);

  // ファイル選択エリアクリック
  const handleFileAreaClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // モーダルリセット
  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setImportResult(null);
    setDragOver(false);
    onClose();
  }, [onClose]);

  // ファイルサイズのフォーマット
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
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
            color: '#333'
          }}>
            <Icon icon={Download} size={24} decorative /> データインポート
          </h2>
          <button
            onClick={handleClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: '#6c757d',
              padding: '0.25rem'
            }}
          >
            <Icon icon={X} size={24} decorative />
          </button>
        </div>

        {/* 説明 */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#e3f2fd',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          color: '#1976d2'
        }}>
          <h4 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}>
            <Icon icon={Lightbulb} size={16} decorative /> インポート可能なファイル形式
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>JSON形式: 全データ（記録、写真、設定）</li>
            <li>CSV形式: 釣果記録のみ</li>
          </ul>
        </div>

        {/* ファイル選択エリア */}
        <div
          onClick={handleFileAreaClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? '#007bff' : selectedFile ? '#28a745' : '#ced4da'}`,
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: dragOver ? '#e3f2fd' : selectedFile ? '#d4edda' : '#f8f9fa',
            marginBottom: '1.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          {selectedFile ? (
            <div>
              <div style={{ marginBottom: '0.5rem' }}>
                <Icon icon={Folder} size={32} color="primary" decorative />
              </div>
              <div style={{
                fontWeight: 'bold',
                fontSize: '1rem',
                color: '#333',
                marginBottom: '0.25rem'
              }}>
                {selectedFile.name}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#666'
              }}>
                {formatFileSize(selectedFile.size)}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '0.5rem' }}>
                <Icon icon={Paperclip} size={32} color="secondary" decorative />
              </div>
              <div style={{
                fontSize: '1rem',
                color: '#333',
                marginBottom: '0.5rem'
              }}>
                {dragOver ? 'ファイルをドロップしてください' : 'ファイルを選択またはドロップ'}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#666'
              }}>
                JSON または CSV ファイル
              </div>
            </div>
          )}
        </div>

        {/* インポート結果 */}
        {importResult && (
          <div style={{
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            backgroundColor: importResult.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${importResult.success ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            <h4 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: importResult.success ? '#155724' : '#721c24'
            }}>
              <Icon icon={importResult.success ? CheckCircle2 : XCircle} size={20} color={importResult.success ? 'success' : 'error'} decorative /> {importResult.success ? 'インポート完了' : 'インポート失敗'}
            </h4>

            {importResult.success && (
              <div style={{
                fontSize: '0.9rem',
                color: '#155724'
              }}>
                <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                  <li>インポート済み記録: {importResult.importedRecords}件</li>
                  <li>インポート済み写真: {importResult.importedPhotos}件</li>
                  {importResult.skippedItems > 0 && (
                    <li>スキップ: {importResult.skippedItems}件</li>
                  )}
                </ul>
              </div>
            )}

            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong style={{ color: '#721c24', fontSize: '0.9rem' }}>エラー:</strong>
                <ul style={{
                  margin: '0.25rem 0 0 0',
                  paddingLeft: '1.5rem',
                  fontSize: '0.85rem',
                  color: '#721c24'
                }}>
                  {importResult.errors.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>...他 {importResult.errors.length - 5} 件のエラー</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 警告メッセージ */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff3cd',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          color: '#856404',
          border: '1px solid #ffeaa7'
        }}>
          <strong><Icon icon={AlertTriangle} size={16} color="warning" decorative /> 注意:</strong> インポートにより既存のデータが上書きされる場合があります。
          重要なデータは事前にエクスポートしてバックアップを取ることをお勧めします。
        </div>

        {/* アクションボタン */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleClose}
            disabled={isImporting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isImporting ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: isImporting ? 0.6 : 1
            }}
          >
            {importResult?.success ? '閉じる' : 'キャンセル'}
          </button>
          {selectedFile && !importResult?.success && (
            <button
              onClick={handleImport}
              disabled={isImporting}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isImporting ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isImporting ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isImporting ? (
                <>
                  <Icon icon={Loader2} size={16} className="animate-spin" decorative /> インポート中...
                </>
              ) : (
                <>
                  <Icon icon={Download} size={16} decorative /> インポート
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};