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
      console.error('❌ メタデータ抽出エラー:', error);
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
      console.error('Nominatim APIエラー:', error);
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
  private extractGPSCoordinates(tags: any): Coordinates | null {
    try {
      // 複数のフォーマットでGPS情報を取得
      const lat = tags.GPSLatitude?.description || tags.GPSLatitude?.value;
      const lng = tags.GPSLongitude?.description || tags.GPSLongitude?.value;
      const latRef = tags.GPSLatitudeRef?.value?.[0] || tags.GPSLatitudeRef?.description;
      const lngRef = tags.GPSLongitudeRef?.value?.[0] || tags.GPSLongitudeRef?.description;

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
      const accuracy = tags.GPSHorizontalPositioningError?.value || tags.GPSHPositioningError?.value;

      return {
        latitude,
        longitude,
        accuracy: accuracy ? parseFloat(accuracy) : undefined
      };

    } catch (error) {
      console.error('GPS座標抽出エラー:', error);
      return null;
    }
  }

  /**
   * 撮影日時を抽出
   */
  private extractDateTime(tags: any): Date | null {
    try {
      // 複数の日時フィールドを試行（優先順位順）
      const dateFields = [
        'DateTimeOriginal',  // 撮影日時（最優先）
        'DateTime',          // ファイル作成日時
        'DateTimeDigitized', // デジタル化日時
        'CreateDate'         // 作成日
      ];

      for (const field of dateFields) {
        if (tags[field]) {
          const dateStr = tags[field].description || tags[field].value;

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
      console.error('撮影日時抽出エラー:', error);
      return null;
    }
  }

  /**
   * カメラ情報を抽出
   */
  private extractCameraInfo(tags: any): CameraInfo | null {
    try {
      const cameraInfo: CameraInfo = {};

      // メーカー名
      if (tags.Make) {
        cameraInfo.make = tags.Make.description || tags.Make.value;
      }

      // 機種名
      if (tags.Model) {
        cameraInfo.model = tags.Model.description || tags.Model.value;
      }

      // レンズ情報
      if (tags.LensModel) {
        cameraInfo.lens = tags.LensModel.description || tags.LensModel.value;
      }

      // F値
      if (tags.FNumber || tags.ApertureValue) {
        const fNum = tags.FNumber?.description || tags.ApertureValue?.description;
        if (fNum) {
          cameraInfo.aperture = fNum;
        }
      }

      // シャッター速度
      if (tags.ExposureTime || tags.ShutterSpeedValue) {
        const exposure = tags.ExposureTime?.description || tags.ShutterSpeedValue?.description;
        if (exposure) {
          cameraInfo.shutterSpeed = exposure;
        }
      }

      // ISO感度
      if (tags.ISOSpeedRatings || tags.ISO) {
        const iso = tags.ISOSpeedRatings?.description || tags.ISO?.description;
        if (iso) {
          cameraInfo.iso = iso;
        }
      }

      // 焦点距離
      if (tags.FocalLength) {
        cameraInfo.focalLength = tags.FocalLength.description || tags.FocalLength.value;
      }

      // 何かしらの情報があれば返す
      if (Object.keys(cameraInfo).length > 0) {
        return cameraInfo;
      }

      return null;

    } catch (error) {
      console.error('カメラ情報抽出エラー:', error);
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

      // 度分秒形式 "DD° MM' SS.SS\"" の処理
      const dmsMatch = coordStr.match(/(\d+)°?\s*(\d+)'?\s*([\d.]+)\"?/);
      if (dmsMatch) {
        const degrees = parseInt(dmsMatch[1]);
        const minutes = parseInt(dmsMatch[2]);
        const seconds = parseFloat(dmsMatch[3]);
        return degrees + minutes / 60 + seconds / 3600;
      }

      // 度分形式 "DD° MM.MMM'" の処理
      const dmMatch = coordStr.match(/(\d+)°?\s*([\d.]+)'?/);
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
      console.error('座標変換エラー:', error);
      return null;
    }
  }
}

// シングルトンインスタンス
export const photoMetadataService = new PhotoMetadataService();