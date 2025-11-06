import '@testing-library/jest-dom';

// Mock ResizeObserver for Recharts components
class ResizeObserverMock {
  observe() {
    // Mock implementation
  }
  unobserve() {
    // Mock implementation
  }
  disconnect() {
    // Mock implementation
  }
}

global.ResizeObserver = ResizeObserverMock as any;