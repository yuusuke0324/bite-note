// 設定・カスタマイズモーダルコンポーネント

import React, { useState, useCallback, useEffect } from 'react';
import { useAppStore, selectSettings, selectActions } from '../stores/app-store';
import type { AppSettings } from '../types';
import { logger } from '../lib/errors/logger';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isVisible,
  onClose
}) => {
  const settings = useAppStore(selectSettings);
  const { updateSettings } = useAppStore(selectActions);

  // ローカル設定状態
  const [localSettings, setLocalSettings] = useState<AppSettings>({
    theme: settings.theme,
    language: settings.language,
    dateFormat: settings.dateFormat,
    temperatureUnit: settings.temperatureUnit,
    sizeUnit: settings.sizeUnit,
    defaultSort: settings.defaultSort,
    defaultUseGPS: settings.defaultUseGPS,
    autoSave: settings.autoSave,
    enableNotifications: settings.enableNotifications,
    dataRetention: settings.dataRetention,
    exportFormat: settings.exportFormat,
    defaultLocation: settings.defaultLocation || '',
    defaultSpecies: settings.defaultSpecies || '',
    showTutorial: settings.showTutorial,
    compactView: settings.compactView,
    showWeatherInfo: settings.showWeatherInfo,
    autoLocation: settings.autoLocation,
    imageQuality: settings.imageQuality,
    maxImageSize: settings.maxImageSize,
    maxPhotoSize: settings.maxPhotoSize
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'display' | 'data' | 'privacy' | 'advanced'>('general');

  // 設定変更の検出
  useEffect(() => {
    const changed = (Object.keys(localSettings) as Array<keyof AppSettings>).some(key => {
      return (localSettings as any)[key] !== (settings as any)[key];
    });
    setHasChanges(changed);
  }, [localSettings, settings]);

  // 設定の更新
  const handleSettingChange = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // 設定の保存
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateSettings(localSettings);
      setHasChanges(false);
    } catch (error) {
      logger.error('Failed to save settings', { error });
      alert('設定の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }, [localSettings, updateSettings]);

  // 設定のリセット
  const handleReset = useCallback(() => {
    if (confirm('すべての設定をデフォルトに戻しますか？')) {
      const defaultSettings: AppSettings = {
        theme: 'light' as const,
        language: 'ja' as const,
        dateFormat: 'YYYY/MM/DD' as const,
        temperatureUnit: 'celsius' as const,
        sizeUnit: 'cm' as const,
        defaultSort: 'date' as const,
        defaultUseGPS: true,
        autoSave: true,
        enableNotifications: true,
        dataRetention: 365,
        exportFormat: 'json' as const,
        defaultLocation: '',
        defaultSpecies: '',
        showTutorial: true,
        compactView: false,
        showWeatherInfo: true,
        autoLocation: true,
        imageQuality: 0.8,
        maxImageSize: 10,
        maxPhotoSize: 5
      };
      setLocalSettings(defaultSettings);
    }
  }, []);

  // データのクリア
  const handleClearData = useCallback(async () => {
    if (confirm('すべての釣果記録を削除しますか？この操作は取り消せません。')) {
      if (confirm('本当によろしいですか？すべてのデータが失われます。')) {
        try {
          // データクリア処理（実装は後で行う）
          alert('データのクリア機能は実装中です。');
        } catch (error) {
          logger.error('Failed to clear data', { error });
          alert('データのクリアに失敗しました。');
        }
      }
    }
  }, []);

  if (!isVisible) return null;

  const tabs = [
    { id: 'general', label: '一般', icon: '⚙️' },
    { id: 'display', label: '表示', icon: '🎨' },
    { id: 'data', label: 'データ', icon: '💾' },
    { id: 'privacy', label: 'プライバシー', icon: '🔒' },
    { id: 'advanced', label: '詳細', icon: '🔧' }
  ] as const;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '95%',
        maxWidth: '800px',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid #dee2e6'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#333'
          }}>
            ⚙️ 設定
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {hasChanges && (
              <span style={{
                fontSize: '0.8rem',
                color: '#ffc107',
                padding: '0.25rem 0.5rem',
                backgroundColor: '#fff3cd',
                borderRadius: '4px'
              }}>
                未保存の変更があります
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5rem',
                color: '#6c757d',
                padding: '0.25rem'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #dee2e6',
          overflowX: 'auto'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#333',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: activeTab === tab.id ? '3px solid #007bff' : '3px solid transparent'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツエリア */}
        <div style={{
          flex: 1,
          padding: '1.5rem',
          overflow: 'auto'
        }}>
          {activeTab === 'general' && (
            <GeneralTab
              settings={localSettings}
              onSettingChange={handleSettingChange}
            />
          )}
          {activeTab === 'display' && (
            <DisplayTab
              settings={localSettings}
              onSettingChange={handleSettingChange}
            />
          )}
          {activeTab === 'data' && (
            <DataTab
              settings={localSettings}
              onSettingChange={handleSettingChange}
            />
          )}
          {activeTab === 'privacy' && (
            <PrivacyTab
              settings={localSettings}
              onSettingChange={handleSettingChange}
            />
          )}
          {activeTab === 'advanced' && (
            <AdvancedTab
              settings={localSettings}
              onSettingChange={handleSettingChange}
              onClearData={handleClearData}
              onReset={handleReset}
            />
          )}
        </div>

        {/* フッター */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: isSaving ? 0.6 : 1
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: !hasChanges || isSaving ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !hasChanges || isSaving ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isSaving ? '⏳ 保存中...' : '💾 保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 一般タブ
const GeneralTab: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>⚙️ 一般設定</h3>

    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* 言語設定 */}
      <SettingGroup title="🌐 言語" description="アプリの表示言語を選択">
        <select
          value={settings.language}
          onChange={(e) => onSettingChange('language', e.target.value as 'ja' | 'en')}
          style={{
            padding: '0.5rem',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
      </SettingGroup>

      {/* 日付形式 */}
      <SettingGroup title="📅 日付形式" description="日付の表示形式を選択">
        <select
          value={settings.dateFormat}
          onChange={(e) => onSettingChange('dateFormat', e.target.value as 'YYYY/MM/DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY')}
          style={{
            padding: '0.5rem',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          <option value="YYYY/MM/DD">YYYY/MM/DD</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
        </select>
      </SettingGroup>

      {/* 単位設定 */}
      <SettingGroup title="📏 単位設定" description="測定単位を選択">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ minWidth: '80px', fontSize: '0.9rem' }}>気温:</label>
            <select
              value={settings.temperatureUnit}
              onChange={(e) => onSettingChange('temperatureUnit', e.target.value as 'celsius' | 'fahrenheit')}
              style={{
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            >
              <option value="celsius">摂氏 (°C)</option>
              <option value="fahrenheit">華氏 (°F)</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ minWidth: '80px', fontSize: '0.9rem' }}>サイズ:</label>
            <select
              value={settings.sizeUnit}
              onChange={(e) => onSettingChange('sizeUnit', e.target.value as 'cm' | 'inch')}
              style={{
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            >
              <option value="cm">センチメートル (cm)</option>
              <option value="inch">インチ (inch)</option>
            </select>
          </div>
        </div>
      </SettingGroup>

      {/* デフォルト値 */}
      <SettingGroup title="🎯 デフォルト値" description="新規記録作成時のデフォルト値">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              デフォルト釣り場:
            </label>
            <input
              type="text"
              value={settings.defaultLocation}
              onChange={(e) => onSettingChange('defaultLocation', e.target.value)}
              placeholder="よく行く釣り場を入力..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              デフォルト魚種:
            </label>
            <input
              type="text"
              value={settings.defaultSpecies}
              onChange={(e) => onSettingChange('defaultSpecies', e.target.value)}
              placeholder="よく釣る魚種を入力..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>
      </SettingGroup>
    </div>
  </div>
);

// 表示タブ
const DisplayTab: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>🎨 表示設定</h3>

    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* テーマ設定 */}
      <SettingGroup title="🌙 テーマ" description="アプリの外観テーマを選択">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { value: 'light', label: 'ライト', icon: '☀️' },
            { value: 'dark', label: 'ダーク', icon: '🌙' },
            { value: 'auto', label: '自動', icon: '🔄' }
          ].map(theme => (
            <button
              key={theme.value}
              onClick={() => onSettingChange('theme', theme.value as 'light' | 'dark' | 'auto')}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: settings.theme === theme.value ? '#007bff' : '#f8f9fa',
                color: settings.theme === theme.value ? 'white' : '#333',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {theme.icon} {theme.label}
            </button>
          ))}
        </div>
      </SettingGroup>

      {/* 表示オプション */}
      <SettingGroup title="👁️ 表示オプション" description="画面表示に関する設定">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <ToggleSetting
            label="コンパクト表示"
            description="記録カードをコンパクトに表示"
            checked={settings.compactView}
            onChange={(checked) => onSettingChange('compactView', checked)}
          />
          <ToggleSetting
            label="天気情報を表示"
            description="記録に天気情報を表示"
            checked={settings.showWeatherInfo}
            onChange={(checked) => onSettingChange('showWeatherInfo', checked)}
          />
          <ToggleSetting
            label="チュートリアルを表示"
            description="初回利用時のガイドを表示"
            checked={settings.showTutorial}
            onChange={(checked) => onSettingChange('showTutorial', checked)}
          />
        </div>
      </SettingGroup>
    </div>
  </div>
);

// データタブ
const DataTab: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>💾 データ設定</h3>

    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* 自動保存 */}
      <SettingGroup title="💾 自動保存" description="データの自動保存設定">
        <ToggleSetting
          label="自動保存を有効にする"
          description="入力内容を自動的に保存"
          checked={settings.autoSave}
          onChange={(checked) => onSettingChange('autoSave', checked)}
        />
      </SettingGroup>

      {/* エクスポート形式 */}
      <SettingGroup title="📤 エクスポート形式" description="デフォルトのエクスポート形式">
        <select
          value={settings.exportFormat}
          onChange={(e) => onSettingChange('exportFormat', e.target.value as 'json' | 'csv')}
          style={{
            padding: '0.5rem',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          <option value="json">JSON (完全データ)</option>
          <option value="csv">CSV (記録のみ)</option>
        </select>
      </SettingGroup>

      {/* データ保持期間 */}
      <SettingGroup title="🗓️ データ保持期間" description="データを保持する期間（日数）">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number"
            value={settings.dataRetention}
            onChange={(e) => onSettingChange('dataRetention', Number(e.target.value))}
            min="30"
            max="3650"
            style={{
              width: '100px',
              padding: '0.5rem',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          />
          <span style={{ fontSize: '0.9rem', color: '#666' }}>日間</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
          0を設定すると無期限で保持されます
        </div>
      </SettingGroup>

      {/* 写真設定 */}
      <SettingGroup title="📷 写真設定" description="写真の保存に関する設定">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              最大ファイルサイズ (MB):
            </label>
            <input
              type="number"
              value={settings.maxPhotoSize}
              onChange={(e) => onSettingChange('maxPhotoSize', Number(e.target.value))}
              min="1"
              max="50"
              style={{
                width: '100px',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              画質 (0.1 - 1.0):
            </label>
            <input
              type="number"
              value={settings.imageQuality}
              onChange={(e) => onSettingChange('imageQuality', Number(e.target.value))}
              min="0.1"
              max="1.0"
              step="0.1"
              style={{
                width: '100px',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>
      </SettingGroup>
    </div>
  </div>
);

// プライバシータブ
const PrivacyTab: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>🔒 プライバシー設定</h3>

    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* 位置情報 */}
      <SettingGroup title="📍 位置情報" description="GPS位置情報の利用設定">
        <ToggleSetting
          label="自動位置取得を有効にする"
          description="記録作成時に現在位置を自動取得"
          checked={settings.autoLocation}
          onChange={(checked) => onSettingChange('autoLocation', checked)}
        />
      </SettingGroup>

      {/* 通知設定 */}
      <SettingGroup title="🔔 通知" description="アプリからの通知設定">
        <ToggleSetting
          label="通知を有効にする"
          description="重要な更新やリマインダーを受け取る"
          checked={settings.enableNotifications}
          onChange={(checked) => onSettingChange('enableNotifications', checked)}
        />
      </SettingGroup>

      {/* データの取り扱い */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#e3f2fd',
        borderRadius: '6px',
        border: '1px solid #90caf9'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>📋 データの取り扱いについて</h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#1976d2' }}>
          <li>すべてのデータはお使いのデバイス内にのみ保存されます</li>
          <li>外部サーバーにデータが送信されることはありません</li>
          <li>位置情報は記録の精度向上のためにのみ使用されます</li>
          <li>アプリのアンインストール時にすべてのデータが削除されます</li>
        </ul>
      </div>
    </div>
  </div>
);

// 詳細タブ
const AdvancedTab: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onClearData: () => void;
  onReset: () => void;
}> = ({ onClearData, onReset }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>🔧 詳細設定</h3>

    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* アプリ情報 */}
      <SettingGroup title="ℹ️ アプリ情報" description="アプリケーションの詳細情報">
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '0.9rem'
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>バージョン:</strong> 1.0.0
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>ビルド:</strong> {new Date().toISOString().split('T')[0]}
          </div>
          <div>
            <strong>開発者:</strong> Fishing App Team
          </div>
        </div>
      </SettingGroup>

      {/* データ管理 */}
      <SettingGroup title="🗂️ データ管理" description="データの管理とメンテナンス">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <button
            onClick={onReset}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#ffc107',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🔄 設定をリセット
          </button>
          <button
            onClick={onClearData}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🗑️ すべてのデータを削除
          </button>
        </div>
      </SettingGroup>

      {/* 実験的機能 */}
      <SettingGroup title="🧪 実験的機能" description="開発中の新機能（注意して使用）">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#fff3cd',
            borderRadius: '6px',
            border: '1px solid #ffeaa7',
            fontSize: '0.85rem',
            color: '#856404'
          }}>
            <strong>⚠️ 注意:</strong> 実験的機能は予期しない動作をする可能性があります。
            重要なデータは事前にバックアップを取ることをお勧めします。
          </div>
        </div>
      </SettingGroup>
    </div>
  </div>
);

// 設定グループコンポーネント
const SettingGroup: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div style={{
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #dee2e6'
  }}>
    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: '#333' }}>
      {title}
    </h4>
    <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#666' }}>
      {description}
    </p>
    {children}
  </div>
);

// トグル設定コンポーネント
const ToggleSetting: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <label style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '4px',
    backgroundColor: checked ? '#e3f2fd' : 'transparent'
  }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{
        width: '18px',
        height: '18px'
      }}
    />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#666' }}>
        {description}
      </div>
    </div>
  </label>
);