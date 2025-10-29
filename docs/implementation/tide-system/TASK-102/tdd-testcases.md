# TASK-102: 調和解析エンジン - テストケース設計（Test Cases Phase）

## 概要
調和解析エンジンの全機能に対する包括的なテストケースを設計。
単体テスト、統合テスト、境界値テスト、パフォーマンステストを含む。

## テストケース一覧

### 分潮定義システムテスト

#### TC-H001: 主要分潮の角周波数精度テスト
```typescript
describe('分潮定義システム', () => {
  it('TC-H001: M2分潮の角周波数が正確', () => {
    const m2Frequency = engine.getConstituentFrequency('M2');
    expect(m2Frequency).toBeCloseTo(28.984104, 6); // ±0.000001精度
  });

  it('TC-H002: S2分潮の角周波数が正確', () => {
    const s2Frequency = engine.getConstituentFrequency('S2');
    expect(s2Frequency).toBeCloseTo(30.000000, 6);
  });

  it('TC-H003: K1分潮の角周波数が正確', () => {
    const k1Frequency = engine.getConstituentFrequency('K1');
    expect(k1Frequency).toBeCloseTo(15.041069, 6);
  });

  it('TC-H004: O1分潮の角周波数が正確', () => {
    const o1Frequency = engine.getConstituentFrequency('O1');
    expect(o1Frequency).toBeCloseTo(13.943035, 6);
  });

  it('TC-H005: Mf分潮の角周波数が正確', () => {
    const mfFrequency = engine.getConstituentFrequency('Mf');
    expect(mfFrequency).toBeCloseTo(1.098033, 6);
  });

  it('TC-H006: Mm分潮の角周波数が正確', () => {
    const mmFrequency = engine.getConstituentFrequency('Mm');
    expect(mfFrequency).toBeCloseTo(0.544375, 6);
  });
});
```

#### TC-H007: 分潮周期の整合性テスト
```typescript
it('TC-H007: 分潮周期が角周波数と整合', () => {
  const m2Period = engine.getConstituentPeriod('M2');
  const m2Frequency = engine.getConstituentFrequency('M2');

  // 周期 = 360 / 角周波数
  const expectedPeriod = 360 / m2Frequency;
  expect(m2Period).toBeCloseTo(expectedPeriod, 3);
  expect(m2Period).toBeCloseTo(12.421, 3); // M2周期：約12時間25分
});
```

#### TC-H008: 分潮係数計算テスト
```typescript
it('TC-H008: 分潮係数が天体位置から正しく計算される', () => {
  const testDate = new Date('2024-06-15T12:00:00Z');
  const factors = engine.calculateConstituentFactors(testDate);

  const m2Factor = factors.find(f => f.constituent === 'M2');
  expect(m2Factor).toBeDefined();
  expect(m2Factor.f).toBeGreaterThan(0.8); // 通常範囲0.8-1.2
  expect(m2Factor.f).toBeLessThan(1.2);
  expect(m2Factor.u).toBeGreaterThan(-30); // 位相補正-30°〜+30°
  expect(m2Factor.u).toBeLessThan(30);
});
```

### 潮位計算エンジンテスト

#### TC-H009: 単一分潮計算テスト
```typescript
describe('潮位計算エンジン', () => {
  it('TC-H009: 単一M2分潮の潮位計算', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 } // 振幅100cm、位相0°
    ];

    const baseTime = new Date('2024-06-15T00:00:00Z');
    const level0 = engine.calculateTideLevel(baseTime, harmonicConstants);

    // 6時間後（M2周期の1/4）で位相90°、潮位0付近
    const time6h = new Date(baseTime.getTime() + 6 * 60 * 60 * 1000);
    const level6h = engine.calculateTideLevel(time6h, harmonicConstants);

    expect(level0).toBeCloseTo(100, 1); // cos(0°) = 1
    expect(level6h).toBeCloseTo(0, 5);   // cos(90°) = 0
  });

  it('TC-H010: 複数分潮の合成計算', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 },
      { constituent: 'S2', amplitude: 50, phase: 90 }
    ];

    const testTime = new Date('2024-06-15T12:00:00Z');
    const level = engine.calculateTideLevel(testTime, harmonicConstants);

    // 合成波の振幅は単純な足し算でない（位相差により）
    expect(Math.abs(level)).toBeLessThan(150); // 100 + 50の線形和より小さい
    expect(typeof level).toBe('number');
    expect(isNaN(level)).toBe(false);
  });

  it('TC-H011: 全6分潮の合成計算', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 120, phase: 45 },
      { constituent: 'S2', amplitude: 80, phase: 120 },
      { constituent: 'K1', amplitude: 60, phase: 200 },
      { constituent: 'O1', amplitude: 40, phase: 300 },
      { constituent: 'Mf', amplitude: 20, phase: 0 },
      { constituent: 'Mm', amplitude: 15, phase: 180 }
    ];

    const testTime = new Date('2024-06-15T12:00:00Z');
    const level = engine.calculateTideLevel(testTime, harmonicConstants);

    expect(typeof level).toBe('number');
    expect(isNaN(level)).toBe(false);
    expect(Math.abs(level)).toBeLessThan(400); // 現実的な範囲
  });
});
```

#### TC-H012: 計算精度・境界値テスト
```typescript
it('TC-H012: 24時間での潮位連続性', () => {
  const harmonicConstants = [
    { constituent: 'M2', amplitude: 100, phase: 0 }
  ];

  const baseTime = new Date('2024-06-15T00:00:00Z');
  const level0 = engine.calculateTideLevel(baseTime, harmonicConstants);

  // 24時間後の潮位（僅かな差はあるが、ほぼ同じ値になるはず）
  const time24h = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
  const level24h = engine.calculateTideLevel(time24h, harmonicConstants);

  expect(Math.abs(level24h - level0)).toBeLessThan(1); // 1cm以内の差
});

it('TC-H013: ゼロ振幅での計算', () => {
  const harmonicConstants = [
    { constituent: 'M2', amplitude: 0, phase: 45 }
  ];

  const testTime = new Date('2024-06-15T12:00:00Z');
  const level = engine.calculateTideLevel(testTime, harmonicConstants);

  expect(level).toBeCloseTo(0, 6);
});

it('TC-H014: 極端な振幅での計算', () => {
  const harmonicConstants = [
    { constituent: 'M2', amplitude: 1000, phase: 0 } // 10m振幅
  ];

  const testTime = new Date('2024-06-15T00:00:00Z');
  const level = engine.calculateTideLevel(testTime, harmonicConstants);

  expect(Math.abs(level)).toBeLessThan(1200); // 計算が発散しない
  expect(isNaN(level)).toBe(false);
});
```

### 満潮・干潮検出システムテスト

#### TC-H015: 基本的な極値検出テスト
```typescript
describe('満潮・干潮検出システム', () => {
  it('TC-H015: 単純なM2分潮での満潮・干潮検出', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 }
    ];

    const startDate = new Date('2024-06-15T00:00:00Z');
    const endDate = new Date('2024-06-16T00:00:00Z'); // 24時間

    const extremes = engine.findTidalExtremes(startDate, endDate, harmonicConstants);

    // M2周期（約12.42時間）なので、24時間で約4回の極値
    expect(extremes.length).toBeGreaterThanOrEqual(3);
    expect(extremes.length).toBeLessThanOrEqual(5);

    // 満潮・干潮が交互に現れる
    for (let i = 1; i < extremes.length; i++) {
      expect(extremes[i].type).not.toBe(extremes[i-1].type);
    }
  });

  it('TC-H016: 満潮・干潮時刻の精度検証', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 }
    ];

    const startDate = new Date('2024-06-15T00:00:00Z');
    const endDate = new Date('2024-06-15T12:30:00Z');

    const extremes = engine.findTidalExtremes(startDate, endDate, harmonicConstants);
    const firstHigh = extremes.find(e => e.type === 'high');

    expect(firstHigh).toBeDefined();
    // 理論的には0時開始で位相0°なら、満潮は0時
    const timeDiff = Math.abs(firstHigh.dateTime.getTime() - startDate.getTime());
    expect(timeDiff).toBeLessThan(10 * 60 * 1000); // ±10分精度
  });

  it('TC-H017: 複数分潮での極値検出', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 },
      { constituent: 'S2', amplitude: 50, phase: 90 },
      { constituent: 'K1', amplitude: 30, phase: 180 }
    ];

    const startDate = new Date('2024-06-15T00:00:00Z');
    const endDate = new Date('2024-06-16T00:00:00Z');

    const extremes = engine.findTidalExtremes(startDate, endDate, harmonicConstants);

    // 複数分潮の合成波でも適切な数の極値が検出される
    expect(extremes.length).toBeGreaterThan(2);
    expect(extremes.length).toBeLessThan(8);

    // 潮位値が現実的範囲内
    extremes.forEach(extreme => {
      expect(Math.abs(extreme.level)).toBeLessThan(200);
    });
  });
});
```

#### TC-H018: 異常ケース・境界値テスト
```typescript
it('TC-H018: 短時間での極値検出', () => {
  const harmonicConstants = [
    { constituent: 'M2', amplitude: 100, phase: 0 }
  ];

  const startDate = new Date('2024-06-15T00:00:00Z');
  const endDate = new Date('2024-06-15T01:00:00Z'); // 1時間のみ

  const extremes = engine.findTidalExtremes(startDate, endDate, harmonicConstants);

  // 1時間では極値が0-1個程度
  expect(extremes.length).toBeLessThanOrEqual(1);
});

it('TC-H019: フラットな潮位での極値検出', () => {
  const harmonicConstants = [
    { constituent: 'M2', amplitude: 0, phase: 0 } // 振幅0
  ];

  const startDate = new Date('2024-06-15T00:00:00Z');
  const endDate = new Date('2024-06-16T00:00:00Z');

  const extremes = engine.findTidalExtremes(startDate, endDate, harmonicConstants);

  // フラットな場合は極値が検出されない、または検出されても無意味
  expect(extremes.length).toBe(0);
});
```

### 潮汐強度計算システムテスト

#### TC-H020: 潮汐強度の基本計算テスト
```typescript
describe('潮汐強度計算システム', () => {
  it('TC-H020: 潮位変化率の計算', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 }
    ];

    // 満潮から3時間後（最大変化率付近）
    const testTime = new Date('2024-06-15T03:00:00Z');
    const strength = engine.calculateTideStrength(testTime, harmonicConstants);

    expect(strength.rate).toBeLessThan(0); // 下げ潮（負の変化率）
    expect(Math.abs(strength.rate)).toBeGreaterThan(5); // 有意な変化率
    expect(strength.direction).toBe('falling');
    expect(strength.value).toBeGreaterThan(3); // 中程度以上の強度
    expect(strength.value).toBeLessThan(10);
  });

  it('TC-H021: 強度スケールの妥当性', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 200, phase: 0 }, // 大振幅
      { constituent: 'S2', amplitude: 100, phase: 0 }
    ];

    // 最大変化率時の強度
    const maxTime = new Date('2024-06-15T03:00:00Z');
    const maxStrength = engine.calculateTideStrength(maxTime, harmonicConstants);

    // 最小変化率時の強度（満潮・干潮時）
    const minTime = new Date('2024-06-15T00:00:00Z');
    const minStrength = engine.calculateTideStrength(minTime, harmonicConstants);

    expect(maxStrength.value).toBeGreaterThan(minStrength.value);
    expect(maxStrength.value).toBeLessThanOrEqual(10);
    expect(minStrength.value).toBeGreaterThanOrEqual(0);
  });

  it('TC-H022: 上げ潮・下げ潮の判定', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 }
    ];

    // 下げ潮時
    const fallingTime = new Date('2024-06-15T03:00:00Z');
    const fallingStrength = engine.calculateTideStrength(fallingTime, harmonicConstants);

    // 上げ潮時
    const risingTime = new Date('2024-06-15T09:00:00Z');
    const risingStrength = engine.calculateTideStrength(risingTime, harmonicConstants);

    expect(fallingStrength.direction).toBe('falling');
    expect(fallingStrength.rate).toBeLessThan(0);

    expect(risingStrength.direction).toBe('rising');
    expect(risingStrength.rate).toBeGreaterThan(0);
  });
});
```

### 統合テスト

#### TC-H023: 天体計算エンジンとの連携テスト
```typescript
describe('統合テスト', () => {
  it('TC-H023: 天体計算エンジンとの連携', () => {
    // 実際の天体位置を使用した分潮係数計算
    const testDate = new Date('2024-06-15T12:00:00Z');
    const factors = engine.calculateConstituentFactors(testDate);

    expect(factors).toHaveLength(6); // 6分潮

    factors.forEach(factor => {
      expect(factor.f).toBeGreaterThan(0);
      expect(factor.f).toBeLessThan(2); // 現実的な範囲
      expect(factor.u).toBeGreaterThan(-180);
      expect(factor.u).toBeLessThan(180);
    });
  });

  it('TC-H024: 24時間連続計算の安定性', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 120, phase: 45 },
      { constituent: 'S2', amplitude: 80, phase: 120 },
      { constituent: 'K1', amplitude: 60, phase: 200 },
      { constituent: 'O1', amplitude: 40, phase: 300 }
    ];

    const startTime = new Date('2024-06-15T00:00:00Z');
    const levels: number[] = [];

    // 1時間間隔で24時間分計算
    for (let hour = 0; hour < 24; hour++) {
      const time = new Date(startTime.getTime() + hour * 60 * 60 * 1000);
      const level = engine.calculateTideLevel(time, harmonicConstants);
      levels.push(level);
    }

    // 全ての値が有効
    levels.forEach(level => {
      expect(isNaN(level)).toBe(false);
      expect(Math.abs(level)).toBeLessThan(500);
    });

    // 連続性の確認（急激な変化がない）
    for (let i = 1; i < levels.length; i++) {
      const diff = Math.abs(levels[i] - levels[i-1]);
      expect(diff).toBeLessThan(100); // 1時間で100cm以上変化しない
    }
  });
});
```

### パフォーマンステスト

#### TC-H025: 計算速度テスト
```typescript
describe('パフォーマンステスト', () => {
  it('TC-H025: 単一時刻計算が1ms以内', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 },
      { constituent: 'S2', amplitude: 50, phase: 90 },
      { constituent: 'K1', amplitude: 30, phase: 180 },
      { constituent: 'O1', amplitude: 20, phase: 270 },
      { constituent: 'Mf', amplitude: 10, phase: 0 },
      { constituent: 'Mm', amplitude: 5, phase: 180 }
    ];

    const testTime = new Date('2024-06-15T12:00:00Z');

    const startTime = performance.now();
    engine.calculateTideLevel(testTime, harmonicConstants);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(1); // <1ms
  });

  it('TC-H026: 24時間分計算が100ms以内', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 },
      { constituent: 'S2', amplitude: 50, phase: 90 },
      { constituent: 'K1', amplitude: 30, phase: 180 },
      { constituent: 'O1', amplitude: 20, phase: 270 }
    ];

    const startTime = performance.now();

    const baseTime = new Date('2024-06-15T00:00:00Z');
    for (let minute = 0; minute < 24 * 60; minute++) {
      const time = new Date(baseTime.getTime() + minute * 60 * 1000);
      engine.calculateTideLevel(time, harmonicConstants);
    }

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100); // <100ms
  });

  it('TC-H027: 極値検出パフォーマンス', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 },
      { constituent: 'S2', amplitude: 50, phase: 90 }
    ];

    const startDate = new Date('2024-06-15T00:00:00Z');
    const endDate = new Date('2024-06-16T00:00:00Z');

    const startTime = performance.now();
    engine.findTidalExtremes(startDate, endDate, harmonicConstants);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(50); // <50ms
  });
});
```

### エラーハンドリングテスト

#### TC-H028: 異常入力テスト
```typescript
describe('エラーハンドリング', () => {
  it('TC-H028: 無効な日時でエラー', () => {
    const harmonicConstants = [
      { constituent: 'M2', amplitude: 100, phase: 0 }
    ];

    const invalidDate = new Date('invalid');

    expect(() => {
      engine.calculateTideLevel(invalidDate, harmonicConstants);
    }).toThrow();
  });

  it('TC-H029: 空の調和定数配列でエラー', () => {
    const emptyConstants: HarmonicConstant[] = [];
    const testTime = new Date('2024-06-15T12:00:00Z');

    expect(() => {
      engine.calculateTideLevel(testTime, emptyConstants);
    }).toThrow();
  });

  it('TC-H030: 未知の分潮名でエラー', () => {
    expect(() => {
      engine.getConstituentFrequency('UNKNOWN');
    }).toThrow();
  });

  it('TC-H031: null入力でエラー', () => {
    expect(() => {
      engine.calculateTideLevel(null as any, []);
    }).toThrow();

    expect(() => {
      engine.calculateTideLevel(new Date(), null as any);
    }).toThrow();
  });
});
```

## テスト実行戦略

### Phase 1: 基本機能テスト
1. **分潮定義**: TC-H001 〜 TC-H008
2. **潮位計算**: TC-H009 〜 TC-H014
3. **極値検出**: TC-H015 〜 TC-H019
4. **潮汐強度**: TC-H020 〜 TC-H022

### Phase 2: 統合・品質テスト
1. **統合テスト**: TC-H023 〜 TC-H024
2. **パフォーマンス**: TC-H025 〜 TC-H027
3. **エラーハンドリング**: TC-H028 〜 TC-H031

### 成功基準
- 全31テストケースが通過
- パフォーマンス要件（1ms, 100ms, 50ms）を満たす
- エラーハンドリングが適切に動作

## 次のステップ
Test Cases Phase完了後、Red Phase（テスト実装）に進む。