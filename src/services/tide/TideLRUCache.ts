/**
 * TASK-105: LRUキャッシュシステム
 *
 * 潮汐情報のLRU（Least Recently Used）キャッシュ実装
 * - 最大100エントリのメモリ効率的なキャッシュ
 * - IndexedDBでの永続化対応
 * - キャッシュヒット率計測
 * - 座標精度による最適化キー生成
 */

import type { TideInfo, CacheKey, CacheStats, TideCacheRecord } from '../../types/tide';
import { logger } from '../../lib/errors';

// LRUキャッシュのノード
interface LRUNode {
  key: string;
  data: TideInfo;
  prev: LRUNode | null;
  next: LRUNode | null;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
}

/**
 * 潮汐情報専用LRUキャッシュ
 */
export class TideLRUCache {
  private maxSize: number;
  private ttlMs: number; // Time to live in milliseconds
  private cache: Map<string, LRUNode>;
  private head: LRUNode | null = null;
  private tail: LRUNode | null = null;

  // 統計情報
  private stats = {
    hitCount: 0,
    missCount: 0,
    totalEntries: 0,
    memoryUsage: 0
  };

  // IndexedDB関連
  private dbName = 'TideCache';
  private dbVersion = 1;
  private storeName = 'tideEntries';
  private db: IDBDatabase | null = null;

  constructor(maxSize = 100, ttlMs = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
    this.initializeIndexedDB();
  }

  /**
   * IndexedDBの初期化
   */
  private async initializeIndexedDB(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      // テスト環境ではIndexedDBをモック
      return;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        logger.warn('IndexedDB initialization failed, using memory-only cache');
        resolve();
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'cacheKey'
          });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  /**
   * キーの正規化（座標の丸めと日付形式統一）
   */
  normalizeKey(key: CacheKey): CacheKey {
    // 座標検証
    if (isNaN(key.latitude) || isNaN(key.longitude)) {
      throw new Error('Invalid coordinates: latitude and longitude must be numbers');
    }

    if (key.latitude < -90 || key.latitude > 90) {
      throw new Error('Latitude out of range: must be between -90 and 90');
    }

    if (key.longitude < -180 || key.longitude > 180) {
      throw new Error('Longitude out of range: must be between -180 and 180');
    }

    // 日付検証
    if (!key.date || typeof key.date !== 'string') {
      throw new Error('Invalid date: date must be a string');
    }

    // 日付形式の正規化
    let normalizedDate: string;
    try {
      // YYYY-M-D形式をYYYY-MM-DDに正規化
      const dateParts = key.date.split('-');
      if (dateParts.length !== 3) {
        throw new Error('Invalid date format');
      }

      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);
      const day = parseInt(dateParts[2], 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error('Invalid date format');
      }

      if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
        throw new Error('Invalid date format');
      }

      // YYYY-MM-DD形式に整形
      normalizedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Dateオブジェクトでの検証
      const testDate = new Date(normalizedDate);
      if (isNaN(testDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      throw new Error('Invalid date format');
    }

    return {
      latitude: Math.round(key.latitude * 100) / 100, // 小数点2桁で丸め
      longitude: Math.round(key.longitude * 100) / 100, // 小数点2桁で丸め
      date: normalizedDate
    };
  }

  /**
   * キャッシュキー文字列の生成
   */
  generateCacheKey(key: CacheKey): string {
    const normalized = this.normalizeKey(key);
    return `${normalized.latitude},${normalized.longitude},${normalized.date}`;
  }

  /**
   * データの取得
   */
  async get(key: CacheKey): Promise<TideInfo | null> {
    try {
      const cacheKey = this.generateCacheKey(key);
      const node = this.cache.get(cacheKey);

      if (!node) {
        this.stats.missCount++;
        return await this.getFromIndexedDB(cacheKey);
      }

      // 期限チェック
      if (node.expiresAt.getTime() < Date.now()) {
        this.removeNode(node);
        this.cache.delete(cacheKey);
        await this.removeFromIndexedDB(cacheKey);
        this.stats.missCount++;
        return null;
      }

      // LRUの先頭に移動
      this.moveToHead(node);
      node.accessCount++;
      this.stats.hitCount++;

      return node.data;
    } catch (error) {
      logger.error('Cache get error', { error, component: 'TideLRUCache', operation: 'get' });
      this.stats.missCount++;
      return null;
    }
  }

  /**
   * データの保存
   */
  async set(key: CacheKey, data: TideInfo): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(key);
      const existingNode = this.cache.get(cacheKey);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.ttlMs);

      if (existingNode) {
        // 既存のノードを更新
        existingNode.data = data;
        existingNode.expiresAt = expiresAt;
        existingNode.accessCount++;
        this.moveToHead(existingNode);
      } else {
        // 新しいノードを作成
        const newNode: LRUNode = {
          key: cacheKey,
          data,
          prev: null,
          next: null,
          createdAt: now,
          expiresAt,
          accessCount: 1
        };

        // 容量チェック
        if (this.cache.size >= this.maxSize) {
          // 最も古いノードを削除
          if (this.tail) {
            this.cache.delete(this.tail.key);
            await this.removeFromIndexedDB(this.tail.key);
            this.removeNode(this.tail);
          }
        }

        this.cache.set(cacheKey, newNode);
        this.addToHead(newNode);
        this.stats.totalEntries = this.cache.size;
      }

      // IndexedDBに保存
      await this.saveToIndexedDB(cacheKey, data, expiresAt);
      this.updateMemoryUsage();

    } catch (error) {
      logger.error('Cache set error', { error, component: 'TideLRUCache', operation: 'set' });
    }
  }

  /**
   * IndexedDBからの取得
   */
  private async getFromIndexedDB(cacheKey: string): Promise<TideInfo | null> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const result = request.result as TideCacheRecord | undefined;
        if (result && new Date(result.expiresAt).getTime() > Date.now()) {
          try {
            const tideInfo = JSON.parse(result.tideData) as TideInfo;
            resolve(tideInfo);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * IndexedDBへの保存
   */
  private async saveToIndexedDB(cacheKey: string, data: TideInfo, expiresAt: Date): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const record: TideCacheRecord = {
        cacheKey,
        tideData: JSON.stringify(data),
        createdAt: new Date(),
        expiresAt,
        accessCount: 1,
        lastAccessed: new Date()
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  /**
   * IndexedDBからの削除
   */
  private async removeFromIndexedDB(cacheKey: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(cacheKey);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  /**
   * ノードをリストの先頭に移動
   */
  private moveToHead(node: LRUNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * ノードをリストの先頭に追加
   */
  private addToHead(node: LRUNode): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * ノードをリストから削除
   */
  private removeNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * メモリ使用量の更新
   */
  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const [key, node] of this.cache) {
      // 概算メモリサイズ計算
      totalSize += key.length * 2; // キー文字列
      totalSize += JSON.stringify(node.data).length * 2; // データのJSON文字列
      totalSize += 200; // ノード構造体の概算サイズ
    }
    this.stats.memoryUsage = totalSize;
  }

  /**
   * キャッシュサイズの取得
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * キャッシュの完全クリア
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.stats.totalEntries = 0;
    this.stats.memoryUsage = 0;

    // IndexedDBからも削除
    if (this.db) {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.clear();
    }
  }

  /**
   * キャッシュ統計の取得
   */
  getStats(): CacheStats {
    const totalAccess = this.stats.hitCount + this.stats.missCount;
    const hitRate = totalAccess > 0 ? this.stats.hitCount / totalAccess : 0;

    return {
      totalEntries: this.cache.size,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate,
      memoryUsage: this.stats.memoryUsage
    };
  }

  /**
   * 期限切れエントリの定期クリーンアップ
   */
  async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, node] of this.cache) {
      if (node.expiresAt.getTime() < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const node = this.cache.get(key);
      if (node) {
        this.removeNode(node);
        this.cache.delete(key);
        await this.removeFromIndexedDB(key);
      }
    }

    this.stats.totalEntries = this.cache.size;
    this.updateMemoryUsage();
  }
}

// サービスのシングルトンインスタンス
export const tideLRUCache = new TideLRUCache();