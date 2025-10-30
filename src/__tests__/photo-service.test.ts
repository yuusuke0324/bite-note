// 写真サービスの単体テスト

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhotoService } from '../lib/photo-service';

// モック設定
vi.mock('../lib/database', () => ({
  db: {
    photos: {
      add: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => ({
              toArray: vi.fn()
            })),
            toArray: vi.fn()
          })),
          offset: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn()
            })),
            toArray: vi.fn()
          })),
          toArray: vi.fn()
        })),
        toArray: vi.fn()
      })),
      toArray: vi.fn()
    }
  }
}));

vi.mock('../lib/image-processing', () => ({
  imageProcessingService: {
    getImageInfo: vi.fn(),
    processImage: vi.fn(),
    generateThumbnail: vi.fn()
  }
}));

// File と FileReader のモック
global.File = class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(bits: any[], filename: string, options: any = {}) {
    this.name = filename;
    this.size = bits.reduce((acc, bit) => acc + (bit.length || 0), 0);
    this.type = options.type || '';
  }
} as any;

global.FileReader = class MockFileReader {
  result: any = null;
  onload: any = null;
  onerror: any = null;

  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,test-data';
      if (this.onload) this.onload();
    }, 0);
  }
} as any;

describe('PhotoService', () => {
  let service: PhotoService;

  beforeEach(() => {
    service = new PhotoService();
    vi.clearAllMocks();
  });

  describe('savePhoto', () => {
    it('有効な画像ファイルを保存できる', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['processed'], { type: 'image/jpeg' });
      const mockThumbnailBlob = new Blob(['thumbnail'], { type: 'image/jpeg' });

      // モックの設定
      const imageProcessing = await import('../lib/image-processing');
      vi.mocked(imageProcessing.imageProcessingService.getImageInfo).mockResolvedValue({
        width: 1920,
        height: 1080
      });
      vi.mocked(imageProcessing.imageProcessingService.processImage).mockResolvedValue({
        success: true,
        blob: mockBlob
      });
      vi.mocked(imageProcessing.imageProcessingService.generateThumbnail).mockResolvedValue({
        success: true,
        blob: mockThumbnailBlob
      });

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.add).mockResolvedValue('test-id');

      const result = await service.savePhoto(mockFile);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.filename).toBe('test.jpg');
        expect(result.data.mimeType).toBe('image/jpeg');
        expect(result.data.width).toBe(1920);
        expect(result.data.height).toBe(1080);
      }
    });

    it('ファイルサイズが制限を超える場合はエラーを返す', async () => {
      // 20MBを超える大きなファイルを作成（実装の制限は20MB）
      const largeContent = new Array(21 * 1024 * 1024).fill('a').join('');
      const mockFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });

      const result = await service.savePhoto(mockFile);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_TOO_LARGE');
    });

    it('画像処理に失敗した場合はエラーを返す', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const imageProcessing = await import('../lib/image-processing');
      vi.mocked(imageProcessing.imageProcessingService.getImageInfo).mockResolvedValue({
        width: 1920,
        height: 1080
      });
      vi.mocked(imageProcessing.imageProcessingService.processImage).mockResolvedValue({
        success: false,
        error: 'Processing failed'
      });

      const result = await service.savePhoto(mockFile);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROCESSING_FAILED');
    });

    it('サムネイル生成に失敗した場合はエラーを返す', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['processed'], { type: 'image/jpeg' });

      const imageProcessing = await import('../lib/image-processing');
      vi.mocked(imageProcessing.imageProcessingService.getImageInfo).mockResolvedValue({
        width: 1920,
        height: 1080
      });
      vi.mocked(imageProcessing.imageProcessingService.processImage).mockResolvedValue({
        success: true,
        blob: mockBlob
      });
      vi.mocked(imageProcessing.imageProcessingService.generateThumbnail).mockResolvedValue({
        success: false,
        error: 'Thumbnail generation failed'
      });

      const result = await service.savePhoto(mockFile);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('THUMBNAIL_FAILED');
    });
  });

  describe('getPhotoById', () => {
    it('存在する写真を取得できる', async () => {
      const mockPhoto = {
        id: 'test-id',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1000,
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        thumbnailBlob: new Blob(['thumb'], { type: 'image/jpeg' }),
        uploadedAt: new Date(),
        width: 1920,
        height: 1080,
        compressionQuality: 0.8
      };

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.get).mockResolvedValue(mockPhoto);

      const result = await service.getPhotoById('test-id');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPhoto);
    });

    it('存在しない写真の場合はエラーを返す', async () => {
      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.get).mockResolvedValue(undefined);

      const result = await service.getPhotoById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('deletePhoto', () => {
    it('既存の写真を削除できる', async () => {
      const mockPhoto = {
        id: 'test-id',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1000,
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        thumbnailBlob: new Blob(['thumb'], { type: 'image/jpeg' }),
        uploadedAt: new Date(),
        width: 1920,
        height: 1080,
        compressionQuality: 0.8
      };

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.get).mockResolvedValue(mockPhoto);
      vi.mocked(mockDb.db.photos.delete).mockResolvedValue();

      const result = await service.deletePhoto('test-id');

      expect(result.success).toBe(true);
    });

    it('存在しない写真の削除はエラーを返す', async () => {
      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.get).mockResolvedValue(undefined);

      const result = await service.deletePhoto('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('getPhotoStatistics', () => {
    it('空のデータベースでは正しい統計を返す', async () => {
      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.toArray).mockResolvedValue([]);

      const result = await service.getPhotoStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.totalPhotos).toBe(0);
      expect(result.data?.totalSize).toBe(0);
      expect(result.data?.averageSize).toBe(0);
    });

    it('データがある場合は正しい統計を計算する', async () => {
      const mockPhotos = [
        {
          id: '1',
          filename: 'photo1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1000,
          blob: new Blob(),
          thumbnailBlob: new Blob(),
          uploadedAt: new Date('2023-10-01'),
          width: 1920,
          height: 1080,
          compressionQuality: 0.8
        },
        {
          id: '2',
          filename: 'photo2.jpg',
          mimeType: 'image/jpeg',
          fileSize: 2000,
          blob: new Blob(),
          thumbnailBlob: new Blob(),
          uploadedAt: new Date('2023-10-02'),
          width: 1920,
          height: 1080,
          compressionQuality: 0.8
        }
      ];

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.toArray).mockResolvedValue(mockPhotos);

      const result = await service.getPhotoStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.totalPhotos).toBe(2);
      expect(result.data?.totalSize).toBe(3000);
      expect(result.data?.averageSize).toBe(1500);
    });
  });

  describe('getPhotoDataUrl', () => {
    it('写真のData URLを取得できる', async () => {
      const mockPhoto = {
        id: 'test-id',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1000,
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        thumbnailBlob: new Blob(['thumb'], { type: 'image/jpeg' }),
        uploadedAt: new Date(),
        width: 1920,
        height: 1080,
        compressionQuality: 0.8
      };

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.get).mockResolvedValue(mockPhoto);

      const result = await service.getPhotoDataUrl('test-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe('data:image/jpeg;base64,test-data');
    });

    it('サムネイルのData URLを取得できる', async () => {
      const mockPhoto = {
        id: 'test-id',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1000,
        blob: new Blob(['test'], { type: 'image/jpeg' }),
        thumbnailBlob: new Blob(['thumb'], { type: 'image/jpeg' }),
        uploadedAt: new Date(),
        width: 1920,
        height: 1080,
        compressionQuality: 0.8
      };

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.get).mockResolvedValue(mockPhoto);

      const result = await service.getPhotoDataUrl('test-id', true);

      expect(result.success).toBe(true);
      expect(result.data).toBe('data:image/jpeg;base64,test-data');
    });
  });
});