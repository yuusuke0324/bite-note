/**
 * WarningGenerator.test.ts - 警告生成テスト
 * TASK-101: TideDataValidator実装
 */

import { describe, test, expect } from 'vitest';
import { WarningGenerator } from '../utils/WarningGenerator';
import { WarningType } from '../types';
import type { RawTideData } from '../../../utils/validation/types';

describe('WarningGenerator', () => {
  test('should generate warnings for boundary values', () => {
    const boundaryData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 4.95 }, // 上限近く
      { time: '2025-01-29T12:00:00Z', tide: -2.95 } // 下限近く
    ];

    const warnings = WarningGenerator.generate(boundaryData);

    expect(warnings).toHaveLength(2);
    expect(warnings[0].type).toBe(WarningType.DATA_QUALITY);
  });

  test('should detect time sequence anomalies', () => {
    const unorderedData: RawTideData[] = [
      { time: '2025-01-29T12:00:00Z', tide: 2.0 },
      { time: '2025-01-29T06:00:00Z', tide: 1.0 }, // 時系列逆順
      { time: '2025-01-29T18:00:00Z', tide: 3.0 }
    ];

    const warnings = WarningGenerator.generate(unorderedData);

    expect(warnings.some(w => w.type === WarningType.DATA_QUALITY)).toBe(true);
    expect(warnings[0].message).toContain('時系列');
  });

  test('should warn about sparse data', () => {
    const sparseData: RawTideData[] = [
      { time: '2025-01-29T00:00:00Z', tide: 1.0 },
      { time: '2025-01-30T00:00:00Z', tide: 2.0 } // 24時間間隔
    ];

    const warnings = WarningGenerator.generate(sparseData);

    expect(warnings.some(w => w.message.includes('データ間隔'))).toBe(true);
  });

  test('should provide helpful suggestions', () => {
    const problematicData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 4.95 } // MAX_TIDE=5.0, threshold=0.1 → 4.95 > 4.9で警告
    ];

    const warnings = WarningGenerator.generate(problematicData);

    expect(warnings[0].suggestion).toBeDefined();
    expect(warnings[0].suggestion).not.toBe('');
  });

  test('should respect warning thresholds', () => {
    const normalData: RawTideData[] = [
      { time: '2025-01-29T06:00:00Z', tide: 2.0 },
      { time: '2025-01-29T12:00:00Z', tide: 1.0 }
    ];

    const warnings = WarningGenerator.generate(normalData);

    expect(warnings).toHaveLength(0); // 正常データは警告なし
  });

  test('should handle edge cases in warning generation', () => {
    const edgeCases = [
      [], // 空配列
      [{ time: '2025-01-29T06:00:00Z', tide: 0 }] // 単一データ
    ];

    edgeCases.forEach(data => {
      expect(() => {
        WarningGenerator.generate(data);
      }).not.toThrow();
    });
  });
});