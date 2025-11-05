/**
 * ErrorTypes.ts - エラー型定義
 * アプリケーション全体で使用するエラー関連の型定義
 */

/**
 * エラーの重要度
 */
export enum ErrorSeverity {
  /** 情報: ユーザーに知らせるべき情報（青色） */
  INFO = 'info',

  /** 警告: 注意が必要だが続行可能（黄色） */
  WARNING = 'warning',

  /** エラー: 処理が失敗したが回復可能（赤色） */
  ERROR = 'error',

  /** 致命的: アプリケーションの続行が困難（紫色） */
  CRITICAL = 'critical',
}

/**
 * エラーカテゴリー
 */
export enum ErrorCategory {
  /** ネットワーク関連 */
  NETWORK = 'network',

  /** ストレージ関連（IndexedDB等） */
  STORAGE = 'storage',

  /** 権限関連（GPS、カメラ等） */
  PERMISSION = 'permission',

  /** バリデーション関連 */
  VALIDATION = 'validation',

  /** 外部API関連 */
  API = 'api',

  /** システム関連 */
  SYSTEM = 'system',

  /** ユーザー操作関連 */
  USER = 'user',
}

/**
 * ユーザーアクション定義
 */
export interface ErrorAction {
  /** アクションのラベル */
  label: string;

  /** アクションのハンドラー */
  handler: () => void | Promise<void>;

  /** プライマリアクションかどうか */
  primary?: boolean;

  /** アクションのスタイル */
  variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * リカバリー戦略
 */
export interface RecoveryStrategy {
  /** 自動再試行設定 */
  autoRetry?: {
    /** 最大試行回数 */
    maxAttempts: number;

    /** 遅延時間（ミリ秒） */
    delayMs: number;

    /** 指数バックオフを使用するか */
    exponentialBackoff?: boolean;
  };

  /** フォールバック処理 */
  fallback?: () => Promise<void>;

  /** ユーザーアクション */
  actions: ErrorAction[];
}

/**
 * アプリケーションエラー
 */
export class AppError extends Error {
  /** エラーコード */
  code: string;

  /** 重要度 */
  severity: ErrorSeverity;

  /** カテゴリー */
  category: ErrorCategory;

  /** ユーザー向けメッセージ */
  userMessage: string;

  /** リカバリー戦略 */
  recovery?: RecoveryStrategy;

  /** 追加のコンテキスト情報 */
  context?: Record<string, unknown>;

  /** タイムスタンプ */
  timestamp: Date;

  /** 再試行可能かどうか */
  retryable: boolean;

  constructor(options: {
    code: string;
    message: string;
    userMessage: string;
    severity: ErrorSeverity;
    category: ErrorCategory;
    recovery?: RecoveryStrategy;
    context?: Record<string, unknown>;
    retryable?: boolean;
    cause?: Error;
  }) {
    super(options.message);

    this.name = 'AppError';
    this.code = options.code;
    this.severity = options.severity;
    this.category = options.category;
    this.userMessage = options.userMessage;
    this.recovery = options.recovery;
    this.context = options.context;
    this.timestamp = new Date();
    this.retryable = options.retryable ?? true;

    // 元のエラーのスタックトレースを保持
    if (options.cause && options.cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends AppError {
  constructor(message: string, options?: {
    userMessage?: string;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      code: 'NETWORK_ERROR',
      message,
      userMessage: options?.userMessage ?? 'ネットワークエラーが発生しました。接続を確認してください。',
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.NETWORK,
      context: options?.context,
      retryable: true,
      cause: options?.cause,
      recovery: {
        actions: [
          {
            label: '再試行',
            handler: () => window.location.reload(),
            primary: true,
            variant: 'primary',
          },
          {
            label: 'キャンセル',
            handler: () => {},
            variant: 'secondary',
          },
        ],
      },
    });
    this.name = 'NetworkError';
  }
}

/**
 * ストレージエラー
 */
export class StorageError extends AppError {
  constructor(message: string, options?: {
    userMessage?: string;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      code: 'STORAGE_ERROR',
      message,
      userMessage: options?.userMessage ?? 'データの保存に失敗しました。',
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.STORAGE,
      context: options?.context,
      retryable: true,
      cause: options?.cause,
      recovery: {
        actions: [
          {
            label: '再試行',
            handler: () => {},
            primary: true,
            variant: 'primary',
          },
          {
            label: 'キャンセル',
            handler: () => {},
            variant: 'secondary',
          },
        ],
      },
    });
    this.name = 'StorageError';
  }
}

/**
 * 権限エラー
 */
export class PermissionError extends AppError {
  constructor(message: string, options?: {
    userMessage?: string;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      code: 'PERMISSION_ERROR',
      message,
      userMessage: options?.userMessage ?? '必要な権限が許可されていません。',
      severity: ErrorSeverity.WARNING,
      category: ErrorCategory.PERMISSION,
      context: options?.context,
      retryable: false,
      cause: options?.cause,
      recovery: {
        actions: [
          {
            label: '設定を確認',
            handler: () => {},
            primary: true,
            variant: 'primary',
          },
          {
            label: '閉じる',
            handler: () => {},
            variant: 'secondary',
          },
        ],
      },
    });
    this.name = 'PermissionError';
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  constructor(message: string, options?: {
    userMessage?: string;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      userMessage: options?.userMessage ?? '入力内容に誤りがあります。',
      severity: ErrorSeverity.WARNING,
      category: ErrorCategory.VALIDATION,
      context: options?.context,
      retryable: false,
      cause: options?.cause,
      recovery: {
        actions: [
          {
            label: '修正する',
            handler: () => {},
            primary: true,
            variant: 'primary',
          },
        ],
      },
    });
    this.name = 'ValidationError';
  }
}

/**
 * APIエラー
 */
export class APIError extends AppError {
  statusCode?: number;

  constructor(message: string, options?: {
    userMessage?: string;
    statusCode?: number;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({
      code: 'API_ERROR',
      message,
      userMessage: options?.userMessage ?? 'サーバーとの通信に失敗しました。',
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.API,
      context: { ...options?.context, statusCode: options?.statusCode },
      retryable: true,
      cause: options?.cause,
      recovery: {
        actions: [
          {
            label: '再試行',
            handler: () => {},
            primary: true,
            variant: 'primary',
          },
          {
            label: 'キャンセル',
            handler: () => {},
            variant: 'secondary',
          },
        ],
      },
    });
    this.name = 'APIError';
    this.statusCode = options?.statusCode;
  }
}

/**
 * エラー表示オプション
 */
export interface ErrorDisplayOptions {
  /** 表示タイプ */
  displayType: 'toast' | 'modal' | 'boundary' | 'none';

  /** 自動で消えるまでの時間（ミリ秒）、nullの場合は手動で閉じる */
  autoHideDuration?: number | null;

  /** アイコンを表示するか */
  showIcon?: boolean;

  /** スタックトレースを表示するか（開発環境のみ） */
  showStackTrace?: boolean;
}

/**
 * エラーログエントリー
 */
export interface ErrorLogEntry {
  /** エラーID */
  id: string;

  /** エラーオブジェクト */
  error: AppError | Error;

  /** タイムスタンプ */
  timestamp: Date;

  /** ユーザーエージェント */
  userAgent: string;

  /** URL */
  url: string;

  /** 追加コンテキスト */
  context?: Record<string, unknown>;

  /** 処理済みかどうか */
  handled: boolean;
}
