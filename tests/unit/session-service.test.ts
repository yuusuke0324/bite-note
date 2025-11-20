// セッション管理サービス ユニットテスト
// Phase 3-4: セッション管理機能実装

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionService } from '@/lib/session-service';

describe('SessionService', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionService = new SessionService({
      timeoutMs: 1000, // 1秒（テスト用）
      heartbeatIntervalMs: 500, // 0.5秒（テスト用）
    });
  });

  afterEach(() => {
    sessionService.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('セッションタイムアウト検出', () => {
    it('タイムアウト時間経過後にセッションが期限切れになること', async () => {
      sessionService.start();

      // タイムアウトまで進める
      vi.advanceTimersByTime(1001);

      const isValid = await sessionService.checkSession();
      expect(isValid).toBe(false);
    });

    it('タイムアウト時間内であればセッションが有効であること', async () => {
      sessionService.start();

      // タイムアウト前
      vi.advanceTimersByTime(999);

      const isValid = await sessionService.checkSession();
      expect(isValid).toBe(true);
    });

    it('タイムアウト境界値（ちょうど1000ms）で期限切れにならないこと', async () => {
      sessionService.start();

      // ちょうど1000ms
      vi.advanceTimersByTime(1000);

      const isValid = await sessionService.checkSession();
      expect(isValid).toBe(true);
    });

    it('タイムアウト境界値（1001ms）で期限切れになること', async () => {
      sessionService.start();

      // 1001ms
      vi.advanceTimersByTime(1001);

      const isValid = await sessionService.checkSession();
      expect(isValid).toBe(false);
    });
  });

  describe('アクティビティ監視', () => {
    it('click イベントでアクティビティ時刻が更新されること', () => {
      sessionService.start();

      // 半分経過
      vi.advanceTimersByTime(500);
      const beforeElapsed = sessionService.getElapsedTime();

      // clickイベント発火
      window.dispatchEvent(new Event('click'));

      // アクティビティがリセットされているはず
      const afterElapsed = sessionService.getElapsedTime();
      expect(afterElapsed).toBeLessThan(beforeElapsed);
    });

    it('keydown イベントでアクティビティ時刻が更新されること', () => {
      sessionService.start();

      vi.advanceTimersByTime(500);
      window.dispatchEvent(new Event('keydown'));

      const elapsed = sessionService.getElapsedTime();
      expect(elapsed).toBeLessThan(500);
    });

    it('scroll イベントでアクティビティ時刻が更新されること', () => {
      sessionService.start();

      vi.advanceTimersByTime(500);
      window.dispatchEvent(new Event('scroll'));

      const elapsed = sessionService.getElapsedTime();
      expect(elapsed).toBeLessThan(500);
    });

    it('touchstart イベントでアクティビティ時刻が更新されること', () => {
      sessionService.start();

      vi.advanceTimersByTime(500);
      window.dispatchEvent(new Event('touchstart'));

      const elapsed = sessionService.getElapsedTime();
      expect(elapsed).toBeLessThan(500);
    });

    it('アクティビティ更新後にタイムアウトがリセットされること', async () => {
      sessionService.start();

      // 半分経過
      vi.advanceTimersByTime(500);

      // アクティビティ発生
      window.dispatchEvent(new Event('click'));

      // さらに経過（合計1001ms以上だが、リセット後は500msなので有効）
      vi.advanceTimersByTime(501);

      const isValid = await sessionService.checkSession();
      expect(isValid).toBe(true);
    });
  });

  describe('Heartbeat検出', () => {
    it('Heartbeat間隔でセッション有効性がチェックされること', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('session_expired', eventSpy);

      sessionService.start();

      // タイムアウト経過
      vi.advanceTimersByTime(1001);

      // Heartbeat発火（500ms間隔）
      vi.advanceTimersByTime(500);

      // セッション期限切れイベントが発火しているはず
      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('session_expired', eventSpy);
    });

    it('Heartbeat前にセッションが有効な場合はイベントが発火しないこと', () => {
      const eventSpy = vi.fn();
      window.addEventListener('session_expired', eventSpy);

      sessionService.start();

      // タイムアウト前
      vi.advanceTimersByTime(500);

      // Heartbeat発火
      vi.advanceTimersByTime(500);

      // イベントは発火していないはず
      expect(eventSpy).not.toHaveBeenCalled();

      window.removeEventListener('session_expired', eventSpy);
    });
  });

  describe('セッション状態取得', () => {
    it('アクティブ状態の場合は status: "active" を返すこと', () => {
      sessionService.start();

      const state = sessionService.getSessionState();

      expect(state.status).toBe('active');
      expect(state.lastActivityAt).toBeGreaterThan(0);
      expect(state.timeoutDuration).toBe(1000);
    });

    it('期限切れ状態の場合は status: "expired" を返すこと', () => {
      sessionService.start();

      // タイムアウト経過
      vi.advanceTimersByTime(1001);

      const state = sessionService.getSessionState();

      expect(state.status).toBe('expired');
    });

    it('残り時間が正しく計算されること', () => {
      sessionService.start();

      // 500ms経過
      vi.advanceTimersByTime(500);

      const remaining = sessionService.getRemainingTime();

      // 1000ms - 500ms = 500ms
      expect(remaining).toBe(500);
    });

    it('タイムアウト後の残り時間は0であること', () => {
      sessionService.start();

      // タイムアウト経過
      vi.advanceTimersByTime(1001);

      const remaining = sessionService.getRemainingTime();

      expect(remaining).toBe(0);
    });
  });

  describe('セッション管理の開始・停止', () => {
    it('start() でアクティビティ監視が開始されること', () => {
      sessionService.start();

      // clickイベントでアクティビティが更新されることを確認
      vi.advanceTimersByTime(100);
      window.dispatchEvent(new Event('click'));

      const elapsed = sessionService.getElapsedTime();
      expect(elapsed).toBeLessThan(100);
    });

    it('stop() でアクティビティ監視が停止されること', () => {
      sessionService.start();
      sessionService.stop();

      // clickイベントを発火してもアクティビティが更新されないことを確認
      vi.advanceTimersByTime(100);
      const beforeElapsed = sessionService.getElapsedTime();

      window.dispatchEvent(new Event('click'));

      const afterElapsed = sessionService.getElapsedTime();
      expect(afterElapsed).toBeGreaterThanOrEqual(beforeElapsed);
    });

    it('stop() でHeartbeatが停止されること', () => {
      const eventSpy = vi.fn();
      window.addEventListener('session_expired', eventSpy);

      sessionService.start();
      sessionService.stop();

      // タイムアウト経過 + Heartbeat間隔経過
      vi.advanceTimersByTime(1001 + 500);

      // Heartbeatが停止しているので、イベントは発火しない
      expect(eventSpy).not.toHaveBeenCalled();

      window.removeEventListener('session_expired', eventSpy);
    });
  });

  describe('IndexedDB対応確認', () => {
    it('isIndexedDBSupported() でIndexedDB対応を確認できること', () => {
      const isSupported = SessionService.isIndexedDBSupported();
      expect(isSupported).toBe(true);
    });
  });

  describe('エッジケース', () => {
    it('複数回 start() を呼んでも問題なく動作すること', () => {
      sessionService.start();
      sessionService.start();

      const state = sessionService.getSessionState();
      expect(state.status).toBe('active');
    });

    it('stop() を複数回呼んでも問題なく動作すること', () => {
      sessionService.start();
      sessionService.stop();
      sessionService.stop();

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });

    it('start() なしで stop() を呼んでも問題なく動作すること', () => {
      sessionService.stop();

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });
});
