/**
 * ViewportDetector - ビューポート検出ユーティリティ
 * TASK-001: レスポンシブユーティリティ実装
 */

import type {
  ViewportInfo,
  DeviceType,
  Orientation,
  IViewportDetector
} from './types';
import { VIEWPORT_BREAKPOINTS } from './types';
import { createTimer, type TimerHandle } from './timer-utils';

/**
 * ビューポート検出・監視クラス
 */
export class ViewportDetector implements IViewportDetector {
  private callbacks: Set<(viewport: ViewportInfo) => void> = new Set();
  private resizeTimeout: TimerHandle | null = null;
  private isListening = false;

  constructor() {
    this.handleResize = this.handleResize.bind(this);
  }

  /**
   * 現在のビューポート情報を取得
   */
  getCurrentViewport(): ViewportInfo {
    // 負の値やゼロ値の場合はデフォルト値を使用
    const rawWidth = window.innerWidth || 0;
    const rawHeight = window.innerHeight || 0;
    const width = rawWidth <= 0 ? 320 : rawWidth; // モバイル最小幅
    const height = rawHeight <= 0 ? 568 : rawHeight; // モバイル最小高さ

    return {
      width,
      height,
      deviceType: this.determineDeviceType(width),
      orientation: this.determineOrientation(width, height),
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  /**
   * ビューポート変更の監視を開始
   */
  onViewportChange(callback: (viewport: ViewportInfo) => void): () => void {
    this.callbacks.add(callback);

    // 初回リスナー登録時にイベント監視開始
    if (!this.isListening) {
      window.addEventListener('resize', this.handleResize);
      this.isListening = true;
    }

    // アンサブスクライブ関数を返す
    return () => {
      this.callbacks.delete(callback);

      // 全てのコールバックが削除されたらイベント監視停止
      if (this.callbacks.size === 0 && this.isListening) {
        window.removeEventListener('resize', this.handleResize);
        this.isListening = false;

        if (this.resizeTimeout) {
          this.resizeTimeout.clear();
          this.resizeTimeout = null;
        }
      }
    };
  }

  /**
   * デバイス種別を判定
   */
  private determineDeviceType(width: number): DeviceType {
    if (width <= VIEWPORT_BREAKPOINTS.MOBILE_MAX) {
      return 'mobile';
    } else if (width <= VIEWPORT_BREAKPOINTS.TABLET_MAX) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * 画面向きを判定
   */
  private determineOrientation(width: number, height: number): Orientation {
    return width > height ? 'landscape' : 'portrait';
  }

  /**
   * リサイズイベントハンドラー（デバウンス付き）
   */
  private handleResize(): void {
    if (this.resizeTimeout) {
      this.resizeTimeout.clear();
    }

    this.resizeTimeout = createTimer(() => {
      const viewport = this.getCurrentViewport();

      // 全てのコールバックに通知
      this.callbacks.forEach(callback => {
        try {
          callback(viewport);
        } catch (error) {
          console.error('ViewportDetector callback error:', error);
        }
      });

      this.resizeTimeout = null;
    }, 100); // 100msデバウンス
  }
}