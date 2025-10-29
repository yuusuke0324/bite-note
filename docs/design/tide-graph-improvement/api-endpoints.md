# 潮汐グラフ改善 API エンドポイント仕様

## 概要

潮汐グラフ改善では新規APIエンドポイントの追加は行わず、既存のフロントエンド処理の拡張により実装する。
将来の機能拡張やマイクロサービス化に備えて、潮汐計算APIの設計案を以下に示す。

## 現在の実装（フロントエンド処理）

### TideCalculationService（クライアントサイド）

```typescript
// 既存の潮汐計算インターフェース
interface TideCalculationService {
  calculateTide(coordinates: Coordinates, date: Date): Promise<TideInfo>;
  calculateBatchTides(requests: TideCalculationInput[]): Promise<TideInfo[]>;
}
```

## 将来のAPI設計（参考）

### ベースURL
```
https://api.fishing-app.com/v1
```

### 共通ヘッダー
```
Content-Type: application/json
Authorization: Bearer {jwt_token}
X-API-Version: v1
```

### 共通レスポンス形式
```json
{
  "success": boolean,
  "data": any,
  "error": {
    "code": string,
    "message": string,
    "details": any
  },
  "timestamp": "2025-09-28T12:00:00Z",
  "requestId": "uuid"
}
```

---

## 潮汐計算 API

### POST /tides/calculate
単一座標・日時の潮汐計算

#### リクエスト
```json
{
  "coordinates": {
    "latitude": 34.41784722222222,
    "longitude": 131.25355555555555
  },
  "date": "2025-09-28T12:00:00Z",
  "options": {
    "forceRecalculation": false,
    "includeHighOrderTides": false,
    "coordinateAccuracy": 6,
    "seasonalVariation": true
  }
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "coordinates": {
      "latitude": 34.41784722222222,
      "longitude": 131.25355555555555
    },
    "date": "2025-09-28T12:00:00Z",
    "currentLevel": 95.8,
    "events": [
      {
        "time": "2025-09-28T06:15:00Z",
        "type": "high",
        "level": 185.3,
        "confidence": 0.95
      },
      {
        "time": "2025-09-28T12:30:00Z",
        "type": "low",
        "level": 25.1,
        "confidence": 0.93
      }
    ],
    "region": {
      "regionId": "chugoku_shimonoseki",
      "name": "下関港",
      "coordinates": {
        "latitude": 33.9553,
        "longitude": 130.9378
      },
      "harmonicConstants": [
        {
          "name": "M2",
          "amplitude": 186.2,
          "phase": 298.5
        }
      ],
      "metadata": {
        "accuracy": "high",
        "dataSource": "JMA",
        "lastUpdated": "2025-01-01T00:00:00Z"
      }
    },
    "metadata": {
      "calculationTime": 45,
      "cacheUsed": false,
      "accuracy": 0.92,
      "coordinateVariation": {
        "latitudeFactor": 1.03,
        "longitudeFactor": 0.98,
        "distanceFromReference": 62.9
      },
      "seasonalVariation": {
        "springEquinoxAngle": 3.14159,
        "latitudeAdjustment": 1.02,
        "monthlyVariation": {
          "M2": 1.05,
          "S2": 0.95
        }
      }
    }
  },
  "timestamp": "2025-09-28T12:00:00Z"
}
```

#### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "INVALID_COORDINATES",
    "message": "座標が有効範囲外です",
    "details": {
      "latitude": 91.0,
      "validRange": {
        "latitude": [-90, 90],
        "longitude": [-180, 180]
      }
    }
  },
  "timestamp": "2025-09-28T12:00:00Z"
}
```

---

### POST /tides/calculate/batch
複数座標・日時の一括潮汐計算

#### リクエスト
```json
{
  "calculations": [
    {
      "coordinates": {
        "latitude": 34.41784722222222,
        "longitude": 131.25355555555555
      },
      "date": "2025-09-28T12:00:00Z"
    },
    {
      "coordinates": {
        "latitude": 35.6762,
        "longitude": 139.6503
      },
      "date": "2025-09-28T15:30:00Z"
    }
  ],
  "priority": "normal"
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "success": true,
        "data": { /* 個別計算結果 */ }
      },
      {
        "success": false,
        "error": {
          "code": "NO_REGIONAL_DATA",
          "message": "該当地域のデータが見つかりません"
        }
      }
    ],
    "summary": {
      "total": 2,
      "successful": 1,
      "failed": 1,
      "cached": 0
    }
  },
  "timestamp": "2025-09-28T12:00:00Z"
}
```

---

### GET /tides/graph/{fishing_record_id}
釣果記録IDに基づく24時間潮汐グラフデータ取得

#### パラメータ
- `fishing_record_id`: 釣果記録のUUID
- `interval`: データ間隔（分）[optional, default: 15]
- `include_events`: イベント（満潮・干潮）を含むか [optional, default: true]

#### レスポンス
```json
{
  "success": true,
  "data": {
    "fishingRecordId": "uuid",
    "graphData": {
      "points": [
        {
          "time": "2025-09-28T00:00:00Z",
          "level": 95.3,
          "state": "rising",
          "isEvent": false
        }
      ],
      "dateRange": {
        "start": "2025-09-28T00:00:00Z",
        "end": "2025-09-29T00:00:00Z"
      },
      "minLevel": 25.1,
      "maxLevel": 185.3,
      "events": [/* 満潮・干潮イベント */],
      "fishingMarkers": ["2025-09-28T15:32:00Z"]
    },
    "chartData": [
      {
        "time": "00:00",
        "tide": 95.3,
        "isEvent": false
      }
    ]
  },
  "timestamp": "2025-09-28T12:00:00Z"
}
```

---

## 地域データ API

### GET /regions/search
座標に基づく地域データ検索

#### パラメータ
- `latitude`: 緯度
- `longitude`: 経度
- `max_distance`: 最大距離（km）[optional, default: 500]
- `limit`: 結果数上限 [optional, default: 3]

#### レスポンス
```json
{
  "success": true,
  "data": {
    "regions": [
      {
        "regionId": "chugoku_shimonoseki",
        "name": "下関港",
        "coordinates": {
          "latitude": 33.9553,
          "longitude": 130.9378
        },
        "distance": 62.9,
        "harmonicConstants": [/* 調和定数配列 */],
        "metadata": {
          "accuracy": "high",
          "dataSource": "JMA"
        }
      }
    ],
    "searchParams": {
      "targetCoordinates": {
        "latitude": 34.41784722222222,
        "longitude": 131.25355555555555
      },
      "maxDistance": 500,
      "foundCount": 3
    }
  }
}
```

---

### GET /regions/{region_id}
特定地域の詳細情報取得

#### レスポンス
```json
{
  "success": true,
  "data": {
    "regionId": "chugoku_shimonoseki",
    "name": "下関港",
    "coordinates": {
      "latitude": 33.9553,
      "longitude": 130.9378
    },
    "harmonicConstants": [
      {
        "name": "M2",
        "amplitude": 186.2,
        "phase": 298.5,
        "description": "主太陰半日周潮"
      },
      {
        "name": "S2",
        "amplitude": 74.8,
        "phase": 320.1,
        "description": "主太陽半日周潮"
      },
      {
        "name": "K1",
        "amplitude": 107.996,
        "phase": 313.5,
        "description": "太陰太陽日周潮（推定値）"
      },
      {
        "name": "O1",
        "amplitude": 78.204,
        "phase": 288.5,
        "description": "主太陰日周潮（推定値）"
      }
    ],
    "metadata": {
      "accuracy": "high",
      "dataSource": "気象庁",
      "observationPeriod": "1981-2010",
      "lastUpdated": "2025-01-01T00:00:00Z",
      "notes": "K1, O1は推定値として算出"
    },
    "coverage": {
      "effectiveRadius": 100,
      "recommendedMaxDistance": 150
    }
  }
}
```

---

## キャッシュ管理 API

### DELETE /cache/tides
潮汐計算キャッシュのクリア

#### リクエスト
```json
{
  "type": "all" | "coordinates" | "date_range",
  "coordinates": {
    "latitude": 34.41784722222222,
    "longitude": 131.25355555555555
  },
  "dateRange": {
    "start": "2025-09-28T00:00:00Z",
    "end": "2025-09-29T00:00:00Z"
  }
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "clearedEntries": 15,
    "remainingEntries": 85
  }
}
```

---

### GET /cache/stats
キャッシュ統計情報取得

#### レスポンス
```json
{
  "success": true,
  "data": {
    "totalEntries": 100,
    "hitRate": 0.78,
    "missRate": 0.22,
    "averageCalculationTime": 35,
    "cacheSize": "15.2 MB",
    "oldestEntry": "2025-09-27T10:00:00Z",
    "newestEntry": "2025-09-28T12:00:00Z"
  }
}
```

---

## バリデーション API

### POST /validate/coordinates
座標の妥当性検証

#### リクエスト
```json
{
  "coordinates": {
    "latitude": 34.41784722222222,
    "longitude": 131.25355555555555
  }
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "nearestRegion": {
      "regionId": "chugoku_shimonoseki",
      "distance": 62.9
    },
    "warnings": [],
    "recommendations": {
      "accuracy": "high",
      "confidence": 0.95
    }
  }
}
```

---

### POST /validate/date
日時の妥当性検証

#### リクエスト
```json
{
  "date": "2025-09-28T12:00:00Z"
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "inCalculationRange": true,
    "seasonalFactors": {
      "springEquinoxAngle": 3.14159,
      "moonPhase": "waxing_gibbous",
      "tideStrength": "medium"
    }
  }
}
```

---

## エラーコード一覧

| コード | 説明 | HTTPステータス |
|--------|------|----------------|
| `INVALID_COORDINATES` | 座標が有効範囲外 | 400 |
| `INVALID_DATE` | 日時が無効または範囲外 | 400 |
| `NO_REGIONAL_DATA` | 該当地域のデータなし | 404 |
| `CALCULATION_TIMEOUT` | 計算タイムアウト | 408 |
| `INSUFFICIENT_DATA` | データ不足 | 422 |
| `RATE_LIMIT_EXCEEDED` | レート制限超過 | 429 |
| `INTERNAL_ERROR` | 内部サーバーエラー | 500 |
| `SERVICE_UNAVAILABLE` | サービス利用不可 | 503 |

---

## レート制限

| エンドポイント | 制限 | ウィンドウ |
|---------------|------|-----------|
| `/tides/calculate` | 100回/分 | 1分 |
| `/tides/calculate/batch` | 10回/分 | 1分 |
| `/tides/graph/*` | 50回/分 | 1分 |
| `/regions/search` | 200回/分 | 1分 |
| `/cache/*` | 20回/分 | 1分 |

---

## 認証・認可

### Bearer Token認証
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 必要な権限
- `tide:read` - 潮汐データ読み取り
- `tide:calculate` - 潮汐計算実行
- `cache:manage` - キャッシュ管理（管理者のみ）

---

## WebSocket API（リアルタイム更新）

### 接続
```
wss://api.fishing-app.com/v1/ws/tides
```

### 潮汐計算進捗の購読
```json
{
  "action": "subscribe",
  "channel": "calculation_progress",
  "params": {
    "calculationId": "uuid"
  }
}
```

### 進捗通知
```json
{
  "channel": "calculation_progress",
  "data": {
    "calculationId": "uuid",
    "progress": 0.75,
    "status": "calculating_seasonal_variation",
    "estimatedCompletion": "2025-09-28T12:00:05Z"
  }
}
```

---

## SDKサンプル（TypeScript）

```typescript
import { TideApiClient } from '@fishing-app/tide-api';

const client = new TideApiClient({
  baseUrl: 'https://api.fishing-app.com/v1',
  apiKey: 'your-api-key'
});

// 単一計算
const result = await client.tides.calculate({
  coordinates: { latitude: 34.4178, longitude: 131.2536 },
  date: new Date('2025-09-28T12:00:00Z')
});

// バッチ計算
const batchResults = await client.tides.calculateBatch([
  { coordinates: { latitude: 34.4178, longitude: 131.2536 }, date: new Date() },
  { coordinates: { latitude: 35.6762, longitude: 139.6503 }, date: new Date() }
]);

// グラフデータ取得
const graphData = await client.tides.getGraphData('fishing-record-uuid');
```

---

**注意**: 上記API設計は将来の機能拡張に備えた参考実装です。現在の潮汐グラフ改善では、既存のフロントエンド処理を拡張して実装します。