// Modern Color System based on Google Material Design 3
// 2024年のモダンカラーパレット

export const colors = {
  // Primary Colors (Google Blue)
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

  // Secondary Colors (Google Green)
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

  // Surface Colors
  surface: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F1F3F4',
    variant: '#E8EAED',
    disabled: '#DADCE0',
    hover: '#F1F5F9',
  },

  // Background Colors
  background: {
    primary: '#FAFBFC',
    secondary: '#F8F9FA',
    tertiary: '#F1F3F4',
  },

  // Text Colors
  text: {
    primary: '#202124',
    secondary: '#5F6368',
    tertiary: '#80868B',
    disabled: '#9AA0A6',
    inverse: '#FFFFFF',
  },

  // Border Colors
  border: {
    light: '#E8EAED',
    medium: '#DADCE0',
    dark: '#BDC1C6',
    focus: '#1A73E8',
  },

  // Status Colors
  status: {
    success: '#34A853',
    warning: '#FBBC04',
    error: '#EA4335',
    info: '#4285F4',
  },

  // Accent Color (釣り関連)
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

  // Semantic Colors
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
} as const;

// CSS Variables for runtime theme switching
export const cssVariables = {
  '--color-primary': colors.primary[500],
  '--color-primary-light': colors.primary[100],
  '--color-primary-dark': colors.primary[700],

  '--color-secondary': colors.secondary[500],
  '--color-secondary-light': colors.secondary[100],
  '--color-secondary-dark': colors.secondary[700],

  '--color-surface': colors.surface.primary,
  '--color-surface-variant': colors.surface.secondary,
  '--color-background': colors.background.primary,

  '--color-text-primary': colors.text.primary,
  '--color-text-secondary': colors.text.secondary,
  '--color-text-disabled': colors.text.disabled,

  '--color-border': colors.border.light,
  '--color-border-focus': colors.border.focus,

  '--color-accent': colors.accent[500],

  '--color-success': colors.semantic.success.main,
  '--color-warning': colors.semantic.warning.main,
  '--color-error': colors.semantic.error.main,
  '--color-info': colors.semantic.info.main,
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

// Dark mode colors (future implementation)
export const darkColors = {
  surface: {
    primary: '#121212',
    secondary: '#1E1E1E',
    tertiary: '#232323',
    variant: '#2D2D2D',
    disabled: '#3C3C3C',
  },
  background: {
    primary: '#000000',
    secondary: '#121212',
    tertiary: '#1E1E1E',
  },
  text: {
    primary: '#E8EAED',
    secondary: '#9AA0A6',
    tertiary: '#80868B',
    disabled: '#5F6368',
    inverse: '#202124',
  },
  border: {
    light: '#3C4043',
    medium: '#5F6368',
    dark: '#80868B',
    focus: '#8AB4F8',
  },
} as const;