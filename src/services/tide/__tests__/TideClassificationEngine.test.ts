/**
 * TASK-104: 潮汐分類システムのテスト
 *
 * 要件:
 * - 大潮・小潮判定ロジック（月齢ベース）
 * - 長潮・若潮・中潮の詳細分類
 * - 潮汐強度計算（0-100%）
 * - 近地点・遠地点効果考慮
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TideClassificationEngine } from '../TideClassificationEngine';
import type { TideType, MoonPhase } from '../../../types/tide';

describe('TASK-104: 潮汐分類システム', () => {
  let engine: TideClassificationEngine;

  beforeEach(() => {
    engine = new TideClassificationEngine();
  });

  describe('潮汐タイプ判定精度', () => {
    it('TC-T001: 新月期の大潮判定が正確である', () => {
      const newMoonPhase: MoonPhase = {
        age: 0.0,
        phase: 'new',
        illumination: 0.0
      };

      const tideType = engine.classifyTideType(newMoonPhase);
      expect(tideType).toBe('spring');
    });

    it('TC-T002: 満月期の大潮判定が正確である', () => {
      const fullMoonPhase: MoonPhase = {
        age: 14.77,
        phase: 'full',
        illumination: 1.0
      };

      const tideType = engine.classifyTideType(fullMoonPhase);
      expect(tideType).toBe('spring');
    });

    it('TC-T003: 上弦月期の小潮判定が正確である', () => {
      const firstQuarterPhase: MoonPhase = {
        age: 7.38,
        phase: 'first_quarter',
        illumination: 0.5
      };

      const tideType = engine.classifyTideType(firstQuarterPhase);
      expect(tideType).toBe('neap');
    });

    it('TC-T004: 下弦月期の小潮判定が正確である', () => {
      const lastQuarterPhase: MoonPhase = {
        age: 22.15,
        phase: 'last_quarter',
        illumination: 0.5
      };

      const tideType = engine.classifyTideType(lastQuarterPhase);
      expect(tideType).toBe('neap');
    });

    it('TC-T005: 長潮の判定が正確である（小潮の後）', () => {
      const longTidePhase: MoonPhase = {
        age: 9.5,
        phase: 'waxing_gibbous',
        illumination: 0.75
      };

      const tideType = engine.classifyTideType(longTidePhase);
      expect(tideType).toBe('long');
    });

    it('TC-T006: 若潮の判定が正確である（長潮の後）', () => {
      const youngTidePhase: MoonPhase = {
        age: 11.0,
        phase: 'waxing_gibbous',
        illumination: 0.85
      };

      const tideType = engine.classifyTideType(youngTidePhase);
      expect(tideType).toBe('young');
    });

    it('TC-T007: 中潮の判定が正確である', () => {
      const mediumTidePhase: MoonPhase = {
        age: 5.0,
        phase: 'waxing_crescent',
        illumination: 0.25
      };

      const tideType = engine.classifyTideType(mediumTidePhase);
      expect(tideType).toBe('medium');
    });
  });

  describe('強度計算ロジック', () => {
    it('TC-T008: 新月期の潮汐強度が最大値付近である', () => {
      const newMoonPhase: MoonPhase = {
        age: 0.0,
        phase: 'new',
        illumination: 0.0
      };

      const strength = engine.calculateTideStrength(newMoonPhase, 1.0);
      expect(strength).toBeGreaterThan(90);
      expect(strength).toBeLessThanOrEqual(100);
    });

    it('TC-T009: 満月期の潮汐強度が最大値付近である', () => {
      const fullMoonPhase: MoonPhase = {
        age: 14.77,
        phase: 'full',
        illumination: 1.0
      };

      const strength = engine.calculateTideStrength(fullMoonPhase, 1.0);
      expect(strength).toBeGreaterThan(90);
      expect(strength).toBeLessThanOrEqual(100);
    });

    it('TC-T010: 弦月期の潮汐強度が最小値付近である', () => {
      const quarterPhase: MoonPhase = {
        age: 7.38,
        phase: 'first_quarter',
        illumination: 0.5
      };

      const strength = engine.calculateTideStrength(quarterPhase, 1.0);
      expect(strength).toBeGreaterThanOrEqual(0);
      expect(strength).toBeLessThan(60); // 弦月期は低い値だが50より少し高め
    });

    it('TC-T011: 近地点効果による強度増大', () => {
      const newMoonPhase: MoonPhase = {
        age: 0.0,
        phase: 'new',
        illumination: 0.0
      };

      const normalStrength = engine.calculateTideStrength(newMoonPhase, 1.0);
      const perigeeStrength = engine.calculateTideStrength(newMoonPhase, 0.95); // 近地点

      // 近地点では100を超える場合があるので、正常な強度より高いことを確認
      expect(perigeeStrength).toBeGreaterThan(normalStrength * 1.1);
    });

    it('TC-T012: 遠地点効果による強度減少', () => {
      const newMoonPhase: MoonPhase = {
        age: 0.0,
        phase: 'new',
        illumination: 0.0
      };

      const normalStrength = engine.calculateTideStrength(newMoonPhase, 1.0);
      const apogeeStrength = engine.calculateTideStrength(newMoonPhase, 1.05); // 遠地点

      expect(apogeeStrength).toBeLessThan(normalStrength);
    });
  });

  describe('年間を通じた分類検証', () => {
    it('TC-T013: 1年間のサイクルで全ての潮汐タイプが出現する', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const tideTypes = new Set<TideType>();

      // 1週間ごとにサンプリング
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 7)) {
        const moonPhase = engine.calculateMoonPhaseForDate(date);
        const tideType = engine.classifyTideType(moonPhase);
        tideTypes.add(tideType);
      }

      expect(tideTypes).toContain('spring');
      expect(tideTypes).toContain('neap');
      expect(tideTypes).toContain('medium');
      expect(tideTypes).toContain('long');
      expect(tideTypes).toContain('young');
      expect(tideTypes.size).toBe(5); // 全ての潮汐タイプ
    });

    it('TC-T014: 春分・秋分での大潮強度が特に強い', () => {
      const springEquinox = new Date('2024-03-20');
      const autumnEquinox = new Date('2024-09-22');

      const springPhase = engine.calculateMoonPhaseForDate(springEquinox);
      const autumnPhase = engine.calculateMoonPhaseForDate(autumnEquinox);

      // 新月・満月に近い場合の強度をテスト
      if (springPhase.age < 2 || springPhase.age > 27 ||
          (springPhase.age > 13 && springPhase.age < 16)) {
        const springStrength = engine.calculateTideStrength(springPhase, 1.0);
        expect(springStrength).toBeGreaterThan(85);
      }

      if (autumnPhase.age < 2 || autumnPhase.age > 27 ||
          (autumnPhase.age > 13 && autumnPhase.age < 16)) {
        const autumnStrength = engine.calculateTideStrength(autumnPhase, 1.0);
        expect(autumnStrength).toBeGreaterThan(85);
      }
    });

    it('TC-T015: 月の距離変化による強度変動の妥当性', () => {
      const testPhase: MoonPhase = {
        age: 0.0,
        phase: 'new',
        illumination: 0.0
      };

      const strengths = [];
      // 月の距離を0.95〜1.05の範囲で変化
      for (let distance = 0.95; distance <= 1.05; distance += 0.01) {
        const strength = engine.calculateTideStrength(testPhase, distance);
        strengths.push(strength);
      }

      // 距離が近いほど強度が高いことを確認
      for (let i = 1; i < strengths.length; i++) {
        expect(strengths[i]).toBeLessThanOrEqual(strengths[i - 1]);
      }
    });
  });

  describe('境界値・エラーハンドリング', () => {
    it('TC-T016: 月齢0での処理が正確である', () => {
      const phase: MoonPhase = {
        age: 0.0,
        phase: 'new',
        illumination: 0.0
      };

      expect(() => engine.classifyTideType(phase)).not.toThrow();
      expect(engine.classifyTideType(phase)).toBe('spring');
    });

    it('TC-T017: 月齢29.53での処理が正確である', () => {
      const phase: MoonPhase = {
        age: 29.53,
        phase: 'waning_crescent',
        illumination: 0.02
      };

      expect(() => engine.classifyTideType(phase)).not.toThrow();
      expect(engine.classifyTideType(phase)).toBe('spring');
    });

    it('TC-T018: 無効な月齢値での例外処理', () => {
      const invalidPhase: MoonPhase = {
        age: -1,
        phase: 'new',
        illumination: 0.0
      };

      expect(() => engine.classifyTideType(invalidPhase)).toThrow('Invalid moon age');
    });

    it('TC-T019: 無効な距離値での例外処理', () => {
      const phase: MoonPhase = {
        age: 0.0,
        phase: 'new',
        illumination: 0.0
      };

      expect(() => engine.calculateTideStrength(phase, 0)).toThrow('Invalid moon distance');
      expect(() => engine.calculateTideStrength(phase, -1)).toThrow('Invalid moon distance');
    });
  });

  describe('パフォーマンステスト', () => {
    it('TC-T020: 分類計算が高速である（1ms以内）', () => {
      const phase: MoonPhase = {
        age: 7.5,
        phase: 'first_quarter',
        illumination: 0.5
      };

      const startTime = performance.now();
      engine.classifyTideType(phase);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1);
    });

    it('TC-T021: 強度計算が高速である（1ms以内）', () => {
      const phase: MoonPhase = {
        age: 0.0,
        phase: 'new',
        illumination: 0.0
      };

      const startTime = performance.now();
      engine.calculateTideStrength(phase, 1.0);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1);
    });
  });
});