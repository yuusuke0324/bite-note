import React from 'react';
import { colors } from '../../theme/colors';

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
    height: '56px',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
    position: 'relative',
  };

  const itemStyles = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease',
    backgroundColor: active ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
    color: active ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)',
    borderRadius: '12px',
    margin: '6px 4px',
  });

  const iconStyles: React.CSSProperties = {
    fontSize: '24px',
    transition: 'transform 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const badgeStyles: React.CSSProperties = {
    position: 'absolute',
    top: '4px',
    right: '50%',
    transform: 'translateX(12px)',
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
    <nav
      style={navigationStyles}
      className={className}
      role="tablist"
      aria-label="メインナビゲーション"
    >
      {items.map((item) => (
        <button
          key={item.id}
          data-testid={item.testId || `nav-${item.id}`}
          style={itemStyles(item.active || false)}
          onClick={() => onItemClick(item.id)}
          onMouseEnter={(e) => {
            if (!item.active) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
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