// フィードバックサービス

/**
 * フィードバックアイコン名（Lucideアイコン名）
 * - success: Check
 * - error: X
 * - warning: AlertTriangle
 * - info: Info
 */
export type FeedbackIconName = 'Check' | 'X' | 'AlertTriangle' | 'Info';

export interface Feedback {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
  icon: FeedbackIconName;
  dismissible?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

const feedbackIcons: Record<Feedback['type'], FeedbackIconName> = {
  success: 'Check',
  error: 'X',
  warning: 'AlertTriangle',
  info: 'Info'
};

export class FeedbackService {
  /**
   * 成功メッセージを作成
   */
  createSuccess(message: string, duration: number = 3000): Feedback {
    return {
      type: 'success',
      message,
      duration,
      icon: feedbackIcons.success,
      dismissible: true
    };
  }

  /**
   * エラーメッセージを作成
   */
  createError(message: string, duration: number = 5000): Feedback {
    return {
      type: 'error',
      message,
      duration,
      icon: feedbackIcons.error,
      dismissible: true
    };
  }

  /**
   * 警告メッセージを作成
   */
  createWarning(message: string, duration: number = 4000): Feedback {
    return {
      type: 'warning',
      message,
      duration,
      icon: feedbackIcons.warning,
      dismissible: true
    };
  }

  /**
   * 情報メッセージを作成
   */
  createInfo(message: string, duration: number = 4000): Feedback {
    return {
      type: 'info',
      message,
      duration,
      icon: feedbackIcons.info,
      dismissible: true
    };
  }

  /**
   * アクション付きフィードバックを作成
   */
  createWithActions(
    type: Feedback['type'],
    message: string,
    actions: Feedback['actions'],
    duration: number = 6000
  ): Feedback {
    return {
      type,
      message,
      duration,
      icon: feedbackIcons[type],
      dismissible: true,
      actions
    };
  }

  /**
   * 保存成功フィードバック
   */
  createSaveSuccess(itemName: string = 'データ'): Feedback {
    return this.createSuccess(`${itemName}を保存しました`);
  }

  /**
   * 削除成功フィードバック
   */
  createDeleteSuccess(itemName: string = 'データ'): Feedback {
    return this.createSuccess(`${itemName}を削除しました`);
  }

  /**
   * ネットワークエラーフィードバック
   */
  createNetworkError(): Feedback {
    return this.createError('ネットワークエラーが発生しました。接続を確認してください。');
  }

  /**
   * 保存エラーフィードバック（リトライ付き）
   */
  createSaveErrorWithRetry(retryAction: () => void): Feedback {
    return this.createWithActions(
      'error',
      'データの保存に失敗しました',
      [
        {
          label: '再試行',
          action: retryAction
        }
      ]
    );
  }

  /**
   * GPS エラーフィードバック（手動入力案内付き）
   */
  createGPSErrorWithFallback(manualInputAction: () => void): Feedback {
    return this.createWithActions(
      'warning',
      'GPS取得に失敗しました',
      [
        {
          label: '手動入力',
          action: manualInputAction
        }
      ]
    );
  }

  /**
   * 操作完了フィードバック
   */
  createOperationComplete(operation: string): Feedback {
    return this.createSuccess(`${operation}が完了しました`);
  }

  /**
   * バリデーションエラーフィードバック
   */
  createValidationError(fieldName: string, requirement: string): Feedback {
    return this.createError(`${fieldName}は${requirement}が必要です`);
  }
}