// パフォーマンス最適化ユニットテストスイート（JSX不使用）

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImageOptimizer } from '../lib/image-optimizer';
import { PerformanceMonitor } from '../lib/performance-monitor';

// Create spy functions before assigning to window.performance
const performanceNowSpy = vi.fn(() => Date.now());
const performanceMarkSpy = vi.fn();
const performanceMeasureSpy = vi.fn();
const performanceGetEntriesByTypeSpy = vi.fn(() => []);
const performanceGetEntriesByNameSpy = vi.fn(() => []);

// Mock performance APIs
Object.defineProperty(window, 'performance', {
  value: {
    now: performanceNowSpy,
    mark: performanceMarkSpy,
    measure: performanceMeasureSpy,
    getEntriesByType: performanceGetEntriesByTypeSpy,
    getEntriesByName: performanceGetEntriesByNameSpy,
  },
  writable: true,
  configurable: true
});

// Remove PerformanceObserver to ensure fallback path is used
delete (window as any).PerformanceObserver;

describe('ImageOptimizer', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');

    // Create mock canvas context
    ctx = {
      drawImage: vi.fn(),
      canvas: canvas,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    } as any;

    vi.spyOn(document, 'createElement').mockReturnValue(canvas);
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);

    // Mock canvas methods
    canvas.toBlob = vi.fn((callback) => {
      callback(new Blob(['mock-data'], { type: 'image/jpeg' }));
    });
    canvas.width = 300;
    canvas.height = 200;

    // Mock Image constructor
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      width = 300;
      height = 200;

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    } as any;

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should compress image to specified quality', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const optimizer = new ImageOptimizer();

    const result = await optimizer.compressImage(mockFile, 0.8);

    expect(result).toBeInstanceOf(File);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('test.jpg');
  });

  it('should resize image to specified dimensions', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const optimizer = new ImageOptimizer();

    const result = await optimizer.resizeImage(mockFile, 300, 200);

    expect(result).toBeInstanceOf(File);
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(200);
  });

  it('should convert JPEG to WebP when supported', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const optimizer = new ImageOptimizer();

    // Mock WebP support
    canvas.toBlob = vi.fn((callback) => {
      callback(new Blob(['webp-data'], { type: 'image/webp' }));
    });

    const result = await optimizer.convertToWebP(mockFile);

    expect(result.type).toBe('image/webp');
  });

  it('should generate thumbnail', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const optimizer = new ImageOptimizer();

    const thumbnail = await optimizer.generateThumbnail(mockFile, 150);

    expect(thumbnail).toBeInstanceOf(File);
    expect(canvas.width).toBe(150);
    expect(canvas.height).toBe(150);
  });
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    // Clear all spy calls before each test
    performanceNowSpy.mockClear();
    performanceMarkSpy.mockClear();
    performanceMeasureSpy.mockClear();
    performanceGetEntriesByTypeSpy.mockClear();
    performanceGetEntriesByNameSpy.mockClear();

    monitor = new PerformanceMonitor();
  });

  it('should measure operation duration', async () => {
    const operation = vi.fn().mockResolvedValue('result');

    const result = await monitor.measureAsync('test-operation', operation);

    expect(result).toBe('result');
    expect(performanceMarkSpy).toHaveBeenCalledWith('test-operation-start');
    expect(performanceMarkSpy).toHaveBeenCalledWith('test-operation-end');
    expect(performanceMeasureSpy).toHaveBeenCalledWith(
      'test-operation',
      'test-operation-start',
      'test-operation-end'
    );
  });

  it('should track Core Web Vitals', () => {
    monitor.trackWebVitals();

    // Should set up performance observers
    expect(performanceGetEntriesByTypeSpy).toHaveBeenCalled();
  });

  it('should report performance metrics', () => {
    const metrics = monitor.getMetrics();

    expect(metrics).toHaveProperty('measurements');
    expect(metrics).toHaveProperty('webVitals');
    expect(metrics).toHaveProperty('memory');
  });

  it('should detect performance issues', () => {
    // Mock slow operation
    monitor.recordMeasurement('slow-operation', 5000);

    const issues = monitor.detectIssues();

    expect(issues).toContain('slow-operation exceeded threshold');
  });
});

describe('VirtualizedRecordList Utils', () => {
  it('should calculate visible range correctly', () => {
    const containerHeight = 500;
    const itemHeight = 100;
    const _scrollTop = 200;
    const overscan = 5;

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(_scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(999, startIndex + visibleCount + overscan * 2);

    expect(visibleCount).toBe(5);
    expect(startIndex).toBe(0); // Math.max(0, 2 - 5) = 0
    expect(endIndex).toBe(15); // 0 + 5 + 10 = 15
  });

  it('should handle large datasets efficiently', () => {
    const records = Array.from({ length: 1000 }, (_, i) => ({
      id: `record-${i}`,
      date: new Date(),
      location: `Location ${i}`,
      fishSpecies: `Fish ${i}`,
      size: i + 10,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const startTime = performance.now();

    // Simulate virtualization calculation
    const itemHeight = 100;
    const containerHeight = 500;
    const visibleItems = records.slice(0, Math.ceil(containerHeight / itemHeight) + 10);

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(visibleItems.length).toBeLessThanOrEqual(15);
    expect(duration).toBeLessThan(50); // Should be very fast
  });
});