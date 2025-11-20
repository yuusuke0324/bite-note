/**
 * AppRoutes - アプリケーションルーティング設定 (Issue #155 Phase 3-3)
 * react-router-domを使用したSPAルーティング
 */

import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import ModernApp from './ModernApp';
import { DataManagementPanel } from './components/features/DataManagementPanel';

export const AppRoutes = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<ModernApp />} />
        <Route path="/data-management" element={<DataManagementPanel />} />
      </Routes>
    </ErrorBoundary>
  );
};
