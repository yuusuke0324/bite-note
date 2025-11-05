/**
 * DataValidationService テスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dataValidationService } from '../lib/data-validation-service';
import { db } from '../lib/database';
import type { FishingRecord, Photo } from '../types';

describe('DataValidationService', () => {
  beforeEach(async () => {
    // データベースをクリア
    await db.fishing_records.clear();
    await db.photos.clear();
    await db.app_settings.clear();
  });

  afterEach(async () => {
    await db.fishing_records.clear();
    await db.photos.clear();
    await db.app_settings.clear();
  });

  describe('validateFishingRecord', () => {
    it('有効な記録を検証できる', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date('2024-01-01T10:00:00'),
        location: 'テスト釣り場',
        fishSpecies: 'テストアジ',
        size: 25,
        weight: 150,
        seaTemperature: 18.5,
        weather: '晴れ',
        notes: 'テストメモ',
        coordinates: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 10
        }
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.isValid).toBe(true);
      expect(result.fields.every((f) => f.isValid)).toBe(true);
      expect(result.referenceErrors).toHaveLength(0);
    });

    it('必須フィールドが欠けている場合はエラー', async () => {
      const record: Partial<FishingRecord> = {
        size: 25
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.isValid).toBe(false);
      expect(result.fields.some((f) => f.field === 'date' && !f.isValid)).toBe(true);
      expect(result.fields.some((f) => f.field === 'location' && !f.isValid)).toBe(true);
      expect(result.fields.some((f) => f.field === 'fishSpecies' && !f.isValid)).toBe(true);
    });

    it('数値フィールドが範囲外の場合はエラー', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: 'テスト',
        fishSpecies: 'テスト',
        size: -10 // 負の値
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.isValid).toBe(false);
      expect(result.fields.some((f) => f.field === 'size' && !f.isValid)).toBe(true);
    });

    it('未来の日付の場合は警告', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const record: Partial<FishingRecord> = {
        date: futureDate,
        location: 'テスト',
        fishSpecies: 'テスト'
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('未来の日付'))).toBe(true);
    });

    it('座標が日本近海でない場合は警告', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: 'テスト',
        fishSpecies: 'テスト',
        coordinates: {
          latitude: 0,
          longitude: 0,
          accuracy: 10
        }
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.warnings.some((w) => w.includes('日本近海でない'))).toBe(true);
    });

    it('存在しない写真IDを参照している場合はエラー', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: 'テスト',
        fishSpecies: 'テスト',
        photoId: 'non-existent-photo-id'
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: true
      });

      expect(result.referenceErrors.length).toBeGreaterThan(0);
      expect(result.referenceErrors.some((e) => e.includes('non-existent-photo-id'))).toBe(true);
    });
  });

  describe('validatePhoto', () => {
    it('有効な写真データを検証できる', async () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const photo: Partial<Photo> = {
        data: blob,
        metadata: {
          size: blob.size,
          type: blob.type,
          coordinates: {
            latitude: 35.6762,
            longitude: 139.6503
          }
        }
      };

      const result = await dataValidationService.validatePhoto(photo);

      expect(result.isValid).toBe(true);
      expect(result.fields.every((f) => f.isValid)).toBe(true);
    });

    it('データが欠けている場合はエラー', async () => {
      const photo: Partial<Photo> = {};

      const result = await dataValidationService.validatePhoto(photo);

      expect(result.isValid).toBe(false);
      expect(result.fields.some((f) => f.field === 'data' && !f.isValid)).toBe(true);
    });

    it('ファイルサイズが大きすぎる場合はエラー', async () => {
      // 11MBのダミーデータ
      const largeData = new Array(11 * 1024 * 1024).fill('a').join('');
      const blob = new Blob([largeData], { type: 'image/jpeg' });

      const photo: Partial<Photo> = {
        data: blob
      };

      const result = await dataValidationService.validatePhoto(photo);

      expect(result.isValid).toBe(false);
      expect(result.fields.some((f) => f.field === 'data.size' && !f.isValid)).toBe(true);
    });

    it('サポートされていないMIMEタイプの場合はエラー', async () => {
      const blob = new Blob(['test'], { type: 'application/pdf' });

      const photo: Partial<Photo> = {
        data: blob
      };

      const result = await dataValidationService.validatePhoto(photo);

      expect(result.isValid).toBe(false);
      expect(result.fields.some((f) => f.field === 'data.type' && !f.isValid)).toBe(true);
    });
  });

  describe('findOrphanedPhotos', () => {
    it('孤立した写真を検出できる', async () => {
      // 写真を作成
      const photoBlob = new Blob(['test'], { type: 'image/jpeg' });
      const photo1 = await db.photos.add({
        id: 'photo-1',
        data: photoBlob,
        metadata: {
          size: photoBlob.size,
          type: photoBlob.type
        },
        createdAt: new Date()
      });

      const photo2 = await db.photos.add({
        id: 'photo-2',
        data: photoBlob,
        metadata: {
          size: photoBlob.size,
          type: photoBlob.type
        },
        createdAt: new Date()
      });

      // 1つだけ参照する記録を作成
      await db.fishing_records.add({
        id: 'record-1',
        date: new Date(),
        location: 'テスト',
        fishSpecies: 'テスト',
        photoId: 'photo-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await dataValidationService.findOrphanedPhotos();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe('photo-2');
    });

    it('全ての写真が参照されている場合は空配列を返す', async () => {
      const photoBlob = new Blob(['test'], { type: 'image/jpeg' });
      await db.photos.add({
        id: 'photo-1',
        data: photoBlob,
        metadata: {
          size: photoBlob.size,
          type: photoBlob.type
        },
        createdAt: new Date()
      });

      await db.fishing_records.add({
        id: 'record-1',
        date: new Date(),
        location: 'テスト',
        fishSpecies: 'テスト',
        photoId: 'photo-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await dataValidationService.findOrphanedPhotos();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getDataVersion', () => {
    it('バージョン情報が存在しない場合はデフォルトを返す', async () => {
      const result = await dataValidationService.getDataVersion();

      expect(result.success).toBe(true);
      expect(result.data?.version).toBeDefined();
      expect(result.data?.schemaVersion).toBe(1);
      expect(result.data?.migrationsApplied).toEqual([]);
    });

    it('保存されたバージョン情報を取得できる', async () => {
      const version = {
        version: '1.0.0',
        schemaVersion: 1,
        migrationsApplied: ['migration-1', 'migration-2']
      };

      await db.app_settings.put({
        key: 'dataVersion',
        value: version,
        updatedAt: new Date()
      });

      const result = await dataValidationService.getDataVersion();

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe('1.0.0');
      expect(result.data?.schemaVersion).toBe(1);
      expect(result.data?.migrationsApplied).toEqual(['migration-1', 'migration-2']);
    });
  });

  describe('checkSchemaCompatibility', () => {
    it('互換性チェックができる', async () => {
      const result = await dataValidationService.checkSchemaCompatibility();

      expect(result.success).toBe(true);
      expect(result.data?.isCompatible).toBe(true);
      expect(result.data?.needsMigration).toBe(false);
    });
  });
});
