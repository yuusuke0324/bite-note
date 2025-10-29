# 潮汐グラフ改善 データフロー図

## システム全体のデータフロー

### 高レベルデータフロー

```mermaid
flowchart TD
    A[釣果記録データ] --> B[TideIntegration]
    B --> C[TideCalculationService]
    C --> D[RegionalDataService]
    C --> E[HarmonicAnalysisEngine]
    C --> F[キャッシュチェック]

    D --> G[地域データベース]
    E --> H[分潮計算]
    F --> I{キャッシュヒット?}

    I -->|Yes| J[キャッシュデータ]
    I -->|No| K[新規計算]

    K --> L[座標変動係数]
    K --> M[季節変動係数]
    L --> N[調和定数調整]
    M --> N

    N --> O[24時間潮位計算]
    O --> P[ScaleRenderer]
    P --> Q[動的スケール生成]

    J --> R[TideGraph]
    Q --> R
    R --> S[recharts描画]
    S --> T[ユーザー表示]
```

## 詳細データフロー

### 1. 潮汐計算初期化フロー

```mermaid
sequenceDiagram
    participant U as User
    participant TI as TideIntegration
    participant TC as TideCalculationService
    participant RD as RegionalDataService
    participant C as Cache

    U->>TI: 釣果記録選択
    TI->>TC: calculateTide(coordinates, date)
    TC->>C: キャッシュキー生成
    C-->>TC: キャッシュ結果 or null

    alt キャッシュミス
        TC->>RD: findNearestStations(coordinates)
        RD-->>TC: 最適地域データ
        TC->>TC: 座標変動係数計算
        TC->>TC: 季節変動係数計算
        TC->>TC: 調和解析実行
        TC->>C: 結果をキャッシュ
    end

    TC-->>TI: 潮汐情報
    TI->>TI: グラフデータ生成
    TI-->>U: 潮汐グラフ表示
```

### 2. グラフ描画フロー

```mermaid
sequenceDiagram
    participant TI as TideIntegration
    participant TG as TideGraph
    participant SR as ScaleRenderer
    participant RC as recharts
    participant RU as ResponsiveUtils

    TI->>TG: tideGraphData
    TG->>TG: データ検証
    TG->>RU: 画面サイズ取得
    RU-->>TG: SVG寸法

    TG->>SR: 動的スケール計算
    SR->>SR: DynamicScaleCalculator.calculateScale()
    SR-->>TG: Y軸スケール情報

    TG->>TG: 軸ラベル生成
    TG->>TG: マージン計算
    TG->>RC: recharts描画
    RC-->>TG: SVGグラフ
```

### 3. レスポンシブ対応フロー

```mermaid
flowchart TD
    A[画面サイズ変更] --> B[useResize Hook]
    B --> C[ResponsiveUtils.detectDeviceType]
    C --> D{デバイス種別}

    D -->|Mobile| E[320px-414px対応]
    D -->|Tablet| F[768px-1024px対応]
    D -->|Desktop| G[1200px+対応]

    E --> H[最小マージン適用]
    F --> I[標準マージン適用]
    G --> J[最大マージン適用]

    H --> K[SVG寸法再計算]
    I --> K
    J --> K

    K --> L[TideGraph再描画]
    L --> M[軸ラベル再配置]
```

## データ変換フロー

### 座標・日時から潮汐データへの変換

```mermaid
flowchart LR
    A[釣果記録] --> B[座標抽出]
    A --> C[日時抽出]

    B --> D[緯度: lat]
    B --> E[経度: lng]
    C --> F[年月日: YYYY-MM-DD]
    C --> G[時刻: HH:mm:ss]

    D --> H[座標変動係数]
    E --> H
    F --> I[季節変動係数]
    G --> I

    H --> J[調和定数調整]
    I --> J

    J --> K[15分間隔計算]
    K --> L[96ポイント生成]
    L --> M[TideGraphData]
```

### グラフデータ構造変換

```mermaid
flowchart TD
    A[TideGraphData] --> B[データ検証]
    B --> C{有効データ?}

    C -->|No| D[エラーメッセージ表示]
    C -->|Yes| E[スケール計算]

    E --> F[DynamicScaleCalculator]
    F --> G[min/max/interval決定]
    G --> H[Y軸ティック生成]

    A --> I[時間軸ラベル生成]
    I --> J[00:00, 04:00, 08:00...]

    H --> K[recharts用データ]
    J --> K
    K --> L[LineChart描画]
```

## エラーハンドリングフロー

### 座標エラー処理

```mermaid
flowchart TD
    A[座標入力] --> B{座標範囲チェック}
    B -->|Valid| C[地域データ検索]
    B -->|Invalid| D[座標範囲エラー]

    C --> E{地域データ存在?}
    E -->|Yes| F[最寄り地域選択]
    E -->|No| G[デフォルト地域使用]

    F --> H[正常処理]
    G --> I[精度警告表示]
    I --> H

    D --> J[エラーメッセージ表示]
```

### グラフ描画エラー処理

```mermaid
flowchart TD
    A[グラフデータ] --> B{データ検証}
    B -->|Valid| C[スケール計算]
    B -->|Invalid| D[データ形式エラー]

    C --> E{SVGサイズ十分?}
    E -->|Yes| F[normal描画]
    E -->|No| G[最小サイズ適用]

    G --> H[軸ラベル調整]
    H --> F

    D --> I[エラーメッセージ表示]

    F --> J{recharts初期化成功?}
    J -->|Yes| K[グラフ表示]
    J -->|No| L[描画エラー表示]
```

## パフォーマンス最適化フロー

### キャッシュ戦略

```mermaid
flowchart TD
    A[潮汐計算リクエスト] --> B[キャッシュキー生成]
    B --> C[緯度_経度_日時ISO]
    C --> D{キャッシュ存在?}

    D -->|Hit| E[キャッシュデータ返却]
    D -->|Miss| F[新規計算実行]

    F --> G[計算完了]
    G --> H{キャッシュ容量確認}
    H -->|余裕あり| I[新規エントリ追加]
    H -->|満杯| J[LRU削除後追加]

    I --> K[結果返却]
    J --> K
    E --> K
```

### レンダリング最適化

```mermaid
flowchart TD
    A[データ更新] --> B[useMemo依存配列チェック]
    B --> C{依存値変更?}

    C -->|No| D[キャッシュ結果使用]
    C -->|Yes| E[再計算実行]

    E --> F[useCallback最適化]
    F --> G[イベントハンドラー再利用]
    G --> H[React.memo適用]
    H --> I[不要な再描画防止]

    D --> J[高速描画]
    I --> J
```

---

**作成日**: 2025-09-28
**作成者**: 潮汐システム開発チーム