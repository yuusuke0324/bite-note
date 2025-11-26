// エラーハンドリング・ユーザビリティ向上ユニットテストスイート

import { describe, it, expect, vi } from 'vitest';
import { ErrorHandler } from '../lib/error-handler';
import { RetryService } from '../lib/retry-service';
import { FeedbackService } from '../lib/feedback-service';
import { UserGuidanceService } from '../lib/user-guidance-service';

describe('ErrorHandler', () => {
  it('should categorize GPS errors correctly', () => {
    const handler = new ErrorHandler();

    const notSupportedError = new Error('GPS not supported');
    notSupportedError.name = 'NotSupportedError';

    const result = handler.handleGPSError(notSupportedError);

    expect(result.type).toBe('GPS_NOT_SUPPORTED');
    expect(result.message).toBe('GPS機能が利用できません。手動で位置情報を入力してください。');
    expect(result.actionLabel).toBe('手動入力');
  });

  it('should handle permission denied GPS error', () => {
    const handler = new ErrorHandler();

    const permissionError = new Error('Permission denied');
    permissionError.name = 'PermissionDeniedError';

    const result = handler.handleGPSError(permissionError);

    expect(result.type).toBe('GPS_PERMISSION_DENIED');
    expect(result.message).toBe('位置情報の利用が許可されていません。ブラウザの設定を確認してください。');
    expect(result.actionLabel).toBe('設定を確認');
  });

  it('should handle photo upload errors', () => {
    const handler = new ErrorHandler();

    const fileSizeError = new Error('File too large');
    const result = handler.handlePhotoError(fileSizeError, { size: 15 * 1024 * 1024 });

    expect(result.type).toBe('FILE_SIZE_ERROR');
    expect(result.message).toBe('ファイルサイズが大きすぎます。10MB以下の画像を選択してください。');
  });

  it('should handle invalid file type errors', () => {
    const handler = new ErrorHandler();

    const typeError = new Error('Invalid file type');
    const result = handler.handlePhotoError(typeError, { type: 'image/bmp' });

    expect(result.type).toBe('INVALID_FILE_TYPE');
    expect(result.message).toBe('対応していないファイル形式です。JPEG、PNG、WebP形式の画像を選択してください。');
  });

  it('should handle network errors', () => {
    const handler = new ErrorHandler();

    const networkError = new Error('Network error');
    const result = handler.handleNetworkError(networkError);

    expect(result.type).toBe('NETWORK_ERROR');
    expect(result.message).toBe('ネットワークエラーが発生しました。接続を確認してください。');
    expect(result.retryable).toBe(true);
  });
});

describe('RetryService', () => {
  it('should retry failed operations', async () => {
    const retryService = new RetryService();
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('Success');

    const result = await retryService.execute(mockOperation, { maxRetries: 3, delay: 10 });

    expect(result).toBe('Success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries exceeded', async () => {
    const retryService = new RetryService();
    const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));

    await expect(
      retryService.execute(mockOperation, { maxRetries: 2, delay: 10 })
    ).rejects.toThrow('Always fails');

    expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should apply exponential backoff', async () => {
    vi.useFakeTimers();

    const retryService = new RetryService();
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue('Success');

    const executePromise = retryService.execute(mockOperation, {
      maxRetries: 1,
      delay: 100,
      backoff: 'exponential'
    });

    // タイマーを進める（attempt=0の場合、100 * 2^0 = 100ms）
    await vi.advanceTimersByTimeAsync(100);

    await executePromise;

    expect(mockOperation).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});

describe('FeedbackService', () => {
  it('should create success feedback', () => {
    const feedbackService = new FeedbackService();

    const feedback = feedbackService.createSuccess('操作が完了しました');

    expect(feedback.type).toBe('success');
    expect(feedback.message).toBe('操作が完了しました');
    expect(feedback.duration).toBe(3000);
    expect(feedback.icon).toBe('Check');
  });

  it('should create error feedback', () => {
    const feedbackService = new FeedbackService();

    const feedback = feedbackService.createError('エラーが発生しました');

    expect(feedback.type).toBe('error');
    expect(feedback.message).toBe('エラーが発生しました');
    expect(feedback.duration).toBe(5000);
    expect(feedback.icon).toBe('X');
  });

  it('should create info feedback', () => {
    const feedbackService = new FeedbackService();

    const feedback = feedbackService.createInfo('情報をお知らせします');

    expect(feedback.type).toBe('info');
    expect(feedback.message).toBe('情報をお知らせします');
    expect(feedback.duration).toBe(4000);
    expect(feedback.icon).toBe('Info');
  });

  it('should create warning feedback', () => {
    const feedbackService = new FeedbackService();

    const feedback = feedbackService.createWarning('注意が必要です');

    expect(feedback.type).toBe('warning');
    expect(feedback.message).toBe('注意が必要です');
    expect(feedback.duration).toBe(4000);
    expect(feedback.icon).toBe('AlertTriangle');
  });
});

describe('UserGuidanceService', () => {
  it('should create first-time user guidance', () => {
    const guidanceService = new UserGuidanceService();

    const guidance = guidanceService.createFirstTimeGuidance();

    expect(guidance.type).toBe('first-time');
    expect(guidance.steps).toHaveLength(4);
    expect(guidance.steps[0].title).toBe('釣果記録アプリへようこそ！');
    expect(guidance.steps[0].description).toContain('釣果の記録');
  });

  it('should create feature introduction guidance', () => {
    const guidanceService = new UserGuidanceService();

    const guidance = guidanceService.createFeatureGuidance('photo-upload');

    expect(guidance.type).toBe('feature');
    expect(guidance.feature).toBe('photo-upload');
    expect(guidance.steps[0].title).toBe('写真のアップロード方法');
  });

  it('should create empty state guidance', () => {
    const guidanceService = new UserGuidanceService();

    const guidance = guidanceService.createEmptyStateGuidance('no-records');

    expect(guidance.type).toBe('empty-state');
    expect(guidance.emptyType).toBe('no-records');
    expect(guidance.title).toBe('まだ釣果記録がありません');
    expect(guidance.description).toBe('最初の釣果を記録してみましょう！');
    expect(guidance.actionLabel).toBe('記録を作成');
  });

  it('should create error recovery guidance', () => {
    const guidanceService = new UserGuidanceService();

    const guidance = guidanceService.createErrorRecoveryGuidance('gps-failed');

    expect(guidance.type).toBe('error-recovery');
    expect(guidance.errorType).toBe('gps-failed');
    expect(guidance.title).toBe('GPS取得に失敗しました');
    expect(guidance.steps).toHaveLength(3);
    expect(guidance.steps[0].title).toBe('位置情報設定を確認');
  });
});

describe('Integration: Complete Error Flow', () => {
  it('should handle complete GPS error flow', () => {
    const errorHandler = new ErrorHandler();
    const feedbackService = new FeedbackService();
    const guidanceService = new UserGuidanceService();

    // Simulate GPS error
    const gpsError = new Error('GPS timeout');
    gpsError.name = 'TimeoutError';

    // Handle error
    const errorResult = errorHandler.handleGPSError(gpsError);
    expect(errorResult.type).toBe('GPS_TIMEOUT');

    // Create feedback
    const feedback = feedbackService.createError(errorResult.message);
    expect(feedback.type).toBe('error');

    // Create guidance
    const guidance = guidanceService.createErrorRecoveryGuidance('gps-failed');
    expect(guidance.steps).toHaveLength(3);
  });

  it('should handle complete save error flow with retry', async () => {
    const errorHandler = new ErrorHandler();
    const retryService = new RetryService();
    const feedbackService = new FeedbackService();

    const mockSave = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({ id: '123' });

    // First attempt fails
    try {
      await mockSave();
    } catch (error) {
      const errorResult = errorHandler.handleNetworkError(error as Error);
      expect(errorResult.retryable).toBe(true);

      // Retry with service
      const result = await retryService.execute(mockSave, { maxRetries: 1, delay: 10 });
      expect(result).toEqual({ id: '123' });

      // Success feedback
      const feedback = feedbackService.createSuccess('データが保存されました');
      expect(feedback.type).toBe('success');
    }
  });

  it('should handle empty state scenarios', () => {
    const guidanceService = new UserGuidanceService();

    // No records
    const noRecordsGuidance = guidanceService.createEmptyStateGuidance('no-records');
    expect(noRecordsGuidance.actionLabel).toBe('記録を作成');

    // No search results
    const noSearchGuidance = guidanceService.createEmptyStateGuidance('no-search-results');
    expect(noSearchGuidance.actionLabel).toBe('検索条件をリセット');

    // No photos
    const noPhotosGuidance = guidanceService.createEmptyStateGuidance('no-photos');
    expect(noPhotosGuidance.actionLabel).toBe('写真を追加');
  });
});