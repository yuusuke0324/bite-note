// シンプルなテスト用App
import { useState } from 'react'

function AppSimple() {
  const [message] = useState('🎣 釣果記録アプリが正常に動作しています！')

  return (
    <div style={{
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ color: '#007bff', marginBottom: '1rem' }}>
        {message}
      </h1>
      <p style={{ color: '#6c757d', fontSize: '1.1rem' }}>
        白画面問題のテスト中...
      </p>
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '8px',
        color: '#155724'
      }}>
        ✅ Reactコンポーネントが正常にレンダリングされています
      </div>
    </div>
  )
}

export default AppSimple