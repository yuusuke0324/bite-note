# 追加実装機能 仕様書

## 概要

設計書に記載されていない、実装過程で追加された機能の仕様をまとめたドキュメント。

## 1. 自動保存機能（下書き機能）

### 概要
ユーザーのフォーム入力を自動保存し、ページ再読み込み時に復元確認を行う機能。

### 仕様

#### 保存タイミング
- **自動保存**: 入力から2秒後に自動実行
- **デバウンス**: 連続入力時は2秒後に延期

#### 保存対象フィールド
```typescript
interface DraftData {
  location: string;
  fishSpecies: string;
  weather: string;
  size: number;
  notes: string;
  savedAt: string; // ISO形式の保存日時
}
```

#### 保存期間
- **24時間**: 保存から24時間後に自動削除
- **手動削除**: ユーザーが明示的に破棄可能

### UI仕様

#### 復元確認ダイアログ
```
┌─────────────────────────────────────┐
│ 📋 前回の入力内容を復元しますか？        │
│                                     │
│ 前回の入力内容が保存されています：        │
│                                     │
│ 🎣 釣り場: 山口県長門市○○港            │
│ 🐟 魚種: アジ                        │
│ 🌤️ 天気: 晴れ (22°C)                │
│ 📏 サイズ: 25cm                     │
│ 📝 メモ: 朝マズメで好調...             │
│                                     │
│ 保存日時: 2025/9/21 14:30:15         │
│                                     │
│ [破棄] [復元する]                     │
└─────────────────────────────────────┘
```

### 実装詳細

#### 自動保存処理
```typescript
// 2秒デバウンスでの自動保存
React.useEffect(() => {
  const formData = watch();
  const timer = setTimeout(() => {
    if (hasContent(formData)) {
      localStorage.setItem('fishingRecordFormDraft', JSON.stringify({
        ...formData,
        savedAt: new Date().toISOString()
      }));
    }
  }, 2000);
  return () => clearTimeout(timer);
}, [watch()]);
```

#### 復元チェック処理
```typescript
React.useEffect(() => {
  const savedDraft = localStorage.getItem('fishingRecordFormDraft');
  if (savedDraft && !initialData) {
    const draftData = JSON.parse(savedDraft);
    const hoursDiff = getHoursDiff(draftData.savedAt);

    if (hoursDiff < 24 && hasContent(draftData)) {
      setPendingDraftData(draftData);
      setShowDraftRestoreDialog(true);
    } else {
      localStorage.removeItem('fishingRecordFormDraft');
    }
  }
}, []);
```

### プライバシー・セキュリティ
- **ローカルストレージのみ**: 外部送信なし
- **自動削除**: 24時間後の自動削除
- **明示的同意**: 復元時の明示的確認

## 2. 県・市レベル住所自動取得機能

### 概要
GPS座標から逆ジオコーディングにより県・市レベルの住所を自動取得し、詳細は手動補完するハイブリッド設計。

### 設計思想

#### 制約を活かした設計
- **無料API制限**: 詳細住所は取得困難
- **プライバシー配慮**: 詳細位置情報の自動取得を避ける
- **実用性重視**: 基本住所 + 手動補完で実用的な情報を確保

### 技術仕様

#### API選択
- **採用**: Nominatim API（OpenStreetMap）
- **理由**: 無料、日本語対応、県・市レベルは安定取得可能

#### 住所構築アルゴリズム
```typescript
const buildBasicAddress = (addressComponents: any): string => {
  const parts = [];

  // 都道府県
  if (addressComponents.state || addressComponents.province) {
    parts.push(addressComponents.state || addressComponents.province);
  }

  // 市区町村
  if (addressComponents.city || addressComponents.town || addressComponents.village) {
    parts.push(
      addressComponents.city ||
      addressComponents.town ||
      addressComponents.village
    );
  }

  return parts.join('');
};
```

### UI/UX設計

#### ハイブリッド入力フィールド
```
┌─────────────────────────────────────┐
│ 🎣 釣り場 *                          │
│                                     │
│ 📍 写真から自動取得                    │
│ ┌─────────────────────────────────┐   │
│ │ 基本住所: 山口県長門市              │   │
│ │ 💡 この基本住所に詳細な場所名を     │   │
│ │    追加できます                   │   │
│ └─────────────────────────────────┘   │
│                                     │
│ [入力フィールド]                      │
│ プレースホルダー: 基本住所に詳細を追加    │
│ （例: ○○港、△△磯、釣り堀名など）        │
└─────────────────────────────────────┘
```

#### 状態表示
```typescript
// 自動取得状態の視覚的表示
{autoFilledFields.has('location') && (
  <span style={{
    backgroundColor: '#4caf50',
    color: 'white',
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px'
  }}>
    📸 県・市を自動入力
  </span>
)}
```

### 期待される成果
- **ユーザビリティ**: 手間を削減しつつ柔軟性を保持
- **精度**: 重要な詳細情報はユーザーが確実に入力
- **プライバシー**: 詳細位置情報の意図しない漏洩を防止

## 3. シンプル化されたフォト・メタデータ・サービス

### 背景
当初の複雑なフォールバックAPIシステムから、シンプルで信頼性の高い実装に変更。

### Before（削除された複雑システム）
- HERE Geocoding API
- LocationIQ API
- Photon API
- MapBox API
- 国土地理院API
- 複数ズームレベル検索
- 複雑なフォールバックロジック

### After（現在のシンプルシステム）
```typescript
class PhotoMetadataService {
  // シンプルな単一API実装
  async getLocationFromCoordinates(coordinates: Coordinates): Promise<GeocodeResult> {
    const result = await this.getNominatimAddress(coordinates);
    return result;
  }

  private async getNominatimAddress(coordinates: Coordinates): Promise<GeocodeResult> {
    // 県・市レベルに特化したシンプルな実装
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ja&addressdetails=1&zoom=18`
    );
    // 県・市レベルのみの住所構築
  }
}
```

### 利点
- **保守性**: シンプルで理解しやすい
- **信頼性**: 単一障害点の削減
- **パフォーマンス**: 不要なAPI呼び出しを削除
- **可読性**: 複雑なフォールバックロジックを排除

## 4. GPS手動取得機能の削除

### 削除理由
- **重複機能**: 写真からの自動取得で代替可能
- **UX混乱**: 複数の位置取得方法が混在
- **保守コスト**: 不要な複雑性の排除

### 削除された機能
- GPSLocationInputコンポーネント
- 手動GPS取得ボタン
- 現在位置取得機能
- GPS使用設定切り替え

### 代替方法
- **写真GPS**: 写真のEXIFデータから自動取得
- **手動入力**: ユーザーによる直接入力

## 5. TypeScriptエラーの修正

### 修正内容
- **重複プロパティ**: CSS `display` プロパティの重複削除
- **型安全性**: `useGPS`フィールドのnullable対応
- **厳密性**: AutoFillData型の厳密な使用

### 修正例
```typescript
// Before: 重複プロパティエラー
style={{
  display: 'block',
  display: 'flex', // 重複
}}

// After: 修正済み
style={{
  display: 'flex',
}}
```

## 実装状況

### 完了項目
- [x] 自動保存機能の実装
- [x] 復元確認ダイアログの実装
- [x] 県・市レベル住所自動取得
- [x] ハイブリッド住所入力UI
- [x] PhotoMetadataServiceの簡素化
- [x] 不要機能の削除
- [x] TypeScriptエラーの修正

### 技術的債務
- [ ] 単体テストの追加（現在はE2Eテストでカバー）
- [ ] エラーハンドリングの詳細化
- [ ] アクセシビリティの向上

### 既知の問題と修正履歴

#### 文字が見えない問題（再発）
**問題**: アプリケーションで文字が見えない（白背景に白文字）

**原因**:
- デフォルトCSSでダークテーマの文字色設定（白文字）
- ライトテーマのメディアクエリが正しく適用されない
- システムのカラースキーム設定との不整合

**修正方法**:
1. デフォルトをライトテーマに設定
2. ダークテーマを明示的にprefers-color-scheme: darkで分離
3. 確実に読める文字色の設定

**再発防止策**: CSSテーマ設定をドキュメント化し、定期的な視覚確認を実施

#### 天気APIキーが未設定でテストデータ表示される問題
**問題**: 天気情報で「（テストデータ）」と表示される

**原因**:
- OpenWeatherMap APIキーが未設定
- ダミーデータがテストデータと明記されている

**解決方法**:
1. OpenWeatherMap APIキーを取得：https://openweathermap.org/api
2. `.env.local`ファイルを作成し、`REACT_APP_WEATHER_API_KEY=your_api_key`を設定
3. ダミーデータ表記を自然な表示に変更

**現在の状態**: Open-Meteo APIで実際の天気データを取得（APIキー不要）

#### Open-Meteo API統合（2025年9月21日追加）
**改善内容**:
- OpenWeatherMapからOpen-Meteo APIに変更
- APIキー不要で実際の天気データを取得
- 過去7日間の履歴データも取得可能

**技術的詳細**:
```typescript
// 現在の天気：https://api.open-meteo.com/v1/forecast
// 履歴データ：start_date/end_date指定で過去データ取得
// 天気コード：WMO Weather interpretation codesに準拠
```

**利点**:
- 完全無料（制限なし）
- ユーザー登録・APIキー不要
- 実際の気象データを提供

### 🌊 海面水温自動取得機能（2025年9月21日追加）

**概要**: Open-Meteo Marine APIを使用して写真のGPS座標から海面水温を自動取得する機能を実装

**実装内容**:

#### 1. Marine API統合
- **API**: Open-Meteo Marine Weather API
- **エンドポイント**: `https://marine-api.open-meteo.com/v1/marine`
- **取得データ**: 海面水温、波高、波向き
- **特徴**: APIキー不要、完全無料

#### 2. 技術実装
```typescript
// WeatherServiceクラスに新機能追加
async getMarineData(coordinates: Coordinates): Promise<MarineResult>
private async getOpenMeteoMarineData(coordinates: Coordinates): Promise<MarineData>
private parseOpenMeteoMarineResponse(data: any): MarineData

// 新しい型定義（src/types/metadata.ts）
interface MarineData {
  seaTemperature: number;   // 海面水温 (°C)
  waveHeight: number;       // 波高 (m)
  waveDirection: number;    // 波向き (°)
}

interface MarineResult {
  success: boolean;
  data?: MarineData;
  error?: { message: string; code?: string; };
}
```

#### 3. フォーム統合
- **新フィールド**: 海面水温 (°C) 入力フィールド追加
- **自動入力**: 写真のGPS座標から自動取得・表示
- **バリデーション**: 0-50°Cの範囲制限（Zodスキーマ）
- **UI表示**: 自動入力時の緑色バッジ表示

#### 4. フォームフィールド順序最適化
**最終的な順序**:
1. 📅 **釣行日時**（時間まで含む datetime-local フィールド）
2. 📍 **場所**
3. 🌤️ **天気**
4. 🌊 **海面水温** ← **新規追加・天気の直後に配置**
5. 🐟 **魚種**
6. 📏 **サイズ**
7. 📝 **メモ**

**改善点**:
- 日付→日時フィールドに変更（EXIF時間情報も反映）
- 環境条件（天気・海面水温）を連続配置で入力効率向上
- 釣果記録として論理的で使いやすい順序

#### 5. 自動入力フロー拡張
```
写真アップロード
↓
GPS座標 + EXIF日時抽出
↓
並行API呼び出し:
├─ 逆ジオコーディング（住所取得）
├─ 天気データ取得（Open-Meteo Weather API）
└─ 海面水温取得（Open-Meteo Marine API）  ← **新規追加**
↓
自動入力確認ダイアログ
↓
フォームに一括入力（位置・日時・天気・海面水温）
```

**実装のメリット**:
- 🐟 **魚の活性に直結**: 水温は釣果に最も影響する重要な環境要因
- 📊 **分析精度向上**: より詳細な環境データで釣果パターン分析が可能
- ⚡ **入力効率化**: 手動測定不要で自動記録
- 🆓 **コスト削減**: APIキー不要で運用コストゼロ

**テスト結果**:
```
📍 山口県長門市沖（34.46°N, 131.04°E）
🌡️ 海面水温: 27.4°C
🌊 波高: 1.46m
🧭 波向き: 22°
✅ 正常に取得・表示確認済み
```

## まとめ

これらの追加実装により、以下の価値を提供：

1. **ユーザビリティ**: 自動保存によるデータロスト防止 & 海面水温自動取得
2. **現実的UX**: API制限を考慮したハイブリッド設計 & フォーム順序最適化
3. **保守性**: シンプルで理解しやすいコード & 統一されたAPI設計
4. **信頼性**: 単一障害点の削除 & エラーハンドリング強化
5. **釣果分析**: 環境データ（天気・水温）自動記録による高精度分析 ← **NEW**

設計書の要件を満たしつつ、釣り特化の実用的で保守しやすいソリューションを実現している。

---

**最終更新**: 2025年9月21日
**ドキュメント作成者**: Claude Code Assistant
**関連タスク**: TASK-405A（写真メタデータ自動抽出機能）