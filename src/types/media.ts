// 画像・メディア処理関連の型定義

/** 画像処理の設定 */
export interface ImageProcessingOptions {
  /** 最大幅（ピクセル） */
  maxWidth: number;
  /** 最大高さ（ピクセル） */
  maxHeight: number;
  /** 圧縮品質（0-1） */
  quality: number;
  /** 出力形式 */
  format: SupportedImageType;
}

/** 画像処理結果 */
export interface ImageProcessingResult {
  /** 処理成功フラグ */
  success: boolean;
  /** 処理済み画像データ */
  blob?: Blob;
  /** エラー情報 */
  error?: string;
}

/** 対応する画像形式 */
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];