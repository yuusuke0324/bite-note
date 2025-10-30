/**
 * SpeciesChartSection.tsx - 魚種別の記録数セクション
 * 円グラフで魚種別の記録数を可視化
 */

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';
import type { FishingRecord } from '../../types';

interface SpeciesData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface SpeciesChartSectionProps {
  records: FishingRecord[];
  onSpeciesClick?: (species: string) => void;
  className?: string;
}

// 魚種別のカラーパレット
const SPECIES_COLORS = [
  colors.primary[500],
  colors.primary[400],
  colors.primary[600],
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
];

export const SpeciesChartSection: React.FC<SpeciesChartSectionProps> = ({
  records,
  onSpeciesClick,
  className = ''
}) => {
  // 魚種別データを生成
  const speciesChartData = useMemo((): SpeciesData[] => {
    if (records.length === 0) return [];

    const speciesCounts = new Map<string, number>();

    // 各魚種の記録数をカウント
    records.forEach(record => {
      const count = speciesCounts.get(record.fishSpecies) || 0;
      speciesCounts.set(record.fishSpecies, count + 1);
    });

    const totalRecords = records.length;

    // 記録数順にソート
    const sorted = Array.from(speciesCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    // トップ7を取得
    const topSpecies = sorted.slice(0, 7);

    // 8位以降は「その他」に集約
    const othersCount = sorted.slice(7).reduce((sum, [, count]) => sum + count, 0);

    // データを整形
    const chartData: SpeciesData[] = topSpecies.map(([name, value], index) => ({
      name,
      value,
      percentage: Math.round((value / totalRecords) * 100),
      color: SPECIES_COLORS[index % SPECIES_COLORS.length],
    }));

    // 「その他」がある場合は追加
    if (othersCount > 0) {
      chartData.push({
        name: 'その他',
        value: othersCount,
        percentage: Math.round((othersCount / totalRecords) * 100),
        color: '#CCCCCC',
      });
    }

    return chartData;
  }, [records]);

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as SpeciesData;
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
            ...textStyles.body.medium,
            fontWeight: '600',
            color: colors.text.primary,
          }}>
            {data.name}
          </p>
          <p style={{
            margin: 0,
            ...textStyles.body.small,
            color: colors.text.secondary,
          }}>
            {data.value}件 ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // カスタムラベル
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // 5%未満の場合はラベルを表示しない
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (speciesChartData.length === 0) {
    return (
      <div
        className={`species-chart-section ${className}`}
        style={{
          padding: '24px',
          borderRadius: '16px',
          backgroundColor: colors.surface.secondary,
          textAlign: 'center',
        }}
      >
        <div style={{
          fontSize: '3rem',
          marginBottom: '12px',
        }}>
          🐟
        </div>
        <p style={{
          ...textStyles.body.medium,
          color: colors.text.secondary,
          margin: 0,
        }}>
          まだ魚種の記録がありません
        </p>
      </div>
    );
  }

  return (
    <div className={`species-chart-section ${className}`}>
      {/* ヘッダー */}
      <h2 style={{
        margin: '0 0 12px 0',
        ...textStyles.title.medium,
        color: colors.text.primary,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span>📊</span>
        <span>魚種別の記録数</span>
      </h2>

      {/* チャート */}
      <div style={{
        backgroundColor: colors.surface.primary,
        borderRadius: '16px',
        padding: '16px',
        border: `1px solid ${colors.border.light}`,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '24px',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {/* 円グラフ */}
          <div style={{
            flex: '0 0 auto',
          }}>
            <PieChart width={280} height={280}>
              <Pie
                data={speciesChartData as any}
                cx={140}
                cy={140}
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={90}
                innerRadius={54}
                fill="#8884d8"
                dataKey="value"
                onClick={(data) => {
                  if (onSpeciesClick && data.name !== 'その他') {
                    onSpeciesClick(data.name);
                  }
                }}
                style={{ cursor: onSpeciesClick ? 'pointer' : 'default' }}
              >
                {speciesChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </div>

          {/* 凡例（スクロール対応） */}
          <div style={{
            flex: '1 1 200px',
            minWidth: '200px',
            maxWidth: '300px',
            maxHeight: '280px',
            overflowY: 'auto',
            padding: '8px',
            borderRadius: '8px',
            backgroundColor: colors.surface.secondary,
          }}>
            {speciesChartData.map((item, index) => (
              <div
                key={`legend-${index}`}
                onClick={() => {
                  if (onSpeciesClick && item.name !== 'その他') {
                    onSpeciesClick(item.name);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  marginBottom: '6px',
                  borderRadius: '8px',
                  backgroundColor: colors.surface.primary,
                  border: `1px solid ${colors.border.light}`,
                  cursor: onSpeciesClick && item.name !== 'その他' ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (onSpeciesClick && item.name !== 'その他') {
                    e.currentTarget.style.backgroundColor = colors.surface.secondary;
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.surface.primary;
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {/* カラーアイコン */}
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  flexShrink: 0,
                }} />

                {/* 魚種名 */}
                <div style={{
                  flex: 1,
                  ...textStyles.body.small,
                  color: colors.text.primary,
                  fontWeight: '500',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.name}
                </div>

                {/* 件数とパーセント */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                }}>
                  <span style={{
                    ...textStyles.body.small,
                    color: colors.text.secondary,
                  }}>
                    {item.value}件
                  </span>
                  <span style={{
                    ...textStyles.body.small,
                    color: colors.text.primary,
                    fontWeight: '600',
                    minWidth: '40px',
                    textAlign: 'right',
                  }}>
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 統計情報 */}
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${colors.border.light}`,
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              ...textStyles.body.small,
              color: colors.text.secondary,
              marginBottom: '4px',
            }}>
              総記録数
            </div>
            <div style={{
              ...textStyles.title.small,
              color: colors.text.primary,
              fontWeight: '700',
            }}>
              {records.length}件
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              ...textStyles.body.small,
              color: colors.text.secondary,
              marginBottom: '4px',
            }}>
              魚種数
            </div>
            <div style={{
              ...textStyles.title.small,
              color: colors.text.primary,
              fontWeight: '700',
            }}>
              {speciesChartData.length}種
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
