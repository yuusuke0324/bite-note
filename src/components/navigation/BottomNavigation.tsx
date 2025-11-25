import React from 'react';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  active?: boolean;
  testId?: string;
}

interface BottomNavigationProps {
  items: NavigationItem[];
  onItemClick: (id: string) => void;
  className?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  items,
  onItemClick,
  className = ''
}) => {
  const navigationStyles: React.CSSProperties = {
    display: 'flex',
    height: '64px',
    backgroundColor: colors.surface.primary,
    borderTop: `1px solid ${colors.border.light}`,
    boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
    position: 'relative',
  };

  const itemStyles = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 4px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease',
    backgroundColor: active ? colors.primary[50] : 'transparent',
    color: active ? colors.primary[600] : colors.text.secondary,
    borderRadius: '8px',
    margin: '4px',
    ...(active && {
      transform: 'translateY(-1px)',
    }),
  });

  const iconStyles: React.CSSProperties = {
    marginBottom: '2px',
    fontSize: '20px',
    transition: 'transform 0.2s ease',
  };

  const labelStyles: React.CSSProperties = {
    ...textStyles.label.small,
    fontSize: '11px',
    lineHeight: 1,
    textAlign: 'center',
  };

  const badgeStyles: React.CSSProperties = {
    position: 'absolute',
    top: '6px',
    right: '12px',
    backgroundColor: colors.semantic.error.main,
    color: colors.text.inverse,
    borderRadius: '10px',
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 600,
    lineHeight: 1,
  };

  return (
    <nav style={navigationStyles} className={className}>
      {items.map((item) => (
        <button
          key={item.id}
          data-testid={item.testId || `nav-${item.id}`}
          style={itemStyles(item.active || false)}
          onClick={() => onItemClick(item.id)}
          onMouseEnter={(e) => {
            if (!item.active) {
              e.currentTarget.style.backgroundColor = colors.surface.hover;
            }
          }}
          onMouseLeave={(e) => {
            if (!item.active) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          aria-label={item.label}
          aria-selected={item.active}
          aria-current={item.active ? 'page' : undefined}
          role="tab"
          tabIndex={0}
        >
          <div style={iconStyles}>
            {item.icon}
          </div>
          <span style={labelStyles}>
            {item.label}
          </span>

          {/* バッジ */}
          {item.badge && item.badge > 0 && (
            <div style={badgeStyles}>
              {item.badge > 99 ? '99+' : item.badge}
            </div>
          )}
        </button>
      ))}
    </nav>
  );
};

export default BottomNavigation;