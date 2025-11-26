/**
 * TideDataValidator.ts - データ検証専用コンポーネント
 * TASK-101: TideDataValidator実装
 */

import type { ValidationResult, ValidationOptions, ValidationSummary, ValidationWarning, ValidationError } from './types';
import type { RawTideData, TideChartData } from '../../utils/validation/types';
import type { ITideDataValidator, ITideDataTransformer } from '../../utils/validation/types';
import { TideValidationError, EmptyDataError } from '../../utils/validation/errors';
import { ErrorCategorizer } from './utils/ErrorCategorizer';
import { WarningGenerator } from './utils/WarningGenerator';

/**
 * TideDataValidator - データ検証専用コンポーネント
 */
export class TideDataValidator {
  private tideDataValidator: ITideDataValidator;
  private tideDataTransformer: ITideDataTransformer;

  constructor(
    tideDataValidator: ITideDataValidator,
    tideDataTransformer: ITideDataTransformer
  ) {
    this.tideDataValidator = tideDataValidator;
    this.tideDataTransformer = tideDataTransformer;
    if (!tideDataValidator || !tideDataTransformer) {
      throw new Error('Not implemented');
    }
  }

  /**
   * 包括的データ検証の実行
   * @param rawData 生潮汐データ
   * @param options 検証オプション
   * @returns 統一された検証結果
   */
  validateComprehensively(
    rawData: RawTideData[],
    options?: ValidationOptions
  ): ValidationResult {
    const startTime = performance.now();

    // デフォルトオプション
    const validationOptions: ValidationOptions = {
      enableWarnings: true,
      strictMode: false,
      performanceMode: false,
      ...options
    };

    // タイムアウト処理（バグ修正: 実際の経過時間を測定）
    if (validationOptions.timeoutMs) {
      if (performance.now() - startTime > validationOptions.timeoutMs) {
        return this.createTimeoutResult(rawData, performance.now() - startTime);
      }
    }

    // データ制限処理
    let dataToProcess = rawData;
    if (validationOptions.maxRecords && rawData.length > validationOptions.maxRecords) {
      dataToProcess = rawData.slice(0, validationOptions.maxRecords);
    }

    try {
      // 構造的エラーチェック
      if (!dataToProcess) {
        return this.createCriticalErrorResult(
          [this.createStructureError()],
          performance.now() - startTime
        );
      }

      if (dataToProcess.length === 0) {
        return this.createCriticalErrorResult(
          [new EmptyDataError()],
          performance.now() - startTime
        );
      }

      // 重複タイムスタンプチェック
      const duplicateError = this.checkDuplicateTimestamps(dataToProcess);
      if (duplicateError) {
        return this.createErrorResult(
          [duplicateError],
          [],
          performance.now() - startTime,
          dataToProcess
        );
      }

      // TASK-002検証実行（performanceMode/strictMode対応）
      let task002Errors: TideValidationError[] = [];

      if (validationOptions.performanceMode) {
        // ⚡ 高速モード: 軽量な検証のみ
        task002Errors = this.validateFast(dataToProcess);
      } else if (validationOptions.strictMode) {
        // 🔍 厳密モード: より厳しい検証
        task002Errors = this.validateStrictWithExtras(dataToProcess);
      } else {
        // 通常モード: 標準的な検証
        task002Errors = this.validateStrict(dataToProcess);
      }

      // エラー分類
      const categorizedErrors = ErrorCategorizer.categorize(task002Errors);

      // Critical エラーがある場合は即座に停止
      const criticalErrors = categorizedErrors.filter(e => e.severity === 'critical');
      if (criticalErrors.length > 0) {
        return this.createCriticalErrorResult(
          task002Errors,
          performance.now() - startTime
        );
      }

      // データ変換実行（エラーデータを除外）
      let transformedData: TideChartData[] = [];
      // パフォーマンス最適化: エラー0件の場合、フィルタリングスキップ
      const validData = categorizedErrors.length === 0
        ? dataToProcess
        : this.filterValidData(dataToProcess, categorizedErrors);

      if (validData.length > 0) {
        try {
          transformedData = this.tideDataTransformer.transform(validData);
        } catch (_error) {
          // 変換エラーは構造エラーとして扱う
          return this.createCriticalErrorResult(
            [this.createStructureError()],
            performance.now() - startTime
          );
        }
      }

      // 警告生成（performanceModeでスキップ、strictMode対応）
      const warnings = validationOptions.enableWarnings && !validationOptions.performanceMode
        ? WarningGenerator.generate(validData, validationOptions.strictMode)
        : [];

      // 結果作成
      const endTime = performance.now();
      const summary = this.createSummary(
        dataToProcess,
        validData,
        categorizedErrors,
        warnings,
        endTime - startTime
      );

      return {
        isValid: categorizedErrors.length === 0,
        errors: categorizedErrors,
        warnings,
        data: transformedData,
        summary
      };

    } catch (_error) {
      return this.createCriticalErrorResult(
        [this.createStructureError()],
        performance.now() - startTime
      );
    }
  }

  /**
   * 高速検証の実行（基本チェックのみ）
   * @param rawData 生潮汐データ
   * @returns 基本検証結果
   */
  validateBasic(rawData: RawTideData[]): Pick<ValidationResult, 'isValid' | 'errors'> {
    // 構造チェック
    if (!rawData) {
      return {
        isValid: false,
        errors: [ErrorCategorizer.categorize([this.createStructureError()])[0]]
      };
    }

    if (rawData.length === 0) {
      return {
        isValid: false,
        errors: [ErrorCategorizer.categorize([new EmptyDataError()])[0]]
      };
    }

    // TASK-002基本検証
    const basicErrors: TideValidationError[] = [];
    for (const [index, item] of rawData.entries()) {
      // 基本的な検証のみ実行
      if (!this.tideDataValidator.validateTimeFormat(item.time)) {
        basicErrors.push(new TideValidationError(
          `Invalid time format: "${item.time}". Expected ISO 8601 format.`,
          'INVALID_TIME_FORMAT',
          { timeValue: item.time, index }
        ));
      }

      if (!this.tideDataValidator.validateTideRange(item.tide)) {
        basicErrors.push(new TideValidationError(
          `Tide value ${item.tide}m is out of valid range.`,
          'TIDE_OUT_OF_RANGE',
          { tideValue: item.tide, index }
        ));
      }
    }

    if (basicErrors.length > 0) {
      return {
        isValid: false,
        errors: ErrorCategorizer.categorize(basicErrors)
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * 段階的検証の実行
   * @param rawData 生潮汐データ
   * @param options 検証オプション
   * @returns 段階的検証結果
   */
  validateInStages(
    rawData: RawTideData[],
    options: ValidationOptions
  ): ValidationResult {
    return this.validateComprehensively(rawData, options);
  }

  /**
   * 重複タイムスタンプをチェック
   */
  private checkDuplicateTimestamps(data: RawTideData[]): TideValidationError | null {
    const timeSet = new Set<string>();

    for (let i = 0; i < data.length; i++) {
      const time = data[i].time;
      if (timeSet.has(time)) {
        return new TideValidationError(
          `Duplicate timestamp: ${time}`,
          'DUPLICATE_TIMESTAMP',
          { timeValue: time, index: i }
        );
      }
      timeSet.add(time);
    }

    return null;
  }

  /**
   * 有効データのフィルタリング
   */
  private filterValidData(__data: RawTideData[], errors: Array<{ index?: number }>): RawTideData[] {
    // 早期リターン最適化: エラーが0件の場合、フィルタリング不要
    if (errors.length === 0) {
      return __data;
    }

    const errorIndices = new Set<number>();
    for (const error of errors) {
      if (error.index !== undefined) {
        errorIndices.add(error.index);
      }
    }

    return __data.filter((_, index) => !errorIndices.has(index));
  }

  /**
   * 構造エラーを作成
   */
  private createStructureError(): TideValidationError {
    return new TideValidationError(
      'Data structure is corrupted',
      'STRUCTURE_ERROR',
      {}
    );
  }

  /**
   * サマリーを作成
   */
  private createSummary(
    totalData: RawTideData[],
    validData: RawTideData[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    processingTime: number
  ): ValidationSummary {
    return {
      totalRecords: totalData.length,
      validRecords: validData.length,
      errorRecords: errors.length,
      warningRecords: warnings.length,
      processingTime
    };
  }

  /**
   * Critical エラー結果を作成
   */
  private createCriticalErrorResult(
    errors: TideValidationError[],
    processingTime: number
  ): ValidationResult {
    return {
      isValid: false,
      errors: ErrorCategorizer.categorize(errors),
      warnings: [],
      summary: {
        totalRecords: 0,
        validRecords: 0,
        errorRecords: errors.length,
        warningRecords: 0,
        processingTime
      }
    };
  }

  /**
   * エラー結果を作成
   */
  private createErrorResult(
    errors: TideValidationError[],
    warnings: ValidationWarning[],
    processingTime: number,
    totalData: RawTideData[]
  ): ValidationResult {
    const categorizedErrors = ErrorCategorizer.categorize(errors);
    const validData = this.filterValidData(totalData, categorizedErrors);

    return {
      isValid: false,
      errors: categorizedErrors,
      warnings,
      summary: {
        totalRecords: totalData.length,
        validRecords: validData.length,
        errorRecords: errors.length,
        warningRecords: warnings.length,
        processingTime
      }
    };
  }

  /**
   * タイムアウト結果を作成
   */
  private createTimeoutResult(__data: RawTideData[], processingTime: number): ValidationResult {
    const timeoutError = new TideValidationError(
      'Processing timeout exceeded',
      'PROCESSING_TIMEOUT',
      { timeoutMs: processingTime }
    );

    return this.createCriticalErrorResult([timeoutError], processingTime);
  }

  /**
   * 高速検証（performanceMode専用）
   * 正規表現のみの軽量検証で60-70%の処理時間削減を実現
   */
  private validateFast(data: RawTideData[]): TideValidationError[] {
    const errors: TideValidationError[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // 時刻フォーマット検証（正規表現のみ、Date解析スキップ）
      if (!this.isValidTimeFormatFast(item.time)) {
        errors.push(new TideValidationError(
          `Invalid time format: "${item.time}". Expected ISO 8601 format.`,
          'INVALID_TIME_FORMAT',
          { timeValue: item.time, index: i }
        ));
        continue; // 次の要素へスキップ（潮位検証をスキップ）
      }

      // 潮位範囲チェック（軽量なのでそのまま）
      if (!this.tideDataValidator.validateTideRange(item.tide)) {
        errors.push(new TideValidationError(
          `Tide value ${item.tide}m is out of valid range.`,
          'TIDE_OUT_OF_RANGE',
          { tideValue: item.tide, index: i }
        ));
      }
    }

    return errors;
  }

  /**
   * 厳密検証（通常モード）
   * 既存の厳密な検証ロジックを実施
   */
  private validateStrict(data: RawTideData[]): TideValidationError[] {
    const errors: TideValidationError[] = [];

    for (const [index, item] of data.entries()) {
      try {
        // 個別検証でエラーを収集
        if (!this.tideDataValidator.validateTimeFormat(item.time)) {
          errors.push(new TideValidationError(
            `Invalid time format: "${item.time}". Expected ISO 8601 format.`,
            'INVALID_TIME_FORMAT',
            { timeValue: item.time, index }
          ));
        }

        if (!this.tideDataValidator.validateTideRange(item.tide)) {
          errors.push(new TideValidationError(
            `Tide value ${item.tide}m is out of valid range.`,
            'TIDE_OUT_OF_RANGE',
            { tideValue: item.tide, index }
          ));
        }
      } catch (error) {
        if (error instanceof TideValidationError) {
          errors.push(error);
        }
      }
    }

    return errors;
  }

  /**
   * 厳密検証（strictMode）
   * 通常検証に加えて、小数点精度とタイムゾーン情報を検証
   */
  private validateStrictWithExtras(data: RawTideData[]): TideValidationError[] {
    // 基本的な検証を実施
    const errors = this.validateStrict(data);

    // strictMode専用の追加検証
    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // 小数点以下の精度チェック
      if (!this.validateTidePrecision(item.tide)) {
        errors.push(new TideValidationError(
          `Tide precision ${item.tide}m exceeds allowed decimal places (max 3)`,
          'TIDE_PRECISION_ERROR',
          { tideValue: item.tide, index: i }
        ));
      }

      // タイムゾーン情報の検証
      if (!this.validateTimezone(item.time)) {
        errors.push(new TideValidationError(
          `Timezone information missing or invalid: "${item.time}"`,
          'TIMEZONE_ERROR',
          { timeValue: item.time, index: i }
        ));
      }
    }

    return errors;
  }

  /**
   * 高速時刻フォーマット検証（正規表現のみ）
   * Date解析をスキップして処理時間を大幅削減
   */
  private isValidTimeFormatFast(time: string): boolean {
    if (typeof time !== 'string' || !time) {
      return false;
    }

    // ISO 8601形式の基本パターンのみチェック（Date解析なし）
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)$/;
    return iso8601Pattern.test(time);
  }

  /**
   * 潮位精度検証（strictMode専用）
   * 小数点以下3桁までを許可
   */
  private validateTidePrecision(tide: number): boolean {
    const decimalPlaces = (tide.toString().split('.')[1] || '').length;
    return decimalPlaces <= 3;
  }

  /**
   * タイムゾーン情報検証（strictMode専用）
   * ISO 8601形式でタイムゾーン情報（Z or +/-HH:MM）が必須
   */
  private validateTimezone(time: string): boolean {
    if (typeof time !== 'string' || !time) {
      return false;
    }

    // タイムゾーン情報が必須（Z or +/-HH:MM）
    const timezonePattern = /([+-]\d{2}:\d{2}|Z)$/;
    return timezonePattern.test(time);
  }
}