import React from 'react';
import { colors } from './theme/colors';
// import { textStyles } from './theme/typography';
// import { useAppStore, selectRecords } from './stores/app-store';

// 1つずつコンポーネントをテスト
import AppLayout from './components/layout/AppLayout';

function TestModernApp() {
  // const records = useAppStore(selectRecords);

  // 超シンプルなヘッダー
  const SimpleHeader = () => (
    <div style={{
      backgroundColor: colors.primary[500],
      color: colors.text.inverse,
      padding: '1rem 2rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      <h1 style={{
        margin: 0,
        fontSize: '1.5rem',
        fontWeight: 600,
      }}>
        🎣 AppLayoutテスト
      </h1>
    </div>
  );

  return (
    <AppLayout
      header={<SimpleHeader />}
    >
      <div style={{ padding: '2rem' }}>
        <h2>AppLayoutテスト</h2>
        <p>このページが表示されればAppLayoutは正常です。</p>
        <p>Typography、Storeなどは一時的にコメントアウト</p>
      </div>
    </AppLayout>
  );
}

export default TestModernApp;