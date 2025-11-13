/**
 * DataValidationService テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataValidationService } from '../lib/data-validation-service';
import { db } from '../lib/database';
import type { FishingRecord, PhotoData } from '../types';

describe('DataValidationService', () => {
  beforeEach(async () => {
    // データベースをクリア
    try {
      await db.fishing_records.clear();
      await db.photos.clear();
      await db.app_settings.clear();
    } catch (e) {
      // データベースが開かれていない場合は開く
      await db.open();
      await db.fishing_records.clear();
      await db.photos.clear();
      await db.app_settings.clear();
    }
  });

  afterEach(async () => {
    try {
      await db.fishing_records.clear();
      await db.photos.clear();
      await db.app_settings.clear();
    } catch (e) {
      // エラーが発生した場合は無視
    }
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

    describe('数値境界値テスト', () => {
      it('size: 0（最小値）が有効', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          size: 0
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.isValid).toBe(true);
        expect(result.fields.find((f) => f.field === 'size')?.isValid).toBe(true);
      });

      it('size: 999（最大値）が有効', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          size: 999
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.isValid).toBe(true);
        expect(result.fields.find((f) => f.field === 'size')?.isValid).toBe(true);
      });

      it('size: -1（最小値-1）がエラー', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          size: -1
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.isValid).toBe(false);
        expect(result.fields.find((f) => f.field === 'size')?.isValid).toBe(false);
      });

      it('size: 1000（最大値+1）がエラー', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          size: 1000
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.isValid).toBe(false);
        expect(result.fields.find((f) => f.field === 'size')?.isValid).toBe(false);
      });

      it('weight: NaNがエラー', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          weight: NaN
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.isValid).toBe(false);
        expect(result.fields.find((f) => f.field === 'weight')?.isValid).toBe(false);
        expect(result.fields.find((f) => f.field === 'weight')?.error).toContain('数値である必要があります');
      });

      it('temperature: Infinityがエラー', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          temperature: Infinity
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.isValid).toBe(false);
        expect(result.fields.find((f) => f.field === 'temperature')?.isValid).toBe(false);
        // Infinityは範囲チェックでエラーになる
        expect(result.fields.find((f) => f.field === 'temperature')?.error).toContain('以上');
      });
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

    describe('座標境界値テスト', () => {
      it('latitude: -90（最小値）が有効', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: -90, longitude: 0, accuracy: 10 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.fields.find((f) => f.field === 'coordinates')?.isValid).toBe(true);
      });

      it('latitude: 90（最大値）が有効', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: 90, longitude: 0, accuracy: 10 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.fields.find((f) => f.field === 'coordinates')?.isValid).toBe(true);
      });

      it('latitude: -90.001（範囲外）がエラー', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: -90.001, longitude: 0, accuracy: 10 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.isValid).toBe(false);
        expect(result.fields.find((f) => f.field === 'coordinates')?.isValid).toBe(false);
        expect(result.fields.find((f) => f.field === 'coordinates')?.error).toContain('有効な範囲外');
      });

      it('latitude: 90.001（範囲外）がエラー', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: 90.001, longitude: 0, accuracy: 10 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.isValid).toBe(false);
        expect(result.fields.find((f) => f.field === 'coordinates')?.isValid).toBe(false);
      });

      it('longitude: -180（最小値）が有効', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: 0, longitude: -180, accuracy: 10 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.fields.find((f) => f.field === 'coordinates')?.isValid).toBe(true);
      });

      it('longitude: 180（最大値）が有効', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: 0, longitude: 180, accuracy: 10 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.fields.find((f) => f.field === 'coordinates')?.isValid).toBe(true);
      });

      it('accuracy: 0（最小値）が有効', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: 35.68, longitude: 139.77, accuracy: 0 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.fields.find((f) => f.field === 'coordinates')?.isValid).toBe(true);
      });

      it('accuracy: -1（負の値）がエラー', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: 35.68, longitude: 139.77, accuracy: -1 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.isValid).toBe(false);
        expect(result.fields.find((f) => f.field === 'coordinates.accuracy')?.isValid).toBe(false);
        expect(result.fields.find((f) => f.field === 'coordinates.accuracy')?.error).toContain('0以上の数値');
      });
    });

    describe('日本近海境界値テスト', () => {
      it('緯度20.0（南端）がtrueを返す', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: 20.0, longitude: 136.0, accuracy: 10 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        // 日本近海なので警告なし
        expect(result.warnings.some((w) => w.includes('日本近海でない'))).toBe(false);
      });

      it('緯度19.999（南端外）で警告を出す', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: 19.999, longitude: 136.0, accuracy: 10 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.warnings.some((w) => w.includes('日本近海でない'))).toBe(true);
      });

      it('経度122.0（西端）がtrueを返す', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: 35.0, longitude: 122.0, accuracy: 10 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.warnings.some((w) => w.includes('日本近海でない'))).toBe(false);
      });

      it('経度121.999（西端外）で警告を出す', async () => {
        const record: Partial<FishingRecord> = {
          date: new Date(),
          location: 'テスト',
          fishSpecies: 'テスト',
          coordinates: { latitude: 35.0, longitude: 121.999, accuracy: 10 }
        };

        const result = await dataValidationService.validateFishingRecord(record, {
          checkReferences: false
        });

        expect(result.warnings.some((w) => w.includes('日本近海でない'))).toBe(true);
      });
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

  // ============================================
  // Priority 3: エッジケーステスト
  // ============================================

  describe('validateRequiredField - エッジケース', () => {
    it('undefined は無効', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: undefined as any,
        fishSpecies: 'テスト'
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.isValid).toBe(false);
      expect(result.fields.find((f) => f.field === 'location')?.isValid).toBe(false);
      expect(result.fields.find((f) => f.field === 'location')?.error).toContain('必須項目');
    });

    it('null は無効', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: null as any,
        fishSpecies: 'テスト'
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.isValid).toBe(false);
      expect(result.fields.find((f) => f.field === 'location')?.isValid).toBe(false);
      expect(result.fields.find((f) => f.field === 'location')?.error).toContain('必須項目');
    });

    it('空文字列 "" は無効', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: '',
        fishSpecies: 'テスト'
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.isValid).toBe(false);
      expect(result.fields.find((f) => f.field === 'location')?.isValid).toBe(false);
      expect(result.fields.find((f) => f.field === 'location')?.error).toContain('必須項目');
    });

    it('スペースのみ " " は無効', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: '   ',
        fishSpecies: 'テスト'
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.isValid).toBe(false);
      expect(result.fields.find((f) => f.field === 'location')?.isValid).toBe(false);
      expect(result.fields.find((f) => f.field === 'location')?.error).toContain('必須項目');
    });

    it('数値0は有効（falsy値だが数値として有効）', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: 'テスト',
        fishSpecies: 'テスト',
        size: 0
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.isValid).toBe(true);
      expect(result.fields.find((f) => f.field === 'size')?.isValid).toBe(true);
    });
  });

  describe('validateStringLength - 境界値', () => {
    it('location: 100文字（最大値）が有効', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: 'a'.repeat(100),
        fishSpecies: 'テスト'
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.fields.find((f) => f.field === 'location')?.isValid).toBe(true);
    });

    it('location: 101文字（最大値+1）がエラー', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: 'a'.repeat(101),
        fishSpecies: 'テスト'
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      expect(result.isValid).toBe(false);
      // 最後のlocation検証結果を確認（validateStringLengthの結果）
      const locationFields = result.fields.filter((f) => f.field === 'location');
      const stringLengthValidation = locationFields[locationFields.length - 1];
      expect(stringLengthValidation?.isValid).toBe(false);
      expect(stringLengthValidation?.error).toContain('100文字以下');
    });

    it('notes: Unicode絵文字を含む500文字が有効', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: 'テスト',
        fishSpecies: 'テスト',
        // 絵文字🐟は2文字としてカウント: 125個 × 2 = 250文字 + 通常文字250個 = 500文字
        notes: '🐟'.repeat(125) + 'a'.repeat(250)
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      const notesField = result.fields.find((f) => f.field === 'notes');
      expect(notesField?.isValid).toBe(true);
    });

    it('notes: 空文字列が有効（オプショナルフィールド）', async () => {
      const record: Partial<FishingRecord> = {
        date: new Date(),
        location: 'テスト',
        fishSpecies: 'テスト',
        notes: ''
      };

      const result = await dataValidationService.validateFishingRecord(record, {
        checkReferences: false
      });

      // notesは空文字列の場合、検証がスキップされる
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePhoto', () => {
    it('有効な写真データを検証できる', async () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const photo: Partial<PhotoData> = {
        blob: blob,
        filename: 'test.jpg',
        mimeType: blob.type,
        fileSize: blob.size,
        uploadedAt: new Date()
      };

      const result = await dataValidationService.validatePhoto(photo);

      expect(result.isValid).toBe(true);
      expect(result.fields.every((f) => f.isValid)).toBe(true);
    });

    it('データが欠けている場合はエラー', async () => {
      const photo: Partial<PhotoData> = {};

      const result = await dataValidationService.validatePhoto(photo);

      expect(result.isValid).toBe(false);
      expect(result.fields.some((f) => f.field === 'blob' && !f.isValid)).toBe(true);
    });

    it('ファイルサイズが大きすぎる場合はエラー', async () => {
      // 11MBのダミーデータ
      const largeData = new Array(11 * 1024 * 1024).fill('a').join('');
      const blob = new Blob([largeData], { type: 'image/jpeg' });

      const photo: Partial<PhotoData> = {
        blob: blob,
        fileSize: blob.size
      };

      const result = await dataValidationService.validatePhoto(photo);

      expect(result.isValid).toBe(false);
      expect(result.fields.some((f) => f.field === 'fileSize' && !f.isValid)).toBe(true);
    });

    it('サポートされていないMIMEタイプの場合はエラー', async () => {
      const blob = new Blob(['test'], { type: 'application/pdf' });

      const photo: Partial<PhotoData> = {
        blob: blob,
        mimeType: 'application/pdf'
      };

      const result = await dataValidationService.validatePhoto(photo);

      expect(result.isValid).toBe(false);
      expect(result.fields.some((f) => f.field === 'mimeType' && !f.isValid)).toBe(true);
    });
  });

  describe('findOrphanedPhotos', () => {
    it('孤立した写真を検出できる', async () => {
      // 写真を作成
      const photoBlob = new Blob(['test'], { type: 'image/jpeg' });
      const photo1 = await db.photos.add({
        id: 'photo-1',
        blob: photoBlob,
        filename: 'test1.jpg',
        mimeType: photoBlob.type,
        fileSize: photoBlob.size,
        uploadedAt: new Date()
      });

      const photo2 = await db.photos.add({
        id: 'photo-2',
        blob: photoBlob,
        filename: 'test2.jpg',
        mimeType: photoBlob.type,
        fileSize: photoBlob.size,
        uploadedAt: new Date()
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
        blob: photoBlob,
        filename: 'test.jpg',
        mimeType: photoBlob.type,
        fileSize: photoBlob.size,
        uploadedAt: new Date()
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
        setting_key: 'dataVersion',
        setting_value: JSON.stringify(version),
        value_type: 'object',
        updated_at: new Date()
      });

      const result = await dataValidationService.getDataVersion();

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe('1.0.0');
      expect(result.data?.schemaVersion).toBe(1);
      expect(result.data?.migrationsApplied).toEqual(['migration-1', 'migration-2']);
    });
  });

  describe('updateDataVersion', () => {
    it('バージョン情報を正常に更新できる', async () => {
      const newVersion = {
        version: '2.0.0',
        schemaVersion: 2,
        migrationsApplied: ['migration-2024-01']
      };

      const result = await dataValidationService.updateDataVersion(newVersion);

      expect(result.success).toBe(true);

      // 更新されたバージョンを取得して確認
      const getResult = await dataValidationService.getDataVersion();
      expect(getResult.success).toBe(true);
      expect(getResult.data?.version).toBe('2.0.0');
      expect(getResult.data?.schemaVersion).toBe(2);
      expect(getResult.data?.migrationsApplied).toEqual(['migration-2024-01']);
    });

    it('既存バージョン情報を上書きできる', async () => {
      // 初回バージョン設定
      const initialVersion = {
        version: '1.0.0',
        schemaVersion: 1,
        migrationsApplied: []
      };
      await dataValidationService.updateDataVersion(initialVersion);

      // 上書き
      const updatedVersion = {
        version: '1.5.0',
        schemaVersion: 1,
        migrationsApplied: ['migration-2024-02', 'migration-2024-03']
      };
      const updateResult = await dataValidationService.updateDataVersion(updatedVersion);

      expect(updateResult.success).toBe(true);

      // 上書きされたことを確認
      const getResult = await dataValidationService.getDataVersion();
      expect(getResult.data?.version).toBe('1.5.0');
      expect(getResult.data?.migrationsApplied).toHaveLength(2);
    });

    it('データベースエラー時に適切なエラーを返す', async () => {
      // db.app_settings.put をモック
      const putSpy = vi.spyOn(db.app_settings, 'put');
      putSpy.mockRejectedValueOnce(new Error('Database write error'));

      const version = {
        version: '3.0.0',
        schemaVersion: 3,
        migrationsApplied: []
      };

      const result = await dataValidationService.updateDataVersion(version);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VERSION_UPDATE_FAILED');
      expect(result.error?.message).toContain('バージョン情報の更新に失敗');

      putSpy.mockRestore();
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
