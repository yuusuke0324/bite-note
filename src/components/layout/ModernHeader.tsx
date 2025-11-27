import React, { type ReactNode } from 'react';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';

type TabType = 'home' | 'form' | 'list' | 'map' | 'debug';

interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  avatar?: ReactNode;
  onMenuClick?: () => void;
  showMenu?: boolean;
  className?: string;
  logo?: ReactNode;
  activeTab?: TabType;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  title,
  subtitle,
  actions,
  avatar,
  onMenuClick,
  showMenu = false,
  className = '',
  logo,
  activeTab: _activeTab
}) => {
  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: 'var(--color-background-primary)',
    boxShadow: '0 2px 8px var(--color-border-light)',
    minHeight: '64px',
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const leftSectionStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  };

  const titleSectionStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0,
    flex: 1,
  };

  const titleRowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const titleStyles: React.CSSProperties = {
    ...textStyles.headline.small,
    color: '#FFFFFF',
    margin: 0,
    fontWeight: 800,
    fontSize: '22px',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
  };

  const subtitleStyles: React.CSSProperties = {
    ...textStyles.body.small,
    color: 'rgba(255, 255, 255, 0.75)',
    margin: 0,
    marginTop: '2px',
    fontSize: '13px',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const rightSectionStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  };

  const menuButtonStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#FFFFFF',
    transition: 'all 0.2s ease',
    fontSize: '20px',
  };

  const MenuIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
  );

  return (
    <header style={headerStyles} className={className}>
      <div style={leftSectionStyles}>
        {/* メニューボタン（モバイル） */}
        {showMenu && onMenuClick && (
          <button
            style={menuButtonStyles}
            onClick={onMenuClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.surface.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="メニューを開く"
          >
            <MenuIcon />
          </button>
        )}

        {/* タイトルセクション */}
        <div style={titleSectionStyles}>
          <div style={titleRowStyles}>
            {logo}
            <h1 style={titleStyles}>{title}</h1>
          </div>
          {subtitle && (
            <p style={subtitleStyles}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* 右側のアクション */}
      <div style={rightSectionStyles}>
        {actions}
        {avatar}
      </div>
    </header>
  );
};

export default ModernHeader;