// フォーム状態管理

import { create } from 'zustand';
import { fishingRecordService } from '../lib/fishing-record-service';
import { photoService } from '../lib/photo-service';
import { geolocationService } from '../lib/geolocation-service';
import { useAppStore } from './app-store';
import type {
  CreateFishingRecordForm,
  FormValidationResult,
  ImageProcessingOptions
} from '../types';

interface FormStore {
  // フォームデータ
  formData: CreateFishingRecordForm;
  validation: FormValidationResult;

  // フォーム状態
  isSubmitting: boolean;
  isDirty: boolean;

  // GPS関連
  gpsLoading: boolean;
  gpsError: string | undefined;

  // 写真関連
  photoFile: File | undefined;
  photoPreview: string | undefined;
  photoUploading: boolean;

  // アクション
  actions: {
    // フォーム管理
    updateField: <K extends keyof CreateFishingRecordForm>(
      field: K,
      value: CreateFishingRecordForm[K]
    ) => void;
    resetForm: () => void;
    setDirty: (dirty: boolean) => void;

    // バリデーション
    validateForm: () => FormValidationResult;
    clearValidation: () => void;

    // GPS
    getCurrentLocation: () => Promise<void>;
    clearLocation: () => void;

    // 写真
    setPhotoFile: (file: File | undefined) => void;
    uploadPhoto: () => Promise<string | undefined>;
    clearPhoto: () => void;

    // 送信
    submitForm: () => Promise<boolean>;
  };
}

const initialFormData: CreateFishingRecordForm = {
  date: new Date().toISOString().split('T')[0],
  location: '',
  fishSpecies: '',
  useGPS: true
};

const initialValidation: FormValidationResult = {
  isValid: true,
  errors: {}
};

export const useFormStore = create<FormStore>()((set, get) => ({
  // 初期状態
  formData: initialFormData,
  validation: initialValidation,
  isSubmitting: false,
  isDirty: false,
  gpsLoading: false,
  gpsError: undefined,
  photoFile: undefined,
  photoPreview: undefined,
  photoUploading: false,

  actions: {
    // フィールドの更新
    updateField: (field, value) => {
      set((state) => ({
        formData: { ...state.formData, [field]: value },
        isDirty: true
      }));

      // リアルタイムバリデーション
      const { actions } = get();
      actions.validateForm();
    },

    // フォームのリセット
    resetForm: () => {
      set({
        formData: initialFormData,
        validation: initialValidation,
        isDirty: false,
        gpsError: undefined,
        photoFile: undefined,
        photoPreview: undefined
      });
    },

    // ダーティフラグの設定
    setDirty: (dirty: boolean) => {
      set({ isDirty: dirty });
    },

    // フォームバリデーション
    validateForm: () => {
      const { formData } = get();
      const errors: Record<string, string> = {};

      // 必須フィールドのチェック
      if (!formData.date) {
        errors.date = '日付は必須です';
      }

      if (!formData.location.trim()) {
        errors.location = '場所は必須です';
      } else if (formData.location.length > 100) {
        errors.location = '場所は100文字以内で入力してください';
      }

      if (!formData.fishSpecies.trim()) {
        errors.fishSpecies = '魚種は必須です';
      } else if (formData.fishSpecies.length > 100) {
        errors.fishSpecies = '魚種は100文字以内で入力してください';
      }

      // サイズのバリデーション
      if (formData.size !== undefined) {
        if (formData.size < 0) {
          errors.size = 'サイズは0以上で入力してください';
        } else if (formData.size > 999) {
          errors.size = 'サイズは999cm以下で入力してください';
        }
      }

      // メモのバリデーション
      if (formData.notes && formData.notes.length > 500) {
        errors.notes = 'メモは500文字以内で入力してください';
      }

      const validation: FormValidationResult = {
        isValid: Object.keys(errors).length === 0,
        errors
      };

      set({ validation });
      return validation;
    },

    // バリデーションのクリア
    clearValidation: () => {
      set({ validation: initialValidation });
    },

    // 現在位置の取得
    getCurrentLocation: async () => {
      const { formData, actions } = get();

      if (!formData.useGPS) return;

      try {
        set({ gpsLoading: true, gpsError: undefined });

        const result = await geolocationService.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });

        if (result.success && result.coordinates) {
          actions.updateField('coordinates', result.coordinates);
        } else {
          const errorMessage = result.error?.message || 'GPS取得に失敗しました';
          set({ gpsError: errorMessage });
        }
      } catch {
        set({ gpsError: 'GPS取得中にエラーが発生しました' });
      } finally {
        set({ gpsLoading: false });
      }
    },

    // 位置情報のクリア
    clearLocation: () => {
      const { actions } = get();
      actions.updateField('coordinates', undefined);
      set({ gpsError: undefined });
    },

    // 写真ファイルの設定
    setPhotoFile: (file: File | undefined) => {
      if (file) {
        // プレビュー用のオブジェクトURL作成
        const previewUrl = URL.createObjectURL(file);
        set({
          photoFile: file,
          photoPreview: previewUrl,
          isDirty: true
        });
      } else {
        // 既存のプレビューURLをクリーンアップ
        const { photoPreview } = get();
        if (photoPreview) {
          URL.revokeObjectURL(photoPreview);
        }
        set({
          photoFile: undefined,
          photoPreview: undefined
        });
      }
    },

    // 写真のアップロード
    uploadPhoto: async (): Promise<string | undefined> => {
      const { photoFile } = get();

      if (!photoFile) return undefined;

      try {
        set({ photoUploading: true });

        const processingOptions: Partial<ImageProcessingOptions> = {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
          format: 'image/jpeg'
        };

        const result = await photoService.savePhoto(photoFile, processingOptions);

        if (result.success && result.data) {
          return result.data.id;
        } else {
          throw new Error(result.error?.message || '写真のアップロードに失敗しました');
        }
      } finally {
        set({ photoUploading: false });
      }
    },

    // 写真のクリア
    clearPhoto: () => {
      const { actions } = get();
      actions.setPhotoFile(undefined);
    },

    // フォーム送信
    submitForm: async (): Promise<boolean> => {
      const { formData, actions } = get();

      try {
        set({ isSubmitting: true });

        // 最終バリデーション
        const validation = actions.validateForm();
        if (!validation.isValid) {
          return false;
        }

        // 写真のアップロード（必要な場合）
        let photoId: string | undefined = formData.photoId; // 既存のphotoIdを優先
        if (get().photoFile && !photoId) {
          // photoFileがあり、既存のphotoIdがない場合のみアップロード
          photoId = await actions.uploadPhoto();
        }
        console.log('💾 Final photoId for record:', photoId);

        // 記録の作成
        const recordData = {
          ...formData,
          photoId
        };
        console.log('💾 Creating record with data:', recordData);

        const result = await fishingRecordService.createRecord(recordData);

        if (result.success) {
          // 成功時の処理
          actions.resetForm();

          // アプリストアの記録一覧を更新
          const appActions = useAppStore.getState().actions;
          await appActions.refreshRecords();

          return true;
        } else {
          throw new Error(result.error?.message || '記録の保存に失敗しました');
        }
      } catch (error) {
        console.error('Form submission failed:', error);

        // エラーをアプリストアに設定
        const appActions = useAppStore.getState().actions;
        appActions.setError(error instanceof Error ? error.message : '送信に失敗しました');

        return false;
      } finally {
        set({ isSubmitting: false });
      }
    }
  }
}));

// セレクタのエクスポート
export const selectFormData = (state: FormStore) => state.formData;
export const selectValidation = (state: FormStore) => state.validation;
export const selectIsSubmitting = (state: FormStore) => state.isSubmitting;
export const selectIsDirty = (state: FormStore) => state.isDirty;
export const selectGpsLoading = (state: FormStore) => state.gpsLoading;
export const selectGpsError = (state: FormStore) => state.gpsError;
export const selectPhotoFile = (state: FormStore) => state.photoFile;
export const selectPhotoPreview = (state: FormStore) => state.photoPreview;
export const selectPhotoUploading = (state: FormStore) => state.photoUploading;
export const selectFormActions = (state: FormStore) => state.actions;