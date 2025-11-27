// ユーザーガイダンスサービス

export interface GuidanceStep {
  title: string;
  description: string;
  image?: string;
  highlight?: string; // CSSセレクタ
}

export interface Guidance {
  type: 'first-time' | 'feature' | 'empty-state' | 'error-recovery';
  title: string;
  description: string;
  steps: GuidanceStep[];
  actionLabel: string;
  feature?: string;
  emptyType?: string;
  errorType?: string;
}

export class UserGuidanceService {
  /**
   * 初回利用ガイダンスを作成
   */
  createFirstTimeGuidance(): Guidance {
    return {
      type: 'first-time',
      title: 'Bite Noteへようこそ！',
      description: 'このアプリの使い方をご紹介します',
      actionLabel: '始める',
      steps: [
        {
          title: 'Bite Noteへようこそ！',
          description: '釣果の記録、写真の保存、統計の確認ができます。',
          highlight: '.app-header'
        },
        {
          title: '釣果の記録',
          description: '「記録登録」タブから新しい釣果を記録できます。日付、場所、魚種、サイズを入力しましょう。',
          highlight: '[data-tab="form"]'
        },
        {
          title: '写真の追加',
          description: '釣った魚の写真を追加して、思い出を残しましょう。',
          highlight: '.photo-upload-area'
        },
        {
          title: '記録の確認',
          description: '「記録一覧」タブから過去の釣果を確認できます。検索やフィルターも利用できます。',
          highlight: '[data-tab="list"]'
        }
      ]
    };
  }

  /**
   * 機能説明ガイダンスを作成
   */
  createFeatureGuidance(feature: string): Guidance {
    const features = {
      'photo-upload': {
        title: '写真のアップロード方法',
        description: '写真を追加して記録を充実させましょう',
        steps: [
          {
            title: '写真のアップロード方法',
            description: 'ドラッグ&ドロップまたはクリックで写真を選択できます。'
          },
          {
            title: 'サポート形式',
            description: 'JPEG、PNG、WebP形式の画像がサポートされています。'
          },
          {
            title: 'ファイルサイズ',
            description: '10MB以下の画像をご利用ください。'
          }
        ]
      },
      'gps-location': {
        title: 'GPS位置情報の取得',
        description: '正確な釣り場所を記録しましょう',
        steps: [
          {
            title: 'GPS位置情報の取得',
            description: 'GPS ボタンをクリックして現在位置を取得できます。'
          },
          {
            title: '手動入力',
            description: 'GPS が利用できない場合は手動で場所を入力してください。'
          },
          {
            title: 'プライバシー',
            description: '位置情報はデバイス内にのみ保存され、外部に送信されません。'
          }
        ]
      }
    };

    const featureInfo = features[feature as keyof typeof features];
    return {
      type: 'feature',
      feature,
      title: featureInfo.title,
      description: featureInfo.description,
      actionLabel: 'わかりました',
      steps: featureInfo.steps
    };
  }

  /**
   * 空状態ガイダンスを作成
   */
  createEmptyStateGuidance(emptyType: string): Guidance {
    const emptyStates = {
      'no-records': {
        title: 'まだ記録がありません',
        description: '最初の釣果を記録してみましょう！',
        actionLabel: '記録を作成'
      },
      'no-search-results': {
        title: '検索結果が見つかりません',
        description: '検索条件を変更してみてください',
        actionLabel: '検索条件をリセット'
      },
      'no-photos': {
        title: '写真がまだありません',
        description: '写真を追加して記録を充実させましょう',
        actionLabel: '写真を追加'
      }
    };

    const stateInfo = emptyStates[emptyType as keyof typeof emptyStates];
    return {
      type: 'empty-state',
      emptyType,
      title: stateInfo.title,
      description: stateInfo.description,
      actionLabel: stateInfo.actionLabel,
      steps: []
    };
  }

  /**
   * エラー復旧ガイダンスを作成
   */
  createErrorRecoveryGuidance(errorType: string): Guidance {
    const errorRecoveries = {
      'gps-failed': {
        title: 'GPS取得に失敗しました',
        description: '以下の方法で解決できます',
        steps: [
          {
            title: '位置情報設定を確認',
            description: 'ブラウザの位置情報許可設定を確認してください。'
          },
          {
            title: '手動で位置情報を入力',
            description: '釣り場の名前や住所を手動で入力できます。'
          },
          {
            title: '後で追加',
            description: '位置情報は後から編集することも可能です。'
          }
        ]
      },
      'photo-upload-failed': {
        title: '写真のアップロードに失敗しました',
        description: '以下の点をご確認ください',
        steps: [
          {
            title: 'ファイル形式を確認',
            description: 'JPEG、PNG、WebP形式の画像をご利用ください。'
          },
          {
            title: 'ファイルサイズを確認',
            description: '10MB以下の画像をご利用ください。'
          },
          {
            title: '再度お試しください',
            description: '問題が解決しない場合は、ページを再読み込みしてください。'
          }
        ]
      },
      'save-failed': {
        title: 'データの保存に失敗しました',
        description: '以下の方法で解決できます',
        steps: [
          {
            title: 'ネットワーク接続を確認',
            description: 'インターネット接続を確認してください。'
          },
          {
            title: 'ストレージ容量を確認',
            description: 'デバイスの容量不足の可能性があります。'
          },
          {
            title: '再試行',
            description: '少し時間をおいてから再度お試しください。'
          }
        ]
      }
    };

    const recoveryInfo = errorRecoveries[errorType as keyof typeof errorRecoveries];
    return {
      type: 'error-recovery',
      errorType,
      title: recoveryInfo.title,
      description: recoveryInfo.description,
      actionLabel: '解決方法を確認',
      steps: recoveryInfo.steps
    };
  }

  /**
   * コンテキストに応じたガイダンスを作成
   */
  createContextualGuidance(context: string, _userAction?: string): Guidance | null {
    // 新規ユーザーの場合
    if (context === 'new-user') {
      return this.createFirstTimeGuidance();
    }

    // 特定の機能を使おうとしている場合
    if (context === 'photo-upload-attempt') {
      return this.createFeatureGuidance('photo-upload');
    }

    if (context === 'gps-button-click') {
      return this.createFeatureGuidance('gps-location');
    }

    // エラー状況の場合
    if (context === 'gps-error') {
      return this.createErrorRecoveryGuidance('gps-failed');
    }

    if (context === 'photo-error') {
      return this.createErrorRecoveryGuidance('photo-upload-failed');
    }

    if (context === 'save-error') {
      return this.createErrorRecoveryGuidance('save-failed');
    }

    return null;
  }
}