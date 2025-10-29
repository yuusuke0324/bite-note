# TASK-103: ChartConfigManager実装 - テストケース設計

## テスト戦略

### テスト構成
- **単体テスト**: 15個（機能別詳細テスト）
- **統合テスト**: 5個（コンポーネント間連携テスト）
- **総テスト数**: 20個

### テスト分類
1. **デバイス設定テスト** (5個)
2. **色設定テスト** (4個)
3. **フォント設定テスト** (3個)
4. **設定マージテスト** (3個)
5. **アクセシビリティテスト** (3個)
6. **設定変更テスト** (2個)

## 🧪 詳細テストケース

### A. デバイス設定テスト (5個)

#### A01: モバイル設定取得テスト
```typescript
describe('getDeviceConfig - Mobile', () => {
  test('should return correct mobile configuration', () => {
    const config = manager.getDeviceConfig('mobile');
    expect(config.containerSize.minWidth).toBe(320);
    expect(config.containerSize.minHeight).toBe(240);
    expect(config.containerSize.aspectRatio).toBe(2);
    expect(config.touch.enabled).toBe(true);
    expect(config.touch.minimumTargetSize).toBe(44);
  });
});
```

#### A02: タブレット設定取得テスト
```typescript
describe('getDeviceConfig - Tablet', () => {
  test('should return correct tablet configuration', () => {
    const config = manager.getDeviceConfig('tablet');
    expect(config.containerSize.minWidth).toBe(600);
    expect(config.containerSize.minHeight).toBe(400);
    expect(config.containerSize.aspectRatio).toBe(1.5);
    expect(config.touch.enabled).toBe(true);
    expect(config.responsive.scalingFactor).toBe(1.2);
  });
});
```

#### A03: デスクトップ設定取得テスト
```typescript
describe('getDeviceConfig - Desktop', () => {
  test('should return correct desktop configuration', () => {
    const config = manager.getDeviceConfig('desktop');
    expect(config.containerSize.minWidth).toBe(800);
    expect(config.containerSize.minHeight).toBe(500);
    expect(config.containerSize.aspectRatio).toBe(1.6);
    expect(config.touch.enabled).toBe(false);
    expect(config.responsive.scalingFactor).toBe(1.0);
  });
});
```

#### A04: 無効デバイスタイプ処理テスト
```typescript
describe('getDeviceConfig - Invalid Device', () => {
  test('should throw error for invalid device type', () => {
    expect(() => {
      manager.getDeviceConfig('invalid' as DeviceType);
    }).toThrow('Invalid device type: invalid');
  });

  test('should fallback to desktop for undefined device', () => {
    const config = manager.getDeviceConfig(undefined as any);
    expect(config.containerSize.minWidth).toBe(800);
  });
});
```

#### A05: ブレークポイント判定テスト
```typescript
describe('Device Breakpoint Detection', () => {
  test('should correctly identify device types from viewport width', () => {
    expect(manager.detectDeviceType(320)).toBe('mobile');
    expect(manager.detectDeviceType(768)).toBe('tablet');
    expect(manager.detectDeviceType(1024)).toBe('desktop');
  });
});
```

### B. 色設定テスト (4個)

#### B01: デフォルト色設定取得テスト
```typescript
describe('getColorConfig - Default', () => {
  test('should return default color configuration', () => {
    const config = manager.getColorConfig();
    expect(config.primary).toBe('#2563eb');
    expect(config.secondary).toBe('#dc2626');
    expect(config.background).toBe('#ffffff');
    expect(config.grid).toBe('#e5e7eb');
    expect(config.text).toBe('#374151');
    expect(config.accent).toBe('#059669');
  });
});
```

#### B02: カスタム色設定適用テスト
```typescript
describe('getColorConfig - Custom Colors', () => {
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
});
```

#### B03: ハイコントラスト色変換テスト
```typescript
describe('getColorConfig - High Contrast', () => {
  test('should return high contrast colors when enabled', () => {
    const config = manager.getColorConfig({ highContrast: true });
    expect(config.primary).toBe('#000000');
    expect(config.secondary).toBe('#ff0000');
    expect(config.background).toBe('#ffffff');
    expect(config.text).toBe('#000000');
  });

  test('should maintain contrast ratio >= 4.5:1', () => {
    const config = manager.getColorConfig({ highContrast: true });
    const contrastRatio = calculateContrastRatio(config.text, config.background);
    expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
  });
});
```

#### B04: 無効色値フォールバックテスト
```typescript
describe('Color Validation and Fallback', () => {
  test('should fallback to default for invalid hex colors', () => {
    const invalidColors = {
      primary: 'invalid-color',
      secondary: '#gggggg'
    };
    const config = manager.getColorConfig({ overrides: invalidColors });
    expect(config.primary).toBe('#2563eb'); // fallback to default
    expect(config.secondary).toBe('#dc2626'); // fallback to default
  });

  test('should accept various valid color formats', () => {
    const validColors = {
      primary: '#ff0000',
      secondary: '#FF0000',
      background: '#f00'
    };
    const config = manager.getColorConfig({ overrides: validColors });
    expect(config.primary).toBe('#ff0000');
    expect(config.secondary).toBe('#FF0000');
    expect(config.background).toBe('#ff0000'); // normalized from #f00
  });
});
```

### C. フォント設定テスト (3個)

#### C01: デバイス別フォントサイズ取得テスト
```typescript
describe('getFontConfig - Device Specific', () => {
  test('should return correct font sizes for mobile', () => {
    const config = manager.getFontConfig('mobile');
    expect(config.size.small).toBe(12);
    expect(config.size.medium).toBe(14);
    expect(config.size.large).toBe(16);
  });

  test('should return correct font sizes for desktop', () => {
    const config = manager.getFontConfig('desktop');
    expect(config.size.small).toBe(14);
    expect(config.size.medium).toBe(16);
    expect(config.size.large).toBe(20);
  });
});
```

#### C02: フォントファミリー優先順位テスト
```typescript
describe('Font Family Configuration', () => {
  test('should return system font stack in correct order', () => {
    const config = manager.getFontConfig();
    expect(config.family).toEqual([
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'sans-serif'
    ]);
  });

  test('should allow custom font family override', () => {
    const config = manager.getFontConfig('desktop', {
      familyOverride: ['Roboto', 'Arial', 'sans-serif']
    });
    expect(config.family[0]).toBe('Roboto');
  });
});
```

#### C03: 行間・ウェイト設定確認テスト
```typescript
describe('Font Weight and Line Height', () => {
  test('should return correct font weights', () => {
    const config = manager.getFontConfig();
    expect(config.weight.normal).toBe(400);
    expect(config.weight.bold).toBe(700);
  });

  test('should return optimal line height', () => {
    const config = manager.getFontConfig();
    expect(config.lineHeight).toBe(1.5);
    expect(config.lineHeight).toBeGreaterThanOrEqual(1.4);
    expect(config.lineHeight).toBeLessThanOrEqual(1.6);
  });
});
```

### D. 設定マージテスト (3個)

#### D01: 基本設定マージ機能テスト
```typescript
describe('mergeConfigs - Basic Functionality', () => {
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
});
```

#### D02: 部分設定上書きテスト
```typescript
describe('mergeConfigs - Partial Override', () => {
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
});
```

#### D03: ネストされた設定マージテスト
```typescript
describe('mergeConfigs - Nested Configuration', () => {
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
```

### E. アクセシビリティテスト (3個)

#### E01: WCAG コントラスト比確認テスト
```typescript
describe('Accessibility - WCAG Contrast', () => {
  test('should meet WCAG AA contrast requirements', () => {
    const a11yConfig = manager.getA11yConfig({ highContrast: true });
    const textBackground = calculateContrastRatio(a11yConfig.textColor, a11yConfig.backgroundColor);
    const largeTextBackground = calculateContrastRatio(a11yConfig.largeTextColor, a11yConfig.backgroundColor);

    expect(textBackground).toBeGreaterThanOrEqual(4.5);
    expect(largeTextBackground).toBeGreaterThanOrEqual(3.0);
  });

  test('should provide alternative for insufficient contrast', () => {
    const config = manager.getColorConfig({ primary: '#808080', background: '#ffffff' });
    const contrastRatio = calculateContrastRatio(config.primary, config.background);

    if (contrastRatio < 4.5) {
      const adjustedConfig = manager.adjustForContrast(config);
      const newRatio = calculateContrastRatio(adjustedConfig.primary, adjustedConfig.background);
      expect(newRatio).toBeGreaterThanOrEqual(4.5);
    }
  });
});
```

#### E02: 色覚多様性対応確認テスト
```typescript
describe('Accessibility - Color Blindness Support', () => {
  test('should provide pattern alternatives for color-coded information', () => {
    const a11yConfig = manager.getA11yConfig({
      colorBlindness: { type: 'protanopia', patternEnabled: true }
    });

    expect(a11yConfig.colorBlindness.patternEnabled).toBe(true);
    expect(a11yConfig.colorBlindness.shapeMarkers).toBe(true);
  });

  test('should adjust colors for different types of color blindness', () => {
    const protanopia = manager.getA11yConfig({ colorBlindness: { type: 'protanopia' } });
    const deuteranopia = manager.getA11yConfig({ colorBlindness: { type: 'deuteranopia' } });

    expect(protanopia.colorAdjustments).toBeDefined();
    expect(deuteranopia.colorAdjustments).toBeDefined();
    expect(protanopia.colorAdjustments).not.toEqual(deuteranopia.colorAdjustments);
  });
});
```

#### E03: キーボードフォーカス確認テスト
```typescript
describe('Accessibility - Keyboard Focus', () => {
  test('should provide visible focus indicators', () => {
    const a11yConfig = manager.getA11yConfig({ focusVisible: true });

    expect(a11yConfig.focus.visible).toBe(true);
    expect(a11yConfig.focus.color).toBeDefined();
    expect(a11yConfig.focus.width).toBeGreaterThanOrEqual(2);
    expect(a11yConfig.focus.style).toBe('solid');
  });

  test('should respect reduced motion preferences', () => {
    const a11yConfig = manager.getA11yConfig({ reducedMotion: true });

    expect(a11yConfig.reducedMotion.enabled).toBe(true);
    expect(a11yConfig.reducedMotion.animationDuration).toBe(0);
  });
});
```

### F. 設定変更テスト (2個)

#### F01: 設定変更時の即座反映テスト
```typescript
describe('Configuration Updates', () => {
  test('should immediately reflect configuration changes', () => {
    const initialConfig = manager.getCurrentConfig();
    expect(initialConfig.colors.primary).toBe('#2563eb');

    manager.updateConfig({ colors: { primary: '#ff0000' } });
    const updatedConfig = manager.getCurrentConfig();
    expect(updatedConfig.colors.primary).toBe('#ff0000');
  });

  test('should emit configuration change events', () => {
    const mockListener = jest.fn();
    manager.onConfigChange(mockListener);

    manager.updateConfig({ colors: { primary: '#ff0000' } });
    expect(mockListener).toHaveBeenCalledWith({
      type: 'colors',
      changes: { primary: '#ff0000' }
    });
  });
});
```

#### F02: 設定無効時のフォールバックテスト
```typescript
describe('Configuration Fallback', () => {
  test('should fallback to defaults when configuration is invalid', () => {
    const invalidConfig = {
      colors: { primary: 'invalid-color' },
      fonts: { size: { small: -5 } }
    };

    manager.updateConfig(invalidConfig);
    const config = manager.getCurrentConfig();

    expect(config.colors.primary).toBe('#2563eb'); // default
    expect(config.fonts.size.small).toBe(12); // default mobile small
  });

  test('should validate configuration before applying', () => {
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
```

## 🎯 パフォーマンステスト (2個)

### P01: 処理時間測定テスト
```typescript
describe('Performance Tests', () => {
  test('should retrieve configuration within 5ms', () => {
    const start = performance.now();
    const config = manager.getDeviceConfig('desktop');
    const end = performance.now();

    expect(end - start).toBeLessThan(5);
    expect(config).toBeDefined();
  });

  test('should handle configuration merge within 10ms', () => {
    const base = manager.getDefaultConfig();
    const override = { colors: { primary: '#ff0000' } };

    const start = performance.now();
    const result = manager.mergeConfigs(base, override);
    const end = performance.now();

    expect(end - start).toBeLessThan(10);
    expect(result.colors.primary).toBe('#ff0000');
  });
});
```

### P02: メモリ使用量確認テスト
```typescript
describe('Memory Usage Tests', () => {
  test('should not create memory leaks with multiple config retrievals', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // 大量の設定取得を実行
    for (let i = 0; i < 1000; i++) {
      manager.getDeviceConfig('desktop');
      manager.getColorConfig();
      manager.getFontConfig();
    }

    global.gc && global.gc(); // Force garbage collection if available
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(500 * 1024); // Less than 500KB
  });
});
```

## 📊 テストデータ・モック

### コントラスト比計算ヘルパー
```typescript
function calculateContrastRatio(color1: string, color2: string): number {
  // WCAG contrast ratio calculation
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}
```

### テストデバイスモック
```typescript
const mockViewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
};
```

## ✅ 受け入れ基準

### テスト成功基準
- [ ] 全20テストケースが成功する
- [ ] テストカバレッジが90%以上
- [ ] パフォーマンステストが全て合格
- [ ] メモリリークテストが合格

### 品質基準
- [ ] TypeScript strict mode でエラーなし
- [ ] ESLint 違反なし
- [ ] WCAG 2.1 AA コントラスト基準クリア
- [ ] すべてのエラーケースにフォールバック対応

---

**テストケース設計完了**: 2025-09-29
**テスト実装**: TASK-103 TDD Step 3/6 Red Phase へ
**総テスト数**: 20個 (単体15個 + 統合5個)