/**
 * useTheme Hook - Theme Management
 *
 * @description
 * ライト/ダークテーマの状態を管理するカスタムフック。
 * body.light-themeクラスの有無でテーマを判定し、
 * MutationObserverでテーマ変更を監視する。
 *
 * @version 1.0.0
 * @since 2025-11-30 Issue #321
 */

import { useState, useEffect, useCallback } from 'react';
import { getTheme, setTheme } from '../theme/colors';
import type { ThemeMode } from '../theme/colors';

export interface UseThemeReturn {
  /** 現在ダークモードかどうか */
  isDark: boolean;
  /** 現在のテーマ（'light' | 'dark'） */
  theme: ThemeMode;
  /** テーマを切り替える関数 */
  toggleTheme: () => void;
  /** 特定のテーマに設定する関数 */
  setThemeMode: (mode: ThemeMode) => void;
}

/**
 * テーマ管理フック
 *
 * @example
 * ```tsx
 * const { isDark, theme, toggleTheme } = useTheme();
 *
 * return (
 *   <div className={isDark ? 'dark' : 'light'}>
 *     <button onClick={toggleTheme}>
 *       {theme === 'dark' ? 'Light' : 'Dark'}
 *     </button>
 *   </div>
 * );
 * ```
 */
export function useTheme(): UseThemeReturn {
  const [isDark, setIsDark] = useState(() => {
    // 初期値: body.light-themeクラスの有無で判定
    if (typeof document !== 'undefined') {
      return !document.body.classList.contains('light-theme');
    }
    // SSR環境ではlocalStorageから取得
    return getTheme() === 'dark';
  });

  useEffect(() => {
    // テーマ変更を監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDark(!document.body.classList.contains('light-theme'));
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    // 初期状態を同期
    setIsDark(!document.body.classList.contains('light-theme'));

    return () => observer.disconnect();
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme: ThemeMode = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    setIsDark(!isDark);
  }, [isDark]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setTheme(mode);
    setIsDark(mode === 'dark');
  }, []);

  return {
    isDark,
    theme: isDark ? 'dark' : 'light',
    toggleTheme,
    setThemeMode,
  };
}
