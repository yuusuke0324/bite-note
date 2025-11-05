/**
 * TASK-001: Responsive Utilities Tests
 *
 * レスポンシブユーティリティ関数のテストケース
 */

import {
  detectDeviceType,
  calculateHeightFromAspectRatio,
  calculateSVGDimensions,
  createResponsiveConfig,
  generateResponsiveCSS
} from '../../utils/responsive';

describe('responsive utilities', () => {
  describe('detectDeviceType', () => {
    it('should return mobile for width < 768', () => {
      expect(detectDeviceType(767)).toBe('mobile');
      expect(detectDeviceType(320)).toBe('mobile');
      expect(detectDeviceType(0)).toBe('mobile');
    });

    it('should return tablet for width 768-1023', () => {
      expect(detectDeviceType(768)).toBe('tablet');
      expect(detectDeviceType(1023)).toBe('tablet');
      expect(detectDeviceType(900)).toBe('tablet');
    });

    it('should return desktop for width >= 1024', () => {
      expect(detectDeviceType(1024)).toBe('desktop');
      expect(detectDeviceType(1920)).toBe('desktop');
      expect(detectDeviceType(2560)).toBe('desktop');
    });
  });

  describe('calculateHeightFromAspectRatio', () => {
    it('should calculate height from width and aspect ratio', () => {
      expect(calculateHeightFromAspectRatio(800, 16/9)).toBeCloseTo(450, 0);
      expect(calculateHeightFromAspectRatio(1200, 16/9)).toBeCloseTo(675, 0);
      expect(calculateHeightFromAspectRatio(400, 4/3)).toBeCloseTo(300, 0);
    });

    it('should handle edge cases', () => {
      // ゼロアスペクト比の場合はデフォルト16:9を使用
      expect(calculateHeightFromAspectRatio(800, 0)).toBeCloseTo(450, 0);

      // 負のアスペクト比の場合もデフォルト16:9を使用
      expect(calculateHeightFromAspectRatio(800, -1)).toBeCloseTo(450, 0);
    });

    it('should return integer values', () => {
      const height = calculateHeightFromAspectRatio(800, 16/9);
      expect(height).toBe(Math.floor(height));
    });
  });

  describe('calculateSVGDimensions', () => {
    it('should calculate correct dimensions for mobile', () => {
      const dimensions = calculateSVGDimensions({
        containerWidth: 375,
        aspectRatio: 16/9,
        deviceType: 'mobile'
      });

      // 実装では軸ラベル表示のため最小幅600pxを強制
      expect(dimensions.containerWidth).toBe(375);
      expect(dimensions.viewBoxWidth).toBe(600); // minWidth enforced
      expect(dimensions.viewBoxHeight).toBeCloseTo(337, 1); // 600 / (16/9) = 337.5
      expect(dimensions.containerHeight).toBeCloseTo(210, 1); // container size based on actual 375px
      expect(dimensions.scaleFactor).toBe(1);
    });

    it('should respect maximum width constraints', () => {
      const dimensions = calculateSVGDimensions({
        containerWidth: 2000,
        aspectRatio: 16/9,
        deviceType: 'desktop',
        maxWidth: 1200
      });

      expect(dimensions.viewBoxWidth).toBe(1200);
      expect(dimensions.containerWidth).toBe(1200);
    });

    it('should enforce minimum width of 600px', () => {
      const dimensions = calculateSVGDimensions({
        containerWidth: 280,
        aspectRatio: 16/9,
        deviceType: 'mobile'
      });

      // 軸ラベル表示のため最小幅600px
      expect(dimensions.viewBoxWidth).toBe(600);
      expect(dimensions.containerWidth).toBe(280); // 実際のコンテナサイズは保持
    });

    it('should maintain aspect ratio', () => {
      const aspectRatio = 16/9;
      const dimensions = calculateSVGDimensions({
        containerWidth: 800,
        aspectRatio,
        deviceType: 'tablet'
      });

      const calculatedRatio = dimensions.viewBoxWidth / dimensions.viewBoxHeight;
      expect(calculatedRatio).toBeCloseTo(aspectRatio, 2);
    });

    it('should handle zero and negative container widths', () => {
      const dimensionsZero = calculateSVGDimensions({
        containerWidth: 0,
        aspectRatio: 16/9,
        deviceType: 'mobile'
      });

      expect(dimensionsZero.viewBoxWidth).toBe(600); // 最小幅

      const dimensionsNegative = calculateSVGDimensions({
        containerWidth: -100,
        aspectRatio: 16/9,
        deviceType: 'mobile'
      });

      expect(dimensionsNegative.viewBoxWidth).toBe(600); // 最小幅
    });

    it('should use default aspect ratio for invalid values', () => {
      const dimensions = calculateSVGDimensions({
        containerWidth: 800,
        aspectRatio: 0,
        deviceType: 'tablet'
      });

      // デフォルトの16:9アスペクト比が使用される
      expect(dimensions.viewBoxHeight).toBeCloseTo(800 / (16/9), 0);
    });
  });

  describe('createResponsiveConfig', () => {
    it('should create default responsive config', () => {
      const config = createResponsiveConfig();

      // 軸ラベル表示に適したアスペクト比2.0を使用
      expect(config).toEqual({
        responsive: true,
        maxWidth: '100%',
        aspectRatio: 2.0, // changed from 1.5 for axis labels
        breakpoints: {
          mobile: 480,
          tablet: 768,
          desktop: 1024
        },
        preventHorizontalScroll: true
      });
    });

    it('should allow overrides', () => {
      const config = createResponsiveConfig({
        aspectRatio: 4/3,
        maxWidth: '1200px',
        breakpoints: {
          mobile: 320,
          tablet: 768,
          desktop: 1200
        }
      });

      expect(config.aspectRatio).toBe(4/3);
      expect(config.maxWidth).toBe('1200px');
      expect(config.breakpoints.mobile).toBe(320);
      expect(config.breakpoints.desktop).toBe(1200);
      // デフォルト値が保持される
      expect(config.responsive).toBe(true);
      expect(config.preventHorizontalScroll).toBe(true);
    });
  });

  describe('generateResponsiveCSS', () => {
    it('should generate basic responsive CSS', () => {
      const config = createResponsiveConfig({
        maxWidth: '100%',
        preventHorizontalScroll: true
      });

      const css = generateResponsiveCSS(config);

      expect(css).toContain('width: 100%');
      expect(css).toContain('max-width: 100%');
      expect(css).toContain('height: auto');
      expect(css).toContain('overflow-x: hidden');
      expect(css).toContain('box-sizing: border-box');
    });

    it('should include media queries for breakpoints', () => {
      const config = createResponsiveConfig({
        breakpoints: {
          mobile: 480,
          tablet: 768,
          desktop: 1024
        }
      });

      const css = generateResponsiveCSS(config);

      expect(css).toContain('@media (min-width: 480px)');
      expect(css).toContain('@media (min-width: 768px)');
      expect(css).toContain('@media (min-width: 1024px)');
    });

    it('should conditionally include overflow-x when preventHorizontalScroll is false', () => {
      const config = createResponsiveConfig({
        preventHorizontalScroll: false
      });

      const css = generateResponsiveCSS(config);

      expect(css).not.toContain('overflow-x: hidden');
      expect(css).not.toContain('box-sizing: border-box');
    });
  });

  describe('integration scenarios', () => {
    it('should work together for complete responsive calculation', () => {
      // シナリオ: モバイルデバイスでの表示
      const containerWidth = 375;
      const deviceType = detectDeviceType(containerWidth);
      expect(deviceType).toBe('mobile');

      const config = createResponsiveConfig();
      const dimensions = calculateSVGDimensions({
        containerWidth,
        aspectRatio: config.aspectRatio,
        deviceType
      });

      // 軸ラベル表示のため最小幅600pxが強制される
      expect(dimensions.containerWidth).toBe(375);
      expect(dimensions.viewBoxWidth).toBe(600); // minWidth enforced
      expect(dimensions.containerHeight).toBeCloseTo(187, 1); // 375 / 2.0 = 187.5

      const css = generateResponsiveCSS(config);
      expect(css).toContain('max-width: 100%');
      expect(css).toContain('overflow-x: hidden');
    });

    it('should handle extreme mobile case (very small screen)', () => {
      const containerWidth = 280; // iPhone SE未満
      const deviceType = detectDeviceType(containerWidth);
      expect(deviceType).toBe('mobile');

      const dimensions = calculateSVGDimensions({
        containerWidth,
        aspectRatio: 16/9,
        deviceType
      });

      // 軸ラベル表示のため最小幅600pxが適用される
      expect(dimensions.viewBoxWidth).toBe(600);
      expect(dimensions.containerWidth).toBe(280); // 実際のコンテナは小さいまま
    });

    it('should handle desktop case with max width constraint', () => {
      const containerWidth = 1920; // フルHD
      const deviceType = detectDeviceType(containerWidth);
      expect(deviceType).toBe('desktop');

      const dimensions = calculateSVGDimensions({
        containerWidth,
        aspectRatio: 16/9,
        deviceType,
        maxWidth: 1200 // 最大幅制限
      });

      expect(dimensions.viewBoxWidth).toBe(1200);
      expect(dimensions.containerWidth).toBe(1200);
      expect(dimensions.viewBoxHeight).toBeCloseTo(675, 0);
    });
  });
});