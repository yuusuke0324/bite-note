import React, { type ReactNode } from 'react';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';

interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  avatar?: ReactNode;
  onMenuClick?: () => void;
  showMenu?: boolean;
  className?: string;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  title,
  subtitle,
  actions,
  avatar,
  onMenuClick,
  showMenu = false,
  className = ''
}) => {
  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: colors.surface.primary,
    borderBottom: `1px solid ${colors.border.light}`,
    minHeight: '64px',
    position: 'relative',
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

  const titleStyles: React.CSSProperties = {
    ...textStyles.headline.small,
    color: colors.text.primary,
    margin: 0,
    fontWeight: 700,
    fontSize: '20px',
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const subtitleStyles: React.CSSProperties = {
    ...textStyles.body.small,
    color: colors.text.secondary,
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.2,
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
    color: colors.text.primary,
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
          <h1 style={titleStyles}>{title}</h1>
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