# TASK-201: キャッシュ戦略の最適化 - テストケース設計書

## プロジェクト概要

**プロジェクト名**: キャッシュ戦略の最適化
**タスクID**: TASK-201
**実装フェーズ**: TDD Step 2/6 - テストケース設計 (RED)
**作成日**: 2024-09-26
**テスト戦略**: 包括的TDDテストスイート

## テスト戦略概要

### 📊 テストピラミッド構成

| テストレベル | 割合 | テスト数 | 重点項目 |
|--------------|------|----------|-----------|
| **単体テスト** | 70% | 28テスト | 個別機能の完全性 |
| **統合テスト** | 20% | 8テスト | システム間連携 |
| **E2Eテスト** | 10% | 4テスト | エンドユーザー体験 |
| **合計** | 100% | **40テスト** | 要件全網羅 |

### 🎯 テスト品質目標

- **コードカバレッジ**: 95%以上
- **テスト実行速度**: 全テスト2秒以内
- **信頼性**: False Positive率 < 1%
- **保守性**: テスト1つあたり平均30行以下

## 単体テスト設計 (70% - 28テスト)

### 🔧 UT-301: EnhancedCacheKey生成機能 (8テスト)

#### UT-301-01: 基本キー生成の正確性
```typescript
describe('Enhanced Cache Key Generation', () => {
  it('should generate unique keys for different parameters', () => {
    const key1 = generator.generateEnhancedKey({
      location: { latitude: 35.67, longitude: 139.65, precision: 'high' },
      temporal: { date: '2024-01-01', seasonalContext: 'winter' },
      variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 0.4 },
      metadata: { analysisType: 'both', precision: 2, version: '1.0' }
    });

    const key2 = generator.generateEnhancedKey({
      location: { latitude: 35.68, longitude: 139.65, precision: 'high' },
      // ... other parameters same
    });

    expect(key1).not.toBe(key2);
    expect(key1.length).toBeGreaterThan(50); // 詳細キー情報
    expect(key1.split('|')).toHaveLength(4); // 4セクション構造
  });
});
```

#### UT-301-02: 座標精度レベル処理
```typescript
it('should handle different precision levels correctly', () => {
  const highPrecisionKey = generator.generateEnhancedKey({
    location: { latitude: 35.678123, longitude: 139.653789, precision: 'high' }
  });

  const mediumPrecisionKey = generator.generateEnhancedKey({
    location: { latitude: 35.678123, longitude: 139.653789, precision: 'medium' }
  });

  // 高精度: 0.01度 (小数点2桁)
  expect(highPrecisionKey).toContain('35.68,139.65');

  // 中精度: 0.1度 (小数点1桁)
  expect(mediumPrecisionKey).toContain('35.7,139.7');
});
```

#### UT-301-03: 季節コンテキスト正規化
```typescript
it('should normalize seasonal context consistently', () => {
  // 異なる日付での季節判定
  const winterKey = generator.generateEnhancedKey({
    temporal: { date: '2024-01-15', seasonalContext: 'winter' }
  });

  const springKey = generator.generateEnhancedKey({
    temporal: { date: '2024-04-15', seasonalContext: 'spring' }
  });

  expect(winterKey).toContain('winter');
  expect(springKey).toContain('spring');
  expect(winterKey).not.toBe(springKey);
});
```

#### UT-301-04: 変動係数の量子化
```typescript
it('should quantize variation coefficients appropriately', () => {
  const key1 = generator.generateEnhancedKey({
    variation: { coordinateCoeff: 0.501, seasonalCoeff: 0.502, combinedEffect: 0.503 }
  });

  const key2 = generator.generateEnhancedKey({
    variation: { coordinateCoeff: 0.504, seasonalCoeff: 0.505, combinedEffect: 0.506 }
  });

  // 0.01精度での量子化により同一キーになることを確認
  expect(key1).toBe(key2);
});
```

#### UT-301-05: 時間範囲処理
```typescript
it('should handle time ranges correctly', () => {
  const timeRangeKey = generator.generateEnhancedKey({
    temporal: {
      date: '2024-01-01',
      timeRange: { start: '09:00', end: '17:00' },
      seasonalContext: 'winter'
    }
  });

  expect(timeRangeKey).toContain('09:00-17:00');
});
```

#### UT-301-06: メタデータバージョニング
```typescript
it('should include metadata versioning', () => {
  const v1Key = generator.generateEnhancedKey({
    metadata: { analysisType: 'both', precision: 2, version: '1.0' }
  });

  const v2Key = generator.generateEnhancedKey({
    metadata: { analysisType: 'both', precision: 2, version: '2.0' }
  });

  expect(v1Key).toContain('v1.0');
  expect(v2Key).toContain('v2.0');
  expect(v1Key).not.toBe(v2Key);
});
```

#### UT-301-07: 無効入力エラーハンドリング
```typescript
it('should handle invalid inputs gracefully', () => {
  expect(() => {
    generator.generateEnhancedKey({
      location: { latitude: NaN, longitude: 139.65, precision: 'high' }
    });
  }).toThrow('Invalid location coordinates');

  expect(() => {
    generator.generateEnhancedKey({
      variation: { coordinateCoeff: -1, seasonalCoeff: 0.5, combinedEffect: 0.4 }
    });
  }).toThrow('Variation coefficients must be between 0 and 1');
});
```

#### UT-301-08: キー正規化の一貫性
```typescript
it('should maintain key normalization consistency', () => {
  const unnormalizedInput = {
    location: { latitude: 35.678999, longitude: 139.653001, precision: 'high' },
    temporal: { date: '2024-1-1', seasonalContext: 'winter' },
    variation: { coordinateCoeff: 0.50001, seasonalCoeff: 0.29999, combinedEffect: 0.4 }
  };

  const key1 = generator.generateEnhancedKey(unnormalizedInput);
  const key2 = generator.generateEnhancedKey(unnormalizedInput);

  expect(key1).toBe(key2); // 一貫性確保
  expect(key1).toContain('35.68'); // 正規化確認
  expect(key1).toContain('2024-01-01'); // 日付正規化
});
```

### 🎯 UT-302: スマートマッチング機能 (7テスト)

#### UT-302-01: 完全一致検索
```typescript
describe('Smart Matching Engine', () => {
  it('should find exact matches with highest priority', async () => {
    const matcher = new SmartMatcher();

    await matcher.addEntry(exactKey, testData);

    const result = await matcher.findMatches(exactKey, {
      matchingStrategy: 'exact',
      maxResults: 1
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].confidence).toBe(1.0);
    expect(result.matches[0].matchType).toBe('exact');
  });
});
```

#### UT-302-02: 地理的近接マッチング
```typescript
it('should find geographic proximity matches', async () => {
  const baseKey = createEnhancedKey({
    location: { latitude: 35.67, longitude: 139.65, precision: 'high' }
  });

  const nearbyKey = createEnhancedKey({
    location: { latitude: 35.68, longitude: 139.66, precision: 'high' }
  });

  await matcher.addEntry(baseKey, testData);

  const result = await matcher.findMatches(nearbyKey, {
    matchingStrategy: 'proximity',
    geoTolerance: 2.0 // 2km tolerance
  });

  expect(result.matches).toHaveLength(1);
  expect(result.matches[0].confidence).toBeGreaterThan(0.8);
  expect(result.matches[0].matchType).toBe('proximity');
});
```

#### UT-302-03: 時間的近似マッチング
```typescript
it('should handle temporal proximity matching', async () => {
  const baseKey = createEnhancedKey({
    temporal: { date: '2024-01-01', seasonalContext: 'winter' }
  });

  const nearKey = createEnhancedKey({
    temporal: { date: '2024-01-02', seasonalContext: 'winter' }
  });

  await matcher.addEntry(baseKey, testData);

  const result = await matcher.findMatches(nearKey, {
    matchingStrategy: 'temporal',
    timeTolerance: 24 // 24 hours
  });

  expect(result.matches[0].confidence).toBeGreaterThan(0.9);
});
```

#### UT-302-04: 変動係数類似性マッチング
```typescript
it('should match similar variation coefficients', async () => {
  const baseKey = createEnhancedKey({
    variation: { coordinateCoeff: 0.5, seasonalCoeff: 0.3, combinedEffect: 0.4 }
  });

  const similarKey = createEnhancedKey({
    variation: { coordinateCoeff: 0.52, seasonalCoeff: 0.31, combinedEffect: 0.41 }
  });

  await matcher.addEntry(baseKey, testData);

  const result = await matcher.findMatches(similarKey, {
    matchingStrategy: 'variation',
    variationTolerance: 0.05
  });

  expect(result.matches[0].confidence).toBeGreaterThan(0.85);
});
```

#### UT-302-05: 複合マッチング戦略
```typescript
it('should combine multiple matching strategies', async () => {
  const result = await matcher.findMatches(searchKey, {
    matchingStrategy: 'combined',
    weights: {
      exact: 1.0,
      proximity: 0.8,
      temporal: 0.6,
      variation: 0.7
    }
  });

  expect(result.matches).toBeInstanceOf(Array);
  expect(result.matches[0].confidence).toBeGreaterThan(0.5);
  expect(result.strategy).toBe('combined');
});
```

#### UT-302-06: マッチング信頼度計算
```typescript
it('should calculate confidence scores accurately', () => {
  const confidence = matcher.calculateConfidence({
    geoDistance: 1.5, // km
    timeDistance: 12, // hours
    variationDistance: 0.03
  });

  expect(confidence).toBeGreaterThan(0.7);
  expect(confidence).toBeLessThanOrEqual(1.0);
});
```

#### UT-302-07: マッチング結果ソート
```typescript
it('should sort matches by confidence descending', async () => {
  // 複数のエントリを追加
  await Promise.all([
    matcher.addEntry(createKey1(), testData1),
    matcher.addEntry(createKey2(), testData2),
    matcher.addEntry(createKey3(), testData3)
  ]);

  const result = await matcher.findMatches(searchKey, {
    matchingStrategy: 'combined',
    maxResults: 3
  });

  expect(result.matches).toHaveLength(3);
  expect(result.matches[0].confidence).toBeGreaterThanOrEqual(result.matches[1].confidence);
  expect(result.matches[1].confidence).toBeGreaterThanOrEqual(result.matches[2].confidence);
});
```

### 💾 UT-303: 階層メモリ管理機能 (7テスト)

#### UT-303-01: Hot/Warm/Cold階層振り分け
```typescript
describe('Tiered Memory Management', () => {
  it('should distribute entries across tiers correctly', async () => {
    const manager = new TieredMemoryManager({
      hotSize: 10,
      warmSize: 20,
      coldEnabled: true
    });

    // 頻繁アクセスエントリ
    for (let i = 0; i < 15; i++) {
      await manager.set(createKey(i), testData);
      for (let j = 0; j < 5; j++) {
        await manager.get(createKey(i)); // 5回アクセス
      }
    }

    const distribution = manager.getTierDistribution();
    expect(distribution.hot).toBe(10);
    expect(distribution.warm).toBe(5);
    expect(distribution.cold).toBe(0);
  });
});
```

#### UT-303-02: アクセス頻度ベース昇格
```typescript
it('should promote frequently accessed items', async () => {
  const key = createTestKey();
  await manager.set(key, testData); // Warm層に配置

  // 頻繁アクセス
  for (let i = 0; i < 10; i++) {
    await manager.get(key);
  }

  const tierInfo = manager.getTierInfo(key);
  expect(tierInfo.currentTier).toBe('hot');
  expect(tierInfo.promotionCount).toBe(1);
});
```

#### UT-303-03: TTL階層別管理
```typescript
it('should apply different TTL per tier', async () => {
  const hotKey = createKey('hot');
  const warmKey = createKey('warm');
  const coldKey = createKey('cold');

  await manager.setWithTier(hotKey, testData, 'hot');
  await manager.setWithTier(warmKey, testData, 'warm');
  await manager.setWithTier(coldKey, testData, 'cold');

  const hotTTL = manager.getTTL(hotKey);
  const warmTTL = manager.getTTL(warmKey);
  const coldTTL = manager.getTTL(coldKey);

  expect(hotTTL).toBeLessThan(warmTTL);
  expect(warmTTL).toBeLessThan(coldTTL);
});
```

#### UT-303-04: メモリ圧迫時の降格処理
```typescript
it('should demote items under memory pressure', async () => {
  const manager = new TieredMemoryManager({ hotSize: 5 });

  // Hot層を満杯にする
  for (let i = 0; i < 5; i++) {
    await manager.set(createKey(i), testData);
  }

  // 新しいエントリ追加（最も古いものが降格されるべき）
  await manager.set(createKey(6), testData);

  const distribution = manager.getTierDistribution();
  expect(distribution.hot).toBe(5);
  expect(distribution.warm).toBe(1);
});
```

#### UT-303-05: Cold Storage IndexedDB連携
```typescript
it('should persist cold data to IndexedDB', async () => {
  const coldKey = createKey('cold-data');
  await manager.setWithTier(coldKey, testData, 'cold');

  // メモリから削除
  manager.clearMemoryCache();

  // IndexedDBから復元されることを確認
  const result = await manager.get(coldKey);
  expect(result).toEqual(testData);
});
```

#### UT-303-06: メモリ使用量最適化
```typescript
it('should optimize memory usage effectively', async () => {
  const initialMemory = manager.getMemoryUsage();

  // 100エントリ追加
  for (let i = 0; i < 100; i++) {
    await manager.set(createKey(i), testData);
  }

  const finalMemory = manager.getMemoryUsage();
  const memoryEfficiency = manager.getCompressionRatio();

  expect(memoryEfficiency).toBeGreaterThan(0.5); // 50%以上の効率
  expect(finalMemory).toBeLessThan(50 * 1024 * 1024); // 50MB未満
});
```

#### UT-303-07: データ整合性保証
```typescript
it('should maintain data integrity across tiers', async () => {
  const key = createTestKey();
  const originalData = createComplexTestData();

  await manager.set(key, originalData);

  // 各階層を通じてデータ取得
  const hotResult = await manager.get(key);
  manager.demoteToWarm(key);
  const warmResult = await manager.get(key);
  manager.demoteToCold(key);
  const coldResult = await manager.get(key);

  expect(hotResult).toEqual(originalData);
  expect(warmResult).toEqual(originalData);
  expect(coldResult).toEqual(originalData);
});
```

### 🗜️ UT-304: データ圧縮・重複除去機能 (6テスト)

#### UT-304-01: LZ4圧縮アルゴリズム
```typescript
describe('Data Compression & Deduplication', () => {
  it('should compress data using LZ4 algorithm', async () => {
    const compressor = new DataCompressor({ algorithm: 'lz4', level: 5 });
    const largeData = createLargeTestData(10000); // 10KB

    const compressed = await compressor.compress(largeData);
    const decompressed = await compressor.decompress(compressed);

    expect(compressed.length).toBeLessThan(largeData.length);
    expect(decompressed).toEqual(largeData);
    expect(compressor.getCompressionRatio()).toBeGreaterThan(0.3);
  });
});
```

#### UT-304-02: 圧縮閾値制御
```typescript
it('should apply compression only above threshold', async () => {
  const compressor = new DataCompressor({ threshold: 1000 }); // 1KB

  const smallData = createTestData(500); // 500B
  const largeData = createTestData(2000); // 2KB

  const smallResult = await compressor.process(smallData);
  const largeResult = await compressor.process(largeData);

  expect(smallResult.compressed).toBe(false);
  expect(largeResult.compressed).toBe(true);
});
```

#### UT-304-03: 重複データ検出
```typescript
it('should detect duplicate data efficiently', async () => {
  const deduplicator = new DataDeduplicator();
  const data1 = createTestData();
  const data2 = { ...data1 }; // 同一データ

  const hash1 = await deduplicator.addData('key1', data1);
  const hash2 = await deduplicator.addData('key2', data2);

  expect(hash1).toBe(hash2);
  expect(deduplicator.getDuplicateCount()).toBe(1);
  expect(deduplicator.getStorageEfficiency()).toBeGreaterThan(0.9);
});
```

#### UT-304-04: 参照ベース重複除去
```typescript
it('should use reference-based deduplication', async () => {
  const deduplicator = new DataDeduplicator({ useReferences: true });

  // 同じデータを複数キーで保存
  const sharedData = createSharedTestData();
  await deduplicator.addData('key1', sharedData);
  await deduplicator.addData('key2', sharedData);
  await deduplicator.addData('key3', sharedData);

  const stats = deduplicator.getStats();
  expect(stats.uniqueDataBlocks).toBe(1);
  expect(stats.referenceCount).toBe(3);
  expect(stats.memoryReduction).toBeGreaterThan(0.66);
});
```

#### UT-304-05: 類似度ベース最適化
```typescript
it('should optimize based on data similarity', async () => {
  const optimizer = new SimilarityOptimizer({ threshold: 0.8 });

  const baseData = createBaseTestData();
  const similarData1 = createSimilarData(baseData, 0.1); // 10% difference
  const similarData2 = createSimilarData(baseData, 0.05); // 5% difference

  await optimizer.addData('base', baseData);
  await optimizer.addData('similar1', similarData1);
  await optimizer.addData('similar2', similarData2);

  const optimization = optimizer.getOptimization();
  expect(optimization.clustersCreated).toBeGreaterThan(0);
  expect(optimization.storageReduction).toBeGreaterThan(0.2);
});
```

#### UT-304-06: 圧縮性能ベンチマーク
```typescript
it('should maintain compression performance requirements', async () => {
  const compressor = new DataCompressor({ algorithm: 'adaptive' });
  const testData = createLargeTestData(100000); // 100KB

  const startTime = performance.now();
  const compressed = await compressor.compress(testData);
  const compressionTime = performance.now() - startTime;

  const decompressStart = performance.now();
  const decompressed = await compressor.decompress(compressed);
  const decompressionTime = performance.now() - decompressStart;

  expect(compressionTime).toBeLessThan(50); // 50ms以内
  expect(decompressionTime).toBeLessThan(20); // 20ms以内
  expect(decompressed).toEqual(testData);
});
```

## 統合テスト設計 (20% - 8テスト)

### 🔗 IT-301: 既存システム統合テスト (4テスト)

#### IT-301-01: TideCalculationService完全統合
```typescript
describe('Integration with TideCalculationService', () => {
  it('should integrate seamlessly with existing tide service', async () => {
    const tideService = new TideCalculationService();
    const enhancedCache = new EnhancedTideLRUCache();

    // 実際の潮汐計算リクエスト
    const request = {
      latitude: 35.6762,
      longitude: 139.6503,
      date: '2024-01-01',
      coordinateCoeff: 0.5,
      seasonalCoeff: 0.3
    };

    const result1 = await tideService.calculateWithCache(request);
    const result2 = await tideService.calculateWithCache(request);

    expect(result1).toEqual(result2);
    expect(enhancedCache.getStats().hitCount).toBe(1);
  });
});
```

#### IT-301-02: TASK-102分析システム連携
```typescript
it('should work with TASK-102 analysis functions', async () => {
  const analyzer = new GraphPatternAnalyzer();
  const cache = new EnhancedTideLRUCache();

  const analysisInput = {
    fishingRecords: createTestFishingRecords(10),
    analysisOptions: {
      includeCoordinateVariation: true,
      includeSeasonalVariation: true
    }
  };

  // 初回分析（キャッシュミス）
  const result1 = await analyzer.analyzePatterns(analysisInput);

  // 2回目分析（キャッシュヒット期待）
  const result2 = await analyzer.analyzePatterns(analysisInput);

  expect(result1.patterns).toEqual(result2.patterns);
  expect(cache.getStats().hitRate).toBeGreaterThan(0.4);
});
```

#### IT-301-03: データ移行互換性
```typescript
it('should migrate existing cache data without loss', async () => {
  const legacyCache = new TideLRUCache();
  const enhancedCache = new EnhancedTideLRUCache();

  // レガシーデータ追加
  const legacyKey = { latitude: 35.67, longitude: 139.65, date: '2024-01-01' };
  await legacyCache.set(legacyKey, testTideData);

  // マイグレーション実行
  await enhancedCache.migrateFromLegacy(legacyCache);

  // データ取得可能確認
  const enhancedKey = enhancedCache.convertLegacyKey(legacyKey);
  const migratedData = await enhancedCache.get(enhancedKey);

  expect(migratedData).toEqual(testTideData);
  expect(enhancedCache.size()).toBe(1);
});
```

#### IT-301-04: 並行アクセス性能
```typescript
it('should handle concurrent access efficiently', async () => {
  const cache = new EnhancedTideLRUCache();
  const concurrentRequests = 50;

  // 並行リクエスト実行
  const promises = Array.from({ length: concurrentRequests }, (_, i) =>
    cache.set(createKey(i), createTestData(i))
  );

  const startTime = performance.now();
  await Promise.all(promises);
  const endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(200); // 200ms以内
  expect(cache.size()).toBe(concurrentRequests);
});
```

### 📈 IT-302: パフォーマンス統合テスト (4テスト)

#### IT-302-01: キャッシュヒット率50%達成
```typescript
describe('Performance Integration Tests', () => {
  it('should achieve 50%+ cache hit rate in realistic scenario', async () => {
    const cache = new EnhancedTideLRUCache();
    const testScenario = createRealisticUsageScenario(1000);

    // 1000回のリクエストシミュレーション
    for (const request of testScenario.requests) {
      await cache.processRequest(request);
    }

    const stats = cache.getStats();
    expect(stats.hitRate).toBeGreaterThanOrEqual(0.5);
    expect(stats.totalRequests).toBe(1000);
  });
});
```

#### IT-302-02: メモリ効率50%改善
```typescript
it('should achieve 50% memory efficiency improvement', async () => {
  const legacyCache = new TideLRUCache(100);
  const enhancedCache = new EnhancedTideLRUCache({ maxSize: 100 });

  const testData = createVariedTestData(100);

  // 両方のキャッシュにデータ追加
  for (const data of testData) {
    await legacyCache.set(data.legacyKey, data.tideInfo);
    await enhancedCache.set(data.enhancedKey, data.tideInfo);
  }

  const legacyMemory = legacyCache.getStats().memoryUsage;
  const enhancedMemory = enhancedCache.getStats().memoryUsage;

  expect(enhancedMemory).toBeLessThan(legacyMemory * 0.5);
  expect(enhancedCache.size()).toBeGreaterThanOrEqual(legacyCache.size());
});
```

#### IT-302-03: 処理速度維持
```typescript
it('should maintain processing speed despite complexity', async () => {
  const cache = new EnhancedTideLRUCache();
  const complexRequests = createComplexRequests(100);

  const measurements = [];
  for (const request of complexRequests) {
    const start = performance.now();
    await cache.processRequest(request);
    measurements.push(performance.now() - start);
  }

  const averageTime = measurements.reduce((a, b) => a + b) / measurements.length;
  const maxTime = Math.max(...measurements);

  expect(averageTime).toBeLessThan(8); // 平均8ms以内
  expect(maxTime).toBeLessThan(20); // 最大20ms以内
});
```

#### IT-302-04: 大容量データ処理
```typescript
it('should handle large dataset processing', async () => {
  const cache = new EnhancedTideLRUCache({ maxSize: 1000 });
  const largeDataset = createLargeDataset(500); // 500エントリ

  const startTime = performance.now();

  // データ追加
  for (const entry of largeDataset) {
    await cache.set(entry.key, entry.data);
  }

  // ランダムアクセステスト
  for (let i = 0; i < 200; i++) {
    const randomEntry = largeDataset[Math.floor(Math.random() * largeDataset.length)];
    await cache.get(randomEntry.key);
  }

  const totalTime = performance.now() - startTime;
  const stats = cache.getStats();

  expect(totalTime).toBeLessThan(1000); // 1秒以内
  expect(stats.hitRate).toBeGreaterThan(0.4);
  expect(stats.memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB以内
});
```

## E2Eテスト設計 (10% - 4テスト)

### 👤 E2E-301: ユーザーシナリオテスト (4テスト)

#### E2E-301-01: 釣り記録作成から分析まで完全フロー
```typescript
describe('End-to-End User Scenarios', () => {
  it('should handle complete fishing record to analysis workflow', async () => {
    const system = new IntegratedFishingSystem();

    // 1. 釣り記録作成
    const fishingRecord = await system.createFishingRecord({
      location: { latitude: 35.6762, longitude: 139.6503 },
      date: '2024-01-01',
      catches: [createTestCatch()],
      conditions: createTestConditions()
    });

    // 2. 潮汐データ取得（キャッシュ使用）
    const tideData = await system.getTideData(fishingRecord.location, fishingRecord.date);

    // 3. グラフパターン分析
    const analysis = await system.analyzePattern([fishingRecord]);

    // 4. キャッシュ効果検証
    const cacheStats = system.getCacheStats();

    expect(fishingRecord).toBeDefined();
    expect(tideData).toBeDefined();
    expect(analysis.patterns).toHaveLength(1);
    expect(cacheStats.hitRate).toBeGreaterThan(0); // 何らかのヒット発生
  });
});
```

#### E2E-301-02: 複数地点データ収集シナリオ
```typescript
it('should efficiently handle multi-location data collection', async () => {
  const system = new IntegratedFishingSystem();
  const locations = [
    { latitude: 35.6762, longitude: 139.6503, name: '東京湾' },
    { latitude: 34.6937, longitude: 135.5023, name: '大阪湾' },
    { latitude: 33.5904, longitude: 130.4017, name: '博多湾' }
  ];

  const startTime = performance.now();

  // 各地点でデータ収集
  const results = [];
  for (const location of locations) {
    const tideData = await system.getTideData(location, '2024-01-01');
    const analysis = await system.analyzeTidePattern(location, tideData);
    results.push({ location, tideData, analysis });
  }

  const endTime = performance.now();
  const cacheStats = system.getCacheStats();

  expect(results).toHaveLength(3);
  expect(endTime - startTime).toBeLessThan(500); // 500ms以内
  expect(cacheStats.hitRate).toBeGreaterThan(0.2); // 地理的類似性によるヒット期待
});
```

#### E2E-301-03: 長期間データ分析シナリオ
```typescript
it('should handle long-term data analysis efficiently', async () => {
  const system = new IntegratedFishingSystem();
  const dateRange = generateDateRange('2024-01-01', '2024-12-31'); // 1年間

  const analysisStart = performance.now();

  // 月次データ分析
  const monthlyResults = [];
  for (const date of dateRange.monthlyDates) {
    const tideData = await system.getTideData(testLocation, date);
    const seasonalAnalysis = await system.analyzeSeasonalPattern(date, tideData);
    monthlyResults.push({ date, analysis: seasonalAnalysis });
  }

  const analysisTime = performance.now() - analysisStart;
  const cacheStats = system.getCacheStats();

  expect(monthlyResults).toHaveLength(12);
  expect(analysisTime).toBeLessThan(2000); // 2秒以内
  expect(cacheStats.hitRate).toBeGreaterThan(0.4); // 季節的類似性によるヒット期待
});
```

#### E2E-301-04: システム復旧・永続化テスト
```typescript
it('should maintain data persistence across system restarts', async () => {
  const system1 = new IntegratedFishingSystem();

  // データ作成・分析
  const records = createTestFishingRecords(20);
  const analysisResults = [];

  for (const record of records) {
    const analysis = await system1.analyzeRecord(record);
    analysisResults.push(analysis);
  }

  const stats1 = system1.getCacheStats();

  // システム再起動シミュレーション
  await system1.shutdown();
  const system2 = new IntegratedFishingSystem();
  await system2.initialize();

  // 同じデータで分析（IndexedDBからの復元期待）
  const restoredResults = [];
  for (const record of records) {
    const analysis = await system2.analyzeRecord(record);
    restoredResults.push(analysis);
  }

  const stats2 = system2.getCacheStats();

  expect(restoredResults).toEqual(analysisResults);
  expect(stats2.hitCount).toBeGreaterThan(0); // 復元データからのヒット
});
```

## パフォーマンステスト詳細

### ⚡ 性能要求事項

| 項目 | 目標値 | 測定方法 | 許容誤差 |
|------|--------|----------|----------|
| キャッシュヒット率 | 50%以上 | 1000リクエストでの統計 | ±5% |
| メモリ使用量 | <50MB | 100エントリ保存時 | ±10MB |
| キー生成時間 | <3ms | 1000回実行の平均 | ±1ms |
| データ取得時間 | <8ms | ヒット時の測定 | ±2ms |
| 圧縮効率 | >50% | 10KB以上データ | ±10% |

### 📊 ベンチマークシナリオ

1. **通常使用パターン**: 100エントリ、80/20の読み書き比率
2. **集中アクセス**: 10エントリに対する1000アクセス
3. **分散アクセス**: 500エントリへのランダムアクセス
4. **メモリ圧迫**: 最大容量超過での動作
5. **並行処理**: 50並行リクエスト処理

## テスト実行戦略

### 🚀 実行フェーズ

1. **Phase 1**: 単体テスト実行 (28テスト) - 目標: 1秒以内
2. **Phase 2**: 統合テスト実行 (8テスト) - 目標: 5秒以内
3. **Phase 3**: E2Eテスト実行 (4テスト) - 目標: 10秒以内
4. **Phase 4**: パフォーマンステスト - 目標: 30秒以内

### 📋 成功基準

- **テスト成功率**: 100% (40/40テスト)
- **コードカバレッジ**: 95%以上
- **性能要件**: 全項目クリア
- **メモリリーク**: 検出なし
- **エラー処理**: 全ケース適切処理

## まとめ

TASK-201のテストケース設計では、**40の包括的テスト**により以下を保証します：

### 🎯 品質保証
- **機能完全性**: 全FR要件のテスト網羅
- **性能要件**: 50%ヒット率・50%メモリ削減の確実な達成
- **信頼性**: エラーハンドリング・データ整合性の完全保証
- **拡張性**: 既存システムとの完全互換性維持

### 📈 TDD成功への基盤
このテスト設計により、Step 3/6から始まる実装フェーズで：
- **RED**: 意図的なテスト失敗による要件明確化
- **GREEN**: 最小限実装でのテスト通過
- **REFACTOR**: 品質向上での最適化

---

**次段階**: Step 3/6 - 最小実装 (RED Phase)
**期限**: 2024-09-26 (本日完了予定)