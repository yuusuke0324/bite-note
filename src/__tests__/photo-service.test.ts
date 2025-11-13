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

    it('カスタムオプションで保存できる', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['processed'], { type: 'image/webp' });
      const mockThumbnailBlob = new Blob(['thumbnail'], { type: 'image/webp' });

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

      const result = await service.savePhoto(mockFile, {
        maxWidth: 800,
        quality: 0.9,
        format: 'image/webp'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.compressionQuality).toBe(0.9);
        expect(result.data.mimeType).toBe('image/webp');
      }
      expect(imageProcessing.imageProcessingService.processImage).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          maxWidth: 800,
          quality: 0.9,
          format: 'image/webp'
        })
      );
    });

    it('PhotoDataの全フィールドが正しく設定される', async () => {
      const mockFile = new File(['test'], 'custom-photo.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['processed-content'], { type: 'image/jpeg' });
      const mockThumbnailBlob = new Blob(['thumb-content'], { type: 'image/jpeg' });

      const imageProcessing = await import('../lib/image-processing');
      vi.mocked(imageProcessing.imageProcessingService.getImageInfo).mockResolvedValue({
        width: 2560,
        height: 1440
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
      vi.mocked(mockDb.db.photos.add).mockResolvedValue('generated-id');

      const beforeSave = Date.now();
      const result = await service.savePhoto(mockFile);
      const afterSave = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        // 全フィールドの検証
        expect(result.data.id).toBeDefined();
        expect(typeof result.data.id).toBe('string');
        expect(result.data.filename).toBe('custom-photo.jpg');
        expect(result.data.mimeType).toBe('image/jpeg');
        expect(result.data.fileSize).toBe(mockBlob.size);
        expect(result.data.blob).toBe(mockBlob);
        expect(result.data.thumbnailBlob).toBe(mockThumbnailBlob);
        expect(result.data.width).toBe(2560);
        expect(result.data.height).toBe(1440);
        expect(result.data.compressionQuality).toBe(0.8); // デフォルト値
        expect(result.data.uploadedAt).toBeInstanceOf(Date);
        expect(result.data.uploadedAt.getTime()).toBeGreaterThanOrEqual(beforeSave);
        expect(result.data.uploadedAt.getTime()).toBeLessThanOrEqual(afterSave);
      }
    });

    it('IndexedDB保存失敗時はエラーを返す', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['processed'], { type: 'image/jpeg' });
      const mockThumbnailBlob = new Blob(['thumbnail'], { type: 'image/jpeg' });

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
      vi.mocked(mockDb.db.photos.add).mockRejectedValue(new Error('Database constraint violation'));

      const result = await service.savePhoto(mockFile);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SAVE_FAILED');
      expect(result.error?.message).toContain('Failed to save photo');
    });

    it('ファイルサイズ19.9MBは許可される', async () => {
      // 19.9MB = 20,860,928 bytes
      const content = new Array(20860928).fill('a').join('');
      const mockFile = new File([content], 'large-photo.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['processed'], { type: 'image/jpeg' });
      const mockThumbnailBlob = new Blob(['thumbnail'], { type: 'image/jpeg' });

      const imageProcessing = await import('../lib/image-processing');
      vi.mocked(imageProcessing.imageProcessingService.getImageInfo).mockResolvedValue({
        width: 4096,
        height: 3072
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
    });

    it('ファイルサイズちょうど20MBは許可される', async () => {
      // 20MB = 20,971,520 bytes
      const content = new Array(20971520).fill('a').join('');
      const mockFile = new File([content], 'exact-20mb.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['processed'], { type: 'image/jpeg' });
      const mockThumbnailBlob = new Blob(['thumbnail'], { type: 'image/jpeg' });

      const imageProcessing = await import('../lib/image-processing');
      vi.mocked(imageProcessing.imageProcessingService.getImageInfo).mockResolvedValue({
        width: 4096,
        height: 3072
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
    });

    it('ファイルサイズ20.1MBは拒否される', async () => {
      // 20.1MB = 21,076,582 bytes
      const content = new Array(21076582).fill('a').join('');
      const mockFile = new File([content], 'too-large.jpg', { type: 'image/jpeg' });

      const result = await service.savePhoto(mockFile);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_TOO_LARGE');
      expect(result.error?.message).toContain('20MB');
    });

    it('空ファイル（0バイト）の処理', async () => {
      const mockFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      const mockBlob = new Blob(['processed'], { type: 'image/jpeg' });
      const mockThumbnailBlob = new Blob(['thumbnail'], { type: 'image/jpeg' });

      const imageProcessing = await import('../lib/image-processing');
      vi.mocked(imageProcessing.imageProcessingService.getImageInfo).mockResolvedValue({
        width: 1,
        height: 1
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
      expect(mockFile.size).toBe(0);
    });

    it('processImageが成功してもblobがundefinedの場合はエラー', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const imageProcessing = await import('../lib/image-processing');
      vi.mocked(imageProcessing.imageProcessingService.getImageInfo).mockResolvedValue({
        width: 1920,
        height: 1080
      });
      vi.mocked(imageProcessing.imageProcessingService.processImage).mockResolvedValue({
        success: true,
        blob: undefined // blobがundefined
      });

      const result = await service.savePhoto(mockFile);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROCESSING_FAILED');
    });

    it('generateThumbnailが成功してもblobがundefinedの場合はエラー', async () => {
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
        success: true,
        blob: undefined // blobがundefined
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

    it('IndexedDB例外発生時はGET_FAILEDエラーを返す', async () => {
      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.get).mockRejectedValue(new Error('Database connection error'));

      const result = await service.getPhotoById('test-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GET_FAILED');
      expect(result.error?.message).toContain('Failed to get photo');
    });

    it('取得した写真の全フィールドが正しく保持されている', async () => {
      const mockUploadedAt = new Date('2024-01-15T10:30:00');
      const mockBlob = new Blob(['test-content'], { type: 'image/jpeg' });
      const mockThumbnailBlob = new Blob(['thumb-content'], { type: 'image/jpeg' });

      const mockPhoto = {
        id: 'photo-123',
        filename: 'vacation-photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048,
        blob: mockBlob,
        thumbnailBlob: mockThumbnailBlob,
        uploadedAt: mockUploadedAt,
        width: 1920,
        height: 1080,
        compressionQuality: 0.8
      };

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.get).mockResolvedValue(mockPhoto);

      const result = await service.getPhotoById('photo-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        // 全フィールドの詳細検証
        expect(result.data.id).toBe('photo-123');
        expect(result.data.filename).toBe('vacation-photo.jpg');
        expect(result.data.mimeType).toBe('image/jpeg');
        expect(result.data.fileSize).toBe(2048);
        expect(result.data.blob).toBe(mockBlob);
        expect(result.data.thumbnailBlob).toBe(mockThumbnailBlob);
        expect(result.data.uploadedAt).toEqual(mockUploadedAt);
        expect(result.data.width).toBe(1920);
        expect(result.data.height).toBe(1080);
        expect(result.data.compressionQuality).toBe(0.8);
      }
    });
  });

  describe('getPhotos', () => {
    it('全写真を取得できる（limitなし）', async () => {
      const mockPhotos = [
        {
          id: 'photo-1',
          filename: 'photo1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1000,
          blob: new Blob(['test1'], { type: 'image/jpeg' }),
          thumbnailBlob: new Blob(['thumb1'], { type: 'image/jpeg' }),
          uploadedAt: new Date('2024-01-15'),
          width: 1920,
          height: 1080,
          compressionQuality: 0.8
        },
        {
          id: 'photo-2',
          filename: 'photo2.jpg',
          mimeType: 'image/jpeg',
          fileSize: 2000,
          blob: new Blob(['test2'], { type: 'image/jpeg' }),
          thumbnailBlob: new Blob(['thumb2'], { type: 'image/jpeg' }),
          uploadedAt: new Date('2024-01-14'),
          width: 1920,
          height: 1080,
          compressionQuality: 0.8
        }
      ];

      const mockDb = await import('../lib/database');
      const mockToArray = vi.fn().mockResolvedValue(mockPhotos);
      const mockReverse = vi.fn(() => ({ toArray: mockToArray }));
      const mockOrderBy = vi.fn(() => ({ reverse: mockReverse }));
      vi.mocked(mockDb.db.photos.orderBy).mockImplementation(mockOrderBy);

      const result = await service.getPhotos();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPhotos);
      expect(result.data?.length).toBe(2);
      expect(mockOrderBy).toHaveBeenCalledWith('uploadedAt');
    });

    it('limit指定で写真を取得できる', async () => {
      const mockPhotos = [
        {
          id: 'photo-1',
          filename: 'photo1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1000,
          blob: new Blob(['test1'], { type: 'image/jpeg' }),
          thumbnailBlob: new Blob(['thumb1'], { type: 'image/jpeg' }),
          uploadedAt: new Date('2024-01-15'),
          width: 1920,
          height: 1080,
          compressionQuality: 0.8
        }
      ];

      const mockDb = await import('../lib/database');
      const mockToArray = vi.fn().mockResolvedValue(mockPhotos);
      const mockLimit = vi.fn(() => ({ toArray: mockToArray }));
      const mockReverse = vi.fn(() => ({ limit: mockLimit }));
      const mockOrderBy = vi.fn(() => ({ reverse: mockReverse }));
      vi.mocked(mockDb.db.photos.orderBy).mockImplementation(mockOrderBy);

      const result = await service.getPhotos(5);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it('offsetとlimitを指定して写真を取得できる', async () => {
      const mockPhotos = [
        {
          id: 'photo-3',
          filename: 'photo3.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1500,
          blob: new Blob(['test3'], { type: 'image/jpeg' }),
          thumbnailBlob: new Blob(['thumb3'], { type: 'image/jpeg' }),
          uploadedAt: new Date('2024-01-13'),
          width: 1920,
          height: 1080,
          compressionQuality: 0.8
        }
      ];

      const mockDb = await import('../lib/database');
      const mockToArray = vi.fn().mockResolvedValue(mockPhotos);
      const mockLimit = vi.fn(() => ({ toArray: mockToArray }));
      const mockOffset = vi.fn(() => ({ limit: mockLimit }));
      const mockReverse = vi.fn(() => ({ offset: mockOffset }));
      const mockOrderBy = vi.fn(() => ({ reverse: mockReverse }));
      vi.mocked(mockDb.db.photos.orderBy).mockImplementation(mockOrderBy);

      const result = await service.getPhotos(3, 2);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPhotos);
      expect(mockOffset).toHaveBeenCalledWith(2);
      expect(mockLimit).toHaveBeenCalledWith(3);
    });

    it('空のデータベースの場合は空配列を返す', async () => {
      const mockDb = await import('../lib/database');
      const mockToArray = vi.fn().mockResolvedValue([]);
      const mockReverse = vi.fn(() => ({ toArray: mockToArray }));
      const mockOrderBy = vi.fn(() => ({ reverse: mockReverse }));
      vi.mocked(mockDb.db.photos.orderBy).mockImplementation(mockOrderBy);

      const result = await service.getPhotos();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.data?.length).toBe(0);
    });

    it('limit=0の境界値を処理できる', async () => {
      const mockDb = await import('../lib/database');
      const mockToArray = vi.fn().mockResolvedValue([]);
      // limit=0の場合、実装上if(limit)がfalseになるため、limitメソッドは呼ばれない
      const mockReverse = vi.fn(() => ({ toArray: mockToArray }));
      const mockOrderBy = vi.fn(() => ({ reverse: mockReverse }));
      vi.mocked(mockDb.db.photos.orderBy).mockImplementation(mockOrderBy);

      const result = await service.getPhotos(0);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      // limit=0は実装上はlimitが適用されないため、reverseから直接toArrayが呼ばれる
    });

    it('offset=999の範囲外の値を処理できる', async () => {
      const mockDb = await import('../lib/database');
      const mockToArray = vi.fn().mockResolvedValue([]);
      const mockOffset = vi.fn(() => ({ toArray: mockToArray }));
      const mockReverse = vi.fn(() => ({ offset: mockOffset }));
      const mockOrderBy = vi.fn(() => ({ reverse: mockReverse }));
      vi.mocked(mockDb.db.photos.orderBy).mockImplementation(mockOrderBy);

      const result = await service.getPhotos(undefined, 999);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockOffset).toHaveBeenCalledWith(999);
    });

    it('IndexedDB例外発生時はGET_PHOTOS_FAILEDエラーを返す', async () => {
      const mockDb = await import('../lib/database');
      const mockReverse = vi.fn(() => {
        throw new Error('Database query failed');
      });
      const mockOrderBy = vi.fn(() => ({ reverse: mockReverse }));
      vi.mocked(mockDb.db.photos.orderBy).mockImplementation(mockOrderBy);

      const result = await service.getPhotos();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GET_PHOTOS_FAILED');
      expect(result.error?.message).toContain('Failed to get photos');
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

    it('IndexedDB例外発生時はDELETE_FAILEDエラーを返す', async () => {
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
      vi.mocked(mockDb.db.photos.delete).mockRejectedValue(new Error('Database deletion error'));

      const result = await service.deletePhoto('test-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DELETE_FAILED');
      expect(result.error?.message).toContain('Failed to delete photo');
    });

    it('既に削除された写真の再削除はNOT_FOUNDエラーを返す（冪等性）', async () => {
      const mockPhoto = {
        id: 'photo-to-delete',
        filename: 'deletable.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1500,
        blob: new Blob(['content'], { type: 'image/jpeg' }),
        thumbnailBlob: new Blob(['thumb'], { type: 'image/jpeg' }),
        uploadedAt: new Date(),
        width: 1920,
        height: 1080,
        compressionQuality: 0.8
      };

      const mockDb = await import('../lib/database');

      // 1回目の削除: 成功
      vi.mocked(mockDb.db.photos.get).mockResolvedValueOnce(mockPhoto);
      vi.mocked(mockDb.db.photos.delete).mockResolvedValueOnce();

      const firstResult = await service.deletePhoto('photo-to-delete');
      expect(firstResult.success).toBe(true);

      // 2回目の削除: NOT_FOUNDエラー（冪等性の確認）
      vi.mocked(mockDb.db.photos.get).mockResolvedValueOnce(undefined);

      const secondResult = await service.deletePhoto('photo-to-delete');
      expect(secondResult.success).toBe(false);
      expect(secondResult.error?.code).toBe('NOT_FOUND');
      expect(secondResult.error?.message).toContain('not found');
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

    it('IndexedDB例外発生時はGET_STATISTICS_FAILEDエラーを返す', async () => {
      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.photos.toArray).mockRejectedValue(new Error('Database connection lost'));

      const result = await service.getPhotoStatistics();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GET_STATISTICS_FAILED');
      expect(result.error?.message).toContain('Failed to get photo statistics');
      expect(result.error?.details).toBeDefined();
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