// 画像処理ユーティリティ

import type {
  ImageProcessingOptions,
  ImageProcessingResult,
  SupportedImageType
} from '../types';

import { SUPPORTED_IMAGE_TYPES } from '../types';

export class ImageProcessingService {

  // 画像ファイルのリサイズと圧縮
  async processImage(
    file: File,
    options: ImageProcessingOptions
  ): Promise<ImageProcessingResult> {
    try {
      // ファイル形式の検証
      if (!this.isValidImageType(file.type)) {
        return {
          success: false,
          error: `Unsupported image type: ${file.type}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
        };
      }

      // ファイルサイズの確認
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: `File size too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum size: 10MB`
        };
      }

      // Canvasを使用した画像処理
      const processedBlob = await this.resizeAndCompressImage(file, options);

      return {
        success: true,
        blob: processedBlob
      };
    } catch (error) {
      return {
        success: false,
        error: `Image processing failed: ${error}`
      };
    }
  }

  // サムネイル生成
  async generateThumbnail(
    file: File,
    maxSize: number = 150
  ): Promise<ImageProcessingResult> {
    const thumbnailOptions: ImageProcessingOptions = {
      maxWidth: maxSize,
      maxHeight: maxSize,
      quality: 0.7,
      format: 'image/jpeg'
    };

    return this.processImage(file, thumbnailOptions);
  }

  // 画像の基本情報を取得
  async getImageInfo(file: File): Promise<{
    width: number;
    height: number;
    type: string;
    size: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          type: file.type,
          size: file.size
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  // Base64文字列からBlobに変換
  base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // BlobからBase64文字列に変換
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:image/jpeg;base64, の部分を除去
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // プライベートメソッド: 画像形式の検証
  private isValidImageType(mimeType: string): mimeType is SupportedImageType {
    return SUPPORTED_IMAGE_TYPES.includes(mimeType as SupportedImageType);
  }

  // プライベートメソッド: 画像のリサイズと圧縮
  private async resizeAndCompressImage(
    file: File,
    options: ImageProcessingOptions
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Cannot get canvas context'));
        return;
      }

      img.onload = () => {
        // リサイズ計算
        const { newWidth, newHeight } = this.calculateNewDimensions(
          img.naturalWidth,
          img.naturalHeight,
          options.maxWidth,
          options.maxHeight
        );

        // Canvas設定
        canvas.width = newWidth;
        canvas.height = newHeight;

        // 画像描画（高品質設定）
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Blob生成
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          options.format,
          options.quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      // 画像読み込み開始
      const url = URL.createObjectURL(file);
      img.src = url;
    });
  }

  // プライベートメソッド: リサイズ寸法の計算
  private calculateNewDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { newWidth: number; newHeight: number } {
    let { newWidth, newHeight } = { newWidth: originalWidth, newHeight: originalHeight };

    // 最大サイズを超えている場合のみリサイズ
    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const widthRatio = maxWidth / originalWidth;
      const heightRatio = maxHeight / originalHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      newWidth = Math.round(originalWidth * ratio);
      newHeight = Math.round(originalHeight * ratio);
    }

    return { newWidth, newHeight };
  }
}

// サービスインスタンスのシングルトン
export const imageProcessingService = new ImageProcessingService();