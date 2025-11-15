/**
 * TASK-17 PR #2-A: fishing-record-serviceのテスト
 *
 * 目標: カバレッジ 55.84% → 80%達成
 *
 * フェーズ1: CRUD操作の正常系・異常系テスト（最優先）
 * フェーズ2: 統計・サマリー機能テスト
 * フェーズ3: バリデーション・フィルタリングテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FishingRecordService } from '../fishing-record-service';
import { db } from '../database';
import type { CreateFishingRecordForm, UpdateFishingRecordForm } from '../../types';

describe('FishingRecordService', () => {
  let service: FishingRecordService;

  beforeEach(async () => {
    service = new FishingRecordService();
    // IndexedDBをクリア（fake-indexeddbを使用）
    await db.fishing_records.clear();
    await db.app_metadata.clear();
  });

  // ============================================================================
  // フェーズ1: CRUD操作テスト
  // ============================================================================

  describe('createRecord', () => {
    it('正常系: 有効なフォームで釣果記録を作成できる', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: 50,
        weight: 2000,
        notes: 'ルアーで釣れた'
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBeDefined();
      expect(result.data?.fishSpecies).toBe('スズキ');
      expect(result.data?.location).toBe('東京湾');
      expect(result.data?.size).toBe(50);
      expect(result.data?.weight).toBe(2000);
      expect(result.data?.createdAt).toBeInstanceOf(Date);
      expect(result.data?.updatedAt).toBeInstanceOf(Date);
    });

    it('正常系: オプショナル項目なしで作成できる', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ'
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(true);
      expect(result.data?.size).toBeUndefined();
      expect(result.data?.weight).toBeUndefined();
      expect(result.data?.photoId).toBeUndefined();
      expect(result.data?.coordinates).toBeUndefined();
      expect(result.data?.notes).toBeUndefined();
    });

    it('異常系: dateが未指定の場合エラーを返す', async () => {
      const form = {
        location: '東京湾',
        fishSpecies: 'スズキ'
      } as CreateFishingRecordForm;

      const result = await service.createRecord(form);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Date');
    });

    it('異常系: locationが空文字の場合エラーを返す', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '',
        fishSpecies: 'スズキ'
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Location');
    });

    it('異常系: fishSpeciesが空文字の場合エラーを返す', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: ''
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Fish species');
    });

    it('境界値: sizeが0の場合は許可される', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: 0
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(0);
    });

    it('境界値: sizeが999の場合は許可される', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: 999
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(999);
    });

    it('異常系: sizeが負の値の場合エラーを返す', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: -1
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Size');
    });

    it('異常系: sizeが1000以上の場合エラーを返す', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: 1000
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Size');
    });

    it('境界値: weightが0の場合は許可される', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        weight: 0
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(true);
      expect(result.data?.weight).toBe(0);
    });

    it('境界値: weightが99999の場合は許可される', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        weight: 99999
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(true);
      expect(result.data?.weight).toBe(99999);
    });

    it('異常系: weightが負の値の場合エラーを返す', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        weight: -1
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Weight');
    });

    it('異常系: weightが100000以上の場合エラーを返す', async () => {
      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        weight: 100000
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Weight');
    });
  });

  describe('getRecordById', () => {
    it('正常系: 存在する記録をIDで取得できる', async () => {
      // テストデータ作成
      const createForm: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ'
      };
      const createResult = await service.createRecord(createForm);
      const recordId = createResult.data!.id;

      // 取得
      const result = await service.getRecordById(recordId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(recordId);
      expect(result.data?.fishSpecies).toBe('スズキ');
    });

    it('異常系: 存在しないIDの場合NOT_FOUNDエラーを返す', async () => {
      const result = await service.getRecordById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('updateRecord', () => {
    it('正常系: 記録を更新できる', async () => {
      // テストデータ作成
      const createForm: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: 50
      };
      const createResult = await service.createRecord(createForm);
      const recordId = createResult.data!.id;

      // 10ms待機してupdatedAtが異なることを保証（CI環境考慮）
      await new Promise(resolve => setTimeout(resolve, 10));

      // 更新
      const updateForm: UpdateFishingRecordForm = {
        size: 60,
        weight: 2500,
        notes: '追記'
      };
      const result = await service.updateRecord(recordId, updateForm);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(recordId);
      expect(result.data?.size).toBe(60);
      expect(result.data?.weight).toBe(2500);
      expect(result.data?.notes).toBe('追記');
      expect(result.data?.location).toBe('東京湾'); // 更新されていないフィールドは維持
      expect(result.data?.updatedAt.getTime()).toBeGreaterThan(createResult.data!.createdAt.getTime());
    });

    it('異常系: 存在しないIDの場合NOT_FOUNDエラーを返す', async () => {
      const updateForm: UpdateFishingRecordForm = {
        size: 60
      };

      const result = await service.updateRecord('non-existent-id', updateForm);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('異常系: locationが空文字の場合エラーを返す', async () => {
      // テストデータ作成
      const createForm: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ'
      };
      const createResult = await service.createRecord(createForm);
      const recordId = createResult.data!.id;

      // 更新（空文字）
      const updateForm: UpdateFishingRecordForm = {
        location: ''
      };
      const result = await service.updateRecord(recordId, updateForm);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Location');
    });

    it('異常系: fishSpeciesが空文字の場合エラーを返す', async () => {
      // テストデータ作成
      const createForm: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ'
      };
      const createResult = await service.createRecord(createForm);
      const recordId = createResult.data!.id;

      // 更新（空文字）
      const updateForm: UpdateFishingRecordForm = {
        fishSpecies: ''
      };
      const result = await service.updateRecord(recordId, updateForm);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Fish species');
    });
  });

  describe('deleteRecord', () => {
    it('正常系: 記録を削除できる', async () => {
      // テストデータ作成
      const createForm: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ'
      };
      const createResult = await service.createRecord(createForm);
      const recordId = createResult.data!.id;

      // 削除
      const result = await service.deleteRecord(recordId);

      expect(result.success).toBe(true);

      // 削除確認
      const getResult = await service.getRecordById(recordId);
      expect(getResult.success).toBe(false);
      expect(getResult.error?.code).toBe('NOT_FOUND');
    });

    it('異常系: 存在しないIDの場合NOT_FOUNDエラーを返す', async () => {
      const result = await service.deleteRecord('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('getRecords', () => {
    beforeEach(async () => {
      // テストデータ作成（3件）
      await service.createRecord({
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: 50
      });
      await service.createRecord({
        date: new Date('2024-01-20'),
        location: '相模湾',
        fishSpecies: 'アジ',
        size: 30
      });
      await service.createRecord({
        date: new Date('2024-01-25'),
        location: '東京湾',
        fishSpecies: 'シーバス',
        size: 70
      });
    });

    it('正常系: 全件取得できる', async () => {
      const result = await service.getRecords();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3);
    });

    it('正常系: limitを指定して取得できる', async () => {
      const result = await service.getRecords({ limit: 2 });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('正常系: offsetを指定して取得できる', async () => {
      const result = await service.getRecords({ offset: 1, limit: 2 });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('正常系: 降順でソートできる', async () => {
      const result = await service.getRecords({ sortOrder: 'desc' });

      expect(result.success).toBe(true);
      expect(result.data?.[0].date).toEqual(new Date('2024-01-25'));
    });
  });

  // ============================================================================
  // フェーズ2: 統計・サマリー機能テスト
  // ============================================================================

  describe('getRecordsSummary', () => {
    beforeEach(async () => {
      // テストデータ作成（3件）
      await service.createRecord({
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        photoId: 'photo-1'
      });
      await service.createRecord({
        date: new Date('2024-01-20'),
        location: '相模湾',
        fishSpecies: 'アジ'
      });
      await service.createRecord({
        date: new Date('2024-01-25'),
        location: '東京湾',
        fishSpecies: 'シーバス',
        photoId: 'photo-2'
      });
    });

    it('正常系: サマリー情報を取得できる', async () => {
      const result = await service.getRecordsSummary(10);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3);
      expect(result.data?.[0]).toHaveProperty('id');
      expect(result.data?.[0]).toHaveProperty('date');
      expect(result.data?.[0]).toHaveProperty('location');
      expect(result.data?.[0]).toHaveProperty('fishSpecies');
      expect(result.data?.[0]).toHaveProperty('hasPhoto');
    });

    it('正常系: hasPhotoフラグが正しく設定される', async () => {
      const result = await service.getRecordsSummary(10);

      expect(result.success).toBe(true);
      // 最新順なので、photoId='photo-2'の記録が最初
      expect(result.data?.[0].hasPhoto).toBe(true);
      // photoIdがない記録はhasPhoto=false
      const noPhotoRecord = result.data?.find(r => !r.hasPhoto);
      expect(noPhotoRecord).toBeDefined();
    });

    it('正常系: limit指定が機能する', async () => {
      const result = await service.getRecordsSummary(2);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });
  });

  describe('getStatistics', () => {
    it('正常系: 記録がない場合は全て0またはnullを返す', async () => {
      const result = await service.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(0);
      expect(result.data?.uniqueSpecies).toBe(0);
      expect(result.data?.uniqueLocations).toBe(0);
      expect(result.data?.averageSize).toBeNull();
      expect(result.data?.maxSize).toBeNull();
      expect(result.data?.recordsWithPhotos).toBe(0);
      expect(result.data?.firstRecordDate).toBeNull();
      expect(result.data?.lastRecordDate).toBeNull();
    });

    it('正常系: 統計情報を正しく計算する', async () => {
      // テストデータ作成
      await service.createRecord({
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: 50,
        photoId: 'photo-1'
      });
      await service.createRecord({
        date: new Date('2024-01-20'),
        location: '相模湾',
        fishSpecies: 'アジ',
        size: 30
      });
      await service.createRecord({
        date: new Date('2024-01-25'),
        location: '東京湾',
        fishSpecies: 'シーバス',
        size: 70,
        photoId: 'photo-2'
      });

      const result = await service.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.totalRecords).toBe(3);
      expect(result.data?.uniqueSpecies).toBe(3);
      expect(result.data?.uniqueLocations).toBe(2); // 東京湾、相模湾
      expect(result.data?.averageSize).toBe(50); // (50+30+70)/3
      expect(result.data?.maxSize).toBe(70);
      expect(result.data?.recordsWithPhotos).toBe(2);
      expect(result.data?.firstRecordDate).toEqual(new Date('2024-01-15'));
      expect(result.data?.lastRecordDate).toEqual(new Date('2024-01-25'));
    });

    it('正常系: sizeがnullまたはundefinedの記録は平均計算から除外される', async () => {
      await service.createRecord({
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: 50
      });
      await service.createRecord({
        date: new Date('2024-01-20'),
        location: '相模湾',
        fishSpecies: 'アジ'
        // sizeなし
      });

      const result = await service.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.averageSize).toBe(50); // 50のみで計算
      expect(result.data?.maxSize).toBe(50);
    });
  });

  // ============================================================================
  // フェーズ3: フィルタリング・エラーハンドリングテスト（Critical）
  // ============================================================================

  describe('getRecords - フィルタリング', () => {
    beforeEach(async () => {
      // テストデータ作成（異なる条件で5件）
      await service.createRecord({
        date: new Date('2024-01-10'),
        location: '東京湾',
        fishSpecies: 'スズキ',
        size: 30
      });
      await service.createRecord({
        date: new Date('2024-01-15'),
        location: '東京湾内湾',
        fishSpecies: 'アジ',
        size: 50
      });
      await service.createRecord({
        date: new Date('2024-01-20'),
        location: '相模湾',
        fishSpecies: 'シーバス',
        size: 70
      });
      await service.createRecord({
        date: new Date('2024-01-25'),
        location: '駿河湾',
        fishSpecies: 'スズキ',
        size: 40
      });
      await service.createRecord({
        date: new Date('2024-01-30'),
        location: '東京港',
        fishSpecies: 'クロダイ',
        size: 60
      });
    });

    it('正常系: 日付範囲フィルターで絞り込める', async () => {
      const result = await service.getRecords({
        filter: {
          dateRange: {
            start: new Date('2024-01-12'),
            end: new Date('2024-01-22')
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2); // 1/15と1/20の2件
      expect(result.data?.every(r =>
        r.date >= new Date('2024-01-12') && r.date <= new Date('2024-01-22')
      )).toBe(true);
    });

    it('正常系: 魚種フィルター（anyOf）で絞り込める', async () => {
      const result = await service.getRecords({
        filter: {
          fishSpecies: ['スズキ', 'アジ']
        }
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3); // スズキ2件、アジ1件
      expect(result.data?.every(r =>
        r.fishSpecies === 'スズキ' || r.fishSpecies === 'アジ'
      )).toBe(true);
    });

    it('正常系: 場所フィルター（部分一致）で絞り込める', async () => {
      const result = await service.getRecords({
        filter: {
          location: '東京'
        }
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3); // 東京湾、東京湾内湾、東京港
      expect(result.data?.every(r =>
        r.location.includes('東京')
      )).toBe(true);
    });

    it('正常系: サイズ範囲フィルターで絞り込める', async () => {
      const result = await service.getRecords({
        filter: {
          sizeRange: {
            min: 40,
            max: 60
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3); // size: 40, 50, 60
      expect(result.data?.every(r =>
        r.size !== undefined && r.size >= 40 && r.size <= 60
      )).toBe(true);
    });

    it('正常系: 複数フィルターを同時に適用できる', async () => {
      const result = await service.getRecords({
        filter: {
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-20')
          },
          fishSpecies: ['スズキ', 'アジ'],
          location: '東京'
        }
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2); // 1/10スズキ（東京湾）、1/15アジ（東京湾内湾）
    });
  });

  describe('createRecord - エラーハンドリング', () => {
    it('異常系: IndexedDB操作失敗時にCREATE_FAILEDエラーを返す', async () => {
      // db.fishing_records.add をモック化してエラーをスロー
      const addSpy = vi.spyOn(db.fishing_records, 'add');
      addSpy.mockRejectedValueOnce(new Error('DB Error'));

      const form: CreateFishingRecordForm = {
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ'
      };

      const result = await service.createRecord(form);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CREATE_FAILED');
      expect(result.error?.message).toContain('Failed to create');

      addSpy.mockRestore();
    });
  });

  describe('updateRecord - エラーハンドリング', () => {
    it('異常系: IndexedDB操作失敗時にUPDATE_FAILEDエラーを返す', async () => {
      // テストデータ作成
      const createResult = await service.createRecord({
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ'
      });
      const recordId = createResult.data!.id;

      // db.fishing_records.update をモック化してエラーをスロー
      const updateSpy = vi.spyOn(db.fishing_records, 'update');
      updateSpy.mockRejectedValueOnce(new Error('DB Error'));

      const result = await service.updateRecord(recordId, { size: 60 });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UPDATE_FAILED');
      expect(result.error?.message).toContain('Failed to update');

      updateSpy.mockRestore();
    });
  });

  describe('deleteRecord - エラーハンドリング', () => {
    it('異常系: IndexedDB操作失敗時にDELETE_FAILEDエラーを返す', async () => {
      // テストデータ作成
      const createResult = await service.createRecord({
        date: new Date('2024-01-15'),
        location: '東京湾',
        fishSpecies: 'スズキ'
      });
      const recordId = createResult.data!.id;

      // db.fishing_records.delete をモック化してエラーをスロー
      const deleteSpy = vi.spyOn(db.fishing_records, 'delete');
      deleteSpy.mockRejectedValueOnce(new Error('DB Error'));

      const result = await service.deleteRecord(recordId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DELETE_FAILED');
      expect(result.error?.message).toContain('Failed to delete');

      deleteSpy.mockRestore();
    });
  });
});
