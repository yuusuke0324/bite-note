// GPS位置情報取得サービス

import type {
  Coordinates,
  GeolocationOptions,
  GeolocationResult,
  GeolocationError,
  DatabaseResult
} from '../types';

export class GeolocationService {

  // 座標から住所を取得（逆ジオコーディング）
  async getAddressFromCoordinates(coordinates: Coordinates): Promise<DatabaseResult<string>> {
    try {
      const { latitude, longitude } = coordinates;

      // Nominatim API (OpenStreetMap) を使用 - 無料で利用可能
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ja&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FishingRecordApp/1.0' // API利用時のUser-Agent必須
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

      // 日本語の住所を整形
      let address = data.display_name;

      // より詳細で日本らしい住所形式に整形
      if (data.address) {
        const parts = [];

        // 都道府県
        if (data.address.state) {
          parts.push(data.address.state);
        }

        // 市区町村
        if (data.address.city) {
          parts.push(data.address.city);
        } else if (data.address.town) {
          parts.push(data.address.town);
        } else if (data.address.village) {
          parts.push(data.address.village);
        }

        // 区（特別区）
        if (data.address.city_district) {
          parts.push(data.address.city_district);
        }

        // 町・丁目
        if (data.address.suburb) {
          parts.push(data.address.suburb);
        } else if (data.address.neighbourhood) {
          parts.push(data.address.neighbourhood);
        }

        // 番地
        if (data.address.house_number) {
          parts.push(`${data.address.house_number}番`);
        }

        if (parts.length > 0) {
          address = parts.join('');
        }
      }

      return {
        success: true,
        data: address
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GEOCODING_FAILED',
          message: `住所の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
        }
      };
    }
  }

  // 現在位置の取得
  async getCurrentPosition(options?: Partial<GeolocationOptions>): Promise<GeolocationResult> {
    // ブラウザの位置情報API対応チェック
    if (!navigator.geolocation) {
      return {
        success: false,
        error: {
          code: 0,
          message: 'Geolocation is not supported by this browser'
        }
      };
    }

    // デフォルトオプション
    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10秒
      maximumAge: 300000 // 5分
    };

    const geoOptions = { ...defaultOptions, ...options };

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          resolve({
            success: true,
            coordinates
          });
        },
        (error) => {
          const geolocationError: GeolocationError = {
            code: error.code,
            message: this.getErrorMessage(error.code)
          };

          resolve({
            success: false,
            error: geolocationError
          });
        },
        geoOptions
      );
    });
  }

  // 位置情報の監視開始
  watchPosition(
    callback: (result: GeolocationResult) => void,
    options?: Partial<GeolocationOptions>
  ): number | null {
    if (!navigator.geolocation) {
      callback({
        success: false,
        error: {
          code: 0,
          message: 'Geolocation is not supported by this browser'
        }
      });
      return null;
    }

    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000 // 1分
    };

    const geoOptions = { ...defaultOptions, ...options };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coordinates: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        callback({
          success: true,
          coordinates
        });
      },
      (error) => {
        const geolocationError: GeolocationError = {
          code: error.code,
          message: this.getErrorMessage(error.code)
        };

        callback({
          success: false,
          error: geolocationError
        });
      },
      geoOptions
    );

    return watchId;
  }

  // 位置情報の監視停止
  clearWatch(watchId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  // 位置情報の権限状態を確認
  async checkPermission(): Promise<DatabaseResult<{
    state: 'granted' | 'denied' | 'prompt';
    supported: boolean;
  }>> {
    try {
      // navigator.permissions対応チェック
      if (!navigator.permissions) {
        return {
          success: true,
          data: {
            state: 'prompt',
            supported: !!navigator.geolocation
          }
        };
      }

      const result = await navigator.permissions.query({ name: 'geolocation' });

      return {
        success: true,
        data: {
          state: result.state as 'granted' | 'denied' | 'prompt',
          supported: !!navigator.geolocation
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PERMISSION_CHECK_FAILED',
          message: 'Failed to check geolocation permission',
          details: error
        }
      };
    }
  }

  // 2点間の距離を計算（メートル単位）
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371e3; // 地球の半径（メートル）
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // メートル単位の距離
  }

  // 座標を人間が読みやすい文字列に変換
  formatCoordinates(coordinates: Coordinates, precision = 6): string {
    const lat = coordinates.latitude.toFixed(precision);
    const lng = coordinates.longitude.toFixed(precision);
    const latDir = coordinates.latitude >= 0 ? 'N' : 'S';
    const lngDir = coordinates.longitude >= 0 ? 'E' : 'W';

    return `${Math.abs(parseFloat(lat))}°${latDir}, ${Math.abs(parseFloat(lng))}°${lngDir}`;
  }

  // 精度レベルの判定
  getAccuracyLevel(accuracy?: number): 'high' | 'medium' | 'low' | 'unknown' {
    if (!accuracy) return 'unknown';

    if (accuracy <= 10) return 'high';       // 10m以下
    if (accuracy <= 50) return 'medium';     // 50m以下
    if (accuracy <= 100) return 'low';       // 100m以下
    return 'unknown';
  }

  // 座標が有効かどうかチェック
  isValidCoordinates(coordinates: Coordinates): boolean {
    const { latitude, longitude } = coordinates;

    // 緯度の範囲チェック (-90 to 90)
    if (latitude < -90 || latitude > 90) return false;

    // 経度の範囲チェック (-180 to 180)
    if (longitude < -180 || longitude > 180) return false;

    // NaN チェック
    if (isNaN(latitude) || isNaN(longitude)) return false;

    return true;
  }

  // プライベートメソッド: エラーメッセージの取得
  private getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'User denied the request for Geolocation';
      case 2:
        return 'Location information is unavailable';
      case 3:
        return 'The request to get user location timed out';
      default:
        return 'An unknown error occurred while retrieving location';
    }
  }
}

// サービスインスタンスのシングルトン
export const geolocationService = new GeolocationService();