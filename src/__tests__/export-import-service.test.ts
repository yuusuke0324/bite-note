// データエクスポート・インポートサービスの単体テスト

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportImportService } from '../lib/export-import-service';

// モック設定
vi.mock('../lib/fishing-record-service', () => ({
  fishingRecordService: {
    getRecords: vi.fn(),
    createRecord: vi.fn()
  }
}));

vi.mock('../lib/photo-service', () => ({
  photoService: {
    getPhotosMetadata: vi.fn(),
    getPhotoById: vi.fn(),
    savePhoto: vi.fn()
  }
}));

vi.mock('../lib/settings-service', () => ({
  settingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn()
  }
}));

vi.mock('../lib/image-processing', () => ({
  imageProcessingService: {
    blobToBase64: vi.fn(),
    base64ToBlob: vi.fn()
  }
}));

// File のモック
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

describe('ExportImportService', () => {
  let service: ExportImportService;

  beforeEach(() => {
    service = new ExportImportService();
    vi.clearAllMocks();
  });

  describe('exportAllData', () => {
    it('すべてのデータを正常にエクスポートできる', async () => {
      // モックデータの設定
      const mockRecords = [
        {
          id: 'record-1',
          date: new Date('2023-10-01'),
          location: 'テスト釣り場',
          fishSpecies: 'テスト魚',
          size: 30,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockPhotoMetadata = [
        { id: 'photo-1', filename: 'test.jpg' }
      ];

      const mockPhoto = {
        id: 'photo-1',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        blob: new Blob(['test'], { type: 'image/jpeg' })
      };

      const mockSettings = {
        theme: 'light' as const,
        language: 'ja' as const,
        dateFormat: 'YYYY/MM/DD' as const
      };

      // モックの設定
      const fishingRecordService = await import('../lib/fishing-record-service');
      const photoService = await import('../lib/photo-service');
      const settingsService = await import('../lib/settings-service');
      const imageProcessing = await import('../lib/image-processing');

      vi.mocked(fishingRecordService.fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });

      vi.mocked(photoService.photoService.getPhotosMetadata).mockResolvedValue({
        success: true,
        data: mockPhotoMetadata
      });

      vi.mocked(photoService.photoService.getPhotoById).mockResolvedValue({
        success: true,
        data: mockPhoto
      });

      vi.mocked(settingsService.settingsService.getSettings).mockResolvedValue({
        success: true,
        data: mockSettings
      });

      vi.mocked(imageProcessing.imageProcessingService.blobToBase64).mockResolvedValue('base64-data');

      const result = await service.exportAllData();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        const exportData = JSON.parse(result.data);
        expect(exportData.version).toBe('1.0.0');
        expect(exportData.records).toHaveLength(1);
        expect(exportData.photos).toHaveLength(1);
        expect(exportData.settings).toEqual(mockSettings);
      }
    });

    it('記録の取得に失敗した場合はエラーを返す', async () => {
      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.getRecords).mockResolvedValue({
        success: false,
        error: { code: 'GET_FAILED', message: 'Failed to get records' }
      });

      const result = await service.exportAllData();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXPORT_RECORDS_FAILED');
    });

    it('設定の取得に失敗した場合はエラーを返す', async () => {
      const fishingRecordService = await import('../lib/fishing-record-service');
      const photoService = await import('../lib/photo-service');
      const settingsService = await import('../lib/settings-service');

      vi.mocked(fishingRecordService.fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(photoService.photoService.getPhotosMetadata).mockResolvedValue({
        success: true,
        data: []
      });

      vi.mocked(settingsService.settingsService.getSettings).mockResolvedValue({
        success: false,
        error: { code: 'GET_FAILED', message: 'Failed to get settings' }
      });

      const result = await service.exportAllData();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXPORT_SETTINGS_FAILED');
    });
  });

  describe('exportRecordsAsCSV', () => {
    it('記録をCSV形式でエクスポートできる', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          date: new Date('2023-10-01'),
          location: 'テスト釣り場',
          fishSpecies: 'テスト魚',
          size: 30,
          coordinates: {
            latitude: 35.6762,
            longitude: 139.6503,
            accuracy: 10
          },
          notes: 'テストメモ',
          createdAt: new Date('2023-10-01T10:00:00Z'),
          updatedAt: new Date('2023-10-01T10:00:00Z')
        }
      ];

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });

      const result = await service.exportRecordsAsCSV();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        const lines = result.data.split('\n');
        expect(lines[0]).toContain('ID,Date,Location,Fish Species');
        expect(lines[1]).toContain('record-1');
        expect(lines[1]).toContain('テスト釣り場');
        expect(lines[1]).toContain('テスト魚');
      }
    });

    it('記録の取得に失敗した場合はエラーを返す', async () => {
      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.getRecords).mockResolvedValue({
        success: false,
        error: { code: 'GET_FAILED', message: 'Failed to get records' }
      });

      const result = await service.exportRecordsAsCSV();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXPORT_CSV_FAILED');
    });
  });

  describe('importData', () => {
    it('有効なJSONデータをインポートできる', async () => {
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date(),
        records: [
          {
            id: 'old-record-1',
            date: new Date('2023-10-01'),
            location: 'テスト釣り場',
            fishSpecies: 'テスト魚',
            size: 30,
            photoId: 'old-photo-1',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        photos: [
          {
            id: 'old-photo-1',
            data: 'base64-data',
            mimeType: 'image/jpeg',
            filename: 'test.jpg'
          }
        ],
        settings: {
          theme: 'dark',
          language: 'en'
        }
      };

      const jsonString = JSON.stringify(exportData);

      // モックの設定
      const photoService = await import('../lib/photo-service');
      const fishingRecordService = await import('../lib/fishing-record-service');
      const settingsService = await import('../lib/settings-service');
      const imageProcessing = await import('../lib/image-processing');

      vi.mocked(imageProcessing.imageProcessingService.base64ToBlob).mockReturnValue(
        new Blob(['test'], { type: 'image/jpeg' })
      );

      vi.mocked(photoService.photoService.savePhoto).mockResolvedValue({
        success: true,
        data: { id: 'new-photo-1', filename: 'test.jpg' }
      });

      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record-1' }
      });

      vi.mocked(settingsService.settingsService.updateSettings).mockResolvedValue();

      const result = await service.importData(jsonString);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(1);
      expect(result.data?.importedPhotos).toBe(1);
      expect(result.data?.skippedItems).toBe(0);
    });

    it('無効なJSONの場合はエラーを返す', async () => {
      const result = await service.importData('invalid json');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('IMPORT_FAILED');
    });

    it('必須フィールドが不足している場合はエラーを返す', async () => {
      const invalidData = {
        version: '1.0.0'
        // records, photos, settings が不足
      };

      const jsonString = JSON.stringify(invalidData);
      const result = await service.importData(jsonString);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_RECORDS');
    });

    it('バージョンが異なる場合は警告を出すが処理を続行する', async () => {
      const exportData = {
        version: '2.0.0', // 異なるバージョン
        exportedAt: new Date(),
        records: [],
        photos: [],
        settings: { theme: 'light' }
      };

      const jsonString = JSON.stringify(exportData);

      const settingsService = await import('../lib/settings-service');
      vi.mocked(settingsService.settingsService.updateSettings).mockResolvedValue();

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await service.importData(jsonString);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Importing from different version: 2.0.0');

      consoleSpy.mockRestore();
    });
  });

  describe('importRecordsFromCSV', () => {
    it('有効なCSVデータをインポートできる', async () => {
      const csvData = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At
"record-1","2023-10-01","テスト釣り場","テスト魚",30,35.6762,139.6503,10,"テストメモ","2023-10-01T10:00:00Z","2023-10-01T10:00:00Z"`;

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record-1' }
      });

      const result = await service.importRecordsFromCSV(csvData);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(1);
      expect(result.data?.importedPhotos).toBe(0); // CSV does not include photos
      expect(result.data?.skippedItems).toBe(0);
      expect(result.data?.errors).toHaveLength(0);
    });

    it('複数行のCSVデータをインポートできる', async () => {
      const csvData = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At
"record-1","2023-10-01","釣り場A","魚A",30,35.6762,139.6503,10,"メモA","2023-10-01T10:00:00Z","2023-10-01T10:00:00Z"
"record-2","2023-10-02","釣り場B","魚B",25,35.6763,139.6504,15,"メモB","2023-10-02T10:00:00Z","2023-10-02T10:00:00Z"
"record-3","2023-10-03","釣り場C","魚C",35,35.6764,139.6505,20,"メモC","2023-10-03T10:00:00Z","2023-10-03T10:00:00Z"`;

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      const result = await service.importRecordsFromCSV(csvData);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(3);
      expect(result.data?.errors).toHaveLength(0);
    });

    it('ヘッダーのみの場合はエラーを返す', async () => {
      const csvData = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At`;

      const result = await service.importRecordsFromCSV(csvData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CSV_FORMAT');
    });

    it('必須カラムが不足している場合はエラーを返す', async () => {
      const csvData = `ID,Date,Location
"record-1","2023-10-01","テスト釣り場"`;

      const result = await service.importRecordsFromCSV(csvData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_REQUIRED_COLUMNS');
      expect(result.error?.message).toContain('Fish Species');
    });

    it('必須フィールドが空の行はスキップされる', async () => {
      const csvData = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At
"record-1","2023-10-01","釣り場A","魚A",30,,,,"メモA","2023-10-01T10:00:00Z","2023-10-01T10:00:00Z"
"record-2","","釣り場B","魚B",25,,,,"メモB","2023-10-02T10:00:00Z","2023-10-02T10:00:00Z"
"record-3","2023-10-03","釣り場C","魚C",35,,,,"メモC","2023-10-03T10:00:00Z","2023-10-03T10:00:00Z"`;

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      const result = await service.importRecordsFromCSV(csvData);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(2); // record-2 is skipped
      expect(result.data?.skippedItems).toBe(1);
      expect(result.data?.errors).toHaveLength(1);
      expect(result.data?.errors[0]).toContain('Row 3: Date is required');
    });

    it('無効な日付フォーマットの行はスキップされる', async () => {
      const csvData = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At
"record-1","2023-10-01","釣り場A","魚A",30,,,,"メモA","2023-10-01T10:00:00Z","2023-10-01T10:00:00Z"
"record-2","10/02/2023","釣り場B","魚B",25,,,,"メモB","2023-10-02T10:00:00Z","2023-10-02T10:00:00Z"`;

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      const result = await service.importRecordsFromCSV(csvData);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(1);
      expect(result.data?.skippedItems).toBe(1);
      expect(result.data?.errors[0]).toContain('Invalid date format');
    });

    it('無効な数値フィールドの行はスキップされる', async () => {
      const csvData = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At
"record-1","2023-10-01","釣り場A","魚A",abc,,,,"メモA","2023-10-01T10:00:00Z","2023-10-01T10:00:00Z"`;

      const result = await service.importRecordsFromCSV(csvData);

      expect(result.success).toBe(true); // Result success is true even with errors
      expect(result.data?.importedRecords).toBe(0);
      expect(result.data?.skippedItems).toBe(1);
      expect(result.data?.errors[0]).toContain('Invalid size value');
    });

    it('オプショナルフィールドが空でもインポートできる', async () => {
      const csvData = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At
"record-1","2023-10-01","釣り場A","魚A",,,,,"","2023-10-01T10:00:00Z","2023-10-01T10:00:00Z"`;

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      const result = await service.importRecordsFromCSV(csvData);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(1);
      expect(fishingRecordService.fishingRecordService.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2023-10-01',
          location: '釣り場A',
          fishSpecies: '魚A',
          size: undefined,
          coordinates: undefined,
          notes: undefined
        })
      );
    });

    it('引用符内のカンマを正しく処理できる', async () => {
      const csvData = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At
"record-1","2023-10-01","釣り場A,B,C","魚A",30,,,,"メモ,テスト","2023-10-01T10:00:00Z","2023-10-01T10:00:00Z"`;

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      const result = await service.importRecordsFromCSV(csvData);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(1);
      expect(fishingRecordService.fishingRecordService.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          location: '釣り場A,B,C',
          notes: 'メモ,テスト'
        })
      );
    });

    it('エスケープされた引用符を正しく処理できる', async () => {
      const csvData = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At
"record-1","2023-10-01","釣り場""テスト""","魚A",30,,,,"メモ""引用符""","2023-10-01T10:00:00Z","2023-10-01T10:00:00Z"`;

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      const result = await service.importRecordsFromCSV(csvData);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(1);
      expect(fishingRecordService.fishingRecordService.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          location: '釣り場"テスト"',
          notes: 'メモ"引用符"'
        })
      );
    });

    it('GPS座標が両方揃っている場合のみcoordinatesを設定する', async () => {
      const csvData1 = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At
"record-1","2023-10-01","釣り場A","魚A",30,35.6762,139.6503,10,"メモA","2023-10-01T10:00:00Z","2023-10-01T10:00:00Z"`;

      const csvData2 = `ID,Date,Location,Fish Species,Size (cm),Latitude,Longitude,GPS Accuracy,Notes,Created At,Updated At
"record-2","2023-10-02","釣り場B","魚B",25,35.6762,,,"メモB","2023-10-02T10:00:00Z","2023-10-02T10:00:00Z"`;

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      // Case 1: 両方の座標がある
      await service.importRecordsFromCSV(csvData1);
      expect(fishingRecordService.fishingRecordService.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          coordinates: expect.objectContaining({
            latitude: 35.6762,
            longitude: 139.6503,
            accuracy: 10
          })
        })
      );

      // Case 2: 片方のみの座標
      await service.importRecordsFromCSV(csvData2);
      expect(fishingRecordService.fishingRecordService.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          coordinates: undefined
        })
      );
    });
  });

  describe('createDownloadBlob', () => {
    it('データからBlobを作成できる', () => {
      const data = 'test data';
      const mimeType = 'application/json';

      const blob = service.createDownloadBlob(data, mimeType);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe(mimeType);
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});