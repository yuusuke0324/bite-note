// 天気情報取得サービス

import type {
  WeatherData,
  WeatherResult,
  MarineData,
  MarineResult,
  WeatherApiConfig,
  ApiUsage,
  Coordinates
} from '../types';
import { logger } from './errors';

// Open-Meteo API レスポンス型定義
interface OpenMeteoHistoricalResponse {
  hourly: {
    time: string[];
    weather_code?: number[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    wind_speed_10m?: number[];
    surface_pressure?: number[];
    precipitation?: number[];
  };
}

interface OpenMeteoCurrentResponse {
  current: {
    weather_code: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    surface_pressure: number;
    precipitation: number;
  };
}

interface OpenMeteoMarineResponse {
  current: {
    sea_surface_temperature?: number;
    wave_height?: number;
    wave_period?: number;
    wave_direction?: number;
  };
}


export class WeatherService {
  private readonly config: WeatherApiConfig = {
    apiKey: process.env.REACT_APP_WEATHER_API_KEY || '', // 実際の使用時は環境変数から取得
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    dailyLimit: 1000, // 無料プランの1日制限
    cacheDuration: 30 * 60 * 1000 // 30分キャッシュ
  };

  private apiUsage: Map<string, ApiUsage> = new Map();
  private weatherCache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private marineCache: Map<string, { data: MarineData; timestamp: number }> = new Map();

  /**
   * 現在の天気情報を取得
   */
  async getCurrentWeather(coordinates: Coordinates): Promise<WeatherResult> {
    try {
      // キャッシュチェック
      const cacheKey = this.getCacheKey(coordinates, 'current');
      const cached = this.getCachedWeather(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached
        };
      }

      // Open-Meteo APIを使用（無料・APIキー不要）
      const weatherData = await this.getOpenMeteoWeather(coordinates);

      // キャッシュに保存
      this.cacheWeatherData(cacheKey, weatherData);

      return {
        success: true,
        data: weatherData
      };

    } catch (error) {
      logger.error('天気情報取得エラー', { error });

      // エラー時はダミーデータを返す
      return this.getDummyWeatherData();
    }
  }

  /**
   * 過去の天気情報を取得（撮影日時用）
   */
  async getHistoricalWeather(coordinates: Coordinates, datetime: Date): Promise<WeatherResult> {
    try {
      const now = new Date();
      const timeDiff = now.getTime() - datetime.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      // 今日から7日前までならOpen-Meteoの履歴データを取得可能
      if (daysDiff >= 0 && daysDiff <= 7) {
        return this.getOpenMeteoHistoricalWeather(coordinates, datetime);
      }

      // 7日より古い場合は現在の天気を使用
      if (daysDiff > 7) {
        return this.getCurrentWeather(coordinates);
      }

      // 未来の日付の場合は現在の天気を使用
      return this.getCurrentWeather(coordinates);

    } catch (error) {
      logger.error('過去天気情報取得エラー', { error });
      return this.getCurrentWeather(coordinates);
    }
  }

  /**
   * Open-Meteoから過去の天気情報を取得
   */
  private async getOpenMeteoHistoricalWeather(coordinates: Coordinates, datetime: Date): Promise<WeatherResult> {
    try {
      // キャッシュチェック
      const cacheKey = this.getCacheKey(coordinates, 'historical') + '_' + datetime.toDateString();
      const cached = this.getCachedWeather(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached
        };
      }

      const { latitude, longitude } = coordinates;
      const dateStr = datetime.toISOString().split('T')[0]; // YYYY-MM-DD形式

      // Open-Meteo 履歴API URL
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code&timezone=Asia%2FTokyo`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Open-Meteo Historical API error! status: ${response.status}`);
      }

      const data = await response.json();
      const weatherData = this.parseOpenMeteoHistoricalResponse(data, datetime);

      // キャッシュに保存
      this.cacheWeatherData(cacheKey, weatherData);

      return {
        success: true,
        data: weatherData
      };

    } catch (error) {
      logger.error('Open-Meteo履歴天気取得エラー', { error });
      // エラー時は現在の天気を使用
      return this.getCurrentWeather(coordinates);
    }
  }

  /**
   * Open-Meteo履歴APIレスポンスを解析
   */
  private parseOpenMeteoHistoricalResponse(data: OpenMeteoHistoricalResponse, targetDateTime: Date): WeatherData {
    const hourly = data.hourly;
    const times = hourly.time;
    const targetHour = targetDateTime.getHours();

    // 最も近い時間のデータを検索
    let closestIndex = 0;
    if (times && times.length > 0) {
      for (let i = 0; i < times.length; i++) {
        const dataTime = new Date(times[i]);
        if (dataTime.getHours() >= targetHour) {
          closestIndex = i;
          break;
        }
      }
    }

    const weatherCode = hourly.weather_code?.[closestIndex] || 1;

    return {
      condition: this.getWeatherConditionFromCode(weatherCode),
      temperature: Math.round(hourly.temperature_2m?.[closestIndex] || 20),
      humidity: hourly.relative_humidity_2m?.[closestIndex] || 60,
      windSpeed: Math.round((hourly.wind_speed_10m?.[closestIndex] || 0) * 10) / 10,
      pressure: hourly.surface_pressure?.[closestIndex] || 1013,
      icon: this.getWeatherIconFromCode(weatherCode),
      description: this.getWeatherConditionFromCode(weatherCode)
    };
  }

  /**
   * API呼び出し制限チェック
   */
  canMakeApiCall(): boolean {
    const today = new Date().toDateString();
    const usage = this.apiUsage.get(today);

    if (!usage) {
      return true;
    }

    return usage.requestCount < usage.dailyLimit;
  }

  /**
   * キャッシュされた天気データを取得
   */
  getCachedWeather(cacheKey: string): WeatherData | null {
    const cached = this.weatherCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheDuration) {
      this.weatherCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * APIキーを設定
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * API使用量をリセット（テスト用）
   */
  resetApiUsage(): void {
    this.apiUsage.clear();
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.weatherCache.clear();
    this.marineCache.clear();
  }

  /**
   * 海洋データのキャッシュを取得
   */
  getMarineCache(cacheKey: string): MarineData | null {
    const cached = this.marineCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheDuration) {
      this.marineCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * 海洋データをキャッシュに保存
   */
  cacheMarineData(cacheKey: string, data: MarineData): void {
    this.marineCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * API使用量を記録
   */
  /* private __recordApiUsage(): void {
    const today = new Date().toDateString();
    const usage = this.apiUsage.get(today);

    if (usage) {
      usage.requestCount++;
      usage.lastRequestTime = new Date();
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      this.apiUsage.set(today, {
        service: 'weather',
        requestCount: 1,
        lastRequestTime: new Date(),
        dailyLimit: this.config.dailyLimit,
        resetTime: tomorrow
      });
    }
  } */

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(coordinates: Coordinates, type: 'current' | 'historical' | 'marine'): string {
    const lat = coordinates.latitude.toFixed(2);
    const lng = coordinates.longitude.toFixed(2);
    return `${type}_${lat}_${lng}`;
  }

  /**
   * 天気データをキャッシュに保存
   */
  private cacheWeatherData(cacheKey: string, data: WeatherData): void {
    this.weatherCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Open-Meteo APIから天気情報を取得
   */
  private async getOpenMeteoWeather(coordinates: Coordinates): Promise<WeatherData> {
    const { latitude, longitude } = coordinates;

    // Open-Meteo API URL（無料・APIキー不要）
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code&timezone=Asia%2FTokyo`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo API error! status: ${response.status}`);
    }

    const data = await response.json();
    return this.parseOpenMeteoResponse(data);
  }

  /**
   * Open-Meteo APIレスポンスを解析
   */
  private parseOpenMeteoResponse(data: OpenMeteoCurrentResponse): WeatherData {
    const current = data.current;
    const weatherCode = current.weather_code;

    return {
      condition: this.getWeatherConditionFromCode(weatherCode),
      temperature: Math.round(current.temperature_2m || 0),
      humidity: current.relative_humidity_2m || 0,
      windSpeed: Math.round((current.wind_speed_10m || 0) * 10) / 10,
      pressure: current.surface_pressure || 0,
      icon: this.getWeatherIconFromCode(weatherCode),
      description: this.getWeatherConditionFromCode(weatherCode)
    };
  }

  /**
   * Open-Meteo天気コードから天気状況を取得
   */
  private getWeatherConditionFromCode(code: number): string {
    const codeMap: Record<number, string> = {
      0: '快晴',
      1: '晴れ',
      2: '晴れ時々曇り',
      3: '曇り',
      45: '霧',
      48: '霧氷',
      51: '小雨',
      53: '雨',
      55: '大雨',
      61: '小雨',
      63: '雨',
      65: '大雨',
      71: '小雪',
      73: '雪',
      75: '大雪',
      95: '雷雨',
      96: '雷雨',
      99: '大雷雨'
    };

    return codeMap[code] || '不明';
  }

  /**
   * Open-Meteo天気コードからアイコンコードを取得
   */
  private getWeatherIconFromCode(code: number): string {
    if (code === 0) return '01d'; // 快晴
    if (code <= 2) return '02d'; // 晴れ
    if (code === 3) return '03d'; // 曇り
    if (code >= 45 && code <= 48) return '50d'; // 霧
    if (code >= 51 && code <= 65) return '10d'; // 雨
    if (code >= 71 && code <= 75) return '13d'; // 雪
    if (code >= 95) return '11d'; // 雷雨
    return '01d'; // デフォルト
  }

  /**
   * ダミー天気データを生成（開発・テスト用）
   */
  private getDummyWeatherData(): WeatherResult {
    const conditions = ['晴れ', '曇り', '雨', '小雨', '晴れ時々曇り'];
    const icons = ['01d', '02d', '03d', '10d', '04d'];
    const randomIndex = Math.floor(Math.random() * conditions.length);

    const dummyData: WeatherData = {
      condition: conditions[randomIndex],
      temperature: Math.round(Math.random() * 30 + 5), // 5-35度
      humidity: Math.round(Math.random() * 40 + 40), // 40-80%
      windSpeed: Math.round(Math.random() * 10 * 10) / 10, // 0-10 m/s
      pressure: Math.round(Math.random() * 100 + 950), // 950-1050 hPa
      icon: icons[randomIndex],
      description: conditions[randomIndex]
    };

    return {
      success: true,
      data: dummyData
    };
  }

  /**
   * 天気アイコンURLを取得
   */
  getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  /**
   * 天気状況の日本語表示を取得
   */
  getWeatherConditionInJapanese(condition: string): string {
    const conditionMap: Record<string, string> = {
      'clear sky': '快晴',
      'few clouds': '晴れ時々曇り',
      'scattered clouds': '曇り',
      'broken clouds': '曇り',
      'overcast clouds': '曇り',
      'light rain': '小雨',
      'moderate rain': '雨',
      'heavy intensity rain': '大雨',
      'thunderstorm': '雷雨',
      'snow': '雪',
      'mist': '霧'
    };

    return conditionMap[condition.toLowerCase()] || condition;
  }

  /**
   * 海洋データを取得（海面水温、波高、波向き）
   */
  async getMarineData(coordinates: Coordinates): Promise<MarineResult> {
    try {
      // キャッシュチェック
      const cacheKey = this.getCacheKey(coordinates, 'marine');
      const cached = this.getMarineCache(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached
        };
      }

      // Open-Meteo Marine API呼び出し
      const marineData = await this.getOpenMeteoMarineData(coordinates);

      // キャッシュに保存
      this.cacheMarineData(cacheKey, marineData);

      return {
        success: true,
        data: marineData
      };

    } catch (error) {
      logger.error('海洋データ取得エラー', { error });
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : '海洋データの取得に失敗しました',
          code: 'MARINE_API_ERROR'
        }
      };
    }
  }

  /**
   * Open-Meteo Marine APIから海洋データを取得
   */
  private async getOpenMeteoMarineData(coordinates: Coordinates): Promise<MarineData> {
    const { latitude, longitude } = coordinates;

    // Open-Meteo Marine API URL
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&current=sea_surface_temperature,wave_height,wave_direction&timezone=Asia%2FTokyo`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo Marine API error! status: ${response.status}`);
    }

    const data = await response.json();
    return this.parseOpenMeteoMarineResponse(data);
  }

  /**
   * Open-Meteo Marine APIレスポンスを解析
   */
  private parseOpenMeteoMarineResponse(data: OpenMeteoMarineResponse): MarineData {
    const current = data.current;

    return {
      seaTemperature: Math.round((current.sea_surface_temperature || 0) * 10) / 10, // 小数点第1位
      waveHeight: Math.round((current.wave_height || 0) * 100) / 100, // 小数点第2位
      waveDirection: current.wave_direction || 0
    };
  }
}

// サービスインスタンスのシングルトン
export const weatherService = new WeatherService();