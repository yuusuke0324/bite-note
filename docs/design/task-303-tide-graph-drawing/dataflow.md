# TASK-303: 潮汐グラフ描画改善 データフロー図

## システム全体のデータフロー

### 高レベルデータフロー（描画改善）

```mermaid
flowchart TD
    A[潮汐データ入力] --> B[TideDataValidator]
    B --> C{データ検証}
    C -->|Valid| D[TideDataTransformer]
    C -->|Invalid| E[ErrorHandler]

    D --> F[rechartsデータ形式変換]
    F --> G[ResponsiveChartContainer]
    G --> H[画面サイズ計算]
    H --> I[TideChart描画]

    E --> J[エラーメッセージ表示]
    I --> K[軸ラベル表示確認]
    K --> L{軸ラベル表示OK?}
    L -->|Yes| M[正常表示完了]
    L -->|No| N[マージン調整]
    N --> I

    J --> O[フォールバック表示]
```

## 詳細データフロー

### 1. データ検証・変換フロー

```mermaid
sequenceDiagram
    participant Input as DataInput
    participant Validator as TideDataValidator
    participant Transformer as TideDataTransformer
    participant Chart as TideChart

    Input->>Validator: 生データ投入
    Validator->>Validator: 型チェック
    Validator->>Validator: 時刻フォーマット検証
    Validator->>Validator: 数値範囲チェック

    alt データ有効
        Validator-->>Transformer: 検証済みデータ
        Transformer->>Transformer: recharts形式変換
        Transformer->>Transformer: 時刻正規化
        Transformer-->>Chart: TideChartData[]
    else データ無効
        Validator-->>Chart: ValidationError
        Chart->>Chart: エラーメッセージ表示
    end
```

### 2. レスポンシブ描画フロー

```mermaid
sequenceDiagram
    participant Container as ResponsiveChartContainer
    participant Detector as ViewportDetector
    participant Calculator as SVGSizeCalculator
    participant Margin as MarginCalculator
    participant Chart as TideChart

    Container->>Detector: 画面サイズ検出
    Detector-->>Container: デバイス種別・サイズ

    Container->>Calculator: SVGサイズ計算
    Calculator->>Calculator: 最小サイズチェック (600x300)
    Calculator->>Calculator: アスペクト比調整 (2:1)
    Calculator-->>Container: 計算済みサイズ

    Container->>Margin: マージン計算
    Margin->>Margin: X軸ラベル用 (40px)
    Margin->>Margin: Y軸ラベル用 (60px)
    Margin-->>Container: 最適マージン

    Container->>Chart: 描画設定適用
    Chart->>Chart: recharts描画実行
```

### 3. エラーハンドリングフロー

```mermaid
flowchart TD
    A[データ入力] --> B{データ種別判定}

    B -->|空配列| C[EmptyDataError]
    B -->|不正形式| D[FormatError]
    B -->|範囲外数値| E[RangeError]
    B -->|有効データ| F[正常処理]

    C --> G[「データ未取得」表示]
    D --> H[「データ形式エラー」表示]
    E --> I[「数値範囲エラー」表示]

    F --> J{描画サイズチェック}
    J -->|サイズ不足| K[SizeError]
    J -->|サイズ十分| L[グラフ描画]

    K --> M[最小サイズ強制適用]
    M --> N[警告付きグラフ表示]

    L --> O{軸ラベル表示チェック}
    O -->|非表示| P[マージン再計算]
    O -->|表示OK| Q[描画完了]

    P --> R[マージン増加]
    R --> L
```

## データ変換詳細フロー

### 内部データ → recharts形式変換

```mermaid
flowchart LR
    A[TideGraphPoint[]] --> B[DataTransformer]

    B --> C[時刻抽出]
    C --> D[Date → "HH:mm"]

    B --> E[潮位抽出]
    E --> F[number → cm単位]

    B --> G[イベント判定]
    G --> H[boolean → isEvent]

    D --> I[TideChartData]
    F --> I
    H --> I

    I --> J[rechartsLineChart]

    subgraph "変換例"
        K["{ time: Date('14:30'), level: 125.5, isEvent: true }"]
        L["{ time: '14:30', tide: 125.5, isEvent: true }"]
        K --> L
    end
```

### データ検証詳細フロー

```mermaid
flowchart TD
    A[入力データ] --> B[型チェック]
    B --> C{配列型?}
    C -->|No| D[TypeError]
    C -->|Yes| E[要素数チェック]

    E --> F{要素数 > 1?}
    F -->|No| G[EmptyDataError]
    F -->|Yes| H[各要素検証]

    H --> I[時刻フォーマット検証]
    I --> J[/^\d{2}:\d{2}$/]
    J --> K{正規表現一致?}
    K -->|No| L[TimeFormatError]
    K -->|Yes| M[数値検証]

    M --> N[typeof tide === 'number']
    N --> O{数値型?}
    O -->|No| P[NumberTypeError]
    O -->|Yes| Q[範囲チェック]

    Q --> R[-1000 <= tide <= 10000]
    R --> S{範囲内?}
    S -->|No| T[RangeError]
    S -->|Yes| U[検証完了]

    D --> V[エラーハンドリング]
    G --> V
    L --> V
    P --> V
    T --> V
    U --> W[正常処理]
```

## SVGサイズ計算フロー

### レスポンシブサイズ計算

```mermaid
flowchart TD
    A[画面サイズ取得] --> B[デバイス種別判定]

    B --> C{Mobile?}
    C -->|Yes| D[320-768px対応]
    B --> E{Tablet?}
    E -->|Yes| F[768-1024px対応]
    B --> G{Desktop?}
    G -->|Yes| H[1024px+対応]

    D --> I[最小幅: 320px]
    F --> J[推奨幅: 768px]
    H --> K[最大幅: 90vw]

    I --> L[アスペクト比計算]
    J --> L
    K --> L

    L --> M[width / 2 = height]
    M --> N[最小サイズチェック]
    N --> O{600x300px以上?}

    O -->|No| P[最小サイズ強制]
    O -->|Yes| Q[計算値使用]

    P --> R[width: 600px, height: 300px]
    Q --> S[計算済みサイズ]
    R --> T[SVGサイズ確定]
    S --> T
```

### マージン動的計算

```mermaid
flowchart TD
    A[SVGサイズ] --> B[利用可能領域計算]
    B --> C[SVG幅 - 軸ラベル領域]

    C --> D[X軸マージン計算]
    D --> E[bottom: Math.max(40px, 高さ*0.15)]

    B --> F[Y軸マージン計算]
    F --> G[left: Math.max(60px, 幅*0.1)]

    E --> H[マージン確定]
    G --> H

    H --> I[チャート領域計算]
    I --> J[chartWidth = SVG幅 - left - right]
    I --> K[chartHeight = SVG高 - top - bottom]

    J --> L{チャート領域 > 最小サイズ?}
    K --> L
    L -->|No| M[マージン縮小]
    L -->|Yes| N[マージン確定]

    M --> O[マージン再計算]
    O --> I
    N --> P[描画実行]
```

## エラー分類・処理フロー

### エラー優先度分類

```mermaid
flowchart TD
    A[エラー発生] --> B[エラー種別判定]

    B --> C[Critical: データ構造エラー]
    B --> D[Warning: 数値範囲外]
    B --> E[Info: 軽微な不整合]

    C --> F[グラフ非表示]
    F --> G[「データ形式エラー」表示]

    D --> H[グラフ表示継続]
    H --> I[警告バッジ表示]

    E --> J[グラフ表示継続]
    J --> K[コンソール情報出力]

    G --> L[フォールバック: テキスト表示]
    I --> M[正常描画 + 警告]
    K --> N[正常描画]
```

### ユーザーメッセージ生成

```mermaid
flowchart LR
    A[内部エラー] --> B[MessageGenerator]

    B --> C{エラー種別}
    C -->|EmptyData| D["データ未取得"]
    C -->|FormatError| E["データ形式エラー"]
    C -->|RangeError| F["数値が範囲外です"]
    C -->|SizeError| G["表示領域が不足しています"]
    C -->|NetworkError| H["データの取得に失敗しました"]

    D --> I[非技術者向けメッセージ]
    E --> I
    F --> I
    G --> I
    H --> I

    I --> J[ユーザー表示]
```

## パフォーマンス最適化フロー

### レンダリング最適化

```mermaid
sequenceDiagram
    participant Parent as ParentComponent
    participant Chart as TideChart
    participant Memo as React.memo
    participant Calculation as HeavyCalculation

    Parent->>Chart: 新props
    Chart->>Memo: props比較

    alt props変更なし
        Memo-->>Parent: キャッシュ結果返却
    else props変更あり
        Memo->>Chart: 再描画実行
        Chart->>Calculation: useMemo実行
        Calculation-->>Chart: 計算結果
        Chart-->>Parent: 新しい描画結果
    end
```

### データ処理最適化

```mermaid
flowchart TD
    A[大量データ] --> B{データ量チェック}
    B -->|< 100points| C[通常処理]
    B -->|100-1000points| D[間引き処理]
    B -->|> 1000points| E[サンプリング処理]

    C --> F[全データ描画]
    D --> G[重要ポイント保持]
    E --> H[代表ポイント選択]

    G --> I[適応的間引き]
    H --> J[時間軸均等サンプリング]

    F --> K[描画実行]
    I --> K
    J --> K

    K --> L{描画時間チェック}
    L -->|> 1秒| M[さらなる最適化]
    L -->|< 1秒| N[完了]
```

---

**作成日**: 2025-09-28
**作成者**: フロントエンド開発チーム