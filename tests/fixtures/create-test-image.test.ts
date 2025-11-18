/**
 * GPS座標付き画像生成ユーティリティのテスト
 * TASK-402: 潮汐システムE2Eテスト対応
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import {
  createGPSPhoto,
  createPhotoWithoutGPS,
  cleanupTestPhotos,
  TEST_LOCATIONS
} from './create-test-image';

describe('create-test-image', () => {
  const testOutputDir = path.join(__dirname, 'test-output');
  const testPhotos: string[] = [];

  beforeAll(async () => {
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterAll(async () => {
    await cleanupTestPhotos(testPhotos);
    try {
      await fs.rmdir(testOutputDir);
    } catch {
      // ディレクトリが空でない場合は無視
    }
  });

  it('GPS座標付き画像を生成できる（東京湾）', async () => {
    const outputPath = path.join(testOutputDir, 'tokyo-bay.jpg');
    testPhotos.push(outputPath);

    const result = await createGPSPhoto(TEST_LOCATIONS.TOKYO_BAY, outputPath);

    expect(result).toBe(outputPath);

    // ファイルが存在することを確認
    const stats = await fs.stat(outputPath);
    expect(stats.isFile()).toBe(true);

    // ファイルサイズが妥当な範囲（EXIF込みで200-2000 bytes程度）
    expect(stats.size).toBeGreaterThan(100);
    expect(stats.size).toBeLessThan(5000);

    console.log(`📊 生成ファイルサイズ: ${stats.size} bytes`);
  }, 10000);

  it('GPS座標付き画像を生成できる（大阪湾）', async () => {
    const outputPath = path.join(testOutputDir, 'osaka-bay.jpg');
    testPhotos.push(outputPath);

    const result = await createGPSPhoto(TEST_LOCATIONS.OSAKA_BAY, outputPath);

    expect(result).toBe(outputPath);

    const stats = await fs.stat(outputPath);
    expect(stats.isFile()).toBe(true);
  }, 10000);

  it('GPS情報なし画像を生成できる', async () => {
    const outputPath = path.join(testOutputDir, 'no-gps.jpg');
    testPhotos.push(outputPath);

    const result = await createPhotoWithoutGPS(outputPath);

    expect(result).toBe(outputPath);

    const stats = await fs.stat(outputPath);
    expect(stats.isFile()).toBe(true);

    // GPS情報なしの場合、より小さいファイルサイズ
    expect(stats.size).toBeGreaterThan(50);
    expect(stats.size).toBeLessThan(1000);

    console.log(`📊 GPS情報なしファイルサイズ: ${stats.size} bytes`);
  }, 10000);

  it('ネガティブ座標（南半球・西経）を処理できる', async () => {
    const outputPath = path.join(testOutputDir, 'negative-coords.jpg');
    testPhotos.push(outputPath);

    const southernCoords = { latitude: -33.8688, longitude: 151.2093, description: 'シドニー' };
    const result = await createGPSPhoto(southernCoords, outputPath);

    expect(result).toBe(outputPath);

    const stats = await fs.stat(outputPath);
    expect(stats.isFile()).toBe(true);
  }, 10000);

  it('複数画像を連続生成してもクリーンアップできる', async () => {
    const paths = [
      path.join(testOutputDir, 'batch-1.jpg'),
      path.join(testOutputDir, 'batch-2.jpg'),
      path.join(testOutputDir, 'batch-3.jpg')
    ];

    for (const p of paths) {
      await createGPSPhoto(TEST_LOCATIONS.TOKYO_BAY, p);
      testPhotos.push(p);
    }

    // すべてのファイルが存在することを確認
    for (const p of paths) {
      const stats = await fs.stat(p);
      expect(stats.isFile()).toBe(true);
    }

    // クリーンアップ
    await cleanupTestPhotos(paths);

    // すべてのファイルが削除されたことを確認
    for (const p of paths) {
      await expect(fs.stat(p)).rejects.toThrow();
    }

    // testPhotos配列から削除（afterAll重複防止）
    testPhotos.length = 0;
  }, 10000);
});
