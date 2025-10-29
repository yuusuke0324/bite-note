// 画像最適化ユーティリティ

export class ImageOptimizer {
  private readonly MAX_WIDTH = 1920;
  private readonly MAX_HEIGHT = 1080;
  private readonly DEFAULT_QUALITY = 0.8;
  private readonly THUMBNAIL_SIZE = 150;

  /**
   * 画像を指定された品質で圧縮
   */
  async compressImage(file: File, quality: number = this.DEFAULT_QUALITY): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        // 元のサイズを維持
        canvas.width = img.width;
        canvas.height = img.height;

        // 画像を描画
        ctx.drawImage(img, 0, 0);

        // 圧縮された画像を取得
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 画像を指定されたサイズにリサイズ
   */
  async resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        // アスペクト比を維持してリサイズ
        const { width, height } = this.calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // 高品質でリサイズ
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          file.type,
          this.DEFAULT_QUALITY
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 画像をWebP形式に変換
   */
  async convertToWebP(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const webpFile = new File([blob], this.getWebPFileName(file.name), {
                type: 'image/webp',
                lastModified: Date.now()
              });
              resolve(webpFile);
            } else {
              reject(new Error('Failed to convert to WebP'));
            }
          },
          'image/webp',
          this.DEFAULT_QUALITY
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * サムネイル画像を生成
   */
  async generateThumbnail(file: File, size: number = this.THUMBNAIL_SIZE): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        // 正方形のサムネイルを生成
        canvas.width = size;
        canvas.height = size;

        // 中央でクロップ
        const { sourceX, sourceY, sourceSize } = this.calculateCropDimensions(
          img.width,
          img.height
        );

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          size,
          size
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnailFile = new File([blob], this.getThumbnailFileName(file.name), {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(thumbnailFile);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          },
          file.type,
          this.DEFAULT_QUALITY
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 画像の詳細情報を取得
   */
  async getImageInfo(file: File): Promise<{
    width: number;
    height: number;
    aspectRatio: number;
    size: number;
    type: string;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          size: file.size,
          type: file.type
        });
      };

      img.onerror = () => reject(new Error('Failed to load image for info'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 複数の最適化を一括実行
   */
  async optimizeImage(file: File, options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    convertToWebP?: boolean;
    generateThumbnail?: boolean;
    progressive?: boolean;
  } = {}): Promise<{
    optimized: File;
    thumbnail?: File;
    webp?: File;
    info: {
      originalSize: number;
      optimizedSize: number;
      compressionRatio: number;
    };
  }> {
    const {
      maxWidth = this.MAX_WIDTH,
      maxHeight = this.MAX_HEIGHT,
      quality = this.DEFAULT_QUALITY,
      convertToWebP = false,
      generateThumbnail = false
    } = options;

    const originalSize = file.size;

    // メイン画像の最適化
    let optimized = await this.resizeImage(file, maxWidth, maxHeight);
    optimized = await this.compressImage(optimized, quality);

    const result: {
      optimized: File;
      thumbnail?: File;
      webp?: File;
      info: {
        originalSize: number;
        optimizedSize: number;
        compressionRatio: number;
      };
    } = {
      optimized,
      info: {
        originalSize,
        optimizedSize: optimized.size,
        compressionRatio: Math.round((1 - optimized.size / originalSize) * 100)
      }
    };

    // サムネイル生成
    if (generateThumbnail) {
      result.thumbnail = await this.generateThumbnail(file);
    }

    // WebP変換
    if (convertToWebP) {
      result.webp = await this.convertToWebP(optimized);
    }

    return result;
  }

  /**
   * WebPサポートチェック
   */
  async supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;

      canvas.toBlob(
        (blob) => {
          resolve(blob?.type === 'image/webp');
        },
        'image/webp',
        0.1
      );
    });
  }

  // プライベートメソッド

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ) {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  private calculateCropDimensions(width: number, height: number) {
    const size = Math.min(width, height);
    const sourceX = (width - size) / 2;
    const sourceY = (height - size) / 2;

    return {
      sourceX,
      sourceY,
      sourceSize: size
    };
  }

  private getWebPFileName(originalName: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}.webp`;
  }

  private getThumbnailFileName(originalName: string): string {
    const ext = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}_thumb.${ext}`;
  }
}