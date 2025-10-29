/**
 * TASK-202: パフォーマンステスト用モック潮汐計算サービス
 * IndexedDB依存性を排除し、純粋な計算パフォーマンスを測定
 */

import type { TideInfo, TideEvent, HarmonicConstant } from '../../types/tide';

export class MockTideCalculationService {
  /**
   * 座標と日時から詳細な潮汐情報を計算（モック版）
   */
  async calculateTideInfo(
    coordinates: { latitude: number; longitude: number },
    date: Date
  ): Promise<TideInfo> {
    // 実際の計算アルゴリズムをシミュレート
    const startTime = performance.now();

    // 1. 地域データのモック（データベースアクセスなし）
    const mockRegionalData = {
      regionId: 'mock-region',
      name: `模擬地域 ${coordinates.latitude.toFixed(2)}, ${coordinates.longitude.toFixed(2)}`,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      m2Amplitude: 1.0 + Math.sin(coordinates.latitude * Math.PI / 180) * 0.3,
      m2Phase: coordinates.longitude * 2,
      s2Amplitude: 0.5 + Math.cos(coordinates.longitude * Math.PI / 180) * 0.2,
      s2Phase: coordinates.latitude * 1.5
    };

    // 2. 座標依存の変動計算
    const coordinateVariation = {
      latitudeFactor: 1 + (coordinates.latitude - 35) * 0.02,
      longitudeFactor: 1 + (coordinates.longitude - 135) * 0.01
    };

    // 3. 季節変動計算
    const seasonalVariation = this.calculateSeasonalVariation(date, coordinates);

    // 4. 調和定数の生成
    const harmonicConstants: HarmonicConstant[] = [
      {
        constituent: 'M2',
        amplitude: mockRegionalData.m2Amplitude * coordinateVariation.latitudeFactor * seasonalVariation.m2Factor,
        phase: mockRegionalData.m2Phase + coordinateVariation.longitudeFactor * 2
      },
      {
        constituent: 'S2',
        amplitude: mockRegionalData.s2Amplitude * coordinateVariation.longitudeFactor * seasonalVariation.s2Factor,
        phase: mockRegionalData.s2Phase + coordinateVariation.latitudeFactor * 3
      },
      {
        constituent: 'K1',
        amplitude: mockRegionalData.m2Amplitude * 0.3 * seasonalVariation.k1Factor,
        phase: coordinateVariation.latitudeFactor * 45
      },
      {
        constituent: 'O1',
        amplitude: mockRegionalData.m2Amplitude * 0.25 * seasonalVariation.o1Factor,
        phase: coordinateVariation.longitudeFactor * 60
      }
    ];

    // 5. 現在の潮位計算（調和解析）
    const currentLevel = this.calculateTideLevel(date, harmonicConstants);

    // 6. 潮汐強度計算
    const tideStrength = this.calculateTideStrength(date, harmonicConstants);

    // 7. 月齢と潮汐タイプ
    const moonPhase = this.calculateMoonPhase(date);
    const tideType = this.classifyTideType(moonPhase);

    // 8. 24時間の満潮・干潮イベント
    const events = this.findTidalEvents(date, harmonicConstants);

    // 9. 次イベントと現在状態
    const nextEvent = this.findNextEvent(date, events);
    const currentState = this.determineCurrentState(date, events);

    // 計算時間のシミュレート（実際の処理負荷を模倣）
    const complexityFactor = Math.log(coordinates.latitude + coordinates.longitude + 10) *
                           Math.sin(date.getTime() / 1000000);
    await this.simulateComputationalLoad(complexityFactor);

    const calculationTime = performance.now() - startTime;

    return {
      location: coordinates,
      date,
      currentState,
      currentLevel,
      tideType,
      tideStrength: tideStrength.value,
      events,
      nextEvent: nextEvent || null,
      calculatedAt: new Date(),
      accuracy: calculationTime < 1000 ? 'high' : calculationTime < 2000 ? 'medium' : 'low'
    };
  }

  /**
   * 調和解析による潮位計算
   */
  private calculateTideLevel(date: Date, harmonics: HarmonicConstant[]): number {
    const timeInHours = date.getTime() / (1000 * 60 * 60);
    let level = 0;

    for (const harmonic of harmonics) {
      // 各調和成分の周期（時間単位）
      const period = this.getConstituentPeriod(harmonic.constituent);
      const omega = (2 * Math.PI) / period;

      // 調和解析の基本式: A * cos(ωt + φ)
      const component = harmonic.amplitude * Math.cos(omega * timeInHours + harmonic.phase * Math.PI / 180);
      level += component;
    }

    return level;
  }

  /**
   * 調和成分の周期を取得
   */
  private getConstituentPeriod(constituent: string): number {
    const periods: { [key: string]: number } = {
      'M2': 12.421, // 主太陰半日周潮
      'S2': 12.000, // 主太陽半日周潮
      'K1': 23.934, // 太陰太陽日周潮
      'O1': 25.819  // 主太陰日周潮
    };
    return periods[constituent] || 12.0;
  }

  /**
   * 潮汐強度計算
   */
  private calculateTideStrength(date: Date, harmonics: HarmonicConstant[]): { value: number; description: string } {
    // 振幅の総和を基準とした強度計算
    const totalAmplitude = harmonics.reduce((sum, h) => sum + h.amplitude, 0);

    // 月齢による修正
    const moonPhase = this.calculateMoonPhase(date);
    const lunarFactor = 0.8 + 0.4 * Math.cos(moonPhase * Math.PI / 180);

    const strength = totalAmplitude * lunarFactor;

    let description: string;
    if (strength > 2.5) description = 'very_strong';
    else if (strength > 2.0) description = 'strong';
    else if (strength > 1.5) description = 'moderate';
    else if (strength > 1.0) description = 'weak';
    else description = 'very_weak';

    return { value: strength, description };
  }

  /**
   * 月齢計算
   */
  private calculateMoonPhase(date: Date): number {
    // 簡略化した月齢計算（2000年1月6日を新月基準）
    const referenceNewMoon = new Date(2000, 0, 6).getTime();
    const lunarCycle = 29.53058867; // 朔望月（日）

    const daysSinceReference = (date.getTime() - referenceNewMoon) / (1000 * 60 * 60 * 24);
    const cyclesSinceReference = daysSinceReference / lunarCycle;
    const moonPhase = (cyclesSinceReference - Math.floor(cyclesSinceReference)) * 360;

    return moonPhase;
  }

  /**
   * 潮汐タイプ分類
   */
  private classifyTideType(moonPhase: number): 'spring' | 'neap' | 'normal' {
    // 新月(0°)・満月(180°)付近は大潮、上弦(90°)・下弦(270°)付近は小潮
    const normalizedPhase = ((moonPhase % 360) + 360) % 360;

    if (normalizedPhase < 45 || normalizedPhase > 315 || (normalizedPhase > 135 && normalizedPhase < 225)) {
      return 'spring'; // 大潮
    } else if ((normalizedPhase > 60 && normalizedPhase < 120) || (normalizedPhase > 240 && normalizedPhase < 300)) {
      return 'neap';   // 小潮
    } else {
      return 'normal'; // 中潮
    }
  }

  /**
   * 満潮・干潮イベント検出
   */
  private findTidalEvents(baseDate: Date, harmonics: HarmonicConstant[]): TideEvent[] {
    const events: TideEvent[] = [];

    // 24時間範囲
    const startTime = new Date(baseDate);
    startTime.setHours(0, 0, 0, 0);

    // 15分間隔で潮位を計算し、極値を検出
    const samples: { time: Date; level: number }[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
      const time = new Date(startTime.getTime() + minutes * 60 * 1000);
      const level = this.calculateTideLevel(time, harmonics);
      samples.push({ time, level });
    }

    // 極値検出
    for (let i = 1; i < samples.length - 1; i++) {
      const prev = samples[i - 1];
      const curr = samples[i];
      const next = samples[i + 1];

      // 満潮検出（前後より高い）
      if (curr.level > prev.level && curr.level > next.level && curr.level > 0) {
        events.push({
          time: curr.time,
          type: 'high',
          level: curr.level
        });
      }

      // 干潮検出（前後より低い）
      if (curr.level < prev.level && curr.level < next.level) {
        events.push({
          time: curr.time,
          type: 'low',
          level: curr.level
        });
      }
    }

    return events.sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  /**
   * 次のイベント検出
   */
  private findNextEvent(currentTime: Date, events: TideEvent[]): TideEvent | null {
    return events.find(event => event.time.getTime() > currentTime.getTime()) || null;
  }

  /**
   * 現在の潮汐状態判定
   */
  private determineCurrentState(currentTime: Date, events: TideEvent[]): 'rising' | 'falling' | 'high' | 'low' {
    const nextEvent = this.findNextEvent(currentTime, events);

    if (!nextEvent) return 'rising';

    const timeToNext = nextEvent.time.getTime() - currentTime.getTime();
    if (timeToNext <= 10 * 60 * 1000) { // 10分以内
      return nextEvent.type;
    }

    return nextEvent.type === 'high' ? 'rising' : 'falling';
  }

  /**
   * 季節変動計算
   */
  private calculateSeasonalVariation(date: Date, coordinates: { latitude: number; longitude: number }) {
    const dayOfYear = this.getDayOfYear(date);
    const seasonalAngle = ((dayOfYear - 80) / 365) * 360;
    const latitudeEffect = Math.abs(coordinates.latitude) / 90;
    const baseSeasonalFactor = Math.cos(seasonalAngle * Math.PI / 180);

    return {
      m2Factor: 1.0 + (baseSeasonalFactor * 0.15 * latitudeEffect),
      s2Factor: 1.0 + (Math.cos((seasonalAngle + 45) * Math.PI / 180) * 0.20 * latitudeEffect),
      k1Factor: 1.0 + (Math.sin(seasonalAngle * Math.PI / 180) * 0.25 * latitudeEffect),
      o1Factor: 1.0 + (Math.sin((seasonalAngle + 90) * Math.PI / 180) * 0.18 * latitudeEffect),
      seasonalAngle,
      dayOfYear,
      latitudeEffect
    };
  }

  /**
   * 年の経過日数計算
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * 計算負荷のシミュレート
   */
  private async simulateComputationalLoad(complexityFactor: number): Promise<void> {
    // 実際の計算処理の負荷をシミュレート
    const iterations = Math.floor(Math.abs(complexityFactor) * 100000);

    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sin(i) * Math.cos(i) * Math.sqrt(i + 1);
    }

    // 結果を使用して最適化を防ぐ
    if (result !== 0) {
      // 何もしない（最適化防止）
    }
  }
}