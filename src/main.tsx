import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { AppRoutes } from './Routes.tsx'

// E2Eテスト用: セッション管理フラグを事前に設定
// これにより、ModernAppのuseEffectが実行される前にフラグが利用可能になる
if (import.meta.env.MODE !== 'production' || import.meta.env.VITE_E2E_TEST === 'true') {
  window.sessionServiceStarted = false;
  window.__sessionStore = undefined;
  if (import.meta.env.VITE_E2E_TEST === 'true') {
    console.log('[E2E] Global session flags initialized');
  }
}

// 開発モード: 既存のService Workerを全て解除
// 本番環境のService Worker登録は usePWA フックに一元化
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('[Dev] Service Worker unregistered for development');
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
)
