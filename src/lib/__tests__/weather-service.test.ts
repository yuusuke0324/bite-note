/**
 * TASK-17 PR #2-C: weather-serviceのテスト
 *
 * 目標: カバレッジ 0% → 75-80%達成
 *
 * Phase 1: コアAPI機能（getCurrentWeather、getHistoricalWeather、getMarineData）
 * Phase 2: キャッシュ機構（getCachedWeather、getMarineCache、clearCache）
 * Phase 3: ヘルパーメソッド + エラーハンドリング
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WeatherService } from '../weather-service';
import type { Coordinates } from '../../types';

// 固定タイムスタンプ（2024-01-15 12:00:00 JST）
const FIXED_NOW = new Date('2024-01-15T12:00:00+09:00').getTime();

// モックレスポンス: Open-Meteo Current Weather API
const mockCurrentWeatherResponse = {
  current: {
    weather_code: 1,
    temperature_2m: 20,
    relative_humidity_2m: 60,
    wind_speed_10m: 5.0,
    surface_pressure: 1013,
    precipitation: 0
  }
};

// モックレスポンス: Open-Meteo Historical API
const mockHistoricalWeatherResponse = {
  hourly: {
    time: ['2024-01-15T09:00:00', '2024-01-15T10:00:00', '2024-01-15T11:00:00', '2024-01-15T12:00:00'],
    weather_code: [1, 2, 1, 1],
    temperature_2m: [18, 19, 19.5, 20],
    relative_humidity_2m: [65, 62, 61, 60],
    wind_speed_10m: [4.5, 4.8, 5.0, 5.2],
    surface_pressure: [1012, 1012.5, 1013, 1013.5],
    precipitation: [0, 0, 0, 0]
  }
};

// モックレスポンス: Open-Meteo Marine API
const mockMarineDataResponse = {
  current: {
    sea_surface_temperature: 18.5,
    wave_height: 1.2,
    wave_direction: 90
  }
};

describe('WeatherService', () => {
  let service: WeatherService;
  const coordinates: Coordinates = { latitude: 35.6812, longitude: 139.7671 }; // 東京

  beforeEach(() => {
    service = new WeatherService();

    // global.fetch モック
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCurrentWeatherResponse)
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    // Date.now() モック（固定タイムスタンプ）
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);

    // Math.random() モック（決定的テスト用）
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // console.error モック
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // キャッシュクリア
    service.clearCache();
    service.resetApiUsage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Phase 1: コアAPI機能
  // ============================================================================

  describe('getCurrentWeather', () => {
    it('有効な座標で現在の天気を取得できる', async () => {
      const result = await service.getCurrentWeather(coordinates);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.condition).toBe('晴れ'); // weather_code: 1
      expect(result.data?.temperature).toBe(20);
      expect(result.data?.humidity).toBe(60);
      expect(result.data?.windSpeed).toBe(5.0);
      expect(result.data?.pressure).toBe(1013);
      expect(result.data?.icon).toBe('02d');
    });

    it('キャッシュヒット時に再取得せずキャッシュを返す', async () => {
      // 1回目の呼び出し
      await service.getCurrentWeather(coordinates);

      // fetchモックをクリア
      vi.mocked(fetch).mockClear();

      // 2回目の呼び出し（キャッシュヒット）
      const result = await service.getCurrentWeather(coordinates);

      expect(result.success).toBe(true);
      expect(result.data?.temperature).toBe(20);
      // fetchが呼ばれていないことを確認
      expect(fetch).not.toHaveBeenCalled();
    });

    it('API失敗時にダミーデータを返す（Math.random()モック）', async () => {
      // fetchを失敗させる
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await service.getCurrentWeather(coordinates);

      expect(result.success).toBe(true);
      // Math.random() = 0.5 → インデックス = Math.floor(0.5 * 5) = 2
      // conditions[2] = '雨', icons[2] = '03d'
      expect(result.data?.condition).toBe('雨');
      expect(result.data?.icon).toBe('03d');
      // temperature = Math.round(0.5 * 30 + 5) = 20
      expect(result.data?.temperature).toBe(20);
      // humidity = Math.round(0.5 * 40 + 40) = 60
      expect(result.data?.humidity).toBe(60);
    });

    it('response.ok = false の場合にダミーデータを返す', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500
      } as Response);

      const result = await service.getCurrentWeather(coordinates);

      expect(result.success).toBe(true);
      expect(result.data?.condition).toBe('雨'); // Math.random() = 0.5
      expect(result.data?.icon).toBe('03d');
    });

    it('境界値: latitude = -90（南極）', async () => {
      const southPole: Coordinates = { latitude: -90, longitude: 0 };
      const result = await service.getCurrentWeather(southPole);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('latitude=-90')
      );
    });

    it('冪等性: 同じ座標で複数回呼び出してもキャッシュが機能する', async () => {
      // 1回目
      const result1 = await service.getCurrentWeather(coordinates);
      expect(result1.success).toBe(true);

      // 2回目（キャッシュヒット）
      const result2 = await service.getCurrentWeather(coordinates);
      expect(result2.success).toBe(true);

      // 3回目（キャッシュヒット）
      const result3 = await service.getCurrentWeather(coordinates);
      expect(result3.success).toBe(true);

      // fetchは1回のみ
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHistoricalWeather', () => {
    it('0日前（今日）の天気を履歴APIで取得', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistoricalWeatherResponse)
      } as Response);

      const now = new Date('2024-01-15T15:00:00+09:00');
      const datetime = new Date('2024-01-15T10:00:00+09:00'); // 同日
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2024-01-15&end_date=2024-01-15')
      );
    });

    it('3日前の天気を履歴APIで取得', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistoricalWeatherResponse)
      } as Response);

      const now = new Date('2024-01-18T15:00:00+09:00');
      const datetime = new Date('2024-01-15T10:00:00+09:00'); // 3日前
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2024-01-15&end_date=2024-01-15')
      );
    });

    it('7日前の天気を履歴APIで取得（境界内側）', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistoricalWeatherResponse)
      } as Response);

      const now = new Date('2024-01-22T15:00:00+09:00');
      const datetime = new Date('2024-01-15T15:00:00+09:00'); // 7日前
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2024-01-15&end_date=2024-01-15')
      );
    });

    it('履歴API失敗時に getCurrentWeather にフォールバック', async () => {
      // 最初の履歴API呼び出しを失敗させる
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Historical API error'))
        // 2回目（getCurrentWeather）は成功
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCurrentWeatherResponse)
        } as Response);

      const now = new Date('2024-01-18T15:00:00+09:00');
      const datetime = new Date('2024-01-15T10:00:00+09:00'); // 3日前
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      expect(result.data?.temperature).toBe(20); // 現在天気データ
      // fetchが2回呼ばれている（履歴API失敗 + 現在天気API成功）
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('レスポンスパース時に空配列でもデフォルト値を使用', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          hourly: {
            time: [],
            weather_code: [],
            temperature_2m: [],
            relative_humidity_2m: [],
            wind_speed_10m: [],
            surface_pressure: [],
            precipitation: []
          }
        })
      } as Response);

      const now = new Date('2024-01-18T15:00:00+09:00');
      const datetime = new Date('2024-01-15T10:00:00+09:00'); // 3日前
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      // デフォルト値を使用
      expect(result.data?.temperature).toBe(20);
      expect(result.data?.humidity).toBe(60);
      expect(result.data?.windSpeed).toBe(0);
      expect(result.data?.pressure).toBe(1013);
    });

    it('境界値: 0日前（今日）は履歴API使用', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistoricalWeatherResponse)
      } as Response);

      const now = new Date('2024-01-15T15:00:00+09:00');
      const datetime = new Date('2024-01-15T10:00:00+09:00'); // 同日
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2024-01-15')
      );
    });

    it('境界値: 7日ちょうど前は履歴API使用', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistoricalWeatherResponse)
      } as Response);

      const now = new Date('2024-01-22T15:00:00+09:00');
      const datetime = new Date('2024-01-15T15:00:00+09:00'); // 7日前
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      // 履歴APIのURL確認
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2024-01-15&end_date=2024-01-15')
      );
    });

    it('境界値: 8日前はgetCurrentWeatherにフォールバック', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCurrentWeatherResponse)
      } as Response);

      const now = new Date('2024-01-23T15:00:00+09:00');
      const datetime = new Date('2024-01-15T15:00:00+09:00'); // 8日前
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      // 現在天気APIのURL確認（start_dateがない）
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/forecast?latitude=')
      );
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('start_date')
      );
    });

    it('境界値: 未来の日付はgetCurrentWeatherにフォールバック', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCurrentWeatherResponse)
      } as Response);

      const now = new Date('2024-01-15T15:00:00+09:00');
      const datetime = new Date('2024-01-20T10:00:00+09:00'); // 5日後
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      // 現在天気APIのURL確認
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/forecast?latitude=')
      );
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('start_date')
      );
    });

    it('冪等性: 同じ日時で複数回呼び出してもキャッシュが機能する', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistoricalWeatherResponse)
      } as Response);

      const now = new Date('2024-01-18T15:00:00+09:00');
      const datetime = new Date('2024-01-15T10:00:00+09:00'); // 3日前
      vi.setSystemTime(now);

      // 1回目
      const result1 = await service.getHistoricalWeather(coordinates, datetime);
      expect(result1.success).toBe(true);

      // fetchモックをクリア
      vi.mocked(fetch).mockClear();

      // 2回目（キャッシュヒット）
      const result2 = await service.getHistoricalWeather(coordinates, datetime);
      expect(result2.success).toBe(true);

      // fetchが呼ばれていないことを確認
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('getMarineData', () => {
    it('有効な座標で海洋データを取得できる', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMarineDataResponse)
      } as Response);

      const result = await service.getMarineData(coordinates);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.seaTemperature).toBe(18.5);
      expect(result.data?.waveHeight).toBe(1.2);
      expect(result.data?.waveDirection).toBe(90);
    });

    it('キャッシュヒット時に再取得せずキャッシュを返す', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMarineDataResponse)
      } as Response);

      // 1回目の呼び出し
      await service.getMarineData(coordinates);

      // fetchモックをクリア
      vi.mocked(fetch).mockClear();

      // 2回目の呼び出し（キャッシュヒット）
      const result = await service.getMarineData(coordinates);

      expect(result.success).toBe(true);
      expect(result.data?.seaTemperature).toBe(18.5);
      // fetchが呼ばれていないことを確認
      expect(fetch).not.toHaveBeenCalled();
    });

    it('Marine API失敗時に success: false と適切なエラーメッセージを返す', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Marine API error'));

      const result = await service.getMarineData(coordinates);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('MARINE_API_ERROR');
      expect(result.error?.message).toContain('Marine API error');
    });

    it('response.ok = false の場合に MARINE_API_ERROR コードを返す', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 503
      } as Response);

      const result = await service.getMarineData(coordinates);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MARINE_API_ERROR');
    });

    it('境界値: 海面水温0度、波高0m、波向き0度（すべて0）', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          current: {
            sea_surface_temperature: 0,
            wave_height: 0,
            wave_direction: 0
          }
        })
      } as Response);

      const result = await service.getMarineData(coordinates);

      expect(result.success).toBe(true);
      expect(result.data?.seaTemperature).toBe(0);
      expect(result.data?.waveHeight).toBe(0);
      expect(result.data?.waveDirection).toBe(0);
    });

    it('冪等性: 同じ座標で複数回呼び出してもキャッシュが機能する', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMarineDataResponse)
      } as Response);

      // 1回目
      const result1 = await service.getMarineData(coordinates);
      expect(result1.success).toBe(true);

      // 2回目（キャッシュヒット）
      const result2 = await service.getMarineData(coordinates);
      expect(result2.success).toBe(true);

      // 3回目（キャッシュヒット）
      const result3 = await service.getMarineData(coordinates);
      expect(result3.success).toBe(true);

      // fetchは1回のみ
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Phase 2: キャッシュ機構
  // ============================================================================

  describe('getCachedWeather', () => {
    it('キャッシュヒット時にデータを返却', async () => {
      // 1回目の呼び出しでキャッシュに保存
      await service.getCurrentWeather(coordinates);

      // キャッシュから直接取得
      const cacheKey = 'current_35.68_139.77'; // 座標を小数点第2位まで丸め
      const cached = service.getCachedWeather(cacheKey);

      expect(cached).not.toBeNull();
      expect(cached?.temperature).toBe(20);
    });

    it('存在しないキャッシュキーで null を返す', () => {
      const cached = service.getCachedWeather('non_existent_key');
      expect(cached).toBeNull();
    });

    it('境界値: 29分59秒後はキャッシュ有効', async () => {
      // 1回目の呼び出し
      await service.getCurrentWeather(coordinates);

      // 29分59秒進める
      vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW + 29 * 60 * 1000 + 59 * 1000);

      const cacheKey = 'current_35.68_139.77';
      const cached = service.getCachedWeather(cacheKey);

      expect(cached).not.toBeNull();
      expect(cached?.temperature).toBe(20);
    });

    it('境界値: 30分+1msでキャッシュ無効', async () => {
      // 1回目の呼び出し
      await service.getCurrentWeather(coordinates);

      // 30分+1ms進める（now - cached.timestamp > cacheDuration なので、>で判定）
      vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW + 30 * 60 * 1000 + 1);

      const cacheKey = 'current_35.68_139.77';
      const cached = service.getCachedWeather(cacheKey);

      expect(cached).toBeNull(); // 期限切れ
    });
  });

  describe('getMarineCache & cacheMarineData', () => {
    it('海洋データのキャッシュヒット', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMarineDataResponse)
      } as Response);

      // 1回目の呼び出しでキャッシュに保存
      await service.getMarineData(coordinates);

      // キャッシュから直接取得
      const cacheKey = 'marine_35.68_139.77';
      const cached = service.getMarineCache(cacheKey);

      expect(cached).not.toBeNull();
      expect(cached?.seaTemperature).toBe(18.5);
    });

    it('海洋データのキャッシュ保存', () => {
      const cacheKey = 'marine_35.68_139.77';
      const marineData = {
        seaTemperature: 20.5,
        waveHeight: 1.5,
        waveDirection: 120
      };

      service.cacheMarineData(cacheKey, marineData);

      const cached = service.getMarineCache(cacheKey);
      expect(cached).not.toBeNull();
      expect(cached?.seaTemperature).toBe(20.5);
      expect(cached?.waveHeight).toBe(1.5);
    });
  });

  describe('clearCache', () => {
    it('clearCache() で天気データキャッシュがクリアされる', async () => {
      // 天気データをキャッシュに保存
      await service.getCurrentWeather(coordinates);

      // キャッシュクリア
      service.clearCache();

      // キャッシュが空になっていることを確認
      const cacheKey = 'current_35.68_139.77';
      const cached = service.getCachedWeather(cacheKey);
      expect(cached).toBeNull();
    });

    it('冪等性: clearCache() を複数回呼び出しても問題ない', async () => {
      await service.getCurrentWeather(coordinates);

      service.clearCache();
      service.clearCache();
      service.clearCache();

      const cacheKey = 'current_35.68_139.77';
      const cached = service.getCachedWeather(cacheKey);
      expect(cached).toBeNull();
    });
  });

  // ============================================================================
  // Phase 3: ヘルパーメソッド + エラーハンドリング
  // ============================================================================

  describe('ヘルパーメソッド', () => {
    it('getWeatherIconUrl(): 正しいURLを生成', () => {
      const url = service.getWeatherIconUrl('01d');
      expect(url).toBe('https://openweathermap.org/img/wn/01d@2x.png');
    });

    it('getWeatherConditionInJapanese(): 英語→日本語変換', () => {
      expect(service.getWeatherConditionInJapanese('clear sky')).toBe('快晴');
      expect(service.getWeatherConditionInJapanese('light rain')).toBe('小雨');
      expect(service.getWeatherConditionInJapanese('thunderstorm')).toBe('雷雨');
    });

    it('canMakeApiCall(): API制限チェック（使用量0の場合true）', () => {
      const canCall = service.canMakeApiCall();
      expect(canCall).toBe(true);
    });

    it('setApiKey() / resetApiUsage(): APIキー設定とリセット', () => {
      service.setApiKey('test-api-key-123');
      service.resetApiUsage();

      const canCall = service.canMakeApiCall();
      expect(canCall).toBe(true);
    });

    it('境界値: getWeatherConditionInJapanese() で未定義の英語表現 → そのまま返す', () => {
      const result = service.getWeatherConditionInJapanese('unknown weather');
      expect(result).toBe('unknown weather'); // 変換されずそのまま
    });

    it('エッジケース: 近接座標は同じキャッシュキーになる（toFixed(2)による丸め）', async () => {
      const coords1: Coordinates = { latitude: 35.681236, longitude: 139.767125 }; // 東京
      const coords2: Coordinates = { latitude: 35.681237, longitude: 139.767126 }; // 1m違い

      await service.getCurrentWeather(coords1);
      vi.mocked(fetch).mockClear();

      await service.getCurrentWeather(coords2);

      // toFixed(2)で丸められるため、35.681236 → 35.68、35.681237 → 35.68（同じキャッシュキー）
      // キャッシュヒットするため、fetchは呼ばれない
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('getCurrentWeather(): ネットワークエラー時にダミーデータ', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network timeout'));

      const result = await service.getCurrentWeather(coordinates);

      expect(result.success).toBe(true);
      expect(result.data?.condition).toBe('雨'); // Math.random() = 0.5 → icons[2] = '03d'
      expect(result.data?.icon).toBe('03d');
      expect(console.error).toHaveBeenCalledWith(
        '天気情報取得エラー:',
        expect.any(Error)
      );
    });

    it('getHistoricalWeather(): API失敗時に getCurrentWeather にフォールバック', async () => {
      // 履歴API失敗
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Historical API timeout'))
        // フォールバック: getCurrentWeather 成功
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCurrentWeatherResponse)
        } as Response);

      const now = new Date('2024-01-18T15:00:00+09:00');
      const datetime = new Date('2024-01-15T10:00:00+09:00'); // 3日前
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      expect(result.data?.temperature).toBe(20); // 現在天気データ
      expect(console.error).toHaveBeenCalledWith(
        'Open-Meteo履歴天気取得エラー:',
        expect.any(Error)
      );
    });

    it('getMarineData(): API失敗時に success: false と適切なエラー', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Marine API unavailable'));

      const result = await service.getMarineData(coordinates);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MARINE_API_ERROR');
      expect(result.error?.message).toContain('Marine API unavailable');
      expect(console.error).toHaveBeenCalledWith(
        '海洋データ取得エラー:',
        expect.any(Error)
      );
    });

    it('parseOpenMeteoHistoricalResponse(): 空のレスポンス時にデフォルト値使用', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          hourly: {
            time: [],
            weather_code: [],
            temperature_2m: [],
            relative_humidity_2m: [],
            wind_speed_10m: [],
            surface_pressure: [],
            precipitation: []
          }
        })
      } as Response);

      const now = new Date('2024-01-18T15:00:00+09:00');
      const datetime = new Date('2024-01-15T10:00:00+09:00'); // 3日前
      vi.setSystemTime(now);

      const result = await service.getHistoricalWeather(coordinates, datetime);

      expect(result.success).toBe(true);
      // デフォルト値
      expect(result.data?.temperature).toBe(20);
      expect(result.data?.humidity).toBe(60);
      expect(result.data?.windSpeed).toBe(0);
      expect(result.data?.pressure).toBe(1013);
      expect(result.data?.condition).toBe('晴れ'); // weather_code: 1
    });
  });

  // ============================================================================
  // 統合テスト（オプション）
  // ============================================================================

  describe('統合テスト', () => {
    it('API呼び出しフロー全体: 現在天気 → 履歴天気 → 海洋データ', async () => {
      // 現在天気API
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCurrentWeatherResponse)
      } as Response);

      const currentResult = await service.getCurrentWeather(coordinates);
      expect(currentResult.success).toBe(true);
      expect(currentResult.data?.temperature).toBe(20);

      // 履歴天気API
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoricalWeatherResponse)
      } as Response);

      const now = new Date('2024-01-18T15:00:00+09:00');
      const datetime = new Date('2024-01-15T10:00:00+09:00'); // 3日前
      vi.setSystemTime(now);

      const historicalResult = await service.getHistoricalWeather(coordinates, datetime);
      expect(historicalResult.success).toBe(true);

      // 海洋データAPI
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMarineDataResponse)
      } as Response);

      const marineResult = await service.getMarineData(coordinates);
      expect(marineResult.success).toBe(true);
      expect(marineResult.data?.seaTemperature).toBe(18.5);

      // 全体で3回のAPI呼び出し
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });
});
