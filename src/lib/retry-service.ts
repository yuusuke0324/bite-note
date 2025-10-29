// リトライサービス

export interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
  jitter?: boolean;
}

export class RetryService {
  /**
   * 操作を指定した条件でリトライ実行
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    const { maxRetries, delay, backoff = 'linear', jitter = false } = options;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // 最大試行回数に達した場合は諦める
        if (attempt === maxRetries) {
          throw lastError;
        }

        // 遅延を適用
        const currentDelay = this.calculateDelay(delay, attempt, backoff, jitter);
        await this.sleep(currentDelay);
      }
    }

    throw lastError!;
  }

  /**
   * 遅延時間を計算
   */
  private calculateDelay(
    baseDelay: number,
    attempt: number,
    backoff: 'linear' | 'exponential',
    jitter: boolean
  ): number {
    let delay = baseDelay;

    if (backoff === 'exponential') {
      delay = baseDelay * Math.pow(2, attempt);
    } else {
      delay = baseDelay * (attempt + 1);
    }

    // ジッターを追加（ランダムな遅延を加える）
    if (jitter) {
      delay += Math.random() * baseDelay * 0.1;
    }

    return Math.round(delay);
  }

  /**
   * 指定時間待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * リトライ可能な条件を判定
   */
  isRetryable(error: Error): boolean {
    // ネットワークエラーやタイムアウトは一般的にリトライ可能
    const retryableErrors = [
      'NetworkError',
      'TimeoutError',
      'AbortError',
      'fetch'
    ];

    return retryableErrors.some(errorType =>
      error.name.includes(errorType) || error.message.includes(errorType)
    );
  }

  /**
   * 指数バックオフでリトライ（ヘルパーメソッド）
   */
  async executeWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    return this.execute(operation, {
      maxRetries,
      delay: baseDelay,
      backoff: 'exponential',
      jitter: true
    });
  }

  /**
   * 線形バックオフでリトライ（ヘルパーメソッド）
   */
  async executeWithLinearBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    return this.execute(operation, {
      maxRetries,
      delay: baseDelay,
      backoff: 'linear',
      jitter: false
    });
  }
}