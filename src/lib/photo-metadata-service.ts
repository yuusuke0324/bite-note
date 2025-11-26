// 写真メタデータ抽出サービス

import ExifReader from 'exifreader';
import type {
  PhotoMetadata,
  CameraInfo,
  ExifExtractionResult,
  GeocodeResult,
  Coordinates
} from '../types';
import { db } from './database';
import { logger } from './errors';

export class PhotoMetadataService {
  // キャッシュ有効期限（30分）
  private readonly CACHE_DURATION = 30 * 60 * 1000;

  /**
   * 写真ファイルからEXIFデータを抽出
   */
  async extractMetadata(file: File): Promise<ExifExtractionResult> {
    try {
      // ファイル形式チェック
      if (!this.isImageFile(file)) {
        return {
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: 'サポートされていないファイル形式です'
          }
        };
      }

      // EXIFデータを読み取り
      const tags = await ExifReader.load(file, {
        expanded: false,
        includeUnknown: false
      });

      if (!tags) {
        return {
          success: false,
          error: {
            code: 'NO_EXIF',
            message: 'EXIFデータが見つかりませんでした'
          }
        };
      }

      // メタデータを抽出
      const metadata: PhotoMetadata = {};

      // GPS座標を抽出
      const coordinates = this.extractGPSCoordinates(tags);
      if (coordinates) {
        if (this.validateCoordinates(coordinates)) {
          metadata.coordinates = coordinates;
        }
      }

      // 撮影日時を抽出
      const datetime = this.extractDateTime(tags);
      if (datetime) {
        metadata.datetime = datetime;
      }

      // カメラ情報を抽出
      const camera = this.extractCameraInfo(tags);
      if (camera) {
        metadata.camera = camera;
      }

      return {
        success: true,
        metadata
      };

    } catch (error) {
      logger.error('メタデータ抽出エラー', { error });
      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: `メタデータの読み取りに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
        }
      };
    }
  }

  /**
   * 座標から住所を取得（逆ジオコーディング）
   * シンプルなNominatim APIのみ使用（県・市レベルに限定）
   */
  async getLocationFromCoordinates(coordinates: Coordinates): Promise<GeocodeResult> {
    // シンプルなNominatim APIで県・市レベルの住所を取得
    const result = await this.getNominatimAddress(coordinates);
    return result;
  }

  /**
   * Nominatim API での住所取得
   */
  private async getNominatimAddress(coordinates: Coordinates): Promise<GeocodeResult> {
    try {
      const { latitude, longitude } = coordinates;

      // キャッシュキーを生成（小数点4桁で丸める = 約11m精度）
      const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

      // IndexedDBからキャッシュチェック（永続化）
      const cached = await db.geocode_cache
        .where('cacheKey')
        .equals(cacheKey)
        .first();

      if (cached) {
        const now = Date.now();
        if (now < cached.expiresAt) {
          // キャッシュ有効
          return {
            success: true,
            address: cached.address
          };
        }
        // 期限切れキャッシュを削除
        await db.geocode_cache.delete(cached.id!);
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ja&addressdetails=1&zoom=18`,
        {
          headers: {
            'User-Agent': 'FishingRecordApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.display_name) {
        return {
          success: false,
          error: {
            code: 'NO_ADDRESS',
            message: '住所が見つかりませんでした'
          }
        };
      }

      // 県・市レベルのみの簡潔な住所を構築
      let address = data.display_name;

      // 県・市レベルのみに限定した住所構築（詳細は手動入力に委ねる）
      if (data.address) {
        const parts = [];

        // 都道府県
        if (data.address.state) {
          parts.push(data.address.state);
        } else if (data.address.province) {
          parts.push(data.address.province);
        }

        // 市区町村（基本レベルのみ）
        if (data.address.city) {
          parts.push(data.address.city);
        } else if (data.address.town) {
          parts.push(data.address.town);
        } else if (data.address.village) {
          parts.push(data.address.village);
        }

        // 基本住所（県・市レベル）を構築
        if (parts.length > 0) {
          address = parts.join('');
        } else {
          // フォールバック：display_nameから県・市部分のみ抽出
          address = data.display_name
            .replace(/,\s*日本$/, '')
            .replace(/,\s*Japan$/, '')
            .split(',')[0] // 最初の部分のみ取得
            .replace(/^\d+,?\s*/, ''); // 先頭の数字を除去
        }
      }

      // IndexedDBにキャッシュを保存（永続化）
      const now = Date.now();
      await db.geocode_cache.put({
        cacheKey,
        address,
        timestamp: now,
        expiresAt: now + this.CACHE_DURATION
      });

      return {
        success: true,
        address
      };

    } catch (error) {
      logger.error('Nominatim APIエラー', { error });
      return {
        success: false,
        error: {
          code: 'NOMINATIM_FAILED',
          message: `Nominatim APIの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
        }
      };
    }
  }

  /**
   * 座標の妥当性チェック
   */
  validateCoordinates(coordinates: Coordinates): boolean {
    const { latitude, longitude } = coordinates;

    // 緯度の範囲チェック (-90 to 90)
    if (latitude < -90 || latitude > 90) return false;

    // 経度の範囲チェック (-180 to 180)
    if (longitude < -180 || longitude > 180) return false;

    // NaN チェック
    if (isNaN(latitude) || isNaN(longitude)) return false;

    return true;
  }

  /**
   * 画像ファイルかどうかをチェック
   */
  private isImageFile(file: File): boolean {
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return supportedTypes.includes(file.type);
  }

  /**
   * GPS座標を抽出
   */
  private extractGPSCoordinates(tags: Record<string, unknown>): Coordinates | null {
    try {
      // 複数のフォーマットでGPS情報を取得
      const latTag = tags.GPSLatitude as { description?: string; value?: unknown } | undefined;
      const lngTag = tags.GPSLongitude as { description?: string; value?: unknown } | undefined;
      const latRefTag = tags.GPSLatitudeRef as { value?: unknown[]; description?: string } | undefined;
      const lngRefTag = tags.GPSLongitudeRef as { value?: unknown[]; description?: string } | undefined;

      const lat = latTag?.description || latTag?.value;
      const lng = lngTag?.description || lngTag?.value;
      const latRef = (latRefTag?.value?.[0] as string) || latRefTag?.description;
      const lngRef = (lngRefTag?.value?.[0] as string) || lngRefTag?.description;

      if (!lat || !lng) {
        return null;
      }

      // 座標を数値に変換
      let latitude = this.parseCoordinate(lat);
      let longitude = this.parseCoordinate(lng);

      if (latitude === null || longitude === null) {
        return null;
      }

      // 南緯・西経の場合は負の値にする
      if (latRef === 'S' || latRef === 'South') {
        latitude = -latitude;
      }
      if (lngRef === 'W' || lngRef === 'West') {
        longitude = -longitude;
      }

      // 精度情報があれば追加
      const accuracyTag1 = tags.GPSHorizontalPositioningError as { value?: unknown } | undefined;
      const accuracyTag2 = tags.GPSHPositioningError as { value?: unknown } | undefined;
      const accuracy = accuracyTag1?.value || accuracyTag2?.value;

      return {
        latitude,
        longitude,
        accuracy: accuracy ? parseFloat(accuracy) : undefined
      };

    } catch (error) {
      logger.error('GPS座標抽出エラー', { error });
      return null;
    }
  }

  /**
   * 撮影日時を抽出
   */
  private extractDateTime(tags: Record<string, unknown>): Date | null {
    try {
      // 複数の日時フィールドを試行（優先順位順）
      const dateFields = [
        'DateTimeOriginal',  // 撮影日時（最優先）
        'DateTime',          // ファイル作成日時
        'DateTimeDigitized', // デジタル化日時
        'CreateDate'         // 作成日
      ];

      for (const field of dateFields) {
        const tag = tags[field] as { description?: string; value?: unknown } | undefined;
        if (tag) {
          const dateStr = tag.description || tag.value;

          if (dateStr) {
            // EXIF日時形式 "YYYY:MM:DD HH:MM:SS" を処理
            // new Date(string)はUTC/ローカルが不確実なので、明示的にローカルタイムとして作成
            const match = String(dateStr).match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
            if (match) {
              const [_, year, month, day, hour, minute, second] = match;
              // 明示的にローカルタイムゾーン（JST）でDateオブジェクトを作成
              const date = new Date(
                parseInt(year),
                parseInt(month) - 1, // 月は0始まり
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second)
              );
              if (!isNaN(date.getTime())) {
                return date;
              }
            }
          }
        }
      }

      return null;

    } catch (error) {
      logger.error('撮影日時抽出エラー', { error });
      return null;
    }
  }

  /**
   * カメラ情報を抽出
   */
  private extractCameraInfo(tags: Record<string, unknown>): CameraInfo | null {
    try {
      const cameraInfo: CameraInfo = {};

      // メーカー名
      const makeTag = tags.Make as { description?: string; value?: unknown } | undefined;
      if (makeTag) {
        cameraInfo.make = makeTag.description || (makeTag.value as string);
      }

      // 機種名
      const modelTag = tags.Model as { description?: string; value?: unknown } | undefined;
      if (modelTag) {
        cameraInfo.model = modelTag.description || (modelTag.value as string);
      }

      // レンズ情報
      const lensTag = tags.LensModel as { description?: string; value?: unknown } | undefined;
      if (lensTag) {
        cameraInfo.lens = lensTag.description || (lensTag.value as string);
      }

      // F値
      const fNumTag = tags.FNumber as { description?: string } | undefined;
      const apertureTag = tags.ApertureValue as { description?: string } | undefined;
      if (fNumTag || apertureTag) {
        const fNum = fNumTag?.description || apertureTag?.description;
        if (fNum) {
          cameraInfo.aperture = fNum;
        }
      }

      // シャッター速度
      const exposureTag = tags.ExposureTime as { description?: string } | undefined;
      const shutterTag = tags.ShutterSpeedValue as { description?: string } | undefined;
      if (exposureTag || shutterTag) {
        const exposure = exposureTag?.description || shutterTag?.description;
        if (exposure) {
          cameraInfo.shutterSpeed = exposure;
        }
      }

      // ISO感度
      const isoRatingsTag = tags.ISOSpeedRatings as { description?: string } | undefined;
      const isoTag = tags.ISO as { description?: string } | undefined;
      if (isoRatingsTag || isoTag) {
        const iso = isoRatingsTag?.description || isoTag?.description;
        if (iso) {
          cameraInfo.iso = iso;
        }
      }

      // 焦点距離
      const focalTag = tags.FocalLength as { description?: string; value?: unknown } | undefined;
      if (focalTag) {
        cameraInfo.focalLength = focalTag.description || (focalTag.value as string);
      }

      // 何かしらの情報があれば返す
      if (Object.keys(cameraInfo).length > 0) {
        return cameraInfo;
      }

      return null;

    } catch (error) {
      logger.error('カメラ情報抽出エラー', { error });
      return null;
    }
  }

  /**
   * 座標文字列を数値に変換
   */
  private parseCoordinate(coordStr: string): number | null {
    try {
      if (typeof coordStr === 'number') {
        return coordStr;
      }

      if (typeof coordStr !== 'string') {
        return null;
      }

      // 度分秒形式 "DD° MM' SS.SS\"" の処理（記号必須）
      const dmsMatch = coordStr.match(/(\d+)°\s*(\d+)'\s*([\d.]+)\"/);
      if (dmsMatch) {
        const degrees = parseInt(dmsMatch[1]);
        const minutes = parseInt(dmsMatch[2]);
        const seconds = parseFloat(dmsMatch[3]);
        return degrees + minutes / 60 + seconds / 3600;
      }

      // 度分形式 "DD° MM.MMM'" の処理（記号必須）
      const dmMatch = coordStr.match(/(\d+)°\s*([\d.]+)'/);
      if (dmMatch) {
        const degrees = parseInt(dmMatch[1]);
        const minutes = parseFloat(dmMatch[2]);
        return degrees + minutes / 60;
      }

      // 小数点形式の処理
      const decimal = parseFloat(coordStr);
      if (!isNaN(decimal)) {
        return decimal;
      }

      return null;

    } catch (error) {
      logger.error('座標変換エラー', { error });
      return null;
    }
  }
}

// シングルトンインスタンス
export const photoMetadataService = new PhotoMetadataService();