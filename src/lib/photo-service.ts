// 写真データアクセスサービス

import { v4 as uuidv4 } from 'uuid';
import { db } from './database';
import { imageProcessingService } from './image-processing';
import { logger } from './errors';
import type {
  PhotoData,
  DatabaseResult,
  ImageProcessingOptions
} from '../types';

export class PhotoService {

  // 写真の保存（ファイルから）
  async savePhoto(
    file: File,
    processingOptions?: Partial<ImageProcessingOptions>
  ): Promise<DatabaseResult<PhotoData>> {
    try {
      // 元ファイルサイズ制限チェック（20MB - 処理前の制限を緩和）
      const maxOriginalSize = 20 * 1024 * 1024;
      if (file.size > maxOriginalSize) {
        logger.error('ファイルサイズオーバー', { sizeMB: Math.round(file.size / 1024 / 1024) });
        return {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds 20MB limit`
          }
        };
      }

      // 画像情報の取得
      const imageInfo = await imageProcessingService.getImageInfo(file);

      // 画像処理オプションの設定
      const defaultOptions: ImageProcessingOptions = {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        format: 'image/jpeg'
      };

      const options = { ...defaultOptions, ...processingOptions };

      // 画像処理
      const processResult = await imageProcessingService.processImage(file, options);
      if (!processResult.success || !processResult.blob) {
        logger.error('画像処理失敗', { error: processResult.error });
        return {
          success: false,
          error: {
            code: 'PROCESSING_FAILED',
            message: processResult.error || 'Image processing failed'
          }
        };
      }

      // サムネイル生成
      const thumbnailResult = await imageProcessingService.generateThumbnail(file, 150);
      if (!thumbnailResult.success || !thumbnailResult.blob) {
        logger.error('サムネイル生成失敗', { error: thumbnailResult.error });
        return {
          success: false,
          error: {
            code: 'THUMBNAIL_FAILED',
            message: thumbnailResult.error || 'Thumbnail generation failed'
          }
        };
      }

      // PhotoDataの作成
      const now = new Date();
      const photoData: PhotoData = {
        id: uuidv4(),
        filename: file.name,
        mimeType: options.format,
        fileSize: processResult.blob.size,
        blob: processResult.blob,
        thumbnailBlob: thumbnailResult.blob,
        uploadedAt: now,
        width: imageInfo.width,
        height: imageInfo.height,
        compressionQuality: options.quality
      };

      // データベースに保存
      await db.photos.add(photoData);

      return {
        success: true,
        data: photoData
      };
    } catch (error) {
      logger.error('写真保存エラー', { error });
      return {
        success: false,
        error: {
          code: 'SAVE_FAILED',
          message: 'Failed to save photo',
          details: error
        }
      };
    }
  }

  // 写真の取得（ID指定）
  async getPhotoById(id: string): Promise<DatabaseResult<PhotoData>> {
    try {
      const photo = await db.photos.get(id);

      if (!photo) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Photo with id ${id} not found`
          }
        };
      }

      return {
        success: true,
        data: photo
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: 'Failed to get photo',
          details: error
        }
      };
    }
  }

  // 写真の一覧取得
  async getPhotos(limit?: number, offset?: number): Promise<DatabaseResult<PhotoData[]>> {
    try {
      let query = db.photos.orderBy('uploadedAt').reverse();

      if (offset) {
        query = query.offset(offset);
      }
      if (limit) {
        query = query.limit(limit);
      }

      const photos = await query.toArray();

      return {
        success: true,
        data: photos
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_PHOTOS_FAILED',
          message: 'Failed to get photos',
          details: error
        }
      };
    }
  }

  // 写真の削除
  async deletePhoto(id: string): Promise<DatabaseResult<void>> {
    try {
      const existingPhoto = await db.photos.get(id);
      if (!existingPhoto) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Photo with id ${id} not found`
          }
        };
      }

      await db.photos.delete(id);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete photo',
          details: error
        }
      };
    }
  }

  // 写真のBlobをData URLに変換（表示用）
  async getPhotoDataUrl(id: string, useThumbnail = false): Promise<DatabaseResult<string>> {
    try {
      const photoResult = await this.getPhotoById(id);
      if (!photoResult.success || !photoResult.data) {
        return {
          success: false,
          error: photoResult.error
        };
      }

      const blob = useThumbnail && photoResult.data.thumbnailBlob
        ? photoResult.data.thumbnailBlob
        : photoResult.data.blob;

      const dataUrl = await this.blobToDataUrl(blob);

      return {
        success: true,
        data: dataUrl
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_DATAURL_FAILED',
          message: 'Failed to convert photo to data URL',
          details: error
        }
      };
    }
  }

  // 写真のメタデータのみ取得（Blob除外で軽量化）
  async getPhotoMetadata(id: string): Promise<DatabaseResult<Omit<PhotoData, 'blob' | 'thumbnailBlob'>>> {
    try {
      const photo = await db.photos.get(id);

      if (!photo) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Photo with id ${id} not found`
          }
        };
      }

      // Blobを除いたメタデータのみを返す
      const { blob: _, thumbnailBlob: __, ...metadata } = photo;

      return {
        success: true,
        data: metadata
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_METADATA_FAILED',
          message: 'Failed to get photo metadata',
          details: error
        }
      };
    }
  }

  // 全写真のメタデータ一覧取得（軽量版）
  async getPhotosMetadata(limit?: number): Promise<DatabaseResult<Omit<PhotoData, 'blob' | 'thumbnailBlob'>[]>> {
    try {
      let query = db.photos.orderBy('uploadedAt').reverse();

      if (limit) {
        query = query.limit(limit);
      }

      const photos = await query.toArray();

      // Blobを除いたメタデータのみの配列に変換
      const metadata = photos.map(({ blob: _, thumbnailBlob: __, ...meta }) => meta);

      return {
        success: true,
        data: metadata
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_METADATA_LIST_FAILED',
          message: 'Failed to get photos metadata',
          details: error
        }
      };
    }
  }

  // 統計情報の取得
  async getPhotoStatistics(): Promise<DatabaseResult<{
    totalPhotos: number;
    totalSize: number;
    averageSize: number;
    oldestPhoto: Date | null;
    newestPhoto: Date | null;
  }>> {
    try {
      const allPhotos = await db.photos.toArray();

      if (allPhotos.length === 0) {
        return {
          success: true,
          data: {
            totalPhotos: 0,
            totalSize: 0,
            averageSize: 0,
            oldestPhoto: null,
            newestPhoto: null
          }
        };
      }

      const totalSize = allPhotos.reduce((sum, photo) => sum + photo.fileSize, 0);
      const uploadDates = allPhotos.map(photo => photo.uploadedAt);

      const statistics = {
        totalPhotos: allPhotos.length,
        totalSize,
        averageSize: totalSize / allPhotos.length,
        oldestPhoto: new Date(Math.min(...uploadDates.map(d => d.getTime()))),
        newestPhoto: new Date(Math.max(...uploadDates.map(d => d.getTime())))
      };

      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_STATISTICS_FAILED',
          message: 'Failed to get photo statistics',
          details: error
        }
      };
    }
  }

  // プライベートメソッド: BlobをData URLに変換
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// サービスインスタンスのシングルトン
export const photoService = new PhotoService();