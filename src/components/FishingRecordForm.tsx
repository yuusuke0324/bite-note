// 釣果記録フォームコンポーネント

import React, { useState, useCallback } from 'react';
import { useValidatedForm } from '../hooks/useFormValidation';
import { createFishingRecordSchema, type CreateFishingRecordFormData } from '../lib/validation';
import { PhotoUpload } from './PhotoUpload';
import { FishSpeciesAutocomplete } from './FishSpeciesAutocomplete';
import { photoService } from '../lib/photo-service';
import type { PhotoMetadata, AutoFillData, FishSpecies } from '../types';
import type { TideInfo } from '../types/tide';
import { TestIds } from '../constants/testIds';
import { logger } from '../lib/errors/logger';
import { Icon } from './ui/Icon';
import {
  Anchor,
  Camera,
  MapPin,
  Calendar,
  Waves,
  Moon,
  BarChart3,
  Clock,
  Lightbulb,
  Save,
  RefreshCw,
  CloudSun,
  Globe,
  CheckCircle2,
  XCircle,
  FileText,
  Fish,
} from 'lucide-react';

interface FishingRecordFormProps {
  onSubmit: (data: CreateFishingRecordFormData) => Promise<void>;
  initialData?: Partial<CreateFishingRecordFormData>;
  isLoading?: boolean;
}

export const FishingRecordForm: React.FC<FishingRecordFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false
}) => {
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [photoPreview, setPhotoPreview] = useState<string | undefined>();
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showAutoFillDialog, setShowAutoFillDialog] = useState(false);
  const [pendingAutoFillData, setPendingAutoFillData] = useState<AutoFillData | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [extractedMetadata, setExtractedMetadata] = useState<PhotoMetadata | null>(null);
  const [tideInfo, setTideInfo] = useState<TideInfo | null>(null);
  const [tideLoading, setTideLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    setValue,
    watch,
    submitWithValidation,
    isSubmitting,
    hasUnsavedChanges,
    resetWithConfirm
  } = useValidatedForm({
    schema: createFishingRecordSchema,
    defaultValues: {
      date: new Date().toISOString().slice(0, 16),
      location: '',
      fishSpecies: '',
      weather: '',
      size: undefined,
      seaTemperature: undefined,
      notes: '',
      photoId: undefined,
      coordinates: undefined,
      useGPS: true,
      ...initialData
    }
  });


  // 写真ファイル変更ハンドラー
  const handlePhotoChange = useCallback((file: File | undefined) => {
    setPhotoFile(file);

    if (file) {
      // プレビューの設定
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    } else {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(undefined);
      setValue('photoId', undefined, { shouldValidate: true });
    }
  }, [setValue, photoPreview]);


  // 写真メタデータ抽出ハンドラー
  const handleMetadataExtracted = useCallback(async (metadata: PhotoMetadata, file: File) => {
    setExtractedMetadata(metadata);

    // 撮影日時を自動的に釣行日時フィールドに設定（ローカル時刻）
    if (metadata.datetime) {
      const d = metadata.datetime;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
      setValue('date', dateTimeString, { shouldValidate: true, shouldDirty: true });
    }

    // GPS座標を自動的に設定
    if (metadata.coordinates) {
      setValue('coordinates', metadata.coordinates, { shouldValidate: true, shouldDirty: true });
    }

    // メタデータ抽出完了後に写真を保存
    if (file) {
      try {
        setPhotoUploading(true);
        const result = await photoService.savePhoto(file);

        if (result.success && result.data) {
          setValue('photoId', result.data.id, { shouldValidate: true });
        } else {
          logger.error('写真保存失敗', { error: result.error });
          setValue('photoId', undefined, { shouldValidate: true });
        }
      } catch (error) {
        logger.error('写真保存エラー', { error });
        setValue('photoId', undefined, { shouldValidate: true });
      } finally {
        setPhotoUploading(false);
      }
    }
  }, [setValue]);

  // 自動入力要求ハンドラー
  const handleAutoFillRequested = useCallback((data: AutoFillData) => {
    setPendingAutoFillData(data);
    setShowAutoFillDialog(true);
  }, []);

  // 自動入力確認ハンドラー
  const handleAutoFillConfirm = useCallback(() => {
    if (!pendingAutoFillData) return;

    const newAutoFilledFields = new Set<string>();

    // 位置情報の自動入力
    if (pendingAutoFillData.location) {
      setValue('location', pendingAutoFillData.location, { shouldValidate: true, shouldDirty: true });
      newAutoFilledFields.add('location');
    }

    // 日時の自動入力（ローカルタイムゾーンで設定）
    if (pendingAutoFillData.datetime) {
      const d = pendingAutoFillData.datetime;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
      setValue('date', dateTimeString, { shouldValidate: true, shouldDirty: true });
      newAutoFilledFields.add('date');
    }

    // GPS座標の自動入力
    if (pendingAutoFillData.coordinates) {
      setValue('coordinates', pendingAutoFillData.coordinates, { shouldValidate: true, shouldDirty: true });
      newAutoFilledFields.add('coordinates');
    }

    // 天気情報の自動入力（専用フィールドに設定）
    if (pendingAutoFillData.weather) {
      const weatherInfo = `${pendingAutoFillData.weather.description} (${pendingAutoFillData.weather.temperature}°C)`;
      setValue('weather', weatherInfo, { shouldValidate: true, shouldDirty: true });
      newAutoFilledFields.add('weather');
    }

    // 海面水温の自動入力
    if (pendingAutoFillData.seaTemperature) {
      setValue('seaTemperature', pendingAutoFillData.seaTemperature, { shouldValidate: true, shouldDirty: true });
      newAutoFilledFields.add('seaTemperature');
    }

    setAutoFilledFields(newAutoFilledFields);
    setShowAutoFillDialog(false);
    setPendingAutoFillData(null);
  }, [pendingAutoFillData, setValue]);

  // 自動入力キャンセルハンドラー
  const handleAutoFillCancel = useCallback(() => {
    setShowAutoFillDialog(false);
    setPendingAutoFillData(null);
  }, []);

  // フォーム送信ハンドラー
  const handleFormSubmit = async () => {
    await submitWithValidation(async (data) => {
      if (photoFile) {
        setPhotoUploading(true);
        // 実際の実装では写真アップロード処理を行う
        await new Promise(resolve => setTimeout(resolve, 1000)); // シミュレーション
        setPhotoUploading(false);
      }

      // 潮汐情報を含めて送信
      const submissionData: any = {
        ...data,
        useGPS: data.useGPS ?? false
      };

      // 潮汐情報が計算されている場合は追加
      if (tideInfo) {
        submissionData.tideInfo = tideInfo;
      }

      await onSubmit(submissionData);
    });
  };

  // リセットハンドラー
  const handleReset = async () => {
    const confirmed = await resetWithConfirm();
    if (confirmed) {
      setPhotoFile(undefined);
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(undefined);
    }
  };

  // フォーム値を監視（潮汐情報計算用）
  const watchedCoordinatesForTide = watch('coordinates');
  const watchedDateForTide = watch('date');

  // 潮汐情報の自動計算
  React.useEffect(() => {
    const coords = watchedCoordinatesForTide;
    const dateStr = watchedDateForTide;

    if (!coords || !dateStr) {
      setTideInfo(null);
      return;
    }

    const calculateTide = async () => {
      try {
        setTideLoading(true);

        const { TideCalculationService } = await import('../services/tide/TideCalculationService');
        const tideService = new TideCalculationService();
        await tideService.initialize();

        const date = new Date(dateStr);
        const calculatedTideInfo = await tideService.calculateTideInfo(coords, date);

        setTideInfo(calculatedTideInfo);
      } catch (error) {
        logger.error('潮汐情報の計算エラー', { error });
        setTideInfo(null);
      } finally {
        setTideLoading(false);
      }
    };

    calculateTide();
  }, [watchedCoordinatesForTide, watchedDateForTide]);

  // メモリリーク防止のためのクリーンアップ
  React.useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // E2Eテスト用: GPS座標の有無を判定
  const watchedCoordinates = watch('coordinates');
  const hasCoordinates = !!watchedCoordinates;

  return (
    <div className="form-container" style={{
      maxWidth: '700px',
      margin: '0 auto',
      padding: '2rem',
      paddingBottom: '2rem',
      backgroundColor: 'var(--color-surface-primary)',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      border: `1px solid ${'var(--color-border-light)'}`
    }}>
      <h2 style={{
        textAlign: 'center',
        marginBottom: '2rem',
        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        color: 'var(--color-text-primary)'
      }}>
        <Icon icon={Anchor} size={28} decorative /> 新規記録
      </h2>

      <form
        data-testid="fishing-record-form"
        data-has-coordinates={hasCoordinates.toString()}
        onSubmit={handleSubmit(handleFormSubmit)}
        noValidate
        autoComplete="off"
      >
        {/* 写真アップロード（メタデータ自動入力のため先頭に配置） */}
        <div style={{ marginBottom: '2rem' }}>
          <PhotoUpload
            value={photoFile}
            onChange={handlePhotoChange}
            preview={photoPreview}
            isUploading={photoUploading}
            disabled={isSubmitting || isLoading}
            error={errors.photoId?.message}
            onMetadataExtracted={handleMetadataExtracted}
            onAutoFillRequested={handleAutoFillRequested}
          />
        </div>

        {/* 抽出されたメタデータ表示 */}
        {extractedMetadata && (
          <div style={{
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: 'rgba(96, 165, 250, 0.15)',
            border: `1px solid ${'var(--color-border-focus)'}`,
            borderRadius: '8px'
          }}>
            <h4 style={{
              margin: '0 0 0.75rem 0',
              color: 'var(--color-accent-text)',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Icon icon={Camera} size={16} decorative /> 写真から抽出された情報
            </h4>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              {extractedMetadata.coordinates && (
                <p style={{ margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Icon icon={MapPin} size={14} decorative /> GPS座標: {extractedMetadata.coordinates.latitude.toFixed(6)}, {extractedMetadata.coordinates.longitude.toFixed(6)}
                </p>
              )}
              {extractedMetadata.datetime && (
                <p style={{ margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Icon icon={Calendar} size={14} decorative /> 撮影日時: {extractedMetadata.datetime.toLocaleString('ja-JP')}
                </p>
              )}
              {extractedMetadata.camera && (
                <p style={{ margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Icon icon={Camera} size={14} decorative /> カメラ: {extractedMetadata.camera.make || ''} {extractedMetadata.camera.model || ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 潮汐情報表示 */}
        {tideLoading && (
          <div style={{
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: 'rgba(0, 172, 193, 0.15)',
            border: '1px solid rgba(0, 172, 193, 0.4)',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#4dd0e1',
              fontSize: '0.9rem'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTop: '2px solid #4dd0e1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span>潮汐情報を計算中...</span>
            </div>
          </div>
        )}

        {tideInfo && !tideLoading && (
          <div style={{
            marginBottom: '2rem',
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(0, 172, 193, 0.2) 0%, rgba(0, 172, 193, 0.1) 100%)',
            border: '2px solid rgba(0, 172, 193, 0.4)',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}>
            <h4 style={{
              margin: '0 0 1rem 0',
              color: '#4dd0e1',
              fontSize: '1.05rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '700'
            }}>
              <Icon icon={Waves} size={16} decorative /> 潮汐情報（自動計算）
            </h4>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.75rem'
              }}>
                <div style={{
                  backgroundColor: 'rgba(0, 172, 193, 0.15)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 172, 193, 0.3)'
                }}>
                  <strong><Icon icon={Moon} size={14} decorative /> 潮名:</strong> {tideInfo.tideType === 'spring' ? '大潮' :
                    tideInfo.tideType === 'neap' ? '小潮' :
                    tideInfo.tideType === 'medium' ? '中潮' :
                    tideInfo.tideType === 'long' ? '長潮' :
                    tideInfo.tideType === 'young' ? '若潮' : tideInfo.tideType}
                </div>
                <div style={{
                  backgroundColor: 'rgba(0, 172, 193, 0.15)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 172, 193, 0.3)'
                }}>
                  <strong><Icon icon={BarChart3} size={14} decorative /> 潮の状態:</strong> {tideInfo.currentState === 'rising' ? '上げ潮' :
                    tideInfo.currentState === 'falling' ? '下げ潮' :
                    tideInfo.currentState === 'high' ? '満潮' : '干潮'}
                </div>
              </div>

              {tideInfo.nextEvent && (
                <div style={{
                  backgroundColor: 'rgba(0, 172, 193, 0.15)',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 172, 193, 0.3)',
                  marginTop: '0.75rem'
                }}>
                  <strong><Icon icon={Clock} size={14} decorative /> 次の潮汐イベント:</strong>{' '}
                  {tideInfo.nextEvent.type === 'high' ? '満潮' : '干潮'}{' '}
                  {tideInfo.nextEvent.time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              <div style={{
                marginTop: '0.75rem',
                fontSize: '0.8rem',
                color: '#4dd0e1',
                fontStyle: 'italic'
              }}>
                <Icon icon={Lightbulb} size={14} decorative /> この潮汐情報は記録とともに自動保存されます
              </div>
            </div>
          </div>
        )}

        {/* 日付 */}
        <div style={{ marginBottom: '2rem' }}>
          <label
            htmlFor="fishing-date"
            style={{
              display: 'flex',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-text-primary)'
            }}
          >
            釣行日時 <span style={{ color: '#ef4444' }} aria-label="必須項目">*</span>
            {autoFilledFields.has('date') && (
              <span style={{
                backgroundColor: '#22c55e',
                color: 'white',
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '12px',
                fontWeight: 'normal'
              }}>
                <Icon icon={Camera} size={12} decorative /> 写真から自動入力
              </span>
            )}
          </label>
          <input
            id="fishing-date"
            data-testid={TestIds.FISHING_DATE}
            type="datetime-local"
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
            {...register('date')}
            aria-describedby={errors.date ? 'date-error' : undefined}
            aria-invalid={!!errors.date}
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              padding: '1rem',
              border: `2px solid ${errors.date ? '#ef4444' : 'var(--color-border-medium)'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              transition: 'all 0.15s ease-in-out',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              outline: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-border-focus)';
              e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.date ? '#ef4444' : 'var(--color-border-medium)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }}
          />
          {errors.date && (
            <p
              id="date-error"
              data-testid={TestIds.FIELD_ERROR('date')}
              role="alert"
              style={{
                color: '#ef4444',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                marginBottom: 0
              }}
            >
              {errors.date.message}
            </p>
          )}
        </div>

        {/* 場所（県・市自動取得＋詳細手動入力） */}
        <div style={{ marginBottom: '2rem' }}>
          <label
            htmlFor="fishing-spot"
            style={{
              display: 'flex',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-text-primary)'
            }}
          >
            釣り場 <span style={{ color: '#ef4444' }} aria-label="必須項目">*</span>
            {autoFilledFields.has('location') && (
              <span style={{
                backgroundColor: '#22c55e',
                color: 'white',
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '12px',
                fontWeight: 'normal'
              }}>
                <Icon icon={Camera} size={12} decorative /> 県・市を自動入力
              </span>
            )}
          </label>

          {/* 自動取得された基本地域表示 */}
          {autoFilledFields.has('location') && (
            <div style={{
              marginBottom: '0.75rem',
              padding: '0.75rem',
              backgroundColor: 'rgba(52, 168, 83, 0.15)',
              border: `1px solid ${'#22c55e'}`,
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ color: '#4ade80', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Icon icon={MapPin} size={14} decorative /> 写真から自動取得</span>
              </div>
              <div style={{ color: 'var(--color-text-primary)' }}>
                <strong>基本地域:</strong> {watch('location')?.split(/[・、,]/, 1)[0] || watch('location')}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Icon icon={Lightbulb} size={12} decorative /> この基本地域に詳細な場所名を追加できます
              </div>
            </div>
          )}

          <input
            id="fishing-spot"
            data-testid={TestIds.LOCATION_NAME}
            type="text"
            autoComplete="off"
            inputMode="text"
            data-form-type="other"
            data-lpignore="true"
            placeholder={autoFilledFields.has('location')
              ? "詳細を追加（例: ○○港、△△磯、釣り堀名など）"
              : "釣り場の名前を入力してください"}
            {...register('location')}
            aria-describedby={errors.location ? 'location-error' : 'location-help'}
            aria-invalid={!!errors.location}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '1rem',
              border: `2px solid ${errors.location ? '#ef4444' : 'var(--color-border-medium)'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              transition: 'all 0.15s ease-in-out',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-border-focus)';
              e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.location ? '#ef4444' : 'var(--color-border-medium)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }}
          />
          <small
            id="location-help"
            style={{
              display: 'block',
              marginTop: '0.25rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem'
            }}
          >
            {autoFilledFields.has('location')
              ? "県・市は写真から自動取得済み。詳細な場所名を追加してください（例: ○○港、△△磯、釣り堀名など）"
              : "例: 山口県長門市○○港、東京湾△△磯、釣り堀太郎"}
          </small>
          {errors.location && (
            <p
              id="location-error"
              role="alert"
              style={{
                color: '#ef4444',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                marginBottom: 0
              }}
            >
              {errors.location.message}
            </p>
          )}
        </div>

        {/* 天気 */}
        <div style={{ marginBottom: '2rem' }}>
          <label
            htmlFor="weather"
            style={{
              display: 'flex',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-text-primary)'
            }}
          >
            天気
            {autoFilledFields.has('weather') && (
              <span style={{
                backgroundColor: '#22c55e',
                color: 'white',
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '12px',
                fontWeight: 'normal'
              }}>
                <Icon icon={Camera} size={12} decorative /> 写真から自動入力
              </span>
            )}
          </label>
          <input
            id="weather"
            data-testid={TestIds.WEATHER}
            type="text"
            autoComplete="off"
            inputMode="text"
            data-form-type="other"
            data-lpignore="true"
            placeholder="天気や気温を入力してください"
            {...register('weather')}
            aria-describedby={errors.weather ? 'weather-error' : 'weather-help'}
            aria-invalid={!!errors.weather}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '1rem',
              border: `2px solid ${errors.weather ? '#ef4444' : 'var(--color-border-medium)'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              transition: 'all 0.15s ease-in-out',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-border-focus)';
              e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.weather ? '#ef4444' : 'var(--color-border-medium)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }}
          />
          <small
            id="weather-help"
            style={{
              display: 'block',
              marginTop: '0.25rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem'
            }}
          >
            例: 晴れ (22°C)、曇り、小雨
          </small>
          {errors.weather && (
            <p
              id="weather-error"
              role="alert"
              style={{
                color: '#ef4444',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                marginBottom: 0
              }}
            >
              {errors.weather.message}
            </p>
          )}
        </div>

        {/* 海面水温 */}
        <div style={{ marginBottom: '2rem' }}>
          <label
            htmlFor="seaTemperature"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              color: 'var(--color-text-primary)'
            }}
          >
            海面水温 (°C)
            {autoFilledFields.has('seaTemperature') && (
              <span style={{
                backgroundColor: '#22c55e',
                color: 'white',
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '12px',
                fontWeight: 'normal',
                marginLeft: '0.5rem'
              }}>
                <Icon icon={Camera} size={12} decorative /> 写真から自動入力
              </span>
            )}
          </label>
          <input
            id="seaTemperature"
            type="number"
            autoComplete="off"
            inputMode="decimal"
            min="0"
            max="50"
            step="0.1"
            placeholder="海面水温を入力してください"
            {...register('seaTemperature', {
              setValueAs: (v) => {
                if (v === '' || v === null || v === undefined) return undefined;
                const num = Number(v);
                return isNaN(num) ? undefined : num;
              }
            })}
            aria-describedby={errors.seaTemperature ? 'seaTemperature-error' : 'seaTemperature-help'}
            aria-invalid={!!errors.seaTemperature}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '1rem',
              border: `2px solid ${errors.seaTemperature ? '#ef4444' : 'var(--color-border-medium)'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              transition: 'all 0.15s ease-in-out',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-border-focus)';
              e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.seaTemperature ? '#ef4444' : 'var(--color-border-medium)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }}
          />
          <small
            id="seaTemperature-help"
            style={{
              display: 'block',
              marginTop: '0.25rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem'
            }}
          >
            <Icon icon={Waves} size={14} decorative /> 魚の活性に影響する重要な情報です（例: 22.5°C）
          </small>
          {errors.seaTemperature && (
            <p
              id="seaTemperature-error"
              role="alert"
              style={{
                color: '#ef4444',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                marginBottom: 0
              }}
            >
              {errors.seaTemperature.message}
            </p>
          )}
        </div>

        {/* 魚種 */}
        <div style={{ marginBottom: '2rem' }}>
          <label
            htmlFor="fishSpecies"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              color: 'var(--color-text-primary)'
            }}
          >
            魚種 <span style={{ color: '#ef4444' }} aria-label="必須項目">*</span>
          </label>
          <FishSpeciesAutocomplete
            value={watch('fishSpecies')}
            onChange={(_species: FishSpecies | null, inputValue: string) => {
              setValue('fishSpecies', inputValue, { shouldValidate: true, shouldDirty: true });
            }}
            placeholder="魚種を入力（例: あじ、さば）"
            disabled={isSubmitting || isLoading}
            error={errors.fishSpecies?.message}
            required={true}
          />
          <small
            id="fishSpecies-help"
            style={{
              display: 'block',
              marginTop: '0.5rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem'
            }}
          >
            <Icon icon={Lightbulb} size={14} decorative /> 1文字入力すると候補が表示されます（例: あ → アジ、アオリイカ）
          </small>
        </div>

        {/* サイズ */}
        <div style={{ marginBottom: '2rem' }}>
          <label
            htmlFor="size"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              color: 'var(--color-text-primary)'
            }}
          >
            サイズ (cm)
          </label>
          <input
            id="size"
            data-testid={TestIds.FISH_SIZE}
            type="number"
            autoComplete="off"
            inputMode="decimal"
            min="0"
            max="999"
            step="0.1"
            placeholder="魚のサイズ"
            {...register('size', {
              setValueAs: (v) => {
                if (v === '' || v === null || v === undefined) return undefined;
                const num = Number(v);
                return isNaN(num) ? undefined : num;
              }
            })}
            aria-describedby={errors.size ? 'size-error' : 'size-help'}
            aria-invalid={!!errors.size}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '1rem',
              border: `2px solid ${errors.size ? '#ef4444' : 'var(--color-border-medium)'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              transition: 'all 0.15s ease-in-out',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-border-focus)';
              e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.size ? '#ef4444' : 'var(--color-border-medium)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }}
          />
          <small
            id="size-help"
            style={{
              display: 'block',
              marginTop: '0.25rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem'
            }}
          >
            0cm〜999cmまで入力可能（小数点も可）
          </small>
          {errors.size && (
            <p
              id="size-error"
              role="alert"
              style={{
                color: '#ef4444',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                marginBottom: 0
              }}
            >
              {errors.size.message}
            </p>
          )}
        </div>

        {/* 重量 */}
        <div style={{ marginBottom: '2rem' }}>
          <label
            htmlFor="weight"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              color: 'var(--color-text-primary)'
            }}
          >
            重量 (g)
          </label>
          <input
            id="weight"
            type="number"
            autoComplete="off"
            inputMode="numeric"
            min="0"
            max="99999"
            step="1"
            placeholder="魚の重量"
            {...register('weight', {
              setValueAs: (v) => {
                if (v === '' || v === null || v === undefined) return undefined;
                const num = Number(v);
                return isNaN(num) ? undefined : num;
              }
            })}
            aria-describedby={errors.weight ? 'weight-error' : 'weight-help'}
            aria-invalid={!!errors.weight}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '1rem',
              border: `2px solid ${errors.weight ? '#ef4444' : 'var(--color-border-medium)'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              transition: 'all 0.15s ease-in-out',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-border-focus)';
              e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.weight ? '#ef4444' : 'var(--color-border-medium)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }}
          />
          <small
            id="weight-help"
            style={{
              display: 'block',
              marginTop: '0.25rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem'
            }}
          >
            <Icon icon={Fish} size={14} decorative /> イカなど重量で記録する魚種に便利です（例: 350g）
          </small>
          {errors.weight && (
            <p
              id="weight-error"
              role="alert"
              style={{
                color: '#ef4444',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                marginBottom: 0
              }}
            >
              {errors.weight.message}
            </p>
          )}
        </div>

        {/* メモ */}
        <div style={{ marginBottom: '2rem' }}>
          <label
            htmlFor="notes"
            style={{
              display: 'flex',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-text-primary)'
            }}
          >
            メモ
          </label>
          <textarea
            id="notes"
            data-testid={TestIds.NOTES}
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
            rows={4}
            placeholder="釣りの記録や感想、天候、使用した餌などを自由に記入してください"
            {...register('notes')}
            aria-describedby={errors.notes ? 'notes-error' : 'notes-help'}
            aria-invalid={!!errors.notes}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '1rem',
              border: `2px solid ${errors.notes ? '#ef4444' : 'var(--color-border-medium)'}`,
              borderRadius: '8px',
              fontSize: '1.1rem',
              resize: 'vertical',
              minHeight: '120px',
              transition: 'all 0.15s ease-in-out',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-border-focus)';
              e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.notes ? '#ef4444' : 'var(--color-border-medium)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }}
          />
          <small
            id="notes-help"
            style={{
              display: 'block',
              marginTop: '0.25rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem'
            }}
          >
            最大500文字まで入力可能
          </small>
          {errors.notes && (
            <p
              id="notes-error"
              role="alert"
              style={{
                color: '#ef4444',
                fontSize: '0.875rem',
                marginTop: '0.25rem',
                marginBottom: 0
              }}
            >
              {errors.notes.message}
            </p>
          )}
        </div>

        {/* フォーム状態表示 */}
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: 'var(--color-surface-secondary)',
          borderRadius: '6px',
          border: `1px solid ${'var(--color-border-light)'}`
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--color-text-primary)' }}>フォーム状態</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)'
          }}>
            <span>
              入力状態: {isValid ? <><Icon icon={CheckCircle2} size={14} decorative /> 有効</> : <><Icon icon={XCircle} size={14} decorative /> 無効</>}
            </span>
            <span>
              変更: {isDirty ? <><Icon icon={FileText} size={14} decorative /> あり</> : <><Icon icon={FileText} size={14} decorative /> なし</>}
            </span>
            <span>
              未保存: {hasUnsavedChanges ? <><Icon icon={XCircle} size={14} color="error" decorative /> あり</> : <><Icon icon={CheckCircle2} size={14} decorative /> なし</>}
            </span>
          </div>
        </div>

        {/* アクションボタン */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 480 ? '1fr' : '3fr 1fr',
          gap: '1rem',
          marginBottom: '2rem', // 標準的な余白に戻す
          alignItems: 'stretch' // ボタンの高さを統一
        }}>
          <button
            type="submit"
            data-testid={TestIds.SAVE_RECORD_BUTTON}
            disabled={!isValid || isSubmitting || isLoading || photoUploading}
            aria-describedby="submit-help"
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: !isValid || isSubmitting || isLoading || photoUploading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !isValid || isSubmitting || isLoading || photoUploading ? 'not-allowed' : 'pointer',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              transition: 'all 0.2s ease-in-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: '56px', // より大きなタッチターゲット
              boxShadow: !isValid || isSubmitting || isLoading || photoUploading
                ? 'none'
                : '0 2px 8px rgba(40, 167, 69, 0.3)',
              transform: 'translateY(0)',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              if (!(!isValid || isSubmitting || isLoading || photoUploading)) {
                const target = e.target as HTMLElement;
                target.style.transform = 'translateY(-1px)';
                target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLElement;
              target.style.transform = 'translateY(0)';
              target.style.boxShadow = !isValid || isSubmitting || isLoading || photoUploading
                ? 'none'
                : '0 2px 8px rgba(40, 167, 69, 0.3)';
            }}
          >
            {isSubmitting || isLoading || photoUploading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                {photoUploading ? '写真アップロード中...' : '送信中...'}
              </>
            ) : (
              <>
                <Icon icon={Save} size={16} decorative /> 記録を保存
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting || isLoading}
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: isSubmitting || isLoading ? '#888' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.2s ease-in-out',
              minHeight: '56px', // 主要ボタンと同じ高さ
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isSubmitting || isLoading
                ? 'none'
                : '0 2px 4px rgba(108, 117, 125, 0.2)'
            }}
            onMouseEnter={(e) => {
              if (!(isSubmitting || isLoading)) {
                const target = e.target as HTMLElement;
                target.style.backgroundColor = '#5a6268';
                target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!(isSubmitting || isLoading)) {
                const target = e.target as HTMLElement;
                target.style.backgroundColor = '#6c757d';
                target.style.transform = 'translateY(0)';
              }
            }}
          >
            <Icon icon={RefreshCw} size={16} decorative /> リセット
          </button>
        </div>

        <small
          id="submit-help"
          style={{
            display: 'block',
            marginTop: '1rem',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}
        >
          すべての必須項目を入力してから保存してください
        </small>
      </form>

      {/* 自動入力確認ダイアログ（ローディング表示付き） */}
      {showAutoFillDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface-primary)',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90%',
            overflow: 'auto',
            border: `1px solid ${'var(--color-border-light)'}`
          }}>
            {!pendingAutoFillData ? (
              // ローディング表示
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: `4px solid ${'var(--color-border-light)'}`,
                  borderTop: '4px solid #60a5fa',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem auto'
                }} />
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
                  <Icon icon={Camera} size={16} decorative /> 写真を解析中...
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  GPS情報・天気・海面水温を取得しています
                </p>
              </div>
            ) : (
              // データ表示
              <>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                  <Icon icon={Camera} size={16} decorative /> 写真から情報を自動入力しますか？
                </h3>

                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                    写真から以下の情報が抽出されました：
                  </p>

                  {pendingAutoFillData.location && (
                    <div style={{ marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
                      <strong><Icon icon={MapPin} size={14} decorative /> 場所:</strong> {pendingAutoFillData.location}
                    </div>
                  )}

                  {pendingAutoFillData.datetime && (
                    <div style={{ marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
                      <strong><Icon icon={Calendar} size={14} decorative /> 撮影日時:</strong> {pendingAutoFillData.datetime.toLocaleString('ja-JP')}
                    </div>
                  )}

                  {pendingAutoFillData.coordinates && (
                    <div style={{ marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
                      <strong><Icon icon={Globe} size={14} decorative /> GPS座標:</strong> {pendingAutoFillData.coordinates.latitude.toFixed(6)}, {pendingAutoFillData.coordinates.longitude.toFixed(6)}
                    </div>
                  )}

                  {pendingAutoFillData.weather && (
                    <div style={{ marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
                      <strong><Icon icon={CloudSun} size={14} decorative /> 天気:</strong> {pendingAutoFillData.weather.description} ({pendingAutoFillData.weather.temperature}°C)
                    </div>
                  )}

                  {pendingAutoFillData.seaTemperature && (
                    <div style={{ marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
                      <strong><Icon icon={Waves} size={14} decorative /> 海面水温:</strong> {pendingAutoFillData.seaTemperature}°C
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={handleAutoFillCancel}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'var(--color-surface-secondary)',
                      color: 'var(--color-text-secondary)',
                      border: `1px solid ${'var(--color-border-light)'}`,
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoFillConfirm}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    自動入力する
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CSS アニメーション */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* フォーカス時のアクセシビリティ */
        input:focus, textarea:focus, button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        /* ホバーエフェクト */
        button:not(:disabled):hover {
          filter: brightness(1.1);
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          .form-container {
            padding: 0.5rem;
            padding-bottom: 10rem; /* モバイルでのPWAバナー対応 */
          }

          input, textarea, button {
            font-size: 16px; /* iOSのズーム防止 */
          }
        }

        /* シンプルなレスポンシブ対応 */
        @media (max-width: 480px) {
          .form-container {
            padding: 1rem;
            margin: 1rem;
            border-radius: 8px;
          }
        }
      `}</style>
    </div>
  );
};