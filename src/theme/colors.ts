// Modern Color System based on Google Material Design 3
// 2024年のモダンカラーパレット
// CSS変数を使用してテーマ切り替えに対応

export const colors = {
  // Primary Colors (Google Blue) - 静的カラー
  primary: {
    50: '#E8F0FE',
    100: '#D2E3FC',
    200: '#AECBFA',
    300: '#8AB4F8',
    400: '#669DF6',
    500: '#1A73E8', // メインプライマリ
    600: '#1557B0',
    700: '#0F4C81',
    800: '#0A3A5C',
    900: '#06263D',
  },

  // Secondary Colors (Google Green) - 静的カラー
  secondary: {
    50: '#E8F5E8',
    100: '#CEEAD6',
    200: '#A8DAB5',
    300: '#81C995',
    400: '#5BB974',
    500: '#34A853', // メインセカンダリ
    600: '#2D8E47',
    700: '#26743A',
    800: '#1E5A2E',
    900: '#174021',
  },

  // Surface Colors - CSS変数でテーマ対応
  surface: {
    primary: 'var(--color-surface-primary)',
    secondary: 'var(--color-surface-secondary)',
    tertiary: 'var(--color-surface-tertiary)',
    variant: 'var(--color-surface-primary)',
    disabled: '#64748b',
    hover: 'var(--color-surface-hover)',
  },

  // Background Colors - CSS変数でテーマ対応
  background: {
    primary: 'var(--color-background-primary)',
    secondary: 'var(--color-background-secondary)',
    tertiary: 'var(--color-background-tertiary)',
  },

  // Text Colors - CSS変数でテーマ対応
  text: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    tertiary: 'var(--color-text-tertiary)',
    disabled: 'var(--color-text-disabled)',
    inverse: 'var(--color-text-inverse)',
  },

  // Border Colors - CSS変数でテーマ対応
  border: {
    light: 'var(--color-border-light)',
    medium: 'var(--color-border-medium)',
    dark: 'var(--color-border-dark)',
    focus: 'var(--color-border-focus)',
  },

  // Status Colors - 静的カラー（テーマに依存しない）
  status: {
    success: '#34A853',
    warning: '#FBBC04',
    error: '#EA4335',
    info: '#4285F4',
  },

  // Accent Color (釣り関連) - 静的カラー
  accent: {
    50: '#FFF4F1',
    100: '#FFE8E1',
    200: '#FFD1C2',
    300: '#FFBA9F',
    400: '#FF9D7A',
    500: '#FF6B35', // メインアクセント（オレンジ）
    600: '#E55A2B',
    700: '#CC4A21',
    800: '#B23B17',
    900: '#992C0D',
  },

  // Semantic Colors - 静的カラー
  semantic: {
    // 成功（魚が釣れた）
    success: {
      light: '#E8F5E8',
      main: '#34A853',
      dark: '#174021',
      contrastText: '#FFFFFF',
    },
    // 警告（天気注意など）
    warning: {
      light: '#FEF7E0',
      main: '#FBBC04',
      dark: '#B7860D',
      contrastText: '#202124',
    },
    // エラー（記録失敗など）
    error: {
      light: '#FCE8E6',
      main: '#EA4335',
      dark: '#B52D20',
      contrastText: '#FFFFFF',
    },
    // 情報（天気・潮汐など）
    info: {
      light: '#E8F0FE',
      main: '#4285F4',
      dark: '#0B57D0',
      contrastText: '#FFFFFF',
    },
  },

  // ハイライトカード専用 - CSS変数でテーマ対応
  highlight: {
    bg: 'var(--color-highlight-bg)',
    border: 'var(--color-highlight-border)',
    text: 'var(--color-text-primary)',
    textSecondary: 'var(--color-text-secondary)',
    gradient: 'var(--color-highlight-gradient)',
  },

  // チャート専用カラー - CSS変数でテーマ対応
  chart: {
    axis: 'var(--color-chart-axis)',
    grid: 'var(--color-chart-grid)',
    primary: 'var(--color-chart-primary)',
    secondary: 'var(--color-chart-secondary)',
    label: 'var(--color-chart-label)',
    tooltip: {
      bg: 'var(--color-chart-tooltip-bg)',
      border: 'var(--color-border-focus)',
      text: 'var(--color-text-primary)',
    },
  },
} as const;

// Helper functions
export const getColor = (path: string) => {
  const keys = path.split('.');
  let result: any = colors;

  for (const key of keys) {
    result = result[key];
    if (!result) return undefined;
  }

  return result;
};

// Opacity helper
export const withOpacity = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// テーマタイプ
export type ThemeMode = 'light' | 'dark';

// テーマ切り替えユーティリティ
export const setTheme = (theme: ThemeMode) => {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  localStorage.setItem('bite-note-theme', theme);
};

// 現在のテーマを取得
export const getTheme = (): ThemeMode => {
  const saved = localStorage.getItem('bite-note-theme') as ThemeMode | null;
  return saved || 'dark';
};

// 初期化時にテーマを適用
export const initializeTheme = () => {
  const theme = getTheme();
  setTheme(theme);
  return theme;
};
