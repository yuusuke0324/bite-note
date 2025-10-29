/**
 * TrendChart.tsx - 釣果トレンドグラフコンポーネント
 * 月別の釣果数推移を表示するシンプルなチャート
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { colors } from '../../theme/colors';

export interface TrendChartData {
  month: string;      // '10月' または '2024/10'
  count: number;      // 釣果数
  label?: string;     // オプションのラベル
}

export interface TrendChartProps {
  data: TrendChartData[];
  type?: 'line' | 'bar';
  width?: number | string;
  height?: number;
  showGrid?: boolean;
  title?: string;
  color?: string;
}

/**
 * カスタムツールチップ
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: colors.surface.primary,
          padding: '12px',
          border: `1px solid ${colors.border.light}`,
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <p style={{
          margin: '0 0 4px 0',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: colors.text.primary,
        }}>
          {payload[0].payload.month}
        </p>
        <p style={{
          margin: 0,
          fontSize: '0.875rem',
          color: colors.primary[600],
          fontWeight: '500',
        }}>
          🐟 {payload[0].value}件の記録
        </p>
      </div>
    );
  }
  return null;
};

/**
 * 釣果トレンドグラフコンポーネント
 */
export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  type = 'bar',
  width = '100%',
  height = 250,
  showGrid = true,
  title,
  color = colors.primary[500],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);

  // コンテナの幅を取得してチャート幅を設定
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setChartWidth(Math.max(300, containerWidth - 40)); // 最小300px、余白40px
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.secondary,
          borderRadius: '12px',
          color: colors.text.secondary,
        }}
      >
        データがありません
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '1rem',
          fontWeight: '600',
          color: colors.text.primary,
        }}>
          {title}
        </h3>
      )}
      <div
        ref={containerRef}
        id="trend-chart-container"
        style={{
          width: '100%',
          height: `${height}px`,
          position: 'relative',
          overflow: 'auto',
        }}
      >
        {type === 'bar' ? (
          <BarChart
            data={data}
            width={chartWidth}
            height={height - 20}
            margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.border.light}
                vertical={false}
              />
            )}
            <XAxis
              dataKey="month"
              tick={{ fill: colors.text.secondary, fontSize: 12 }}
              axisLine={{ stroke: colors.border.light }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: colors.text.secondary, fontSize: 12 }}
              axisLine={{ stroke: colors.border.light }}
              tickLine={false}
              allowDecimals={false}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.primary[50] }} />
            <Bar
              dataKey="count"
              fill={color}
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        ) : (
          <LineChart
            data={data}
            width={chartWidth}
            height={height - 20}
            margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.border.light}
                vertical={false}
              />
            )}
            <XAxis
              dataKey="month"
              tick={{ fill: colors.text.secondary, fontSize: 12 }}
              axisLine={{ stroke: colors.border.light }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: colors.text.secondary, fontSize: 12 }}
              axisLine={{ stroke: colors.border.light }}
              tickLine={false}
              allowDecimals={false}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        )}
      </div>
    </div>
  );
};
