import React, { type ReactNode } from 'react';
// import { textStyles, typography } from '../../theme/typography';

interface AppLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  navigation?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  header,
  navigation,
  sidebar,
  footer,
  className = ''
}) => {
  const layoutStyles: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, system-ui, sans-serif',
    backgroundColor: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
  };

  const mainContentStyles: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
  };

  const contentAreaStyles: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0, // フレックス子要素の overflow 対策
  };

  const sidebarStyles: React.CSSProperties = {
    width: '280px',
    backgroundColor: 'var(--color-surface-primary)',
    borderRight: '1px solid var(--color-border-light)',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    // デスクトップでのみ表示（CSSメディアクエリは別途追加）
    display: 'none',
  };

  return (
    <div style={layoutStyles} className={className}>
      {/* ヘッダー */}
      {header && (
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          {header}
        </header>
      )}

      {/* メインコンテンツエリア */}
      <div style={mainContentStyles}>
        {/* サイドバー（デスクトップのみ） */}
        {sidebar && (
          <aside style={sidebarStyles}>
            {sidebar}
          </aside>
        )}

        {/* コンテンツエリア */}
        <div style={contentAreaStyles}>
          <main style={{
            flex: 1,
            padding: '0',
            paddingBottom: navigation ? '56px' : '0',
            overflow: 'auto',
          }}>
            {children}
          </main>

          {/* フッター */}
          {footer && (
            <footer style={{
              backgroundColor: 'var(--color-surface-primary)',
              borderTop: '1px solid var(--color-border-light)',
              padding: '1rem',
            }}>
              {footer}
            </footer>
          )}
        </div>
      </div>

      {/* ボトムナビゲーション（モバイルのみ） */}
      {navigation && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100, // FishingRecordDetail(1000)より上に表示
          // モバイルでのみ表示（CSSメディアクエリは別途追加）
          display: 'block',
        }}>
          {navigation}
        </nav>
      )}
    </div>
  );
};

export default AppLayout;