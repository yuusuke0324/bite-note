// アプリケーション設定管理サービス

import { db } from './database';
import type {
  AppSettings,
  Theme,
  DatabaseResult
} from '../types';

export class SettingsService {

  // 全設定の取得
  async getSettings(): Promise<DatabaseResult<AppSettings>> {
    try {
      const theme = await db.getSetting<Theme>('theme') || 'light';
      const defaultSort = await db.getSetting<'date' | 'createdAt'>('defaultSort') || 'date';
      const defaultUseGPS = await db.getSetting<boolean>('defaultUseGPS') || true;
      const imageQuality = await db.getSetting<number>('imageQuality') || 0.8;
      const maxImageSize = await db.getSetting<number>('maxImageSize') || 5;

      const settings: AppSettings = {
        theme,
        language: await db.getSetting<'ja' | 'en'>('language') || 'ja',
        dateFormat: await db.getSetting<'YYYY/MM/DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY'>('dateFormat') || 'YYYY/MM/DD',
        temperatureUnit: await db.getSetting<'celsius' | 'fahrenheit'>('temperatureUnit') || 'celsius',
        sizeUnit: await db.getSetting<'cm' | 'inch'>('sizeUnit') || 'cm',
        defaultSort,
        defaultUseGPS,
        autoSave: await db.getSetting<boolean>('autoSave') || true,
        enableNotifications: await db.getSetting<boolean>('enableNotifications') || false,
        dataRetention: await db.getSetting<number>('dataRetention') || 365,
        exportFormat: await db.getSetting<'json' | 'csv'>('exportFormat') || 'json',
        defaultLocation: await db.getSetting<string>('defaultLocation') || '',
        defaultSpecies: await db.getSetting<string>('defaultSpecies') || '',
        showTutorial: await db.getSetting<boolean>('showTutorial') || true,
        compactView: await db.getSetting<boolean>('compactView') || false,
        showWeatherInfo: await db.getSetting<boolean>('showWeatherInfo') || true,
        autoLocation: await db.getSetting<boolean>('autoLocation') || true,
        imageQuality,
        maxImageSize,
        maxPhotoSize: await db.getSetting<number>('maxPhotoSize') || 10
      };

      return {
        success: true,
        data: settings
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_SETTINGS_FAILED',
          message: 'Failed to get application settings',
          details: error
        }
      };
    }
  }

  // 設定の更新
  async updateSettings(settings: Partial<AppSettings>): Promise<DatabaseResult<AppSettings>> {
    try {
      // バリデーション
      const validationResult = this.validateSettings(settings);
      if (!validationResult.success) {
        return validationResult as DatabaseResult<AppSettings>;
      }

      // 個別設定の更新
      if (settings.theme !== undefined) {
        await db.updateSetting('theme', settings.theme, 'string');
      }

      if (settings.defaultSort !== undefined) {
        await db.updateSetting('defaultSort', settings.defaultSort, 'string');
      }

      if (settings.defaultUseGPS !== undefined) {
        await db.updateSetting('defaultUseGPS', settings.defaultUseGPS, 'boolean');
      }

      if (settings.imageQuality !== undefined) {
        await db.updateSetting('imageQuality', settings.imageQuality, 'number');
      }

      if (settings.maxImageSize !== undefined) {
        await db.updateSetting('maxImageSize', settings.maxImageSize, 'number');
      }

      // 更新後の設定を取得して返す
      return await this.getSettings();
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_SETTINGS_FAILED',
          message: 'Failed to update application settings',
          details: error
        }
      };
    }
  }

  // 特定の設定値を取得
  async getSetting<T>(key: keyof AppSettings): Promise<DatabaseResult<T | null>> {
    try {
      const value = await db.getSetting<T>(key);

      return {
        success: true,
        data: value
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_SETTING_FAILED',
          message: `Failed to get setting: ${key}`,
          details: error
        }
      };
    }
  }

  // 特定の設定値を更新
  async updateSetting<T>(
    key: keyof AppSettings,
    value: T,
    valueType: 'string' | 'number' | 'boolean'
  ): Promise<DatabaseResult<void>> {
    try {
      // 個別バリデーション
      const validationResult = this.validateSingleSetting(key, value);
      if (!validationResult.success) {
        return validationResult;
      }

      await db.updateSetting(key, value, valueType);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_SETTING_FAILED',
          message: `Failed to update setting: ${key}`,
          details: error
        }
      };
    }
  }

  // 設定をデフォルト値にリセット
  async resetToDefaults(): Promise<DatabaseResult<AppSettings>> {
    try {
      const defaultSettings: AppSettings = {
        theme: 'light',
        language: 'ja',
        dateFormat: 'YYYY/MM/DD',
        temperatureUnit: 'celsius',
        sizeUnit: 'cm',
        defaultSort: 'date',
        defaultUseGPS: true,
        autoSave: true,
        enableNotifications: false,
        dataRetention: 365,
        exportFormat: 'json',
        defaultLocation: '',
        defaultSpecies: '',
        showTutorial: true,
        compactView: false,
        showWeatherInfo: true,
        autoLocation: true,
        imageQuality: 0.8,
        maxImageSize: 5,
        maxPhotoSize: 10
      };

      return await this.updateSettings(defaultSettings);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RESET_SETTINGS_FAILED',
          message: 'Failed to reset settings to defaults',
          details: error
        }
      };
    }
  }

  // 設定のエクスポート（JSON形式）
  async exportSettings(): Promise<DatabaseResult<string>> {
    try {
      const settingsResult = await this.getSettings();
      if (!settingsResult.success || !settingsResult.data) {
        return {
          success: false,
          error: settingsResult.error || {
            code: 'EXPORT_FAILED',
            message: 'Failed to get settings for export'
          }
        };
      }

      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings: settingsResult.data
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      return {
        success: true,
        data: jsonString
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_SETTINGS_FAILED',
          message: 'Failed to export settings',
          details: error
        }
      };
    }
  }

  // 設定のインポート（JSON形式）
  async importSettings(jsonString: string): Promise<DatabaseResult<AppSettings>> {
    try {
      const importData = JSON.parse(jsonString);

      // インポートデータの構造チェック
      if (!importData.settings || typeof importData.settings !== 'object') {
        return {
          success: false,
          error: {
            code: 'INVALID_IMPORT_DATA',
            message: 'Invalid import data format'
          }
        };
      }

      // バージョンチェック（将来の互換性のため）
      if (importData.version && importData.version !== '1.0.0') {
        console.warn(`Importing from different version: ${importData.version}`);
      }

      // 設定の更新
      return await this.updateSettings(importData.settings);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'IMPORT_SETTINGS_FAILED',
          message: 'Failed to import settings',
          details: error
        }
      };
    }
  }

  // プライベートメソッド: 設定の一括バリデーション
  private validateSettings(settings: Partial<AppSettings>): DatabaseResult<void> {
    // テーマの検証
    if (settings.theme !== undefined) {
      const validThemes: Theme[] = ['light', 'dark', 'auto'];
      if (!validThemes.includes(settings.theme)) {
        return {
          success: false,
          error: {
            code: 'INVALID_THEME',
            message: `Invalid theme: ${settings.theme}. Valid themes: ${validThemes.join(', ')}`
          }
        };
      }
    }

    // ソート順の検証
    if (settings.defaultSort !== undefined) {
      const validSorts = ['date', 'createdAt'];
      if (!validSorts.includes(settings.defaultSort)) {
        return {
          success: false,
          error: {
            code: 'INVALID_SORT',
            message: `Invalid sort: ${settings.defaultSort}. Valid sorts: ${validSorts.join(', ')}`
          }
        };
      }
    }

    // 画像品質の検証
    if (settings.imageQuality !== undefined) {
      if (settings.imageQuality < 0 || settings.imageQuality > 1) {
        return {
          success: false,
          error: {
            code: 'INVALID_IMAGE_QUALITY',
            message: 'Image quality must be between 0 and 1'
          }
        };
      }
    }

    // 最大画像サイズの検証
    if (settings.maxImageSize !== undefined) {
      if (settings.maxImageSize < 1 || settings.maxImageSize > 50) {
        return {
          success: false,
          error: {
            code: 'INVALID_MAX_IMAGE_SIZE',
            message: 'Max image size must be between 1 and 50 MB'
          }
        };
      }
    }

    return { success: true };
  }

  // プライベートメソッド: 個別設定のバリデーション
  private validateSingleSetting<T>(key: keyof AppSettings, value: T): DatabaseResult<void> {
    const partialSettings = { [key]: value } as Partial<AppSettings>;
    return this.validateSettings(partialSettings);
  }
}

// サービスインスタンスのシングルトン
export const settingsService = new SettingsService();