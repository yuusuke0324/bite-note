import { useState, useEffect, useCallback } from 'react'
import { useAppStore, selectError, selectRecords, selectSettings, selectActions } from './stores/app-store'
import { useToastStore } from './stores/toast-store'
import { useSessionStore } from './stores/session-store'
import { TestIds } from './constants/testIds'
import { useFormStore, selectFormData, selectValidation, selectFormActions } from './stores/form-store'
import { exportImportService } from './lib/export-import-service'
import { FishingRecordForm } from './components/FishingRecordForm'
import { SimplePhotoList } from './components/SimplePhotoList'
import { photoService } from './lib/photo-service'
import { fishingRecordService } from './lib/fishing-record-service'
import { FishingRecordDetail } from './components/FishingRecordDetail'
import { FishingRecordEditModal } from './components/FishingRecordEditModal'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { PWAInstallBanner } from './components/PWAInstallBanner'
import { PWAUpdateNotification } from './components/PWAUpdateNotification'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorDisplay } from './components/errors'
import { ToastContainer } from './components/ToastContainer'
import { ReAuthPrompt } from './components/features/SessionManagement/ReAuthPrompt'
import Button from './components/ui/Button'
import { colors } from './theme/colors'
import { textStyles, typography } from './theme/typography'
import type { CreateFishingRecordFormData } from './lib/validation'
import type { FishingRecord } from './types'
import './App.css'

function App() {
  const [appError, setAppError] = useState<string | null>(null)
  const [dbStatus, setDbStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [dbMessage, setDbMessage] = useState<string>('')
  const [storeStatus, setStoreStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [storeMessage, setStoreMessage] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'debug'>('form')
  const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(null)
  const [editingRecord, setEditingRecord] = useState<FishingRecord | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<FishingRecord | null>(null)
  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false)
  // const [searchQuery, setSearchQuery] = useState('')
  // const [sortBy, setSortBy] = useState<keyof FishingRecord>('date')
  // const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Zustand Store の状態を取得
  const error = useAppStore(selectError)
  const records = useAppStore(selectRecords)
  const settings = useAppStore(selectSettings)
  const appActions = useAppStore(selectActions)

  const formData = useFormStore(selectFormData)
  const validation = useFormStore(selectValidation)
  const formActions = useFormStore(selectFormActions)

  // セッション管理
  const sessionStatus = useSessionStore((state) => state.sessionStatus)
  const isSessionExpiredModalOpen = useSessionStore(
    (state) => state.isSessionExpiredModalOpen
  )
  const unsavedDataCount = useSessionStore((state) => state.unsavedDataCount)
  const sessionActions = useSessionStore((state) => state.actions)

  // フォーム送信ハンドラー
  const handleFormSubmit = async (data: CreateFishingRecordFormData) => {
    // データを直接 fishingRecordService に送信
    try {
      const result = await fishingRecordService.createRecord(data);

      if (result.success) {
        // 成功時にアプリストアを更新
        await appActions.refreshRecords();
      } else {
        console.error('❌ Direct creation failed:', result.error);
        throw new Error(result.error?.message || '記録の保存に失敗しました');
      }
    } catch (error) {
      console.error('💥 Direct creation error:', error);
      appActions.setError(error instanceof Error ? error.message : '記録の保存に失敗しました');
    }

    // フォーム送信成功後は一覧画面に切り替え
    setActiveTab('list');
  };

  // 記録関連のハンドラー
  const handleRecordClick = (record: FishingRecord) => {
    setSelectedRecord(record);
  };

  const handleRecordEdit = (record: FishingRecord) => {
    setEditingRecord(record);
    setSelectedRecord(null); // 詳細モーダルを閉じる
  };

  const handleRecordDelete = (record: FishingRecord) => {
    setDeletingRecord(record);
    setSelectedRecord(null); // 詳細モーダルを閉じる
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;

    try {
      setIsDeletingInProgress(true);
      await appActions.deleteRecord(deletingRecord.id);
      setDeletingRecord(null);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeletingInProgress(false);
    }
  };

  const handleDeleteCancel = () => {
    if (isDeletingInProgress) return;
    setDeletingRecord(null);
  };

  // const handleSortChange = (newSortBy: keyof FishingRecord, newSortOrder: 'asc' | 'desc') => {
  //   setSortBy(newSortBy);
  //   setSortOrder(newSortOrder);
  // };

  const handleDataRefresh = useCallback(async () => {
    await appActions.initialize();
  }, [appActions]);

  // 編集機能のハンドラー
  const handleEditSave = async (id: string, data: CreateFishingRecordFormData) => {
    await appActions.updateRecord(id, data);
  };

  const handleEditClose = () => {
    setEditingRecord(null);
  };

  // セッション管理のハンドラー
  const handleReconnect = async () => {
    const success = await sessionActions.reconnectSession();
    if (success) {
      // 再接続成功後、データを再読み込み
      await appActions.refreshRecords();
    }
  };

  const handleExport = async () => {
    try {
      // 全データをエクスポート
      const result = await exportImportService.exportAllData();

      if (result.success && result.data) {
        // JSONファイルとしてダウンロード
        const blob = exportImportService.createDownloadBlob(result.data, 'application/json');
        const filename = `bite-note-backup-${new Date().toISOString().split('T')[0]}.json`;
        exportImportService.downloadFile(blob, filename);

        // 成功トースト表示
        useToastStore.getState().showSuccess(`${filename}をダウンロードしました`);

        // モーダルを閉じる
        sessionActions.hideSessionExpiredModal();
      } else {
        useToastStore.getState().showError(
          'データのエクスポートに失敗しました'
        );
      }
    } catch (error) {
      console.error('[App] Export error', error);
      useToastStore.getState().showError('データのエクスポート中にエラーが発生しました');
    }
  };

  useEffect(() => {
    // 全体的なエラーハンドリング
    const initializeApp = async () => {
      try {
        await testDatabase();
        await testStores();
        // E2Eテスト用: 初期化完了フラグを設定
        document.body.setAttribute('data-app-initialized', 'true');
      } catch (error) {
        setAppError(`アプリ初期化エラー: ${error instanceof Error ? error.message : String(error)}`);
        // エラー時もフラグを設定（エラー表示が出ている状態）
        document.body.setAttribute('data-app-initialized', 'error');
      }
    };

    // データベース接続テスト
    const testDatabase = async () => {
      try {
        const { db } = await import('./lib/database');
        await db.open();

        // 基本的な動作確認
        const allSettings = await db.app_settings.toArray();
        setDbStatus('success');
        setDbMessage(`データベース接続成功！設定データ: ${allSettings.length}件`);
      } catch (error) {
        setDbStatus('error');
        setDbMessage(`データベース接続エラー: ${error}`);
      }
    };

    // Zustand Store テスト
    const testStores = async () => {
      try {
        setStoreStatus('loading');

        // アプリストアの初期化
        await appActions.initialize();

        // フォームの基本テスト
        formActions.updateField('location', 'テスト場所');
        formActions.updateField('fishSpecies', 'テスト魚種');
        const validationResult = formActions.validateForm();

        setStoreStatus('success');
        setStoreMessage(
          `ストア正常動作！記録数: ${records.length}件, ` +
          `テーマ: ${settings.theme}, ` +
          `フォーム有効: ${validationResult.isValid ? 'Yes' : 'No'}`
        );
      } catch (error) {
        setStoreStatus('error');
        setStoreMessage(`ストアエラー: ${error}`);
      }
    };

    initializeApp();
  }, [appActions, formActions]); // records.length, settings.theme を削除（再レンダリングループ防止）

  // Phase 3-4: セッション管理の初期化
  useEffect(() => {
    // ストレージモードの初期化
    sessionActions.initializeStorageMode();

    // セッション管理を開始
    sessionActions.startSession();

    // クリーンアップ
    return () => {
      sessionActions.stopSession();
    };
  }, [sessionActions]);

  // Phase 3-2: グローバルストレージエラーハンドラー
  useEffect(() => {
    const handleStorageError = (error: Error | ErrorEvent) => {
      const errorObj = error instanceof Error ? error : error.error;

      // tech-lead指摘: より厳密なQuotaExceededError検出
      const isQuotaExceeded =
        errorObj?.name === 'QuotaExceededError' ||
        (errorObj instanceof DOMException && errorObj.code === 22) ||
        errorObj?.message?.includes('QuotaExceededError');

      if (isQuotaExceeded) {
        useToastStore.getState().showError(
          'ストレージが満杯です。アプリを再起動するか、不要なデータを削除してください。',
          [
            {
              label: 'データを管理',
              handler: () => {
                // Phase 3-3実装完了: データ管理画面へ遷移
                window.location.href = '/data-management';
              },
              primary: true
            }
          ]
        );
      }
    };

    // グローバルエラーハンドラー
    const handleError = (event: ErrorEvent) => {
      if (event.error) {
        handleStorageError(event.error);
      }
    };

    // Promise rejection ハンドラー
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error) {
        handleStorageError(event.reason);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // 型安全なTestIDsマッピング
  const TAB_TEST_IDS: Record<'form' | 'list' | 'debug', string> = {
    form: TestIds.FORM_TAB,
    list: TestIds.FISHING_RECORDS_LINK,
    debug: TestIds.DEBUG_TAB,
  } as const;

  const TabButton = ({ tab, label, emoji }: { tab: 'form' | 'list' | 'debug', label: string, emoji: string }) => (
    <Button
      variant={activeTab === tab ? 'primary' : 'text'}
      size="md"
      onClick={() => setActiveTab(tab)}
      data-testid={TAB_TEST_IDS[tab]}
      style={{
        borderRadius: '8px 8px 0 0',
        borderBottom: activeTab === tab ? `3px solid ${colors.primary[500]}` : '3px solid transparent',
        backgroundColor: activeTab === tab ? colors.primary[500] : 'transparent',
        color: activeTab === tab ? colors.text.inverse : colors.text.primary,
      }}
    >
      <span style={{ marginRight: '0.5rem' }}>{emoji}</span>
      {label}
    </Button>
  );

  // エラー表示
  if (appError) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: colors.semantic.error.light,
        minHeight: '100vh',
        fontFamily: typography.fontFamily.primary,
      }}>
        <h1 style={{
          ...textStyles.headline.large,
          color: colors.semantic.error.main,
          marginBottom: '1rem',
        }}>⚠️ アプリケーションエラー</h1>
        <p style={{
          ...textStyles.body.large,
          color: colors.semantic.error.dark,
          marginBottom: '2rem',
        }}>{appError}</p>
        <Button
          variant="danger"
          onClick={() => window.location.reload()}
        >
          再読み込み
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{
        minHeight: '100vh',
        fontFamily: typography.fontFamily.primary,
        backgroundColor: colors.background.primary,
        color: colors.text.primary,
      }}>
        {/* ヘッダー */}
        <div style={{
          backgroundColor: colors.primary[500],
          color: colors.text.inverse,
          padding: '1rem 2rem',
          boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15)',
        }}>
          <h1 style={{
            margin: 0,
            ...textStyles.headline.medium,
            color: colors.text.inverse,
          }}>🎣 釣果記録アプリ</h1>
        </div>

      {/* タブナビゲーション */}
      <div style={{
        backgroundColor: colors.surface.secondary,
        borderBottom: `1px solid ${colors.border.light}`,
        padding: '0 2rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <TabButton tab="form" label="記録登録" emoji="✏️" />
          <TabButton tab="list" label="写真で確認" emoji="📸" />
          <TabButton tab="debug" label="デバッグ" emoji="🔧" />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
        minHeight: 'calc(100vh - 180px)'
      }}>
        {activeTab === 'form' && (
          <div>
            <h2 style={{
              ...textStyles.headline.medium,
              color: colors.text.primary,
              marginBottom: '1.5rem',
            }}>✏️ 新しい釣果を記録</h2>
            <FishingRecordForm
              onSubmit={handleFormSubmit}
              isLoading={storeStatus === 'loading'}
            />
          </div>
        )}

        {activeTab === 'list' && (
          <div>
            <SimplePhotoList
              records={records}
              loading={storeStatus === 'loading'}
              error={error}
              onRecordClick={handleRecordClick}
              onRecordEdit={handleRecordEdit}
              onRecordDelete={handleRecordDelete}
              onDataRefresh={handleDataRefresh}
            />
          </div>
        )}

        {activeTab === 'debug' && (
          <div>
            <h2>🔧 デバッグ情報</h2>

            <div style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: dbStatus === 'success' ? '#d4edda' : dbStatus === 'error' ? '#f8d7da' : '#fff3cd',
              border: `1px solid ${dbStatus === 'success' ? '#c3e6cb' : dbStatus === 'error' ? '#f5c6cb' : '#ffeaa7'}`,
              marginBottom: '1rem'
            }}>
              <h3>データベース状態</h3>
              <p>
                {dbStatus === 'loading' && '⏳ データベース接続中...'}
                {dbStatus === 'success' && '✅ ' + dbMessage}
                {dbStatus === 'error' && '❌ ' + dbMessage}
              </p>
            </div>

            <div style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: storeStatus === 'success' ? '#d4edda' : storeStatus === 'error' ? '#f8d7da' : '#fff3cd',
              border: `1px solid ${storeStatus === 'success' ? '#c3e6cb' : storeStatus === 'error' ? '#f5c6cb' : '#ffeaa7'}`,
              marginBottom: '1rem'
            }}>
              <h3>Zustand Store状態</h3>
              <p>
                {storeStatus === 'loading' && '⏳ ストアテスト中...'}
                {storeStatus === 'success' && '✅ ' + storeMessage}
                {storeStatus === 'error' && '❌ ' + storeMessage}
              </p>
              {error && (
                <p style={{ color: '#dc3545', fontSize: '0.9em' }}>
                  エラー: {error}
                </p>
              )}
            </div>

            <div style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              marginBottom: '1rem'
            }}>
              <h3>フォーム状態テスト</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9em' }}>
                <div>
                  <strong>フォームデータ:</strong>
                  <pre style={{ fontSize: '0.8em', backgroundColor: '#fff', padding: '0.5rem', borderRadius: '4px' }}>
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </div>
                <div>
                  <strong>バリデーション:</strong>
                  <pre style={{ fontSize: '0.8em', backgroundColor: '#fff', padding: '0.5rem', borderRadius: '4px' }}>
                    {JSON.stringify(validation, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6'
            }}>
              <h3>開発進捗</h3>
              <ul>
                <li>✅ TASK-001: プロジェクトセットアップ</li>
                <li>✅ TASK-002: 型定義・インターフェース</li>
                <li>✅ TASK-003: IndexedDBセットアップ</li>
                <li>✅ TASK-101: 釣果記録データアクセスレイヤー</li>
                <li>✅ TASK-102: 写真データアクセスレイヤー</li>
                <li>✅ TASK-103: 位置情報・設定管理データアクセス層</li>
                <li>✅ TASK-201: Zustand Store実装</li>
                <li>✅ TASK-202: React Hook Form + Zod実装</li>
                <li>✅ TASK-301: フォーム入力UI実装</li>
                <li>✅ TASK-302: 記録一覧表示実装</li>
              </ul>
              <p style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                <strong>現在:</strong> 写真ベース記録一覧UI実装完了
              </p>

              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                border: '1px solid #ffeaa7'
              }}>
                <strong>📊 現在のデータ状況:</strong>
                <br />記録数: {records.length}件
                <br />記録詳細:
                <pre style={{ fontSize: '0.75rem', maxHeight: '200px', overflow: 'auto', backgroundColor: '#fff', padding: '0.5rem', marginTop: '0.5rem' }}>
                  {JSON.stringify(records, null, 2)}
                </pre>

                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={async () => {
                      try {
                        // テスト用のダミー画像作成
                        const canvas = document.createElement('canvas');
                        canvas.width = 400;
                        canvas.height = 300;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          // グラデーション背景
                          const gradient = ctx.createLinearGradient(0, 0, 400, 300);
                          gradient.addColorStop(0, '#87CEEB');
                          gradient.addColorStop(1, '#4682B4');
                          ctx.fillStyle = gradient;
                          ctx.fillRect(0, 0, 400, 300);

                          // 魚のシルエット
                          ctx.fillStyle = '#FFD700';
                          ctx.beginPath();
                          ctx.ellipse(200, 150, 80, 30, 0, 0, 2 * Math.PI);
                          ctx.fill();

                          // テキスト
                          ctx.fillStyle = '#000';
                          ctx.font = '20px Arial';
                          ctx.textAlign = 'center';
                          ctx.fillText('テスト釣果写真', 200, 100);
                          ctx.fillText('🐟', 200, 150);
                        }

                        canvas.toBlob(async (blob) => {
                          try {
                            if (blob) {
                              const file = new File([blob], 'test-fish.jpg', { type: 'image/jpeg' });

                              // 写真を保存
                              const photoResult = await photoService.savePhoto(file);

                              if (photoResult.success && photoResult.data) {

                                // テスト記録を作成
                                const testRecord = {
                                  date: new Date().toISOString().slice(0, 16),
                                  location: '山口県長門市テスト港',
                                  fishSpecies: 'テストアジ',
                                  size: 25,
                                  seaTemperature: 22.5,
                                  weather: '晴れ',
                                  notes: 'テスト用の釣果記録です。写真表示をテストするために作成されました。',
                                  photoId: photoResult.data.id,
                                  coordinates: {
                                    latitude: 34.4632,
                                    longitude: 131.0402,
                                    accuracy: 10
                                  }
                                };

                                await handleFormSubmit(testRecord as any);
                                alert('📸 テスト用写真付き記録を作成しました！「写真で確認」タブで確認してください。');
                              } else {
                                console.error('❌ 写真保存失敗:', photoResult.error);
                                alert('写真の保存に失敗しました: ' + photoResult.error?.message);
                              }
                            } else {
                              console.error('❌ Canvas Blob生成失敗');
                              alert('画像の生成に失敗しました');
                            }
                          } catch (error) {
                            console.error('💥 テスト記録作成エラー:', error);
                            alert('エラーが発生しました: ' + error);
                          }
                        }, 'image/jpeg', 0.8);
                      } catch (error) {
                        console.error('💥 テストボタンエラー:', error);
                        alert('テストボタンでエラーが発生しました: ' + error);
                      }
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    📸 テスト用写真付き記録を作成
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedRecord && (
        <FishingRecordDetail
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onEdit={handleRecordEdit}
          onDelete={handleRecordDelete}
        />
      )}

      {/* 編集モーダル */}
      {editingRecord && (
        <FishingRecordEditModal
          record={editingRecord}
          onClose={handleEditClose}
          onSave={handleEditSave}
          isLoading={storeStatus === 'loading'}
        />
      )}

      {/* 削除確認モーダル */}
      {deletingRecord && (
        <DeleteConfirmModal
          record={deletingRecord}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isLoading={isDeletingInProgress}
        />
      )}

      {/* セッション期限切れモーダル (Phase 3-4) */}
      {isSessionExpiredModalOpen && (
        <ReAuthPrompt
          unsavedCount={unsavedDataCount}
          onReconnect={handleReconnect}
          onExport={handleExport}
          onClose={() => sessionActions.hideSessionExpiredModal()}
          isReconnecting={sessionStatus === 'reconnecting'}
        />
      )}

        {/* PWAインストールプロンプト */}
        <PWAInstallPrompt />

        {/* PWA機能 */}
        <PWAUpdateNotification />
        <PWAInstallBanner />
      </div>

      {/* エラー表示システム */}
      <ErrorDisplay />

      {/* トースト通知システム */}
      <ToastContainer />
    </ErrorBoundary>
  )
}

export default App
