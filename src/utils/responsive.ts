/**
 * TASK-001: Responsive Design Utilities
 *
 * レスポンシブデザインに必要なユーティリティ関数群
 */

export interface DynamicSVGDimensions {
  containerWidth: number;
  containerHeight: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  scaleFactor: number;
}

export interface ResponsiveGraphConfig {
  responsive: boolean;
  maxWidth: string;
  aspectRatio: number;
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  preventHorizontalScroll: boolean;
}

export interface SVGCalculationOptions {
  containerWidth: number;
  aspectRatio: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  maxWidth?: number;
}

/**
 * デバイス種別を幅から判定
 */
export const detectDeviceType = (width: number): 'mobile' | 'tablet' | 'desktop' => {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/**
 * アスペクト比から高さを計算
 */
export const calculateHeightFromAspectRatio = (width: number, aspectRatio: number): number => {
  if (aspectRatio <= 0) return width / (16/9); // デフォルトアスペクト比
  return Math.floor(width / aspectRatio);
};

/**
 * SVG寸法を動的に計算
 */
export const calculateSVGDimensions = (options: SVGCalculationOptions): DynamicSVGDimensions => {
  const {
    containerWidth,
    aspectRatio = 16/9,
    maxWidth
  } = options;

  // 軸ラベル表示に必要な最小幅
  const minWidth = 600;
  let viewBoxWidth = Math.max(containerWidth, minWidth);

  // 最大幅の制限
  if (maxWidth && viewBoxWidth > maxWidth) {
    viewBoxWidth = maxWidth;
  }

  // 不正な値のチェック
  if (viewBoxWidth <= 0) viewBoxWidth = 600;

  // アスペクト比から高さを計算
  const viewBoxHeight = calculateHeightFromAspectRatio(viewBoxWidth, aspectRatio);

  // コンテナサイズ（実際の表示サイズ）
  const containerHeight = calculateHeightFromAspectRatio(
    Math.min(containerWidth, viewBoxWidth),
    aspectRatio
  );

  // スケール係数（将来的な拡張用）
  const scaleFactor = 1;

  return {
    containerWidth: Math.min(containerWidth, viewBoxWidth),
    containerHeight,
    viewBoxWidth,
    viewBoxHeight,
    scaleFactor
  };
};

/**
 * デフォルトレスポンシブ設定を作成
 */
export const createResponsiveConfig = (overrides?: Partial<ResponsiveGraphConfig>): ResponsiveGraphConfig => {
  return {
    responsive: true,
    maxWidth: '100%',
    aspectRatio: 2.0, // 軸ラベル表示に適したアスペクト比（1.5 → 2.0）
    breakpoints: {
      mobile: 480,
      tablet: 768,
      desktop: 1024
    },
    preventHorizontalScroll: true,
    ...overrides
  };
};

/**
 * レスポンシブCSS生成
 */
export const generateResponsiveCSS = (config: ResponsiveGraphConfig): string => {
  const { maxWidth, preventHorizontalScroll, breakpoints } = config;

  let css = `
    width: 100%;
    max-width: ${maxWidth};
    height: auto;
  `;

  if (preventHorizontalScroll) {
    css += `
      overflow-x: hidden;
      box-sizing: border-box;
    `;
  }

  // メディアクエリの生成
  if (breakpoints.mobile) {
    css += `
      @media (min-width: ${breakpoints.mobile}px) {
        /* Mobile styles */
      }
    `;
  }

  if (breakpoints.tablet) {
    css += `
      @media (min-width: ${breakpoints.tablet}px) {
        /* Tablet styles */
      }
    `;
  }

  if (breakpoints.desktop) {
    css += `
      @media (min-width: ${breakpoints.desktop}px) {
        /* Desktop styles */
      }
    `;
  }

  return css;
};