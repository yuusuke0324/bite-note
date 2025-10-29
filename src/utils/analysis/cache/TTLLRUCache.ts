/**
 * TASK-102: TTL付きLRUキャッシュ実装
 * パフォーマンス最適化のための高機能キャッシュシステム
 */

export interface CacheEntry<V> {
  value: V;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStatistics {
  hitCount: number;
  missCount: number;
  hitRate: number;
  currentSize: number;
  maxSize: number;
  evictionCount: number;
}

/**
 * TTL（Time To Live）付きLRUキャッシュ
 *
 * 特徴:
 * - LRU（Least Recently Used）による容量制限
 * - TTL（Time To Live）による時間ベース無効化
 * - アクセス統計収集
 * - メモリ効率の最適化
 */
export class TTLLRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  // 統計情報
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;

  constructor(maxSize: number = 50, ttlMs: number = 5 * 60 * 1000) { // デフォルト5分TTL
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * キー値の取得
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.missCount++;
      return undefined;
    }

    // TTL確認
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.missCount++;
      return undefined;
    }

    // LRU更新
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hitCount++;

    return entry.value;
  }

  /**
   * キー値の設定
   */
  set(key: K, value: V): void {
    const now = Date.now();

    // 既存エントリの更新
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.timestamp = now;
      entry.lastAccessed = now;
      entry.accessCount++;
      return;
    }

    // 容量制限チェック
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    // 新規エントリ追加
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    });
  }

  /**
   * キーの存在確認（TTL考慮）
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * キーの削除
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * キャッシュクリア
   */
  clear(): void {
    this.cache.clear();
    this.resetStatistics();
  }

  /**
   * 期限切れエントリのクリーンアップ
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 統計情報の取得
   */
  getStatistics(): CacheStatistics {
    const totalRequests = this.hitCount + this.missCount;
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0,
      currentSize: this.cache.size,
      maxSize: this.maxSize,
      evictionCount: this.evictionCount
    };
  }

  /**
   * 現在のキー一覧取得
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 現在のサイズ取得
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * エントリの期限切れ判定
   */
  private isExpired(entry: CacheEntry<V>): boolean {
    return Date.now() - entry.timestamp > this.ttlMs;
  }

  /**
   * 最も使用頻度の低いエントリを削除
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;

    let lruKey: K | undefined;
    let minScore = Infinity;

    // LRUスコア計算（アクセス頻度と最終アクセス時間の複合指標）
    for (const [key, entry] of this.cache.entries()) {
      const timeSinceLastAccess = Date.now() - entry.lastAccessed;
      const score = entry.accessCount / (1 + timeSinceLastAccess / 1000); // アクセス頻度/時間減衰

      if (score < minScore) {
        lruKey = key;
        minScore = score;
      }
    }

    if (lruKey !== undefined) {
      this.cache.delete(lruKey);
      this.evictionCount++;
    }
  }

  /**
   * 統計情報リセット
   */
  private resetStatistics(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  /**
   * デバッグ用：詳細情報出力
   */
  getDebugInfo(): any {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      accessCount: entry.accessCount,
      age: Date.now() - entry.timestamp,
      timeSinceLastAccess: Date.now() - entry.lastAccessed
    }));

    return {
      statistics: this.getStatistics(),
      entries: entries.sort((a, b) => b.accessCount - a.accessCount)
    };
  }
}