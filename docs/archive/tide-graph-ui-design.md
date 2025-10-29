# タイドグラフUI/UX設計書

## 📋 要件定義

### ユーザーの期待
> 「魚をアップロードしたら、記録一覧詳細画面で波の情報が見れるようになると嬉しい」

### 参考サイト分析
- **tide.chowari.jp** のタイドグラフを参考
- 直感的で美しい潮汐可視化
- モバイルファーストな操作性
- 釣り人に特化した情報表示

## 🎨 タイドグラフUI設計

### 1. 基本レイアウト構成

```
┌─────────────────────────────────────────────────────────┐
│                 潮汐情報ヘッダー                          │
│  🌊 大潮  📍東京湾  📅2024-12-22  🌙満月                 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                  メインタイドグラフ                        │
│                                                       │
│  潮位                                                  │
│   ↑                                                   │
│ 2.0m  ∩     ∩     ∩     釣れた時刻                     │
│      ∕ ＼   ∕ ＼   ∕ ＼      ↓                        │
│ 1.0m      ＼ ∕     ＼ ∕     ＼ ∕  🎣                    │
│ 0.0m       ∪       ∪       ∪                         │
│ -1.0m                                                 │
│      ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤        │
│     00:00 04:00 08:00 12:00 16:00 20:00 24:00        │
│                        時刻 →                         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                   潮汐イベント情報                         │
│  🔴 06:24 満潮 1.8m  🔵 12:45 干潮 0.2m                │
│  🔴 18:52 満潮 1.9m  🔵 00:15 干潮 0.1m                │
└─────────────────────────────────────────────────────────┘
```

### 2. カラーパレット設計

```css
:root {
  /* 潮汐グラフカラー */
  --tide-high: #4A90E2;      /* 満潮：深い青 */
  --tide-low: #E24A4A;       /* 干潮：赤 */
  --tide-line: #2E7BC6;      /* グラフライン：青系 */
  --tide-fill: rgba(74, 144, 226, 0.1); /* グラフ塗りつぶし */

  /* 潮汐タイプカラー */
  --spring-tide: #FF6B35;    /* 大潮：オレンジ */
  --neap-tide: #4ECDC4;      /* 小潮：ティール */
  --medium-tide: #45B7D1;    /* 中潮：水色 */
  --young-tide: #96CEB4;     /* 若潮：緑 */
  --old-tide: #FFEAA7;       /* 長潮：黄色 */

  /* 時間軸・背景 */
  --grid-line: #E0E6ED;      /* グリッドライン：薄グレー */
  --background: #F8FAFB;     /* 背景：オフホワイト */
  --text-primary: #2C3E50;   /* メインテキスト */
  --text-secondary: #7F8C8D; /* サブテキスト */

  /* 釣果マーカー */
  --catch-marker: #E74C3C;   /* 釣れた時刻マーカー：赤 */
  --catch-highlight: rgba(231, 76, 60, 0.2); /* ハイライト */
}
```

### 3. コンポーネント設計

#### メインタイドグラフコンポーネント
```typescript
interface TideGraphProps {
  tideInfo: HybridTideInfo;
  catchTime?: string;
  date: Date;
  height?: number;
  interactive?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
}

const TideGraph: React.FC<TideGraphProps> = ({
  tideInfo,
  catchTime,
  date,
  height = 300,
  interactive = true,
  showGrid = true,
  showLabels = true
}) => {
  return (
    <div className="tide-graph-container">
      {/* ヘッダー情報 */}
      <TideGraphHeader tideInfo={tideInfo} date={date} />

      {/* メインSVGグラフ */}
      <svg
        viewBox={`0 0 ${GRAPH_WIDTH} ${height}`}
        className="tide-graph-svg"
      >
        {/* 背景グリッド */}
        {showGrid && <TideGraphGrid />}

        {/* 潮汐曲線 */}
        <TideCurve tideInfo={tideInfo} />

        {/* 満潮・干潮マーカー */}
        <TideEventMarkers events={tideInfo.events} />

        {/* 釣果時刻マーカー */}
        {catchTime && <CatchTimeMarker time={catchTime} />}

        {/* 時間軸ラベル */}
        {showLabels && <TimeAxisLabels />}

        {/* 潮位軸ラベル */}
        {showLabels && <TideHeightLabels />}
      </svg>

      {/* 詳細情報 */}
      <TideEventsList events={tideInfo.events} />
    </div>
  );
};
```

#### タイドグラフヘッダー
```typescript
const TideGraphHeader: React.FC<{
  tideInfo: HybridTideInfo;
  date: Date;
}> = ({ tideInfo, date }) => {
  return (
    <div className="tide-graph-header">
      <div className="tide-type-badge">
        <span className={`tide-badge tide-${tideInfo.classification.tideType}`}>
          🌊 {tideInfo.classification.tideType}
        </span>
        <span className="tide-strength">
          強さ {tideInfo.classification.strength}%
        </span>
      </div>

      <div className="location-info">
        📍 {tideInfo.regional.nearestStation}
        <span className="distance">
          ({tideInfo.regional.distanceKm.toFixed(1)}km)
        </span>
      </div>

      <div className="date-moon-info">
        📅 {formatDate(date)}
        <span className="moon-phase">
          🌙 {tideInfo.astronomical.moonPhase}
        </span>
      </div>
    </div>
  );
};
```

#### インタラクティブな潮汐曲線
```typescript
const TideCurve: React.FC<{ tideInfo: HybridTideInfo }> = ({ tideInfo }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    time: string;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  // 24時間分のデータポイントを生成（10分間隔）
  const dataPoints = useMemo(() => {
    const points: Array<{ time: Date; height: number; x: number; y: number }> = [];
    const startOfDay = new Date(tideInfo.date);
    startOfDay.setHours(0, 0, 0, 0);

    for (let minutes = 0; minutes < 24 * 60; minutes += 10) {
      const time = new Date(startOfDay.getTime() + minutes * 60 * 1000);
      const height = calculateTideLevel(time, tideInfo.location);

      points.push({
        time,
        height,
        x: (minutes / (24 * 60)) * GRAPH_WIDTH,
        y: GRAPH_HEIGHT - ((height + 2) / 4) * GRAPH_HEIGHT // -2m～+2mを想定
      });
    }

    return points;
  }, [tideInfo]);

  // SVGパスを生成
  const pathData = useMemo(() => {
    if (dataPoints.length === 0) return '';

    const commands = dataPoints.map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    );

    return commands.join(' ');
  }, [dataPoints]);

  // グラデーション塗りつぶし用のパス
  const fillPathData = useMemo(() => {
    if (dataPoints.length === 0) return '';

    const bottomY = GRAPH_HEIGHT;
    const pathCommands = [
      `M ${dataPoints[0].x} ${bottomY}`,
      ...dataPoints.map(point => `L ${point.x} ${point.y}`),
      `L ${dataPoints[dataPoints.length - 1].x} ${bottomY}`,
      'Z'
    ];

    return pathCommands.join(' ');
  }, [dataPoints]);

  return (
    <g className="tide-curve">
      {/* グラデーション定義 */}
      <defs>
        <linearGradient id="tideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--tide-line)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--tide-line)" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* 塗りつぶしエリア */}
      <path
        d={fillPathData}
        fill="url(#tideGradient)"
        className="tide-fill"
      />

      {/* メインの潮汐曲線 */}
      <path
        d={pathData}
        fill="none"
        stroke="var(--tide-line)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="tide-curve-line"
      />

      {/* インタラクティブエリア（透明） */}
      <rect
        width={GRAPH_WIDTH}
        height={GRAPH_HEIGHT}
        fill="transparent"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const relativeX = (x / rect.width) * GRAPH_WIDTH;

          // 最寄りのデータポイントを見つける
          const closestPoint = dataPoints.reduce((closest, point) =>
            Math.abs(point.x - relativeX) < Math.abs(closest.x - relativeX) ? point : closest
          );

          setHoveredPoint({
            time: formatTime(closestPoint.time),
            height: closestPoint.height,
            x: closestPoint.x,
            y: closestPoint.y
          });
        }}
        onMouseLeave={() => setHoveredPoint(null)}
      />

      {/* ホバー時のツールチップ */}
      {hoveredPoint && (
        <g className="tide-tooltip">
          <circle
            cx={hoveredPoint.x}
            cy={hoveredPoint.y}
            r="4"
            fill="var(--tide-line)"
            stroke="white"
            strokeWidth="2"
          />
          <TideTooltip
            x={hoveredPoint.x}
            y={hoveredPoint.y}
            time={hoveredPoint.time}
            height={hoveredPoint.height}
          />
        </g>
      )}
    </g>
  );
};
```

#### 釣果時刻マーカー
```typescript
const CatchTimeMarker: React.FC<{ time: string }> = ({ time }) => {
  const xPosition = timeToXPosition(time);

  return (
    <g className="catch-time-marker">
      {/* 垂直線 */}
      <line
        x1={xPosition}
        y1={0}
        x2={xPosition}
        y2={GRAPH_HEIGHT}
        stroke="var(--catch-marker)"
        strokeWidth="2"
        strokeDasharray="5,3"
        className="catch-time-line"
      />

      {/* 釣りアイコン */}
      <g transform={`translate(${xPosition - 12}, 10)`}>
        <rect
          x="0"
          y="0"
          width="24"
          height="20"
          rx="4"
          fill="var(--catch-marker)"
          className="catch-marker-bg"
        />
        <text
          x="12"
          y="14"
          textAnchor="middle"
          fontSize="12"
          fill="white"
          className="catch-marker-icon"
        >
          🎣
        </text>
      </g>

      {/* 時刻ラベル */}
      <text
        x={xPosition}
        y={GRAPH_HEIGHT + 15}
        textAnchor="middle"
        fontSize="11"
        fill="var(--catch-marker)"
        fontWeight="bold"
        className="catch-time-label"
      >
        {time}
      </text>
    </g>
  );
};
```

### 4. 記録詳細画面への統合

#### 釣果記録詳細ページ
```typescript
const FishingRecordDetail: React.FC<{ recordId: string }> = ({ recordId }) => {
  const record = useFishingRecord(recordId);
  const [showTideGraph, setShowTideGraph] = useState(false);

  if (!record) return <LoadingSpinner />;

  return (
    <div className="fishing-record-detail">
      {/* 基本情報セクション */}
      <RecordBasicInfo record={record} />

      {/* 写真セクション */}
      <RecordPhotos photos={record.photos} />

      {/* 潮汐情報セクション */}
      <section className="tide-section">
        <div className="section-header">
          <h3>🌊 潮汐情報</h3>
          <button
            onClick={() => setShowTideGraph(!showTideGraph)}
            className="toggle-graph-btn"
          >
            {showTideGraph ? '📈 グラフを閉じる' : '📊 潮汐グラフを表示'}
          </button>
        </div>

        {/* 潮汐サマリー */}
        <TideSummaryCard
          tideInfo={record.tideInfo}
          tideContext={record.tideContext}
        />

        {/* 展開可能な詳細グラフ */}
        <AnimatePresence>
          {showTideGraph && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="tide-graph-container"
            >
              <TideGraph
                tideInfo={record.tideInfo}
                catchTime={record.time}
                date={new Date(record.date)}
                height={280}
                interactive={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* その他の詳細情報 */}
      <RecordAdditionalInfo record={record} />
    </div>
  );
};
```

#### 潮汐サマリーカード
```typescript
const TideSummaryCard: React.FC<{
  tideInfo?: HybridTideInfo;
  tideContext?: TideContext;
}> = ({ tideInfo, tideContext }) => {
  if (!tideInfo || !tideContext) {
    return <div className="tide-summary-placeholder">潮汐情報を取得中...</div>;
  }

  return (
    <div className="tide-summary-card">
      <div className="tide-summary-grid">
        {/* 潮汐タイプ */}
        <div className="tide-summary-item">
          <div className="item-label">潮汐</div>
          <div className={`item-value tide-${tideInfo.classification.tideType}`}>
            🌊 {tideInfo.classification.tideType}
          </div>
        </div>

        {/* 釣れた時の潮の状態 */}
        <div className="tide-summary-item">
          <div className="item-label">釣れた時</div>
          <div className="item-value">
            {getTidePhaseIcon(tideContext.tidePhase)} {getTidePhaseText(tideContext.tidePhase)}
          </div>
        </div>

        {/* 次のイベント */}
        <div className="tide-summary-item">
          <div className="item-label">次の{tideContext.nextEvent.type === 'high' ? '満潮' : '干潮'}</div>
          <div className="item-value">
            {tideContext.nextEvent.type === 'high' ? '🔴' : '🔵'} {tideContext.nextEvent.timeUntil}
          </div>
        </div>

        {/* 潮の強さ */}
        <div className="tide-summary-item">
          <div className="item-label">潮の強さ</div>
          <div className="item-value">
            <TideStrengthBar strength={tideInfo.classification.strength} />
            {tideInfo.classification.strength}%
          </div>
        </div>
      </div>

      {/* 今日の満潮・干潮 */}
      <div className="tide-events-mini">
        <div className="events-label">今日の潮汐</div>
        <div className="events-list">
          {tideInfo.events.map((event, index) => (
            <span key={index} className={`event-mini event-${event.type}`}>
              {event.type === 'high' ? '🔴' : '🔵'} {event.time}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 5. モバイル最適化

#### レスポンシブ設計
```css
.tide-graph-container {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
}

/* モバイル（〜768px） */
@media (max-width: 768px) {
  .tide-graph-header {
    flex-direction: column;
    gap: 8px;
    padding: 12px;
  }

  .tide-graph-svg {
    height: 240px; /* モバイルでは高さを抑制 */
  }

  .tide-summary-grid {
    grid-template-columns: 1fr 1fr; /* 2列レイアウト */
    gap: 12px;
  }

  /* タッチ操作対応 */
  .toggle-graph-btn {
    min-height: 44px; /* タッチターゲット最小サイズ */
    padding: 12px 16px;
  }
}

/* タブレット（768px〜1024px） */
@media (min-width: 768px) and (max-width: 1024px) {
  .tide-summary-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .tide-graph-svg {
    height: 300px;
  }
}

/* デスクトップ（1024px〜） */
@media (min-width: 1024px) {
  .tide-graph-container {
    max-width: 800px;
    margin: 0 auto;
  }

  .tide-graph-svg {
    height: 320px;
  }
}
```

### 6. アニメーション設計

#### グラフ表示アニメーション
```typescript
const useGraphAnimation = (show: boolean) => {
  const controls = useAnimation();

  useEffect(() => {
    if (show) {
      controls.start({
        pathLength: 1,
        opacity: 1,
        transition: {
          pathLength: { duration: 1.5, ease: "easeInOut" },
          opacity: { duration: 0.5 }
        }
      });
    } else {
      controls.start({
        pathLength: 0,
        opacity: 0,
        transition: { duration: 0.3 }
      });
    }
  }, [show, controls]);

  return controls;
};

// SVGパスにアニメーション適用
<motion.path
  d={pathData}
  fill="none"
  stroke="var(--tide-line)"
  strokeWidth="3"
  initial={{ pathLength: 0, opacity: 0 }}
  animate={controls}
  style={{ pathLength: 0 }}
/>
```

#### 潮汐強度バーアニメーション
```typescript
const TideStrengthBar: React.FC<{ strength: number }> = ({ strength }) => {
  return (
    <div className="tide-strength-bar">
      <motion.div
        className="strength-fill"
        initial={{ width: 0 }}
        animate={{ width: `${strength}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          backgroundColor: `hsl(${strength * 1.2}, 70%, 50%)` // 強さに応じて色変化
        }}
      />
    </div>
  );
};
```

## 📱 実装仕様

### パフォーマンス目標
- **初期レンダリング**: 300ms以内
- **グラフアニメーション**: 60fps維持
- **インタラクション応答**: 16ms以内（60fps）

### アクセシビリティ
- **スクリーンリーダー対応**: SVG要素に適切なaria-label
- **キーボード操作**: Tab/Enter/Spaceでのナビゲーション
- **カラーコントラスト**: WCAG 2.1 AA準拠（4.5:1以上）

この設計により、直感的で美しい潮汐可視化を釣果記録に統合できます。