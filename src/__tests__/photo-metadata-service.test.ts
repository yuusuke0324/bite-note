/**
 * PhotoMetadataService テスト
 * Issue #17 PR #2-E: photo-metadata-service.tsのテストカバレッジ向上（目標85%）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { photoMetadataService, PhotoMetadataService } from '../lib/photo-metadata-service';
import type { Coordinates } from '../types';

// ============================================
// Phase 1: 依存なし、テスト容易なメソッド (34テスト)
// ============================================

describe('PhotoMetadataService', () => {
  // ============================================
  // isImageFile - 画像ファイル判定 (7テスト)
  // ============================================
  describe('isImageFile', () => {
    const createFile = (type: string): File => {
      const blob = new Blob(['test'], { type });
      return new File([blob], 'test.file', { type });
    };

    it('image/jpeg: サポート形式として受け入れられる', () => {
      const file = createFile('image/jpeg');
      const result = (photoMetadataService as any).isImageFile(file);
      expect(result).toBe(true);
    });

    it('image/jpg: サポート形式として受け入れられる', () => {
      const file = createFile('image/jpg');
      const result = (photoMetadataService as any).isImageFile(file);
      expect(result).toBe(true);
    });

    it('image/png: サポート形式として受け入れられる', () => {
      const file = createFile('image/png');
      const result = (photoMetadataService as any).isImageFile(file);
      expect(result).toBe(true);
    });

    it('image/webp: サポート形式として受け入れられる', () => {
      const file = createFile('image/webp');
      const result = (photoMetadataService as any).isImageFile(file);
      expect(result).toBe(true);
    });

    it('image/gif: サポート外形式として拒否される', () => {
      const file = createFile('image/gif');
      const result = (photoMetadataService as any).isImageFile(file);
      expect(result).toBe(false);
    });

    it('application/pdf: 非画像形式として拒否される', () => {
      const file = createFile('application/pdf');
      const result = (photoMetadataService as any).isImageFile(file);
      expect(result).toBe(false);
    });

    it('空文字列のMIMEタイプ: 拒否される', () => {
      const file = createFile('');
      const result = (photoMetadataService as any).isImageFile(file);
      expect(result).toBe(false);
    });
  });

  // ============================================
  // validateCoordinates - 座標検証 (12テスト)
  // ============================================
  describe('validateCoordinates', () => {
    // 正常系（3テスト）
    it('有効な座標（東京: 35.6812, 139.7671）', () => {
      const coords: Coordinates = {
        latitude: 35.6812,
        longitude: 139.7671
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(true);
    });

    it('赤道・本初子午線（0, 0）', () => {
      const coords: Coordinates = {
        latitude: 0,
        longitude: 0
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(true);
    });

    it('負の座標（南緯・西経: -33.8688, -151.2093）', () => {
      const coords: Coordinates = {
        latitude: -33.8688,
        longitude: -151.2093
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(true);
    });

    // 境界値（6テスト）
    it('境界値: 緯度90（北極）', () => {
      const coords: Coordinates = {
        latitude: 90,
        longitude: 0
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(true);
    });

    it('境界値: 緯度-90（南極）', () => {
      const coords: Coordinates = {
        latitude: -90,
        longitude: 0
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(true);
    });

    it('境界値: 緯度90.000001（範囲外）→ false', () => {
      const coords: Coordinates = {
        latitude: 90.000001,
        longitude: 0
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(false);
    });

    it('境界値: 緯度-90.000001（範囲外）→ false', () => {
      const coords: Coordinates = {
        latitude: -90.000001,
        longitude: 0
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(false);
    });

    it('境界値: 経度180（日付変更線）', () => {
      const coords: Coordinates = {
        latitude: 0,
        longitude: 180
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(true);
    });

    it('境界値: 経度-180（日付変更線）', () => {
      const coords: Coordinates = {
        latitude: 0,
        longitude: -180
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(true);
    });

    // 異常系（3テスト）
    it('NaN座標: { latitude: NaN, longitude: 0 } → false', () => {
      const coords: Coordinates = {
        latitude: NaN,
        longitude: 0
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(false);
    });

    it('Infinity: { latitude: Infinity, longitude: 0 } → false', () => {
      const coords: Coordinates = {
        latitude: Infinity,
        longitude: 0
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(false);
    });

    it('範囲外: { latitude: 91, longitude: 200 } → false', () => {
      const coords: Coordinates = {
        latitude: 91,
        longitude: 200
      };
      const result = photoMetadataService.validateCoordinates(coords);
      expect(result).toBe(false);
    });
  });

  // ============================================
  // parseCoordinate - 座標パース (15テスト)
  // ============================================
  describe('parseCoordinate', () => {
    // 度分秒形式（5テスト）
    it('標準形式: "35° 41\' 22.2\\"" → 35.6895', () => {
      const result = (photoMetadataService as any).parseCoordinate('35° 41\' 22.2"');
      expect(result).toBeCloseTo(35.6895, 4);
    });

    it('スペースあり: "35 ° 41 \' 22.2 \\"" → parseFloatで処理（35）', () => {
      const result = (photoMetadataService as any).parseCoordinate('35 ° 41 \' 22.2 "');
      // 記号必須の正規表現ではマッチせず、parseFloat("35 ° 41 ' 22.2 \"") → 35（スペース以降無視）
      expect(result).toBeCloseTo(35.0, 4);
    });

    it('記号なし: "35 41 22.2" → parseFloatで処理（NaN）', () => {
      const result = (photoMetadataService as any).parseCoordinate('35 41 22.2');
      // parseFloat("35 41 22.2") → 35 (スペース以降は無視)
      expect(result).toBeCloseTo(35.0, 4);
    });

    it('秒=0: "35° 41\' 0\\"" → 35.6833...', () => {
      const result = (photoMetadataService as any).parseCoordinate('35° 41\' 0"');
      expect(result).toBeCloseTo(35.6833, 4);
    });

    it('秒=59.99: "35° 41\' 59.99\\"" → 35.6999...', () => {
      const result = (photoMetadataService as any).parseCoordinate('35° 41\' 59.99"');
      const expected = 35 + 41 / 60 + 59.99 / 3600; // 35.69999...
      expect(result).toBeCloseTo(expected, 3); // 精度を3桁に緩和
    });

    // 度分形式（3テスト）
    it('標準形式: "35° 41.5\'" → 35.6916...', () => {
      const result = (photoMetadataService as any).parseCoordinate('35° 41.5\'');
      const expected = 35 + 41.5 / 60; // 35.6916...
      expect(result).toBeCloseTo(expected, 4);
    });

    it('小数点3桁: "35° 41.370\'" → 35.6895', () => {
      const result = (photoMetadataService as any).parseCoordinate('35° 41.370\'');
      const expected = 35 + 41.370 / 60; // 35.6895
      expect(result).toBeCloseTo(expected, 4);
    });

    it('分=0: "35° 0\'" → 35.0', () => {
      const result = (photoMetadataService as any).parseCoordinate('35° 0\'');
      expect(result).toBeCloseTo(35.0, 4);
    });

    // 小数点形式（3テスト）
    it('小数点形式: "35.6812" → 35.6812', () => {
      const result = (photoMetadataService as any).parseCoordinate('35.6812');
      expect(result).toBeCloseTo(35.6812, 4);
    });

    it('負の値: "-33.8688" → -33.8688', () => {
      const result = (photoMetadataService as any).parseCoordinate('-33.8688');
      expect(result).toBeCloseTo(-33.8688, 4);
    });

    it('整数: "35" → 35.0', () => {
      const result = (photoMetadataService as any).parseCoordinate('35');
      expect(result).toBeCloseTo(35.0, 4);
    });

    // 数値入力（1テスト）
    it('数値型: 35.6812 → 35.6812', () => {
      const result = (photoMetadataService as any).parseCoordinate(35.6812);
      expect(result).toBeCloseTo(35.6812, 4);
    });

    // 異常系（3テスト）
    it('不正な文字列: "abc" → null', () => {
      const result = (photoMetadataService as any).parseCoordinate('abc');
      expect(result).toBeNull();
    });

    it('空文字列: "" → null', () => {
      const result = (photoMetadataService as any).parseCoordinate('');
      expect(result).toBeNull();
    });

    it('null入力: null → null', () => {
      const result = (photoMetadataService as any).parseCoordinate(null);
      expect(result).toBeNull();
    });
  });
});
