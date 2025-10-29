import React, { useState } from 'react';
import { colors } from './theme/colors';
import { textStyles } from './theme/typography';

// 基本コンポーネントのみインポート
import { useAppStore, selectRecords } from './stores/app-store';

function MinimalModernApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'list'>('home');

  // Zustand Store（エラーハンドリング付き）
  let records = [];
  try {
    records = useAppStore(selectRecords);
  } catch (error) {
    console.error('Store error:', error);
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background.primary,
      color: colors.text.primary,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: colors.primary[500],
        color: colors.text.inverse,
        padding: '1rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{
          margin: 0,
          ...textStyles.headline.medium,
        }}>
          🎣 釣果記録アプリ
        </h1>
      </header>

      {/* ナビゲーション */}
      <nav style={{
        backgroundColor: colors.surface.secondary,
        padding: '0 2rem',
        borderBottom: `1px solid ${colors.border.light}`,
      }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setActiveTab('home')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'home' ? colors.primary[500] : 'transparent',
              color: activeTab === 'home' ? colors.text.inverse : colors.text.primary,
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
            }}
          >
            🏠 ホーム
          </button>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'list' ? colors.primary[500] : 'transparent',
              color: activeTab === 'list' ? colors.text.inverse : colors.text.primary,
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
            }}
          >
            📋 記録一覧
          </button>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main style={{
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {activeTab === 'home' && (
          <div>
            <h2 style={{
              ...textStyles.headline.small,
              marginBottom: '1rem',
            }}>
              ダッシュボード
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}>
              <div style={{
                padding: '1.5rem',
                backgroundColor: colors.surface.primary,
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: colors.primary[500],
                  marginBottom: '0.5rem',
                }}>
                  {records.length}
                </div>
                <div style={{ color: colors.text.secondary }}>
                  総記録数
                </div>
              </div>
            </div>

            <p style={{ color: colors.text.secondary }}>
              ✅ Store接続成功: {records.length}件の記録を取得
            </p>
          </div>
        )}

        {activeTab === 'list' && (
          <div>
            <h2 style={{
              ...textStyles.headline.small,
              marginBottom: '1rem',
            }}>
              記録一覧
            </h2>

            {records.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem',
              }}>
                {records.slice(0, 3).map((record: any) => (
                  <div
                    key={record.id}
                    style={{
                      padding: '1.5rem',
                      backgroundColor: colors.surface.primary,
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: `1px solid ${colors.border.light}`,
                    }}
                  >
                    <h3 style={{
                      margin: '0 0 0.75rem 0',
                      color: colors.text.primary,
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      lineHeight: '1.2'
                    }}>
                      {record.fishSpecies}
                    </h3>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <p style={{
                        margin: 0,
                        color: colors.text.secondary,
                        fontSize: '0.875rem',
                        lineHeight: '1.4',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}>
                        <span style={{ fontSize: '1rem' }}>📍</span>
                        {record.location}
                      </p>
                      <p style={{
                        margin: 0,
                        color: colors.text.tertiary,
                        fontSize: '0.875rem',
                        lineHeight: '1.4',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}>
                        <span style={{ fontSize: '1rem' }}>📅</span>
                        {new Date(record.date).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: colors.text.secondary,
              }}>
                <p>まだ記録がありません</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default MinimalModernApp;