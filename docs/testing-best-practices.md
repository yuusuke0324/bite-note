# テストベストプラクティス

**最終更新**: 2025-11-04
**対象**: Vitest + React Testing Library + TypeScript

このドキュメントは、v1.0.7開発中に得られた実践的な知見をまとめたものです。

---

## 📋 目次

1. [非同期処理とwaitFor()の適切な使用](#1-非同期処理とwaitforの適切な使用)
2. [ARIA roleの正しい使用](#2-aria-roleの正しい使用)
3. [act()警告の対処法](#3-act警告の対処法)
4. [モックのベストプラクティス](#4-モックのベストプラクティス)
5. [パフォーマンス最適化](#5-パフォーマンス最適化)
6. [テストの構造化とネーミング](#6-テストの構造化とネーミング)
7. [トラブルシューティング](#7-トラブルシューティング)

---

## 1. 非同期処理とwaitFor()の適切な使用

### ❌ BAD: 同期的なレンダリングでwaitFor()を使用

```typescript
// 誤り: 同期的にレンダリングされるものをwaitFor()で待つ
it('should render title', async () => {
  render(<MyComponent />);
  await waitFor(() => {
    expect(screen.getByText('Title')).toBeInTheDocument();
  });
});
```

**問題点**:
- 不要な待機時間（デフォルト1秒）が発生
- テスト実行時間が無駄に長くなる
- 実際の問題を隠蔽する可能性

### ✅ GOOD: 非同期のDOM変更のみwaitFor()を使用

```typescript
// 正しい: 同期的なレンダリングは直接アサート
it('should render title', () => {
  render(<MyComponent />);
  expect(screen.getByText('Title')).toBeInTheDocument();
});

// 正しい: 非同期の状態変更のみwaitFor()を使用
it('should load data asynchronously', async () => {
  render(<MyComponent />);

  // useEffect内の非同期処理を待つ
  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeInTheDocument();
  });
});
```

### 💡 ベストプラクティス

1. **findBy*クエリを優先的に使用**
```typescript
// waitFor() + getBy* の代わりに
const element = await screen.findByText('Async Content');
```

2. **初期化完了を明示的に待つ**
```typescript
// コンポーネントの初期化完了を待つ
await waitFor(() => {
  expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
});
```

3. **タイムアウトは必要最小限に**
```typescript
// デフォルト1秒で十分な場合は指定しない
await waitFor(() => expect(element).toBeInTheDocument());

// 本当に必要な場合のみ延長
await waitFor(() => expect(element).toBeInTheDocument(), {
  timeout: 3000, // 3秒
});
```

---

## 2. ARIA roleの正しい使用

### 📚 主要なARIA roleリファレンス

| 要素タイプ | 適切なrole | 使用例 |
|-----------|-----------|--------|
| 単純なテキスト入力 | `textbox` | 名前、メモ |
| オートコンプリート | `combobox` | 検索、魚種選択 |
| 検索専用入力 | `searchbox` | サイト内検索 |
| ドロップダウンリスト | `listbox` | セレクトボックス |
| リストアイテム | `option` | ドロップダウンの各項目 |

### ❌ BAD: 実装と一致しないroleを使用

```typescript
// コンポーネントがcomboboxなのにtextboxとしてテスト
const input = screen.getByRole('textbox'); // ❌ 失敗する
```

### ✅ GOOD: コンポーネントの実装に合わせたrole

```typescript
// コンポーネントの実装
<input
  role="combobox"
  aria-autocomplete="list"
  aria-controls="suggestions-list"
  aria-expanded={isOpen}
/>

// テスト
const input = screen.getByRole('combobox'); // ✅ 成功する
```

### 💡 ベストプラクティス

1. **W3C ARIA仕様を参照**
   - [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
   - コンポーネントタイプごとの推奨role/属性を確認

2. **実装とテストの一貫性**
```typescript
// コンポーネントのroleを確認してからテストを書く
const input = screen.getByRole('combobox', { name: '魚種名' });
```

3. **アクセシビリティツリーで検証**
```typescript
// デバッグ時にアクセシビリティツリーを確認
screen.debug(undefined, 100000);
```

---

## 3. act()警告の対処法

### ⚠️ よくあるact()警告

```
Warning: An update to ComponentName inside a test was not wrapped in act(...).
```

### 原因と対処法

#### 原因1: useEffect内の非同期処理

```typescript
// ❌ BAD: useEffectの完了を待たない
it('should update state', () => {
  render(<MyComponent />);
  fireEvent.click(screen.getByRole('button'));
  // useEffect内のsetStateが実行される前にテストが終了
});

// ✅ GOOD: 非同期処理の完了を待つ
it('should update state', async () => {
  render(<MyComponent />);
  fireEvent.click(screen.getByRole('button'));

  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

#### 原因2: userEventの非同期操作

```typescript
// ❌ BAD: userEventをawaitしない
it('should handle input', () => {
  render(<MyComponent />);
  userEvent.type(screen.getByRole('textbox'), 'test');
});

// ✅ GOOD: userEventをawait
it('should handle input', async () => {
  render(<MyComponent />);
  await userEvent.type(screen.getByRole('textbox'), 'test');
});
```

#### 原因3: タイマー関連の処理

```typescript
// ❌ BAD: setTimeoutを考慮しない
it('should debounce input', () => {
  render(<MyComponent />);
  userEvent.type(screen.getByRole('textbox'), 'test');
});

// ✅ GOOD: タイマーを進める
it('should debounce input', async () => {
  vi.useFakeTimers();
  render(<MyComponent />);

  await userEvent.type(screen.getByRole('textbox'), 'test');
  vi.runAllTimers();

  await waitFor(() => {
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  vi.useRealTimers();
});
```

### 💡 ベストプラクティス

1. **全てのユーザーイベントにawait**
```typescript
await userEvent.click(button);
await userEvent.type(input, 'text');
await userEvent.selectOptions(select, 'option');
```

2. **findBy*クエリを活用**
```typescript
// getBy* + waitFor() の代わりに
const element = await screen.findByText('Async Content');
```

3. **cleanup後の状態更新に注意**
```typescript
// コンポーネントのアンマウント後に状態更新が走らないようにする
useEffect(() => {
  let cancelled = false;

  fetchData().then(data => {
    if (!cancelled) {
      setData(data);
    }
  });

  return () => { cancelled = true; };
}, []);
```

---

## 4. モックのベストプラクティス

### 問題: Vitestのホイスティング

Vitestは`vi.mock()`をファイルの先頭に自動的に移動（ホイスティング）します。

```typescript
// ❌ BAD: ホイスティングにより期待通りに動作しない
const mockSearch = vi.fn();

vi.mock('@/lib/fish-species', () => ({
  FishSpeciesSearchEngine: class {
    search = mockSearch; // mockSearchが未定義になる
  }
}));
```

### ✅ 解決策1: vi.hoisted()を使用

```typescript
// ✅ GOOD: vi.hoisted()で明示的にホイスト
const { mockSearch, MockSearchEngine } = vi.hoisted(() => {
  const mockSearch = vi.fn(() => []);

  return {
    mockSearch,
    MockSearchEngine: class {
      search = mockSearch;
    }
  };
});

vi.mock('@/lib/fish-species', () => ({
  FishSpeciesSearchEngine: MockSearchEngine
}));
```

### ✅ 解決策2: 依存性注入でテスタビリティ向上（推奨）

```typescript
// コンポーネント側: searchEngineをpropsで受け取れるようにする
interface Props {
  searchEngine?: FishSpeciesSearchEngine;
}

export const FishSpeciesAutocomplete: React.FC<Props> = ({
  searchEngine = new FishSpeciesSearchEngine()
}) => {
  // searchEngineを使用
};

// テスト側: モックインスタンスを注入
it('should search fish species', async () => {
  const mockEngine = {
    search: vi.fn(() => [
      { id: '1', name: 'あじ', scientificName: 'Trachurus japonicus' }
    ])
  };

  render(<FishSpeciesAutocomplete searchEngine={mockEngine} />);

  await userEvent.type(screen.getByRole('combobox'), 'あじ');

  expect(mockEngine.search).toHaveBeenCalledWith('あじ', { limit: 10 });
});
```

### 💡 モック実装のベストプラクティス

1. **実際の実装を忠実に再現**
```typescript
const mockSearch = vi.fn((query: string, options?: { limit?: number }) => {
  // 実際のFishSpeciesSearchEngineの動作を模倣
  if (!query) return [];

  const allFish = [
    { id: '1', name: 'あじ', scientificName: 'Trachurus japonicus' },
    { id: '2', name: 'さば', scientificName: 'Scomber japonicus' },
  ];

  const filtered = allFish.filter(fish =>
    fish.name.includes(query)
  );

  return options?.limit
    ? filtered.slice(0, options.limit)
    : filtered;
});
```

2. **デバッグログを追加**
```typescript
const mockSearch = vi.fn((query, options) => {
  console.log('[MOCK] search called:', { query, options });
  const result = /* ... */;
  console.log('[MOCK] search result:', result);
  return result;
});
```

3. **モックのリセット**
```typescript
beforeEach(() => {
  vi.clearAllMocks(); // 呼び出し履歴をクリア
  mockSearch.mockReturnValue([]); // 戻り値をリセット
});
```

---

## 5. パフォーマンス最適化

### 📊 パフォーマンス問題の症状

- テスト実行時間が異常に長い（1ファイル30秒以上）
- CIがタイムアウトする
- 開発体験が悪化

### 🔍 原因の特定

```bash
# 各テストファイルの実行時間を測定
npm run test -- --reporter=verbose | grep "Test Files"

# 遅いテストTOP10を特定
npm run test -- --reporter=json > benchmark.json
node scripts/analyze-test-performance.js
```

### ⚠️ よくあるパフォーマンス問題

#### 問題1: 不要なwaitFor()

```typescript
// ❌ BAD: 同期処理でwaitFor() (1秒 × 10テスト = 10秒)
it('should render', async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});

// ✅ GOOD: 同期処理は直接アサート (即座に完了)
it('should render', () => {
  render(<Component />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

**改善効果**: v1.0.7で23.4秒 → 1.64秒（93%改善）

#### 問題2: タイムアウト設定が長すぎる

```typescript
// ❌ BAD: 不必要に長いタイムアウト
await waitFor(() => {
  expect(element).toBeInTheDocument();
}, { timeout: 10000 }); // 10秒

// ✅ GOOD: 適切なタイムアウト
await waitFor(() => {
  expect(element).toBeInTheDocument();
}); // デフォルト1秒で十分
```

#### 問題3: 大量データのテスト

```typescript
// ❌ BAD: 本番レベルの大量データ
it('should handle large dataset', () => {
  const data = Array.from({ length: 50000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }));
  render(<VirtualList data={data} />);
});

// ✅ GOOD: テストに必要な最小限のデータ
it('should handle large dataset', () => {
  const data = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }));
  render(<VirtualList data={data} />);
});
```

**改善効果**: v1.0.7でデータ量50000→1000（テスト時間短縮）

#### 問題4: 重複するセットアップ

```typescript
// ❌ BAD: 各テストで重複するセットアップ
it('test 1', () => {
  const data = createMockData();
  const store = setupStore();
  render(<Component data={data} />, { wrapper: StoreProvider });
});

it('test 2', () => {
  const data = createMockData(); // 重複
  const store = setupStore(); // 重複
  render(<Component data={data} />, { wrapper: StoreProvider });
});

// ✅ GOOD: 共通セットアップを切り出す
beforeEach(() => {
  mockData = createMockData();
  mockStore = setupStore();
});

it('test 1', () => {
  render(<Component data={mockData} />, { wrapper: StoreProvider });
});

it('test 2', () => {
  render(<Component data={mockData} />, { wrapper: StoreProvider });
});
```

### 💡 最適化のベストプラクティス

1. **テスト分離戦略**
```json
// package.json
{
  "scripts": {
    "test:unit": "vitest --run --project=unit",
    "test:perf": "vitest --run --project=performance",
    "test:a11y": "vitest --run --project=accessibility"
  }
}
```

**NOTE**: `vitest.workspace.ts`でプロジェクトごとに設定を分離し、include/excludeを明示的に管理します。

2. **共通ユーティリティの活用**
```typescript
// src/test/test-utils.ts
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: RenderOptions
) => {
  return render(ui, {
    wrapper: AllTheProviders,
    ...options
  });
};

// 使用例
renderWithProviders(<MyComponent />);
```

3. **Vitest設定の最適化**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 10000, // 10秒（デフォルト: 5秒）
    hookTimeout: 10000,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
  },
});
```

---

## 6. テストの構造化とネーミング

### 📝 テストファイルの命名規則

```
コンポーネント名.test.tsx          # 基本的なユニットテスト
コンポーネント名.integration.test.tsx  # 統合テスト
コンポーネント名.accessibility.test.tsx # アクセシビリティテスト
コンポーネント名.performance.test.tsx  # パフォーマンステスト
```

### 🏗️ テストの構造化

```typescript
describe('ComponentName', () => {
  // グループ1: 基本的なレンダリング
  describe('Basic Rendering', () => {
    it('should render with default props', () => {});
    it('should render with custom props', () => {});
  });

  // グループ2: ユーザーインタラクション
  describe('User Interactions', () => {
    it('should handle click events', async () => {});
    it('should handle keyboard input', async () => {});
  });

  // グループ3: エラーハンドリング
  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {});
    it('should handle invalid input gracefully', () => {});
  });

  // グループ4: アクセシビリティ
  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {});
    it('should be keyboard navigable', async () => {});
  });
});
```

### 💡 ネーミングのベストプラクティス

```typescript
// ✅ GOOD: 明確で具体的
it('should display error message when API returns 404', async () => {});

// ❌ BAD: 曖昧
it('should work', () => {});
it('test error', () => {});

// ✅ GOOD: 振る舞いを記述
it('should disable submit button when form is invalid', () => {});

// ❌ BAD: 実装詳細
it('should set isDisabled to true', () => {});
```

---

## 7. トラブルシューティング

### 🐛 よくある問題と解決法

#### 問題1: "Unable to find role"エラー

```
TestingLibraryElementError: Unable to find an accessible element with the role "combobox"
```

**解決法**:
```typescript
// 1. アクセシビリティツリーを確認
screen.debug();

// 2. roleが正しいか確認
screen.logTestingPlaygroundURL();

// 3. 実装を確認
const input = screen.getByRole('combobox', {
  name: '魚種名' // aria-labelで絞り込み
});
```

#### 問題2: テストが間欠的に失敗する

**原因**: 非同期処理の競合、タイミング問題

**解決法**:
```typescript
// ❌ BAD: タイミング依存
it('should update', async () => {
  render(<Component />);
  await new Promise(resolve => setTimeout(resolve, 100)); // 危険
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

// ✅ GOOD: 明示的な待機
it('should update', async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

#### 問題3: モックが効かない

**原因**: Vitestのホイスティング、パス解決の問題

**解決法**:
```typescript
// 1. vi.hoisted()を使用
const { mockFn } = vi.hoisted(() => ({
  mockFn: vi.fn()
}));

// 2. モックのパスを確認（tsconfig.jsonのpathsと一致させる）
vi.mock('@/lib/service', () => ({ /* ... */ }));

// 3. デバッグログでモックが呼ばれているか確認
const mockFn = vi.fn((...args) => {
  console.log('[MOCK] called with:', args);
  return result;
});
```

#### 問題4: CI環境でのみ失敗する

**原因**: 環境差異、タイムアウト、並列実行の問題

**解決法**:
```typescript
// 1. タイムアウトを延長
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 15000, // CI用に延長
  }
});

// 2. 並列実行を無効化（デバッグ時）
// package.json
{
  "scripts": {
    "test:ci": "vitest run --no-threads"
  }
}

// 3. CI専用の環境変数でモック挙動を調整
const timeout = process.env.CI ? 3000 : 1000;
```

---

## 📚 参考リソース

### 公式ドキュメント
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### 推奨記事
- [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Effective Snapshot Testing](https://kentcdodds.com/blog/effective-snapshot-testing)

---

## 📊 v1.0.7での実績

### 改善成果
- **テスト成功率**: 17% → 52% (+200%改善)
- **テスト実行時間**: 23.4秒 → 1.64秒 (93%改善)
- **waitFor()最適化**: 不要な待機を削除

### 残課題
- FishSpeciesAutocomplete: 15/29成功 (52%成功率)
- モック設計の根本的な見直しが必要
- CI実行時間: 目標3分以内（現状5m40s）

---

## 🎯 次のアクション

このドキュメントを活用して：
1. 新しいテスト作成時にベストプラクティスを適用
2. 既存テストのリファクタリング時に参照
3. チームオンボーディング時の教材として使用
4. 技術的負債の蓄積防止

---

**このドキュメントは継続的に更新します。**
