/**
 * Validation index - メインAPIエクスポート
 * TASK-101: TideDataValidator実装
 */

export { TideDataValidator } from './TideDataValidator';
export { ErrorCategorizer } from './utils/ErrorCategorizer';
export { WarningGenerator } from './utils/WarningGenerator';

export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSummary,
  ValidationOptions
} from './types';

export { ErrorType, WarningType } from './types';