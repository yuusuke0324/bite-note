// フォームバリデーションスキーマ

import { z } from 'zod';

// 釣果記録作成フォームのスキーマ
export const createFishingRecordSchema = z.object({
  date: z
    .string()
    .min(1, '釣行日時は必須です')
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, '正しい日時形式で入力してください'),

  location: z
    .string()
    .min(1, '場所は必須です')
    .max(100, '場所は100文字以内で入力してください')
    .trim(),

  fishSpecies: z
    .string()
    .min(1, '魚種は必須です')
    .max(100, '魚種は100文字以内で入力してください')
    .trim(),

  size: z.preprocess(
    (val) => {
      // 空文字列、NaN、null、undefinedをundefinedに変換
      if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
        return undefined;
      }
      return val;
    },
    z.number()
      .min(0, 'サイズは0以上で入力してください')
      .max(999, 'サイズは999cm以下で入力してください')
      .optional()
  ),

  weight: z.preprocess(
    (val) => {
      // 空文字列、NaN、null、undefinedをundefinedに変換
      if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
        return undefined;
      }
      return val;
    },
    z.number()
      .min(0, '重量は0以上で入力してください')
      .max(99999, '重量は99999g以下で入力してください')
      .optional()
  ),

  seaTemperature: z.preprocess(
    (val) => {
      // 空文字列、NaN、null、undefinedをundefinedに変換
      if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
        return undefined;
      }
      return val;
    },
    z.number()
      .min(0, '海面水温は0°C以上で入力してください')
      .max(50, '海面水温は50°C以下で入力してください')
      .optional()
  ),

  weather: z
    .string()
    .max(100, '天気は100文字以内で入力してください')
    .optional(),

  notes: z
    .string()
    .max(500, 'メモは500文字以内で入力してください')
    .optional(),

  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).optional()
    })
    .optional(),

  useGPS: z.boolean().default(true),

  photoId: z.string().optional()
});

// 釣果記録更新フォームのスキーマ
export const updateFishingRecordSchema = createFishingRecordSchema
  .omit({ useGPS: true })
  .partial();

// フォームデータの型推論
export type CreateFishingRecordFormData = z.infer<typeof createFishingRecordSchema>;
export type UpdateFishingRecordFormData = z.infer<typeof updateFishingRecordSchema>;

// GPS設定フォームのスキーマ
export const gpsSettingsSchema = z.object({
  enableGPS: z.boolean().default(true),
  enableHighAccuracy: z.boolean().default(true),
  timeout: z.number().min(1000).max(60000).default(10000),
  maximumAge: z.number().min(0).max(3600000).default(300000)
});

export type GPSSettingsFormData = z.infer<typeof gpsSettingsSchema>;

// アプリ設定フォームのスキーマ
export const appSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  defaultSort: z.enum(['date', 'createdAt', 'location', 'fishSpecies', 'size']).default('date'),
  defaultUseGPS: z.boolean().default(true),
  imageQuality: z.number().min(0.1).max(1.0).default(0.8),
  maxImageSize: z.number().min(1).max(50).default(5)
});

export type AppSettingsFormData = z.infer<typeof appSettingsSchema>;

// 検索フィルターのスキーマ
export const recordFilterSchema = z.object({
  dateRange: z
    .object({
      start: z.date(),
      end: z.date()
    })
    .optional(),

  fishSpecies: z.array(z.string()).optional(),

  locations: z.array(z.string()).optional(),

  sizeRange: z
    .object({
      min: z.number().min(0),
      max: z.number().max(999)
    })
    .optional(),

  hasPhoto: z.boolean().optional(),

  hasGPS: z.boolean().optional()
});

export type RecordFilterFormData = z.infer<typeof recordFilterSchema>;

// エクスポート/インポート設定のスキーマ
export const exportSettingsSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  includePhotos: z.boolean().default(true),
  includeSettings: z.boolean().default(false),
  dateRange: z
    .object({
      start: z.date(),
      end: z.date()
    })
    .optional()
});

export type ExportSettingsFormData = z.infer<typeof exportSettingsSchema>;

// バリデーションヘルパー関数
export const validateCreateFishingRecord = (data: unknown) => {
  return createFishingRecordSchema.safeParse(data);
};

export const validateUpdateFishingRecord = (data: unknown) => {
  return updateFishingRecordSchema.safeParse(data);
};

export const validateAppSettings = (data: unknown) => {
  return appSettingsSchema.safeParse(data);
};

export const validateRecordFilter = (data: unknown) => {
  return recordFilterSchema.safeParse(data);
};

// カスタムバリデーター
export const customValidators = {
  // 日付が未来ではないことを確認
  isNotFutureDate: (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 今日の終わりまで許可
    return date <= today;
  },

  // 緯度経度が有効な範囲内かチェック
  isValidCoordinates: (lat: number, lng: number) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  },

  // ファイルサイズが制限内かチェック
  isValidFileSize: (file: File, maxSizeMB: number = 10) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  },

  // 画像ファイルかチェック
  isImageFile: (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    return allowedTypes.includes(file.type);
  }
};

// エラーメッセージのローカライゼーション
export const errorMessages = {
  required: '必須項目です',
  invalid_type: '無効な形式です',
  too_small: '値が小さすぎます',
  too_big: '値が大きすぎます',
  invalid_string: '無効な文字列です',
  invalid_date: '無効な日付です',
  future_date: '未来の日付は入力できません',
  invalid_coordinates: '無効な座標です',
  file_too_large: 'ファイルサイズが大きすぎます',
  invalid_file_type: '対応していないファイル形式です'
} as const;