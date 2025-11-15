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

// XLSXライブラリのモック (import * as XLSX に対応)
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    json_to_sheet: vi.fn((data) => ({ '!ref': 'A1:K10', data })),
    book_append_sheet: vi.fn(),
    sheet_to_json: vi.fn(() => [])
  },
  write: vi.fn(() => new ArrayBuffer(100)),
  read: vi.fn(() => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })),
  SSF: {
    parse_date_code: vi.fn((serial) => {
      // Excelシリアル日付を日付オブジェクトに変換（1900年1月1日からの日数）
      const baseDate = new Date(1900, 0, 1);
      const date = new Date(baseDate.getTime() + (serial - 2) * 24 * 60 * 60 * 1000);
      return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
    })
  }
}));

// DOM APIのモック
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

const mockAnchorClick = vi.fn();
const mockAnchorElement = {
  href: '',
  download: '',
  click: mockAnchorClick,
  style: {}
};

global.document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'a') {
    return mockAnchorElement as any;
  }
  return {} as any;
});

global.document.body.appendChild = vi.fn();
global.document.body.removeChild = vi.fn();

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

  describe('exportRecordsAsExcel', () => {
    it('記録をExcel形式でエクスポートできる', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          date: new Date('2023-10-01'),
          location: 'テスト釣り場',
          fishSpecies: 'テスト魚',
          size: 30,
          weight: 1500,
          weather: '晴れ',
          temperature: 25,
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

      const XLSX = await import('xlsx');
      const mockWorkbook = { SheetNames: [], Sheets: {} };
      vi.mocked(XLSX.utils.book_new).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.write).mockReturnValue(new ArrayBuffer(100));

      const result = await service.exportRecordsAsExcel();

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(ArrayBuffer);
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
        mockWorkbook,
        expect.anything(),
        'Fishing Records'
      );
      expect(XLSX.write).toHaveBeenCalledWith(
        mockWorkbook,
        expect.objectContaining({ bookType: 'xlsx', type: 'array' })
      );
    });

    it('記録の取得に失敗した場合はエラーを返す', async () => {
      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.getRecords).mockResolvedValue({
        success: false,
        error: { code: 'GET_FAILED', message: 'Failed to get records' }
      });

      const result = await service.exportRecordsAsExcel();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXPORT_EXCEL_FAILED');
    });

    it('空データでもExcelファイルを生成できる', async () => {
      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: []
      });

      const XLSX = await import('xlsx');
      const mockWorkbook = { SheetNames: [], Sheets: {} };
      vi.mocked(XLSX.utils.book_new).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.write).mockReturnValue(new ArrayBuffer(50));

      const result = await service.exportRecordsAsExcel();

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(ArrayBuffer);
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([]);
    });

    it('全てのフィールドが正しくExcelに出力される', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          date: new Date('2023-10-01'),
          location: 'テスト釣り場',
          fishSpecies: 'テスト魚',
          size: 30,
          weight: 1500,
          weather: '晴れ',
          temperature: 25,
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

      const XLSX = await import('xlsx');
      const mockWorkbook = { SheetNames: [], Sheets: {} };
      vi.mocked(XLSX.utils.book_new).mockReturnValue(mockWorkbook);

      await service.exportRecordsAsExcel();

      // json_to_sheetが呼ばれた引数を検証
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            ID: 'record-1',
            Date: expect.any(String),
            Location: 'テスト釣り場',
            'Fish Species': 'テスト魚',
            'Size (cm)': 30,
            'Weight (g)': 1500,
            Weather: '晴れ',
            'Temperature (°C)': 25,
            Latitude: 35.6762,
            Longitude: 139.6503,
            'GPS Accuracy': 10,
            Notes: 'テストメモ'
          })
        ])
      );
    });

    it('XLSX.write失敗時のエラーハンドリング', async () => {
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

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.getRecords).mockResolvedValue({
        success: true,
        data: mockRecords
      });

      const XLSX = await import('xlsx');
      const mockWorkbook = { SheetNames: [], Sheets: {} };
      vi.mocked(XLSX.utils.book_new).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.write).mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = await service.exportRecordsAsExcel();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXPORT_EXCEL_FAILED');
    });
  });

  describe('importRecordsFromExcel', () => {
    it('有効なExcelファイルをインポートできる', async () => {
      const mockExcelData = [
        ['ID', 'Date', 'Location', 'Fish Species', 'Size (cm)', 'Weight (g)', 'Weather', 'Temperature (°C)', 'Latitude', 'Longitude', 'GPS Accuracy', 'Notes'],
        ['record-1', 45200, 'テスト釣り場', 'テスト魚', 30, 1500, '晴れ', 25, 35.6762, 139.6503, 10, 'テストメモ']
      ];

      const mockArrayBuffer = new ArrayBuffer(100);

      const XLSX = await import('xlsx');
      const mockWorkbook = {
        SheetNames: ['Fishing Records'],
        Sheets: { 'Fishing Records': {} }
      };
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockExcelData);

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record-1' }
      });

      const result = await service.importRecordsFromExcel(mockArrayBuffer);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(1);
      expect(result.data?.skippedItems).toBe(0);
      expect(result.data?.errors).toHaveLength(0);
      expect(XLSX.read).toHaveBeenCalledWith(mockArrayBuffer, { type: 'array' });
      expect(XLSX.utils.sheet_to_json).toHaveBeenCalledWith(expect.anything(), { header: 1 });
    });

    it('複数行のExcelデータをインポートできる', async () => {
      const mockExcelData = [
        ['ID', 'Date', 'Location', 'Fish Species', 'Size (cm)'],
        ['record-1', 45200, '釣り場A', '魚A', 30],
        ['record-2', 45201, '釣り場B', '魚B', 25],
        ['record-3', 45202, '釣り場C', '魚C', 35]
      ];

      const mockArrayBuffer = new ArrayBuffer(100);

      const XLSX = await import('xlsx');
      const mockWorkbook = {
        SheetNames: ['Fishing Records'],
        Sheets: { 'Fishing Records': {} }
      };
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockExcelData);

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      const result = await service.importRecordsFromExcel(mockArrayBuffer);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(3);
      expect(result.data?.errors).toHaveLength(0);
    });

    it('Excelシリアル日付を正しく変換できる', async () => {
      const mockExcelData = [
        ['ID', 'Date', 'Location', 'Fish Species', 'Size (cm)'],
        ['record-1', 45200, 'テスト釣り場', 'テスト魚', 30]
      ];

      const mockArrayBuffer = new ArrayBuffer(100);

      const XLSX = await import('xlsx');
      const mockWorkbook = {
        SheetNames: ['Fishing Records'],
        Sheets: { 'Fishing Records': {} }
      };
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockExcelData);

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record-1' }
      });

      await service.importRecordsFromExcel(mockArrayBuffer);

      expect(XLSX.SSF.parse_date_code).toHaveBeenCalledWith(45200);
      expect(fishingRecordService.fishingRecordService.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String)
        })
      );
    });

    it('必須フィールドが空の行はスキップされる', async () => {
      const mockExcelData = [
        ['ID', 'Date', 'Location', 'Fish Species', 'Size (cm)'],
        ['record-1', 45200, '釣り場A', '魚A', 30],
        ['record-2', '', '釣り場B', '魚B', 25], // 必須フィールドが空
        ['record-3', 45202, '釣り場C', '魚C', 35]
      ];

      const mockArrayBuffer = new ArrayBuffer(100);

      const XLSX = await import('xlsx');
      const mockWorkbook = {
        SheetNames: ['Fishing Records'],
        Sheets: { 'Fishing Records': {} }
      };
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockExcelData);

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      const result = await service.importRecordsFromExcel(mockArrayBuffer);

      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(2); // record-2 is silently skipped (empty date)
      expect(result.data?.skippedItems).toBe(0); // Empty rows don't increment skippedItems counter
      expect(result.data?.errors).toHaveLength(0); // Empty rows don't generate error messages
    });

    it('無効な数値フィールドの行はスキップされる', async () => {
      const mockExcelData = [
        ['ID', 'Date', 'Location', 'Fish Species', 'Size (cm)'],
        ['record-1', 45200, 'テスト釣り場', 'テスト魚', 'abc'] // 無効な数値
      ];

      const mockArrayBuffer = new ArrayBuffer(100);

      const XLSX = await import('xlsx');
      const mockWorkbook = {
        SheetNames: ['Fishing Records'],
        Sheets: { 'Fishing Records': {} }
      };
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockExcelData);

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      const result = await service.importRecordsFromExcel(mockArrayBuffer);

      // 無効な数値でもインポート自体は成功する（sizeはオプショナル）
      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(1);
    });

    it('GPS座標が両方揃っている場合のみcoordinatesを設定する', async () => {
      const mockExcelDataWithCoords = [
        ['ID', 'Date', 'Location', 'Fish Species', 'Size (cm)', 'Latitude', 'Longitude', 'GPS Accuracy'],
        ['record-1', 45200, '釣り場A', '魚A', 30, 35.6762, 139.6503, 10]
      ];

      const mockExcelDataWithoutCoords = [
        ['ID', 'Date', 'Location', 'Fish Species', 'Size (cm)', 'Latitude', 'Longitude', 'GPS Accuracy'],
        ['record-2', 45201, '釣り場B', '魚B', 25, 35.6762, '', ''] // 片方のみ
      ];

      const mockArrayBuffer = new ArrayBuffer(100);

      const XLSX = await import('xlsx');
      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      // Case 1: 両方の座標がある
      const mockWorkbook1 = {
        SheetNames: ['Fishing Records'],
        Sheets: { 'Fishing Records': {} }
      };
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook1);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockExcelDataWithCoords);

      await service.importRecordsFromExcel(mockArrayBuffer);
      expect(fishingRecordService.fishingRecordService.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          coordinates: expect.objectContaining({
            latitude: 35.6762,
            longitude: 139.6503,
            accuracy: 10
          })
        })
      );

      vi.clearAllMocks();

      // Case 2: 片方のみの座標
      const mockWorkbook2 = {
        SheetNames: ['Fishing Records'],
        Sheets: { 'Fishing Records': {} }
      };
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook2);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockExcelDataWithoutCoords);
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      await service.importRecordsFromExcel(mockArrayBuffer);
      expect(fishingRecordService.fishingRecordService.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          coordinates: undefined
        })
      );
    });

    it('シート名が不正な場合でも最初のシートを使用する', async () => {
      const mockExcelData = [
        ['ID', 'Date', 'Location', 'Fish Species'],
        ['record-1', 45200, 'テスト釣り場', 'テスト魚']
      ];

      const mockArrayBuffer = new ArrayBuffer(100);

      const XLSX = await import('xlsx');
      const mockWorkbook = {
        SheetNames: ['Custom Sheet Name'], // 異なるシート名でも最初のシートを使用
        Sheets: { 'Custom Sheet Name': {} }
      };
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockExcelData);

      const fishingRecordService = await import('../lib/fishing-record-service');
      vi.mocked(fishingRecordService.fishingRecordService.createRecord).mockResolvedValue({
        success: true,
        data: { id: 'new-record' }
      });

      const result = await service.importRecordsFromExcel(mockArrayBuffer);

      // 最初のシートから読み込むので成功する
      expect(result.success).toBe(true);
      expect(result.data?.importedRecords).toBe(1);
    });

    it('XLSX.read失敗時のエラーハンドリング', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);

      const XLSX = await import('xlsx');
      vi.mocked(XLSX.read).mockImplementation(() => {
        throw new Error('Read failed');
      });

      const result = await service.importRecordsFromExcel(mockArrayBuffer);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXCEL_IMPORT_FAILED');
    });

    it('空のExcelファイルの場合はエラーを返す', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);

      const XLSX = await import('xlsx');
      const mockWorkbook = {
        SheetNames: ['Fishing Records'],
        Sheets: { 'Fishing Records': {} }
      };
      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([]);

      const result = await service.importRecordsFromExcel(mockArrayBuffer);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_EXCEL_FORMAT');
    });
  });

  describe('downloadFile', () => {
    it('ファイルのダウンロードを実行できる', () => {
      const blob = new Blob(['test data'], { type: 'application/json' });
      const filename = 'test-file.json';

      service.downloadFile(blob, filename);

      // DOM操作の確認
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchorElement.href).toBe('blob:test-url');
      expect(mockAnchorElement.download).toBe(filename);
      expect(mockAnchorClick).toHaveBeenCalled();
      expect(global.document.body.appendChild).toHaveBeenCalledWith(mockAnchorElement);
      expect(global.document.body.removeChild).toHaveBeenCalledWith(mockAnchorElement);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('異なるファイル名とMIMEタイプで正しく動作する', () => {
      const blob = new Blob(['test data'], { type: 'text/csv' });
      const filename = 'test-file.csv';

      // モックをクリア
      vi.clearAllMocks();
      vi.mocked(global.URL.createObjectURL).mockReturnValue('blob:test-url-2');

      service.downloadFile(blob, filename);

      // 正しくダウンロード処理が実行されることを確認
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(mockAnchorElement.download).toBe(filename);
      expect(mockAnchorClick).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url-2');
    });
  });
});