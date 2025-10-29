/**
 * TASK-202: メモリ使用量継続監視スクリプト
 * Node.jsプロセスのメモリ使用状況を詳細に監視・分析
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module環境での __dirname 代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MemorySnapshot {
  timestamp: string;
  pid: number;
  memoryUsage: {
    rss: number;           // Resident Set Size - 物理メモリ使用量
    heapTotal: number;     // V8 ヒープ総容量
    heapUsed: number;      // V8 ヒープ使用量
    external: number;      // V8外のC++オブジェクトのメモリ使用量
    arrayBuffers: number;  // ArrayBufferのメモリ使用量
  };
  cpuUsage: {
    user: number;          // ユーザーCPU時間
    system: number;        // システムCPU時間
  };
  processInfo: {
    version: string;
    platform: string;
    uptime: number;
  };
}

interface MemoryAnalysis {
  growthRate: {
    heapUsed: number;      // MB/min
    rss: number;           // MB/min
    external: number;      // MB/min
  };
  peakUsage: {
    heapUsed: number;      // MB
    rss: number;          // MB
    timestamp: string;
  };
  leakSuspicious: boolean;
  gcEfficiency: number;    // ガベージコレクション効率 (0-1)
  recommendations: string[];
}

class MemoryProfiler {
  private readonly profilePath = path.join(__dirname, '../memory-profiles');
  private snapshots: MemorySnapshot[] = [];
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureProfileDirectoryExists();
  }

  /**
   * メモリ監視を開始
   */
  async startMonitoring(options: {
    intervalMs?: number;
    durationMs?: number;
    saveInterval?: number;
  } = {}): Promise<void> {
    const {
      intervalMs = 5000,        // 5秒間隔
      durationMs = 30 * 60 * 1000, // 30分間
      saveInterval = 50         // 50回ごとに保存
    } = options;

    if (this.isMonitoring) {
      console.warn('⚠️ 既にメモリ監視が実行中です');
      return;
    }

    console.log('🔍 メモリ監視開始:', {
      監視間隔: `${intervalMs}ms`,
      監視時間: `${durationMs / 1000 / 60}分`,
      保存間隔: `${saveInterval}回`
    });

    this.isMonitoring = true;
    let snapshotCount = 0;

    this.monitorInterval = setInterval(() => {
      try {
        const snapshot = this.captureMemorySnapshot();
        this.snapshots.push(snapshot);
        snapshotCount++;

        // リアルタイム表示
        this.displayCurrentStatus(snapshot);

        // 定期保存
        if (snapshotCount % saveInterval === 0) {
          this.saveSnapshots();
          console.log(`💾 スナップショット保存完了: ${snapshotCount}回`);
        }

        // メモリリーク早期検出
        if (snapshotCount > 10) {
          this.checkForMemoryLeaks();
        }

      } catch (error) {
        console.error('スナップショット取得エラー:', error);
      }
    }, intervalMs);

    // 指定時間後に監視停止
    if (durationMs > 0) {
      setTimeout(() => {
        this.stopMonitoring();
      }, durationMs);
    }

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 メモリ監視を停止しています...');
      this.stopMonitoring();
      process.exit(0);
    });
  }

  /**
   * メモリ監視を停止
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.isMonitoring = false;
    this.saveSnapshots();

    const analysis = this.analyzeMemoryUsage();
    this.generateReport(analysis);

    console.log('✅ メモリ監視完了');
  }

  /**
   * 現在のメモリスナップショットを取得
   */
  private captureMemorySnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memoryUsage: memUsage,
      cpuUsage,
      processInfo: {
        version: process.version,
        platform: process.platform,
        uptime: process.uptime()
      }
    };
  }

  /**
   * 現在のメモリ状況を表示
   */
  private displayCurrentStatus(snapshot: MemorySnapshot): void {
    const mem = snapshot.memoryUsage;

    console.log(`📊 ${new Date(snapshot.timestamp).toLocaleTimeString()} | ` +
      `ヒープ: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB/${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB | ` +
      `RSS: ${(mem.rss / 1024 / 1024).toFixed(1)}MB | ` +
      `外部: ${(mem.external / 1024 / 1024).toFixed(1)}MB`);
  }

  /**
   * メモリリーク早期検出
   */
  private checkForMemoryLeaks(): void {
    if (this.snapshots.length < 10) return;

    const recent = this.snapshots.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];

    const heapGrowth = (last.memoryUsage.heapUsed - first.memoryUsage.heapUsed) / 1024 / 1024;
    const rssGrowth = (last.memoryUsage.rss - first.memoryUsage.rss) / 1024 / 1024;
    const timeSpan = (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 1000 / 60;

    // 1分間で10MB以上の増加は要注意
    const heapGrowthRate = heapGrowth / timeSpan;
    const rssGrowthRate = rssGrowth / timeSpan;

    if (heapGrowthRate > 10 || rssGrowthRate > 15) {
      console.warn(`⚠️ メモリリーク疑い検出:`);
      console.warn(`  ヒープ増加率: ${heapGrowthRate.toFixed(2)}MB/min`);
      console.warn(`  RSS増加率: ${rssGrowthRate.toFixed(2)}MB/min`);
    }
  }

  /**
   * メモリ使用量の詳細分析
   */
  private analyzeMemoryUsage(): MemoryAnalysis {
    if (this.snapshots.length < 2) {
      throw new Error('分析には最低2つのスナップショットが必要です');
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const timeSpan = (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 1000 / 60; // 分

    // 成長率計算 (MB/min)
    const growthRate = {
      heapUsed: ((last.memoryUsage.heapUsed - first.memoryUsage.heapUsed) / 1024 / 1024) / timeSpan,
      rss: ((last.memoryUsage.rss - first.memoryUsage.rss) / 1024 / 1024) / timeSpan,
      external: ((last.memoryUsage.external - first.memoryUsage.external) / 1024 / 1024) / timeSpan
    };

    // ピーク使用量検出
    let peakHeap = 0;
    let peakRss = 0;
    let peakTimestamp = '';

    for (const snapshot of this.snapshots) {
      const heapUsed = snapshot.memoryUsage.heapUsed / 1024 / 1024;
      const rss = snapshot.memoryUsage.rss / 1024 / 1024;

      if (heapUsed > peakHeap) {
        peakHeap = heapUsed;
        peakTimestamp = snapshot.timestamp;
      }
      if (rss > peakRss) {
        peakRss = rss;
      }
    }

    // GC効率計算（ヒープ使用率の安定性）
    const heapUsageRates = this.snapshots.map(s => s.memoryUsage.heapUsed / s.memoryUsage.heapTotal);
    const avgRate = heapUsageRates.reduce((sum, rate) => sum + rate, 0) / heapUsageRates.length;
    const variance = heapUsageRates.reduce((sum, rate) => sum + Math.pow(rate - avgRate, 2), 0) / heapUsageRates.length;
    const gcEfficiency = 1 - Math.min(variance * 10, 1); // 0-1範囲に正規化

    // メモリリーク疑いの判定
    const leakSuspicious = growthRate.heapUsed > 5 || growthRate.rss > 10; // 5MB/min以上で疑い

    // 推奨事項生成
    const recommendations: string[] = [];

    if (leakSuspicious) {
      recommendations.push('メモリリークの可能性があります。オブジェクト参照の確認を推奨します。');
    }

    if (peakHeap > 100) {
      recommendations.push('ヒープ使用量が100MBを超えています。メモリ効率を改善してください。');
    }

    if (gcEfficiency < 0.7) {
      recommendations.push('ガベージコレクション効率が低下しています。不要な参照を削除してください。');
    }

    if (growthRate.external > 2) {
      recommendations.push('外部メモリ（Buffer、ArrayBuffer等）の使用量が急増しています。');
    }

    if (recommendations.length === 0) {
      recommendations.push('メモリ使用量は正常範囲内です。');
    }

    return {
      growthRate,
      peakUsage: {
        heapUsed: peakHeap,
        rss: peakRss,
        timestamp: peakTimestamp
      },
      leakSuspicious,
      gcEfficiency,
      recommendations
    };
  }

  /**
   * スナップショットをファイルに保存
   */
  private saveSnapshots(): void {
    const filename = `memory-profile-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.profilePath, filename);

    fs.writeFileSync(filepath, JSON.stringify({
      metadata: {
        profileDate: new Date().toISOString(),
        snapshotCount: this.snapshots.length,
        platform: process.platform,
        nodeVersion: process.version
      },
      snapshots: this.snapshots
    }, null, 2));
  }

  /**
   * 分析レポートを生成
   */
  private generateReport(analysis: MemoryAnalysis): void {
    const reportPath = path.join(this.profilePath, `memory-analysis-${Date.now()}.md`);

    const report = `# メモリ分析レポート

## 実行情報
- 監視期間: ${this.snapshots.length}回のスナップショット
- 開始時刻: ${this.snapshots[0]?.timestamp}
- 終了時刻: ${this.snapshots[this.snapshots.length - 1]?.timestamp}
- プラットフォーム: ${process.platform}
- Node.jsバージョン: ${process.version}

## メモリ使用量変化

### 成長率 (MB/分)
- ヒープ使用量: ${analysis.growthRate.heapUsed.toFixed(2)} MB/分
- RSS: ${analysis.growthRate.rss.toFixed(2)} MB/分
- 外部メモリ: ${analysis.growthRate.external.toFixed(2)} MB/分

### ピーク使用量
- ヒープ最大: ${analysis.peakUsage.heapUsed.toFixed(1)} MB (${analysis.peakUsage.timestamp})
- RSS最大: ${analysis.peakUsage.rss.toFixed(1)} MB

### パフォーマンス指標
- GC効率: ${(analysis.gcEfficiency * 100).toFixed(1)}%
- メモリリーク疑い: ${analysis.leakSuspicious ? '⚠️ あり' : '✅ なし'}

## 推奨事項

${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## 詳細データ
スナップショットの詳細データは同じディレクトリの JSON ファイルをご確認ください。
`;

    fs.writeFileSync(reportPath, report);
    console.log(`📋 分析レポート生成: ${reportPath}`);
  }

  /**
   * プロファイルディレクトリの確保
   */
  private ensureProfileDirectoryExists(): void {
    if (!fs.existsSync(this.profilePath)) {
      fs.mkdirSync(this.profilePath, { recursive: true });
    }
  }

  /**
   * 特定プロセスのメモリ監視（潮汐計算サービス用）
   */
  async profileTideCalculation(
    coordinates: { latitude: number; longitude: number },
    iterations: number = 10
  ): Promise<void> {
    console.log(`🌊 潮汐計算メモリプロファイリング開始:`, { coordinates, iterations });

    const { TideCalculationService } = await import('../src/services/tide/TideCalculationService');
    const service = new TideCalculationService();

    await this.startMonitoring({
      intervalMs: 1000,  // 1秒間隔で詳細監視
      durationMs: 0,     // 手動停止
      saveInterval: 10
    });

    // 計算実行とメモリ監視
    for (let i = 0; i < iterations; i++) {
      console.log(`🔄 計算実行 ${i + 1}/${iterations}`);

      const testDate = new Date();
      testDate.setHours(testDate.getHours() + i); // 1時間ずつずらして多様性確保

      try {
        const result = await service.calculateTideInfo(coordinates, testDate);
        console.log(`  ✅ 完了: ${result.currentLevel.toFixed(2)}m`);
      } catch (error) {
        console.error(`  ❌ エラー: ${error}`);
      }

      // 計算間隔
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.stopMonitoring();
  }
}

// CLI実行用 (ES Module対応)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const profiler = new MemoryProfiler();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      const duration = parseInt(process.argv[3]) || 30; // 分
      profiler.startMonitoring({
        durationMs: duration * 60 * 1000
      });
      break;

    case 'tide':
      const lat = parseFloat(process.argv[3]) || 35.6762;
      const lng = parseFloat(process.argv[4]) || 139.6503;
      const iterations = parseInt(process.argv[5]) || 10;

      profiler.profileTideCalculation({ latitude: lat, longitude: lng }, iterations);
      break;

    default:
      console.log('使用方法:');
      console.log('  tsx scripts/memory-profiler.ts start [監視時間(分)]');
      console.log('  tsx scripts/memory-profiler.ts tide [緯度] [経度] [反復回数]');
      console.log('');
      console.log('例:');
      console.log('  tsx scripts/memory-profiler.ts start 60    # 60分間監視');
      console.log('  tsx scripts/memory-profiler.ts tide 35.6762 139.6503 20');
  }
}

export { MemoryProfiler };