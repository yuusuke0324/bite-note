import React, { type ReactNode } from 'react';
import { colors } from '../../theme/colors';

interface SimpleAppLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
}

export const SimpleAppLayout: React.FC<SimpleAppLayoutProps> = ({
  children,
  header,
  className = ''
}) => {
  return (
    <div
      className={className}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, sans-serif',
        backgroundColor: 'var(--color-background-primary)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* ヘッダー */}
      {header && (
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'var(--color-surface-primary)',
          borderBottom: `1px solid var(--color-border-light)`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          {header}
        </header>
      )}

      {/* メインコンテンツ */}
      <main style={{
        flex: 1,
        overflow: 'hidden',
      }}>
        {children}
      </main>
    </div>
  );
};

export default SimpleAppLayout;