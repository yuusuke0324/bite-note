import '@testing-library/jest-dom';

// Mock ResizeObserver for Recharts components
global.ResizeObserver = class ResizeObserver {
  constructor() {
    // Mock constructor
  }
  observe() {
    // Mock implementation
  }
  unobserve() {
    // Mock implementation
  }
  disconnect() {
    // Mock implementation
  }
} as any;