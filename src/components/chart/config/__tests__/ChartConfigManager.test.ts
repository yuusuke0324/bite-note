/**
 * ChartConfigManager テストスイート
 * TASK-103: ChartConfigManager実装
 *
 * Red Phase: 失敗テストケース実装
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ChartConfigManager } from '../ChartConfigManager';
import type { DeviceType, ColorConfig, A11yConfig } from '../types';

// テストヘルパー関数
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

const mockViewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
};

describe('ChartConfigManager', () => {
  let manager: ChartConfigManager;

  beforeEach(() => {
    manager = new ChartConfigManager();
  });

  // A. デバイス設定テスト (5個)
  describe('Device Configuration Tests', () => {
    test('should return correct mobile configuration', () => {
      const config = manager.getDeviceConfig('mobile');
      expect(config.containerSize.minWidth).toBe(320);
      expect(config.containerSize.minHeight).toBe(240);
      expect(config.containerSize.aspectRatio).toBe(2);
      expect(config.touch.enabled).toBe(true);
      expect(config.touch.minimumTargetSize).toBe(44);
    });

    test('should return correct tablet configuration', () => {
      const config = manager.getDeviceConfig('tablet');
      expect(config.containerSize.minWidth).toBe(600);
      expect(config.containerSize.minHeight).toBe(400);
      expect(config.containerSize.aspectRatio).toBe(1.5);
      expect(config.touch.enabled).toBe(true);
      expect(config.responsive.scalingFactor).toBe(1.2);
    });

    test('should return correct desktop configuration', () => {
      const config = manager.getDeviceConfig('desktop');
      expect(config.containerSize.minWidth).toBe(800);
      expect(config.containerSize.minHeight).toBe(500);
      expect(config.containerSize.aspectRatio).toBe(1.6);
      expect(config.touch.enabled).toBe(false);
      expect(config.responsive.scalingFactor).toBe(1.0);
    });

    test('should handle invalid device type', () => {
      expect(() => {
        manager.getDeviceConfig('invalid' as DeviceType);
      }).toThrow('Invalid device type: invalid');

      const config = manager.getDeviceConfig(undefined as any);
      expect(config.containerSize.minWidth).toBe(800);
    });

    test('should correctly identify device types from viewport width', () => {
      expect(manager.detectDeviceType(320)).toBe('mobile');
      expect(manager.detectDeviceType(768)).toBe('tablet');
      expect(manager.detectDeviceType(1024)).toBe('desktop');
    });
  });

  // B. 色設定テスト (4個)
  describe('Color Configuration Tests', () => {
    test('should return default color configuration', () => {
      const config = manager.getColorConfig();
      expect(config.primary).toBe('#2563eb');
      expect(config.secondary).toBe('#dc2626');
      expect(config.background).toBe('#ffffff');
      expect(config.grid).toBe('#e5e7eb');
      expect(config.text).toBe('#374151');
      expect(config.accent).toBe('#059669');
    });

    test('should apply custom color overrides', () => {
      const customColors = {
        primary: '#ff0000',
        background: '#000000'
      };
      const config = manager.getColorConfig({ overrides: customColors });
      expect(config.primary).toBe('#ff0000');
      expect(config.background).toBe('#000000');
      expect(config.secondary).toBe('#dc2626'); // unchanged
    });

    test('should return high contrast colors when enabled', () => {
      const config = manager.getColorConfig({ highContrast: true });
      expect(config.primary).toBe('#000000');
      expect(config.secondary).toBe('#ff0000');
      expect(config.background).toBe('#ffffff');
      expect(config.text).toBe('#000000');

      const contrastRatio = calculateContrastRatio(config.text, config.background);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });

    test('should handle invalid color values with fallback', () => {
      const invalidColors = {
        primary: 'invalid-color',
        secondary: '#gggggg'
      };
      const config = manager.getColorConfig({ overrides: invalidColors });
      expect(config.primary).toBe('#2563eb'); // fallback to default
      expect(config.secondary).toBe('#dc2626'); // fallback to default

      const validColors = {
        primary: '#ff0000',
        secondary: '#FF0000',
        background: '#f00'
      };
      const validConfig = manager.getColorConfig({ overrides: validColors });
      expect(validConfig.primary).toBe('#ff0000');
      expect(validConfig.secondary).toBe('#FF0000');
      expect(validConfig.background).toBe('#ff0000'); // normalized from #f00
    });
  });

  // C. フォント設定テスト (3個)
  describe('Font Configuration Tests', () => {
    test('should return correct font sizes for different devices', () => {
      const mobileConfig = manager.getFontConfig('mobile');
      expect(mobileConfig.size.small).toBe(12);
      expect(mobileConfig.size.medium).toBe(14);
      expect(mobileConfig.size.large).toBe(16);

      const desktopConfig = manager.getFontConfig('desktop');
      expect(desktopConfig.size.small).toBe(14);
      expect(desktopConfig.size.medium).toBe(16);
      expect(desktopConfig.size.large).toBe(20);
    });

    test('should return system font stack in correct order', () => {
      const config = manager.getFontConfig();
      expect(config.family).toEqual([
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'sans-serif'
      ]);

      const customConfig = manager.getFontConfig('desktop', {
        familyOverride: ['Roboto', 'Arial', 'sans-serif']
      });
      expect(customConfig.family[0]).toBe('Roboto');
    });

    test('should return correct font weights and line height', () => {
      const config = manager.getFontConfig();
      expect(config.weight.normal).toBe(400);
      expect(config.weight.bold).toBe(700);
      expect(config.lineHeight).toBe(1.5);
      expect(config.lineHeight).toBeGreaterThanOrEqual(1.4);
      expect(config.lineHeight).toBeLessThanOrEqual(1.6);
    });
  });

  // D. 設定マージテスト (3個)
  describe('Configuration Merge Tests', () => {
    test('should merge base and override configurations', () => {
      const base = {
        colors: { primary: '#blue', secondary: '#red' },
        fonts: { size: 14 }
      };
      const override = {
        colors: { primary: '#green' },
        margin: { top: 20 }
      };

      const result = manager.mergeConfigs(base, override);
      expect(result.colors.primary).toBe('#green');
      expect(result.colors.secondary).toBe('#red');
      expect(result.fonts.size).toBe(14);
      expect(result.margin.top).toBe(20);
    });

    test('should handle partial configuration override', () => {
      const base = manager.getDefaultConfig();
      const override = {
        colors: { primary: '#custom' }
      };

      const result = manager.mergeConfigs(base, override);
      expect(result.colors.primary).toBe('#custom');
      expect(result.colors.background).toBe(base.colors.background);
      expect(result.fonts).toEqual(base.fonts);
    });

    test('should handle deeply nested configuration merge', () => {
      const base = {
        accessibility: {
          highContrast: { enabled: false, colors: { primary: '#000' } },
          colorBlindness: { type: 'none', enabled: false }
        }
      };
      const override = {
        accessibility: {
          highContrast: { enabled: true }
        }
      };

      const result = manager.mergeConfigs(base, override);
      expect(result.accessibility.highContrast.enabled).toBe(true);
      expect(result.accessibility.highContrast.colors.primary).toBe('#000');
      expect(result.accessibility.colorBlindness.type).toBe('none');
    });
  });

  // E. アクセシビリティテスト (3個)
  describe('Accessibility Tests', () => {
    test('should meet WCAG AA contrast requirements', () => {
      const a11yConfig = manager.getA11yConfig({ highContrast: true });
      const textBackground = calculateContrastRatio(a11yConfig.textColor!, a11yConfig.backgroundColor!);
      const largeTextBackground = calculateContrastRatio(a11yConfig.largeTextColor!, a11yConfig.backgroundColor!);

      expect(textBackground).toBeGreaterThanOrEqual(4.5);
      expect(largeTextBackground).toBeGreaterThanOrEqual(3.0);

      const config = manager.getColorConfig({ primary: '#808080', background: '#ffffff' });
      const contrastRatio = calculateContrastRatio(config.primary, config.background);

      if (contrastRatio < 4.5) {
        const adjustedConfig = manager.adjustForContrast(config);
        const newRatio = calculateContrastRatio(adjustedConfig.primary, adjustedConfig.background);
        expect(newRatio).toBeGreaterThanOrEqual(4.5);
      }
    });

    test('should provide pattern alternatives for color-coded information', () => {
      const a11yConfig = manager.getA11yConfig({
        colorBlindness: { type: 'protanopia', patternEnabled: true }
      });

      expect(a11yConfig.colorBlindness.patternEnabled).toBe(true);
      expect(a11yConfig.colorBlindness.shapeMarkers).toBe(true);

      const protanopia = manager.getA11yConfig({ colorBlindness: { type: 'protanopia' } });
      const deuteranopia = manager.getA11yConfig({ colorBlindness: { type: 'deuteranopia' } });

      expect(protanopia.colorBlindness.colorAdjustments).toBeDefined();
      expect(deuteranopia.colorBlindness.colorAdjustments).toBeDefined();
      expect(protanopia.colorBlindness.colorAdjustments).not.toEqual(deuteranopia.colorBlindness.colorAdjustments);
    });

    test('should provide visible focus indicators', () => {
      const a11yConfig = manager.getA11yConfig({ focusVisible: true });

      expect(a11yConfig.focus.visible).toBe(true);
      expect(a11yConfig.focus.color).toBeDefined();
      expect(a11yConfig.focus.width).toBeGreaterThanOrEqual(2);
      expect(a11yConfig.focus.style).toBe('solid');

      const reducedMotionConfig = manager.getA11yConfig({ reducedMotion: true });
      expect(reducedMotionConfig.reducedMotion.enabled).toBe(true);
      expect(reducedMotionConfig.reducedMotion.animationDuration).toBe(0);
    });
  });

  // F. 設定変更テスト (2個)
  describe('Configuration Update Tests', () => {
    test('should immediately reflect configuration changes', () => {
      const initialConfig = manager.getCurrentConfig();
      expect(initialConfig.colors.primary).toBe('#2563eb');

      manager.updateConfig({ colors: { primary: '#ff0000' } });
      const updatedConfig = manager.getCurrentConfig();
      expect(updatedConfig.colors.primary).toBe('#ff0000');

      const mockListener = vi.fn();
      manager.onConfigChange(mockListener);

      manager.updateConfig({ colors: { primary: '#ff0000' } });
      expect(mockListener).toHaveBeenCalledWith({
        type: 'colors',
        changes: { primary: '#ff0000' }
      });
    });

    test('should validate and handle invalid configurations', () => {
      const invalidConfig = {
        colors: { primary: 'invalid-color' },
        fonts: { size: { small: -5 } }
      };

      manager.updateConfig(invalidConfig);
      const config = manager.getCurrentConfig();

      expect(config.colors.primary).toBe('#2563eb'); // default
      expect(config.fonts.size.small).toBe(12); // default mobile small

      const validationResult = manager.validateConfig({
        colors: { primary: '#ff0000' },
        fonts: { size: { small: 12 } }
      });

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      const invalidValidation = manager.validateConfig({
        colors: { primary: 'not-a-color' }
      });

      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });
  });

  // パフォーマンステスト (2個)
  describe('Performance Tests', () => {
    test('should retrieve configuration within 5ms', () => {
      const start = performance.now();
      const config = manager.getDeviceConfig('desktop');
      const end = performance.now();

      expect(end - start).toBeLessThan(5);
      expect(config).toBeDefined();

      const baseConfig = manager.getDefaultConfig();
      const override = { colors: { primary: '#ff0000' } };

      const mergeStart = performance.now();
      const result = manager.mergeConfigs(baseConfig, override);
      const mergeEnd = performance.now();

      expect(mergeEnd - mergeStart).toBeLessThan(10);
      expect(result.colors.primary).toBe('#ff0000');
    });

    test('should not create memory leaks with multiple config retrievals', () => {
      const initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;

      // 大量の設定取得を実行
      for (let i = 0; i < 1000; i++) {
        manager.getDeviceConfig('desktop');
        manager.getColorConfig();
        manager.getFontConfig();
      }

      if (global.gc) global.gc(); // Force garbage collection if available
      const finalMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024); // Less than 2MB (more realistic for test environment)
    });
  });
});