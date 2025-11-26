// React Hook Form + Zod 統合フック

import { useForm, type UseFormReturn, type FieldValues, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useCallback } from 'react';
import React from 'react';
import { useFormStore } from '../stores/form-store';
import { useAppStore } from '../stores/app-store';
import { createFishingRecordSchema, appSettingsSchema, recordFilterSchema } from '../lib/validation';
import { logger } from '../lib/errors/logger';

// カスタムフックの型定義
interface UseValidatedFormOptions<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  defaultValues?: DefaultValues<T>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
}

interface UseValidatedFormReturn<T extends FieldValues> extends UseFormReturn<T> {
  isSubmitting: boolean;
  submitWithValidation: (onValidSubmit: (data: T) => Promise<void> | void) => Promise<void>;
  validateField: (fieldName: keyof T, value: unknown) => Promise<string | undefined>;
  hasUnsavedChanges: boolean;
  resetWithConfirm: () => Promise<boolean>;
}

// メインのバリデーションフック
export function useValidatedForm<T extends FieldValues>({
  schema,
  defaultValues,
  mode = 'onChange',
  reValidateMode = 'onChange'
}: UseValidatedFormOptions<T>): UseValidatedFormReturn<T> {

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
    reValidateMode,
    criteriaMode: 'all', // すべてのエラーを収集
    shouldFocusError: true, // エラー時に最初のエラーフィールドにフォーカス
    shouldUnregister: false // アンマウント時にフィールドを保持
  });

  // 初期マウント時にバリデーションを実行
  React.useEffect(() => {
    // 初期値でバリデーションを実行して isValid を正しく設定
    form.trigger();
  }, []); // 空の依存配列で初回のみ実行

  const { formState, reset } = form;

  // フィールドの変更を監視 (必要に応じてコメントアウト)
  // const watchedValues = watch();

  // 未保存の変更があるかチェック
  React.useEffect(() => {
    setHasUnsavedChanges(formState.isDirty);
  }, [formState.isDirty]);

  // バリデーション付きフォーム送信
  const submitWithValidation = useCallback(async (
    onValidSubmit: (data: T) => Promise<void> | void
  ) => {
    try {
      setIsSubmitting(true);

      const isValid = await form.trigger();
      if (!isValid) {
        logger.warn('Form validation failed', { errors: form.formState.errors });
        return;
      }

      const data = form.getValues();
      await onValidSubmit(data);

      // 送信成功後はフォームをクリーンな状態にリセット
      setHasUnsavedChanges(false);

    } catch (error) {
      logger.error('Form submission failed', { error });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

  // 個別フィールドのバリデーション
  const validateField = useCallback(async (
    fieldName: keyof T,
    value: unknown
  ): Promise<string | undefined> => {
    try {
      // 部分的なスキーマでバリデーション
      const fieldSchema = z.object({ [fieldName]: z.any() });
      const result = await fieldSchema.safeParseAsync({ [fieldName]: value });

      if (!result.success) {
        const error = result.error.errors[0];
        return error?.message;
      }

      return undefined;
    } catch (error) {
      logger.error('Field validation failed', { error });
      return 'バリデーションエラー';
    }
  }, [schema]);

  // 確認付きリセット
  const resetWithConfirm = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedChanges) {
      reset(defaultValues);
      return true;
    }

    const confirmed = window.confirm(
      '未保存の変更があります。本当にリセットしますか？'
    );

    if (confirmed) {
      reset(defaultValues);
      setHasUnsavedChanges(false);
      return true;
    }

    return false;
  }, [hasUnsavedChanges, reset, defaultValues]);

  return {
    ...form,
    isSubmitting,
    submitWithValidation,
    validateField,
    hasUnsavedChanges,
    resetWithConfirm
  };
}

// 釣果記録フォーム専用フック
export function useFishingRecordForm(defaultValues?: Partial<Record<string, unknown>>) {
  const formStore = useFormStore();

  const form = useValidatedForm({
    schema: createFishingRecordSchema,
    defaultValues: (defaultValues || formStore.formData) as any,
    mode: 'onChange'
  });

  // Zustandストアとの同期
  const syncWithStore = useCallback((data: Record<string, unknown>) => {
    Object.entries(data).forEach(([field, value]) => {
      formStore.actions.updateField(field as any, value);
    });
  }, [formStore.actions]);

  // GPS位置取得の統合
  const getCurrentLocation = useCallback(async () => {
    await formStore.actions.getCurrentLocation();

    // GPS取得後にフォームに反映
    if (formStore.formData.coordinates) {
      form.setValue('coordinates', formStore.formData.coordinates);
    }
  }, [formStore.actions, formStore.formData.coordinates, form]);

  // 写真アップロードの統合
  const uploadPhoto = useCallback(async (file: File) => {
    formStore.actions.setPhotoFile(file);
    const photoId = await formStore.actions.uploadPhoto();

    if (photoId) {
      form.setValue('photoId', photoId);
    }

    return photoId;
  }, [formStore.actions, form]);

  // フォーム送信の統合
  const submitForm = useCallback(async () => {
    return form.submitWithValidation(async (data) => {
      // Zustandストアに同期
      syncWithStore(data);

      // ストア経由で送信
      const success = await formStore.actions.submitForm();
      if (!success) {
        throw new Error('フォームの送信に失敗しました');
      }
    });
  }, [form, syncWithStore, formStore.actions]);

  return {
    ...form,
    // 拡張メソッド
    getCurrentLocation,
    uploadPhoto,
    submitForm,
    // ストアの状態
    gpsLoading: formStore.gpsLoading,
    gpsError: formStore.gpsError,
    photoFile: formStore.photoFile,
    photoPreview: formStore.photoPreview,
    photoUploading: formStore.photoUploading
  };
}

// 設定フォーム専用フック
export function useAppSettingsForm() {
  const appStore = useAppStore();

  return useValidatedForm({
    schema: appSettingsSchema,
    defaultValues: appStore.settings,
    mode: 'onBlur'
  });
}

// フィルターフォーム専用フック
export function useRecordFilterForm() {

  return useValidatedForm({
    schema: recordFilterSchema,
    defaultValues: {},
    mode: 'onChange'
  });
}

// カスタムバリデーションルール
export const customValidationRules = {
  // 日付が未来ではないことを確認
  notFutureDate: (value: string) => {
    const date = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (date > today) {
      return '未来の日付は入力できません';
    }
    return true;
  },

  // ファイルサイズ制限
  maxFileSize: (maxSizeMB: number) => (file: File) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return `ファイルサイズは${maxSizeMB}MB以下にしてください`;
    }
    return true;
  },

  // 画像ファイル形式チェック
  imageFileType: (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return '対応している画像形式: JPEG, PNG, WebP';
    }
    return true;
  }
};