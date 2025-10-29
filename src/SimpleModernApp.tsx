import React from 'react';
import { colors } from './theme/colors';

function SimpleModernApp() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background.primary,
      color: colors.text.primary,
      padding: '2rem',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <h1 style={{
        fontSize: '2rem',
        marginBottom: '1rem',
        color: colors.primary[500],
      }}>
        🎣 モダン釣果記録アプリ
      </h1>

      <p style={{
        fontSize: '1.1rem',
        color: colors.text.secondary,
        marginBottom: '2rem',
      }}>
        アプリが正常に表示されています！
      </p>

      <div style={{
        padding: '1.5rem',
        backgroundColor: colors.surface.primary,
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: `1px solid ${colors.border.light}`,
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          marginBottom: '1rem',
          color: colors.text.primary,
        }}>
          ✅ モダンデザインシステム動作確認
        </h2>

        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}>
          <li style={{ marginBottom: '0.5rem' }}>
            ✅ カラーシステム: {colors.primary[500]}
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            ✅ タイポグラフィ: Inter フォント
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            ✅ レイアウト: フレックスボックス
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            ✅ スタイリング: CSS-in-JS
          </li>
        </ul>
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: colors.primary[50],
        borderRadius: '8px',
        border: `1px solid ${colors.primary[200]}`,
      }}>
        <p style={{
          margin: 0,
          color: colors.primary[700],
          fontSize: '0.9rem',
        }}>
          📝 このページが表示されていれば、基本的なモダンデザインシステムは正常に動作しています。
        </p>
      </div>
    </div>
  );
}

export default SimpleModernApp;