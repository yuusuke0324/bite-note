# TASK-101: 天体計算エンジン - テストケース

## テスト戦略

### テストピラミッド
1. **単体テスト**: 各計算関数の個別テスト（70%）
2. **統合テスト**: 計算エンジン全体の動作テスト（20%）
3. **パフォーマンステスト**: 速度・メモリ使用量テスト（10%）

### テストデータソース
- **天文年鑑2024**: 新月・満月・至点分点の公式データ
- **NASA JPL**: 高精度天体位置データ
- **既知のエッジケース**: 境界値・異常値

## 月齢計算テストケース

### MoonPhaseCalculator.calculateMoonAge()

#### 正常ケース
```typescript
// TC-M001: 基準新月（J2000.0）
input: new Date('2000-01-06T18:14:00Z')
expected: 0.0 (±0.1)

// TC-M002: 2024年新月日（天文年鑑基準）
input: new Date('2024-01-11T11:57:00Z')  // 2024年1月新月
expected: 0.0 (±0.1)

input: new Date('2024-02-09T23:59:00Z')  // 2024年2月新月
expected: 0.0 (±0.1)

// TC-M003: 2024年満月日
input: new Date('2024-01-25T17:54:00Z')  // 2024年1月満月
expected: 14.77 (±0.1)

input: new Date('2024-02-24T12:30:00Z')  // 2024年2月満月
expected: 14.77 (±0.1)

// TC-M004: 朔望月周期テスト
input: new Date('2024-01-11T11:57:00Z')  // 新月
after: 29.53日後
expected: ほぼ同じ月齢（±0.2）
```

#### エッジケース
```typescript
// TC-M005: 最小日付
input: new Date('1900-01-01T00:00:00Z')
expected: 数値（エラーなし）

// TC-M006: 最大日付
input: new Date('2100-12-31T23:59:59Z')
expected: 数値（エラーなし）

// TC-M007: うるう年境界
input: new Date('2024-02-29T12:00:00Z')
expected: 有効な月齢値

// TC-M008: 時刻境界（UTC midnight）
input: new Date('2024-06-15T00:00:00Z')
expected: 連続性のある月齢値
```

### MoonPhaseCalculator.calculateMoonPhase()

#### 月相判定テスト
```typescript
// TC-MP001: 新月期
input: new Date('2024-01-11T11:57:00Z')
expected: { phase: 'new', age: ~0, illumination: ~0 }

// TC-MP002: 満月期
input: new Date('2024-01-25T17:54:00Z')
expected: { phase: 'full', age: ~14.77, illumination: ~1 }

// TC-MP003: 上弦
input: new Date('2024-01-18T03:53:00Z')
expected: { phase: 'first_quarter', age: ~7.4, illumination: ~0.5 }

// TC-MP004: 下弦
input: new Date('2024-02-02T23:18:00Z')
expected: { phase: 'last_quarter', age: ~22.1, illumination: ~0.5 }
```

## 太陽位置計算テストケース

### SolarCalculator.calculateSolarPosition()

#### 季節変化テスト
```typescript
// TC-S001: 春分点（太陽経度0度）
input: new Date('2024-03-20T03:06:00Z')  // 2024年春分
expected: { longitude: 0.0 (±1), latitude: 0.0 (±0.1) }

// TC-S002: 夏至点（太陽経度90度）
input: new Date('2024-06-20T20:51:00Z')  // 2024年夏至
expected: { longitude: 90.0 (±1), latitude: 0.0 (±0.1) }

// TC-S003: 秋分点（太陽経度180度）
input: new Date('2024-09-22T12:44:00Z')  // 2024年秋分
expected: { longitude: 180.0 (±1), latitude: 0.0 (±0.1) }

// TC-S004: 冬至点（太陽経度270度）
input: new Date('2024-12-21T09:21:00Z')  // 2024年冬至
expected: { longitude: 270.0 (±1), latitude: 0.0 (±0.1) }
```

#### 年間変化の連続性テスト
```typescript
// TC-S005: 太陽経度の単調増加
input: 2024年1月1日から12月31日まで daily
expected: 太陽経度が滑らかに0→360度変化（逆行なし）

// TC-S006: 軌道離心率の反映
input: 近日点付近（1月初旬）vs 遠日点付近（7月初旬）
expected: 近日点で太陽経度変化が速い
```

## 月位置計算テストケース

### LunarCalculator.calculateLunarPosition()

#### 主要位相での位置テスト
```typescript
// TC-L001: 新月時の月経度（太陽との合）
input: new Date('2024-01-11T11:57:00Z')  // 新月
expected: 月経度 ≈ 太陽経度 (±5度)

// TC-L002: 満月時の月経度（太陽との衝）
input: new Date('2024-01-25T17:54:00Z')  // 満月
expected: 月経度 ≈ 太陽経度 + 180度 (±5度)

// TC-L003: 月地心距離の範囲
input: 任意の日付
expected: 35万km ≤ 距離 ≤ 41万km
```

#### 月軌道の楕円性テスト
```typescript
// TC-L004: 近地点での最短距離
input: 近地点通過日
expected: 距離 ≈ 35.6万km (±1万km)

// TC-L005: 遠地点での最長距離
input: 遠地点通過日
expected: 距離 ≈ 40.6万km (±1万km)
```

## 統合テストケース

### CelestialCalculator.calculateAll()

#### 一括計算の整合性
```typescript
// TC-I001: 新月時の太陽月位置関係
input: new Date('2024-01-11T11:57:00Z')
expected: {
  moonPhase: { phase: 'new', age: ~0 },
  positions: {
    sun: { longitude: any },
    moon: { longitude: 太陽経度 ± 5度 }
  }
}

// TC-I002: 満月時の太陽月位置関係
input: new Date('2024-01-25T17:54:00Z')
expected: {
  moonPhase: { phase: 'full', age: ~14.77 },
  positions: {
    sun: { longitude: any },
    moon: { longitude: 太陽経度 + 180度 ± 5度 }
  }
}
```

## パフォーマンステストケース

### 計算速度テスト
```typescript
// TC-P001: 単一計算の速度
task: 1回の calculateAll() 実行
expected: 50ms以内

// TC-P002: 大量計算の速度
task: 365回の calculateAll() 実行（1年分）
expected: 5秒以内

// TC-P003: 連続計算でのパフォーマンス劣化
task: 1000回の連続計算
expected: 最初と最後の計算時間差が±10%以内
```

### メモリ使用量テスト
```typescript
// TC-P004: メモリリーク検出
task: 10000回の計算実行
expected: メモリ使用量が一定範囲内（GC考慮）

// TC-P005: 最大メモリ使用量
task: calculateAll() 1回実行
expected: 追加メモリ使用量 < 1MB
```

## エラーハンドリングテストケース

### 不正入力テスト
```typescript
// TC-E001: null/undefined入力
input: null, undefined
expected: TideError with INVALID_INPUT

// TC-E002: 無効な日付
input: new Date('invalid')
expected: TideError with INVALID_DATE

// TC-E003: 範囲外日付
input: new Date('1800-01-01'), new Date('2200-01-01')
expected: 警告付きで計算実行 or TideError
```

### 計算エラーテスト
```typescript
// TC-E004: 数値オーバーフロー対応
setup: Math関数の異常値模擬
expected: グレースフルフォールバック

// TC-E005: 無限ループ防止
setup: 収束しない計算の模擬
expected: 一定回数後にタイムアウト
```

## 境界値テストケース

### 時刻境界
```typescript
// TC-B001: UTC日付境界
input: new Date('2024-06-15T23:59:59Z') vs new Date('2024-06-16T00:00:01Z')
expected: 計算結果の連続性

// TC-B002: うるう秒（存在する場合）
input: うるう秒挿入日時
expected: 正常な計算実行

// TC-B003: DST切り替え日時
input: サマータイム切り替え日
expected: UTC基準で正常計算
```

### 天文現象境界
```typescript
// TC-B004: 月相境界（新月→三日月）
input: 月齢0.1, 0.9, 1.1
expected: 適切な月相判定

// TC-B005: 角度境界（359.9度→0.1度）
setup: 角度正規化の境界値
expected: 正しい0-360度範囲
```

## 回帰テストケース

### 既知の不具合防止
```typescript
// TC-R001: 2024年2月29日対応
input: new Date('2024-02-29T12:00:00Z')
expected: エラーなく有効な計算結果

// TC-R002: ミリ秒精度の考慮
input: 同一秒内の異なるミリ秒
expected: 精度に応じた適切な結果差
```

## テスト実行戦略

### 自動化レベル
- **CI/CD**: 全正常ケース + 主要エッジケース
- **夜間回帰**: 全テストケース
- **リリース前**: 天文年鑑データとの検証

### カバレッジ目標
- **ライン**: 95%以上
- **ブランチ**: 90%以上
- **関数**: 100%

### テストデータ管理
- **静的データ**: 天文年鑑の公式値
- **動的生成**: エッジケースの自動生成
- **更新頻度**: 年次（新年鑑発行時）