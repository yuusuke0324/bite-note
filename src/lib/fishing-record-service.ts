// 釣果記録データアクセスサービス

import { v4 as uuidv4 } from 'uuid';
import Dexie from 'dexie';
import { db } from './database';
import { logger } from './errors';
import type {
  FishingRecord,
  CreateFishingRecordForm,
  UpdateFishingRecordForm,
  DatabaseResult,
  GetRecordsParams,
  RecordFilter,
  RecordSummary
} from '../types';

export class FishingRecordService {

  // 釣果記録の作成
  async createRecord(form: CreateFishingRecordForm): Promise<DatabaseResult<FishingRecord>> {
    try {
      // バリデーション
      const validationResult = this.validateCreateForm(form);
      if (!validationResult.success) {
        return validationResult as DatabaseResult<FishingRecord>;
      }

      const now = new Date();
      const record: FishingRecord = {
        id: uuidv4(),
        date: new Date(form.date),
        location: form.location,
        fishSpecies: form.fishSpecies,
        size: form.size,
        weight: form.weight,
        photoId: form.photoId,
        coordinates: form.coordinates,
        notes: form.notes,
        createdAt: now,
        updatedAt: now
      };

      await db.fishing_records.add(record);

      // 総記録数の更新
      await this.updateTotalRecordsCount();

      return {
        success: true,
        data: record
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create fishing record',
          details: error
        }
      };
    }
  }

  // 釣果記録の取得（ID指定）
  async getRecordById(id: string): Promise<DatabaseResult<FishingRecord>> {
    try {
      const record = await db.fishing_records.get(id);

      if (!record) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Fishing record with id ${id} not found`
          }
        };
      }

      return {
        success: true,
        data: record
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: 'Failed to get fishing record',
          details: error
        }
      };
    }
  }

  // 釣果記録の一覧取得
  async getRecords(params: GetRecordsParams = {}): Promise<DatabaseResult<FishingRecord[]>> {
    try {
      let collection;

      // フィルタリングの適用（where句を先に適用）
      if (params.filter) {
        const whereFiltered = this.applyWhereFilter(db.fishing_records, params.filter);
        collection = this.applyJsFilter(whereFiltered, params.filter);
      } else {
        collection = db.fishing_records.toCollection();
      }

      // ソート（sortByを使用してメモリ上でソート）
      const sortedRecords = await collection.sortBy(params.sortBy || 'date');

      // ソート順の設定
      if (params.sortOrder === 'desc') {
        sortedRecords.reverse();
      }

      // ページネーション（JavaScriptのsliceを使用）
      const { offset = 0, limit } = params;
      const paginatedRecords = limit
        ? sortedRecords.slice(offset, offset + limit)
        : sortedRecords.slice(offset);

      return {
        success: true,
        data: paginatedRecords
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_RECORDS_FAILED',
          message: 'Failed to get fishing records',
          details: error
        }
      };
    }
  }

  // 釣果記録の更新
  async updateRecord(id: string, form: UpdateFishingRecordForm): Promise<DatabaseResult<FishingRecord>> {
    try {
      // 既存記録の存在確認
      const existingRecord = await db.fishing_records.get(id);
      if (!existingRecord) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Fishing record with id ${id} not found`
          }
        };
      }

      // バリデーション
      const validationResult = this.validateUpdateForm(form);
      if (!validationResult.success) {
        return validationResult as DatabaseResult<FishingRecord>;
      }

      // 更新データの作成
      const updatedRecord: FishingRecord = {
        ...existingRecord,
        ...form,
        date: form.date ? new Date(form.date) : existingRecord.date,
        updatedAt: new Date()
      };

      await db.fishing_records.update(id, updatedRecord);

      return {
        success: true,
        data: updatedRecord
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update fishing record',
          details: error
        }
      };
    }
  }

  // 釣果記録の削除
  async deleteRecord(id: string): Promise<DatabaseResult<void>> {
    try {
      const existingRecord = await db.fishing_records.get(id);
      if (!existingRecord) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Fishing record with id ${id} not found`
          }
        };
      }

      await db.fishing_records.delete(id);

      // 総記録数の更新
      await this.updateTotalRecordsCount();

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete fishing record',
          details: error
        }
      };
    }
  }

  // 記録の概要情報を取得
  async getRecordsSummary(limit = 10): Promise<DatabaseResult<RecordSummary[]>> {
    try {
      const records = await db.fishing_records
        .orderBy('date')
        .reverse()
        .limit(limit)
        .toArray();

      const summaries: RecordSummary[] = records.map(record => ({
        id: record.id,
        date: record.date,
        location: record.location,
        fishSpecies: record.fishSpecies,
        hasPhoto: !!record.photoId
      }));

      return {
        success: true,
        data: summaries
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_SUMMARY_FAILED',
          message: 'Failed to get records summary',
          details: error
        }
      };
    }
  }

  // 統計情報の取得
  async getStatistics(): Promise<DatabaseResult<{
    totalRecords: number;
    uniqueSpecies: number;
    uniqueLocations: number;
    averageSize: number | null;
    maxSize: number | null;
    recordsWithPhotos: number;
    firstRecordDate: Date | null;
    lastRecordDate: Date | null;
  }>> {
    try {
      const allRecords = await db.fishing_records.toArray();

      if (allRecords.length === 0) {
        return {
          success: true,
          data: {
            totalRecords: 0,
            uniqueSpecies: 0,
            uniqueLocations: 0,
            averageSize: null,
            maxSize: null,
            recordsWithPhotos: 0,
            firstRecordDate: null,
            lastRecordDate: null
          }
        };
      }

      const sizesWithValue = allRecords.filter(r => r.size !== undefined && r.size !== null);
      const uniqueSpecies = new Set(allRecords.map(r => r.fishSpecies)).size;
      const uniqueLocations = new Set(allRecords.map(r => r.location)).size;

      const statistics = {
        totalRecords: allRecords.length,
        uniqueSpecies,
        uniqueLocations,
        averageSize: sizesWithValue.length > 0 ?
          sizesWithValue.reduce((sum, r) => sum + (r.size || 0), 0) / sizesWithValue.length : null,
        maxSize: sizesWithValue.length > 0 ?
          Math.max(...sizesWithValue.map(r => r.size || 0)) : null,
        recordsWithPhotos: allRecords.filter(r => r.photoId).length,
        firstRecordDate: new Date(Math.min(...allRecords.map(r => r.date.getTime()))),
        lastRecordDate: new Date(Math.max(...allRecords.map(r => r.date.getTime())))
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
          message: 'Failed to get statistics',
          details: error
        }
      };
    }
  }

  // プライベートメソッド: Dexieのwhere句を使うフィルタリング
  private applyWhereFilter(
    table: Dexie.Table<FishingRecord, any>,
    filter: RecordFilter
  ): Dexie.Collection<FishingRecord, any> {
    let collection: Dexie.Collection<FishingRecord, any> = table.toCollection();

    // 日付範囲フィルター
    if (filter.dateRange) {
      collection = table
        .where('date')
        .between(filter.dateRange.start, filter.dateRange.end, true, true);
    }

    // 魚種フィルター
    if (filter.fishSpecies && filter.fishSpecies.length > 0) {
      // 日付範囲フィルターと併用する場合は、JavaScriptフィルターにフォールバック
      if (filter.dateRange) {
        collection = collection.filter((record: FishingRecord) =>
          filter.fishSpecies!.includes(record.fishSpecies)
        );
      } else {
        collection = table.where('fishSpecies').anyOf(filter.fishSpecies);
      }
    }

    return collection;
  }

  // プライベートメソッド: JavaScriptのfilterを使うフィルタリング
  private applyJsFilter(
    collection: Dexie.Collection<FishingRecord, any>,
    filter: RecordFilter
  ): Dexie.Collection<FishingRecord, any> {
    let result = collection;

    // 場所フィルター（部分一致）
    if (filter.location) {
      result = result.filter((record: FishingRecord) =>
        record.location.toLowerCase().includes(filter.location!.toLowerCase())
      );
    }

    // サイズ範囲フィルター
    if (filter.sizeRange) {
      result = result.filter((record: FishingRecord) => {
        if (!record.size) return false;
        return record.size >= filter.sizeRange!.min && record.size <= filter.sizeRange!.max;
      });
    }

    return result;
  }

  // プライベートメソッド: 作成フォームのバリデーション
  private validateCreateForm(form: CreateFishingRecordForm): DatabaseResult<void> {
    if (!form.date) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Date is required'
        }
      };
    }

    if (!form.location || form.location.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Location is required'
        }
      };
    }

    if (!form.fishSpecies || form.fishSpecies.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Fish species is required'
        }
      };
    }

    if (form.size !== undefined && (form.size < 0 || form.size > 999)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Size must be between 0 and 999 cm'
        }
      };
    }

    if (form.weight !== undefined && (form.weight < 0 || form.weight > 99999)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Weight must be between 0 and 99999 g'
        }
      };
    }

    return { success: true };
  }

  // プライベートメソッド: 更新フォームのバリデーション
  private validateUpdateForm(form: UpdateFishingRecordForm): DatabaseResult<void> {
    if (form.location !== undefined && form.location.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Location cannot be empty'
        }
      };
    }

    if (form.fishSpecies !== undefined && form.fishSpecies.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Fish species cannot be empty'
        }
      };
    }

    if (form.size !== undefined && (form.size < 0 || form.size > 999)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Size must be between 0 and 999 cm'
        }
      };
    }

    if (form.weight !== undefined && (form.weight < 0 || form.weight > 99999)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Weight must be between 0 and 99999 g'
        }
      };
    }

    return { success: true };
  }

  // プライベートメソッド: 総記録数の更新
  private async updateTotalRecordsCount(): Promise<void> {
    try {
      const count = await db.fishing_records.count();
      await db.updateMetadata('total_records', count.toString());
    } catch (error) {
      logger.warn('Failed to update total records count', { error });
    }
  }
}

// サービスインスタンスのシングルトン
export const fishingRecordService = new FishingRecordService();