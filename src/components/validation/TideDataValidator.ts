/**
 * TideDataValidator.ts - データ検証専用コンポーネント
 * TASK-101: TideDataValidator実装
 */

import type { ValidationResult, ValidationOptions, ValidationSummary } from './types';
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

      // TASK-002検証実行
      const task002Errors: TideValidationError[] = [];
      for (const [index, item] of dataToProcess.entries()) {
        try {
          // 個別検証でエラーを収集
          if (!this.tideDataValidator.validateTimeFormat(item.time)) {
            const error = new Error(`Invalid time format: "${item.time}". Expected ISO 8601 format.`) as any;
            error.code = 'INVALID_TIME_FORMAT';
            error.context = { timeValue: item.time, index };
            task002Errors.push(error);
          }

          if (!this.tideDataValidator.validateTideRange(item.tide)) {
            const error = new Error(`Tide value ${item.tide}m is out of valid range.`) as any;
            error.code = 'TIDE_OUT_OF_RANGE';
            error.context = { tideValue: item.tide, index };
            task002Errors.push(error);
          }
        } catch (error) {
          if (error instanceof TideValidationError) {
            task002Errors.push(error);
          }
        }
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
        } catch (error) {
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

    } catch (error) {
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
        const error = new Error(`Invalid time format: "${item.time}". Expected ISO 8601 format.`) as any;
        error.code = 'INVALID_TIME_FORMAT';
        error.context = { timeValue: item.time, index };
        basicErrors.push(error);
      }

      if (!this.tideDataValidator.validateTideRange(item.tide)) {
        const error = new Error(`Tide value ${item.tide}m is out of valid range.`) as any;
        error.code = 'TIDE_OUT_OF_RANGE';
        error.context = { tideValue: item.tide, index };
        basicErrors.push(error);
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
        const error = new Error(`Duplicate timestamp: ${time}`) as any;
        error.code = 'DUPLICATE_TIMESTAMP';
        error.context = { timeValue: time, index: i };
        return error;
      }
      timeSet.add(time);
    }

    return null;
  }

  /**
   * 有効データのフィルタリング
   */
  private filterValidData(__data: RawTideData[], errors: any[]): RawTideData[] {
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
    const error = new Error('Data structure is corrupted') as any;
    error.code = 'STRUCTURE_ERROR';
    error.context = {};
    return error;
  }

  /**
   * サマリーを作成
   */
  private createSummary(
    totalData: RawTideData[],
    validData: RawTideData[],
    errors: any[],
    warnings: any[],
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
    warnings: any[],
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
    const timeoutError = new Error('Processing timeout exceeded') as any;
    timeoutError.code = 'PROCESSING_TIMEOUT';
    timeoutError.context = { timeoutMs: processingTime };

    return this.createCriticalErrorResult([timeoutError], processingTime);
  }
}