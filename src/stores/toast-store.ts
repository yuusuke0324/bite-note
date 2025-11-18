// トースト通知状態管理
// Phase 3-1: GPS、写真、フォームバリデーションエラーのトースト管理

import { create } from 'zustand';

export interface ToastAction {
  label: string;
  handler: () => void;
  primary?: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  actions?: ToastAction[];
}

interface ToastStore {
  toasts: Toast[];

  // アクション
  showToast: (params: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;

  // 便利メソッド
  showError: (message: string, actions?: ToastAction[]) => void;
  showWarning: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  // トーストを表示
  showToast: (params) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = {
      id,
      ...params,
      // デフォルト値
      duration: params.duration ?? (params.type === 'error' ? 7000 : 5000),
      position: params.position ?? 'top-right'
    };

    set((state) => ({
      toasts: [...state.toasts, toast]
    }));

    // 自動非表示
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        get().hideToast(id);
      }, toast.duration);
    }
  },

  // トーストを非表示
  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },

  // すべてのトーストをクリア
  clearAllToasts: () => {
    set({ toasts: [] });
  },

  // エラートーストを表示（7秒間）
  showError: (message, actions) => {
    get().showToast({
      type: 'error',
      message,
      duration: 7000, // Criticalエラーは7秒
      actions
    });
  },

  // 警告トーストを表示（5秒間）
  showWarning: (message) => {
    get().showToast({
      type: 'warning',
      message,
      duration: 5000
    });
  },

  // 成功トーストを表示（3秒間）
  showSuccess: (message) => {
    get().showToast({
      type: 'success',
      message,
      duration: 3000
    });
  },

  // 情報トーストを表示（3秒間）
  showInfo: (message) => {
    get().showToast({
      type: 'info',
      message,
      duration: 3000
    });
  }
}));

// セレクタのエクスポート（パフォーマンス最適化用）
export const selectToasts = (state: ToastStore) => state.toasts;
