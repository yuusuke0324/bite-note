// セッション状態管理
// Phase 3-4: セッション管理機能実装

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { sessionService } from '../lib/session-service';
import { fallbackStorageService, type StorageMode } from '../lib/fallback-storage-service';
import { useToastStore } from './toast-store';

export type SessionStatus = 'active' | 'expired' | 'reconnecting';

// イベントリスナーハンドラーの参照を保持（メモリリーク防止）
let sessionExpiredHandler: EventListener | null = null;

interface SessionStore {
  // セッション状態
  sessionStatus: SessionStatus;
  lastActivityAt: number;
  timeoutDuration: number;

  // ストレージモード
  storageMode: StorageMode;
  isIndexedDBAvailable: boolean;

  // モーダル表示状態
  isSessionExpiredModalOpen: boolean;
  unsavedDataCount: number;

  // アクション
  actions: {
    // セッション管理
    startSession: () => void;
    stopSession: () => void;
    updateSessionStatus: (status: SessionStatus) => void;
    checkSession: () => Promise<boolean>;
    reconnectSession: () => Promise<boolean>;
    expireSession: () => void;

    // ストレージモード管理
    initializeStorageMode: () => Promise<void>;
    switchToLocalStorage: () => void;
    migrateToIndexedDB: () => Promise<boolean>;

    // モーダル管理
    showSessionExpiredModal: (unsavedCount: number) => void;
    hideSessionExpiredModal: () => void;

    // 未保存データカウント管理
    setUnsavedDataCount: (count: number) => void;
  };
}

export const useSessionStore = create<SessionStore>()(
  subscribeWithSelector((set, get) => ({
    // 初期状態
    sessionStatus: 'active',
    lastActivityAt: Date.now(),
    timeoutDuration: 30 * 60 * 1000, // 30分

    storageMode: 'indexeddb',
    isIndexedDBAvailable: true,

    isSessionExpiredModalOpen: false,
    unsavedDataCount: 0,

    actions: {
      // セッション管理の開始
      startSession: () => {
        if (import.meta.env.DEV) {
          console.log('[SessionStore] Starting session at:', new Date().toISOString());
        }

        // 既存のリスナーがあれば削除（二重登録防止）
        if (sessionExpiredHandler) {
          window.removeEventListener('session_expired', sessionExpiredHandler);
          sessionExpiredHandler = null;
        }

        // SessionServiceを開始
        sessionService.start();

        // セッション期限切れイベントのリスナー登録
        // メモリリーク防止のため、ハンドラー参照を保持
        sessionExpiredHandler = (event: Event) => {
          const customEvent = event as CustomEvent<SessionExpiredDetail>;
          if (import.meta.env.DEV) {
            console.log('[SessionStore] Session expired event received', customEvent.detail);
            console.log('[SessionStore] Current state before expireSession:', get().sessionStatus);
          }
          const { actions } = get();
          actions.expireSession();
        };
        window.addEventListener('session_expired', sessionExpiredHandler);

        set({ sessionStatus: 'active', lastActivityAt: Date.now() });

        if (import.meta.env.DEV) {
          console.log('[SessionStore] Session started - listener registered');
        }

        // E2Eテスト用フラグ設定
        // - 開発モード（MODE=development）
        // - テストモード（MODE=test）
        // - CI E2Eテスト（VITE_E2E_TEST=true、production buildでも露出）
        // 本番デプロイでは露出しない
        if (typeof window !== 'undefined' &&
            (import.meta.env.MODE !== 'production' || import.meta.env.VITE_E2E_TEST === 'true')) {
          window.sessionServiceStarted = true;
        }
      },

      // セッション管理の停止
      stopSession: () => {
        console.log('[SessionStore] Stopping session');

        // SessionServiceを停止
        sessionService.stop();

        // イベントリスナーの解除
        if (sessionExpiredHandler) {
          window.removeEventListener('session_expired', sessionExpiredHandler);
          sessionExpiredHandler = null;
        }

        // E2Eテスト用フラグリセット
        if (typeof window !== 'undefined' &&
            (import.meta.env.MODE !== 'production' || import.meta.env.VITE_E2E_TEST === 'true')) {
          window.sessionServiceStarted = false;
        }
      },

      // セッションステータスの更新
      updateSessionStatus: (status: SessionStatus) => {
        set({ sessionStatus: status });
      },

      // セッション有効性チェック
      checkSession: async (): Promise<boolean> => {
        const isValid = await sessionService.checkSession();

        if (!isValid) {
          const { actions } = get();
          actions.expireSession();
        }

        return isValid;
      },

      // セッション再接続
      reconnectSession: async (): Promise<boolean> => {
        const { actions } = get();

        try {
          actions.updateSessionStatus('reconnecting');

          const result = await sessionService.reconnect();

          if (result.success) {
            actions.updateSessionStatus('active');
            actions.hideSessionExpiredModal();

            // 成功トースト表示
            useToastStore.getState().showSuccess('データベースに再接続しました');

            return true;
          } else {
            // 再接続失敗時はlocalStorageに切り替え
            console.warn('[SessionStore] Reconnection failed, switching to localStorage');
            actions.switchToLocalStorage();

            // エラートースト表示
            useToastStore.getState().showError(
              'IndexedDBに接続できません。データをローカルに保存します'
            );

            return false;
          }
        } catch (error) {
          console.error('[SessionStore] Reconnection error', error);
          actions.updateSessionStatus('expired');

          // エラートースト表示
          useToastStore.getState().showError(
            'データベースへの再接続に失敗しました'
          );

          return false;
        }
      },

      // セッション期限切れ処理
      expireSession: () => {
        if (import.meta.env.DEV) {
          console.warn('[SessionStore] Session expired - BEFORE set');
        }

        // 未保存データ数を取得（実装は後で）
        const unsavedCount = 0; // TODO: 実際の未保存データ数を取得

        // 状態を一度にまとめて更新（Zustandの非同期バッチ処理を回避）
        set({
          sessionStatus: 'expired',
          isSessionExpiredModalOpen: true,
          unsavedDataCount: unsavedCount,
        });

        if (import.meta.env.DEV) {
          const state = get();
          console.warn('[SessionStore] Session expired - AFTER set', {
            sessionStatus: state.sessionStatus,
            isSessionExpiredModalOpen: state.isSessionExpiredModalOpen,
            unsavedDataCount: state.unsavedDataCount,
          });
        }
      },

      // ストレージモードの初期化
      initializeStorageMode: async () => {
        console.log('[SessionStore] Initializing storage mode');

        // IndexedDB対応状況を確認
        const isIndexedDBAvailable = fallbackStorageService.isIndexedDBAvailable();
        const isIndexedDBWorking = isIndexedDBAvailable
          ? await fallbackStorageService.testIndexedDB()
          : false;

        if (!isIndexedDBWorking) {
          console.warn('[SessionStore] IndexedDB is not available, using localStorage');

          set({
            storageMode: 'localstorage',
            isIndexedDBAvailable: false,
          });

          // 警告トースト表示
          useToastStore.getState().showWarning(
            'このブラウザではIndexedDBが利用できません。localStorageで動作します（容量制限5MB）'
          );
        } else {
          set({
            storageMode: 'indexeddb',
            isIndexedDBAvailable: true,
          });

          // localStorageにデータがある場合は移行を提案
          if (fallbackStorageService.hasLocalStorageData()) {
            console.log('[SessionStore] Found localStorage data, suggesting migration');

            // TODO: 移行プロンプトモーダルを表示（Phase 2）
            useToastStore.getState().showInfo(
              'IndexedDBが利用可能です。データを移行できます'
            );
          }
        }
      },

      // localStorageへの切り替え
      switchToLocalStorage: () => {
        console.log('[SessionStore] Switching to localStorage mode');

        set({
          storageMode: 'localstorage',
          sessionStatus: 'active', // localStorageモードでは常にアクティブ
        });

        // TODO: 現在のデータをlocalStorageに保存
      },

      // IndexedDBへのデータ移行
      migrateToIndexedDB: async (): Promise<boolean> => {
        try {
          console.log('[SessionStore] Starting data migration to IndexedDB');

          const result = await fallbackStorageService.migrateToIndexedDB();

          if (result.success && result.data) {
            const { migratedRecords, errors } = result.data;

            if (errors.length === 0) {
              // 移行成功
              set({
                storageMode: 'indexeddb',
                isIndexedDBAvailable: true,
              });

              useToastStore.getState().showSuccess(
                `${migratedRecords}件のデータをIndexedDBに移行しました`
              );

              return true;
            } else {
              // 一部失敗
              useToastStore.getState().showWarning(
                `${migratedRecords}件を移行しましたが、${errors.length}件のエラーがあります`
              );

              return false;
            }
          } else {
            // 移行失敗
            useToastStore.getState().showError(
              'データ移行に失敗しました。ローカルデータは保持されています'
            );

            return false;
          }
        } catch (error) {
          console.error('[SessionStore] Migration error', error);
          useToastStore.getState().showError('データ移行中にエラーが発生しました');
          return false;
        }
      },

      // セッション期限切れモーダルの表示
      showSessionExpiredModal: (unsavedCount: number) => {
        if (import.meta.env.DEV) {
          console.warn('[SessionStore] showSessionExpiredModal called - BEFORE set');
        }

        set({
          isSessionExpiredModalOpen: true,
          unsavedDataCount: unsavedCount,
        });

        if (import.meta.env.DEV) {
          const state = get();
          console.warn('[SessionStore] showSessionExpiredModal - AFTER set', {
            isSessionExpiredModalOpen: state.isSessionExpiredModalOpen,
            unsavedDataCount: state.unsavedDataCount,
          });
        }
      },

      // セッション期限切れモーダルの非表示
      hideSessionExpiredModal: () => {
        set({
          isSessionExpiredModalOpen: false,
          unsavedDataCount: 0,
        });
      },

      // 未保存データカウントの設定
      setUnsavedDataCount: (count: number) => {
        set({ unsavedDataCount: count });
      },
    },
  }))
);

// セレクタのエクスポート（パフォーマンス最適化用）
export const selectSessionStatus = (state: SessionStore) => state.sessionStatus;
export const selectStorageMode = (state: SessionStore) => state.storageMode;
export const selectIsSessionExpiredModalOpen = (state: SessionStore) =>
  state.isSessionExpiredModalOpen;
export const selectUnsavedDataCount = (state: SessionStore) => state.unsavedDataCount;

// E2Eテスト用のグローバルアクセス
// - 開発モード（MODE=development）
// - テストモード（MODE=test）
// - CI E2Eテスト（VITE_E2E_TEST=true、production buildでも露出）
// 本番デプロイでは露出しない
if (typeof window !== 'undefined' &&
    (import.meta.env.MODE !== 'production' || import.meta.env.VITE_E2E_TEST === 'true')) {
  window.__sessionStore = useSessionStore;

  // デバッグ用: グローバル露出を確認
  if (import.meta.env.DEV) {
    console.log('[SessionStore] Exposed to window.__sessionStore');
  }

  // E2Eテスト用: セッション管理が開始されたフラグ（初期値false）
  if (window.sessionServiceStarted === undefined) {
    window.sessionServiceStarted = false;
  }
}
