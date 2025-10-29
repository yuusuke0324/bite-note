// 釣果記録サービスの単体テスト

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FishingRecordService } from '../lib/fishing-record-service';
import type { CreateFishingRecordForm } from '../types';

// Dexieのモック
vi.mock('../lib/database', () => ({
  db: {
    fishing_records: {
      add: vi.fn(),
      get: vi.fn(),
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
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      toArray: vi.fn()
    },
    updateMetadata: vi.fn()
  }
}));

describe('FishingRecordService', () => {
  let service: FishingRecordService;

  beforeEach(() => {
    service = new FishingRecordService();
    vi.clearAllMocks();
  });

  describe('createRecord', () => {
    it('有効なデータで記録を作成できる', async () => {
      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.fishing_records.add).mockResolvedValue('test-id');
      vi.mocked(mockDb.db.fishing_records.count).mockResolvedValue(1);

      const formData: CreateFishingRecordForm = {
        date: '2023-10-01',
        location: 'テスト釣り場',
        fishSpecies: 'テスト魚',
        size: 30,
        notes: 'テストメモ',
        useGPS: false
      };

      const result = await service.createRecord(formData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.location).toBe('テスト釣り場');
        expect(result.data.fishSpecies).toBe('テスト魚');
        expect(result.data.size).toBe(30);
      }
    });

    it('必須フィールドが不足している場合はエラーを返す', async () => {
      const formData: CreateFishingRecordForm = {
        date: '',
        location: '',
        fishSpecies: '',
        useGPS: false
      };

      const result = await service.createRecord(formData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('サイズが範囲外の場合はエラーを返す', async () => {
      const formData: CreateFishingRecordForm = {
        date: '2023-10-01',
        location: 'テスト釣り場',
        fishSpecies: 'テスト魚',
        size: 1000, // 上限を超えるサイズ
        useGPS: false
      };

      const result = await service.createRecord(formData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Size must be between 0 and 999 cm');
    });
  });

  describe('getRecordById', () => {
    it('存在する記録を取得できる', async () => {
      const mockRecord = {
        id: 'test-id',
        date: new Date('2023-10-01'),
        location: 'テスト釣り場',
        fishSpecies: 'テスト魚',
        size: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.fishing_records.get).mockResolvedValue(mockRecord);

      const result = await service.getRecordById('test-id');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecord);
    });

    it('存在しない記録の場合はエラーを返す', async () => {
      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.fishing_records.get).mockResolvedValue(undefined);

      const result = await service.getRecordById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('updateRecord', () => {
    it('既存の記録を更新できる', async () => {
      const existingRecord = {
        id: 'test-id',
        date: new Date('2023-10-01'),
        location: 'テスト釣り場',
        fishSpecies: 'テスト魚',
        size: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updateData = {
        location: '更新された釣り場',
        size: 35
      };

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.fishing_records.get).mockResolvedValue(existingRecord);
      vi.mocked(mockDb.db.fishing_records.update).mockResolvedValue(1);

      const result = await service.updateRecord('test-id', updateData);

      expect(result.success).toBe(true);
      expect(result.data?.location).toBe('更新された釣り場');
      expect(result.data?.size).toBe(35);
    });

    it('存在しない記録の更新はエラーを返す', async () => {
      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.fishing_records.get).mockResolvedValue(undefined);

      const result = await service.updateRecord('non-existent-id', { location: 'テスト' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('deleteRecord', () => {
    it('既存の記録を削除できる', async () => {
      const existingRecord = {
        id: 'test-id',
        date: new Date('2023-10-01'),
        location: 'テスト釣り場',
        fishSpecies: 'テスト魚',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.fishing_records.get).mockResolvedValue(existingRecord);
      vi.mocked(mockDb.db.fishing_records.delete).mockResolvedValue();
      vi.mocked(mockDb.db.fishing_records.count).mockResolvedValue(0);

      const result = await service.deleteRecord('test-id');

      expect(result.success).toBe(true);
    });

    it('存在しない記録の削除はエラーを返す', async () => {
      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.fishing_records.get).mockResolvedValue(undefined);

      const result = await service.deleteRecord('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('getStatistics', () => {
    it('空のデータベースでは正しい統計を返す', async () => {
      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.fishing_records.toArray).mockResolvedValue([]);

      const result = await service.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(0);
      expect(result.data?.uniqueSpecies).toBe(0);
      expect(result.data?.uniqueLocations).toBe(0);
      expect(result.data?.averageSize).toBeNull();
      expect(result.data?.maxSize).toBeNull();
    });

    it('データがある場合は正しい統計を計算する', async () => {
      const mockRecords = [
        {
          id: '1',
          date: new Date('2023-10-01'),
          location: '釣り場A',
          fishSpecies: '魚A',
          size: 20,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          date: new Date('2023-10-02'),
          location: '釣り場B',
          fishSpecies: '魚B',
          size: 30,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          date: new Date('2023-10-03'),
          location: '釣り場A',
          fishSpecies: '魚A',
          size: 40,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockDb = await import('../lib/database');
      vi.mocked(mockDb.db.fishing_records.toArray).mockResolvedValue(mockRecords);

      const result = await service.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(3);
      expect(result.data?.uniqueSpecies).toBe(2);
      expect(result.data?.uniqueLocations).toBe(2);
      expect(result.data?.averageSize).toBe(30);
      expect(result.data?.maxSize).toBe(40);
    });
  });
});