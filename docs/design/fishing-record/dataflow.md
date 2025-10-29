# データフロー図

## システム全体のデータフロー

```mermaid
flowchart TD
    A[ユーザー] --> B[PWAアプリ]
    B --> C[React Components]
    C --> D[Zustand Store]
    D --> E[Dexie.js]
    E --> F[IndexedDB]

    G[カメラAPI] --> B
    H[GeolocationAPI] --> B
    I[ServiceWorker] --> B

    B --> J[画像圧縮処理]
    J --> E

    F --> K[JSON Export]
    L[JSON Import] --> F
```

## 釣果記録作成フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant UI as React UI
    participant S as Zustand Store
    participant DB as Dexie/IndexedDB
    participant API as Browser APIs
    participant EXIF as EXIF Service
    participant WEATHER as Weather API

    U->>UI: 新規記録ボタンタップ
    UI->>U: 記録フォーム表示

    opt GPS位置取得
        UI->>API: 位置情報取得
        API-->>UI: 緯度経度
        UI->>U: 住所自動入力
    end

    opt 写真撮影・アップロード
        U->>UI: 写真追加ボタン
        UI->>API: カメラ起動/ファイル選択
        API-->>UI: 画像データ
        UI->>EXIF: EXIFデータ抽出
        EXIF-->>UI: GPS座標・撮影日時

        opt 自動データ取得許可時
            UI->>UI: 逆ジオコーディング実行
            UI->>WEATHER: 天気情報取得
            WEATHER-->>UI: 天気データ
            UI->>U: 自動入力確認ダイアログ
            U->>UI: 承認/編集
        end

        UI->>UI: 画像圧縮・リサイズ
    end

    U->>UI: フォーム入力完了
    U->>UI: 保存ボタンタップ
    UI->>S: 記録データ送信
    S->>S: データバリデーション
    S->>DB: データ保存
    DB-->>S: 保存結果
    S-->>UI: 保存完了通知
    UI-->>U: 成功メッセージ表示
    UI-->>U: 一覧画面に遷移
```

## 釣果一覧表示フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant UI as React UI
    participant S as Zustand Store
    participant DB as Dexie/IndexedDB
    participant SW as Service Worker

    U->>UI: 一覧画面アクセス
    UI->>S: 記録リスト取得要求
    S->>DB: 全記録取得クエリ
    DB-->>S: 記録データ（メタデータのみ）
    S-->>UI: 記録リスト
    UI-->>U: カード形式で一覧表示

    opt 並び替え
        U->>UI: 日付順ソート選択
        UI->>S: ソート指示
        S->>S: データソート実行
        S-->>UI: ソート済みリスト
        UI-->>U: 更新された一覧表示
    end

    opt 画像遅延読み込み
        UI->>DB: 表示範囲の画像データ取得
        DB-->>UI: 画像Blob
        UI-->>U: 画像表示
    end

    opt オフライン対応
        SW->>SW: キャッシュから画像取得
        SW-->>UI: キャッシュ済み画像
    end
```

## 釣果詳細表示フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant UI as React UI
    participant S as Zustand Store
    participant DB as Dexie/IndexedDB

    U->>UI: 記録カードタップ
    UI->>S: 詳細データ取得要求
    S->>DB: 記録ID指定で詳細取得
    DB-->>S: 完全な記録データ
    S-->>UI: 詳細データ
    UI-->>U: 詳細画面表示

    opt 高解像度画像表示
        UI->>DB: 元画像データ取得
        DB-->>UI: フル画像Blob
        UI-->>U: 高画質画像表示
    end

    opt 地図表示
        UI->>UI: 位置情報から地図表示
        UI-->>U: 釣り場所のマップ表示
    end
```

## データ永続化フロー

```mermaid
flowchart TD
    A[ユーザー入力] --> B[フォームバリデーション]
    B --> C{バリデーション成功?}
    C -->|No| D[エラー表示]
    C -->|Yes| E[画像処理]

    E --> F[画像圧縮]
    F --> G[画像リサイズ]
    G --> H[WebP変換]

    H --> I[データ構造化]
    I --> J[Zustand Store更新]
    J --> K[IndexedDB保存]

    K --> L{保存成功?}
    L -->|No| M[エラーハンドリング]
    L -->|Yes| N[UI更新]

    M --> O[リトライ処理]
    O --> P[ユーザー通知]

    N --> Q[成功通知]
    Q --> R[一覧画面更新]
```

## 潮汐情報システムフロー（新規追加）

### 潮汐計算データフロー（改善版）

```mermaid
flowchart TD
    A[釣果記録GPS座標] --> B[潮汐計算リクエスト]
    B --> C[キャッシュ確認]
    C --> D{キャッシュヒット?}

    D -->|Yes| E[キャッシュ返却<br/>10ms以内]
    D -->|No| F[天体計算開始]

    F --> G[月齢計算<br/>ニューカム公式]
    G --> H[太陽・月位置計算<br/>VSOP87/ELP2000]
    H --> I[潮汐タイプ判定<br/>大潮・小潮等]

    I --> J[調和解析計算<br/>主要6分潮]
    J --> K[地域補正適用<br/>最寄りステーション]

    %% 新規追加: 座標・季節変動
    K --> K1[座標変動係数計算<br/>緯度・経度ベース]
    K1 --> K2[季節変動係数計算<br/>春分基準・年間角度]
    K2 --> K3[調和定数個別化<br/>M2,S2,K1,O1]

    K3 --> L[満潮・干潮時刻計算]

    L --> M[キャッシュ保存<br/>LRUキャッシュ+変動係数]
    M --> N[潮汐データ返却<br/>200ms以内]

    E --> O[UI更新]
    N --> O

    O --> P[レスポンシブグラフ描画<br/>動的SVG生成]
    P --> Q[釣果との関係分析<br/>時間帯マッピング]

    %% レスポンシブ対応
    P --> P1[画面サイズ検出]
    P1 --> P2[SVGビューボックス調整]
    P2 --> P3[横スクロール防止]
```

### 潮汐UI統合フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant R as 釣果記録詳細
    participant T as 潮汐システム
    participant C as キャッシュ
    participant G as グラフUI

    U->>R: 記録詳細表示
    R->>T: 潮汐情報リクエスト<br/>(GPS座標, 日時)
    T->>C: キャッシュ確認

    alt キャッシュヒット
        C-->>T: キャッシュデータ返却
        Note over T: 10ms以内
    else キャッシュミス
        T->>T: 天体計算実行
        Note over T: 200ms以内
        T->>C: 計算結果キャッシュ
    end

    T-->>R: HybridTideInfo返却
    R->>G: タイドグラフ描画
    G->>G: SVG生成・アニメーション
    G-->>U: インタラクティブグラフ表示

    U->>G: グラフ操作<br/>(ホバー・タップ)
    G-->>U: 詳細ツールチップ表示

### 潮汐グラフ改善フロー（新規）

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant R as 釣果記録詳細
    participant T as TideCalculationService
    participant V as 変動係数エンジン
    participant G as TideGraph（改善版）
    participant C as キャッシュ

    U->>R: 異なる釣果記録を表示
    R->>T: 潮汐計算リクエスト<br/>(座標A, 日時A)

    T->>V: 座標変動係数計算
    V-->>T: 緯度・経度補正値
    T->>V: 季節変動係数計算
    V-->>T: 春分基準年間係数

    T->>T: 調和定数個別化<br/>M2×緯度係数×季節係数
    T->>T: K1・O1分潮生成

    T->>C: 座標・日時・変動ハッシュで<br/>キャッシュ保存
    T-->>R: 個別化TideInfo返却

    R->>G: レスポンシブグラフ描画
    G->>G: 画面幅検出
    G->>G: SVGビューボックス調整
    G->>G: 横スクロール防止CSS適用
    G-->>U: 座標・日時固有グラフ表示

    Note over U,G: 異なる座標・日時で<br/>異なるグラフパターン生成

    U->>R: 別の釣果記録を表示
    R->>T: 潮汐計算リクエスト<br/>(座標B, 日時B)

    Note over T,V: 同様の個別化処理
    T-->>R: 異なるTideInfo返却
    R->>G: 異なるグラフ描画
    G-->>U: 視覚的に区別可能な<br/>グラフパターン表示
```

## エラーハンドリングフロー

```mermaid
flowchart TD
    A[エラー発生] --> B{エラー種別}

    B -->|GPS取得失敗| C[手動入力フォールバック]
    B -->|画像読み込み失敗| D[デフォルト画像表示]
    B -->|DB保存失敗| E[ローカルキャッシュ保存]
    B -->|ネットワークエラー| F[オフラインモード]

    C --> G[ユーザー通知]
    D --> G
    E --> H[リトライ機能提供]
    F --> I[ServiceWorker対応]

    G --> J[代替手段提示]
    H --> K[バックグラウンド同期]
    I --> L[キャッシュからデータ提供]
```

## データ同期・バックアップフロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant UI as React UI
    participant S as Zustand Store
    participant DB as Dexie/IndexedDB
    participant FILE as File System

    Note over U,FILE: データエクスポート
    U->>UI: エクスポートボタン
    UI->>S: 全データ取得要求
    S->>DB: 全記録データ取得
    DB-->>S: 完全なデータセット
    S->>S: JSON形式に変換
    S-->>UI: エクスポートデータ
    UI->>FILE: ファイルダウンロード

    Note over U,FILE: データインポート
    U->>UI: インポートボタン
    UI->>FILE: ファイル選択
    FILE-->>UI: JSONファイル
    UI->>S: インポートデータ検証
    S->>S: データ形式バリデーション
    S->>DB: データ復元実行
    DB-->>S: インポート結果
    S-->>UI: 処理完了通知
    UI-->>U: 成功/失敗メッセージ
```