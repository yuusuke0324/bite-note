/**
 * TASK-101 天体計算エンジン 要件テスト
 *
 * TASK-101の具体的な要件に対する詳細テスト
 * - 月齢計算精度（±0.1日以内）
 * - 太陽・月位置計算精度
 * - 既知の新月・満月日での検証
 * - パフォーマンス要件（50ms以内）
 */

import { describe, it, expect } from 'vitest';
import { CelestialCalculator } from '../CelestialCalculator';

describe('TASK-101: 天体計算エンジン要件テスト', () => {
  const calculator = new CelestialCalculator();

  describe('月齢計算精度（±0.1日以内）', () => {
    // 天文年鑑2024の正確な新月・満月データ
    const astronomicalData2024 = [
      // 2024年の新月データ（UTC）
      { date: '2024-01-11T11:57:00Z', expectedAge: 0.0, phase: 'new', description: '2024年1月新月' },
      { date: '2024-02-09T23:59:00Z', expectedAge: 0.0, phase: 'new', description: '2024年2月新月' },
      { date: '2024-03-10T09:00:00Z', expectedAge: 0.0, phase: 'new', description: '2024年3月新月' },
      { date: '2024-04-08T18:21:00Z', expectedAge: 0.0, phase: 'new', description: '2024年4月新月' },
      { date: '2024-05-08T03:22:00Z', expectedAge: 0.0, phase: 'new', description: '2024年5月新月' },

      // 2024年の満月データ（月齢約14.76日）
      { date: '2024-01-25T17:54:00Z', expectedAge: 14.76, phase: 'full', description: '2024年1月満月' },
      { date: '2024-02-24T12:30:00Z', expectedAge: 14.77, phase: 'full', description: '2024年2月満月' },
      { date: '2024-03-25T07:00:00Z', expectedAge: 14.75, phase: 'full', description: '2024年3月満月' },
      { date: '2024-04-23T23:49:00Z', expectedAge: 14.78, phase: 'full', description: '2024年4月満月' },
      { date: '2024-05-23T13:53:00Z', expectedAge: 14.74, phase: 'full', description: '2024年5月満月' }
    ];

    astronomicalData2024.forEach((data) => {
      it(`T101-M001: ${data.description} - 月齢精度±0.1日`, () => {
        const date = new Date(data.date);
        const moonPhase = calculator.calculateMoonPhase(date);

        // TASK-101要件: ±0.1日精度
        expect(moonPhase.age).toBeCloseTo(data.expectedAge, 1);
        expect(moonPhase.phase).toBe(data.phase);

        // 照度の確認
        if (data.phase === 'new') {
          expect(moonPhase.illumination).toBeCloseTo(0.0, 2);
        } else if (data.phase === 'full') {
          expect(moonPhase.illumination).toBeCloseTo(1.0, 2);
        }
      });
    });

    it('T101-M002: 朔望月周期精度の検証', () => {
      const baseDate = new Date('2024-01-11T11:57:00Z'); // 新月
      const synodicMonth = 29.530588853; // 高精度朔望月

      // 1朔望月後
      const nextCycle = new Date(baseDate.getTime() + synodicMonth * 24 * 60 * 60 * 1000);
      const moonPhase1 = calculator.calculateMoonPhase(baseDate);
      const moonPhase2 = calculator.calculateMoonPhase(nextCycle);

      // 同じ月相であることを確認（±0.1日精度）
      expect(Math.abs(moonPhase2.age - moonPhase1.age)).toBeLessThan(0.1);
      expect(moonPhase1.phase).toBe('new');
      expect(moonPhase2.phase).toBe('new');
    });

    it('T101-M003: 極端な過去・未来日での精度維持', () => {
      // 1900年代の新月（計算限界近く）
      const historical = new Date('1900-01-01T12:00:00Z');
      const moonPhaseHist = calculator.calculateMoonPhase(historical);

      expect(moonPhaseHist.age).toBeGreaterThanOrEqual(0);
      expect(moonPhaseHist.age).toBeLessThan(29.53);
      expect(typeof moonPhaseHist.phase).toBe('string');

      // 2100年代の新月（計算限界近く）
      const future = new Date('2099-12-31T12:00:00Z');
      const moonPhaseFut = calculator.calculateMoonPhase(future);

      expect(moonPhaseFut.age).toBeGreaterThanOrEqual(0);
      expect(moonPhaseFut.age).toBeLessThan(29.53);
      expect(typeof moonPhaseFut.phase).toBe('string');
    });
  });

  describe('太陽・月位置計算精度', () => {
    it('T101-P001: VSOP87太陽地心経度の精度検証', () => {
      // 春分点（太陽経度0度付近）
      const vernalEquinox2024 = new Date('2024-03-20T09:06:00Z');
      const positions = calculator.calculateCelestialPositions(vernalEquinox2024);

      // 春分点での太陽経度は0度付近（±1度精度）
      const sunLongNorm = ((positions.sun.longitude % 360) + 360) % 360;
      expect(sunLongNorm).toBeCloseTo(0, 0); // ±0.5度

      // 太陽の黄緯は0度付近
      expect(Math.abs(positions.sun.latitude)).toBeLessThan(0.01); // ±0.01度
    });

    it('T101-P002: 夏至・冬至での太陽経度精度', () => {
      // 夏至（太陽経度90度）
      const summerSolstice2024 = new Date('2024-06-20T20:51:00Z');
      const summerPos = calculator.calculateCelestialPositions(summerSolstice2024);
      const summerLongNorm = ((summerPos.sun.longitude % 360) + 360) % 360;
      expect(summerLongNorm).toBeCloseTo(90, 0);

      // 冬至（太陽経度270度）
      const winterSolstice2024 = new Date('2024-12-21T09:21:00Z');
      const winterPos = calculator.calculateCelestialPositions(winterSolstice2024);
      const winterLongNorm = ((winterPos.sun.longitude % 360) + 360) % 360;
      expect(winterLongNorm).toBeCloseTo(270, 0);
    });

    it('T101-P003: ELP2000月地心経度の変動範囲検証', () => {
      const testDates = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-04-01T00:00:00Z'),
        new Date('2024-07-01T00:00:00Z'),
        new Date('2024-10-01T00:00:00Z')
      ];

      const moonLongitudes: number[] = [];

      testDates.forEach(date => {
        const positions = calculator.calculateCelestialPositions(date);
        moonLongitudes.push(positions.moon.longitude);

        // 月経度の妥当な範囲チェック
        expect(positions.moon.longitude).toBeGreaterThanOrEqual(0);
        expect(positions.moon.longitude).toBeLessThan(360);

        // 月距離の妥当な範囲チェック（地球半径の約57-64倍）
        expect(positions.moon.distance).toBeGreaterThan(50);
        expect(positions.moon.distance).toBeLessThan(70);
      });

      // 月経度の変動が充分にあることを確認
      const maxLong = Math.max(...moonLongitudes);
      const minLong = Math.min(...moonLongitudes);
      expect(maxLong - minLong).toBeGreaterThan(90); // 四季で90度以上変動
    });

    it('T101-P004: 太陽-月角度計算の妥当性', () => {
      // 新月時（太陽-月角度 ≈ 0度）
      const newMoon = new Date('2024-01-11T11:57:00Z');
      const newMoonPos = calculator.calculateCelestialPositions(newMoon);

      const sunMoonAngle = Math.abs(newMoonPos.sun.longitude - newMoonPos.moon.longitude);
      const normalizedAngle = Math.min(sunMoonAngle, 360 - sunMoonAngle);

      // 新月時は太陽-月角度が小さい（±15度）
      expect(normalizedAngle).toBeLessThan(15);

      // 満月時（太陽-月角度 ≈ 180度）
      const fullMoon = new Date('2024-01-25T17:54:00Z');
      const fullMoonPos = calculator.calculateCelestialPositions(fullMoon);

      const sunMoonAngleFull = Math.abs(fullMoonPos.sun.longitude - fullMoonPos.moon.longitude);
      const normalizedAngleFull = Math.min(sunMoonAngleFull, 360 - sunMoonAngleFull);

      // 満月時は太陽-月角度が180度付近（±15度）
      expect(Math.abs(normalizedAngleFull - 180)).toBeLessThan(15);
    });
  });

  describe('統合テスト: 既知の新月・満月日での検証', () => {
    // 歴史的に有名な天体現象での検証
    it('T101-I001: 2000年問題前後の計算連続性', () => {
      const before2000 = new Date('1999-12-31T23:59:59Z');
      const after2000 = new Date('2000-01-01T00:00:01Z');

      const moonBefore = calculator.calculateMoonPhase(before2000);
      const moonAfter = calculator.calculateMoonPhase(after2000);

      // 2秒の違いでの月齢差は極小（0.00007日未満）
      expect(Math.abs(moonAfter.age - moonBefore.age)).toBeLessThan(0.0001);
    });

    it('T101-I002: 日食条件での計算精度（新月+月距離最小）', () => {
      // 2024年4月8日の皆既日食
      const eclipse2024 = new Date('2024-04-08T18:21:00Z');
      const moonPhase = calculator.calculateMoonPhase(eclipse2024);
      const positions = calculator.calculateCelestialPositions(eclipse2024);

      // 日食時は新月
      expect(moonPhase.phase).toBe('new');
      expect(moonPhase.age).toBeCloseTo(0, 1);

      // 太陽-月の角度差が小さい
      const angleDiff = Math.abs(positions.sun.longitude - positions.moon.longitude);
      const normalizedDiff = Math.min(angleDiff, 360 - angleDiff);
      expect(normalizedDiff).toBeLessThan(5); // ±5度以内
    });

    it('T101-I003: 月食条件での計算精度（満月+月距離中程度）', () => {
      // 2024年9月18日の部分月食
      const lunarEclipse2024 = new Date('2024-09-18T02:44:00Z');
      const moonPhase = calculator.calculateMoonPhase(lunarEclipse2024);
      const positions = calculator.calculateCelestialPositions(lunarEclipse2024);

      // 月食時は満月
      expect(moonPhase.phase).toBe('full');
      expect(moonPhase.age).toBeCloseTo(14.7, 1);

      // 太陽-月の角度差が180度付近
      const angleDiff = Math.abs(positions.sun.longitude - positions.moon.longitude);
      const normalizedDiff = Math.min(angleDiff, 360 - angleDiff);
      expect(Math.abs(normalizedDiff - 180)).toBeLessThan(5); // 180±5度
    });
  });

  describe('パフォーマンス要件（50ms以内）', () => {
    it('T101-P001: 単一計算が50ms以内', () => {
      const testDate = new Date('2024-06-15T12:00:00Z');

      const startTime = performance.now();
      calculator.calculateMoonPhase(testDate);
      const moonTime = performance.now() - startTime;

      const startTime2 = performance.now();
      calculator.calculateCelestialPositions(testDate);
      const posTime = performance.now() - startTime2;

      const startTime3 = performance.now();
      calculator.calculateAll(testDate);
      const allTime = performance.now() - startTime3;

      expect(moonTime).toBeLessThan(50);
      expect(posTime).toBeLessThan(50);
      expect(allTime).toBeLessThan(50);
    });

    it('T101-P002: 連続100回計算が平均50ms以内', () => {
      const testDates = Array.from({ length: 100 }, (_, i) =>
        new Date(2024, 0, 1 + i) // 2024年の100日間
      );

      const startTime = performance.now();

      testDates.forEach(date => {
        calculator.calculateAll(date);
      });

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / 100;

      expect(avgTime).toBeLessThan(50);
      expect(totalTime).toBeLessThan(5000); // 全体で5秒以内
    });

    it('T101-P003: メモリ使用量の安定性（GC負荷テスト）', () => {
      const iterations = 1000;
      const testDate = new Date('2024-06-15T12:00:00Z');

      // メモリリークテスト
      for (let i = 0; i < iterations; i++) {
        const result = calculator.calculateAll(testDate);

        // 結果の妥当性チェック（メモリ破損検出）
        expect(typeof result.moonPhase.age).toBe('number');
        expect(typeof result.positions.sun.longitude).toBe('number');
        expect(typeof result.positions.moon.longitude).toBe('number');

        // 途中でガベージコレクションの機会を提供
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      // 最終的に正常な計算ができることを確認
      const finalResult = calculator.calculateAll(testDate);
      expect(finalResult.moonPhase.age).toBeGreaterThanOrEqual(0);
      expect(finalResult.moonPhase.age).toBeLessThan(30);
    });
  });

  describe('エラーハンドリングと境界値', () => {
    it('T101-E001: 計算範囲外での適切な警告', () => {
      // コンソール警告のスパイ
      const originalWarn = console.warn;
      let warnCalled = false;
      console.warn = () => { warnCalled = true; };

      try {
        // 範囲外の日付（1850年）
        const oldDate = new Date('1850-01-01T00:00:00Z');
        const result = calculator.calculateMoonPhase(oldDate);

        expect(warnCalled).toBe(true);
        expect(result.age).toBeGreaterThanOrEqual(0);
        expect(result.age).toBeLessThan(30);
      } finally {
        console.warn = originalWarn;
      }
    });

    it('T101-E002: 不正日付での適切なエラー', () => {
      expect(() => {
        calculator.calculateMoonPhase(new Date('invalid'));
      }).toThrow('Invalid date provided');

      expect(() => {
        calculator.calculateCelestialPositions(null as any);
      }).toThrow('Invalid date provided');
    });
  });
});