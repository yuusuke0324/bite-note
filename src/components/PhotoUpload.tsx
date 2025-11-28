// 写真アップロード・プレビューコンポーネント

import React, { useCallback, useState } from 'react';
import { Camera, MapPin, CheckCircle, Smartphone, AlertTriangle } from 'lucide-react';
import { customValidationRules } from '../hooks/useFormValidation';
import { photoMetadataService } from '../lib/photo-metadata-service';
import { weatherService } from '../lib/weather-service';
import { useToastStore } from '../stores/toast-store';
import { TestIds } from '../constants/testIds';
import { Skeleton } from './ui/Skeleton';
import type { PhotoMetadata, AutoFillData } from '../types';
import { logger } from '../lib/errors/logger';

interface PhotoUploadProps {
  value?: File;
  onChange: (file: File | undefined) => void;
  preview?: string;
  isUploading?: boolean;
  error?: string;
  disabled?: boolean;
  maxSizeMB?: number;
  accept?: string;
  onMetadataExtracted?: (metadata: PhotoMetadata, file: File) => void | Promise<void>;
  onAutoFillRequested?: (data: AutoFillData) => void;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  value,
  onChange,
  preview,
  isUploading = false,
  error,
  disabled = false,
  maxSizeMB = 10,
  accept = 'image/jpeg,image/png,image/webp',
  onMetadataExtracted,
  onAutoFillRequested
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const processingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // トースト通知
  const showError = useToastStore(state => state.showError);

  // メタデータ抽出とファイル処理
  const processFileWithMetadata = useCallback(async (file: File) => {
    setExtractingMetadata(true);

    try {
      // メタデータを抽出
      const metadataResult = await photoMetadataService.extractMetadata(file);

      if (metadataResult.success && metadataResult.metadata) {
        await onMetadataExtracted?.(metadataResult.metadata, file);

        // 自動入力データを準備
        const autoFillData: AutoFillData = {
          source: 'exif'
        };

        // 位置情報がある場合 - API呼び出しを並列実行して高速化
        if (metadataResult.metadata.coordinates) {
          const [geocodeResult, weatherResult, marineResult] = await Promise.all([
            photoMetadataService.getLocationFromCoordinates(metadataResult.metadata.coordinates),
            metadataResult.metadata.datetime
              ? weatherService.getHistoricalWeather(metadataResult.metadata.coordinates, metadataResult.metadata.datetime)
              : weatherService.getCurrentWeather(metadataResult.metadata.coordinates),
            weatherService.getMarineData(metadataResult.metadata.coordinates)
          ]);

          if (geocodeResult.success) {
            autoFillData.location = geocodeResult.address;
            autoFillData.coordinates = metadataResult.metadata.coordinates;
          }

          if (weatherResult.success) {
            autoFillData.weather = weatherResult.data;
          }

          if (marineResult.success && marineResult.data) {
            autoFillData.seaTemperature = marineResult.data.seaTemperature;
          }
        }

        // 撮影日時がある場合
        if (metadataResult.metadata.datetime) {
          autoFillData.datetime = metadataResult.metadata.datetime;
        }

        // 自動入力データがある場合は確認ダイアログを表示
        if (Object.keys(autoFillData).length > 1) {
          onAutoFillRequested?.(autoFillData);
        }
      } else {
        // GPS情報がない場合でも、撮影日時がある場合は自動入力を提案
        if (metadataResult.metadata && metadataResult.metadata.datetime) {
          const fallbackData: AutoFillData = {
            datetime: metadataResult.metadata.datetime,
            source: 'exif'
          };
          onAutoFillRequested?.(fallbackData);
        }
      }
    } catch (error) {
      logger.error('メタデータ抽出エラー', { error });
    } finally {
      setExtractingMetadata(false);
    }
  }, [onMetadataExtracted, onAutoFillRequested]);

  // ファイル選択処理（Debounce付き）
  const handleFileSelect = useCallback((file: File | null) => {
    // 既存のタイムアウトをクリア（連続選択時に前の処理をキャンセル）
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    // エラーをクリア
    setUploadError(null);

    if (!file) {
      onChange(undefined);
      return;
    }

    // ファイルサイズ検証
    const sizeValidation = customValidationRules.maxFileSize(maxSizeMB)(file);
    if (sizeValidation !== true) {
      // product-manager決定版のエラーメッセージ
      const errorMessage = `画像サイズが大きすぎます（上限: ${maxSizeMB}MB）\nより小さいファイルを選択してください。`;
      setUploadError(errorMessage);
      showError(errorMessage, [
        {
          label: '画像を選び直す',
          handler: () => {
            setUploadError(null);
            fileInputRef.current?.click();
          },
          primary: true
        }
      ]);
      return;
    }

    // ファイル形式検証
    const typeValidation = customValidationRules.imageFileType(file);
    if (typeValidation !== true) {
      const errorMessage = typeValidation;
      setUploadError(errorMessage);
      showError(errorMessage, [
        {
          label: '画像を選び直す',
          handler: () => {
            setUploadError(null);
            fileInputRef.current?.click();
          },
          primary: true
        }
      ]);
      return;
    }

    onChange(file);

    // メタデータ抽出コールバックがある場合は処理を実行（300ms debounce）
    if (onMetadataExtracted || onAutoFillRequested) {
      processingTimeoutRef.current = setTimeout(() => {
        processFileWithMetadata(file);
      }, 300);
    }
  }, [onChange, maxSizeMB, onMetadataExtracted, onAutoFillRequested, processFileWithMetadata, showError]);

  // ファイル入力変更ハンドラー
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    handleFileSelect(file);
  }, [handleFileSelect]);

  // ドラッグアンドドロップハンドラー
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const file = event.dataTransfer.files?.[0] || null;
    handleFileSelect(file);
  }, [disabled, handleFileSelect]);

  // 写真削除ハンドラー
  const handleRemove = useCallback(() => {
    // タイムアウトをクリア
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    onChange(undefined);
  }, [onChange]);

  // クリーンアップ
  React.useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
        写真
      </label>

      {/* プレビュー表示 */}
      {preview && (
        <div style={{
          marginBottom: '1rem',
          border: `1px solid var(--color-border-light)`,
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: 'var(--color-surface-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <img
              src={preview}
              alt="写真プレビュー"
              style={{
                maxWidth: '200px',
                maxHeight: '200px',
                objectFit: 'cover',
                borderRadius: '4px',
                border: `1px solid var(--color-border-medium)`
              }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                {value?.name || 'プレビュー画像'}
              </p>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                サイズ: {value ? (value.size / 1024 / 1024).toFixed(2) : '不明'}MB
              </p>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アップロード領域 */}
      {!preview && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            position: 'relative',
            border: `2px dashed ${dragOver ? '#60a5fa' : error ? '#ef4444' : 'var(--color-border-medium)'}`,
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: dragOver ? 'var(--color-surface-secondary)' : disabled ? 'var(--color-surface-secondary)' : 'var(--color-surface-primary)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {(isUploading || extractingMetadata) ? (
            <div style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <Skeleton width="100%" height="200px" borderRadius="8px" />
              </div>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                {extractingMetadata ? 'メタデータを解析中...' : 'アップロード中...'}
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <Camera size={40} color={disabled ? 'var(--color-text-secondary)' : '#60a5fa'} aria-hidden="true" />
              </div>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {dragOver ? 'ここにドロップ' : '写真をアップロード'}
              </p>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                ドラッグ&amp;ドロップまたはクリックして選択
              </p>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#60a5fa', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <MapPin size={14} color="#10B981" aria-hidden="true" /> GPS情報付きの写真なら位置・日時・天気・海面水温を自動入力!
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                対応形式: JPEG, PNG, WebP (最大{maxSizeMB}MB)
              </p>
              <div style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                <p style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={12} color="#10B981" aria-hidden="true" /> GPS付き写真: 位置・日時・天気・海面水温を自動抽出
                </p>
                <p style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <Smartphone size={12} style={{ color: 'var(--color-text-secondary)' }} aria-hidden="true" /> 位置情報ONで撮影した写真がおすすめ
                </p>
              </div>
            </div>
          )}

          {/* 隠しファイル入力 */}
          <input
            ref={fileInputRef}
            data-testid={TestIds.PHOTO_INPUT}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            disabled={disabled || isUploading}
            aria-label="写真をアップロード"
            style={{
              display: 'none'
            }}
          />

          {/* クリックボタン */}
          <button
            type="button"
            disabled={disabled || isUploading || extractingMetadata}
            onClick={(e) => {
              e.preventDefault();
              const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
              if (input) input.click();
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: disabled || isUploading || extractingMetadata ? 'not-allowed' : 'pointer',
              background: 'transparent',
              border: 'none'
            }}
          />
        </div>
      )}

      {/* エラー表示 */}
      {(error || uploadError) && (
        <div
          data-testid={TestIds.PHOTO_UPLOAD_ERROR}
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} color="#F59E0B" aria-hidden="true" /> {error || uploadError}
          </span>
          {uploadError && (
            <button
              type="button"
              data-testid={TestIds.RETRY_UPLOAD_BUTTON}
              onClick={() => {
                setUploadError(null);
                fileInputRef.current?.click();
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap'
              }}
            >
              画像を選び直す
            </button>
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