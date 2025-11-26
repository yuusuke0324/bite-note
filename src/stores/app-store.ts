// メインアプリケーション状態管理

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { fishingRecordService } from '../lib/fishing-record-service';
import { settingsService } from '../lib/settings-service';
import { logger } from '../lib/errors';
import type {
  AppState,
  AppSettings,
  FishingRecord,
  GetRecordsParams,
  UpdateFishingRecordForm
} from '../types';

interface AppStore extends AppState {
  // アクション
  actions: {
    // 初期化
    initialize: () => Promise<void>;

    // 記録管理
    loadRecords: (params?: GetRecordsParams) => Promise<void>;
    selectRecord: (record: FishingRecord | undefined) => void;
    refreshRecords: () => Promise<void>;
    updateRecord: (id: string, form: UpdateFishingRecordForm) => Promise<void>;
    deleteRecord: (id: string) => Promise<void>;

    // 設定管理
    loadSettings: () => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;

    // エラー・ローディング管理
    setLoading: (loading: boolean) => void;
    setError: (error: string | undefined) => void;
    clearError: () => void;
  };
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // 初期状態
    records: [],
    selectedRecord: undefined,
    loading: false,
    error: undefined,
    settings: {
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
    },

    actions: {
      // アプリケーション初期化
      initialize: async () => {
        const { actions } = get();

        try {
          actions.setLoading(true);
          actions.clearError();

          // 設定とレコードを並行して読み込み
          await Promise.all([
            actions.loadSettings(),
            actions.loadRecords({ limit: 20, sortBy: 'date', sortOrder: 'desc' })
          ]);

        } catch (error) {
          logger.error('App initialization failed', { error });
          actions.setError('アプリの初期化に失敗しました');
        } finally {
          actions.setLoading(false);
        }
      },

      // 記録一覧の読み込み
      loadRecords: async (params?: GetRecordsParams) => {
        const { actions } = get();

        try {
          const result = await fishingRecordService.getRecords(params);

          if (result.success && result.data) {
            set({ records: result.data });
          } else {
            actions.setError(result.error?.message || '記録の読み込みに失敗しました');
          }
        } catch (error) {
          logger.error('Failed to load records', { error });
          actions.setError('記録の読み込み中にエラーが発生しました');
        }
      },

      // 記録の選択
      selectRecord: (record: FishingRecord | undefined) => {
        set({ selectedRecord: record });
      },

      // 記録一覧の再読み込み
      refreshRecords: async () => {
        const { actions } = get();

        try {
          actions.setLoading(true);
          await actions.loadRecords({ limit: 20, sortBy: 'date', sortOrder: 'desc' });
        } finally {
          actions.setLoading(false);
        }
      },

      // 記録の更新
      updateRecord: async (id: string, form: UpdateFishingRecordForm) => {
        const { actions } = get();

        try {
          const result = await fishingRecordService.updateRecord(id, form);

          if (result.success) {
            // 記録一覧を再読み込みして最新状態に更新
            await actions.refreshRecords();

            // 選択中の記録も更新されている場合は更新
            const { selectedRecord } = get();
            if (selectedRecord?.id === id && result.data) {
              actions.selectRecord(result.data);
            }
          } else {
            actions.setError(result.error?.message || '記録の更新に失敗しました');
          }
        } catch (error) {
          logger.error('Failed to update record', { error });
          actions.setError('記録の更新中にエラーが発生しました');
        }
      },

      // 記録の削除
      deleteRecord: async (id: string) => {
        const { actions } = get();

        try {
          const result = await fishingRecordService.deleteRecord(id);

          if (result.success) {
            // 記録一覧を再読み込み
            await actions.refreshRecords();

            // 選択中の記録が削除された場合は選択を解除
            const { selectedRecord } = get();
            if (selectedRecord?.id === id) {
              actions.selectRecord(undefined);
            }
          } else {
            actions.setError(result.error?.message || '記録の削除に失敗しました');
          }
        } catch (error) {
          logger.error('Failed to delete record', { error });
          actions.setError('記録の削除中にエラーが発生しました');
        }
      },

      // 設定の読み込み
      loadSettings: async () => {

        try {
          const result = await settingsService.getSettings();

          if (result.success && result.data) {
            set({ settings: result.data });
          } else {
            logger.warn('Failed to load settings, using defaults', { error: result.error?.message });
          }
        } catch (error) {
          logger.error('Failed to load settings', { error });
          // 設定読み込み失敗はアプリ全体を止めない
        }
      },

      // 設定の更新
      updateSettings: async (newSettings: Partial<AppSettings>) => {
        const { actions } = get();

        try {
          const result = await settingsService.updateSettings(newSettings);

          if (result.success && result.data) {
            set({ settings: result.data });
          } else {
            actions.setError(result.error?.message || '設定の更新に失敗しました');
          }
        } catch (error) {
          logger.error('Failed to update settings', { error });
          actions.setError('設定の更新中にエラーが発生しました');
        }
      },

      // ローディング状態の設定
      setLoading: (loading: boolean) => {
        set({ loading });
      },

      // エラー状態の設定
      setError: (error: string | undefined) => {
        set({ error });
      },

      // エラーのクリア
      clearError: () => {
        set({ error: undefined });
      }
    }
  }))
);

// Zustand devtools integration (開発環境のみ)
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useAppStore as any).subscribe = useAppStore.subscribe;
}

// セレクタのエクスポート（パフォーマンス最適化用）
export const selectRecords = (state: AppStore) => state.records;
export const selectSelectedRecord = (state: AppStore) => state.selectedRecord;
export const selectLoading = (state: AppStore) => state.loading;
export const selectError = (state: AppStore) => state.error;
export const selectSettings = (state: AppStore) => state.settings;
export const selectActions = (state: AppStore) => state.actions;