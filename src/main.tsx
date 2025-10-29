import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ModernApp from './ModernApp.tsx'

// Service Worker登録（開発中は無効化）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
} else if ('serviceWorker' in navigator) {
  // 開発モード: 既存のService Workerを全て解除
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('🧹 Service Worker unregistered for development');
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModernApp />
  </StrictMode>,
)
