// Test setup file
import '@testing-library/jest-dom';

// Global test utilities and mocks can be added here

// ============================================================================
// JSDOM Polyfills for Browser APIs
// ============================================================================

/**
 * ResizeObserver Polyfill
 * JSDOM doesn't implement ResizeObserver API
 * This minimal polyfill allows tests to run without throwing errors
 * Note: Actual resize detection won't work, only the API structure
 */
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {
      // No-op: actual resize detection not possible in JSDOM
    }
    unobserve() {
      // No-op
    }
    disconnect() {
      // No-op
    }
  } as any;
}

/**
 * HTMLCanvasElement.getContext Polyfill
 * JSDOM doesn't implement Canvas API
 * This stub allows canvas-related tests to run
 */
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function() {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createImageData: () => ({ data: [] }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    } as any;
  };

  HTMLCanvasElement.prototype.toDataURL = function() {
    return '';
  };
}