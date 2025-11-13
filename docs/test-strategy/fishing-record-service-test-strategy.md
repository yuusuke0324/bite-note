# fishing-record-service.ts テスト戦略書

## 📊 概要

**サービス**: `src/lib/fishing-record-service.ts` (453行)
**現状カバレッジ**: 55.84%
**目標カバレッジ**: 80%以上
**戦略策定日**: 2025-11-13

---

## 1. IndexedDBモック実装方針

### 1.1 基本アプローチ

既存のテストファイルを分析した結果、**vi.mock()によるDexie dbオブジェクトの完全モック化**が最適です。

```typescript
// src/lib/__tests__/fishing-record-service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FishingRecordService } from '../lib/fishing-record-service';
import type { CreateFishingRecordForm, UpdateFishingRecordForm } from '../types';

// Dexieのモック（既存実装を参考）
vi.mock('../lib/database', () => ({
  db: {
    fishing_records: {
      add: vi.fn(),
      get: vi.fn(),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => ({ toArray: vi.fn() })),
            toArray: vi.fn()
          })),
          offset: vi.fn(() => ({
            limit: vi.fn(() => ({ toArray: vi.fn() })),
            toArray: vi.fn()
          })),
          toArray: vi.fn()
        })),
        limit: vi.fn(() => ({
          offset: vi.fn(() => ({ toArray: vi.fn() })),
          toArray: vi.fn()
        })),
        offset: vi.fn(() => ({
          limit: vi.fn(() => ({ toArray: vi.fn() })),
          toArray: vi.fn()
        })),
        toArray: vi.fn(),
        where: vi.fn(() => ({
          between: vi.fn(() => ({
            filter: vi.fn(() => ({ toArray: vi.fn() })),
            toArray: vi.fn()
          })),
          anyOf: vi.fn(() => ({
            filter: vi.fn(() => ({ toArray: vi.fn() })),
            toArray: vi.fn()
          })),
          filter: vi.fn(() => ({ toArray: vi.fn() })),
          toArray: vi.fn()
        }))
      })),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      toArray: vi.fn()
    },
    updateMetadata: vi.fn()
  }
}));
```

### 1.2 モック設計の理由

#### 選択肢の比較

| アプローチ | メリット | デメリット | 採用判断 |
|------------|----------|------------|----------|
| **fake-indexeddb** | 実際のDBに近い動作 | セットアップが複雑、テスト速度が遅い | ❌ 不採用 |
| **vi.mock()による完全モック** | 高速、柔軟、既存パターンと一貫性 | 実際のDB動作と乖離可能 | ✅ 採用 |
| **Dexie.jsのメモリDB** | Dexieの機能を完全テスト | セットアップが中程度複雑 | △ 統合テストで検討 |

#### 採用理由

1. **既存テストとの一貫性**: photo-service.test.ts等が同じパターンを使用
2. **高速性**: 単体テストに最適（fake-indexeddbより5-10倍高速）
3. **柔軟性**: エラーシナリオのテストが容易
4. **保守性**: モックの動作が明示的で理解しやすい

### 1.3 トランザクション処理のテスト方針

fishing-record-service.tsは明示的なトランザクション処理を使用していないため、以下の方針で対応：

1. **CRUD操作の原子性**: 各メソッドが独立して成功/失敗することを確認
2. **メタデータ更新の整合性**: `updateTotalRecordsCount()`が適切に呼ばれることを検証
3. **エラー時のロールバック**: Dexie側で自動的に行われるため、エラーハンドリングのみテスト

```typescript
// 例: メタデータ更新の失敗を許容（console.warnのみ）
it('メタデータ更新失敗時も記録作成は成功する', async () => {
  const mockDb = await import('../lib/database');
  vi.mocked(mockDb.db.fishing_records.add).mockResolvedValue('test-id');
  vi.mocked(mockDb.db.updateMetadata).mockRejectedValue(new Error('Metadata update failed'));

  // console.warnをモック
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  const result = await service.createRecord(validFormData);

  expect(result.success).toBe(true);
  expect(warnSpy).toHaveBeenCalledWith('Failed to update total records count:', expect.any(Error));

  warnSpy.mockRestore();
});
```

---

## 2. 包括的テストケース設計

### 2.1 createRecord()

#### 正常系（10ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| CR-001 | 必須フィールドのみで作成成功 | ⭐⭐⭐ | 🔴 最優先 |
| CR-002 | 全フィールド指定で作成成功 | ⭐⭐⭐ | 🔴 最優先 |
| CR-003 | photoId付きで作成成功 | ⭐⭐ | 🟡 高 |
| CR-004 | coordinates付きで作成成功 | ⭐⭐ | 🟡 高 |
| CR-005 | notes付きで作成成功 | ⭐ | 🟢 中 |
| CR-006 | size=0で作成成功（境界値） | ⭐⭐ | 🟡 高 |
| CR-007 | size=999で作成成功（境界値） | ⭐⭐ | 🟡 高 |
| CR-008 | weight=0で作成成功（境界値） | ⭐⭐ | 🟡 高 |
| CR-009 | weight=99999で作成成功（境界値） | ⭐⭐ | 🟡 高 |
| CR-010 | UUIDが一意に生成されることを確認 | ⭐ | 🟢 中 |

#### 異常系（12ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| CR-E001 | date未指定でVALIDATION_ERROR | ⭐⭐⭐ | 🔴 最優先 |
| CR-E002 | location空文字でVALIDATION_ERROR | ⭐⭐⭐ | 🔴 最優先 |
| CR-E003 | location空白のみでVALIDATION_ERROR | ⭐⭐⭐ | 🔴 最優先 |
| CR-E004 | fishSpecies空文字でVALIDATION_ERROR | ⭐⭐⭐ | 🔴 最優先 |
| CR-E005 | fishSpecies空白のみでVALIDATION_ERROR | ⭐⭐⭐ | 🔴 最優先 |
| CR-E006 | size=-1でVALIDATION_ERROR | ⭐⭐ | 🟡 高 |
| CR-E007 | size=1000でVALIDATION_ERROR | ⭐⭐ | 🟡 高 |
| CR-E008 | weight=-1でVALIDATION_ERROR | ⭐⭐ | 🟡 高 |
| CR-E009 | weight=100000でVALIDATION_ERROR | ⭐⭐ | 🟡 高 |
| CR-E010 | DB追加失敗時CREATE_FAILEDエラー | ⭐⭐⭐ | 🔴 最優先 |
| CR-E011 | updateMetadata失敗時もcreateは成功 | ⭐ | 🟢 中 |
| CR-E012 | 無効なdate形式でエラー | ⭐ | 🟢 中 |

#### エッジケース（5ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| CR-EC001 | size=undefined（省略） | ⭐⭐ | 🟡 高 |
| CR-EC002 | weight=undefined（省略） | ⭐⭐ | 🟡 高 |
| CR-EC003 | notes=undefined（省略） | ⭐ | 🟢 中 |
| CR-EC004 | photoId=undefined（省略） | ⭐ | 🟢 中 |
| CR-EC005 | coordinates=undefined（省略） | ⭐ | 🟢 中 |

### 2.2 getRecordById()

#### 正常系（2ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GR-001 | 存在するIDで記録取得成功 | ⭐⭐⭐ | 🔴 最優先 |
| GR-002 | 取得した記録の全フィールド検証 | ⭐⭐ | 🟡 高 |

#### 異常系（3ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GR-E001 | 存在しないIDでNOT_FOUNDエラー | ⭐⭐⭐ | 🔴 最優先 |
| GR-E002 | DB取得失敗時GET_FAILEDエラー | ⭐⭐ | 🟡 高 |
| GR-E003 | 空文字IDでNOT_FOUNDエラー | ⭐ | 🟢 中 |

#### エッジケース（2ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GR-EC001 | nullが返された場合の処理 | ⭐⭐ | 🟡 高 |
| GR-EC002 | undefinedが返された場合の処理 | ⭐⭐ | 🟡 高 |

### 2.3 getRecords()

#### 正常系（15ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GRL-001 | パラメータなしで全記録取得（dateの昇順） | ⭐⭐⭐ | 🔴 最優先 |
| GRL-002 | sortOrder='desc'で降順取得 | ⭐⭐⭐ | 🔴 最優先 |
| GRL-003 | limitのみ指定 | ⭐⭐⭐ | 🔴 最優先 |
| GRL-004 | offsetのみ指定 | ⭐⭐⭐ | 🔴 最優先 |
| GRL-005 | limit + offset指定（ページネーション） | ⭐⭐⭐ | 🔴 最優先 |
| GRL-006 | filter.dateRangeで日付範囲フィルタ | ⭐⭐⭐ | 🔴 最優先 |
| GRL-007 | filter.fishSpeciesで魚種フィルタ（単一） | ⭐⭐⭐ | 🔴 最優先 |
| GRL-008 | filter.fishSpeciesで魚種フィルタ（複数） | ⭐⭐⭐ | 🔴 最優先 |
| GRL-009 | filter.locationで場所部分一致フィルタ | ⭐⭐⭐ | 🔴 最優先 |
| GRL-010 | filter.sizeRangeでサイズ範囲フィルタ | ⭐⭐⭐ | 🔴 最優先 |
| GRL-011 | 複数フィルタ組み合わせ | ⭐⭐⭐ | 🔴 最優先 |
| GRL-012 | sortBy='location'指定 | ⭐⭐ | 🟡 高 |
| GRL-013 | sortBy='fishSpecies'指定 | ⭐⭐ | 🟡 高 |
| GRL-014 | sortBy='size'指定 | ⭐⭐ | 🟡 高 |
| GRL-015 | 空配列が返る場合（フィルタ該当なし） | ⭐⭐ | 🟡 高 |

#### 異常系（2ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GRL-E001 | DB取得失敗時GET_RECORDS_FAILEDエラー | ⭐⭐⭐ | 🔴 最優先 |
| GRL-E002 | 不正なsortByでDB例外 | ⭐ | 🟢 中 |

#### エッジケース（8ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GRL-EC001 | limit=0（全件スキップ） | ⭐⭐ | 🟡 高 |
| GRL-EC002 | offset > 総件数（空配列） | ⭐⭐ | 🟡 高 |
| GRL-EC003 | filter.fishSpecies=[]（空配列） | ⭐⭐ | 🟡 高 |
| GRL-EC004 | filter.location大文字小文字無視 | ⭐⭐ | 🟡 高 |
| GRL-EC005 | filter.sizeRange: size=undefinedの記録除外 | ⭐⭐⭐ | 🔴 最優先 |
| GRL-EC006 | filter.dateRange境界値一致 | ⭐⭐ | 🟡 高 |
| GRL-EC007 | 全記録がDBにない場合（空配列） | ⭐⭐ | 🟡 高 |
| GRL-EC008 | sortOrder未指定時のデフォルト動作 | ⭐ | 🟢 中 |

### 2.4 updateRecord()

#### 正常系（8ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| UR-001 | 単一フィールド（location）更新 | ⭐⭐⭐ | 🔴 最優先 |
| UR-002 | 複数フィールド同時更新 | ⭐⭐⭐ | 🔴 最優先 |
| UR-003 | 全フィールド更新 | ⭐⭐⭐ | 🔴 最優先 |
| UR-004 | date更新（文字列→Date変換） | ⭐⭐⭐ | 🔴 最優先 |
| UR-005 | updatedAtが更新されることを確認 | ⭐⭐⭐ | 🔴 最優先 |
| UR-006 | 更新前のフィールドが保持されることを確認 | ⭐⭐ | 🟡 高 |
| UR-007 | size境界値（0, 999）で更新 | ⭐⭐ | 🟡 高 |
| UR-008 | weight境界値（0, 99999）で更新 | ⭐⭐ | 🟡 高 |

#### 異常系（9ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| UR-E001 | 存在しないIDでNOT_FOUNDエラー | ⭐⭐⭐ | 🔴 最優先 |
| UR-E002 | location空文字でVALIDATION_ERROR | ⭐⭐⭐ | 🔴 最優先 |
| UR-E003 | location空白のみでVALIDATION_ERROR | ⭐⭐⭐ | 🔴 最優先 |
| UR-E004 | fishSpecies空文字でVALIDATION_ERROR | ⭐⭐⭐ | 🔴 最優先 |
| UR-E005 | fishSpecies空白のみでVALIDATION_ERROR | ⭐⭐⭐ | 🔴 最優先 |
| UR-E006 | size=-1でVALIDATION_ERROR | ⭐⭐ | 🟡 高 |
| UR-E007 | size=1000でVALIDATION_ERROR | ⭐⭐ | 🟡 高 |
| UR-E008 | weight=-1でVALIDATION_ERROR | ⭐⭐ | 🟡 高 |
| UR-E009 | weight=100000でVALIDATION_ERROR | ⭐⭐ | 🟡 高 |
| UR-E010 | DB更新失敗時UPDATE_FAILEDエラー | ⭐⭐⭐ | 🔴 最優先 |

#### エッジケース（4ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| UR-EC001 | date未指定時、既存dateを保持 | ⭐⭐ | 🟡 高 |
| UR-EC002 | size=undefined（削除） | ⭐⭐ | 🟡 高 |
| UR-EC003 | weight=undefined（削除） | ⭐⭐ | 🟡 高 |
| UR-EC004 | notes=undefined（削除） | ⭐ | 🟢 中 |

### 2.5 deleteRecord()

#### 正常系（3ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| DR-001 | 存在するIDで削除成功 | ⭐⭐⭐ | 🔴 最優先 |
| DR-002 | 削除後に総記録数が更新される | ⭐⭐⭐ | 🔴 最優先 |
| DR-003 | 削除後にgetRecordByIdでNOT_FOUND | ⭐⭐ | 🟡 高 |

#### 異常系（3ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| DR-E001 | 存在しないIDでNOT_FOUNDエラー | ⭐⭐⭐ | 🔴 最優先 |
| DR-E002 | DB削除失敗時DELETE_FAILEDエラー | ⭐⭐⭐ | 🔴 最優先 |
| DR-E003 | updateMetadata失敗時もdeleteは成功 | ⭐ | 🟢 中 |

#### エッジケース（2ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| DR-EC001 | 空文字IDでNOT_FOUNDエラー | ⭐ | 🟢 中 |
| DR-EC002 | 同じIDを2回削除（2回目はNOT_FOUND） | ⭐⭐ | 🟡 高 |

### 2.6 getRecordsSummary()

#### 正常系（5ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GRS-001 | デフォルトlimit=10で概要取得 | ⭐⭐⭐ | 🔴 最優先 |
| GRS-002 | カスタムlimit=5で概要取得 | ⭐⭐⭐ | 🔴 最優先 |
| GRS-003 | 日付降順で取得されることを確認 | ⭐⭐⭐ | 🔴 最優先 |
| GRS-004 | hasPhoto=trueの判定 | ⭐⭐ | 🟡 高 |
| GRS-005 | hasPhoto=falseの判定 | ⭐⭐ | 🟡 高 |

#### 異常系（1ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GRS-E001 | DB取得失敗時GET_SUMMARY_FAILEDエラー | ⭐⭐ | 🟡 高 |

#### エッジケース（3ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GRS-EC001 | 全記録が0件の場合（空配列） | ⭐⭐ | 🟡 高 |
| GRS-EC002 | 総記録数 < limitの場合（全件取得） | ⭐⭐ | 🟡 高 |
| GRS-EC003 | limit=0（空配列） | ⭐ | 🟢 中 |

### 2.7 getStatistics()

#### 正常系（8ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GS-001 | 記録0件時の統計（全てnullまたは0） | ⭐⭐⭐ | 🔴 最優先 |
| GS-002 | 記録1件時の統計 | ⭐⭐⭐ | 🔴 最優先 |
| GS-003 | 複数記録時の統計（既存実装） | ⭐⭐⭐ | 🔴 最優先 |
| GS-004 | uniqueSpecies計算（重複排除） | ⭐⭐⭐ | 🔴 最優先 |
| GS-005 | uniqueLocations計算（重複排除） | ⭐⭐⭐ | 🔴 最優先 |
| GS-006 | averageSize計算（size=undefinedを除外） | ⭐⭐⭐ | 🔴 最優先 |
| GS-007 | maxSize計算 | ⭐⭐⭐ | 🔴 最優先 |
| GS-008 | recordsWithPhotos計算 | ⭐⭐ | 🟡 高 |
| GS-009 | firstRecordDate計算 | ⭐⭐ | 🟡 高 |
| GS-010 | lastRecordDate計算 | ⭐⭐ | 🟡 高 |

#### 異常系（1ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GS-E001 | DB取得失敗時GET_STATISTICS_FAILEDエラー | ⭐⭐ | 🟡 高 |

#### エッジケース（6ケース）

| ID | テストケース | カバレッジ寄与度 | 優先度 |
|----|--------------|------------------|--------|
| GS-EC001 | 全記録でsize=null（averageSize=null） | ⭐⭐⭐ | 🔴 最優先 |
| GS-EC002 | 全記録でsize=undefined（averageSize=null） | ⭐⭐⭐ | 🔴 最優先 |
| GS-EC003 | 一部記録のみsize有り（平均計算） | ⭐⭐⭐ | 🔴 最優先 |
| GS-EC004 | 全記録でphotoId=undefined（recordsWithPhotos=0） | ⭐⭐ | 🟡 高 |
| GS-EC005 | 同じ日付の記録複数（日付範囲が同一） | ⭐ | 🟢 中 |
| GS-EC006 | size=0が含まれる場合の平均・最大値 | ⭐⭐ | 🟡 高 |

---

## 3. 優先順位付き実装計画

### 3.1 80%達成のための段階的アプローチ

#### フェーズ1: 最優先（🔴）- カバレッジ目標 65%

**期間**: 1-2日
**実装ケース数**: 約50ケース

##### 含まれるテスト

- **createRecord**: CR-001, CR-002, CR-E001~E005, CR-E010
- **getRecordById**: GR-001, GR-E001
- **getRecords**: GRL-001~011, GRL-E001, GRL-EC005
- **updateRecord**: UR-001~005, UR-E001~005, UR-E010
- **deleteRecord**: DR-001~002, DR-E001~002
- **getRecordsSummary**: GRS-001~003
- **getStatistics**: GS-001~007, GS-EC001~003

##### 実装優先度の理由

1. **正常系の主要パス**: ユーザーが最も頻繁に使う機能
2. **バリデーションエラー**: コード品質の基礎
3. **DB例外処理**: 信頼性の核心
4. **統計計算ロジック**: ビジネスロジックの複雑な部分

#### フェーズ2: 高優先（🟡）- カバレッジ目標 75%

**期間**: 1日
**実装ケース数**: 約40ケース

##### 含まれるテスト

- **createRecord**: CR-003~009
- **getRecordById**: GR-002, GR-E002, GR-EC001~002
- **getRecords**: GRL-012~015, GRL-EC001~004, GRL-EC006~007
- **updateRecord**: UR-006~008, UR-E006~009, UR-EC001~003
- **deleteRecord**: DR-003, DR-EC002
- **getRecordsSummary**: GRS-004~005, GRS-E001, GRS-EC001~002
- **getStatistics**: GS-008~010, GS-E001, GS-EC004, GS-EC006

##### 実装優先度の理由

1. **境界値テスト**: バグの温床となりやすい
2. **エッジケース**: 本番環境で遭遇する可能性が中程度
3. **オプショナルフィールド**: 柔軟性の検証

#### フェーズ3: 中優先（🟢）- カバレッジ目標 80%+

**期間**: 0.5-1日
**実装ケース数**: 約20ケース

##### 含まれるテスト

- **createRecord**: CR-005, CR-010, CR-E011~012, CR-EC001~005
- **getRecordById**: GR-E003
- **getRecords**: GRL-E002, GRL-EC008
- **updateRecord**: UR-EC004
- **deleteRecord**: DR-E003, DR-EC001
- **getRecordsSummary**: GRS-EC003
- **getStatistics**: GS-EC005

##### 実装優先度の理由

1. **レアケース**: 実際の使用で遭遇する可能性が低い
2. **リファクタリング**: コードの可読性向上
3. **パフォーマンステスト**: 速度最適化

### 3.2 各フェーズの具体的タスク

#### フェーズ1タスク（🔴 最優先）

1. **テストファイルのセットアップ** (30分)
   - モック設定の拡張（where, between, anyOf対応）
   - ヘルパー関数作成（createValidRecord, createMockRecord）
   - beforeEach/afterEachの整備

2. **createRecord基本テスト** (2時間)
   - 正常系: CR-001, CR-002
   - バリデーション: CR-E001~E005
   - DB例外: CR-E010

3. **CRUD基本テスト** (3時間)
   - getRecordById: GR-001, GR-E001
   - updateRecord基本: UR-001~005, UR-E001~005, UR-E010
   - deleteRecord基本: DR-001~002, DR-E001~002

4. **getRecords複雑テスト** (4時間)
   - パラメータ組み合わせ: GRL-001~005
   - フィルタリング: GRL-006~011
   - DB例外: GRL-E001
   - 重要エッジケース: GRL-EC005

5. **統計・概要テスト** (2時間)
   - getRecordsSummary: GRS-001~003
   - getStatistics核心: GS-001~007, GS-EC001~003

6. **カバレッジ確認** (30分)
   - `npm run test:coverage`で65%達成確認
   - 未カバー部分の特定

**合計: 約12時間（1.5日）**

#### フェーズ2タスク（🟡 高優先）

1. **境界値・エッジケーステスト** (3時間)
   - createRecord境界値: CR-003~009
   - updateRecord境界値: UR-006~009, UR-EC001~003
   - getRecordsエッジケース: GRL-012~015, GRL-EC001~004, GRL-EC006~007

2. **追加の異常系テスト** (2時間)
   - getRecordById追加: GR-002, GR-E002, GR-EC001~002
   - deleteRecord追加: DR-003, DR-EC002

3. **統計・概要の詳細テスト** (2時間)
   - getRecordsSummary追加: GRS-004~005, GRS-E001, GRS-EC001~002
   - getStatistics追加: GS-008~010, GS-E001, GS-EC004, GS-EC006

4. **カバレッジ確認** (30分)
   - `npm run test:coverage`で75%達成確認

**合計: 約7.5時間（1日）**

#### フェーズ3タスク（🟢 中優先）

1. **残りのエッジケース** (2時間)
   - 全メソッドの残存ケース実装

2. **カバレッジ80%達成の最終調整** (1時間)
   - 未カバー行の特定と追加テスト
   - 不要なテストの削除（重複排除）

3. **ドキュメント更新** (30分)
   - README更新
   - テストガイドライン追加

**合計: 約3.5時間（0.5日）**

### 3.3 カバレッジ進捗予測

| フェーズ | 実装ケース数 | 予測カバレッジ | 累積実装時間 |
|---------|-------------|---------------|-------------|
| 現状 | 既存約20ケース | 55.84% | - |
| フェーズ1完了 | +50ケース（計70ケース） | 65% | 12時間 |
| フェーズ2完了 | +40ケース（計110ケース） | 75% | 19.5時間 |
| フェーズ3完了 | +20ケース（計130ケース） | 80%+ | 23時間 |

---

## 4. テストファイル構成

### 4.1 推奨ディレクトリ構造

```
src/lib/__tests__/
└── fishing-record-service.test.ts  (既存、拡張する)
```

### 4.2 describe/test構造

```typescript
describe('FishingRecordService', () => {
  let service: FishingRecordService;
  let mockDb: any;

  beforeEach(() => {
    service = new FishingRecordService();
    vi.clearAllMocks();
  });

  // ========================================
  // 1. createRecord()
  // ========================================
  describe('createRecord', () => {
    describe('正常系', () => {
      it('[CR-001] 必須フィールドのみで作成成功', async () => { /* ... */ });
      it('[CR-002] 全フィールド指定で作成成功', async () => { /* ... */ });
      // ...
    });

    describe('異常系 - バリデーション', () => {
      it('[CR-E001] date未指定でVALIDATION_ERROR', async () => { /* ... */ });
      it('[CR-E002] location空文字でVALIDATION_ERROR', async () => { /* ... */ });
      // ...
    });

    describe('異常系 - DB例外', () => {
      it('[CR-E010] DB追加失敗時CREATE_FAILEDエラー', async () => { /* ... */ });
      it('[CR-E011] updateMetadata失敗時もcreateは成功', async () => { /* ... */ });
    });

    describe('エッジケース', () => {
      it('[CR-EC001] size=undefined（省略）', async () => { /* ... */ });
      // ...
    });
  });

  // ========================================
  // 2. getRecordById()
  // ========================================
  describe('getRecordById', () => {
    describe('正常系', () => {
      it('[GR-001] 存在するIDで記録取得成功', async () => { /* ... */ });
      // ...
    });

    describe('異常系', () => {
      it('[GR-E001] 存在しないIDでNOT_FOUNDエラー', async () => { /* ... */ });
      // ...
    });

    describe('エッジケース', () => {
      it('[GR-EC001] nullが返された場合の処理', async () => { /* ... */ });
      // ...
    });
  });

  // ========================================
  // 3. getRecords()
  // ========================================
  describe('getRecords', () => {
    describe('正常系 - 基本操作', () => {
      it('[GRL-001] パラメータなしで全記録取得', async () => { /* ... */ });
      it('[GRL-002] sortOrder="desc"で降順取得', async () => { /* ... */ });
      // ...
    });

    describe('正常系 - ページネーション', () => {
      it('[GRL-003] limitのみ指定', async () => { /* ... */ });
      it('[GRL-004] offsetのみ指定', async () => { /* ... */ });
      it('[GRL-005] limit + offset指定', async () => { /* ... */ });
    });

    describe('正常系 - フィルタリング', () => {
      it('[GRL-006] filter.dateRangeで日付範囲フィルタ', async () => { /* ... */ });
      it('[GRL-007] filter.fishSpeciesで魚種フィルタ（単一）', async () => { /* ... */ });
      // ...
    });

    describe('異常系', () => {
      it('[GRL-E001] DB取得失敗時GET_RECORDS_FAILEDエラー', async () => { /* ... */ });
    });

    describe('エッジケース', () => {
      it('[GRL-EC001] limit=0（全件スキップ）', async () => { /* ... */ });
      // ...
    });
  });

  // ========================================
  // 4. updateRecord()
  // ========================================
  describe('updateRecord', () => {
    describe('正常系', () => {
      it('[UR-001] 単一フィールド更新', async () => { /* ... */ });
      // ...
    });

    describe('異常系 - 存在チェック', () => {
      it('[UR-E001] 存在しないIDでNOT_FOUNDエラー', async () => { /* ... */ });
    });

    describe('異常系 - バリデーション', () => {
      it('[UR-E002] location空文字でVALIDATION_ERROR', async () => { /* ... */ });
      // ...
    });

    describe('異常系 - DB例外', () => {
      it('[UR-E010] DB更新失敗時UPDATE_FAILEDエラー', async () => { /* ... */ });
    });

    describe('エッジケース', () => {
      it('[UR-EC001] date未指定時、既存dateを保持', async () => { /* ... */ });
      // ...
    });
  });

  // ========================================
  // 5. deleteRecord()
  // ========================================
  describe('deleteRecord', () => {
    describe('正常系', () => {
      it('[DR-001] 存在するIDで削除成功', async () => { /* ... */ });
      // ...
    });

    describe('異常系', () => {
      it('[DR-E001] 存在しないIDでNOT_FOUNDエラー', async () => { /* ... */ });
      // ...
    });

    describe('エッジケース', () => {
      it('[DR-EC001] 空文字IDでNOT_FOUNDエラー', async () => { /* ... */ });
      // ...
    });
  });

  // ========================================
  // 6. getRecordsSummary()
  // ========================================
  describe('getRecordsSummary', () => {
    describe('正常系', () => {
      it('[GRS-001] デフォルトlimit=10で概要取得', async () => { /* ... */ });
      // ...
    });

    describe('異常系', () => {
      it('[GRS-E001] DB取得失敗時GET_SUMMARY_FAILEDエラー', async () => { /* ... */ });
    });

    describe('エッジケース', () => {
      it('[GRS-EC001] 全記録が0件の場合', async () => { /* ... */ });
      // ...
    });
  });

  // ========================================
  // 7. getStatistics()
  // ========================================
  describe('getStatistics', () => {
    describe('正常系', () => {
      it('[GS-001] 記録0件時の統計', async () => { /* ... */ });
      it('[GS-002] 記録1件時の統計', async () => { /* ... */ });
      // ...
    });

    describe('異常系', () => {
      it('[GS-E001] DB取得失敗時GET_STATISTICS_FAILEDエラー', async () => { /* ... */ });
    });

    describe('エッジケース', () => {
      it('[GS-EC001] 全記録でsize=null', async () => { /* ... */ });
      // ...
    });
  });
});
```

### 4.3 ヘルパー関数

```typescript
// テストデータ生成ヘルパー
function createValidForm(overrides?: Partial<CreateFishingRecordForm>): CreateFishingRecordForm {
  return {
    date: '2023-10-01',
    location: 'テスト釣り場',
    fishSpecies: 'テスト魚',
    size: 30,
    weight: 500,
    notes: 'テストメモ',
    useGPS: false,
    ...overrides
  };
}

function createMockRecord(overrides?: Partial<FishingRecord>): FishingRecord {
  return {
    id: 'test-id-' + Math.random().toString(36).substring(7),
    date: new Date('2023-10-01'),
    location: 'テスト釣り場',
    fishSpecies: 'テスト魚',
    size: 30,
    weight: 500,
    notes: 'テストメモ',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

// モック設定ヘルパー
async function setupMockDb() {
  return await import('../lib/database');
}

function mockDbAddSuccess(id = 'test-id') {
  const mockDb = setupMockDb();
  vi.mocked(mockDb.db.fishing_records.add).mockResolvedValue(id);
  vi.mocked(mockDb.db.fishing_records.count).mockResolvedValue(1);
}

function mockDbAddFailure(error = new Error('DB add failed')) {
  const mockDb = setupMockDb();
  vi.mocked(mockDb.db.fishing_records.add).mockRejectedValue(error);
}

// アサーションヘルパー
function expectValidationError(result: DatabaseResult<any>, expectedMessage: string) {
  expect(result.success).toBe(false);
  expect(result.error?.code).toBe('VALIDATION_ERROR');
  expect(result.error?.message).toContain(expectedMessage);
}

function expectNotFoundError(result: DatabaseResult<any>, id: string) {
  expect(result.success).toBe(false);
  expect(result.error?.code).toBe('NOT_FOUND');
  expect(result.error?.message).toContain(id);
}
```

### 4.4 beforeEach/afterEachのセットアップ

```typescript
describe('FishingRecordService', () => {
  let service: FishingRecordService;

  beforeEach(async () => {
    // サービスインスタンスを毎回新規作成
    service = new FishingRecordService();

    // 全てのモックをクリア
    vi.clearAllMocks();

    // Date.nowをモック（テストの再現性向上）
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-10-01T00:00:00Z'));
  });

  afterEach(() => {
    // タイマーをリセット
    vi.useRealTimers();
  });
});
```

---

## 5. カバレッジ目標達成の見積もり

### 5.1 現状分析（55.84%）

#### カバー済み領域

- ✅ **createRecord**: 基本的な正常系・バリデーション（約60%）
- ✅ **getRecordById**: 基本的な正常系・異常系（約70%）
- ✅ **updateRecord**: 基本的な正常系・異常系（約60%）
- ✅ **deleteRecord**: 基本的な正常系・異常系（約70%）
- ✅ **getStatistics**: 基本的な正常系（約50%）

#### 未カバー領域（推定）

- ❌ **getRecords**: フィルタリング機能（applyFilter）が未実装（約10%カバレッジ）
- ❌ **getRecordsSummary**: テストが存在しない（0%カバレッジ）
- ❌ **境界値テスト**: size/weightの境界値が不十分
- ❌ **エッジケース**: undefined/null処理が不十分
- ❌ **DB例外**: 一部の異常系が未テスト

### 5.2 80%達成への道筋

#### ステップ1: getRecords完全実装（+12%）

**追加テスト数**: 約25ケース
**予測カバレッジ増加**: 12%（55.84% → 67.84%）

##### 理由

- `applyFilter`メソッド（66行、Line 312-339）が完全に未カバー
- `getRecords`本体のフィルタ・ソート・ページネーション処理が未テスト
- 最もコード行数が多い未カバー領域

#### ステップ2: getRecordsSummary実装（+5%）

**追加テスト数**: 約9ケース
**予測カバレッジ増加**: 5%（67.84% → 72.84%）

##### 理由

- 30行の完全未カバーメソッド（Line 216-246）
- 実装は比較的単純だが、0%カバレッジのため影響大

#### ステップ3: 境界値・エッジケース強化（+5%）

**追加テスト数**: 約30ケース
**予測カバレッジ増加**: 5%（72.84% → 77.84%）

##### 理由

- バリデーション境界値（size: 0/999, weight: 0/99999）
- undefined/null処理の分岐
- 既存メソッドの未カバー分岐

#### ステップ4: 異常系・DB例外完全実装（+3%）

**追加テスト数**: 約15ケース
**予測カバレッジ増加**: 3%（77.84% → 80.84%）

##### 理由

- try-catchのcatch節が一部未カバー
- メタデータ更新失敗時の警告処理（console.warn）
- DB例外の詳細なテスト

### 5.3 達成困難な部分の洗い出し

#### 1. updateTotalRecordsCount()の失敗パス（Line 442-449）

**コード**:
```typescript
private async updateTotalRecordsCount(): Promise<void> {
  try {
    const count = await db.fishing_records.count();
    await db.updateMetadata('total_records', count.toString());
  } catch (error) {
    console.warn('Failed to update total records count:', error);
  }
}
```

**課題**:
- このメソッドはprivateで直接テストできない
- createRecord/deleteRecordから間接的にテストするしかない
- catch節のconsole.warnをカバーするにはメタデータ更新の失敗をモックする必要がある

**解決策**:
- console.warnをスパイして、mockRejectedValueで例外を発生させる
- カバレッジ寄与度: 約1%

#### 2. applyFilterの複雑な分岐（Line 312-339）

**コード**:
```typescript
private applyFilter(query: any, filter: RecordFilter): any {
  // 4つの異なるフィルタタイプ（dateRange, fishSpecies, location, sizeRange）
  // それぞれに条件分岐とDexieクエリチェーン
}
```

**課題**:
- Dexieクエリチェーンのモックが複雑
- where().between(), where().anyOf(), filter()の組み合わせ
- フィルタの組み合わせパターンが多い（2^4 = 16通り）

**解決策**:
- 各フィルタタイプを個別にテスト（4ケース）
- 代表的な組み合わせをテスト（3-4ケース）
- 全組み合わせはテストしない（優先度低）
- カバレッジ寄与度: 約10%

#### 3. getStatisticsの複雑な計算ロジック（Line 278-293）

**コード**:
```typescript
const sizesWithValue = allRecords.filter(r => r.size !== undefined && r.size !== null);
const uniqueSpecies = new Set(allRecords.map(r => r.fishSpecies)).size;
// ... 複雑な集計処理
```

**課題**:
- size=undefined/nullの処理
- 空配列時の特殊処理
- 日付の最小・最大計算

**解決策**:
- 各計算ロジックを個別にテスト（既存実装で約50%カバー）
- エッジケース（全記録でsize=null等）を追加（3-5ケース）
- カバレッジ寄与度: 約3%

#### 4. getRecords + applyFilterの統合（Line 94-132）

**コード**:
```typescript
async getRecords(params: GetRecordsParams = {}): Promise<DatabaseResult<FishingRecord[]>> {
  // orderBy + reverse + filter + offset + limit のチェーン
}
```

**課題**:
- Dexieクエリチェーンのモックが非常に複雑
- 既存のモック実装（Line 13-42）では不十分
- where(), between(), anyOf()のネストしたモックが必要

**解決策**:
- モック実装を段階的に拡張
  1. 基本的なorderBy + reverse + limit + offset（既存）
  2. where().between()の追加（dateRange対応）
  3. where().anyOf()の追加（fishSpecies対応）
  4. filter()の追加（location, sizeRange対応）
- 各段階で対応するテストケースを実装
- カバレッジ寄与度: 約12%

### 5.4 カバレッジ80%達成の最終見積もり

| 段階 | 実装内容 | 追加ケース数 | 予測カバレッジ | 累積時間 |
|------|---------|-------------|---------------|---------|
| 現状 | - | 既存約20ケース | 55.84% | - |
| ステップ1 | getRecords完全実装 | +25ケース | 67.84% | 12時間 |
| ステップ2 | getRecordsSummary実装 | +9ケース | 72.84% | 14時間 |
| ステップ3 | 境界値・エッジケース強化 | +30ケース | 77.84% | 19.5時間 |
| ステップ4 | 異常系・DB例外完全実装 | +15ケース | 80.84% | 23時間 |

#### 達成可能性評価

- ✅ **達成可能**: 80%は十分に現実的
- ⚠️ **注意点**: applyFilterのモック実装が最大の課題
- 💡 **推奨**: フェーズ1-2を完了後、実際のカバレッジを測定して調整

#### リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| モック実装の複雑さ | 高 | ヘルパー関数で抽象化 |
| テスト実装時間の超過 | 中 | フェーズ3を削減してフェーズ1-2に集中 |
| カバレッジ予測の誤差 | 中 | フェーズ1完了後に再評価 |

---

## 6. 実装開始時のチェックリスト

### 6.1 環境準備

- [ ] `npm run test:fast`が成功することを確認
- [ ] 既存のテストファイルが全てパスすることを確認
- [ ] カバレッジ測定コマンドが動作することを確認: `npm run test:coverage`

### 6.2 モック設定

- [ ] vi.mock()の基本構造を確認（既存実装ベース）
- [ ] where(), between(), anyOf()のモック追加
- [ ] filter()のモック追加
- [ ] ヘルパー関数の実装（createValidForm, createMockRecord等）

### 6.3 テスト実装

- [ ] フェーズ1の最優先ケースから実装開始
- [ ] 各describeブロックごとにコミット（git commit）
- [ ] 10ケース実装ごとにカバレッジ測定

### 6.4 品質保証

- [ ] 各テストが独立して実行可能（順序依存なし）
- [ ] beforeEach/afterEachで適切にクリーンアップ
- [ ] console.warnのモック後、必ずmockRestore()
- [ ] Date.nowのモックは必ずuseRealTimers()でリセット

---

## 7. 参考資料

### 7.1 既存テストファイル

- **photo-service.test.ts**: vi.mock()の使い方、ヘルパー関数の設計
- **fishing-record-service.test.ts**: 既存実装、基本的なテスト構造

### 7.2 ドキュメント

- **Vitest公式ドキュメント**: https://vitest.dev/
- **Dexie.js API**: https://dexie.org/docs/API-Reference
- **fake-indexeddb**: https://github.com/dumbmatter/fakeIndexedDB

### 7.3 プロジェクト固有

- **.claude/CLAUDE.md**: プロジェクト規約
- **ai-rules/TASK_CYCLES.md**: テスト実装サイクル
- **ai-rules/RETRY_POLICY.md**: テスト失敗時のリトライ方針

---

## 8. 次のアクション

### QAエンジニアへのレビュー依頼

1. **このテスト戦略書のレビュー依頼**
   - カバレッジ目標の妥当性
   - テストケース設計の網羅性
   - 優先順位付けの適切性
   - エッジケースの十分性

2. **フェーズ1実装後のレビュー依頼**
   - 実装したテストコードの品質
   - テストの信頼性（フレーキーテストチェック）
   - カバレッジ実績の評価

3. **最終レビュー依頼（80%達成後）**
   - 全テストコードの総合評価
   - 保守性・可読性の評価
   - 改善提案

### 実装開始

```bash
# 1. ブランチ作成
git checkout -b test-issue-XX-fishing-record-service-tests

# 2. テスト実装
# （このテスト戦略書に従って実装）

# 3. カバレッジ測定
npm run test:coverage

# 4. コミット
git add src/lib/__tests__/fishing-record-service.test.ts
git commit -m "test: add comprehensive tests for fishing-record-service (Phase 1)"

# 5. QAエンジニアレビュー依頼
# （.claude/agents/qa-engineer.md を使用）
```

---

**策定者**: Claude (Sonnet 4.5)
**レビュー待ち**: qa-engineer エージェント
**承認後**: 実装開始
