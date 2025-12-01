/**
 * E2Eテスト用のdata-testid定数管理
 * TASK-301: 統合テストスイート対応
 */

export const TestIds = {
  // Navigation
  FISHING_RECORDS_LINK: 'fishing-records-link',
  FORM_TAB: 'form-tab',
  DEBUG_TAB: 'debug-tab',
  HOME_TAB: 'home-tab',
  LIST_TAB: 'list-tab',
  MAP_TAB: 'map-tab',

  // Record List
  FISHING_RECORDS_LIST: 'fishing-records-list',
  FISHING_RECORDS_CONTAINER: 'fishing-records-container',
  ADD_RECORD_BUTTON: 'add-record-button',
  RECORD_ITEM: (id: string) => `record-item-${id}`,

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

  // Fish Species Autocomplete
  FISH_SPECIES_AUTOCOMPLETE: 'fish-species-autocomplete',
  FISH_SPECIES_INPUT: 'fish-species-input',
  FISH_SPECIES_SUGGESTIONS: 'fish-species-suggestions',
  FISH_SPECIES_OPTION: (id: string) => `fish-species-option-${id}`,
  FISH_SPECIES_NO_RESULTS: 'fish-species-no-results',

  // Tide Graph
  TIDE_CHART: 'tide-chart', // TideChart メインコンテナ（実装済み）
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

  // TideChart Accessibility (実装済み)
  FALLBACK_DATA_TABLE: 'fallback-data-table', // アクセシビリティ用データテーブル
  TIDE_TOOLTIP: 'tide-tooltip', // ツールチップ
  TOOLTIP_TIME: 'tooltip-time', // ツールチップ時刻
  TOOLTIP_LEVEL: 'tooltip-level', // ツールチップ潮位
  DATA_POINT: (index: number) => `data-point-${index}`, // データポイント

  // Tide Integration (削除済み - Issue #322)
  // PhotoHeroCard のオーバーレイグラフに置換されました
  // 旧 TestIds は互換性のため保持しますが、使用されません

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
  TIDE_GRAPH_SKELETON: 'tide-graph-skeleton',
  TIDE_GRAPH_ERROR: 'tide-graph-error',
  TIDE_GRAPH_CONTAINER: 'tide-graph-container',

  // Axis Elements
  X_AXIS_LINE: 'x-axis-line',
  Y_AXIS_LINE: 'y-axis-line',

  // Error Handling
  ERROR_BOUNDARY: 'error-boundary',
  ERROR_BOUNDARY_MESSAGE: 'error-boundary-message',
  ERROR_BOUNDARY_RELOAD: 'error-boundary-reload',

  // Offline Features
  OFFLINE_INDICATOR: 'offline-indicator',
  OFFLINE_BADGE: 'offline-badge',
  SYNC_STATUS: 'sync-status',

  // GPS Feature (Phase 3-1)
  GPS_BUTTON: 'gps-button',
  GPS_ERROR_TOAST: 'gps-error-toast',
  MANUAL_INPUT_GUIDANCE: 'manual-input-guidance',

  // Photo Upload (Phase 3-1)
  PHOTO_INPUT: 'photo-input',
  PHOTO_UPLOAD_ERROR: 'photo-upload-error',
  RETRY_UPLOAD_BUTTON: 'retry-upload-button',

  // Form Validation (Phase 3-1)
  VALIDATION_ERROR: 'validation-error',
  FIELD_ERROR: (fieldName: string) => `${fieldName}-error`,

  // Toast Components (Phase 3-1)
  TOAST_ERROR: 'toast-error',
  TOAST_WARNING: 'toast-warning',
  TOAST_INFO: 'toast-info',
  TOAST_SUCCESS: 'toast-success',
  TOAST_CLOSE_BUTTON: 'toast-close-button',
  TOAST_ACTION_BUTTON: 'toast-action-button',

  // Offline Sync UI (Phase 3-2)
  SYNC_BUTTON: 'sync-button',
  LOCAL_SAVE_MESSAGE: 'local-save-message',
  SYNC_SUCCESS_MESSAGE: 'sync-success-message',
  STORAGE_ERROR: 'storage-error',
  DATA_MANAGEMENT_BUTTON: 'data-management-button',

  // Session Management (Phase 3-4)
  SESSION_TIMEOUT_MODAL: 'session-timeout-modal',
  REAUTH_PROMPT: 'reauth-prompt',
  RECONNECT_AND_SAVE_BUTTON: 'reconnect-and-save-button',
  EXPORT_NOW_BUTTON: 'export-now-button',
  SESSION_MODAL_CLOSE_BUTTON: 'session-modal-close-button',

  // Fallback Storage (Phase 3-4)
  FALLBACK_STORAGE_NOTICE: 'fallback-storage-notice',
  INDEXEDDB_UNAVAILABLE_WARNING: 'indexeddb-unavailable-warning',
  STORAGE_QUOTA_WARNING: 'storage-quota-warning',
  MIGRATION_PROMPT: 'migration-prompt'
} as const;

export type TestId = typeof TestIds[keyof typeof TestIds];