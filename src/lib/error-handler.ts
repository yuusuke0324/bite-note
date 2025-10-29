// エラーハンドリングサービス

export interface ErrorResult {
  type: string;
  message: string;
  actionLabel?: string;
  retryable?: boolean;
}

export class ErrorHandler {
  /**
   * GPS関連エラーの処理
   */
  handleGPSError(error: Error): ErrorResult {
    switch (error.name) {
      case 'NotSupportedError':
        return {
          type: 'GPS_NOT_SUPPORTED',
          message: 'GPS機能が利用できません。手動で位置情報を入力してください。',
          actionLabel: '手動入力',
          retryable: false
        };

      case 'PermissionDeniedError':
        return {
          type: 'GPS_PERMISSION_DENIED',
          message: '位置情報の利用が許可されていません。ブラウザの設定を確認してください。',
          actionLabel: '設定を確認',
          retryable: true
        };

      case 'TimeoutError':
        return {
          type: 'GPS_TIMEOUT',
          message: 'GPS取得がタイムアウトしました。手動で位置情報を入力するか、再試行してください。',
          actionLabel: '再試行',
          retryable: true
        };

      default:
        return {
          type: 'GPS_UNKNOWN_ERROR',
          message: '位置情報の取得に失敗しました。手動で位置情報を入力してください。',
          actionLabel: '手動入力',
          retryable: false
        };
    }
  }

  /**
   * 写真アップロード関連エラーの処理
   */
  handlePhotoError(_error: Error, fileInfo?: { size?: number; type?: string }): ErrorResult {
    if (fileInfo?.size && fileInfo.size > 10 * 1024 * 1024) {
      return {
        type: 'FILE_SIZE_ERROR',
        message: 'ファイルサイズが大きすぎます。10MB以下の画像を選択してください。',
        actionLabel: '画像を選び直す',
        retryable: true
      };
    }

    if (fileInfo?.type && !['image/jpeg', 'image/png', 'image/webp'].includes(fileInfo.type)) {
      return {
        type: 'INVALID_FILE_TYPE',
        message: '対応していないファイル形式です。JPEG、PNG、WebP形式の画像を選択してください。',
        actionLabel: '画像を選び直す',
        retryable: true
      };
    }

    return {
      type: 'PHOTO_UPLOAD_ERROR',
      message: '画像のアップロードに失敗しました。もう一度お試しください。',
      actionLabel: '再試行',
      retryable: true
    };
  }

  /**
   * ネットワーク関連エラーの処理
   */
  handleNetworkError(error: Error): ErrorResult {
    if (error.message.includes('fetch')) {
      return {
        type: 'NETWORK_ERROR',
        message: 'ネットワークエラーが発生しました。接続を確認してください。',
        actionLabel: '再試行',
        retryable: true
      };
    }

    return {
      type: 'NETWORK_ERROR',
      message: 'ネットワークエラーが発生しました。接続を確認してください。',
      actionLabel: '再試行',
      retryable: true
    };
  }

  /**
   * データ保存関連エラーの処理
   */
  handleSaveError(error: Error): ErrorResult {
    if (error.message.includes('quota')) {
      return {
        type: 'STORAGE_QUOTA_ERROR',
        message: 'ストレージ容量が不足しています。不要なデータを削除してください。',
        actionLabel: 'データ管理',
        retryable: false
      };
    }

    return {
      type: 'SAVE_ERROR',
      message: 'データの保存に失敗しました。再試行してください。',
      actionLabel: '再試行',
      retryable: true
    };
  }

  /**
   * 一般的なエラーハンドリング
   */
  handleGenericError(_error: Error): ErrorResult {
    return {
      type: 'GENERIC_ERROR',
      message: '予期しないエラーが発生しました。ページを再読み込みしてください。',
      actionLabel: '再読み込み',
      retryable: true
    };
  }
}