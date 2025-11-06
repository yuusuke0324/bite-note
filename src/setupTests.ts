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
const ResizeObserverPolyfill = class ResizeObserver {
  private callback: ResizeObserverCallback;
  private observations = new Map<Element, any>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element, options?: ResizeObserverOptions) {
    if (!target) {
      throw new TypeError('Failed to execute \'observe\' on \'ResizeObserver\': 1 argument required, but only 0 present.');
    }

    // Store observation
    this.observations.set(target, options || {});

    // Simulate initial callback
    setTimeout(() => {
      if (this.observations.has(target)) {
        const entries = [{
          target,
          contentRect: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            top: 0,
            right: 100,
            bottom: 100,
            left: 0,
          },
          borderBoxSize: [{ inlineSize: 100, blockSize: 100 }],
          contentBoxSize: [{ inlineSize: 100, blockSize: 100 }],
          devicePixelContentBoxSize: [{ inlineSize: 100, blockSize: 100 }],
        }];
        this.callback(entries as any, this);
      }
    }, 0);
  }

  unobserve(target: Element) {
    if (!target) {
      throw new TypeError('Failed to execute \'unobserve\' on \'ResizeObserver\': 1 argument required, but only 0 present.');
    }
    this.observations.delete(target);
  }

  disconnect() {
    this.observations.clear();
  }
} as any;

// Set on both global and window
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = ResizeObserverPolyfill;
}
if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  (window as any).ResizeObserver = ResizeObserverPolyfill;
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