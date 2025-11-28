// 設定・カスタマイズモーダルコンポーネント

import React, { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAppStore, selectSettings, selectActions } from '../stores/app-store';
import type { AppSettings } from '../types';
import { logger } from '../lib/errors/logger';
import { Icon } from './ui/Icon';
import { colors, setTheme, getTheme, type ThemeMode } from '../theme/colors';
import {
  Settings,
  Palette,
  Save,
  Lock,
  Wrench,
  Globe,
  Calendar,
  Ruler,
  Target,
  Moon,
  Sun,
  RefreshCw,
  Eye,
  CalendarDays,
  Camera,
  MapPin,
  Bell,
  FileText,
  FolderOpen,
  FlaskConical,
  Info,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';

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
      return localSettings[key] !== settings[key];
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
    if (confirm('すべての記録を削除しますか？この操作は取り消せません。')) {
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

  type TabId = 'general' | 'display' | 'data' | 'privacy' | 'advanced';
  const tabs: Array<{ id: TabId; label: string; icon: ReactNode }> = [
    { id: 'general', label: '一般', icon: <Icon icon={Settings} size="sm" decorative /> },
    { id: 'display', label: '表示', icon: <Icon icon={Palette} size="sm" decorative /> },
    { id: 'data', label: 'データ', icon: <Icon icon={Save} size="sm" decorative /> },
    { id: 'privacy', label: 'プライバシー', icon: <Icon icon={Lock} size="sm" decorative /> },
    { id: 'advanced', label: '詳細', icon: <Icon icon={Wrench} size="sm" decorative /> }
  ];

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
        backgroundColor: 'var(--color-surface-primary)',
        borderRadius: '12px',
        width: '95%',
        maxWidth: '800px',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `1px solid ${'var(--color-border-light)'}`
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: `1px solid ${'var(--color-border-light)'}`
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Icon icon={Settings} size="md" decorative />
            設定
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {hasChanges && (
              <span style={{
                fontSize: '0.8rem',
                color: '#fbbf24',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
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
                color: 'var(--color-text-secondary)',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon icon={X} size={24} decorative />
            </button>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${'var(--color-border-light)'}`,
          overflowX: 'auto'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: activeTab === tab.id ? '#60a5fa' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--color-text-primary)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: activeTab === tab.id ? '3px solid #60a5fa' : '3px solid transparent'
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
          borderTop: `1px solid ${'var(--color-border-light)'}`,
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
            {isSaving ? <><Icon icon={Loader2} size="sm" className="animate-spin" decorative /> 保存中...</> : <><Icon icon={Save} size="sm" decorative /> 保存</>}
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
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Icon icon={Settings} size="sm" decorative />
      一般設定
    </h3>

    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* 言語設定 */}
      <SettingGroup title="言語" titleIcon={<Icon icon={Globe} size="sm" decorative />} description="アプリの表示言語を選択">
        <select
          value={settings.language}
          onChange={(e) => onSettingChange('language', e.target.value as 'ja' | 'en')}
          style={{
            padding: '0.5rem',
            border: `1px solid ${'var(--color-border-medium)'}`,
            borderRadius: '4px',
            fontSize: '0.9rem',
            backgroundColor: 'var(--color-surface-secondary)',
            color: 'var(--color-text-primary)'
          }}
        >
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
      </SettingGroup>

      {/* 日付形式 */}
      <SettingGroup title="日付形式" titleIcon={<Icon icon={Calendar} size="sm" decorative />} description="日付の表示形式を選択">
        <select
          value={settings.dateFormat}
          onChange={(e) => onSettingChange('dateFormat', e.target.value as 'YYYY/MM/DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY')}
          style={{
            padding: '0.5rem',
            border: `1px solid ${'var(--color-border-medium)'}`,
            borderRadius: '4px',
            fontSize: '0.9rem',
            backgroundColor: 'var(--color-surface-secondary)',
            color: 'var(--color-text-primary)'
          }}
        >
          <option value="YYYY/MM/DD">YYYY/MM/DD</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
        </select>
      </SettingGroup>

      {/* 単位設定 */}
      <SettingGroup title="単位設定" titleIcon={<Icon icon={Ruler} size="sm" decorative />} description="測定単位を選択">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ minWidth: '80px', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>気温:</label>
            <select
              value={settings.temperatureUnit}
              onChange={(e) => onSettingChange('temperatureUnit', e.target.value as 'celsius' | 'fahrenheit')}
              style={{
                padding: '0.5rem',
                border: `1px solid ${'var(--color-border-medium)'}`,
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)'
              }}
            >
              <option value="celsius">摂氏 (°C)</option>
              <option value="fahrenheit">華氏 (°F)</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ minWidth: '80px', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>サイズ:</label>
            <select
              value={settings.sizeUnit}
              onChange={(e) => onSettingChange('sizeUnit', e.target.value as 'cm' | 'inch')}
              style={{
                padding: '0.5rem',
                border: `1px solid ${'var(--color-border-medium)'}`,
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)'
              }}
            >
              <option value="cm">センチメートル (cm)</option>
              <option value="inch">インチ (inch)</option>
            </select>
          </div>
        </div>
      </SettingGroup>

      {/* デフォルト値 */}
      <SettingGroup title="デフォルト値" titleIcon={<Icon icon={Target} size="sm" decorative />} description="新規記録作成時のデフォルト値">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
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
                border: `1px solid ${'var(--color-border-medium)'}`,
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
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
                border: `1px solid ${'var(--color-border-medium)'}`,
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)'
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
}> = ({ settings, onSettingChange }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(getTheme());

  const handleThemeToggle = useCallback(() => {
    const newTheme: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    setTheme(newTheme);
    // 設定にも保存（将来的な同期用）
    onSettingChange('theme', newTheme);
  }, [currentTheme, onSettingChange]);

  return (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Icon icon={Palette} size="sm" decorative />
      表示設定
    </h3>

    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* テーマ設定 */}
      <SettingGroup title="テーマ" titleIcon={<Icon icon={Moon} size="sm" decorative />} description="アプリの外観テーマを切り替え">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Icon icon={Sun} size={20} style={{ color: currentTheme === 'light' ? '#fbbf24' : 'var(--color-text-tertiary)' }} />
          <button
            onClick={handleThemeToggle}
            role="switch"
            aria-checked={currentTheme === 'dark'}
            aria-label={`テーマ切り替え: 現在${currentTheme === 'dark' ? 'ダーク' : 'ライト'}モード`}
            style={{
              position: 'relative',
              width: '56px',
              height: '28px',
              backgroundColor: currentTheme === 'dark' ? '#3b82f6' : '#e2e8f0',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              padding: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: currentTheme === 'dark' ? '30px' : '2px',
                width: '24px',
                height: '24px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: 'left 0.3s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            />
          </button>
          <Icon icon={Moon} size={20} style={{ color: currentTheme === 'dark' ? '#60a5fa' : 'var(--color-text-tertiary)' }} />
          <span style={{
            marginLeft: '0.5rem',
            fontSize: '0.9rem',
            color: 'var(--color-text-primary)',
            fontWeight: 500
          }}>
            {currentTheme === 'dark' ? 'ダークモード' : 'ライトモード'}
          </span>
        </div>
      </SettingGroup>

      {/* 表示オプション */}
      <SettingGroup title="表示オプション" titleIcon={<Icon icon={Eye} size="sm" decorative />} description="画面表示に関する設定">
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
};

// データタブ
const DataTab: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Icon icon={Save} size="sm" decorative />
      データ設定
    </h3>

    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* 自動保存 */}
      <SettingGroup title="自動保存" titleIcon={<Icon icon={Save} size="sm" decorative />} description="データの自動保存設定">
        <ToggleSetting
          label="自動保存を有効にする"
          description="入力内容を自動的に保存"
          checked={settings.autoSave}
          onChange={(checked) => onSettingChange('autoSave', checked)}
        />
      </SettingGroup>

      {/* エクスポート形式 */}
      <SettingGroup title="エクスポート形式" titleIcon={<Icon icon={FileText} size="sm" decorative />} description="デフォルトのエクスポート形式">
        <select
          value={settings.exportFormat}
          onChange={(e) => onSettingChange('exportFormat', e.target.value as 'json' | 'csv')}
          style={{
            padding: '0.5rem',
            border: `1px solid ${'var(--color-border-medium)'}`,
            borderRadius: '4px',
            fontSize: '0.9rem',
            backgroundColor: 'var(--color-surface-secondary)',
            color: 'var(--color-text-primary)'
          }}
        >
          <option value="json">JSON (完全データ)</option>
          <option value="csv">CSV (記録のみ)</option>
        </select>
      </SettingGroup>

      {/* データ保持期間 */}
      <SettingGroup title="データ保持期間" titleIcon={<Icon icon={CalendarDays} size="sm" decorative />} description="データを保持する期間（日数）">
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
              border: `1px solid ${'var(--color-border-medium)'}`,
              borderRadius: '4px',
              fontSize: '0.9rem',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)'
            }}
          />
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>日間</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
          0を設定すると無期限で保持されます
        </div>
      </SettingGroup>

      {/* 写真設定 */}
      <SettingGroup title="写真設定" titleIcon={<Icon icon={Camera} size="sm" decorative />} description="写真の保存に関する設定">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
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
                border: `1px solid ${'var(--color-border-medium)'}`,
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
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
                border: `1px solid ${'var(--color-border-medium)'}`,
                borderRadius: '4px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)'
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
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Icon icon={Lock} size="sm" decorative />
      プライバシー設定
    </h3>

    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* 位置情報 */}
      <SettingGroup title="位置情報" titleIcon={<Icon icon={MapPin} size="sm" decorative />} description="GPS位置情報の利用設定">
        <ToggleSetting
          label="自動位置取得を有効にする"
          description="記録作成時に現在位置を自動取得"
          checked={settings.autoLocation}
          onChange={(checked) => onSettingChange('autoLocation', checked)}
        />
      </SettingGroup>

      {/* 通知設定 */}
      <SettingGroup title="通知" titleIcon={<Icon icon={Bell} size="sm" decorative />} description="アプリからの通知設定">
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
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
        borderRadius: '6px',
        border: '1px solid rgba(96, 165, 250, 0.3)'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon icon={FileText} size="sm" decorative />
          データの取り扱いについて
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#93c5fd' }}>
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
    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Icon icon={Wrench} size="sm" decorative />
      詳細設定
    </h3>

    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* アプリ情報 */}
      <SettingGroup title="アプリ情報" titleIcon={<Icon icon={Info} size="sm" decorative />} description="アプリケーションの詳細情報">
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface-tertiary)',
          borderRadius: '6px',
          fontSize: '0.9rem',
          color: 'var(--color-text-primary)'
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
      <SettingGroup title="データ管理" titleIcon={<Icon icon={FolderOpen} size="sm" decorative />} description="データの管理とメンテナンス">
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
            <Icon icon={RefreshCw} size="sm" decorative /> 設定をリセット
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
            <Icon icon={Trash2} size="sm" decorative /> すべてのデータを削除
          </button>
        </div>
      </SettingGroup>

      {/* 実験的機能 */}
      <SettingGroup title="実験的機能" titleIcon={<Icon icon={FlaskConical} size="sm" decorative />} description="開発中の新機能（注意して使用）">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{
            padding: '1rem',
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            borderRadius: '6px',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            fontSize: '0.85rem',
            color: '#fbbf24'
          }}>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon icon={AlertTriangle} size={14} decorative /> 注意:</strong> 実験的機能は予期しない動作をする可能性があります。
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
  titleIcon?: ReactNode;
  description: string;
  children: React.ReactNode;
}> = ({ title, titleIcon, description, children }) => (
  <div style={{
    padding: '1rem',
    backgroundColor: 'var(--color-surface-secondary)',
    borderRadius: '8px',
    border: `1px solid ${'var(--color-border-light)'}`
  }}>
    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {titleIcon}
      {title}
    </h4>
    <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
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
    backgroundColor: checked ? 'rgba(96, 165, 250, 0.2)' : 'transparent'
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
      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
        {description}
      </div>
    </div>
  </label>
);