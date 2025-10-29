import React, { type ReactNode } from 'react';

interface ResponsiveGridProps {
  children: ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = '16px',
  className = '',
  style = {}
}) => {
  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gap: gap,
    width: '100%',
    // モバイルファースト
    gridTemplateColumns: `repeat(${columns.mobile || 1}, 1fr)`,
    ...style,
  };

  // CSS-in-JSでメディアクエリを実装するためのスタイル
  const responsiveStyles = `
    .responsive-grid {
      display: grid;
      gap: ${gap};
      width: 100%;
      grid-template-columns: repeat(${columns.mobile || 1}, 1fr);
      /* カードの最小・最大幅を制約して一貫性を保つ */
      grid-auto-rows: minmax(160px, auto);
    }

    @media (min-width: 768px) {
      .responsive-grid {
        grid-template-columns: repeat(${columns.tablet || 2}, 1fr);
        /* タブレットでのカードサイズ調整 */
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }
    }

    @media (min-width: 1024px) {
      .responsive-grid {
        grid-template-columns: repeat(${columns.desktop || 3}, 1fr);
        /* デスクトップでのカードサイズ調整 */
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      }
    }

    @media (min-width: 1440px) {
      .responsive-grid {
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        max-width: 1400px;
        margin: 0 auto;
      }
    }
  `;

  return (
    <>
      <style>{responsiveStyles}</style>
      <div
        className={`responsive-grid ${className}`}
        style={gridStyles}
      >
        {children}
      </div>
    </>
  );
};

// プリセットグリッド
export const PhotoGrid: React.FC<Omit<ResponsiveGridProps, 'columns'>> = (props) => (
  <ResponsiveGrid
    {...props}
    columns={{ mobile: 1, tablet: 2, desktop: 3 }}
  />
);

export const CardGrid: React.FC<Omit<ResponsiveGridProps, 'columns'>> = (props) => (
  <ResponsiveGrid
    {...props}
    columns={{ mobile: 1, tablet: 2, desktop: 4 }}
  />
);

export const ListGrid: React.FC<Omit<ResponsiveGridProps, 'columns'>> = (props) => (
  <ResponsiveGrid
    {...props}
    columns={{ mobile: 1, tablet: 1, desktop: 2 }}
  />
);

export default ResponsiveGrid;