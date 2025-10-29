# TASK-102: グラフパターンの多様性検証機能 - テストケース設計

## 概要

TDDのStep 2として、要件定義に基づく包括的なテストケースを設計します。テスト駆動開発により、実装の品質と信頼性を確保し、全ての機能要件が適切に満たされることを検証します。

## テスト戦略

### 1. テストピラミッド構造
- **単体テスト（70%）**: 個別クラス・メソッドの動作確認
- **統合テスト（20%）**: コンポーネント間の連携確認
- **E2Eテスト（10%）**: ユーザーシナリオの完全検証

### 2. テストカテゴリ
- **機能テスト**: 要求された機能の正確な動作確認
- **境界値テスト**: 極端な条件での安定性確認
- **パフォーマンステスト**: 性能要件の達成確認
- **エラーハンドリングテスト**: 異常系での堅牢性確認

## 1. GraphPatternAnalyzer テストケース

### TC-201: 基本的なパターン分析機能

#### TC-201-01: 標準的なデータでの多様性分析
```typescript
describe('GraphPatternAnalyzer - 基本分析', () => {
  test('異なる座標の釣果記録で異なるパターンを検出', async () => {
    // Given: 東京湾と大阪湾の釣果記録
    const tokyoBayRecords = createFishingRecords('tokyo_bay', 5);
    const osakaBayRecords = createFishingRecords('osaka_bay', 5);
    const allRecords = [...tokyoBayRecords, ...osakaBayRecords];

    // When: パターン分析を実行
    const result = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: allRecords,
      analysisOptions: { includeCoordinateVariation: true }
    });

    // Then: 地理的差異によるパターンの違いを検出
    expect(result.diversity.uniquenessScore).toBeGreaterThan(0.7);
    expect(result.patterns.length).toBe(10);
    expect(result.summary.uniquePatterns).toBeGreaterThan(8);
  });

  test('同一座標・異なる日時でのパターン差異検出', async () => {
    // Given: 同一場所、春分と夏至の記録
    const springRecords = createFishingRecords('same_location', 3, '2024-03-21');
    const summerRecords = createFishingRecords('same_location', 3, '2024-06-21');

    // When: 季節変動を考慮した分析
    const result = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: [...springRecords, ...summerRecords],
      analysisOptions: { includeSeasonalVariation: true }
    });

    // Then: 季節差によるパターンの違いを検出
    expect(result.diversity.visualSeparability).toBeGreaterThan(0.8);
    expect(result.summary.duplicatePatterns).toBeLessThan(2);
  });
});
```

#### TC-201-02: 固有性スコア計算の正確性
```typescript
describe('固有性スコア計算', () => {
  test('完全に同一パターンで低い固有性スコア', async () => {
    // Given: 全く同じ条件の釣果記録
    const identicalRecords = Array(5).fill(null).map(() =>
      createIdenticalFishingRecord('base_location', '2024-01-01')
    );

    // When: パターン分析実行
    const result = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: identicalRecords
    });

    // Then: 低い固有性スコア
    expect(result.diversity.uniquenessScore).toBeLessThan(0.3);
    expect(result.summary.duplicatePatterns).toBe(4); // 1つ除いて重複
  });

  test('多様な条件で高い固有性スコア', async () => {
    // Given: 大幅に異なる条件の記録
    const diverseRecords = [
      createFishingRecord('tokyo', '2024-01-01'),
      createFishingRecord('osaka', '2024-06-15'),
      createFishingRecord('hiroshima', '2024-12-31'),
      createFishingRecord('sendai', '2024-04-10')
    ];

    // When: 全変動係数を考慮して分析
    const result = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: diverseRecords,
      analysisOptions: {
        includeCoordinateVariation: true,
        includeSeasonalVariation: true
      }
    });

    // Then: 高い固有性スコア
    expect(result.diversity.uniquenessScore).toBeGreaterThan(0.9);
    expect(result.summary.uniquePatterns).toBe(4);
  });
});
```

### TC-202: 統計分析精度テスト

#### TC-202-01: パターン分散計算
```typescript
describe('統計計算精度', () => {
  test('パターン分散の正確な計算', async () => {
    // Given: 分散既知のテストデータ
    const testRecords = createRecordsWithKnownVariance();
    const expectedVariance = 42.5; // 事前計算済み

    // When: パターン分析実行
    const result = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: testRecords
    });

    // Then: 計算された分散が期待値と一致
    expect(result.diversity.patternVariance).toBeCloseTo(expectedVariance, 2);
  });

  test('視覚的区別可能性の定量化', async () => {
    // Given: 視覚的に明確に区別可能なパターン
    const distinctPatterns = createVisuallyDistinctRecords();

    // When: 分析実行
    const result = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: distinctPatterns
    });

    // Then: 高い視覚的区別可能性スコア
    expect(result.diversity.visualSeparability).toBeGreaterThan(0.85);
  });
});
```

### TC-203: 境界値・異常系テスト

#### TC-203-01: データ不備への対応
```typescript
describe('エラーハンドリング', () => {
  test('空の釣果記録配列でのフォールバック', async () => {
    // Given: 空の配列
    const emptyRecords: FishingRecord[] = [];

    // When: 分析実行
    const result = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: emptyRecords
    });

    // Then: 安全なフォールバック結果
    expect(result.summary.totalRecords).toBe(0);
    expect(result.diversity.uniquenessScore).toBe(0);
    expect(result.patterns).toEqual([]);
  });

  test('無効な潮位データでの安全な処理', async () => {
    // Given: NaN, Infinity, null を含むデータ
    const corruptedRecords = createCorruptedFishingRecords();

    // When: 分析実行（エラーなし）
    const result = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: corruptedRecords
    });

    // Then: 有効なデータのみで分析実行
    expect(result.summary.totalRecords).toBeGreaterThan(0);
    expect(result.diversity.uniquenessScore).toBeGreaterThanOrEqual(0);
  });
});
```

## 2. VariationEffectMeasurer テストケース

### TC-301: 座標変動係数効果測定

#### TC-301-01: 地理的距離による影響測定
```typescript
describe('VariationEffectMeasurer - 座標効果', () => {
  test('距離に比例した座標変動効果', async () => {
    // Given: 基準点から異なる距離の測定点
    const baseLocation = { lat: 35.6762, lng: 139.6503 }; // 東京
    const testLocations = [
      { lat: 35.6762, lng: 139.7503 }, // 約8km東
      { lat: 35.5762, lng: 139.6503 }, // 約11km南
      { lat: 35.2139, lng: 139.6917 }  // 約50km南（横浜）
    ];

    // When: 座標変動効果を測定
    const result = await VariationEffectMeasurer.analyzeEffect({
      baseLocation,
      testLocations,
      dateRange: { start: '2024-01-01', end: '2024-01-07' },
      analysisType: 'coordinate'
    });

    // Then: 距離に応じた影響度の違い
    expect(result.coordinateEffect).toBeDefined();
    expect(result.coordinateEffect!.averageImpact).toBeGreaterThan(0);
    expect(result.coordinateEffect!.spatialRange).toBeCloseTo(50, 10);
  });

  test('最大影響度の検出', async () => {
    // Given: 極端に離れた座標での測定
    const extremeLocations = [
      { lat: 45.5152, lng: 141.3544 }, // 札幌
      { lat: 26.2124, lng: 127.6792 }  // 沖縄
    ];

    // When: 座標効果測定
    const result = await VariationEffectMeasurer.analyzeEffect({
      baseLocation: { lat: 35.6762, lng: 139.6503 },
      testLocations: extremeLocations,
      dateRange: { start: '2024-01-01', end: '2024-01-07' },
      analysisType: 'coordinate'
    });

    // Then: 顕著な最大影響度
    expect(result.coordinateEffect!.maxImpact).toBeGreaterThan(10);
  });
});
```

### TC-302: 季節変動係数効果測定

#### TC-302-01: 季節サイクルの検出
```typescript
describe('季節変動効果測定', () => {
  test('年間を通じた季節変動パターン', async () => {
    // Given: 四季を代表する日付
    const seasonalDates = ['2024-03-21', '2024-06-21', '2024-09-21', '2024-12-21'];

    // When: 季節変動効果を測定
    const result = await VariationEffectMeasurer.analyzeEffect({
      baseLocation: { lat: 35.6762, lng: 139.6503 },
      testLocations: [{ lat: 35.6762, lng: 139.6503 }],
      dateRange: { start: '2024-01-01', end: '2024-12-31' },
      analysisType: 'seasonal'
    });

    // Then: 季節サイクルの検出
    expect(result.seasonalEffect).toBeDefined();
    expect(result.seasonalEffect!.seasonalCycle).toBeGreaterThan(0.5);
    expect(result.seasonalEffect!.peakSeasonImpact).toBeGreaterThan(5);
  });

  test('季節変動の統計的有意性', async () => {
    // Given: 統計的検証に十分なデータ期間
    const extendedPeriod = { start: '2024-01-01', end: '2024-12-31' };

    // When: 季節効果分析
    const result = await VariationEffectMeasurer.analyzeEffect({
      baseLocation: { lat: 35.6762, lng: 139.6503 },
      testLocations: [{ lat: 35.6762, lng: 139.6503 }],
      dateRange: extendedPeriod,
      analysisType: 'seasonal'
    });

    // Then: 統計的に有意な季節変動
    expect(result.seasonalEffect!.averageImpact).toBeGreaterThan(0);
    // Note: 統計的有意性は実際のp値計算で検証（将来実装）
  });
});
```

### TC-303: 複合効果測定

#### TC-303-01: 座標・季節の相乗効果
```typescript
describe('複合効果測定', () => {
  test('座標・季節変動の相乗効果', async () => {
    // Given: 地理的・時間的に多様な条件
    const diverseConditions = {
      baseLocation: { lat: 35.6762, lng: 139.6503 },
      testLocations: [
        { lat: 34.6937, lng: 135.5023 }, // 大阪
        { lat: 43.0642, lng: 141.3469 }  // 札幌
      ],
      dateRange: { start: '2024-01-01', end: '2024-12-31' },
      analysisType: 'both' as const
    };

    // When: 複合効果測定
    const result = await VariationEffectMeasurer.analyzeEffect(diverseConditions);

    // Then: 相乗効果の検出
    expect(result.combinedEffect.synergy).toBeGreaterThan(0);
    expect(result.combinedEffect.totalVariation).toBeGreaterThan(
      (result.coordinateEffect?.averageImpact || 0) +
      (result.seasonalEffect?.averageImpact || 0)
    );
  });
});
```

## 3. TideDebugger テストケース

### TC-401: デバッグ情報収集・表示

#### TC-401-01: 計算パラメータの詳細表示
```typescript
describe('TideDebugger - デバッグ情報', () => {
  test('潮汐計算パラメータの完全な情報収集', async () => {
    // Given: 標準的な潮汐計算条件
    const testRecord = createStandardFishingRecord();

    // When: デバッグ情報を収集
    const debugInfo = await TideDebugger.collectDebugInfo(testRecord);

    // Then: 必要な情報が全て含まれる
    expect(debugInfo.calculation.baseParameters).toBeDefined();
    expect(debugInfo.calculation.coordinateFactors).toBeDefined();
    expect(debugInfo.calculation.seasonalFactors).toBeDefined();
    expect(debugInfo.calculation.finalParameters).toBeDefined();
  });

  test('パフォーマンス統計の正確な測定', async () => {
    // Given: パフォーマンス測定対象の処理
    const heavyCalculationRecord = createHeavyCalculationRecord();

    // When: デバッグ情報収集（パフォーマンス測定付き）
    const debugInfo = await TideDebugger.collectDebugInfo(heavyCalculationRecord);

    // Then: パフォーマンス指標が適切に収集
    expect(debugInfo.performance.calculationTime).toBeGreaterThan(0);
    expect(debugInfo.performance.calculationTime).toBeLessThan(5000); // 5秒以内
    expect(debugInfo.performance.memoryUsage).toBeGreaterThan(0);
    expect(debugInfo.performance.cacheHitRate).toBeGreaterThanOrEqual(0);
    expect(debugInfo.performance.cacheHitRate).toBeLessThanOrEqual(100);
  });
});
```

#### TC-401-02: 品質保証情報
```typescript
describe('品質保証機能', () => {
  test('データ整合性チェック', async () => {
    // Given: 整合性に問題のあるデータ
    const inconsistentRecord = createInconsistentRecord();

    // When: デバッグ情報収集
    const debugInfo = await TideDebugger.collectDebugInfo(inconsistentRecord);

    // Then: 問題の検出と警告
    expect(debugInfo.quality.dataIntegrity).toBe(false);
    expect(debugInfo.quality.warnings).toContain('Data inconsistency detected');
  });

  test('計算精度スコアの算出', async () => {
    // Given: 高精度計算が期待される条件
    const precisionRecord = createPrecisionTestRecord();

    // When: デバッグ情報収集
    const debugInfo = await TideDebugger.collectDebugInfo(precisionRecord);

    // Then: 適切な精度スコア
    expect(debugInfo.quality.calculationAccuracy).toBeGreaterThan(0.95);
    expect(debugInfo.quality.warnings).toHaveLength(0);
  });
});
```

## 4. 統合テストケース

### TC-501: システム統合テスト

#### TC-501-01: 既存システムとの統合
```typescript
describe('システム統合', () => {
  test('TideCalculationServiceとの連携', async () => {
    // Given: 実際のTideCalculationServiceインスタンス
    const tideService = new TideCalculationService();
    const testRecord = createIntegrationTestRecord();

    // When: 統合分析を実行
    const tideData = await tideService.calculateTideGraph(testRecord);
    const patternResult = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: [testRecord]
    });

    // Then: 結果の整合性確認
    expect(patternResult.patterns[0].tideData).toMatchObject(tideData);
  });

  test('キャッシュシステムとの協調動作', async () => {
    // Given: キャッシュ有効な条件での分析
    const records = createCacheTestRecords();

    // When: 複数回の分析実行
    const firstRun = await GraphPatternAnalyzer.analyzePatterns({ fishingRecords: records });
    const secondRun = await GraphPatternAnalyzer.analyzePatterns({ fishingRecords: records });

    // Then: キャッシュ効果の確認
    expect(firstRun).toEqual(secondRun);
    // キャッシュヒット率の確認は実装詳細に依存
  });
});
```

## 5. パフォーマンステストケース

### TC-601: 性能要件検証

#### TC-601-01: 処理時間要件
```typescript
describe('パフォーマンステスト', () => {
  test('100件記録での5秒以内処理', async () => {
    // Given: 100件の釣果記録
    const largeDataset = createLargeDataset(100);

    // When: 処理時間測定
    const startTime = Date.now();
    const result = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: largeDataset
    });
    const processingTime = Date.now() - startTime;

    // Then: 時間要件の達成
    expect(processingTime).toBeLessThan(5000); // 5秒以内
    expect(result.summary.totalRecords).toBe(100);
  });

  test('メモリ使用量の制限確認', async () => {
    // Given: メモリ監視下での処理
    const memoryBefore = process.memoryUsage().heapUsed;

    const testRecords = createMemoryTestRecords();

    // When: 分析処理実行
    await GraphPatternAnalyzer.analyzePatterns({ fishingRecords: testRecords });

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryIncrease = memoryAfter - memoryBefore;

    // Then: メモリ使用量要件（100MB以内追加）
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});
```

## 6. E2Eテストケース

### TC-701: ユーザーシナリオテスト

#### TC-701-01: 開発者デバッグシナリオ
```typescript
describe('E2E: 開発者シナリオ', () => {
  test('問題診断ワークフロー', async () => {
    // Given: 問題のある釣果記録データ
    const problematicRecords = createProblematicRecords();

    // When: 段階的な分析実行
    // 1. パターン分析で問題発見
    const patternResult = await GraphPatternAnalyzer.analyzePatterns({
      fishingRecords: problematicRecords
    });

    // 2. 変動係数効果測定で原因調査
    const effectResult = await VariationEffectMeasurer.analyzeEffect({
      baseLocation: problematicRecords[0].coordinates,
      testLocations: problematicRecords.map(r => r.coordinates),
      dateRange: { start: '2024-01-01', end: '2024-01-31' },
      analysisType: 'both'
    });

    // 3. デバッグ情報で詳細確認
    const debugInfo = await TideDebugger.collectDebugInfo(problematicRecords[0]);

    // Then: 包括的な問題診断情報
    expect(patternResult.diversity.uniquenessScore).toBeLessThan(0.5); // 問題検出
    expect(effectResult.combinedEffect.totalVariation).toBeGreaterThan(0);
    expect(debugInfo.quality.warnings).toContain('Low pattern diversity detected');
  });
});
```

## テストデータ生成ヘルパー

### モックデータ生成関数
```typescript
// テストデータ生成ユーティリティ
function createFishingRecords(location: string, count: number, date?: string): FishingRecord[] {
  return Array(count).fill(null).map((_, index) => ({
    id: `${location}_${index}`,
    coordinates: getCoordinatesForLocation(location),
    date: date || `2024-01-${String(index + 1).padStart(2, '0')}`,
    species: 'sea_bass',
    // ... その他のプロパティ
  }));
}

function getCoordinatesForLocation(location: string): Coordinates {
  const coordinateMap: Record<string, Coordinates> = {
    'tokyo_bay': { lat: 35.6762, lng: 139.6503 },
    'osaka_bay': { lat: 34.6937, lng: 135.5023 },
    'hiroshima': { lat: 34.3853, lng: 132.4553 },
    'sendai': { lat: 38.2682, lng: 140.8694 }
  };
  return coordinateMap[location] || { lat: 35.0, lng: 139.0 };
}
```

## テスト実行戦略

### 1. 開発フェーズでの実行順序
1. **単体テスト**: 各クラスの基本動作確認
2. **統合テスト**: コンポーネント間連携確認
3. **パフォーマンステスト**: 性能要件確認
4. **E2Eテスト**: ユーザーシナリオ確認

### 2. 継続的インテグレーション
- コミット時: 単体テスト + 軽量統合テスト
- プルリクエスト時: 全テストスイート実行
- リリース前: パフォーマンステスト + E2Eテスト

### 3. テスト環境設定
```typescript
// テスト設定
export const testConfig = {
  timeout: 10000, // 10秒タイムアウト
  retries: 2,     // 失敗時2回リトライ
  parallel: true, // 並列実行
  coverage: {
    threshold: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    }
  }
};
```

## 成功基準

### テスト品質指標
- **テストカバレッジ**: 90%以上
- **成功率**: 100%（全テスト成功）
- **実行時間**: 各テストスイート30秒以内
- **メンテナンス性**: テストコードの可読性・拡張性確保

このテストケース設計により、TASK-102の実装品質と要件充足を確実に検証できます。

---

**作成日**: 2024-09-26
**フェーズ**: TDD TEST-CASES (2/6)
**ステータス**: ✅ 完了
**次ステップ**: RED フェーズ - 失敗するテストの作成と最小実装