/**
 * E2Eテスト用のdata-testid定数管理
 * TASK-301: 統合テストスイート対応
 */

export const TestIds = {
  // Navigation
  FISHING_RECORDS_LINK: 'fishing-records-link',
  FORM_TAB: 'form-tab',
  DEBUG_TAB: 'debug-tab',

  // Record List
  FISHING_RECORDS_LIST: 'fishing-records-list',
  FISHING_RECORDS_CONTAINER: 'fishing-records-container',
  ADD_RECORD_BUTTON: 'add-record-button',
  RECORD_ITEM: (id: string) => `record-${id}`,

  // Record Form
  LOCATION_NAME: 'location-name',
  FISHING_DATE: 'fishing-date',
  FISH_SPECIES: 'fish-species',
  WEATHER: 'weather',
  FISH_SIZE: 'fish-size',
  NOTES: 'notes',
  LATITUDE: 'latitude',
  LONGITUDE: 'longitude',
  SAVE_RECORD_BUTTON: 'save-record-button',

  // Tide Graph
  TIDE_GRAPH_CANVAS: 'tide-graph-canvas',
  TIDE_GRAPH_AREA: 'tide-graph-area',
  TIDE_GRAPH_TIME_LABELS: 'tide-graph-time-labels',
  TIDE_GRAPH_Y_AXIS: 'tide-graph-y-axis',
  TIDE_GRAPH_GRID: 'tide-graph-grid',
  TIDE_CURVE: 'tide-curve',
  TIDE_AREA: 'tide-area',
  TIME_LABEL: (index: number) => `time-label-${index}`,
  LEVEL_LABEL: (index: number) => `level-label-${index}`,
  GRID_LINE: (index: number) => `grid-line-${index}`,
  FISHING_MARKER: (index: number) => `fishing-marker-${index}`,

  // Tide Integration
  TIDE_GRAPH_TAB: 'tide-graph-tab', // Navigation: Bottom tab for tide graph page
  TIDE_GRAPH_TOGGLE_BUTTON: 'tide-graph-toggle-button', // Toggle: Button to expand/collapse tide graph section
  TIDE_INTEGRATION_SECTION: 'tide-integration-section',
  TIDE_ERROR: 'tide-error',
  TIDE_RETRY_BUTTON: 'tide-retry-button',
  TIDE_ANALYSIS_SECTION: 'tide-analysis-section',
  FISHING_TIME_ANALYSIS: 'fishing-time-analysis',
  NEXT_OPTIMAL_TIME: 'next-optimal-time',
  FISHING_TIME_MARKER: 'fishing-time-marker',

  // Performance Testing
  PERFORMANCE_SUMMARY: 'performance-summary',
  CANVAS_METRICS: 'canvas-metrics',
  MEMORY_WARNING: 'memory-warning',
  PERF_TEST_RESULTS: 'perf-test-results',
  CICD_PERFORMANCE_STATUS: 'cicd-performance-status',

  // Accessibility Testing
  KEYBOARD_TIME_MARKER: 'keyboard-time-marker',
  TIDE_DETAIL_MODAL: 'tide-detail-modal',
  TIDE_PATTERN_INDICATOR: 'tide-pattern-indicator',
  TIDE_SHAPE_INDICATOR: 'tide-shape-indicator',
  CURRENT_TIME_INDICATOR: 'current-time-indicator',
  ZOOM_LEVEL_INDICATOR: 'zoom-level-indicator',
  LANDSCAPE_LAYOUT: 'landscape-layout',
  TOUCH_TARGET: (id: string) => `touch-target-${id}`,
  TIDE_GRAPH_LABELS: 'tide-graph-labels',
  TIDE_GRAPH_BACKGROUND: 'tide-graph-background',
  TIDE_GRAPH_TEXT: 'tide-graph-text',

  // Navigation Items
  NAV_ITEM: (id: string) => `nav-${id}`,

  // Generic
  FLOATING_ACTION_BUTTON: 'floating-action-button',
  TIDE_TOOLTIP: 'tide-tooltip',
  TIDE_GRAPH_SKELETON: 'tide-graph-skeleton',
  TIDE_GRAPH_ERROR: 'tide-graph-error',
  TIDE_GRAPH_CONTAINER: 'tide-graph-container',

  // Axis Elements
  X_AXIS_LINE: 'x-axis-line',
  Y_AXIS_LINE: 'y-axis-line'
} as const;

export type TestId = typeof TestIds[keyof typeof TestIds];