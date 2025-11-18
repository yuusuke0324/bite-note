// トーストコンテナコンポーネント
// すべてのトーストを表示する

import React from 'react';
import { useToastStore } from '../stores/toast-store';
import { FeedbackToast } from './FeedbackToast';
import { TestIds } from '../constants/testIds';

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore(state => state.toasts);
  const hideToast = useToastStore(state => state.hideToast);

  return (
    <>
      {toasts.map(toast => {
        // data-testidの決定
        let testId: string;
        switch (toast.type) {
          case 'error':
            testId = TestIds.TOAST_ERROR;
            break;
          case 'warning':
            testId = TestIds.TOAST_WARNING;
            break;
          case 'success':
            testId = TestIds.TOAST_SUCCESS;
            break;
          case 'info':
            testId = TestIds.TOAST_INFO;
            break;
          default:
            testId = 'toast';
        }

        return (
          <div key={toast.id} data-testid={testId}>
            <FeedbackToast
              type={toast.type}
              message={toast.message}
              isVisible={true}
              onClose={() => hideToast(toast.id)}
              duration={toast.duration}
              position={toast.position}
              actions={toast.actions?.map(action => ({
                label: action.label,
                action: action.handler,
                style: action.primary ? 'primary' : 'secondary'
              }))}
            />
          </div>
        );
      })}
    </>
  );
};
