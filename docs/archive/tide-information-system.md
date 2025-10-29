# 潮汐情報システム設計書

## 📋 要件定義

### 機能要件
- **潮汐タイプ識別**: 大潮・中潮・小潮・長潮・若潮の自動判定
- **満潮・干潮時刻**: 釣れた時間帯との関係性を表示
- **地域単位での取得**: 釣り場の位置情報に基づく最適なステーション選択
- **無料API利用**: NOAA Tides & Currents API を使用
- **オフライン対応**: 取得済みデータのキャッシュ機能

### 非機能要件
- **レスポンス時間**: 3秒以内でのデータ取得
- **キャッシュ期間**: 24時間（潮汐データは日単位で変化）
- **エラー処理**: API障害時のフォールバック機能
- **データ容量**: 軽量化されたJSONデータのみ保存

## 🏗️ システム設計

### 1. データフロー
```
位置情報 → 最寄りステーション検索 → NOAA API → 潮汐データ → 潮汐タイプ計算 → キャッシュ保存 → UI表示
```

### 2. アーキテクチャ構成
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   釣果記録画面    │    │  潮汐データ管理   │    │    NOAA API     │
│                │    │                │    │                │
│ - 位置情報      │───▶│ - ステーション選択 │───▶│ - 潮汐予測データ │
│ - 釣れた時間    │    │ - データ取得      │    │ - 天文データ     │
│ - 潮汐表示      │◀───│ - キャッシュ管理   │    │                │
└─────────────────┘    └─────────────────┘    └─────────────────┘
           │                       │
           │                       ▼
           │            ┌─────────────────┐
           │            │  ローカルキャッシュ │
           │            │                │
           └───────────▶│ - IndexedDB     │
                        │ - 24時間保持    │
                        └─────────────────┘
```

## 📊 データモデル設計

### 1. TideInfo インターフェース
```typescript
interface TideInfo {
  id: string;                    // ユニークID
  stationId: string;            // NOAAステーションID
  stationName: string;          // ステーション名
  date: string;                 // 対象日付 (YYYY-MM-DD)
  location: {
    latitude: number;
    longitude: number;
  };

  // 潮汐タイプ情報
  tideType: '大潮' | '中潮' | '小潮' | '長潮' | '若潮';
  moonPhase: '新月' | '上弦' | '満月' | '下弦';

  // 満潮・干潮データ
  events: TideEvent[];

  // メタデータ
  fetchedAt: string;            // 取得時刻
  source: 'noaa';              // データソース
}

interface TideEvent {
  type: 'high' | 'low';        // 満潮 | 干潮
  time: string;                // 時刻 (HH:mm)
  height: number;              // 潮位 (m)
  timestamp: number;           // Unix timestamp
}
```

### 2. FishingRecord への追加
```typescript
interface FishingRecord {
  // 既存フィールド
  id: string;
  date: string;
  time: string;
  location: Location;
  weather?: WeatherInfo;

  // 新規追加
  tideInfo?: TideInfo;         // 潮汐情報
  tideContext?: TideContext;   // 釣れた時間帯の潮汐コンテキスト
}

interface TideContext {
  catchTime: string;           // 釣れた時刻
  tidePhase: 'rising' | 'falling' | 'high' | 'low';  // 潮の状態
  nextEvent: {
    type: 'high' | 'low';
    time: string;
    timeUntil: string;         // "2時間30分後"
  };
  tideStrength: number;        // 潮の強さ (0-100)
}
```

## 🎯 NOAA API 仕様

### 1. ステーション検索
```typescript
// 最寄りステーション検索のロジック
interface TideStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance?: number;          // 計算される距離 (km)
}

const JAPAN_TIDE_STATIONS: TideStation[] = [
  { id: '9414290', name: '東京湾', lat: 35.6762, lon: 139.6503 },
  { id: '9411340', name: '大阪湾', lat: 34.6937, lon: 135.5023 },
  { id: '9413450', name: '名古屋港', lat: 35.0516, lon: 136.8906 },
  // ... その他主要港湾
];
```

### 2. API エンドポイント
```typescript
// 潮汐予測データ取得
const NOAA_PREDICTIONS_URL = 'https://tidesandcurrents.noaa.gov/api/datagetter';

interface NOAARequest {
  date: string;               // 'today' | 'YYYYMMDD'
  station: string;            // ステーションID
  product: 'predictions';     // 固定値
  datum: 'mllw';             // 基準面
  units: 'metric';           // メートル法
  time_zone: 'gmt';          // UTC時間
  format: 'json';            // JSON形式
}
```

### 3. レスポンス形式
```typescript
interface NOAAResponse {
  predictions: Array<{
    t: string;                // ISO時刻
    v: string;                // 潮位 (文字列)
  }>;
  metadata: {
    id: string;
    name: string;
    lat: string;
    lon: string;
  };
}
```

## 🧮 潮汐タイプ計算アルゴリズム

### 1. 大潮・小潮判定
```typescript
function calculateTideType(date: Date): TideType {
  // 月齢計算
  const moonAge = calculateMoonAge(date);

  // 大潮: 新月・満月の前後2日
  if (moonAge <= 2 || moonAge >= 28 || (moonAge >= 13 && moonAge <= 17)) {
    return '大潮';
  }

  // 小潮: 上弦・下弦の前後2日
  if ((moonAge >= 5 && moonAge <= 9) || (moonAge >= 20 && moonAge <= 24)) {
    return '小潮';
  }

  // 長潮: 小潮の翌日
  if (moonAge === 10 || moonAge === 25) {
    return '長潮';
  }

  // 若潮: 長潮の翌日
  if (moonAge === 11 || moonAge === 26) {
    return '若潮';
  }

  // その他は中潮
  return '中潮';
}

function calculateMoonAge(date: Date): number {
  // 基準: 2024年1月11日が新月
  const baseNewMoon = new Date('2024-01-11');
  const diffDays = Math.floor((date.getTime() - baseNewMoon.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays % 29.53; // 朔望月周期
}
```

### 2. 潮の状態判定
```typescript
function calculateTideContext(catchTime: string, tideEvents: TideEvent[]): TideContext {
  const catchTimestamp = new Date(`2024-01-01 ${catchTime}`).getTime();

  // 直前と直後のイベントを特定
  const prevEvent = findPreviousEvent(catchTimestamp, tideEvents);
  const nextEvent = findNextEvent(catchTimestamp, tideEvents);

  // 潮の状態を判定
  let tidePhase: 'rising' | 'falling' | 'high' | 'low';

  if (Math.abs(catchTimestamp - nextEvent.timestamp) < 30 * 60 * 1000) {
    tidePhase = nextEvent.type === 'high' ? 'high' : 'low';
  } else if (nextEvent.type === 'high') {
    tidePhase = 'rising';  // 上げ潮
  } else {
    tidePhase = 'falling'; // 下げ潮
  }

  return {
    catchTime,
    tidePhase,
    nextEvent: {
      type: nextEvent.type,
      time: formatTime(nextEvent.timestamp),
      timeUntil: calculateTimeUntil(catchTimestamp, nextEvent.timestamp)
    },
    tideStrength: calculateTideStrength(prevEvent, nextEvent, catchTimestamp)
  };
}
```

## 🎨 UI/UX 設計

### 1. 釣果記録フォームへの追加
```typescript
// 既存のWeather表示の下に配置
<div className="tide-info-section">
  <h3>🌊 潮汐情報</h3>

  {tideInfo && (
    <div className="tide-display">
      <div className="tide-type">
        <span className={`tide-badge tide-${tideInfo.tideType}`}>
          {tideInfo.tideType}
        </span>
        <span className="moon-phase">{tideInfo.moonPhase}</span>
      </div>

      {tideContext && (
        <div className="tide-context">
          <p>釣れた時刻: <strong>{tideContext.catchTime}</strong></p>
          <p>潮の状態: <strong>{getTidePhaseText(tideContext.tidePhase)}</strong></p>
          <p>次の{tideContext.nextEvent.type === 'high' ? '満潮' : '干潮'}:
             <strong>{tideContext.nextEvent.timeUntil}</strong>
          </p>
        </div>
      )}
    </div>
  )}
</div>
```

### 2. 潮汐チャート表示
```typescript
// 1日の潮汐グラフ（オプション）
<div className="tide-chart">
  <svg viewBox="0 0 400 100">
    {tideEvents.map((event, index) => (
      <g key={index}>
        <circle
          cx={getTimePosition(event.time)}
          cy={getHeightPosition(event.height)}
          r="3"
          fill={event.type === 'high' ? '#4A90E2' : '#E24A4A'}
        />
        <text
          x={getTimePosition(event.time)}
          y={getHeightPosition(event.height) - 10}
          textAnchor="middle"
          fontSize="12"
        >
          {formatTime(event.time)}
        </text>
      </g>
    ))}
  </svg>
</div>
```

### 3. 釣果一覧での表示
```typescript
// カード表示にバッジとして追加
<div className="fishing-record-card">
  <div className="record-badges">
    {record.weather && <WeatherBadge weather={record.weather} />}
    {record.tideInfo && (
      <TideBadge
        tideType={record.tideInfo.tideType}
        tidePhase={record.tideContext?.tidePhase}
      />
    )}
  </div>
  {/* 既存の記録内容 */}
</div>
```

## 🔧 実装計画

### Phase 1: 基盤実装 (1-2日)
1. **データモデル追加**
   - TideInfo, TideContext インターフェース定義
   - FishingRecord への潮汐フィールド追加

2. **NOAA API クライアント実装**
   - ステーション検索ロジック
   - 潮汐データ取得機能
   - エラーハンドリング

### Phase 2: コア機能 (2-3日)
1. **潮汐計算エンジン**
   - 月齢・潮汐タイプ計算
   - 潮の状態判定
   - 時間関係の計算

2. **キャッシュ機能**
   - IndexedDB への保存
   - 24時間キャッシュ管理
   - オフライン対応

### Phase 3: UI統合 (1-2日)
1. **フォーム統合**
   - 自動取得機能
   - UI表示コンポーネント
   - ローディング状態

2. **一覧表示**
   - バッジ表示
   - フィルタリング機能
   - ソート機能

### Phase 4: 最適化 (1日)
1. **パフォーマンス最適化**
   - API呼び出し最適化
   - メモリ使用量削減
   - レスポンシブ対応

2. **テスト実装**
   - ユニットテスト
   - E2Eテスト
   - エラーシナリオ

## 📋 技術仕様

### API制限・制約
- **NOAA API**: レート制限なし（無料）
- **リクエストサイズ**: 1日分のデータで約10KB
- **ステーション数**: 日本周辺約50箇所をカバー

### データ保存
- **キャッシュサイズ**: 1ヶ月分で約300KB
- **保存場所**: IndexedDB (tide_cache テーブル)
- **有効期限**: 24時間（自動更新）

### エラー処理
- **API障害時**: キャッシュデータで代替
- **位置情報なし**: 手動ステーション選択
- **ネットワーク障害**: オフライン表示

この設計により、釣果記録時に自動的に潮汐情報が取得され、釣れた時間帯の潮の状態が分析できるようになります。