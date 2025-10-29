// Modern Typography System
// システムフォントベースの2024年対応タイポグラフィ

export const typography = {
  // Font Families
  fontFamily: {
    primary: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(', '),
    monospace: [
      'ui-monospace',
      '"SF Mono"',
      'Monaco',
      '"Cascadia Code"',
      '"Segoe UI Mono"',
      '"Roboto Mono"',
      '"Oxygen Mono"',
      '"Ubuntu Monospace"',
      'monospace',
    ].join(', '),
  },

  // Font Sizes (1.25倍スケール - Perfect Fourth)
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
  },

  // Font Weights
  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  // Line Heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// Predefined Text Styles
export const textStyles = {
  // Display text (大見出し)
  display: {
    large: {
      fontSize: typography.fontSize['6xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.tight,
    },
    medium: {
      fontSize: typography.fontSize['5xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.tight,
    },
    small: {
      fontSize: typography.fontSize['4xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.normal,
    },
  },

  // Headline text (見出し)
  headline: {
    large: {
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.normal,
    },
    medium: {
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.snug,
      letterSpacing: typography.letterSpacing.normal,
    },
    small: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.snug,
      letterSpacing: typography.letterSpacing.normal,
    },
  },

  // Title text (タイトル)
  title: {
    large: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.snug,
      letterSpacing: typography.letterSpacing.normal,
    },
    medium: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.normal,
    },
    small: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.normal,
    },
  },

  // Body text (本文)
  body: {
    large: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.relaxed,
      letterSpacing: typography.letterSpacing.normal,
    },
    medium: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.normal,
    },
    small: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.normal,
    },
  },

  // Label text (ラベル)
  label: {
    large: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.wide,
    },
    medium: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.wide,
    },
    small: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.wider,
    },
  },
} as const;

// CSS Variables
export const typographyCssVariables = {
  '--font-family-primary': typography.fontFamily.primary,
  '--font-family-monospace': typography.fontFamily.monospace,

  '--font-size-xs': typography.fontSize.xs,
  '--font-size-sm': typography.fontSize.sm,
  '--font-size-base': typography.fontSize.base,
  '--font-size-lg': typography.fontSize.lg,
  '--font-size-xl': typography.fontSize.xl,
  '--font-size-2xl': typography.fontSize['2xl'],
  '--font-size-3xl': typography.fontSize['3xl'],

  '--font-weight-normal': typography.fontWeight.normal.toString(),
  '--font-weight-medium': typography.fontWeight.medium.toString(),
  '--font-weight-semibold': typography.fontWeight.semibold.toString(),
  '--font-weight-bold': typography.fontWeight.bold.toString(),

  '--line-height-tight': typography.lineHeight.tight.toString(),
  '--line-height-normal': typography.lineHeight.normal.toString(),
  '--line-height-relaxed': typography.lineHeight.relaxed.toString(),
} as const;

// Helper function for creating text styles
export const createTextStyle = (style: keyof typeof textStyles, variant: string) => {
  const textStyle = textStyles[style];
  if (!textStyle || !textStyle[variant as keyof typeof textStyle]) {
    return {};
  }

  return textStyle[variant as keyof typeof textStyle];
};

// Responsive typography helpers
export const responsiveTextSize = {
  // Mobile First approach
  mobile: {
    display: typography.fontSize['3xl'],
    headline: typography.fontSize['2xl'],
    title: typography.fontSize.lg,
    body: typography.fontSize.base,
    caption: typography.fontSize.sm,
  },
  tablet: {
    display: typography.fontSize['4xl'],
    headline: typography.fontSize['3xl'],
    title: typography.fontSize.xl,
    body: typography.fontSize.lg,
    caption: typography.fontSize.base,
  },
  desktop: {
    display: typography.fontSize['5xl'],
    headline: typography.fontSize['4xl'],
    title: typography.fontSize['2xl'],
    body: typography.fontSize.xl,
    caption: typography.fontSize.lg,
  },
} as const;

// Utility functions
export const getTextStyle = (category: keyof typeof textStyles, size: string) => {
  const categoryStyles = textStyles[category];
  if (categoryStyles && size in categoryStyles) {
    return categoryStyles[size as keyof typeof categoryStyles];
  }
  return {};
};

// Japanese-specific adjustments
export const japaneseTypography = {
  // 日本語に適したライン高さ
  lineHeight: {
    tight: 1.4,
    normal: 1.6,
    relaxed: 1.8,
  },
  // 日本語に適した文字間隔
  letterSpacing: {
    normal: '0.02em',
    wide: '0.08em',
  },
} as const;