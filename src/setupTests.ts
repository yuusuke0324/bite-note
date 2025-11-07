// Test setup file
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';  // IndexedDB polyfill for testing
import { vi } from 'vitest';

// Global test utilities and mocks can be added here

// ============================================================================
// JSDOM Polyfills for Browser APIs
// ============================================================================

/**
 * ResizeObserver Polyfill
 * JSDOM doesn't implement ResizeObserver API
 * This enhanced polyfill provides a more complete implementation
 * Supports callbacks and maintains observed elements list
 */
class ResizeObserverPolyfill implements ResizeObserver {
  private callback: ResizeObserverCallback;
  private observations = new Map<Element, any>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element, options?: ResizeObserverOptions): void {
    if (!target) {
      throw new TypeError('Failed to execute \'observe\' on \'ResizeObserver\': 1 argument required, but only 0 present.');
    }

    // Store observation
    this.observations.set(target, options || {});

    // getBoundingClientRectから実際のサイズを取得
    const rect = target.getBoundingClientRect();
    const width = rect.width || 800;  // デフォルト値
    const height = rect.height || 400; // デフォルト値

    // 即座にコールバックを同期実行（CI環境での確実な初期化）
    const entries = [{
      target,
      contentRect: {
        x: rect.x || 0,
        y: rect.y || 0,
        width,
        height,
        top: rect.top || 0,
        right: rect.right || width,
        bottom: rect.bottom || height,
        left: rect.left || 0,
      },
      borderBoxSize: [{ inlineSize: width, blockSize: height }],
      contentBoxSize: [{ inlineSize: width, blockSize: height }],
      devicePixelContentBoxSize: [{ inlineSize: width, blockSize: height }],
    }];

    // 同期実行でコールバックを即座に呼び出す
    this.callback(entries as any, this);
  }

  unobserve(target: Element): void {
    if (!target) {
      throw new TypeError('Failed to execute \'unobserve\' on \'ResizeObserver\': 1 argument required, but only 0 present.');
    }
    this.observations.delete(target);
  }

  disconnect(): void {
    this.observations.clear();
  }
}

// グローバルスコープにResizeObserverを設定
// 既存の不完全な実装を完全に上書き
if (typeof window !== 'undefined') {
  // windowオブジェクトが存在する場合（JSDOM環境）
  (window as any).ResizeObserver = ResizeObserverPolyfill;
}
if (typeof global !== 'undefined') {
  // Node.js グローバルスコープ
  (global as any).ResizeObserver = ResizeObserverPolyfill;
  // global.windowが存在する場合も設定
  if ((global as any).window) {
    (global as any).window.ResizeObserver = ResizeObserverPolyfill;
  }
}
// globalThisにも設定（最新の標準）
if (typeof globalThis !== 'undefined') {
  (globalThis as any).ResizeObserver = ResizeObserverPolyfill;
}

/**
 * Element.getBoundingClientRect Polyfill
 * JSDOMではgetBoundingClientRectが常に0を返すため、テスト用に適切な値を返すようにする
 */
if (typeof Element !== 'undefined') {
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function() {
    const rect = originalGetBoundingClientRect.call(this);

    // JSDOMで全て0の場合は、デフォルト値を返す
    if (rect.width === 0 && rect.height === 0) {
      return {
        x: 0,
        y: 0,
        width: 800,
        height: 400,
        top: 0,
        right: 800,
        bottom: 400,
        left: 0,
        toJSON: () => ({})
      } as DOMRect;
    }

    return rect;
  };
}

/**
 * HTMLCanvasElement.getContext Polyfill
 * JSDOM doesn't implement Canvas API
 * This enhanced stub provides a more complete Canvas 2D context mock
 */
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function(contextType: string) {
    if (contextType === '2d') {
      return {
        // Drawing rectangles
        fillRect: vi?.fn(() => {}) || (() => {}),
        clearRect: vi?.fn(() => {}) || (() => {}),
        strokeRect: vi?.fn(() => {}) || (() => {}),

        // Drawing text
        fillText: vi?.fn(() => {}) || (() => {}),
        strokeText: vi?.fn(() => {}) || (() => {}),
        measureText: vi?.fn(() => ({
          width: 100,
          actualBoundingBoxAscent: 10,
          actualBoundingBoxDescent: 10,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: 100,
          fontBoundingBoxAscent: 10,
          fontBoundingBoxDescent: 10
        })) || (() => ({ width: 100 })),

        // Line styles
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        miterLimit: 10,
        lineDashOffset: 0,
        setLineDash: vi?.fn(() => {}) || (() => {}),
        getLineDash: vi?.fn(() => []) || (() => []),

        // Text styles
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        direction: 'inherit',

        // Fill and stroke styles
        fillStyle: '#000000',
        strokeStyle: '#000000',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',

        // Shadows
        shadowBlur: 0,
        shadowColor: 'transparent',
        shadowOffsetX: 0,
        shadowOffsetY: 0,

        // Drawing paths
        beginPath: vi?.fn(() => {}) || (() => {}),
        closePath: vi?.fn(() => {}) || (() => {}),
        moveTo: vi?.fn(() => {}) || (() => {}),
        lineTo: vi?.fn(() => {}) || (() => {}),
        quadraticCurveTo: vi?.fn(() => {}) || (() => {}),
        bezierCurveTo: vi?.fn(() => {}) || (() => {}),
        arc: vi?.fn(() => {}) || (() => {}),
        arcTo: vi?.fn(() => {}) || (() => {}),
        rect: vi?.fn(() => {}) || (() => {}),
        ellipse: vi?.fn(() => {}) || (() => {}),

        // Drawing
        fill: vi?.fn(() => {}) || (() => {}),
        stroke: vi?.fn(() => {}) || (() => {}),
        clip: vi?.fn(() => {}) || (() => {}),
        isPointInPath: vi?.fn(() => false) || (() => false),
        isPointInStroke: vi?.fn(() => false) || (() => false),

        // Transformations
        rotate: vi?.fn(() => {}) || (() => {}),
        scale: vi?.fn(() => {}) || (() => {}),
        translate: vi?.fn(() => {}) || (() => {}),
        transform: vi?.fn(() => {}) || (() => {}),
        setTransform: vi?.fn(() => {}) || (() => {}),
        resetTransform: vi?.fn(() => {}) || (() => {}),
        getTransform: vi?.fn(() => ({
          a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
          m11: 1, m12: 0, m13: 0, m14: 0,
          m21: 0, m22: 1, m23: 0, m24: 0,
          m31: 0, m32: 0, m33: 1, m34: 0,
          m41: 0, m42: 0, m43: 0, m44: 1,
        })) || (() => ({})),

        // Image drawing
        drawImage: vi?.fn(() => {}) || (() => {}),
        createImageData: vi?.fn((width: number, height: number) => ({
          data: new Uint8ClampedArray(width * height * 4),
          width,
          height,
        })) || ((width: number, height: number) => ({
          data: new Uint8ClampedArray(width * height * 4),
          width,
          height,
        })),
        getImageData: vi?.fn((sx: number, sy: number, sw: number, sh: number) => ({
          data: new Uint8ClampedArray(sw * sh * 4),
          width: sw,
          height: sh,
        })) || ((sx: number, sy: number, sw: number, sh: number) => ({
          data: new Uint8ClampedArray(sw * sh * 4),
          width: sw,
          height: sh,
        })),
        putImageData: vi?.fn(() => {}) || (() => {}),

        // State
        save: vi?.fn(() => {}) || (() => {}),
        restore: vi?.fn(() => {}) || (() => {}),

        // Canvas property
        canvas: this,
      } as any;
    }
    return null;
  };

  HTMLCanvasElement.prototype.toDataURL = function(type?: string, quality?: number) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  };

  HTMLCanvasElement.prototype.toBlob = function(callback: BlobCallback, type?: string, quality?: number) {
    setTimeout(() => {
      callback(new Blob([''], { type: type || 'image/png' }));
    }, 0);
  };
}