import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ModernApp from './ModernApp.tsx'

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
    <ModernApp />
  </StrictMode>,
)
