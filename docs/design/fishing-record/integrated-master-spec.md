# 釣果記録アプリ 統合マスター仕様書

> **Single Source of Truth**: 釣果記録アプリの包括的設計・実装仕様書
>
> **最終更新**: 2025年10月29日
> **バージョン**: v3.1
> **ステータス**: 地図機能・詳細画面写真表示実装完了、自動保存機能削除（シンプル化）、魚種マスターデータ拡充完了（231種）

## 📋 システム概要

### ビジョン
個人の趣味の釣り人が釣果を **「簡単に記録」** し、**「美しく振り返る」** ことができるPWAアプリケーション。最新の技術スタックとユーザビリティを追求したモダンな釣果記録システムを提供する。

### 要件定義サマリー

#### 機能要件
- ✅ **釣果記録**: 日時・場所・魚種・サイズ・写真の記録
- ✅ **写真メタデータ自動抽出**: EXIFデータから位置・日時の自動入力
- ✅ **環境情報自動取得**: 天気・海面水温の自動記録
- ✅ **記録一覧・詳細表示**: 時系列表示・検索・フィルタリング
- ✅ **データ永続化**: ローカルストレージ（IndexedDB）
- ✅ **地図機能**: 釣果位置の可視化・スパイダー表示・モダンUI（2025年10月実装完了）
- 🚧 **潮汐情報システム**: 釣果と潮汐の関係性分析（設計完了・実装準備完了）
- ✅ **魚種オートコンプリート**: 表記揺れ対応・高速検索・231種マスターデータ（2025年10月実装完了）

#### 非機能要件
- ✅ **PWA対応**: iOS/Android/Webでネイティブアプリ相当のUX
- ✅ **オフライン動作**: ネットワーク不要での完全動作
- ✅ **プライバシー重視**: ローカル完結・外部送信なし
- ✅ **モダンUI/UX**: 2024年デザイントレンド対応
- ✅ **パフォーマンス**: 高速レスポンス・最適化済み

## 🏗️ システムアーキテクチャ

### 技術スタック
```
Frontend Framework: React 18 + TypeScript + Vite
State Management: Zustand + Immer
UI/Styling: TailwindCSS + Radix UI + CSS-in-JS
Database: IndexedDB (Dexie.js)
PWA: Service Worker (Workbox)
Forms: React Hook Form + Zod
Testing: Vitest + Testing Library + Playwright
```

### アーキテクチャ図
```
┌─────────────────────────────────────────────────────────┐
│                    UI/UX Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ React       │  │ Modern      │  │ PWA         │      │
│  │ Components  │  │ Design      │  │ Features    │      │
│  │             │  │ System      │  │             │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│               Business Logic Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ Form        │  │ Photo       │  │ Weather     │      │
│  │ Management  │  │ Metadata    │  │ Service     │      │
│  │             │  │ Service     │  │             │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ Validation  │  │ Tide        │  │ Export      │      │
│  │ Engine      │  │ System      │  │ Service     │      │
│  │             │  │ (Ready)     │  │             │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│              Data Storage Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ IndexedDB   │  │ Blob        │  │ Cache       │      │
│  │ (Dexie.js)  │  │ Storage     │  │ Management  │      │
│  │             │  │             │  │             │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
```

## 📊 データモデル仕様

### 基本エンティティ
```typescript
/** 釣果記録のメインエンティティ */
interface FishingRecord {
  id: string;
  date: Date;
  location: string;
  fishSpecies: string;
  size?: number;
  photoId?: string;
  coordinates?: Coordinates;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;

  // 追加実装済みフィールド
  weather?: WeatherData;
  seaTemperature?: number;

  // 将来実装フィールド
  tideInfo?: HybridTideInfo;
  tideContext?: TideContext;
}

/** 天気データ */
interface WeatherData {
  condition: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  source: 'open-meteo';
}

/** 位置情報 */
interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/** 魚種マスターデータ（2025年10月追加・10月29日拡充完了） */
interface FishSpecies {
  id: string;                    // "ma-aji"（一意識別子）
  standardName: string;          // "マアジ"（標準和名）
  scientificName: string;        // "Trachurus japonicus"（学名）
  aliases: string[];             // ["アジ", "あじ", "鯵", "真鯵"]
  regionalNames: string[];       // 地方名["アオアジ", "キアジ"]
  category: FishCategory;        // "青魚" | "白身魚" | "根魚" 等
  season: Season[];              // ["春", "夏", "秋"]
  habitat: Habitat[];            // ["沿岸", "堤防", "磯", "船", "河川", "湖", "養殖"]
  popularity: number;            // 0-100（検索順位用）
  image?: string;                // 画像URL
  source: "official" | "user";   // データソース
  createdAt?: Date;              // データ作成日時（更新履歴追跡用）
  updatedAt?: Date;              // 最終更新日時（データ鮮度判定用）
}

type FishCategory = "青魚" | "白身魚" | "根魚" | "回遊魚" | "エギング" | "赤身魚" | "軟体動物" | "甲殻類" | "その他" | "ルアー";
type Season = "春" | "夏" | "秋" | "冬" | "通年";
type Habitat = "沿岸" | "堤防" | "磯" | "船" | "河川" | "湖" | "養殖";
```

### データベーススキーマ（IndexedDB）
```sql
-- 釣果記録テーブル
fishing_records {
  id: string (primary key)
  date: Date (indexed)
  location: string
  fish_species: string (indexed)
  size: number?
  photo_id: string? (foreign key -> photos.id)
  coordinates: Coordinates?
  weather_data: WeatherData?
  sea_temperature: number?
  notes: string?
  created_at: Date (indexed)
  updated_at: Date
}

-- 写真テーブル
photos {
  id: string (primary key)
  blob: Blob
  filename: string
  mime_type: string
  size: number
  uploaded_at: Date (indexed)
}

-- 魚種マスターデータテーブル（2025年10月追加）
fish_species {
  id: string (primary key)
  standard_name: string (indexed)
  scientific_name: string
  aliases: string[] (検索用）
  regional_names: string[]
  category: string (indexed)
  season: string[]
  habitat: string[]
  popularity: number (indexed DESC)
  image: string?
  source: 'official' | 'user'
  created_at: Date
  updated_at: Date
}

-- インデックス戦略
INDEX idx_date ON fishing_records(date DESC)
INDEX idx_species ON fishing_records(fish_species)
INDEX idx_created ON fishing_records(created_at DESC)
INDEX idx_location ON fishing_records(location)
INDEX idx_photo_upload ON photos(uploaded_at DESC)
INDEX idx_fish_standard_name ON fish_species(standard_name)
INDEX idx_fish_category ON fish_species(category)
INDEX idx_fish_popularity ON fish_species(popularity DESC)
```

## 🐟 魚種オートコンプリートシステム（2025年10月設計）

### システム概要

**課題**: 魚種入力の表記揺れ（"アジ" "あじ" "鯵" "マアジ"等）により統計・検索が困難

**解決策**:
- 標準化された魚種マスターデータ（231種、2025年10月29日時点）
- リアルタイム検索・オートコンプリート
- 表記揺れ吸収（ひらがな・カタカナ・漢字・俗称・地方名）
- オフライン完全動作
- 幼魚・成長段階・地域名も網羅

### アーキテクチャ

```typescript
┌─────────────────────────────────────────────────────────┐
│               UI Layer (Form Component)                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │  FishSpeciesAutocomplete                        │    │
│  │  - リアルタイム入力                              │    │
│  │  - キーボード操作対応                            │    │
│  │  - サジェスト表示（最大10件）                    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│            Search Engine (Business Logic)               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  FishSpeciesSearchEngine                        │    │
│  │  - 前方一致検索（1文字から）                     │    │
│  │  - 正規化（カタカナ→ひらがな）                   │    │
│  │  - 人気度ソート                                  │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  SearchIndex                                     │    │
│  │  - Map<prefix, speciesIds[]>                    │    │
│  │  - O(1) 検索パフォーマンス                       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Data Layer (Storage)                       │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ 静的JSON         │  │ IndexedDB        │             │
│  │ (231種完備)      │  │ (全種+ユーザー種)│             │
│  └──────────────────┘  └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

### データソース戦略

#### Phase 1: 基本データ構築（推奨）

```typescript
{
  ソース: "WEB魚図鑑（https://zukan.com/fish）",
  理由: [
    "日本語名・別名・地方名が豊富",
    "学名も完備",
    "釣り対象魚を網羅",
    "スクレイピング可能"
  ],

  取得方法: {
    手順1: "50音順一覧ページから魚種URLリスト取得",
    手順2: "各魚種ページから詳細情報抽出",
    手順3: "JSON形式で構造化",
    データ数: "200-300種（釣り対象魚メイン）"
  },

  補完ソース: [
    "市場魚貝類図鑑（https://www.zukan-bouz.com/）→ 地方名補完",
    "FishBase API（https://fishbase.ropensci.org/）→ 学名検証"
  ],

  工数: "2-3日",
  精度: "95%以上"
}
```

#### データ構造（実装完了版 v4.0.0）

```json
{
  "version": "4.0.0",
  "updatedAt": "2025-10-29T15:00:00.000Z",
  "count": 231,
  "description": "完全版魚種マスターデータ（海水魚・淡水魚・イカタコ類・甲殻類を網羅的に収録231種）",
  "species": [
    {
      "id": "ma-aji",
      "standardName": "マアジ",
      "scientificName": "Trachurus japonicus",
      "aliases": ["アジ", "あじ", "鯵", "真鯵", "まあじ", "ホンアジ"],
      "regionalNames": ["アオアジ", "キアジ", "青アジ", "黄アジ"],
      "category": "青魚",
      "season": ["春", "夏", "秋"],
      "habitat": ["堤防", "船", "沿岸"],
      "popularity": 95,
      "source": "official"
    }
  ]
}
```

#### カテゴリー別収録数（v4.0.0時点）
- **白身魚**: 103種
- **青魚**: 34種
- **その他**: 25種
- **軟体動物**: 17種（イカ・タコ類）
- **甲殻類**: 16種（エビ・カニ類）
- **赤身魚**: 10種（マグロ類など）
- **根魚**: 10種
- **回遊魚**: 9種
- **エギング**: 6種
- **ルアー**: 1種

#### 主要追加魚種（v4.0.0で追加された126種）

**幼魚・成長段階（20種）**:
- ブリ系: ショッコ、ツバス、ワカシ、ネリゴ、ヤズ、イナダ、フクラギ、ハマチ、ワラサ、ガンド、メジロ
- スズキ系: セイゴ、フッコ
- マダイ系: チャリコ、カスゴ
- クロダイ系: カイズ、バリ
- サワラ系: サゴシ
- マグロ系: メジマグロ、ヨコワ

**小型魚・堤防魚（20種）**:
豆アジ、小サバ、小イワシ、ハゼ、キス、メゴチ、カサゴ、メバル、ベラ、カワハギ、ウミタナゴ、アイナメ、ソイ、ホウボウ、小イカ、新子、コハダ、サヨリ、ムツ、キンメ小鯛

**ハタ系・高級魚（21種）**:
クエ、アラ、マハタ、アカハタ、キジハタ、クサビ、イシガキダイ、イシダイ、ヒラメ、ソゲ、マコガレイ、カレイ、キンメダイ、ノドグロ、ハタハタ、タチウオ、カマス、シマアジ、カンパチ、ショウゴ、ヒラマサ

**イカ・タコ類（9種）**:
アオリイカ、スルメイカ、ヤリイカ、コウイカ、ケンサキイカ、ホタルイカ、マダコ、イイダコ、ミズダコ

**淡水魚（12種）**:
イワナ、ヤマメ、アマゴ、ニジマス、アユ、ブラックバス、ブルーギル、ナマズ、ライギョ、コイ、フナ、ウナギ

**マグロ類（5種）**:
メバチマグロ、キハダマグロ、ビンチョウマグロ、ミナミマグロ、メジマグロ/ヨコワ

**甲殻類（8種）**:
アマエビ、クルマエビ、シャコ、カニ、タラバガニ、ズワイガニ、ケガニ、イセエビ

**その他人気魚種（40種以上）**:
カツオ、ソウダガツオ、サンマ、メジナ、クロメジナ、イサキ、ホッケ、トラフグ、クサフグ、ショウサイフグ、アナゴ、ウツボ、オニオコゼ、ハオコゼ、ボラ、イナッコ、コノシロ、シイラ、トビウオ、メヒカリ、エソ、ギンポ、ドンコ、イシモチ、ニベ、ムラソイなど

### 検索アルゴリズム

#### 1. インデックス構築

```typescript
class FishSpeciesSearchEngine {
  private species: Map<string, FishSpecies>;
  private prefixIndex: Map<string, string[]>;

  constructor(speciesData: FishSpecies[]) {
    this.buildIndex(speciesData);
  }

  private buildIndex(data: FishSpecies[]): void {
    this.species = new Map(data.map(s => [s.id, s]));
    this.prefixIndex = new Map();

    data.forEach(species => {
      const searchTerms = [
        species.standardName,
        ...species.aliases,
        ...species.regionalNames
      ];

      searchTerms.forEach(term => {
        const normalized = this.normalize(term);

        // 1-3文字の前方一致インデックス
        for (let i = 1; i <= Math.min(normalized.length, 3); i++) {
          const prefix = normalized.substring(0, i);

          if (!this.prefixIndex.has(prefix)) {
            this.prefixIndex.set(prefix, []);
          }

          const ids = this.prefixIndex.get(prefix)!;
          if (!ids.includes(species.id)) {
            ids.push(species.id);
          }
        }
      });
    });
  }

  // カタカナ→ひらがな正規化
  private normalize(text: string): string {
    return text
      .replace(/[ァ-ン]/g, s =>
        String.fromCharCode(s.charCodeAt(0) - 0x60)
      )
      .toLowerCase()
      .trim();
  }

  // 検索実行
  search(query: string, limit: number = 10): FishSpecies[] {
    if (!query) return this.getPopular(limit);

    const normalized = this.normalize(query);
    const matchedIds = this.prefixIndex.get(normalized) || [];

    let results = matchedIds
      .map(id => this.species.get(id)!)
      .filter(Boolean);

    // 人気度でソート
    results.sort((a, b) => b.popularity - a.popularity);

    return results.slice(0, limit);
  }

  private getPopular(limit: number): FishSpecies[] {
    return Array.from(this.species.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }
}
```

**パフォーマンス**:
- インデックス構築: 200種で < 10ms
- 検索実行: < 1ms（Map検索 O(1））
- メモリ使用量: ~500KB（200種の場合）

#### 2. UIコンポーネント仕様

```typescript
interface FishSpeciesAutocompleteProps {
  value: string;
  onChange: (species: FishSpecies | null, inputValue: string) => void;
  placeholder?: string;
}

// 機能
- リアルタイム検索（入力1文字から）
- キーボード操作（↑↓Enter Escape）
- マウス/タッチ操作
- 空入力時は人気魚種Top10表示
- ローディング状態表示
- アクセシビリティ対応（ARIA属性）

// UI要素
- 入力フィールド
- サジェストリスト（最大10件）
  - 魚種アイコン（オプション）
  - 標準和名（太字）
  - 学名（グレー小文字）
  - カテゴリバッジ
```

### 実装計画

#### Phase 1: 基本実装（2-3日）

1. **データ準備**
   - [ ] WEB魚図鑑から頻出200種のリスト作成
   - [ ] JSON形式でデータ構造化
   - [ ] エイリアス・地方名の追加
   - [ ] 学名の補完（FishBase API）

2. **検索エンジン実装**
   - [ ] `FishSpeciesSearchEngine` クラス
   - [ ] インデックス構築ロジック
   - [ ] 正規化・検索アルゴリズム
   - [ ] ユニットテスト

3. **UIコンポーネント**
   - [ ] `FishSpeciesAutocomplete` コンポーネント
   - [ ] キーボード操作対応
   - [ ] スタイリング（モダンデザイン）
   - [ ] アクセシビリティ

4. **既存フォーム統合**
   - [ ] `FishingRecordForm` の魚種入力を置き換え
   - [ ] バリデーション調整（標準和名のみ許可）
   - [ ] 既存データのマイグレーション検討

#### Phase 2: 拡張機能（1-2日）

5. **拡張データ対応**
   - [ ] IndexedDBへの保存・読み込み
   - [ ] 定期的なデータ更新機能

6. **ユーザー登録種**
   - [ ] カスタム魚種追加UI
   - [ ] ユーザー登録種の管理画面

7. **統計機能連携**
   - [ ] 魚種別集計の正確性向上
   - [ ] 魚種カテゴリ別分析

### 期待効果

```typescript
{
  before: {
    入力例: ["アジ", "あじ", "鯵", "マアジ", "ホンアジ"],
    問題: "5つの異なる魚種として記録される",
    統計: "不正確（分散してカウント）",
    検索: "「アジ」で検索しても「マアジ」が見つからない"
  },

  after: {
    入力: "「あ」と入力 → サジェスト「マアジ」を選択",
    記録: "すべて「マアジ」として統一",
    統計: "正確（1つの魚種として集計）",
    検索: "表記によらず確実に検索可能",
    UX: "入力が楽（1-2文字で候補表示）"
  },

  効果測定: {
    入力時間: "30秒 → 5秒（6倍高速化）",
    データ品質: "表記揺れ100% → 0%",
    統計精度: "向上（魚種別集計が正確に）"
  }
}
```

### ユーザー入力バリデーション仕様（2025年10月25日追加）

```typescript
interface UserSpeciesValidationRules {
  standardName: {
    minLength: 2,              // 最小2文字
    maxLength: 20,             // 最大20文字
    pattern: /^[ぁ-んァ-ヶー一-龠々]+$/,  // 日本語のみ
    forbiddenWords: [          // 禁止語リスト
      "テスト", "test", "あああ", "zzz"
    ]
  },

  maxUserSpecies: 100,         // ユーザーあたり100種まで

  sanitization: {
    trim: true,                // 前後の空白削除
    removeSpecialChars: false  // 特殊文字は保持
  },

  errorMessages: {
    TOO_SHORT: "魚種名は2文字以上で入力してください",
    TOO_LONG: "魚種名は20文字以内で入力してください",
    INVALID_PATTERN: "日本語（ひらがな・カタカナ・漢字）で入力してください",
    FORBIDDEN_WORD: "不適切な単語が含まれています",
    MAX_SPECIES_REACHED: "登録可能な魚種数の上限（100種）に達しています",
    DUPLICATE_NAME: "この魚種名は既に登録されています"
  }
}
```

**実装例**:
```typescript
function validateUserSpecies(input: string): UserSpeciesValidationResult {
  const trimmed = input.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: { code: 'TOO_SHORT', message: '...' } };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: { code: 'TOO_LONG', message: '...' } };
  }

  if (!/^[ぁ-んァ-ヶー一-龠々]+$/.test(trimmed)) {
    return { valid: false, error: { code: 'INVALID_PATTERN', message: '...' } };
  }

  const forbiddenWords = ["テスト", "test", "あああ"];
  if (forbiddenWords.some(word => trimmed.includes(word))) {
    return { valid: false, error: { code: 'FORBIDDEN_WORD', message: '...' } };
  }

  return { valid: true, sanitizedValue: trimmed };
}
```

### データ取得コンプライアンス要件（2025年10月25日追加）

**Phase 0: データソース確認（実装前必須）**

```typescript
interface DataAcquisitionCompliance {
  source: {
    name: "WEB魚図鑑",
    url: "https://zukan.com/fish",
    robotsTxtUrl: "https://zukan.com/robots.txt",
    termsOfServiceUrl: "https://zukan.com/terms" // 要確認
  },

  compliance: {
    // ✅ 実装前チェックリスト
    robotsTxtChecked: false,        // → 必ず確認
    termsOfServiceChecked: false,   // → 必ず確認
    permissionGranted: false,       // → 可能なら運営者に許可依頼
    permissionMethod: "email"       // 問い合わせ方法
  },

  rateLimit: {
    intervalMs: 1000,              // 1秒1リクエスト
    maxConcurrent: 1,              // 並列実行なし
    userAgent: "FishingRecordApp/1.0 (https://your-app.com; contact@your-app.com)"
  },

  dataHandling: {
    attribution: "データ提供: WEB魚図鑑 (https://zukan.com/fish)",
    displayLocation: "設定画面 > データソース情報",
    updateFrequency: "年1回以下",
    manualReview: "全データの手動確認・品質チェック"
  }
}
```

**推奨取得フロー**:
1. robots.txt確認（クローリング許可の確認）
2. 利用規約確認（データ利用条項の確認）
3. 運営者へ問い合わせ（可能な場合）
4. 代替案検討（許可が得られない場合は手動構築）

### 低スペック端末対応（2025年10月25日追加）

**対象デバイス**:
- iPhone SE 第1世代（2016年、2GB RAM）
- Android Go版（1GB RAM）
- 古いAndroid端末（Android 8.0以下）

**パフォーマンス目標（緩和版）**:
```typescript
interface LowSpecDevicePerformance {
  detection: {
    // navigator.deviceMemory API使用
    maxMemoryGB: 2,
    maxCpuCores: 2,
    userAgentPatterns: [
      /iPhone SE/i,
      /Android.*Go/i
    ]
  },

  performanceTargets: {
    indexBuildMs: 50,     // 通常10ms → 低スペック50ms
    searchMs: 5,          // 通常1ms → 低スペック5ms
    uiRenderMs: 100       // 通常50ms → 低スペック100ms
  },

  limitations: {
    maxSearchResults: 5,         // 通常10件 → 低スペック5件
    enableVirtualScroll: true,   // 仮想スクロール有効化
    disableImages: true          // 魚種画像の読み込み無効化
  }
}
```

**実装例**:
```typescript
function detectLowSpecDevice(): boolean {
  // メモリ容量チェック（Chrome/Edge対応）
  if ('deviceMemory' in navigator && navigator.deviceMemory <= 2) {
    return true;
  }

  // CPU コア数チェック
  if ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency <= 2) {
    return true;
  }

  // User-Agent チェック
  const ua = navigator.userAgent;
  if (/iPhone SE/i.test(ua) || /Android.*Go/i.test(ua)) {
    return true;
  }

  return false;
}

// 使用例
const isLowSpec = detectLowSpecDevice();
const searchLimit = isLowSpec ? 5 : 10;
const enableImages = !isLowSpec;
```

## 🎨 UI/UXデザイン仕様

### 2024年モダンデザインシステム

#### カラーパレット
```css
:root {
  /* プライマリ：海をイメージした深いブルー */
  --primary-50: #E3F2FD;
  --primary-100: #BBDEFB;
  --primary-500: #1A73E8; /* メイン */
  --primary-700: #0D47A1;
  --primary-900: #082F6B;

  /* セカンダリ：夕焼けオレンジ */
  --secondary-500: #FF8A65;
  --secondary-600: #FF7043;

  /* セマンティックカラー */
  --success: #00C853;   /* 釣果成功 */
  --warning: #FFB300;   /* 注意 */
  --error: #D32F2F;     /* エラー */
  --info: #0288D1;      /* 情報 */

  /* サーフェス */
  --surface: #FFFFFF;
  --background: #FAFBFC;
  --text-primary: #202124;
  --text-secondary: #5F6368;
  --text-disabled: #9AA0A6;
}
```

#### タイポグラフィシステム
```css
/* システムフォント */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

/* 見出し */
.typography-headline: { font-weight: 600; font-size: 32px; line-height: 1.25; }
.typography-title: { font-weight: 600; font-size: 20px; line-height: 1.3; }
.typography-subtitle: { font-weight: 500; font-size: 16px; line-height: 1.4; }

/* 本文 */
.typography-body: { font-weight: 400; font-size: 16px; line-height: 1.5; }
.typography-caption: { font-weight: 500; font-size: 14px; line-height: 1.4; }
.typography-label: { font-weight: 600; font-size: 12px; line-height: 1.3; }
```

#### コンポーネントシステム
- **モダンカード**: 16px border-radius、エレベーション対応
- **ボトムナビゲーション**: モバイルファースト設計
- **FABボタン**: プライマリアクション用
- **インタラクティブフォーム**: リアルタイムバリデーション

#### 📸 画像オーバーレイカードレイアウト（Instagram風デザイン）

**設計コンセプト**: 写真を主役にしたビジュアルファースト設計

##### レイアウト構造
```
┌───────────────────────────────────┐
│                                   │
│         [釣果写真]                │
│      （中央配置・原寸表示）        │
│                                   │
│  ┌─────────────────────────────┐  │
│  │ 🐟 アオリイカ               │  │  ← 半透明背景
│  │ 📍 山口県長門市             │  │     (rgba(0,0,0,0.6))
│  │ 📅 2025/10/4               │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
```

##### デザイン仕様

**画像表示（2層構造 - 背景ぼかし + 前景画像）**:

**コンテナ**:
- 高さ: レスポンシブ対応
  - モバイル: 280px
  - タブレット/デスクトップ: 350px
  - 大画面: 400px
- 中央配置: flexbox (align-items: center, justify-content: center)
- `position: relative` (レイヤー管理用)
- `overflow: hidden` (ぼかし画像のはみ出し防止)

**背景レイヤー（ぼかし画像）**:
```typescript
style={{
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 0,
  filter: 'blur(20px)',
  transform: 'scale(1.1)',  // ぼかしの端が見えないように拡大
  opacity: 0.6,
  objectFit: 'cover'  // コンテナ全体を埋める
}}
```

**前景レイヤー（オリジナル画像）**:
```typescript
style={{
  position: 'relative',
  zIndex: 1,
  maxWidth: '100%',
  maxHeight: '100%',
  width: 'auto',
  height: 'auto',
  objectFit: 'contain'  // アスペクト比維持
}}
```

**利点**:
- 余白が目立たなくなり、視覚的な一体感が生まれる
- Instagram/Pinterest風のモダンなデザイン
- 画像の向き（縦長/横長）に関わらず美しく表示

**パフォーマンス考慮**:
- 同じ画像を2回レンダリングするため、メモリ使用量が約2倍
- CSS `filter: blur()` はGPUアクセラレーション対応で高速
- モバイルでのパフォーマンス影響は最小限（実測値: < 16ms/frame）

**フォールバック（画像がない場合）**:
- 背景色: `colors.surface.secondary`
- アイコン表示: 魚アイコン 🐟 + "写真なし"テキスト

**情報オーバーレイ** (将来実装):
- 配置: 画像下部に固定
- 背景: `rgba(0, 0, 0, 0.6)` + backdrop-filter: blur(8px)
- パディング: 12px
- テキスト色: white（視認性確保）
- グラデーション: bottom → top fade

**バッジ要素**:
- サイズバッジ: 右上配置、半透明白背景
- 日付バッジ: 右上配置、半透明黒背景
- アクションボタン: 右下配置、円形FAB

##### インタラクション

**ホバー効果**:
```typescript
onMouseEnter: {
  transform: 'translateY(-4px)',
  boxShadow: '0 4px 8px 3px rgba(60,64,67,.15)',
  transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}
```

**クリック動作**:
- カード全体: 詳細モーダルを開く
- アクションボタン: 編集・削除（イベント伝播停止）

##### 実装ファイル
- **コンポーネント**: `/src/ModernApp.tsx` (ModernRecordCard)
- **スタイリング**: CSS-in-JS (インラインスタイル)
- **レスポンシブ**: PhotoGrid レイアウト (auto-fill, minmax(280px, 1fr))

##### パフォーマンス最適化
- 画像: Blob URL経由で表示（IndexedDB）
- 遅延読み込み: useEffect + cleanup (URL.revokeObjectURL)
- メモリ管理: コンポーネントアンマウント時に Blob URL 解放

##### アクセシビリティ
- `alt` 属性: `${fishSpecies}の記録`
- キーボードナビゲーション: フォーカス可能
- スクリーンリーダー: ARIA labels 対応

##### 状態管理とライフサイクル

**状態定義**:
```typescript
const [photoUrl, setPhotoUrl] = useState<string | null>(null);
const [photoLoading, setPhotoLoading] = useState(true);
```

**画像読み込みフロー**:
```
1. record.photoId の存在チェック
   ├─ なし → photoLoading: false → フォールバック表示
   └─ あり → photoService.getPhotoById() 実行

2. 画像取得成功
   ├─ Blob → URL.createObjectURL() → setPhotoUrl()
   └─ ローディング終了

3. コンポーネントアンマウント
   └─ URL.revokeObjectURL() でメモリ解放
```

##### エラーハンドリング

**画像読み込み状態別の表示**:

| 状態 | 条件 | 表示内容 |
|------|------|----------|
| Loading | `photoLoading === true` | スピナー（200px高さ、中央配置） |
| Success | `photoUrl !== null` | 画像表示（contain、中央配置） |
| Error | `photoError \|\| !photoUrl` | 魚アイコン 🐟 + "写真なし"テキスト |
| No Photo | `!record.photoId` | 同上 |

**スピナースタイル**:
```css
width: 40px;
height: 40px;
border: 3px solid colors.border.light;
border-top: 3px solid colors.primary[500];
border-radius: 50%;
animation: spin 1s linear infinite;
```

##### カードコンテナの完全なスタイル仕様

```typescript
// 外側カードコンテナ (PhotoCard wrapper)
style={{
  borderRadius: '16px',
  overflow: 'hidden',
  backgroundColor: colors.surface.primary,
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
  border: `1px solid ${colors.border.light}`,
  padding: '16px',
  minHeight: '160px'
}}

// 画像コンテナ
style={{
  width: '100%',
  height: '200px',
  backgroundColor: colors.surface.secondary,
  borderRadius: '12px',
  marginBottom: '12px',
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}}
```

##### 情報表示: 現在の実装 vs 将来計画

**現在の実装（2025年10月15日）**:
- 情報エリア: 画像の**下**に配置
- レイアウト: 垂直スタック
- 魚種: h3、1.25rem、semibold
- 場所: アイコン + テキスト、0.75rem
- 日付: アイコン + テキスト、0.75rem

**将来のオーバーレイ実装**:
- 情報エリア: 画像の**上**にオーバーレイ
- 背景: `rgba(0,0,0,0.6)` + `backdrop-filter: blur(8px)`
- 配置: 画像下部に固定（position: absolute, bottom: 0）
- テキスト: white（視認性確保）
- グラデーション: bottom to top fade

##### レスポンシブグリッドの詳細仕様

**PhotoGrid レイアウト**:
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
gap: 16px;
```

**ブレークポイント別の表示**:
- **Mobile (< 768px)**: 1列、カードが画面幅に合わせて伸縮
- **Tablet (768-1024px)**: 2-3列、minmax(280px, 1fr)
- **Desktop (> 1024px)**: 3-4列、最大4列まで

**最小/最大サイズ**:
- 最小幅: 280px
- 最大幅: 無制限（グリッドセルに従う）
- 画像高さ: 固定200px

##### パフォーマンス指標

**定量的目標**:
- 画像読み込み: < 500ms (IndexedDB → Blob URL)
- カードレンダリング: < 16ms (60fps維持)
- メモリ使用量: < 10MB per image
- 一覧表示: 100件でも60fps維持
- Blob URL解放: コンポーネントアンマウント時に即座

**最適化手法**:
- Lazy loading: Intersection Observer（将来実装）
- Virtual scrolling: 大量データ時（将来実装）
- Image compression: 保存時に実施済み

##### コンポーネント階層と既存コンポーネントとの関係

```
ModernApp.tsx
├── HomeContent / ListContent
│   └── PhotoGrid (レイアウトコンポーネント)
│       └── ModernRecordCard ★今回実装
│           └── PhotoCard (ラッパー)
│               ├── 画像コンテナ (200px)
│               │   └── img or スピナー or フォールバック
│               └── 情報エリア (padding: 16px)
│                   ├── h3: 魚種
│                   ├── div: 場所（Icons.Location）
│                   └── div: 日付（Icons.Date）

既存コンポーネント（非推奨・段階的廃止予定）:
├── PhotoBasedRecordCard: 古いデザイン、SimplePhotoListで使用
├── FishingRecordCard: リストビュー用、別用途
└── SimplePhotoList: PhotoBasedRecordCardのコンテナ
```

**マイグレーション計画**:
1. ✅ ModernRecordCard実装（2025年10月15日完了）
2. ✅ ModernApp で ModernRecordCard使用（現在）
3. ⏳ SimplePhotoList を ModernRecordCard対応に更新
4. ⏳ PhotoBasedRecordCard を非推奨化

### 🎯 画面構成の改善（2025年10月15日設計）

#### 設計コンセプト

**課題**: 現状の「ホーム」と「記録一覧」の役割が曖昧で、ユーザー体験が重複している

**解決策**: 明確な役割分担によるモダンな2画面構成
- **ホーム画面**: データインサイト・統計ダッシュボード
- **記録一覧画面**: 全記録の探索・月別閲覧

#### 📱 ホーム画面（ダッシュボード）

**役割**: インサイトと概要表示

##### レイアウト構造
```
┌─────────────────────────────────────────────────┐
│ 釣果記録                          [🎯 25件]     │
├─────────────────────────────────────────────────┤
│                                                 │
│  📊 統計カード（4列グリッド）                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│  │   25     │ │    8     │ │    5     │ │  12  ││
│  │  総記録  │ │  魚種数  │ │  釣り場  │ │ 今月 ││
│  └──────────┘ └──────────┘ └──────────┘ └──────┘│
│                                                 │
│  🏆 今月のベストキャッチ                         │
│  ┌───────────────────────────────────────────┐   │
│  │ [大きな写真カード - Instagram風]            │   │
│  │ アジ 35cm                                   │   │
│  │ 📍 山口県長門市 📅 10月12日                 │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
│  📈 釣果トレンド（簡易グラフ）                   │
│  ┌───────────────────────────────────────────┐   │
│  │        ▁▃▅▂▆▄▃                             │   │
│  │  9月  10月  11月  12月  1月  2月  3月       │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
│  🌊 今日の潮汐情報（将来実装）                   │
│  ┌───────────────────────────────────────────┐   │
│  │ 大潮 | 満潮 06:24 (1.8m)                    │   │
│  │      | 干潮 12:45 (0.2m)                    │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

##### 実装機能

**Phase 1（優先実装）**:
1. **統計カード強化**
   ```typescript
   interface StatCard {
     value: number | string;
     label: string;
     icon: ReactNode;
     color: string;
   }
   ```
   - 総記録数（全期間）
   - 魚種数（ユニーク）
   - 釣り場数（ユニーク）
   - 今月の記録数

2. **今月のベストキャッチ表示**
   - 今月で最大サイズの魚
   - ModernRecordCard を使用
   - サイズがない場合は最新記録を表示

**Phase 2（段階実装）**:
3. ✅ **釣果トレンドグラフ**（2025年10月15日実装完了）
   - 月ごとの釣果数を棒グラフまたは折れ線グラフで表示
   - 直近6ヶ月のデータ自動集計
   - Recharts ライブラリ使用
   - カスタムツールチップ対応
   - レスポンシブ対応（固定サイズ方式で ResponsiveContainer バグ回避）

**Phase 3（追加実装予定）**:
4. **最近の記録セクション**
   - 最新3〜5件の記録をコンパクトカード形式で表示
   - 各カードに写真サムネイル、魚種、場所、日付を表示
   - 「もっと見る」ボタンで記録一覧画面へ遷移
   - レスポンシブ対応: モバイル1列、タブレット2列、デスクトップ3列

5. **人気の釣り場ランキング**
   - 記録数が多い釣り場のトップ3を表示
   - ランキングカード形式: 順位、釣り場名、記録数
   - アイコン: 🥇🥈🥉
   - クリックで該当釣り場でフィルタリングした記録一覧へ遷移

6. **魚種別の記録数**
   - 円グラフまたは横棒グラフで魚種別の記録数を可視化
   - トップ5〜8魚種を表示、残りは「その他」に集約
   - Recharts ライブラリ使用（PieChart または BarChart）
   - カスタムツールチップで詳細表示
   - クリックで該当魚種でフィルタリングした記録一覧へ遷移

7. **潮汐統計セクション**（新規追加予定）
   - GPS座標を持つ記録の潮汐情報を集計・分析
   - 満潮・干潮タイミング別の釣果統計（満潮前後、干潮前後、上げ潮、下げ潮）
   - 大潮・中潮・小潮・長潮・若潮別の釣果統計
   - 横棒グラフまたは円グラフで可視化
   - 潮汐計算サービス（TideCalculationService）を使用
   - 釣果パターン分析による釣行時間の最適化提案

**Phase 4（将来実装）**:
8. **潮汐プレビュー**
   - 潮汐システム実装後に統合
   - 今日の満潮・干潮時刻

##### 釣果トレンドグラフ実装詳細（Phase 2-1完了）

**実装日**: 2025年10月15日

**コンポーネント**: `/src/components/chart/TrendChart.tsx`

**データ型定義**:
```typescript
export interface TrendChartData {
  month: string;      // '10月' または '2024/10'
  count: number;      // 釣果数
  label?: string;     // オプションのラベル（ツールチップ用）
}

export interface TrendChartProps {
  data: TrendChartData[];
  type?: 'line' | 'bar';           // グラフ種類
  width?: number | string;
  height?: number;                 // デフォルト: 250px
  showGrid?: boolean;              // グリッド表示（デフォルト: true）
  title?: string;                  // グラフタイトル
  color?: string;                  // メインカラー（デフォルト: primary[500]）
}
```

**技術仕様**:
- **ライブラリ**: Recharts（v2.x）
- **グラフタイプ**: BarChart（棒グラフ）、LineChart（折れ線グラフ）
- **レイアウト方式**: 固定サイズ（ResponsiveContainer不使用）
  - 理由: ResponsiveContainerのバグで `width: 0px; height: 0px` になる問題を回避
  - 解決策: BarChart/LineChart に直接 width, height を指定
- **データ集計**: 最近6ヶ月分のデータを Map ベースで集計
- **スタイリング**: Material Design 3.0準拠

**カスタムツールチップ**:
```typescript
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: colors.surface.primary,
        padding: '12px',
        border: `1px solid ${colors.border.light}`,
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <p style={{ fontWeight: '600' }}>{payload[0].payload.month}</p>
        <p style={{ color: colors.primary[600] }}>
          🐟 {payload[0].value}件の記録
        </p>
      </div>
    );
  }
  return null;
};
```

**軸設定**:
- **X軸**: 月ラベル（'8月', '9月', '10月'等）、フォントサイズ12px
- **Y軸**: 釣果数、整数のみ表示（`allowDecimals: false`）、domain: [0, 'auto']
- **グリッド**: 水平線のみ表示（`vertical={false}`）、破線スタイル

**データ生成ロジック（ModernApp.tsx）**:
```typescript
const generateTrendData = (): TrendChartData[] => {
  const monthlyData = new Map<string, number>();
  const now = new Date();

  // 最近6ヶ月分の月を生成（0で初期化）
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    monthlyData.set(yearMonth, 0);
  }

  // 記録を各月にカウント
  records.forEach(record => {
    const recordDate = new Date(record.date);
    const yearMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData.has(yearMonth)) {
      monthlyData.set(yearMonth, (monthlyData.get(yearMonth) || 0) + 1);
    }
  });

  // 配列に変換してラベル付け
  return Array.from(monthlyData.entries()).map(([yearMonth, count]) => {
    const [year, month] = yearMonth.split('-').map(Number);
    return {
      month: `${month}月`,
      count,
      label: `${year}年${month}月`,
    };
  });
};
```

**統合方法（HomeContent内）**:
```typescript
{/* 釣果トレンドグラフ */}
{records.length > 0 && (
  <ModernCard variant="outlined" size="md" style={{ marginBottom: '24px' }}>
    <TrendChart
      data={trendData}
      type="bar"
      height={220}
      title="📈 釣果トレンド（最近6ヶ月）"
      color={colors.primary[500]}
    />
  </ModernCard>
)}
```

**空データ対応**:
```typescript
if (!data || data.length === 0) {
  return (
    <div style={{
      width: '100%',
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.secondary,
      borderRadius: '12px',
      color: colors.text.secondary,
    }}>
      データがありません
    </div>
  );
}
```

**既知の問題と解決**:
- **問題**: ResponsiveContainer使用時にグラフが表示されない（width: 0px, height: 0px）
- **原因**: Rechartsの既知のバグ（特定のレイアウトコンテキストで寸法計算失敗）
- **解決策**: ResponsiveContainerを削除し、BarChart/LineChartに直接サイズ指定
  ```typescript
  // 修正前（動作しない）
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>...</BarChart>
  </ResponsiveContainer>

  // 修正後（動作する）
  <BarChart data={data} width={1200} height={height} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
    ...
  </BarChart>
  ```

**パフォーマンス**:
- 描画時間: < 50ms
- データ集計: Map使用で O(n)
- メモリ使用: 最小限（6ヶ月分のデータのみ保持）

**将来の拡張計画**:
- [ ] グラフのインタラクティブ性向上（クリック→該当月の詳細表示）
- [ ] 期間選択機能（3ヶ月/6ヶ月/12ヶ月）
- [ ] 魚種別トレンド表示
- [ ] エクスポート機能（画像保存）

##### Phase 3 追加機能実装詳細（設計）

**実装予定**: Phase 3（ホーム画面の統計・可視化強化）

###### 4. 最近の記録セクション

**目的**: ユーザーが最新の釣果を一目で確認できるよう、コンパクトなカード形式で表示

**データ取得ロジック**:
```typescript
// 最新5件の記録を取得（日付降順）
const recentRecords = useMemo(() => {
  return [...records]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}, [records]);
```

**UIコンポーネント**:
```typescript
const RecentRecordsSection: React.FC = () => {
  const recentRecords = getRecentRecords(records, 5);

  if (recentRecords.length === 0) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h2 style={{
          ...textStyles.headline.small,
          color: colors.text.primary,
          margin: 0,
        }}>
          📝 最近の記録
        </h2>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: `1px solid ${colors.primary[500]}`,
            backgroundColor: 'transparent',
            color: colors.primary[500],
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          もっと見る →
        </button>
      </div>

      {/* レスポンシブグリッド: モバイル1列、タブレット2列、デスクトップ3列 */}
      <ResponsiveGrid
        columns={{ mobile: 1, tablet: 2, desktop: 3 }}
        gap="12px"
      >
        {recentRecords.map(record => (
          <CompactRecordCard
            key={record.id}
            record={record}
            onClick={() => handleRecordClick(record)}
          />
        ))}
      </ResponsiveGrid>
    </div>
  );
};

// コンパクトカードコンポーネント（小さめのデザイン）
const CompactRecordCard: React.FC<{
  record: FishingRecord;
  onClick: () => void;
}> = ({ record, onClick }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    // 写真読み込みロジック（ModernRecordCardと同様）
  }, [record.photoId]);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        backgroundColor: colors.surface.primary,
        borderRadius: '12px',
        border: `1px solid ${colors.border.light}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* サムネイル画像 */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: colors.surface.secondary,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={record.fishSpecies}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <span style={{ fontSize: '2rem' }}>🐟</span>
        )}
      </div>

      {/* 情報 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{
          ...textStyles.body.large,
          fontWeight: '600',
          color: colors.text.primary,
          margin: '0 0 4px 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {record.fishSpecies}
        </h4>
        <p style={{
          ...textStyles.body.small,
          color: colors.text.secondary,
          margin: '0 0 4px 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          📍 {record.location}
        </p>
        <p style={{
          ...textStyles.body.small,
          color: colors.text.secondary,
          margin: 0,
        }}>
          📅 {formatDate(record.date)}
        </p>
      </div>
    </div>
  );
};
```

**レスポンシブ対応**:
- **モバイル (< 768px)**: 1列、横並びカード（画像80px + 情報）
- **タブレット (768-1024px)**: 2列グリッド
- **デスクトップ (> 1024px)**: 3列グリッド

**インタラクション**:
- カードクリック → 詳細モーダル表示
- 「もっと見る」ボタン → 記録一覧画面へ遷移（`setActiveTab('list')`）

---

###### 5. 人気の釣り場ランキング

**目的**: よく訪れる釣り場を可視化し、ユーザーに有益なインサイトを提供

**データ集計ロジック**:
```typescript
interface LocationRanking {
  location: string;
  count: number;
  rank: number;
}

const generateLocationRanking = (): LocationRanking[] => {
  // 場所ごとの記録数をカウント
  const locationCounts = new Map<string, number>();

  records.forEach(record => {
    const count = locationCounts.get(record.location) || 0;
    locationCounts.set(record.location, count + 1);
  });

  // カウント降順でソートし、トップ3を取得
  const sorted = Array.from(locationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return sorted.map(([location, count], index) => ({
    location,
    count,
    rank: index + 1,
  }));
};
```

**UIコンポーネント**:
```typescript
const LocationRankingSection: React.FC = () => {
  const rankings = useMemo(() => generateLocationRanking(), [records]);

  if (rankings.length === 0) return null;

  const rankIcons = ['🥇', '🥈', '🥉'];

  return (
    <ModernCard variant="outlined" size="md" style={{ marginBottom: '24px' }}>
      <h2 style={{
        ...textStyles.headline.small,
        color: colors.text.primary,
        marginBottom: '16px',
      }}>
        🏆 人気の釣り場ランキング
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {rankings.map((ranking) => (
          <div
            key={ranking.location}
            onClick={() => {
              // 記録一覧画面へ遷移し、該当釣り場でフィルタ
              setActiveTab('list');
              // TODO: フィルタ状態を設定する処理を追加
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              backgroundColor: colors.surface.secondary,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary[50];
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface.secondary;
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            {/* ランクアイコン */}
            <span style={{ fontSize: '2rem', flexShrink: 0 }}>
              {rankIcons[ranking.rank - 1]}
            </span>

            {/* 釣り場名と記録数 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                ...textStyles.body.large,
                fontWeight: '600',
                color: colors.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {ranking.location}
              </div>
              <div style={{
                ...textStyles.body.small,
                color: colors.text.secondary,
              }}>
                {ranking.count}件の記録
              </div>
            </div>

            {/* 矢印アイコン */}
            <span style={{
              color: colors.text.secondary,
              fontSize: '1.25rem',
              flexShrink: 0,
            }}>
              →
            </span>
          </div>
        ))}
      </div>
    </ModernCard>
  );
};
```

**インタラクション**:
- カードクリック → 記録一覧画面へ遷移し、該当釣り場でフィルタリング
- ホバー時のアニメーション（背景色変更 + 右へ移動）

---

###### 6. 魚種別の記録数（円グラフ）

**目的**: 釣果の魚種分布を視覚的に理解し、記録の多様性を把握

**データ集計ロジック**:
```typescript
interface SpeciesData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

const generateSpeciesChartData = (): SpeciesData[] => {
  // 魚種ごとの記録数をカウント
  const speciesCounts = new Map<string, number>();

  records.forEach(record => {
    const count = speciesCounts.get(record.fishSpecies) || 0;
    speciesCounts.set(record.fishSpecies, count + 1);
  });

  const totalRecords = records.length;

  // カウント降順でソート
  const sorted = Array.from(speciesCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  // トップ7を取得、残りは「その他」にまとめる
  const topSpecies = sorted.slice(0, 7);
  const othersCount = sorted.slice(7).reduce((sum, [, count]) => sum + count, 0);

  const colors = [
    colors.primary[500],
    colors.secondary[500],
    colors.accent[500],
    colors.semantic.success.main,
    colors.semantic.info.main,
    colors.semantic.warning.main,
    colors.semantic.error.main,
    colors.text.secondary, // その他
  ];

  const data: SpeciesData[] = topSpecies.map(([name, value], index) => ({
    name,
    value,
    percentage: Math.round((value / totalRecords) * 100),
    color: colors[index],
  }));

  if (othersCount > 0) {
    data.push({
      name: 'その他',
      value: othersCount,
      percentage: Math.round((othersCount / totalRecords) * 100),
      color: colors[7],
    });
  }

  return data;
};
```

**UIコンポーネント（Rechartsの PieChart 使用）**:
```typescript
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const SpeciesChartSection: React.FC = () => {
  const speciesData = useMemo(() => generateSpeciesChartData(), [records]);

  if (speciesData.length === 0) return null;

  return (
    <ModernCard variant="outlined" size="md" style={{ marginBottom: '24px' }}>
      <h2 style={{
        ...textStyles.headline.small,
        color: colors.text.primary,
        marginBottom: '16px',
      }}>
        🐠 魚種別の記録数
      </h2>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* 円グラフ */}
        <div style={{ width: '100%', height: '250px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={speciesData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percentage }) => `${name} (${percentage}%)`}
                labelLine={true}
              >
                {speciesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        backgroundColor: colors.surface.primary,
                        padding: '12px',
                        border: `1px solid ${colors.border.light}`,
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}>
                        <p style={{
                          ...textStyles.body.medium,
                          fontWeight: '600',
                          color: colors.text.primary,
                          margin: '0 0 4px 0',
                        }}>
                          {data.name}
                        </p>
                        <p style={{
                          ...textStyles.body.small,
                          color: colors.text.secondary,
                          margin: 0,
                        }}>
                          {data.value}件 ({data.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 凡例（クリック可能なリスト） */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '8px',
        }}>
          {speciesData.map((species) => (
            <div
              key={species.name}
              onClick={() => {
                // 記録一覧画面へ遷移し、該当魚種でフィルタ
                setActiveTab('list');
                // TODO: フィルタ状態を設定する処理を追加
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.surface.secondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* カラーインジケーター */}
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                backgroundColor: species.color,
                flexShrink: 0,
              }} />

              {/* 魚種名と記録数 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  ...textStyles.body.small,
                  fontWeight: '600',
                  color: colors.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {species.name}
                </div>
                <div style={{
                  ...textStyles.body.small,
                  color: colors.text.secondary,
                }}>
                  {species.value}件
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModernCard>
  );
};
```

**デザイン仕様**:
- **円グラフ**: トップ7魚種 + その他、カラフルな配色
- **ラベル**: 魚種名とパーセンテージを表示
- **カスタムツールチップ**: 魚種名、件数、パーセンテージ
- **クリック可能な凡例**: 各魚種をクリックで記録一覧へ遷移しフィルタリング

**代替案: 横棒グラフ（BarChart）**:
- モバイルでの視認性を優先する場合は横棒グラフも検討
- `<BarChart layout="vertical">` を使用

**パフォーマンス**:
- データ集計: Map使用で O(n)
- 描画時間: < 50ms
- メモ化: `useMemo` で再計算を最小化

---

###### 7. 潮汐統計セクション（新規設計）

**目的**: 釣果と潮汐の関係を分析し、最適な釣行タイミングをデータで提示

**データ集計ロジック**:
```typescript
interface TideStatistics {
  // 潮汐タイミング別統計
  tidePhaseStats: {
    beforeHigh: number;     // 満潮前（1時間前〜満潮）
    aroundHigh: number;     // 満潮時（満潮±15分）
    afterHigh: number;      // 満潮後（満潮〜1時間後）
    beforeLow: number;      // 干潮前（1時間前〜干潮）
    aroundLow: number;      // 干潮時（干潮±15分）
    afterLow: number;       // 干潮後（干潮〜1時間後）
    rising: number;         // 上げ潮（干潮→満潮の中間）
    falling: number;        // 下げ潮（満潮→干潮の中間）
  };

  // 潮名別統計
  tideTypeStats: {
    spring: number;         // 大潮
    moderate: number;       // 中潮
    neap: number;           // 小潮
    long: number;           // 長潮
    young: number;          // 若潮
  };

  // 最も釣果が多かったパターン
  bestTidePhase: string;
  bestTideType: string;

  // 統計対象の記録数
  totalRecordsWithTideData: number;
}

const calculateTideStatistics = async (records: FishingRecord[]): Promise<TideStatistics> => {
  const stats: TideStatistics = {
    tidePhaseStats: {
      beforeHigh: 0, aroundHigh: 0, afterHigh: 0,
      beforeLow: 0, aroundLow: 0, afterLow: 0,
      rising: 0, falling: 0
    },
    tideTypeStats: {
      spring: 0, moderate: 0, neap: 0, long: 0, young: 0
    },
    bestTidePhase: '',
    bestTideType: '',
    totalRecordsWithTideData: 0
  };

  // GPS座標を持つ記録のみを対象
  const recordsWithCoordinates = records.filter(r => r.coordinates);

  for (const record of recordsWithCoordinates) {
    try {
      // 潮汐計算サービスで潮汐情報を取得
      const { TideCalculationService } = await import('../services/tide/TideCalculationService');
      const tideService = new TideCalculationService();
      await tideService.initialize();

      const tideInfo = await tideService.calculateTideInfo(record.coordinates!, record.date);

      // 潮汐タイミングを判定
      const phase = determineTidePhase(record.date, tideInfo);
      stats.tidePhaseStats[phase]++;

      // 潮名を判定（tideTypeプロパティから）
      if (tideInfo.tideType) {
        stats.tideTypeStats[tideInfo.tideType]++;
      }

      stats.totalRecordsWithTideData++;
    } catch (error) {
      console.warn('潮汐計算エラー:', record.id, error);
    }
  }

  // 最も釣果が多かったパターンを特定
  stats.bestTidePhase = Object.entries(stats.tidePhaseStats)
    .reduce((a, b) => a[1] > b[1] ? a : b)[0];
  stats.bestTideType = Object.entries(stats.tideTypeStats)
    .reduce((a, b) => a[1] > b[1] ? a : b)[0];

  return stats;
};

// 潮汐タイミング判定関数
const determineTidePhase = (fishingTime: Date, tideInfo: TideInfo): keyof TideStatistics['tidePhaseStats'] => {
  const nextEvent = tideInfo.nextEvent;
  if (!nextEvent) return 'rising'; // デフォルト

  const timeDiff = (nextEvent.time.getTime() - fishingTime.getTime()) / (1000 * 60); // 分単位

  if (nextEvent.type === 'high') {
    if (timeDiff <= 15) return 'aroundHigh';
    if (timeDiff <= 60) return 'beforeHigh';
    return 'rising';
  } else {
    if (timeDiff <= 15) return 'aroundLow';
    if (timeDiff <= 60) return 'beforeLow';
    return 'falling';
  }
};
```

**UIコンポーネント**:
```typescript
const TideStatisticsSection: React.FC = () => {
  const [tideStats, setTideStats] = useState<TideStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTideStats = async () => {
      setLoading(true);
      const stats = await calculateTideStatistics(records);
      setTideStats(stats);
      setLoading(false);
    };
    loadTideStats();
  }, [records]);

  if (loading || !tideStats || tideStats.totalRecordsWithTideData === 0) {
    return null;
  }

  // 横棒グラフ用データ変換
  const tidePhaseData = Object.entries(tideStats.tidePhaseStats).map(([phase, count]) => ({
    name: getTidePhaseName(phase),
    value: count,
    percentage: Math.round((count / tideStats.totalRecordsWithTideData) * 100)
  }));

  const tideTypeData = Object.entries(tideStats.tideTypeStats).map(([type, count]) => ({
    name: getTideTypeName(type),
    value: count,
    percentage: Math.round((count / tideStats.totalRecordsWithTideData) * 100)
  }));

  return (
    <ModernCard variant="outlined" size="md" style={{ marginBottom: '24px' }}>
      <h2 style={{ ...textStyles.headline.small, color: colors.text.primary, marginBottom: '16px' }}>
        🌊 潮汐パターン分析
      </h2>

      {/* サマリー */}
      <div style={{
        backgroundColor: colors.primary[50],
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <p style={{ ...textStyles.body.medium, margin: '0 0 8px 0', color: colors.text.primary }}>
          💡 <strong>釣果が最も多かったタイミング</strong>
        </p>
        <p style={{ ...textStyles.body.large, margin: '0', color: colors.primary[700], fontWeight: '600' }}>
          {getTidePhaseName(tideStats.bestTidePhase)} × {getTideTypeName(tideStats.bestTideType)}
        </p>
        <p style={{ ...textStyles.body.small, margin: '8px 0 0 0', color: colors.text.secondary }}>
          {tideStats.totalRecordsWithTideData}件の記録から分析
        </p>
      </div>

      {/* 潮汐タイミング別グラフ */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ ...textStyles.body.large, fontWeight: '600', marginBottom: '12px' }}>
          ⏰ 潮汐タイミング別
        </h3>
        <BarChart
          layout="vertical"
          data={tidePhaseData}
          width={500}
          height={250}
        >
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={100} />
          <Tooltip />
          <Bar dataKey="value" fill={colors.primary[500]}>
            <LabelList dataKey="percentage" position="right" formatter={(value: number) => `${value}%`} />
          </Bar>
        </BarChart>
      </div>

      {/* 潮名別グラフ */}
      <div>
        <h3 style={{ ...textStyles.body.large, fontWeight: '600', marginBottom: '12px' }}>
          🌙 潮名別
        </h3>
        <BarChart
          layout="vertical"
          data={tideTypeData}
          width={500}
          height={180}
        >
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={80} />
          <Tooltip />
          <Bar dataKey="value" fill={colors.secondary[500]}>
            <LabelList dataKey="percentage" position="right" formatter={(value: number) => `${value}%`} />
          </Bar>
        </BarChart>
      </div>
    </ModernCard>
  );
};

// ラベル変換関数
const getTidePhaseName = (phase: string): string => {
  const names: Record<string, string> = {
    beforeHigh: '満潮前',
    aroundHigh: '満潮時',
    afterHigh: '満潮後',
    beforeLow: '干潮前',
    aroundLow: '干潮時',
    afterLow: '干潮後',
    rising: '上げ潮',
    falling: '下げ潮'
  };
  return names[phase] || phase;
};

const getTideTypeName = (type: string): string => {
  const names: Record<string, string> = {
    spring: '大潮',
    moderate: '中潮',
    neap: '小潮',
    long: '長潮',
    young: '若潮'
  };
  return names[type] || type;
};
```

**デザイン仕様**:
- **サマリーカード**: 最も釣果が多かったパターンをハイライト表示
- **横棒グラフ**: 視認性が高く、ラベルが長くても読みやすい
- **パーセンテージ表示**: 各項目の右側に%表示
- **カラースキーム**: 潮汐タイミングは primary、潮名は secondary
- **空状態処理**: GPS座標を持つ記録が0件の場合は非表示

**パフォーマンス考慮**:
- **非同期処理**: 潮汐計算は重いため、useEffectで非同期実行
- **キャッシング**: 計算結果をステートに保存し、再計算を最小化
- **エラーハンドリング**: 個別レコードの計算エラーは警告のみで処理続行
- **進捗表示**: 計算中はローディングスピナーを表示

**注意事項**:
- GPS座標を持たない記録は集計対象外
- 潮汐計算には時間がかかるため、初回表示に数秒かかる可能性あり
- TideCalculationService の初期化が必要

---

**Phase 3 実装の配置順序（HomeContent内）**:
```
1. 統計カード（4列グリッド）
2. 今月のベストキャッチ
3. 釣果トレンドグラフ（Phase 2実装済み）
4. 最近の記録セクション ← NEW (実装済み)
5. 人気の釣り場ランキング ← NEW (実装済み)
6. 魚種別の記録数（円グラフ） ← NEW (実装済み)
7. 潮汐統計セクション ← NEW (設計完了・実装予定)
```

**実装ファイル構成**:
```
/src/components/home/
├── RecentRecordsSection.tsx       (実装済み)
├── LocationRankingSection.tsx     (実装済み)
├── SpeciesChartSection.tsx        (実装済み)
├── TideStatisticsSection.tsx      (設計完了・実装予定)
└── CompactRecordCard.tsx          (実装済み)
```

**共通インタラクション**:
- すべてのセクションから記録一覧画面へ遷移可能
- フィルター状態を適切に設定して詳細を表示
- ホバー時のフィードバック（アニメーション）

##### UIコンポーネント

```typescript
// 統計カード
const StatCard: React.FC<{
  value: number | string;
  label: string;
  icon: ReactNode;
  color?: string;
}> = ({ value, label, icon, color }) => (
  <ModernCard variant="outlined" size="sm">
    <div style={{ textAlign: 'center' }}>
      <div style={{
        ...textStyles.headline.medium,
        color: color || colors.primary[500],
        marginBottom: '4px',
      }}>
        {value}
      </div>
      <div style={{
        ...textStyles.body.small,
        color: colors.text.secondary,
      }}>
        {label}
      </div>
    </div>
  </ModernCard>
);

// ベストキャッチカード
const BestCatchCard: React.FC<{
  record: FishingRecord;
}> = ({ record }) => (
  <div>
    <h2 style={textStyles.headline.small}>
      🏆 今月のベストキャッチ
    </h2>
    <ModernRecordCard record={record} />
  </div>
);
```

#### 📸 記録一覧画面（月別表示 + 写真グリッド）

**役割**: 全記録の閲覧・探索・検索

##### レイアウト構造
```
┌─────────────────────────────────────────────────┐
│ 記録一覧                    [🔍 検索][⚙️ 設定]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  📅 月別フィルタ（Segmented Control）            │
│  ┌─────────────────────────────────────────┐    │
│  │ 全て │ 10月 │ 9月 │ 8月 │ 7月 │ 6月 │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  🗓️ 2024年10月 (12件)                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 写真1    │ │ 写真2    │ │ 写真3    │           │
│  │ アジ     │ │ サバ     │ │ アオリイカ │           │
│  │ 10/15   │ │ 10/12   │ │ 10/10   │           │
│  └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 写真4    │ │ 写真5    │ │ 写真6    │           │
│  └─────────┘ └─────────┘ └─────────┘           │
│                                                 │
│  🗓️ 2024年9月 (8件)                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 写真7    │ │ 写真8    │ │ 写真9    │           │
│  └─────────┘ └─────────┘ └─────────┘           │
│                                                 │
│  ... (スクロール) ...                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

##### 実装機能

**月別セグメント（Segmented Control）**:
```typescript
interface MonthSegment {
  id: string;          // 'all' | '2024-10' | '2024-09' ...
  label: string;       // '全て' | '10月' | '9月' ...
  count: number;       // その月の記録数
  year: number;        // 2024
  month: number;       // 10
}
```

**UIコンポーネント仕様**:
```typescript
const SegmentedControl: React.FC<{
  segments: MonthSegment[];
  selected: string;
  onChange: (id: string) => void;
}> = ({ segments, selected, onChange }) => (
  <div style={{
    display: 'flex',
    gap: '8px',
    padding: '4px',
    backgroundColor: colors.surface.secondary,
    borderRadius: '12px',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
  }}>
    {segments.map(segment => (
      <button
        key={segment.id}
        onClick={() => onChange(segment.id)}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: selected === segment.id
            ? colors.primary[500]
            : 'transparent',
          color: selected === segment.id
            ? 'white'
            : colors.text.primary,
          fontWeight: selected === segment.id ? '600' : '400',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {segment.label}
        {segment.count > 0 && (
          <span style={{ marginLeft: '6px', opacity: 0.8 }}>
            ({segment.count})
          </span>
        )}
      </button>
    ))}
  </div>
);
```

**月別グループ表示**:
```typescript
interface MonthGroup {
  yearMonth: string;    // '2024-10'
  label: string;        // '2024年10月'
  records: FishingRecord[];
}

const MonthlyGroupedList: React.FC<{
  groups: MonthGroup[];
  selectedMonth: string | null;
}> = ({ groups, selectedMonth }) => {
  // selectedMonth が null の場合は全て表示
  const filteredGroups = selectedMonth === 'all' || !selectedMonth
    ? groups
    : groups.filter(g => g.yearMonth === selectedMonth);

  return (
    <>
      {filteredGroups.map(group => (
        <div key={group.yearMonth}>
          {/* Sticky Header */}
          <h3 style={{
            position: 'sticky',
            top: 0,
            backgroundColor: colors.background,
            padding: '16px 0',
            margin: '24px 0 16px 0',
            borderBottom: `2px solid ${colors.border.light}`,
            ...textStyles.title.medium,
            zIndex: 1,
          }}>
            🗓️ {group.label} ({group.records.length}件)
          </h3>

          {/* 写真グリッド */}
          <PhotoGrid gap="16px">
            {group.records.map(record => (
              <ModernRecordCard key={record.id} record={record} />
            ))}
          </PhotoGrid>
        </div>
      ))}
    </>
  );
};
```

##### インタラクション

1. **スムーズスクロール**
   - 月選択時、該当月ヘッダーにアニメーション付きでスクロール
   - `scrollIntoView({ behavior: 'smooth', block: 'start' })`

2. **Sticky Month Headers**
   - スクロール時に月ヘッダーが画面上部に固定
   - `position: sticky; top: 0; z-index: 1;`

3. **Empty State**
   ```typescript
   const EmptyState: React.FC<{ month: string }> = ({ month }) => (
     <div style={{
       textAlign: 'center',
       padding: '64px 32px',
       color: colors.text.secondary,
     }}>
       <Icons.Fish size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
       <div style={textStyles.headline.small}>
         {month}月の記録はまだありません
       </div>
       <div style={{ ...textStyles.body.medium, marginTop: '8px' }}>
         釣果を記録して思い出を残しましょう
       </div>
     </div>
   );
   ```

##### データ処理ロジック

```typescript
// 月別グループ化
function groupRecordsByMonth(records: FishingRecord[]): MonthGroup[] {
  const groups = new Map<string, FishingRecord[]>();

  records.forEach(record => {
    const date = new Date(record.date);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!groups.has(yearMonth)) {
      groups.set(yearMonth, []);
    }
    groups.get(yearMonth)!.push(record);
  });

  // 新しい月順にソート
  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([yearMonth, records]) => {
      const [year, month] = yearMonth.split('-').map(Number);
      return {
        yearMonth,
        label: `${year}年${month}月`,
        records: records.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      };
    });
}

// セグメント生成
function generateMonthSegments(groups: MonthGroup[]): MonthSegment[] {
  const totalCount = groups.reduce((sum, g) => sum + g.records.length, 0);

  return [
    {
      id: 'all',
      label: '全て',
      count: totalCount,
      year: 0,
      month: 0,
    },
    ...groups.slice(0, 6).map(group => {
      const [year, month] = group.yearMonth.split('-').map(Number);
      return {
        id: group.yearMonth,
        label: `${month}月`,
        count: group.records.length,
        year,
        month,
      };
    }),
  ];
}
```

#### 実装優先順位

**Phase 1（即実装）**:
1. ✅ ホーム画面の統計カード強化
2. ✅ ホーム画面から「最近の記録6件」を削除
3. ✅ 記録一覧に月別グループ表示
4. ✅ Segmented Control（月選択）実装

**Phase 2（段階実装）**:
5. ✅ 今月のベストキャッチ表示（2025年10月15日実装完了）
6. ✅ 釣果トレンドグラフ（2025年10月15日実装完了）
7. ✅ 検索・フィルタ機能（Phase 2-2、2025年10月15日実装完了）
8. ⏳ 潮汐プレビュー（潮汐システム実装後）

##### 🔍 検索・フィルタ機能実装詳細（Phase 2-2設計）

**実装予定日**: 2025年10月15日

**設計コンセプト**: ユーザーが大量の釣果記録から目的の記録を素早く見つけられるよう、多角的な検索・フィルタリング機能を提供

**レイアウト配置**:
```
┌─────────────────────────────────────────────────┐
│ 記録一覧            [🔍 検索] [フィルタ: 2]     │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔍 検索・フィルタパネル（展開時）               │
│  ┌──────────────────────────────────────────┐   │
│  │ [🔍 検索バー: 魚種、場所、メモで検索]    │   │
│  │                                          │   │
│  │ 魚種:  [すべて ▼]  場所: [すべて ▼]     │   │
│  │ 期間:  [すべて ▼]  サイズ: [すべて ▼]   │   │
│  │                                          │   │
│  │ [フィルタクリア]          [検索 (15件)] │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  📅 月別フィルタ（Segmented Control）            │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

**機能仕様**:

**1. リアルタイム検索バー**:
```typescript
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;  // デフォルト: 300ms
}

// 検索対象フィールド
const searchableFields = ['fishSpecies', 'location', 'notes'];

// 検索ロジック（部分一致、大文字小文字区別なし）
function searchRecords(records: FishingRecord[], query: string): FishingRecord[] {
  if (!query.trim()) return records;

  const lowerQuery = query.toLowerCase();
  return records.filter(record =>
    record.fishSpecies.toLowerCase().includes(lowerQuery) ||
    record.location.toLowerCase().includes(lowerQuery) ||
    (record.notes && record.notes.toLowerCase().includes(lowerQuery))
  );
}
```

**2. 魚種フィルタ（Select / Multi-Select）**:
```typescript
interface FishSpeciesFilter {
  selectedSpecies: string[];  // 空配列 = すべて選択
  availableSpecies: string[]; // ユニークな魚種リスト
}

// ユニークな魚種リストの生成
function getUniqueSpecies(records: FishingRecord[]): string[] {
  return Array.from(new Set(records.map(r => r.fishSpecies))).sort();
}

// フィルタリングロジック
function filterBySpecies(records: FishingRecord[], selectedSpecies: string[]): FishingRecord[] {
  if (selectedSpecies.length === 0) return records;
  return records.filter(r => selectedSpecies.includes(r.fishSpecies));
}
```

**3. 場所フィルタ（Select / Multi-Select）**:
```typescript
interface LocationFilter {
  selectedLocations: string[];
  availableLocations: string[];
}

// ユニークな場所リストの生成
function getUniqueLocations(records: FishingRecord[]): string[] {
  return Array.from(new Set(records.map(r => r.location))).sort();
}
```

**4. 日付範囲フィルタ**:
```typescript
interface DateRangeFilter {
  startDate: Date | null;
  endDate: Date | null;
  preset?: 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'all';
}

// プリセット日付範囲
const datePresets: Record<string, () => DateRangeFilter> = {
  today: () => ({
    startDate: new Date(new Date().setHours(0, 0, 0, 0)),
    endDate: new Date(new Date().setHours(23, 59, 59, 999)),
    preset: 'today',
  }),
  week: () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { startDate: weekAgo, endDate: now, preset: 'week' };
  },
  month: () => {
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return { startDate: monthAgo, endDate: now, preset: 'month' };
  },
  // ... 他のプリセット
};

// フィルタリングロジック
function filterByDateRange(records: FishingRecord[], range: DateRangeFilter): FishingRecord[] {
  if (!range.startDate && !range.endDate) return records;

  return records.filter(record => {
    const recordDate = new Date(record.date);
    if (range.startDate && recordDate < range.startDate) return false;
    if (range.endDate && recordDate > range.endDate) return false;
    return true;
  });
}
```

**5. サイズ範囲フィルタ（Min-Max Slider）**:
```typescript
interface SizeRangeFilter {
  minSize: number | null;
  maxSize: number | null;
}

// サイズ範囲の取得（自動調整）
function getSizeRange(records: FishingRecord[]): { min: number; max: number } {
  const sizes = records.filter(r => r.size !== undefined).map(r => r.size!);
  if (sizes.length === 0) return { min: 0, max: 100 };

  return {
    min: Math.floor(Math.min(...sizes) / 5) * 5,  // 5cm単位で切り下げ
    max: Math.ceil(Math.max(...sizes) / 5) * 5,   // 5cm単位で切り上げ
  };
}

// フィルタリングロジック
function filterBySize(records: FishingRecord[], range: SizeRangeFilter): FishingRecord[] {
  if (range.minSize === null && range.maxSize === null) return records;

  return records.filter(record => {
    if (record.size === undefined) return false;
    if (range.minSize !== null && record.size < range.minSize) return false;
    if (range.maxSize !== null && record.size > range.maxSize) return false;
    return true;
  });
}
```

**6. フィルタ状態管理（統合）**:
```typescript
interface FilterState {
  searchQuery: string;
  species: string[];
  locations: string[];
  dateRange: DateRangeFilter;
  sizeRange: SizeRangeFilter;
  selectedMonth: string | null;  // 既存の月別フィルタと統合
}

// フィルタの適用（複数フィルタの組み合わせ）
function applyFilters(records: FishingRecord[], filters: FilterState): FishingRecord[] {
  let filtered = records;

  // 1. 検索クエリ
  filtered = searchRecords(filtered, filters.searchQuery);

  // 2. 魚種フィルタ
  filtered = filterBySpecies(filtered, filters.species);

  // 3. 場所フィルタ
  filtered = filterByLocations(filtered, filters.locations);

  // 4. 日付範囲フィルタ
  filtered = filterByDateRange(filtered, filters.dateRange);

  // 5. サイズ範囲フィルタ
  filtered = filterBySize(filtered, filters.sizeRange);

  // 6. 月別フィルタ（既存機能との統合）
  if (filters.selectedMonth && filters.selectedMonth !== 'all') {
    filtered = filtered.filter(r => {
      const recordDate = new Date(r.date);
      const yearMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
      return yearMonth === filters.selectedMonth;
    });
  }

  return filtered;
}

// アクティブフィルタ数の計算
function getActiveFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.searchQuery.trim()) count++;
  if (filters.species.length > 0) count++;
  if (filters.locations.length > 0) count++;
  if (filters.dateRange.startDate || filters.dateRange.endDate) count++;
  if (filters.sizeRange.minSize !== null || filters.sizeRange.maxSize !== null) count++;
  return count;
}
```

**UIコンポーネント設計**:

**検索バーコンポーネント**:
```typescript
const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder, debounceMs = 300 }) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      onChange(localValue);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [localValue, onChange, debounceMs]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      marginBottom: '16px',
    }}>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder || '魚種、場所、メモで検索...'}
        style={{
          width: '100%',
          padding: '12px 16px 12px 40px',
          borderRadius: '8px',
          border: `1px solid ${colors.border.light}`,
          fontSize: '0.875rem',
          ...textStyles.body.medium,
        }}
      />
      <span style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '1.25rem',
      }}>
        🔍
      </span>
      {localValue && (
        <button
          onClick={() => setLocalValue('')}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
```

**フィルタパネルコンポーネント**:
```typescript
const FilterPanel: React.FC<{
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  records: FishingRecord[];
  resultCount: number;
}> = ({ filters, onChange, records, resultCount }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeCount = getActiveFilterCount(filters);

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* フィルタトグルボタン */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: colors.surface.primary,
          border: `1px solid ${colors.border.light}`,
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          ...textStyles.body.medium,
        }}
      >
        <span>
          🔍 検索・フィルタ
          {activeCount > 0 && (
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: colors.primary[500],
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: '600',
            }}>
              {activeCount}
            </span>
          )}
        </span>
        <span>{isExpanded ? '▲' : '▼'}</span>
      </button>

      {/* フィルタコンテンツ（展開時） */}
      {isExpanded && (
        <div style={{
          marginTop: '8px',
          padding: '16px',
          backgroundColor: colors.surface.secondary,
          borderRadius: '8px',
        }}>
          {/* 検索バー */}
          <SearchBar
            value={filters.searchQuery}
            onChange={(value) => onChange({ ...filters, searchQuery: value })}
          />

          {/* フィルタグリッド（2列） */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '16px',
          }}>
            {/* 魚種フィルタ */}
            <div>
              <label style={{ ...textStyles.label, marginBottom: '4px', display: 'block' }}>
                魚種
              </label>
              {/* Select component here */}
            </div>

            {/* 場所フィルタ */}
            <div>
              <label style={{ ...textStyles.label, marginBottom: '4px', display: 'block' }}>
                場所
              </label>
              {/* Select component here */}
            </div>

            {/* 期間フィルタ */}
            <div>
              <label style={{ ...textStyles.label, marginBottom: '4px', display: 'block' }}>
                期間
              </label>
              {/* DateRangePicker here */}
            </div>

            {/* サイズフィルタ */}
            <div>
              <label style={{ ...textStyles.label, marginBottom: '4px', display: 'block' }}>
                サイズ (cm)
              </label>
              {/* RangeSlider here */}
            </div>
          </div>

          {/* アクションボタン */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <button
              onClick={() => onChange({
                searchQuery: '',
                species: [],
                locations: [],
                dateRange: { startDate: null, endDate: null },
                sizeRange: { minSize: null, maxSize: null },
                selectedMonth: null,
              })}
              disabled={activeCount === 0}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.border.light}`,
                backgroundColor: 'transparent',
                cursor: activeCount === 0 ? 'not-allowed' : 'pointer',
                opacity: activeCount === 0 ? 0.5 : 1,
                ...textStyles.body.small,
              }}
            >
              フィルタクリア
            </button>

            <span style={{
              ...textStyles.body.medium,
              color: colors.primary[600],
              fontWeight: '600',
            }}>
              {resultCount}件の記録
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
```

**パフォーマンス最適化**:
- **デバウンス**: 検索入力は300msのデバウンス処理
- **メモ化**: フィルタリング結果を `useMemo` でキャッシュ
- **仮想スクロール**: 100件以上の結果は仮想スクロール（将来実装）
- **インデックス活用**: IndexedDBのインデックスを活用した検索（将来実装）

**空結果の処理**:
```typescript
const EmptySearchResult: React.FC<{
  activeFilterCount: number;
  onClearFilters: () => void;
}> = ({ activeFilterCount, onClearFilters }) => (
  <div style={{
    textAlign: 'center',
    padding: '64px 32px',
    color: colors.text.secondary,
  }}>
    <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔍</div>
    <div style={textStyles.headline.small}>
      該当する記録が見つかりませんでした
    </div>
    <div style={{ ...textStyles.body.medium, marginTop: '8px', marginBottom: '24px' }}>
      検索条件を変更してお試しください
    </div>
    {activeFilterCount > 0 && (
      <button
        onClick={onClearFilters}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: colors.primary[500],
          color: 'white',
          cursor: 'pointer',
          ...textStyles.body.medium,
        }}
      >
        すべてのフィルタをクリア
      </button>
    )}
  </div>
);
```

**アクセシビリティ**:
- 検索バーに適切な `aria-label`
- フィルタパネルの展開状態を `aria-expanded` で管理
- キーボードナビゲーション対応（Enter, Escape, Tab）
- スクリーンリーダー対応（検索結果数の読み上げ）

**モバイル最適化**:
- フィルタパネルはモバイルで全画面モーダルとして表示（オプション）
- タッチフレンドリーなUI要素（最小44x44px）
- スワイプジェスチャーでフィルタパネルを閉じる

**将来の拡張計画**:
- [ ] 保存された検索条件（よく使うフィルタの保存）
- [ ] 天気条件でのフィルタリング
- [ ] 潮汐タイプでのフィルタリング
- [ ] 高度な検索構文（AND/OR条件）
- [ ] エクスポート機能（フィルタ結果のCSV出力）

#### 技術仕様

**状態管理**:
```typescript
// 記録一覧画面の状態
interface ListViewState {
  selectedMonth: string | null;  // 'all' | '2024-10' | '2024-09' ...
  monthGroups: MonthGroup[];
  segments: MonthSegment[];
  searchQuery: string;
}
```

**パフォーマンス最適化**:
- 月別グループ化はメモ化 (`useMemo`)
- 大量レコード対応: Virtual scrolling (将来実装)
- セグメントは直近6ヶ月のみ表示、それ以前は「...」で省略

### レスポンシブデザイン
```
Mobile (320px-768px)   → Single Column Layout
Tablet (768px-1024px)  → Two Column Layout
Desktop (1024px+)      → Three Column Grid
```

## 🚀 実装済み機能

### ✅ 地図機能（モダンUI/UX実装）

#### 概要
釣果記録の位置情報を地図上に可視化し、直感的なUIで記録の確認・選択ができる機能。Material Design 3とGlass Morphismを採用した次世代デザイン。

#### 主要機能
- **全画面マップレイアウト**: 地図を最大化し、情報は浮遊パネルで提供
- **カスタムマーカー**: 魚種ごとの色分け、グラデーション背景、サイズ連動
- **スパイダー表示**: 同一座標の複数記録を円形配置（半径220m）
- **サマリパネル**: ピンクリック時に上部中央に詳細表示
- **統計情報**: 記録数・釣り場数・魚種数をリアルタイム表示
- **釣果一覧**: 下部オーバーレイでスクロール可能
- **スムーズアニメーション**: フライ移動（duration: 1.5s、easeLinearity: 0.5）

#### デザイン原則
- **Glass Morphism**: 半透明背景 + ぼかし効果（`backdrop-filter: blur(20px)`）
- **Material Design 3**: Googleの最新デザインシステム準拠
- **Mobile First**: スマートフォン操作を最優先
- **Cubic Bezier Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` で滑らかな遷移

#### UI/UXコンポーネント

##### 1. サマリパネル（上部中央）
- **表示条件**: ピンまたはリストアイテムクリック時
- **デザイン**:
  - 背景: `rgba(255, 255, 255, 0.98)`
  - ぼかし: `backdrop-filter: blur(20px)`
  - ボーダー: 魚種カラー（2px）
  - シャドウ: `0 8px 32px rgba(0, 0, 0, 0.15)`
- **表示内容**:
  - 📸 **写真**: 魚種名の上に表示（maxHeight: 200px、クリックで拡大可能）
  - 魚種名（太字、大きめフォント）
  - サイズ/重量バッジ
  - 釣果日時
  - 場所（📍アイコン付き）
  - 「詳細を見る」ボタン
- **写真読み込み**:
  - `photoService.getPhotoById()` で非同期取得
  - `URL.createObjectURL()` でBlob URLを生成
  - メモリリーク防止: アンマウント時に `URL.revokeObjectURL()` で解放
  - `isMounted` フラグで中断制御

##### 2. コントロールパネル（右上）
- **全体表示ボタン（⤢）**:
  - サイズ: 44px × 44px
  - Glass Morphism スタイル
  - ホバー時シャドウ強化
- **統計情報カード**:
  - 📊 記録数
  - 📍 釣り場数
  - 🐟 魚種数

##### 3. 釣果一覧（下部オーバーレイ）
- **高さ**: 最大180px、スクロール可能
- **アイテムデザイン**:
  - 魚種カラードット（8px、外側に薄いシャドウ）
  - 魚種名（太字）
  - 場所（グレーテキスト）
  - サイズ/重量バッジ
  - 選択時ハイライト

#### カスタムマーカー仕様
```typescript
const createCustomIcon = (species: string, sizeOrWeight?: number) => {
  const iconSize = 30 + (sizeOrWeight ? Math.min(sizeOrWeight / 10, 20) : 0);
  const dotSize = 12;
  const color = getFishSpeciesColor(species);

  return L.divIcon({
    html: `
      <div style="
        width: ${iconSize}px;
        height: ${iconSize}px;
        background: linear-gradient(135deg, ${color}, ${adjustBrightness(color, -20)});
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      ">
        <div style="
          width: ${dotSize}px;
          height: ${dotSize}px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize]
  });
};
```

#### スパイダー表示アルゴリズム
```typescript
// 同一座標判定（約11m × 8mの精度）
const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

// 円形配置
const radius = 0.002; // 約220m
const angleStep = (2 * Math.PI) / groupRecords.length;
const angle = angleStep * index;

adjustedLat = centerLat + radius * Math.cos(angle);
adjustedLng = centerLng + radius * Math.sin(angle);
```

#### インタラクション設計

##### ピンクリック時
1. サマリパネル表示（上部中央）
2. 地図をピン位置にフライ（zoom: 14、duration: 1.5s）
3. リスト内アイテムをハイライト

##### リストアイテムクリック時
1. 地図をピン位置にフライ
2. サマリパネル表示
3. **詳細モーダルは開かない**（地図に集中）

##### サマリパネル「詳細を見る」ボタン
- 詳細モーダルを開く（`onRecordClick` コールバック）

##### 全体表示に戻すボタン（⤢）
1. 選択クリア
2. 全記録が見える範囲に調整
3. フライアニメーション

##### 詳細画面から地図へ遷移
1. 詳細モーダルの「🗺️ 地図で表示」ボタン
2. 地図タブに切り替え
3. 該当ピン位置にフライ
4. サマリパネル表示

#### 技術実装

##### React Leaflet設定
```typescript
<MapContainer
  center={[35.0, 136.0]}
  zoom={6}
  minZoom={5}
  maxZoom={17}
  maxBounds={JAPAN_BOUNDS}
  maxBoundsViscosity={0.9}
>
  <TileLayer
    url="https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png"
  />
</MapContainer>
```

##### パフォーマンス最適化
```typescript
// useMemo で再計算抑制
const recordsWithCoordinates = useMemo(
  () => records.filter(r => r.coordinates),
  [records]
);

const recordsWithAdjustedCoordinates = useMemo(
  () => {
    // スパイダー表示計算
  },
  [recordsWithCoordinates]
);

const statistics = useMemo(() => ({
  totalRecords: recordsWithCoordinates.length,
  uniqueLocations: new Set(recordsWithCoordinates.map(r => r.location)).size,
  uniqueSpecies: new Set(recordsWithCoordinates.map(r => r.fishSpecies)).size
}), [recordsWithCoordinates]);
```

##### 状態管理
```typescript
const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(null);
const [flyToCoords, setFlyToCoords] = useState<{ latitude: number; longitude: number } | null>(null);
const [resetTrigger, setResetTrigger] = useState(0);
```

#### 実装ファイル
- `/src/components/map/FishingMap.tsx` - メインコンポーネント
- `/src/ModernApp.tsx` - 地図タブ統合・ナビゲーション制御
- `/src/components/FishingRecordDetail.tsx` - 「地図で表示」ボタン

#### ライブラリ
- `react-leaflet`: 4.2.1
- `leaflet`: 1.9.4

#### 削除された機能
- **ヒートマップモード**: 視認性が低く効果が不明瞭なため削除
  - `viewMode` state削除
  - `HeatmapLayer`コンポーネント削除
  - 切替ボタン（🔥、📍）削除
  - `leaflet.heat`使用中止

#### 今後の拡張可能性
- フィルタリング（魚種、日付範囲）
- クラスタリング（大量データ対応）
- ルート表示（釣行経路）
- 天気情報オーバーレイ

### ✅ 詳細画面写真表示機能（2025年10月29日実装完了）

#### 概要
釣果記録詳細モーダルに写真を表示する機能。タイトルと基本情報の間に配置し、視覚的な記録確認を強化。

#### 実装内容

##### ModernApp.tsx（親コンポーネント）
```typescript
// 詳細モーダル用の写真URL state
const [detailPhotoUrl, setDetailPhotoUrl] = useState<string | null>(null);
const [detailPhotoLoading, setDetailPhotoLoading] = useState(false);
const detailPhotoUrlRef = useRef<string | null>(null);

// selectedRecord変更時に写真を読み込むuseEffect
useEffect(() => {
  let isMounted = true;

  const loadPhoto = async () => {
    if (!selectedRecord?.photoId) {
      setDetailPhotoUrl(null);
      setDetailPhotoLoading(false);
      return;
    }

    try {
      setDetailPhotoLoading(true);
      const photoResult = await photoService.getPhotoById(selectedRecord.photoId);

      if (isMounted && photoResult.success && photoResult.data) {
        if (detailPhotoUrlRef.current) {
          URL.revokeObjectURL(detailPhotoUrlRef.current);
        }

        const url = URL.createObjectURL(photoResult.data.blob);
        detailPhotoUrlRef.current = url;
        setDetailPhotoUrl(url);
      }
    } catch (error) {
      console.error('詳細モーダル: 写真の読み込みエラー:', error);
    } finally {
      if (isMounted) {
        setDetailPhotoLoading(false);
      }
    }
  };

  loadPhoto();

  return () => {
    isMounted = false;
    if (detailPhotoUrlRef.current) {
      URL.revokeObjectURL(detailPhotoUrlRef.current);
      detailPhotoUrlRef.current = null;
    }
  };
}, [selectedRecord?.photoId]);

// FishingRecordDetailにpropsを渡す
<FishingRecordDetail
  record={selectedRecord}
  photoUrl={detailPhotoUrl}
  loading={detailPhotoLoading}
  // ... other props
/>
```

##### FishingRecordDetail.tsx（詳細モーダル）
```typescript
// コンテンツエリアの先頭に写真を配置
<div id="record-content" style={{ padding: '1.5rem' }}>
  {/* 写真表示 */}
  {photoUrl && !loading && (
    <div style={{
      marginBottom: '1.5rem',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #dee2e6',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <img
        src={photoUrl}
        alt={`${record.fishSpecies}の写真`}
        onClick={() => setPhotoExpanded(true)}
        style={{
          width: '100%',
          maxHeight: '200px',
          objectFit: 'cover',
          display: 'block',
          cursor: 'pointer',
        }}
      />
    </div>
  )}

  {/* 基本情報 */}
  {/* ... */}
</div>
```

#### デザイン仕様
- **配置**: タイトル（ヘッダー固定エリア）の下、基本情報の上
- **サイズ**: maxHeight 200px、width 100%
- **object-fit**: cover（アスペクト比を維持して領域を埋める）
- **クリック動作**: 写真拡大モーダルを表示
- **ボーダー**: `1px solid #dee2e6`
- **シャドウ**: `0 2px 8px rgba(0,0,0,0.1)`
- **角丸**: `8px`

#### 削除された機能
- 下部の「📸 写真」セクション（重複表示のため削除）
  - 大きな写真表示（maxHeight: 600px）
  - 「🔍 クリックで拡大」バッジ

#### メモリ管理
- `URL.createObjectURL()` でBlob URLを生成
- `URL.revokeObjectURL()` でアンマウント時に解放
- `useRef` でURL参照を保持
- `isMounted` フラグで非同期処理の中断制御

#### 実装ファイル
- `/src/ModernApp.tsx`: 写真読み込みロジック、props渡し
- `/src/components/FishingRecordDetail.tsx`: 写真表示UI

### ✅ 写真メタデータ自動抽出システム

#### 概要
写真のEXIFデータから位置情報・撮影日時を自動抽出し、フォームに自動入力する機能。

#### 技術実装
- **ライブラリ**: exifreader（EXIFデータ抽出）
- **API**: Nominatim（逆ジオコーディング）
- **処理フロー**: 写真選択 → EXIF抽出 → GPS座標から住所取得 → 自動入力確認

#### ハイブリッド住所入力
```
📍 写真から自動取得
基本住所: 山口県長門市
💡 この基本住所に詳細な場所名を追加できます

[詳細場所入力フィールド]
例: ○○港、△△磯、釣り堀名など
```

#### 実装ファイル
- `/src/lib/photo-metadata-service.ts`
- `/src/components/PhotoUpload.tsx`
- `/src/components/FishingRecordForm.tsx`

### ✅ 環境情報自動取得システム

#### 天気情報取得
- **API**: Open-Meteo Weather API（完全無料・APIキー不要）
- **取得データ**: 気温、湿度、風速、気圧、天気状況
- **フロー**: GPS座標 + 撮影日時 → 天気データ取得 → フォーム自動入力

#### 海面水温取得（2025年9月21日追加）
- **API**: Open-Meteo Marine API（完全無料・APIキー不要）
- **取得データ**: 海面水温、波高、波向き
- **統合**: 写真GPS座標から自動取得、釣果記録に統合

#### 自動入力フロー
```
写真アップロード
↓
GPS座標 + EXIF日時抽出
↓
並行API呼び出し:
├─ 逆ジオコーディング（住所取得）
├─ 天気データ取得（Open-Meteo Weather API）
└─ 海面水温取得（Open-Meteo Marine API）
↓
自動入力確認ダイアログ
↓
フォームに一括入力（位置・日時・天気・海面水温）
```

### ✅ UI/UXモダン化（2024年実装完了）

#### 根本的アーキテクチャ改善
1. **CSS アーキテクチャの完全再構築**
   - bodyのflexレイアウト削除
   - CSS Custom Propertiesによる動的レイアウト管理
   - PWAバナーオーバーラップ問題の根本解決

2. **PWA Banner の完全リライト**
   - 外部依存を排除してネイティブブラウザAPI使用
   - 確実な動作保証

3. **コンポーネント構造の堅牢化**
   - 未定義変数参照の排除
   - 明示的な依存関係管理

#### モダンデザイン適用
- Material Design 3.0ベースのカラーシステム
- ボトムナビゲーション + FABレイアウト
- マイクロアニメーション対応
- モバイルファースト・レスポンシブデザイン

## 🌊 潮汐情報システム（設計完了・実装準備完了）

### システム概要
**完全無料・リアルタイム・オフライン対応**の潮汐情報システム。釣果記録に美しい潮汐可視化を統合し、「いつ釣れたのか」と「その時の潮の状態」を直感的に理解できるUXを提供。

### 技術アーキテクチャ
- **Zero API Dependency**: 外部API不要の完全自律システム
- **天体計算エンジン**: ニューカム公式による高精度月齢計算
- **調和解析**: 主要6分潮による潮汐予測
- **地域補正**: 日本沿岸50箇所の地域特性データベース

### データモデル
```typescript
interface HybridTideInfo {
  astronomical: {
    moonAge: number;
    moonPhase: MoonPhase;
    sunMoonAngle: number;
  };
  classification: {
    tideType: '大潮' | '中潮' | '小潮' | '長潮' | '若潮';
    strength: number; // 0-100
  };
  events: TideEvent[]; // 満潮・干潮時刻
}

interface TideContext {
  catchTime: string;
  tidePhase: 'rising' | 'falling' | 'high' | 'low' | 'slack';
  currentState: {
    phase: string; // '上げ潮中盤'等
    optimalFishing: boolean;
  };
}
```

### UI/UXデザイン
```
┌─────────────────────────────────────────────────────────┐
│  🌊 大潮  📍東京湾  📅2024-12-22  🌙満月                 │
├─────────────────────────────────────────────────────────┤
│  潮位                                                  │
│   ↑                                                   │
│ 2.0m  ∩     ∩     ∩     釣れた時刻                     │
│      ∕ ＼   ∕ ＼   ∕ ＼      ↓                        │
│ 1.0m      ＼ ∕     ＼ ∕     ＼ ∕  🎣                    │
│ 0.0m       ∪       ∪       ∪                         │
│      ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤        │
│     00:00 04:00 08:00 12:00 16:00 20:00 24:00        │
├─────────────────────────────────────────────────────────┤
│  🔴 06:24 満潮 1.8m  🔵 12:45 干潮 0.2m                │
└─────────────────────────────────────────────────────────┘
```

### 実装計画
- **Phase 1**: 計算エンジン実装（2-3日）
- **Phase 2**: UI/UXコンポーネント（2-3日）
- **Phase 3**: 釣果記録統合（1-2日）
- **Phase 4**: テスト・最適化（1日）

**実装ファイル構成**:
```
/src/services/tide/
├── astronomical-calculator.ts
├── harmonic-analysis.ts
├── regional-corrections.ts
└── tide-predictor.ts

/src/components/tide/
├── TideGraph.tsx
├── TideSummaryCard.tsx
└── TideEventsList.tsx
```

## 🔧 API・サービス仕様

### データアクセス層
```typescript
// 釣果記録CRUD操作
interface FishingRecordService {
  create(record: CreateFishingRecordForm): Promise<DatabaseResult<FishingRecord>>;
  getAll(params?: GetRecordsParams): Promise<DatabaseResult<FishingRecord[]>>;
  getById(id: string): Promise<DatabaseResult<FishingRecord>>;
  update(id: string, updates: Partial<FishingRecord>): Promise<DatabaseResult<FishingRecord>>;
  delete(id: string): Promise<DatabaseResult<void>>;
}

// 写真管理
interface PhotoService {
  upload(file: File): Promise<DatabaseResult<PhotoData>>;
  getById(id: string): Promise<DatabaseResult<PhotoData>>;
  delete(id: string): Promise<DatabaseResult<void>>;
}

// メタデータ抽出
interface PhotoMetadataService {
  extractMetadata(file: File): Promise<PhotoMetadata>;
  getLocationFromCoordinates(coords: Coordinates): Promise<string>;
}

// 天気サービス
interface WeatherService {
  getCurrentWeather(coords: Coordinates): Promise<WeatherData>;
  getHistoricalWeather(coords: Coordinates, date: Date): Promise<WeatherData>;
  getMarineData(coords: Coordinates): Promise<MarineData>;
}
```

### エラーハンドリング戦略
```typescript
interface DatabaseError {
  code: 'STORAGE_FULL' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'NOT_FOUND';
  message: string;
  details?: unknown;
}

// フォールバック処理
- GPS取得失敗 → 手動入力にフォールバック
- 天気API失敗 → 天気情報なしで記録保存
- EXIF抽出失敗 → 撮影日時のみ抽出を試行
```

## ⚡ パフォーマンス・最適化

### Core Web Vitals 目標
- **LCP (Largest Contentful Paint)**: < 2.5秒
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### 最適化実装
1. **画像処理最適化**
   - Canvas APIによる画像圧縮
   - WebP形式での保存
   - 遅延読み込み（Intersection Observer）

2. **データベース最適化**
   - インデックス戦略の最適化
   - 仮想スクロール（大量データ対応）
   - LRUキャッシュ実装

3. **PWA最適化**
   - Service Worker キャッシュ戦略
   - Critical Path Rendering
   - Resource Hints（preload, prefetch）

## 🔒 セキュリティ・プライバシー

### プライバシー保護
- **ローカル完結型**: 釣果データは端末内のみで処理
- **外部送信なし**: GPS座標・写真データの外部送信を禁止
- **明示的同意**: 位置情報利用時の明示的ユーザー同意

### データ保護
- **EXIF削除**: 共有時のメタデータ自動削除
- **暗号化ストレージ**: 将来のクラウド同期時の暗号化対応
- **アクセス制御**: 適切な権限管理

## 📋 品質保証・テスト戦略

### テストアーキテクチャ
```
Unit Tests (Vitest + Testing Library)
├── Services (PhotoMetadataService, WeatherService)
├── Utilities (Validation, Format)
└── Hooks (Form handling, State management)

Integration Tests (Playwright)
├── User Journey (Record creation flow)
├── Photo Upload (EXIF extraction flow)
└── Data Persistence (Save/Load verification)

E2E Tests (Cypress)
├── Critical Path (End-to-end fishing record creation)
├── PWA Features (Installation, Offline mode)
└── Cross-browser (Chrome, Firefox, Safari)
```

### 継続的品質管理
- **ESLint + TypeScript**: 静的コード解析
- **Prettier**: コードフォーマット
- **Husky**: Git hooks による品質ゲート
- **GitHub Actions**: CI/CD パイプライン

## 📚 関連ドキュメント

### 設計書
- **[アーキテクチャ設計](./architecture.md)**: システム全体設計
- **[データフロー](./dataflow.md)**: システムデータフロー図
- **[API仕様](./api-endpoints.md)**: データアクセス層仕様
- **[データベース設計](./database-schema.sql)**: IndexedDBスキーマ
- **[型定義](./interfaces.ts)**: TypeScript型定義

### 実装ガイド
- **要件定義**: `/docs/spec/fishing-record-requirements.md`
- **メタデータ自動抽出**: アーカイブ（実装完了済み）
- **追加実装機能**: アーカイブ（実装完了済み）
- **潮汐システム**: `/src/services/tide/` （実装準備完了）

### アーカイブ（参考・履歴）
- **UI/UX改善計画**: 2024年実装完了
- **モダンデザイン戦略**: 2024年実装完了
- **アーキテクチャ改善**: 2024年根本的問題解決完了

## 🚀 今後のロードマップ

### Phase 1: 潮汐システム実装（優先度：高）
- [ ] 天体計算エンジン実装
- [ ] 調和解析エンジン実装
- [ ] UI/UXコンポーネント開発
- [ ] 釣果記録との統合

### Phase 2: 分析・可視化機能（優先度：中）
- [ ] 釣果パターン分析
- [ ] データエクスポート・インポート
- [ ] 統計ダッシュボード
- [ ] AI魚種認識機能

### Phase 3: ソーシャル機能（優先度：低）
- [ ] クラウド同期基盤
- [ ] データ共有機能
- [ ] コミュニティフィード
- [ ] マルチテナント対応

### Phase 4: プラットフォーム拡張（将来検討）
- [ ] ネイティブアプリ版
- [ ] デスクトップアプリ版
- [ ] Apple Watch / WearOS対応
- [ ] IoT機器連携

## 📊 プロジェクト状況

### 実装完了済み（✅ 100%）
- **基本釣果記録機能**: CRUD操作、一覧・詳細表示
- **写真メタデータ自動抽出**: EXIF → GPS → 住所自動入力
- **環境情報自動取得**: 天気・海面水温の自動記録
- **自動保存機能**: 下書き機能・UX最適化
- **PWAフル対応**: インストール・オフライン動作
- **モダンUI/UX**: 2024年デザインシステム適用
- **画像オーバーレイカード**: Instagram風ビジュアルファーストデザイン（2025年10月15日実装）
  - ホバーアニメーション強化（画像ズーム、バッジ浮き上がり、オーバーレイ変化）
  - レスポンシブ対応（モバイル280px / タブレット350px / 大画面400px）
- **背景ぼかし画像機能**: 余白を目立たなくする2層構造デザイン（2025年10月15日設計）
- **ダッシュボード化（Phase 1）**: ホーム画面の統計ダッシュボード実装（2025年10月15日実装）
  - 統計カード（総記録数、魚種数、釣り場数、今月の記録数）
  - 今月のベストキャッチ表示（最大サイズの魚を自動選択）
- **月別表示（Phase 1）**: 記録一覧の月別グループ表示（2025年10月15日実装）
  - Segmented Control（月選択タブ）
  - 月別グループ化とSticky Headers
  - 直近6ヶ月のフィルタリング
- **釣果トレンドグラフ（Phase 2-1）**: 月別釣果数の可視化（2025年10月15日実装）
  - Rechartsライブラリ使用（棒グラフ・折れ線グラフ対応）
  - 最近6ヶ月のデータ自動集計
  - カスタムツールチップとMaterial Design 3.0準拠
  - ResponsiveContainerバグ回避のための固定サイズ実装
- **パフォーマンス最適化**: Core Web Vitals達成

### 設計完了・実装準備完了（🚧 50%）
- **潮汐情報システム**: 完全設計完了、実装ファイル準備完了
- **残りのダッシュボード機能（Phase 2-2以降）**: 設計完了、実装待ち
  - 検索・フィルタ機能
  - 潮汐プレビュー統合
- **ホーム画面Phase 3機能**: 一部実装済み、潮汐統計追加設計完了（2025年10月17日）
  - ✅ 最近の記録セクション（最新5件をコンパクト表示）- 実装済み
  - ✅ 人気の釣り場ランキング（トップ3）- 実装済み
  - ✅ 魚種別の記録数（円グラフ可視化）- 実装済み
  - 🆕 潮汐統計セクション（満潮・干潮/大潮・中潮別分析）- 設計完了・実装待ち

### 将来実装（📋 0%）
- **分析・可視化機能**: 要件整理段階
- **ソーシャル機能**: 基本構想段階

---

**🎯 目標**: 趣味の釣り人が釣果を **「簡単に・美しく・意味深く」** 記録できる、世界最高レベルのPWA釣果記録アプリケーション

**🚀 次のステップ**: 潮汐システム実装により釣果と環境の関係性を可視化し、釣り体験の質的向上を実現

**📊 プロジェクト成熟度**: MVP完成（基本機能100%実装）→ 機能拡張フェーズ（潮汐システム実装準備完了）

---

*この統合マスター仕様書は、釣果記録アプリの全ての設計・実装情報を統合したSingle Source of Truthです。*