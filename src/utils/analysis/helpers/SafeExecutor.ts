/**
 * TASK-102: 中央集約エラーハンドリングシステム
 * 安全実行とログ管理
 */

export interface ExecutionResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  executionTime?: number;
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  error?: Error;
  executionTime?: number;
}

/**
 * 安全実行とエラー管理のユーティリティクラス
 */
export class SafeExecutor {
  private static logs: LogEntry[] = [];
  private static readonly MAX_LOGS = 100;

  /**
   * 安全実行ラッパー（同期）
   */
  static safeExecuteSync<T>(
    operation: () => T,
    context: string
  ): ExecutionResult<T> {
    const startTime = this.getHighResolutionTime();

    try {
      const result = operation();
      const executionTime = this.getHighResolutionTime() - startTime;

      this.log(LogLevel.INFO, context, 'Operation completed successfully', undefined, executionTime);

      return {
        success: true,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = this.getHighResolutionTime() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.log(LogLevel.ERROR, context, 'Operation failed', error as Error, executionTime);

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * 安全実行ラッパー（非同期）
   */
  static async safeExecuteAsync<T>(
    operation: () => Promise<T> | T,
    context: string
  ): Promise<ExecutionResult<T>> {
    const startTime = this.getHighResolutionTime();

    try {
      const result = await operation();
      const executionTime = this.getHighResolutionTime() - startTime;

      this.log(LogLevel.INFO, context, 'Async operation completed successfully', undefined, executionTime);

      return {
        success: true,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = this.getHighResolutionTime() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.log(LogLevel.ERROR, context, 'Async operation failed', error as Error, executionTime);

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * 複数操作の並列安全実行
   */
  static async safeExecuteBatch<T>(
    operations: Array<{ operation: () => Promise<T> | T; context: string }>,
    continueOnError: boolean = false
  ): Promise<ExecutionResult<T>[]> {
    const results: ExecutionResult<T>[] = [];

    if (continueOnError) {
      // 並列実行（エラーで停止しない）
      const promises = operations.map(({ operation, context }) =>
        this.safeExecuteAsync(operation, context)
      );
      return await Promise.all(promises);

    } else {
      // 順次実行（エラーで停止）
      for (const { operation, context } of operations) {
        const result = await this.safeExecuteAsync(operation, context);
        results.push(result);

        if (!result.success) {
          break; // エラーで停止
        }
      }
      return results;
    }
  }

  /**
   * 条件付き実行
   */
  static conditionalExecute<T>(
    condition: () => boolean,
    operation: () => T,
    context: string,
    fallbackValue?: T
  ): ExecutionResult<T> {
    try {
      if (!condition()) {
        this.log(LogLevel.WARN, context, 'Condition not met, using fallback');
        return {
          success: true,
          result: fallbackValue
        };
      }

      return this.safeExecuteSync(operation, context);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(LogLevel.ERROR, context, 'Condition evaluation failed', error as Error);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * リトライ機能付き実行
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T> | T,
    context: string,
    maxRetries: number = 3,
    retryDelayMs: number = 1000
  ): Promise<ExecutionResult<T>> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.safeExecuteAsync(operation, `${context} (attempt ${attempt})`);

      if (result.success) {
        if (attempt > 1) {
          this.log(LogLevel.INFO, context, `Succeeded after ${attempt} attempts`);
        }
        return result;
      }

      lastError = new Error(result.error);

      if (attempt < maxRetries) {
        this.log(LogLevel.WARN, context, `Attempt ${attempt} failed, retrying...`);
        await this.sleep(retryDelayMs);
      }
    }

    this.log(LogLevel.ERROR, context, `All ${maxRetries} attempts failed`);
    return {
      success: false,
      error: `All retry attempts failed. Last error: ${lastError?.message}`
    };
  }

  /**
   * ログ記録
   */
  private static log(
    level: LogLevel,
    context: string,
    message: string,
    error?: Error,
    executionTime?: number
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      context,
      message,
      error,
      executionTime
    };

    this.logs.push(logEntry);

    // ログサイズ制限
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift(); // 古いログを削除
    }

    // コンソール出力（開発環境のみ）
    if (import.meta.env.DEV) {
      const timeStr = executionTime ? ` (${executionTime.toFixed(2)}ms)` : '';
      const fullMessage = `[${level}] ${context}: ${message}${timeStr}`;

      switch (level) {
        case LogLevel.ERROR:
          console.error(fullMessage, error);
          break;
        case LogLevel.WARN:
          console.warn(fullMessage);
          break;
        case LogLevel.INFO:
          console.info(fullMessage);
          break;
      }
    }
  }

  /**
   * ログ取得
   */
  static getLogs(level?: LogLevel, context?: string): LogEntry[] {
    return this.logs.filter(log => {
      if (level && log.level !== level) return false;
      if (context && !log.context.includes(context)) return false;
      return true;
    });
  }

  /**
   * ログクリア
   */
  static clearLogs(): void {
    this.logs = [];
  }

  /**
   * 統計情報取得
   */
  static getStatistics(): {
    totalOperations: number;
    successRate: number;
    averageExecutionTime: number;
    errorsByContext: Record<string, number>;
  } {
    const total = this.logs.length;
    const successes = this.logs.filter(log => log.level === LogLevel.INFO).length;
    const executionTimes = this.logs
      .filter(log => log.executionTime !== undefined)
      .map(log => log.executionTime!);

    const errorsByContext: Record<string, number> = {};
    this.logs
      .filter(log => log.level === LogLevel.ERROR)
      .forEach(log => {
        errorsByContext[log.context] = (errorsByContext[log.context] || 0) + 1;
      });

    return {
      totalOperations: total,
      successRate: total > 0 ? (successes / total) * 100 : 0,
      averageExecutionTime: executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        : 0,
      errorsByContext
    };
  }

  /**
   * 高解像度時間取得
   */
  private static getHighResolutionTime(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  /**
   * 非同期休憩
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}