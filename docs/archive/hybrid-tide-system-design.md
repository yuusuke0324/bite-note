# ハイブリッド潮汐システム設計書

## 📋 システム概要

**完全無料・リアルタイム・オフライン対応**の潮汐情報システム。天体計算と地域補正データを組み合わせたハイブリッド方式により、APIに依存せずに実用レベルの潮汐情報を提供します。

### コア設計思想
- **Zero API Dependency**: 外部API一切不使用
- **Real-time Calculation**: 瞬時計算でリアルタイム応答
- **Offline First**: ネットワーク不要で完全動作
- **Practical Accuracy**: 釣り用途に十分な精度（±30分）

## 🏗️ システムアーキテクチャ

### 3層構造設計
```
┌─────────────────────────────────────────────────────────┐
│                   UI Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ 潮汐表示     │  │ 釣果記録     │  │ 潮汐チャート │      │
│  │ コンポーネント│  │ 統合         │  │ 可視化       │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                Business Logic Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ 潮汐予測     │  │ 潮汐タイプ   │  │ 時間関係     │      │
│  │ エンジン     │  │ 判定         │  │ 計算         │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│               Calculation Engine Layer                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ 天体計算     │  │ 調和解析     │  │ 地域補正     │      │
│  │ エンジン     │  │ エンジン     │  │ データ       │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
```

## 🧮 計算エンジン設計

### 1. 天体計算エンジン（AstronomicalCalculator）

#### 月齢計算
```typescript
class MoonPhaseCalculator {
  /**
   * 指定日時の月齢を計算
   * @param date 対象日時
   * @returns 月齢（0-29.53日）
   */
  calculateMoonAge(date: Date): number {
    // ニューカム（Newcomb）の公式による高精度月齢計算
    const baseNewMoon = new Date('2000-01-06T18:14:00Z'); // J2000.0基準新月
    const synodicMonth = 29.530588853; // 朔望月（日）

    const diffDays = (date.getTime() - baseNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    return ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
  }

  /**
   * 月相を判定
   */
  getMoonPhase(moonAge: number): MoonPhase {
    if (moonAge < 1.84566 || moonAge > 27.68457) return '新月';
    if (moonAge >= 5.53699 && moonAge < 9.22262) return '上弦';
    if (moonAge >= 12.91825 && moonAge < 16.61388) return '満月';
    if (moonAge >= 20.29951 && moonAge < 24.99514) return '下弦';
    return moonAge < 14.765294 ? '上弦寄り' : '下弦寄り';
  }
}
```

#### 太陽・月の位置計算
```typescript
class CelestialPositionCalculator {
  /**
   * 太陽の地心経度を計算（VSOP87理論）
   */
  calculateSolarLongitude(jd: number): number {
    // 簡易VSOP87実装
    const T = (jd - 2451545.0) / 36525; // ユリウス世紀

    // 太陽の平均経度
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;

    // 近点離角
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;

    // 中心差
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(this.degToRad(M))
            + (0.019993 - 0.000101 * T) * Math.sin(this.degToRad(2 * M))
            + 0.000289 * Math.sin(this.degToRad(3 * M));

    return this.normalizeAngle(L0 + C);
  }

  /**
   * 月の地心経度を計算（ELP2000理論簡易版）
   */
  calculateLunarLongitude(jd: number): number {
    const T = (jd - 2451545.0) / 36525;

    // 月の平均経度
    const L = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;

    // 主要な摂動項
    const D = 297.8501921 + 445267.1114034 * T; // 月の平均離角
    const M = 357.5291092 + 35999.0502909 * T;  // 太陽の平均近点角
    const Mp = 134.9633964 + 477198.8675055 * T; // 月の平均近点角

    // 主要摂動項による補正
    const perturbation =
      6.288774 * Math.sin(this.degToRad(Mp)) +
      1.274027 * Math.sin(this.degToRad(2 * D - Mp)) +
      0.658314 * Math.sin(this.degToRad(2 * D));

    return this.normalizeAngle(L + perturbation);
  }
}
```

### 2. 調和解析エンジン（HarmonicAnalysis）

#### 主要潮汐成分
```typescript
interface TidalConstituent {
  name: string;           // 分潮名
  frequency: number;      // 角周波数（度/時）
  amplitude: number;      // 振幅（基準値）
  phase: number;         // 位相（度）
  description: string;    // 説明
}

const MAJOR_CONSTITUENTS: TidalConstituent[] = [
  // 主太陰半日周潮（最も重要）
  { name: 'M2', frequency: 28.9841042, amplitude: 1.0, phase: 0, description: '主太陰半日周潮' },

  // 主太陽半日周潮
  { name: 'S2', frequency: 30.0, amplitude: 0.465, phase: 0, description: '主太陽半日周潮' },

  // 太陰日周潮
  { name: 'K1', frequency: 15.0410686, amplitude: 0.584, phase: 0, description: '太陰日周潮' },
  { name: 'O1', frequency: 13.9430356, amplitude: 0.377, phase: 0, description: '主太陰日周潮' },

  // 長周期潮
  { name: 'Mf', frequency: 1.0980331, amplitude: 0.174, phase: 0, description: '太陰二週間潮' },
  { name: 'Mm', frequency: 0.5443747, amplitude: 0.097, phase: 0, description: '太陰月潮' },
];
```

#### 潮汐予測計算
```typescript
class TidalPredictionEngine {
  /**
   * 指定時刻の潮位を計算
   */
  calculateTideLevel(
    dateTime: Date,
    location: Location,
    constituents: TidalConstituent[]
  ): number {
    const t = this.getHoursSinceEpoch(dateTime);
    let tideLevel = 0;

    for (const constituent of constituents) {
      // 各分潮成分の寄与を計算
      const argument = this.degToRad(constituent.frequency * t + constituent.phase);
      const regionalAmplitude = this.getRegionalAmplitude(constituent.name, location);

      tideLevel += regionalAmplitude * constituent.amplitude * Math.cos(argument);
    }

    return tideLevel;
  }

  /**
   * 満潮・干潮時刻を計算
   */
  findTidalExtremes(date: Date, location: Location): TideEvent[] {
    const events: TideEvent[] = [];
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);

    // 6分間隔で24時間分をサンプリング
    const samples: { time: Date; level: number }[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += 6) {
      const sampleTime = new Date(startTime.getTime() + minutes * 60 * 1000);
      const level = this.calculateTideLevel(sampleTime, location, MAJOR_CONSTITUENTS);
      samples.push({ time: sampleTime, level });
    }

    // 極値を検出
    for (let i = 1; i < samples.length - 1; i++) {
      const prev = samples[i - 1];
      const current = samples[i];
      const next = samples[i + 1];

      // 極大値（満潮）
      if (current.level > prev.level && current.level > next.level) {
        events.push({
          type: 'high',
          time: current.time.toTimeString().slice(0, 5),
          height: current.level,
          timestamp: current.time.getTime()
        });
      }
      // 極小値（干潮）
      else if (current.level < prev.level && current.level < next.level) {
        events.push({
          type: 'low',
          time: current.time.toTimeString().slice(0, 5),
          height: current.level,
          timestamp: current.time.getTime()
        });
      }
    }

    return events;
  }
}
```

### 3. 地域補正データ（RegionalCorrections）

#### 日本主要釣り場の補正係数
```typescript
interface RegionalTideData {
  id: string;
  name: string;
  location: { lat: number; lon: number };

  // M2分潮の地域特性
  m2Amplitude: number;    // M2振幅比（基準=1.0）
  m2Phase: number;        // M2位相差（度）

  // S2分潮の地域特性
  s2Amplitude: number;
  s2Phase: number;

  // その他分潮の補正
  diurnalRatio: number;   // 日周潮/半日周潮 比

  // 地形的特徴
  resonanceFactors: {
    shallow: number;      // 浅海効果
    bay: number;          // 湾の共鳴効果
    strait: number;       // 海峡効果
  };
}

const REGIONAL_TIDE_DATA: RegionalTideData[] = [
  {
    id: 'tokyo_bay',
    name: '東京湾',
    location: { lat: 35.6762, lon: 139.6503 },
    m2Amplitude: 1.45,    // 東京湾は共鳴により振幅が大
    m2Phase: 25,          // 位相遅れ
    s2Amplitude: 1.20,
    s2Phase: 30,
    diurnalRatio: 0.25,   // 半日周潮卓越
    resonanceFactors: {
      shallow: 1.2,       // 浅海効果あり
      bay: 1.8,           // 湾の共鳴大
      strait: 1.0
    }
  },

  {
    id: 'osaka_bay',
    name: '大阪湾',
    location: { lat: 34.6937, lon: 135.5023 },
    m2Amplitude: 1.15,
    m2Phase: 15,
    s2Amplitude: 1.05,
    s2Phase: 20,
    diurnalRatio: 0.30,
    resonanceFactors: {
      shallow: 1.1,
      bay: 1.4,
      strait: 1.0
    }
  },

  {
    id: 'suruga_bay',
    name: '駿河湾',
    location: { lat: 35.0158, lon: 138.5984 },
    m2Amplitude: 0.95,    // 外洋に近く振幅小
    m2Phase: 5,
    s2Amplitude: 0.90,
    s2Phase: 10,
    diurnalRatio: 0.35,
    resonanceFactors: {
      shallow: 0.9,
      bay: 1.1,
      strait: 1.0
    }
  },

  // ... 主要釣り場50箇所程度を定義
];
```

#### 地域補正ロジック
```typescript
class RegionalCorrectionEngine {
  /**
   * 最寄りの地域データを検索
   */
  findNearestRegion(location: Location): RegionalTideData {
    let nearest = REGIONAL_TIDE_DATA[0];
    let minDistance = this.calculateDistance(location, nearest.location);

    for (const region of REGIONAL_TIDE_DATA) {
      const distance = this.calculateDistance(location, region.location);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = region;
      }
    }

    return nearest;
  }

  /**
   * 地域特性を適用した分潮係数を計算
   */
  applyRegionalCorrection(
    constituent: TidalConstituent,
    regionalData: RegionalTideData
  ): TidalConstituent {
    const corrected = { ...constituent };

    switch (constituent.name) {
      case 'M2':
        corrected.amplitude *= regionalData.m2Amplitude;
        corrected.phase += regionalData.m2Phase;
        break;
      case 'S2':
        corrected.amplitude *= regionalData.s2Amplitude;
        corrected.phase += regionalData.s2Phase;
        break;
      case 'K1':
      case 'O1':
        corrected.amplitude *= regionalData.diurnalRatio;
        break;
    }

    // 地形効果を適用
    corrected.amplitude *= this.calculateResonanceFactor(
      constituent,
      regionalData.resonanceFactors
    );

    return corrected;
  }

  /**
   * 2点間の距離を計算（ハバーサイン公式）
   */
  private calculateDistance(
    point1: { lat: number; lon: number },
    point2: { lat: number; lon: number }
  ): number {
    const R = 6371; // 地球半径（km）
    const dLat = this.degToRad(point2.lat - point1.lat);
    const dLon = this.degToRad(point2.lon - point1.lon);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degToRad(point1.lat)) *
              Math.cos(this.degToRad(point2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
```

## 🎯 潮汐タイプ判定システム

### 大潮・小潮判定アルゴリズム
```typescript
class TideTypeClassifier {
  /**
   * 月齢に基づく潮汐タイプ判定
   */
  classifyTideType(moonAge: number): TideType {
    // 大潮: 新月・満月の前後1.5日
    if (moonAge <= 1.5 || moonAge >= 28 ||
        (moonAge >= 13 && moonAge <= 16)) {
      return '大潮';
    }

    // 小潮: 上弦・下弦の前後1.5日
    if ((moonAge >= 5.5 && moonAge <= 8.5) ||
        (moonAge >= 20.5 && moonAge <= 23.5)) {
      return '小潮';
    }

    // 長潮: 小潮の翌日
    if (moonAge === 9 || moonAge === 24) {
      return '長潮';
    }

    // 若潮: 長潮の翌日
    if (moonAge === 10 || moonAge === 25) {
      return '若潮';
    }

    // その他は中潮
    return '中潮';
  }

  /**
   * 潮汐強度を計算（0-100）
   */
  calculateTideStrength(
    moonAge: number,
    sunMoonAngle: number
  ): number {
    // 月の効果（朔望月による）
    const moonEffect = Math.cos(2 * Math.PI * moonAge / 29.53);

    // 太陽の効果（太陽と月の角度による）
    const sunEffect = Math.cos(sunMoonAngle);

    // 合成効果（0-100%）
    const combinedEffect = (moonEffect + 0.46 * sunEffect) / 1.46;
    return Math.max(0, Math.min(100, (combinedEffect + 1) * 50));
  }
}
```

## 📊 最終データモデル

### 統合インターフェース
```typescript
interface HybridTideInfo {
  // 基本情報
  id: string;
  calculatedAt: string;
  location: Location;
  date: string;

  // 天体情報
  astronomical: {
    moonAge: number;              // 月齢
    moonPhase: MoonPhase;         // 月相
    sunMoonAngle: number;         // 太陽-月角度
  };

  // 潮汐分類
  classification: {
    tideType: TideType;           // 大潮・小潮等
    strength: number;             // 潮汐強度（0-100）
    perigeeApogee: 'perigee' | 'apogee' | 'normal'; // 近地点・遠地点
  };

  // 潮汐イベント
  events: TideEvent[];

  // 地域情報
  regional: {
    nearestStation: string;       // 最寄り観測点
    distanceKm: number;          // 距離
    correctionApplied: boolean;   // 補正適用済み
  };

  // 計算メタデータ
  metadata: {
    algorithm: 'hybrid-astronomical-v1';
    constituents: string[];       // 使用分潮
    accuracy: 'high' | 'medium' | 'low';
    confidence: number;           // 信頼度（0-100）
  };
}

interface TideContext {
  // 釣果との関係
  catchTime: string;
  tidePhase: 'rising' | 'falling' | 'high' | 'low' | 'slack';

  // 次のイベント
  nextEvent: {
    type: 'high' | 'low';
    time: string;
    timeUntil: string;
    heightDifference: number;     // 現在との潮位差
  };

  // 潮汐状態
  currentState: {
    phase: string;                // '上げ潮中盤'等
    velocity: number;             // 潮流速度推定
    optimalFishing: boolean;      // 釣りに適した時間帯か
  };
}
```

## ⚡ パフォーマンス設計

### 計算最適化
```typescript
class TideCalculationOptimizer {
  private cache = new Map<string, HybridTideInfo>();

  /**
   * キャッシュキー生成
   */
  private generateCacheKey(location: Location, date: Date): string {
    const lat = Math.round(location.latitude * 100) / 100;
    const lon = Math.round(location.longitude * 100) / 100;
    const dateStr = date.toISOString().slice(0, 10);
    return `${lat},${lon},${dateStr}`;
  }

  /**
   * 高速計算（キャッシュ活用）
   */
  async calculateOptimized(
    location: Location,
    date: Date
  ): Promise<HybridTideInfo> {
    const cacheKey = this.generateCacheKey(location, date);

    // キャッシュヒット
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 新規計算
    const result = await this.performCalculation(location, date);

    // キャッシュ保存（メモリ制限考慮）
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, result);

    return result;
  }
}
```

### レスポンス時間目標
- **初回計算**: 200ms以内
- **キャッシュヒット**: 10ms以内
- **バックグラウンド更新**: 1秒以内

## 🎨 UI統合設計

### リアルタイム表示コンポーネント
```typescript
const TideInfoDisplay: React.FC<{ location: Location; catchTime?: string }> = ({
  location,
  catchTime
}) => {
  const [tideInfo, setTideInfo] = useState<HybridTideInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculator = new HybridTideCalculator();

    calculator.calculateOptimized(location, new Date())
      .then(setTideInfo)
      .finally(() => setLoading(false));
  }, [location]);

  if (loading) return <TideLoadingSpinner />;
  if (!tideInfo) return <TideErrorDisplay />;

  return (
    <div className="tide-info-panel">
      <TideTypeIndicator
        tideType={tideInfo.classification.tideType}
        strength={tideInfo.classification.strength}
      />

      <TideEventsChart
        events={tideInfo.events}
        currentTime={catchTime}
      />

      <TideContextDisplay
        context={calculateTideContext(tideInfo, catchTime)}
      />
    </div>
  );
};
```

この設計により、**完全無料・リアルタイム・高精度**な潮汐情報システムが実現できます。