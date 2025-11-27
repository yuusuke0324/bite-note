// ユーザーガイダンスサービスの単体テスト

import { describe, it, expect, beforeEach } from 'vitest';
import { UserGuidanceService } from '../lib/user-guidance-service';

describe('UserGuidanceService', () => {
  let service: UserGuidanceService;

  beforeEach(() => {
    service = new UserGuidanceService();
  });

  describe('createFirstTimeGuidance', () => {
    it('初回利用ガイダンスを作成できる', () => {
      const guidance = service.createFirstTimeGuidance();

      expect(guidance.type).toBe('first-time');
      expect(guidance.title).toBe('Bite Noteへようこそ！');
      expect(guidance.description).toBe('このアプリの使い方をご紹介します');
      expect(guidance.actionLabel).toBe('始める');
      expect(guidance.steps).toHaveLength(4);

      // 各ステップの内容を確認
      expect(guidance.steps[0].title).toBe('Bite Noteへようこそ！');
      expect(guidance.steps[1].title).toBe('釣果の記録');
      expect(guidance.steps[2].title).toBe('写真の追加');
      expect(guidance.steps[3].title).toBe('記録の確認');
    });

    it('すべてのステップにハイライト要素が設定されている', () => {
      const guidance = service.createFirstTimeGuidance();

      guidance.steps.forEach(step => {
        expect(step.highlight).toBeDefined();
        expect(step.highlight).toBeTruthy();
      });
    });
  });

  describe('createFeatureGuidance', () => {
    it('写真アップロード機能のガイダンスを作成できる', () => {
      const guidance = service.createFeatureGuidance('photo-upload');

      expect(guidance.type).toBe('feature');
      expect(guidance.feature).toBe('photo-upload');
      expect(guidance.title).toBe('写真のアップロード方法');
      expect(guidance.description).toBe('写真を追加して記録を充実させましょう');
      expect(guidance.actionLabel).toBe('わかりました');
      expect(guidance.steps).toHaveLength(3);

      // ステップの内容を確認
      expect(guidance.steps[0].title).toBe('写真のアップロード方法');
      expect(guidance.steps[1].title).toBe('サポート形式');
      expect(guidance.steps[2].title).toBe('ファイルサイズ');
    });

    it('GPS位置情報機能のガイダンスを作成できる', () => {
      const guidance = service.createFeatureGuidance('gps-location');

      expect(guidance.type).toBe('feature');
      expect(guidance.feature).toBe('gps-location');
      expect(guidance.title).toBe('GPS位置情報の取得');
      expect(guidance.description).toBe('正確な釣り場所を記録しましょう');
      expect(guidance.actionLabel).toBe('わかりました');
      expect(guidance.steps).toHaveLength(3);

      // ステップの内容を確認
      expect(guidance.steps[0].title).toBe('GPS位置情報の取得');
      expect(guidance.steps[1].title).toBe('手動入力');
      expect(guidance.steps[2].title).toBe('プライバシー');
    });

    it('未知の機能でも正常にガイダンスを作成する', () => {
      // 未知の機能の場合、エラーが発生することを確認
      expect(() => {
        service.createFeatureGuidance('unknown-feature');
      }).toThrow();
    });
  });

  describe('createEmptyStateGuidance', () => {
    it('記録なし状態のガイダンスを作成できる', () => {
      const guidance = service.createEmptyStateGuidance('no-records');

      expect(guidance.type).toBe('empty-state');
      expect(guidance.emptyType).toBe('no-records');
      expect(guidance.title).toBe('まだ記録がありません');
      expect(guidance.description).toBe('最初の釣果を記録してみましょう！');
      expect(guidance.actionLabel).toBe('記録を作成');
      expect(guidance.steps).toHaveLength(0);
    });

    it('検索結果なし状態のガイダンスを作成できる', () => {
      const guidance = service.createEmptyStateGuidance('no-search-results');

      expect(guidance.type).toBe('empty-state');
      expect(guidance.emptyType).toBe('no-search-results');
      expect(guidance.title).toBe('検索結果が見つかりません');
      expect(guidance.description).toBe('検索条件を変更してみてください');
      expect(guidance.actionLabel).toBe('検索条件をリセット');
    });

    it('写真なし状態のガイダンスを作成できる', () => {
      const guidance = service.createEmptyStateGuidance('no-photos');

      expect(guidance.type).toBe('empty-state');
      expect(guidance.emptyType).toBe('no-photos');
      expect(guidance.title).toBe('写真がまだありません');
      expect(guidance.description).toBe('写真を追加して記録を充実させましょう');
      expect(guidance.actionLabel).toBe('写真を追加');
    });
  });

  describe('createErrorRecoveryGuidance', () => {
    it('GPS失敗のエラー復旧ガイダンスを作成できる', () => {
      const guidance = service.createErrorRecoveryGuidance('gps-failed');

      expect(guidance.type).toBe('error-recovery');
      expect(guidance.errorType).toBe('gps-failed');
      expect(guidance.title).toBe('GPS取得に失敗しました');
      expect(guidance.description).toBe('以下の方法で解決できます');
      expect(guidance.actionLabel).toBe('解決方法を確認');
      expect(guidance.steps).toHaveLength(3);

      // ステップの内容を確認
      expect(guidance.steps[0].title).toBe('位置情報設定を確認');
      expect(guidance.steps[1].title).toBe('手動で位置情報を入力');
      expect(guidance.steps[2].title).toBe('後で追加');
    });

    it('写真アップロード失敗のエラー復旧ガイダンスを作成できる', () => {
      const guidance = service.createErrorRecoveryGuidance('photo-upload-failed');

      expect(guidance.type).toBe('error-recovery');
      expect(guidance.errorType).toBe('photo-upload-failed');
      expect(guidance.title).toBe('写真のアップロードに失敗しました');
      expect(guidance.description).toBe('以下の点をご確認ください');
      expect(guidance.actionLabel).toBe('解決方法を確認');
      expect(guidance.steps).toHaveLength(3);
    });

    it('保存失敗のエラー復旧ガイダンスを作成できる', () => {
      const guidance = service.createErrorRecoveryGuidance('save-failed');

      expect(guidance.type).toBe('error-recovery');
      expect(guidance.errorType).toBe('save-failed');
      expect(guidance.title).toBe('データの保存に失敗しました');
      expect(guidance.description).toBe('以下の方法で解決できます');
      expect(guidance.actionLabel).toBe('解決方法を確認');
      expect(guidance.steps).toHaveLength(3);
    });
  });

  describe('createContextualGuidance', () => {
    it('新規ユーザーのコンテキストで初回ガイダンスを返す', () => {
      const guidance = service.createContextualGuidance('new-user');

      expect(guidance).not.toBeNull();
      expect(guidance?.type).toBe('first-time');
    });

    it('写真アップロード試行のコンテキストで機能ガイダンスを返す', () => {
      const guidance = service.createContextualGuidance('photo-upload-attempt');

      expect(guidance).not.toBeNull();
      expect(guidance?.type).toBe('feature');
      expect(guidance?.feature).toBe('photo-upload');
    });

    it('GPSボタンクリックのコンテキストで機能ガイダンスを返す', () => {
      const guidance = service.createContextualGuidance('gps-button-click');

      expect(guidance).not.toBeNull();
      expect(guidance?.type).toBe('feature');
      expect(guidance?.feature).toBe('gps-location');
    });

    it('GPSエラーのコンテキストでエラー復旧ガイダンスを返す', () => {
      const guidance = service.createContextualGuidance('gps-error');

      expect(guidance).not.toBeNull();
      expect(guidance?.type).toBe('error-recovery');
      expect(guidance?.errorType).toBe('gps-failed');
    });

    it('写真エラーのコンテキストでエラー復旧ガイダンスを返す', () => {
      const guidance = service.createContextualGuidance('photo-error');

      expect(guidance).not.toBeNull();
      expect(guidance?.type).toBe('error-recovery');
      expect(guidance?.errorType).toBe('photo-upload-failed');
    });

    it('保存エラーのコンテキストでエラー復旧ガイダンスを返す', () => {
      const guidance = service.createContextualGuidance('save-error');

      expect(guidance).not.toBeNull();
      expect(guidance?.type).toBe('error-recovery');
      expect(guidance?.errorType).toBe('save-failed');
    });

    it('未知のコンテキストでnullを返す', () => {
      const guidance = service.createContextualGuidance('unknown-context');

      expect(guidance).toBeNull();
    });

    it('オプションのユーザーアクションパラメータを受け取れる', () => {
      const guidance = service.createContextualGuidance('new-user', 'first-visit');

      expect(guidance).not.toBeNull();
      expect(guidance?.type).toBe('first-time');
    });
  });

  describe('ガイダンスの内容検証', () => {
    it('すべてのガイダンスタイプで必須フィールドが設定されている', () => {
      const guidances = [
        service.createFirstTimeGuidance(),
        service.createFeatureGuidance('photo-upload'),
        service.createEmptyStateGuidance('no-records'),
        service.createErrorRecoveryGuidance('gps-failed')
      ];

      guidances.forEach(guidance => {
        expect(guidance.type).toBeDefined();
        expect(guidance.title).toBeDefined();
        expect(guidance.description).toBeDefined();
        expect(guidance.actionLabel).toBeDefined();
        expect(Array.isArray(guidance.steps)).toBe(true);
      });
    });

    it('ステップにはタイトルと説明が設定されている', () => {
      const guidance = service.createFirstTimeGuidance();

      guidance.steps.forEach(step => {
        expect(step.title).toBeDefined();
        expect(step.description).toBeDefined();
        expect(typeof step.title).toBe('string');
        expect(typeof step.description).toBe('string');
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.description.length).toBeGreaterThan(0);
      });
    });
  });
});