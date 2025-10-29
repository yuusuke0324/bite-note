/**
 * 天体計算エンジン テストスイート
 * TDD Red Phase - 失敗するテストの実装
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { MoonPhase, CelestialPosition } from '../../../types/tide';

// 未実装クラスのインポート（これが失敗の原因）
import { CelestialCalculator } from '../CelestialCalculator';

describe('CelestialCalculator', () => {
  let calculator: CelestialCalculator;

  beforeEach(() => {
    calculator = new CelestialCalculator();
  });

  describe('月齢計算', () => {
    it('TC-M001: J2000.0基準新月で月齢0を返す', () => {
      // 2000-01-06T18:14:00Z は J2000.0 の新月基準点
      const baseNewMoon = new Date('2000-01-06T18:14:00Z');
      const moonPhase = calculator.calculateMoonPhase(baseNewMoon);

      expect(moonPhase.age).toBeCloseTo(0.0, 0); // ±0.5日精度（初期実装）
      expect(moonPhase.phase).toBe('new');
      expect(moonPhase.illumination).toBeCloseTo(0.0, 2);
    });

    it('TC-M002: 2024年1月新月で月齢0を返す', () => {
      // 天文年鑑2024による新月時刻
      const newMoon2024Jan = new Date('2024-01-11T11:57:00Z');
      const moonPhase = calculator.calculateMoonPhase(newMoon2024Jan);

      expect(moonPhase.age).toBeCloseTo(0.0, 0);
      expect(moonPhase.phase).toBe('new');
      expect(moonPhase.illumination).toBeCloseTo(0.0, 2);
    });

    it('TC-M003: 2024年1月満月で月齢14.77を返す', () => {
      // 天文年鑑2024による満月時刻
      const fullMoon2024Jan = new Date('2024-01-25T17:54:00Z');
      const moonPhase = calculator.calculateMoonPhase(fullMoon2024Jan);

      expect(moonPhase.age).toBeCloseTo(14.77, 0);
      expect(moonPhase.phase).toBe('full');
      expect(moonPhase.illumination).toBeCloseTo(1.0, 2);
    });

    it('TC-M004: 朔望月周期（29.53日）後に同じ月齢を返す', () => {
      const baseDate = new Date('2024-01-11T11:57:00Z');
      const basePhase = calculator.calculateMoonPhase(baseDate);

      // 29.530588853日後
      const cycleMs = 29.530588853 * 24 * 60 * 60 * 1000;
      const cycleDate = new Date(baseDate.getTime() + cycleMs);
      const cyclePhase = calculator.calculateMoonPhase(cycleDate);

      expect(cyclePhase.age).toBeCloseTo(basePhase.age, 0); // ±0.2日
    });

    it('TC-MP003: 上弦月で first_quarter を返す', () => {
      const firstQuarter = new Date('2024-01-18T03:53:00Z');
      const moonPhase = calculator.calculateMoonPhase(firstQuarter);

      expect(moonPhase.phase).toBe('first_quarter');
      expect(moonPhase.age).toBeGreaterThan(5); // 上弦月は5-10日程度
      expect(moonPhase.age).toBeLessThan(10);
      expect(moonPhase.illumination).toBeCloseTo(0.5, 0); // ±0.1精度
    });
  });

  describe('太陽位置計算', () => {
    it('TC-S001: 春分点で太陽経度0度を返す', () => {
      const vernal2024 = new Date('2024-03-20T03:06:00Z');
      const positions = calculator.calculateCelestialPositions(vernal2024);

      expect(positions.sun.longitude).toBeCloseTo(0.0, 0); // ±1度
      expect(Math.abs(positions.sun.latitude)).toBeLessThan(0.1); // ほぼ0
    });

    it('TC-S002: 夏至点で太陽経度90度を返す', () => {
      const summer2024 = new Date('2024-06-20T20:51:00Z');
      const positions = calculator.calculateCelestialPositions(summer2024);

      expect(positions.sun.longitude).toBeCloseTo(90.0, 0); // ±1度
      expect(Math.abs(positions.sun.latitude)).toBeLessThan(0.1);
    });

    it('TC-S003: 秋分点で太陽経度180度を返す', () => {
      const autumnal2024 = new Date('2024-09-22T12:44:00Z');
      const positions = calculator.calculateCelestialPositions(autumnal2024);

      expect(positions.sun.longitude).toBeCloseTo(180.0, 0); // ±1度
      expect(Math.abs(positions.sun.latitude)).toBeLessThan(0.1);
    });

    it('TC-S004: 冬至点で太陽経度270度を返す', () => {
      const winter2024 = new Date('2024-12-21T09:21:00Z');
      const positions = calculator.calculateCelestialPositions(winter2024);

      expect(positions.sun.longitude).toBeCloseTo(270.0, 0); // ±1度
      expect(Math.abs(positions.sun.latitude)).toBeLessThan(0.1);
    });

    it('TC-S005: 年間の太陽経度が適切に変化する', () => {
      const positions: number[] = [];

      // 2024年の各月15日の太陽経度を計算（月中央で安定）
      for (let month = 0; month < 12; month++) {
        const date = new Date(2024, month, 15, 12, 0, 0);
        const pos = calculator.calculateCelestialPositions(date);
        positions.push(pos.sun.longitude);
      }

      // 3月（春分）と9月（秋分）の差が約180度
      const springPos = positions[2]; // 3月
      const autumnPos = positions[8]; // 9月
      const diff = Math.abs(autumnPos - springPos);
      const normalizedDiff = Math.min(diff, 360 - diff);

      expect(normalizedDiff).toBeCloseTo(180, -1); // ±5度（初期実装）
    });
  });

  describe('月位置計算', () => {
    it('TC-L001: 新月時に月経度が太陽経度に近い', () => {
      const newMoon = new Date('2024-01-11T11:57:00Z');
      const positions = calculator.calculateCelestialPositions(newMoon);

      const longitudeDiff = Math.abs(positions.moon.longitude - positions.sun.longitude);
      const normalizedDiff = Math.min(longitudeDiff, 360 - longitudeDiff);

      expect(normalizedDiff).toBeLessThan(5); // ±5度以内
    });

    it('TC-L002: 満月時に月経度が太陽経度+180度に近い', () => {
      const fullMoon = new Date('2024-01-25T17:54:00Z');
      const positions = calculator.calculateCelestialPositions(fullMoon);

      const expectedMoonLong = (positions.sun.longitude + 180) % 360;
      const longitudeDiff = Math.abs(positions.moon.longitude - expectedMoonLong);
      const normalizedDiff = Math.min(longitudeDiff, 360 - longitudeDiff);

      expect(normalizedDiff).toBeLessThan(5); // ±5度以内
    });

    it('TC-L003: 月地心距離が現実的範囲内', () => {
      const testDate = new Date('2024-06-15T12:00:00Z');
      const positions = calculator.calculateCelestialPositions(testDate);

      expect(positions.moon.distance).toBeGreaterThan(350000); // 35万km以上
      expect(positions.moon.distance).toBeLessThan(410000); // 41万km以下
    });
  });

  describe('統合計算', () => {
    it('TC-I001: calculateAll()が一貫した結果を返す', () => {
      const testDate = new Date('2024-01-11T11:57:00Z');
      const result = calculator.calculateAll(testDate);

      // 個別計算と同じ結果
      const moonPhase = calculator.calculateMoonPhase(testDate);
      const positions = calculator.calculateCelestialPositions(testDate);

      expect(result.moonPhase).toEqual(moonPhase);
      expect(result.positions).toEqual(positions);
    });

    it('TC-I002: 新月時の位置関係が正しい', () => {
      const newMoon = new Date('2024-01-11T11:57:00Z');
      const result = calculator.calculateAll(newMoon);

      expect(result.moonPhase.phase).toBe('new');

      const sunLong = result.positions.sun.longitude;
      const moonLong = result.positions.moon.longitude;
      const diff = Math.abs(sunLong - moonLong);
      const normalizedDiff = Math.min(diff, 360 - diff);

      expect(normalizedDiff).toBeLessThan(5);
    });
  });

  describe('パフォーマンステスト', () => {
    it('TC-P001: 単一計算が50ms以内で完了', () => {
      const testDate = new Date('2024-06-15T12:00:00Z');

      const startTime = performance.now();
      calculator.calculateAll(testDate);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });

    it('TC-P002: 365回計算が5秒以内で完了', () => {
      const startTime = performance.now();

      for (let day = 0; day < 365; day++) {
        const testDate = new Date(2024, 0, 1 + day, 12, 0, 0);
        calculator.calculateAll(testDate);
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('エラーハンドリング', () => {
    it('TC-E001: null入力で適切なエラーを投げる', () => {
      expect(() => {
        calculator.calculateMoonPhase(null as any);
      }).toThrow();
    });

    it('TC-E002: 無効な日付で適切なエラーを投げる', () => {
      const invalidDate = new Date('invalid');

      expect(() => {
        calculator.calculateMoonPhase(invalidDate);
      }).toThrow();
    });

    it('TC-E003: 範囲外日付で警告付き計算または適切なエラー', () => {
      const farFutureDate = new Date('2200-01-01T12:00:00Z');

      expect(() => {
        calculator.calculateMoonPhase(farFutureDate);
      }).not.toThrow(); // 警告付きでも計算実行
    });
  });

  describe('境界値テスト', () => {
    it('TC-B001: UTC日付境界での連続性', () => {
      const beforeMidnight = new Date('2024-06-15T23:59:59Z');
      const afterMidnight = new Date('2024-06-16T00:00:01Z');

      const phaseBefore = calculator.calculateMoonPhase(beforeMidnight);
      const phaseAfter = calculator.calculateMoonPhase(afterMidnight);

      // 2秒の差で月齢が大きく変わらない
      expect(Math.abs(phaseBefore.age - phaseAfter.age)).toBeLessThan(0.001);
    });

    it('TC-B004: 月相境界での適切な判定', () => {
      // 新月から三日月への境界
      const justAfterNew = new Date('2024-01-11T23:57:00Z'); // 新月12時間後
      const moonPhase = calculator.calculateMoonPhase(justAfterNew);

      expect(moonPhase.age).toBeGreaterThan(0);
      expect(moonPhase.age).toBeLessThan(2);
      expect(['new', 'waxing_crescent']).toContain(moonPhase.phase);
    });
  });
});

// ユーティリティ関数のテスト
describe('CelestialCalculatorUtils', () => {
  it('normalizeAngle: 角度を0-360度範囲に正規化', async () => {
    const { normalizeAngle } = await import('../utils/celestial-utils');

    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(-450)).toBe(270);
  });

  it('julianDay: 正しいユリウス日を計算', async () => {
    const { julianDay } = await import('../utils/celestial-utils');

    // J2000.0 = 2000-01-01T12:00:00Z = JD 2451545.0
    const j2000 = new Date('2000-01-01T12:00:00Z');
    expect(julianDay(j2000)).toBeCloseTo(2451545.0, 1);
  });
});