/**
 * DataValidationService.ts - データ検証強化サービス
 * フィールドレベル詳細検証、参照整合性、バージョン互換性を提供
 */

import { db } from './database';
import type { FishingRecord, PhotoData } from '../types';
import type { DatabaseResult } from '../types/database';
import { AppError, ErrorSeverity, ErrorCategory, logger } from './errors';

/**
 * フィールド検証結果
 */
export interface FieldValidationResult {
  field: string;
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * データ検証結果
 */
export interface DataValidationResult {
  isValid: boolean;
  fields: FieldValidationResult[];
  referenceErrors: string[];
  warnings: string[];
}

/**
 * データバージョン情報
 */
export interface DataVersion {
  version: string;
  schemaVersion: number;
  migrationsApplied: string[];
  lastMigrationDate?: Date;
}

/**
 * マイグレーション定義
 */
export interface Migration {
  id: string;
  version: string;
  description: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

/**
 * データ検証サービス
 */
export class DataValidationService {
  private readonly CURRENT_SCHEMA_VERSION = 1;
  private readonly CURRENT_APP_VERSION = '1.4.0';

  /**
   * 釣果記録の詳細検証
   */
  async validateFishingRecord(
    record: Partial<FishingRecord>,
    options: { checkReferences?: boolean; strict?: boolean } = {}
  ): Promise<DataValidationResult> {
    const { checkReferences = true, strict = false } = options;
    const fields: FieldValidationResult[] = [];
    const referenceErrors: string[] = [];
    const warnings: string[] = [];

    // 1. 必須フィールド検証
    fields.push(this.validateRequiredField('date', record.date));
    fields.push(this.validateRequiredField('location', record.location));
    fields.push(this.validateRequiredField('fishSpecies', record.fishSpecies));

    // 2. 日付検証
    if (record.date) {
      const dateResult = this.validateDate(record.date);
      fields.push(dateResult);

      // 未来の日付は警告
      const date = new Date(record.date);
      if (date > new Date()) {
        warnings.push('日付が未来の日付になっています。釣行予定の記録ですか？');
      }
    }

    // 3. 数値フィールド検証
    if (record.size !== undefined) {
      fields.push(this.validateNumericField('size', record.size, { min: 0, max: 999, unit: 'cm' }));
    }

    if (record.weight !== undefined) {
      fields.push(this.validateNumericField('weight', record.weight, { min: 0, max: 99999, unit: 'g' }));
    }

    if (record.temperature !== undefined) {
      fields.push(
        this.validateNumericField('temperature', record.temperature, {
          min: 0,
          max: 50,
          unit: '°C'
        })
      );

      // 異常値の警告
      if (record.temperature < 5 || record.temperature > 35) {
        warnings.push(
          `海面水温が通常の範囲外です (${record.temperature}°C)。入力値を確認してください。`
        );
      }
    }

    // 4. 座標検証
    if (record.coordinates) {
      fields.push(this.validateCoordinates(record.coordinates));

      // 日本近海でない場合は警告
      if (!this.isJapanCoordinates(record.coordinates.latitude, record.coordinates.longitude)) {
        warnings.push('座標が日本近海でない可能性があります。位置情報を確認してください。');
      }
    }

    // 5. 文字列長検証
    if (record.location) {
      fields.push(this.validateStringLength('location', record.location, { max: 100 }));
    }

    if (record.fishSpecies) {
      fields.push(this.validateStringLength('fishSpecies', record.fishSpecies, { max: 100 }));
    }

    if (record.weather) {
      fields.push(this.validateStringLength('weather', record.weather, { max: 100 }));
    }

    if (record.notes) {
      fields.push(this.validateStringLength('notes', record.notes, { max: 500 }));
    }

    // 6. 参照整合性チェック
    if (checkReferences && record.photoId) {
      const photoExists = await this.checkPhotoReference(record.photoId);
      if (!photoExists) {
        referenceErrors.push(`写真ID "${record.photoId}" が存在しません`);
      }
    }

    // 7. 総合判定
    const hasFieldErrors = fields.some((f) => !f.isValid);
    const hasReferenceErrors = referenceErrors.length > 0;
    const isValid = !hasFieldErrors && (!strict || !hasReferenceErrors);

    return {
      isValid,
      fields,
      referenceErrors,
      warnings
    };
  }

  /**
   * 写真データの詳細検証
   */
  async validatePhoto(photo: Partial<PhotoData>): Promise<DataValidationResult> {
    const fields: FieldValidationResult[] = [];
    const referenceErrors: string[] = [];
    const warnings: string[] = [];

    // 1. 必須フィールド検証
    fields.push(this.validateRequiredField('blob', photo.blob));

    // 2. データサイズ検証
    if (photo.blob) {
      const size = photo.blob.size;
      fields.push({
        field: 'fileSize',
        isValid: size <= 10 * 1024 * 1024, // 10MB制限
        error: size > 10 * 1024 * 1024 ? 'ファイルサイズが10MBを超えています' : undefined
      });

      // 5MB以上で警告
      if (size > 5 * 1024 * 1024 && size <= 10 * 1024 * 1024) {
        warnings.push(`ファイルサイズが大きいです (${(size / 1024 / 1024).toFixed(2)}MB)`);
      }
    }

    // 3. MIMEタイプ検証
    if (photo.mimeType) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      fields.push({
        field: 'mimeType',
        isValid: validTypes.includes(photo.mimeType),
        error: !validTypes.includes(photo.mimeType)
          ? `サポートされていない画像形式です: ${photo.mimeType}`
          : undefined
      });
    }

    const hasFieldErrors = fields.some((f) => !f.isValid);
    const isValid = !hasFieldErrors;

    return {
      isValid,
      fields,
      referenceErrors,
      warnings
    };
  }

  /**
   * 参照整合性チェック - 写真
   */
  private async checkPhotoReference(photoId: string): Promise<boolean> {
    try {
      const photo = await db.photos.get(photoId);
      return !!photo;
    } catch (error) {
      logger.error('Photo reference check failed', { error });
      return false;
    }
  }

  /**
   * 参照整合性チェック - 孤立した写真検出
   */
  async findOrphanedPhotos(): Promise<DatabaseResult<PhotoData[]>> {
    try {
      // 全写真を取得
      const allPhotos = await db.photos.toArray();

      // 全記録を取得
      const allRecords = await db.fishing_records.toArray();
      const referencedPhotoIds = new Set(
        allRecords.filter((r: FishingRecord) => r.photoId).map((r: FishingRecord) => r.photoId as string)
      );

      // 参照されていない写真を検出
      const orphanedPhotos = allPhotos.filter((photo: PhotoData) => !referencedPhotoIds.has(photo.id));

      return {
        success: true,
        data: orphanedPhotos
      };
    } catch (error) {
      return {
        success: false,
        error: new AppError({
          code: 'ORPHANED_PHOTOS_CHECK_FAILED',
          message: '孤立した写真の検出に失敗しました',
          userMessage: '孤立した写真の検出中にエラーが発生しました',
          severity: ErrorSeverity.WARNING,
          category: ErrorCategory.STORAGE,
          cause: error instanceof Error ? error : undefined
        })
      };
    }
  }

  /**
   * 必須フィールド検証
   */
  private validateRequiredField(field: string, value: unknown): FieldValidationResult {
    const isValid =
      value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '');

    return {
      field,
      isValid,
      error: !isValid ? `${field}は必須項目です` : undefined
    };
  }

  /**
   * 日付検証
   */
  private validateDate(date: string | Date): FieldValidationResult {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const isValid = !isNaN(dateObj.getTime());

    return {
      field: 'date',
      isValid,
      error: !isValid ? '無効な日付形式です' : undefined
    };
  }

  /**
   * 数値フィールド検証
   */
  private validateNumericField(
    field: string,
    value: number,
    options: { min?: number; max?: number; unit?: string }
  ): FieldValidationResult {
    const { min = -Infinity, max = Infinity, unit = '' } = options;

    if (typeof value !== 'number' || isNaN(value)) {
      return {
        field,
        isValid: false,
        error: `${field}は数値である必要があります`
      };
    }

    if (value < min || value > max) {
      return {
        field,
        isValid: false,
        error: `${field}は${min}${unit}以上${max}${unit}以下である必要があります`
      };
    }

    return {
      field,
      isValid: true
    };
  }

  /**
   * 座標検証
   */
  private validateCoordinates(coordinates: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  }): FieldValidationResult {
    const { latitude, longitude, accuracy } = coordinates;

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return {
        field: 'coordinates',
        isValid: false,
        error: '座標は数値である必要があります'
      };
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return {
        field: 'coordinates',
        isValid: false,
        error: '座標が有効な範囲外です (緯度: -90～90, 経度: -180～180)'
      };
    }

    if (accuracy !== undefined && (typeof accuracy !== 'number' || accuracy < 0)) {
      return {
        field: 'coordinates.accuracy',
        isValid: false,
        error: '精度は0以上の数値である必要があります'
      };
    }

    return {
      field: 'coordinates',
      isValid: true
    };
  }

  /**
   * 文字列長検証
   */
  private validateStringLength(
    field: string,
    value: string,
    options: { min?: number; max?: number }
  ): FieldValidationResult {
    const { min = 0, max = Infinity } = options;
    const length = value.length;

    if (length < min || length > max) {
      return {
        field,
        isValid: false,
        error: `${field}は${min}文字以上${max}文字以下である必要があります`
      };
    }

    return {
      field,
      isValid: true
    };
  }

  /**
   * 日本近海の座標判定
   */
  private isJapanCoordinates(latitude: number, longitude: number): boolean {
    // 日本の緯度経度範囲（おおよそ）
    const JAPAN_LAT_MIN = 20.0; // 沖ノ鳥島付近
    const JAPAN_LAT_MAX = 46.0; // 択捉島付近
    const JAPAN_LNG_MIN = 122.0; // 与那国島付近
    const JAPAN_LNG_MAX = 154.0; // 南鳥島付近

    return (
      latitude >= JAPAN_LAT_MIN &&
      latitude <= JAPAN_LAT_MAX &&
      longitude >= JAPAN_LNG_MIN &&
      longitude <= JAPAN_LNG_MAX
    );
  }

  /**
   * データバージョン情報取得
   */
  async getDataVersion(): Promise<DatabaseResult<DataVersion>> {
    try {
      const versionSetting = await db.app_settings.get('dataVersion');

      if (versionSetting) {
        return {
          success: true,
          data: JSON.parse(versionSetting.setting_value) as DataVersion
        };
      }

      // 初回起動時はデフォルトバージョンを返す
      const defaultVersion: DataVersion = {
        version: this.CURRENT_APP_VERSION,
        schemaVersion: this.CURRENT_SCHEMA_VERSION,
        migrationsApplied: []
      };

      return {
        success: true,
        data: defaultVersion
      };
    } catch (error) {
      return {
        success: false,
        error: new AppError({
          code: 'VERSION_GET_FAILED',
          message: 'バージョン情報の取得に失敗しました',
          userMessage: 'データバージョン情報の取得中にエラーが発生しました',
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.STORAGE,
          cause: error instanceof Error ? error : undefined
        })
      };
    }
  }

  /**
   * データバージョン情報更新
   */
  async updateDataVersion(version: DataVersion): Promise<DatabaseResult<void>> {
    try {
      await db.app_settings.put({
        setting_key: 'dataVersion',
        setting_value: JSON.stringify(version),
        value_type: 'object',
        updated_at: new Date()
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: new AppError({
          code: 'VERSION_UPDATE_FAILED',
          message: 'バージョン情報の更新に失敗しました',
          userMessage: 'データバージョン情報の更新中にエラーが発生しました',
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.STORAGE,
          cause: error instanceof Error ? error : undefined
        })
      };
    }
  }

  /**
   * スキーマバージョンチェック
   */
  async checkSchemaCompatibility(): Promise<DatabaseResult<{
    isCompatible: boolean;
    currentVersion: number;
    requiredVersion: number;
    needsMigration: boolean;
  }>> {
    try {
      const versionResult = await this.getDataVersion();

      if (!versionResult.success || !versionResult.data) {
        return {
          success: true,
          data: {
            isCompatible: true,
            currentVersion: this.CURRENT_SCHEMA_VERSION,
            requiredVersion: this.CURRENT_SCHEMA_VERSION,
            needsMigration: false
          }
        };
      }

      const dataVersion = versionResult.data;
      const needsMigration = dataVersion.schemaVersion < this.CURRENT_SCHEMA_VERSION;
      const isCompatible = dataVersion.schemaVersion <= this.CURRENT_SCHEMA_VERSION;

      return {
        success: true,
        data: {
          isCompatible,
          currentVersion: dataVersion.schemaVersion,
          requiredVersion: this.CURRENT_SCHEMA_VERSION,
          needsMigration
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new AppError({
          code: 'SCHEMA_COMPATIBILITY_CHECK_FAILED',
          message: 'スキーマ互換性チェックに失敗しました',
          userMessage: 'データ互換性の確認中にエラーが発生しました',
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.STORAGE,
          cause: error instanceof Error ? error : undefined
        })
      };
    }
  }
}

// シングルトンインスタンス
export const dataValidationService = new DataValidationService();
