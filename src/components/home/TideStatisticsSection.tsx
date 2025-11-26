/**
 * TideStatisticsSection.tsx - 潮汐統計セクション
 * 釣果と潮汐の関係を分析し、最適な釣行タイミングを可視化
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';
import ModernCard from '../ui/ModernCard';
import type { FishingRecord } from '../../types';
import type { TideInfo } from '../../types/tide';
import { logger } from '../../lib/errors/logger';

// カスタムツールチップコンポーネント
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        padding: '12px 16px',
        borderRadius: '12px',
        border: `2px solid ${colors.primary[200]}`,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        backdropFilter: 'blur(10px)',
      }}>
        <p style={{
          margin: '0 0 6px 0',
          fontWeight: '600',
          fontSize: '0.9rem',
          color: colors.text.primary,
        }}>
          {data.name}
        </p>
        <p style={{
          margin: 0,
          fontSize: '1.1rem',
          color: colors.primary[600],
          fontWeight: '700',
        }}>
          {data.value}件 ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

interface TideStatistics {
  // 潮汐タイミング別統計
  tidePhaseStats: {
    beforeHigh: number;     // 満潮前（1時間前〜満潮）
    aroundHigh: number;     // 満潮時（満潮±15分）
    afterHigh: number;      // 満潮後（満潮〜1時間後）
    beforeLow: number;      // 干潮前（1時間前〜干潮）
    aroundLow: number;      // 干潮時（干潮±15分）
    afterLow: number;       // 干潮後（干潮〜1時間後）
    rising: number;         // 上げ潮（干潮→満潮の中間）
    falling: number;        // 下げ潮（満潮→干潮の中間）
  };

  // 潮名別統計
  tideTypeStats: {
    spring: number;         // 大潮
    moderate: number;       // 中潮
    neap: number;           // 小潮
    long: number;           // 長潮
    young: number;          // 若潮
  };

  // 最も釣果が多かったパターン
  bestTidePhase: string;
  bestTideType: string;

  // 統計対象の記録数
  totalRecordsWithTideData: number;
}

interface TideStatisticsSectionProps {
  records: FishingRecord[];
  className?: string;
}

// 潮汐タイミング判定関数
const determineTidePhase = (
  fishingTime: Date,
  tideInfo: TideInfo
): keyof TideStatistics['tidePhaseStats'] => {
  const nextEvent = tideInfo.nextEvent;
  if (!nextEvent) return 'rising'; // デフォルト

  const timeDiff = (nextEvent.time.getTime() - fishingTime.getTime()) / (1000 * 60); // 分単位

  if (nextEvent.type === 'high') {
    if (Math.abs(timeDiff) <= 15) return 'aroundHigh';
    if (timeDiff > 0 && timeDiff <= 60) return 'beforeHigh';
    if (timeDiff < 0 && timeDiff >= -60) return 'afterHigh';
    return timeDiff > 0 ? 'rising' : 'falling';
  } else {
    if (Math.abs(timeDiff) <= 15) return 'aroundLow';
    if (timeDiff > 0 && timeDiff <= 60) return 'beforeLow';
    if (timeDiff < 0 && timeDiff >= -60) return 'afterLow';
    return timeDiff > 0 ? 'falling' : 'rising';
  }
};

// ラベル変換関数
const getTidePhaseName = (phase: string): string => {
  const names: Record<string, string> = {
    beforeHigh: '満潮前',
    aroundHigh: '満潮時',
    afterHigh: '満潮後',
    beforeLow: '干潮前',
    aroundLow: '干潮時',
    afterLow: '干潮後',
    rising: '上げ潮',
    falling: '下げ潮'
  };
  return names[phase] || phase;
};

const getTideTypeName = (type: string): string => {
  const names: Record<string, string> = {
    spring: '大潮',
    moderate: '中潮',
    neap: '小潮',
    long: '長潮',
    young: '若潮'
  };
  return names[type] || type;
};

export const TideStatisticsSection: React.FC<TideStatisticsSectionProps> = ({
  records,
  className = ''
}) => {
  const [tideStats, setTideStats] = useState<TideStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 潮汐統計の計算
  useEffect(() => {
    const calculateTideStatistics = async () => {
      setLoading(true);
      setError(null);

      const stats: TideStatistics = {
        tidePhaseStats: {
          beforeHigh: 0,
          aroundHigh: 0,
          afterHigh: 0,
          beforeLow: 0,
          aroundLow: 0,
          afterLow: 0,
          rising: 0,
          falling: 0
        },
        tideTypeStats: {
          spring: 0,
          moderate: 0,
          neap: 0,
          long: 0,
          young: 0
        },
        bestTidePhase: '',
        bestTideType: '',
        totalRecordsWithTideData: 0
      };

      // GPS座標を持つ記録のみを対象
      const recordsWithCoordinates = records.filter(r => r.coordinates);

      if (recordsWithCoordinates.length === 0) {
        logger.warn('GPS座標を持つ記録がないため、潮汐統計を表示できません');
        setLoading(false);
        return;
      }

      try {
        // 潮汐計算サービスをインポート
        const { TideCalculationService } = await import('../../services/tide/TideCalculationService');

        // 1つのインスタンスを作成して再利用
        const tideService = new TideCalculationService();
        await tideService.initialize();

        // 並列処理で高速化
        const results = await Promise.allSettled(
          recordsWithCoordinates.map(async (record) => {
            const tideInfo = await tideService.calculateTideInfo(record.coordinates!, record.date);
            return { record, tideInfo };
          })
        );

        // 結果を集計
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const { record, tideInfo } = result.value;

            // 潮汐タイミングを判定
            const phase = determineTidePhase(record.date, tideInfo);
            stats.tidePhaseStats[phase]++;

            // 潮名を判定（tideTypeプロパティから）
            if (tideInfo.tideType) {
              const tideType = tideInfo.tideType as keyof TideStatistics['tideTypeStats'];
              if (tideType in stats.tideTypeStats) {
                stats.tideTypeStats[tideType]++;
              }
            }

            stats.totalRecordsWithTideData++;
          }
        }

        // 最も釣果が多かったパターンを特定
        if (stats.totalRecordsWithTideData > 0) {
          const phaseEntries = Object.entries(stats.tidePhaseStats).filter(([, count]) => count > 0);
          if (phaseEntries.length > 0) {
            stats.bestTidePhase = phaseEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
          }

          const typeEntries = Object.entries(stats.tideTypeStats).filter(([, count]) => count > 0);
          if (typeEntries.length > 0) {
            stats.bestTideType = typeEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
          }
        }

        setTideStats(stats);
      } catch (err) {
        logger.error('潮汐統計計算エラー', { error: err });
        setError(err instanceof Error ? err.message : '潮汐統計の計算に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    calculateTideStatistics();
  }, [records]);

  // 横棒グラフ用データ変換
  const tidePhaseData = useMemo(() => {
    if (!tideStats) return [];
    return Object.entries(tideStats.tidePhaseStats)
      .filter(([, count]) => count > 0)
      .map(([phase, count]) => ({
        name: getTidePhaseName(phase),
        value: count,
        percentage: Math.round((count / tideStats.totalRecordsWithTideData) * 100)
      }))
      .sort((a, b) => b.value - a.value);
  }, [tideStats]);

  const tideTypeData = useMemo(() => {
    if (!tideStats) return [];
    return Object.entries(tideStats.tideTypeStats)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        name: getTideTypeName(type),
        value: count,
        percentage: Math.round((count / tideStats.totalRecordsWithTideData) * 100)
      }))
      .sort((a, b) => b.value - a.value);
  }, [tideStats]);

  // ローディング中、エラー、データなしの場合は表示しない
  if (loading || error || !tideStats || tideStats.totalRecordsWithTideData === 0) {
    return null;
  }

  return (
    <div className={`tide-statistics-section ${className}`}>
      <ModernCard variant="outlined" size="md">
        <h2 style={{
          ...textStyles.title.medium,
          color: colors.text.primary,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '1.5rem',
          fontWeight: '700',
          letterSpacing: '-0.02em',
        }}>
          <span style={{ fontSize: '1.6rem' }}>🌊</span>
          <span>潮汐パターン分析</span>
        </h2>

        {/* サマリーカード */}
        {tideStats.bestTidePhase && tideStats.bestTideType && (
          <div style={{
            background: `linear-gradient(135deg, ${colors.primary[50]} 0%, ${colors.secondary[50]} 100%)`,
            padding: '24px',
            borderRadius: '16px',
            marginBottom: '32px',
            border: `2px solid ${colors.primary[100]}`,
            boxShadow: '0 4px 12px rgba(26, 115, 232, 0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* 装飾的な背景要素 */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: `radial-gradient(circle, ${colors.primary[100]}40 0%, transparent 70%)`,
              borderRadius: '50%',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{
                ...textStyles.body.medium,
                margin: '0 0 12px 0',
                color: colors.text.primary,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '500',
              }}>
                <span style={{ fontSize: '1.3rem' }}>💡</span>
                <strong>釣果が最も多かったタイミング</strong>
              </p>
              <p style={{
                ...textStyles.headline.small,
                margin: '0 0 12px 0',
                background: `linear-gradient(135deg, ${colors.primary[700]} 0%, ${colors.secondary[600]} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: '700',
                fontSize: '1.4rem',
                letterSpacing: '-0.02em',
              }}>
                {getTidePhaseName(tideStats.bestTidePhase)} × {getTideTypeName(tideStats.bestTideType)}
              </p>
              <p style={{
                ...textStyles.body.small,
                margin: 0,
                color: colors.text.secondary,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span>📊</span>
                <span>{tideStats.totalRecordsWithTideData}件の記録から分析</span>
              </p>
            </div>
          </div>
        )}

        {/* 潮汐タイミング別グラフ */}
        {tidePhaseData.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              ...textStyles.body.large,
              fontWeight: '700',
              marginBottom: '16px',
              color: colors.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '1.1rem',
            }}>
              <span style={{ fontSize: '1.3rem' }}>⏰</span>
              <span>潮汐タイミング別</span>
            </h3>
            <div style={{
              width: '100%',
              background: `linear-gradient(135deg, ${colors.surface.secondary} 0%, ${colors.surface.primary} 100%)`,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${colors.border.light}`,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              overflowX: 'auto',
            }}>
              <BarChart
                width={Math.max(500, typeof window !== 'undefined' ? Math.min(600, window.innerWidth - 100) : 600)}
                height={Math.max(200, tidePhaseData.length * 65)}
                layout="vertical"
                data={tidePhaseData}
                margin={{ top: 10, right: 80, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="phaseGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={colors.primary[400]} />
                    <stop offset="100%" stopColor={colors.primary[600]} />
                  </linearGradient>
                </defs>
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.text.secondary, fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.text.primary, fontSize: 13, fontWeight: 500 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(26, 115, 232, 0.05)' }} />
                <Bar dataKey="value" fill="url(#phaseGradient)" radius={[0, 12, 12, 0]}>
                  <LabelList
                    dataKey="percentage"
                    position="right"
                    formatter={(value: number) => `${value}%`}
                    style={{ fill: colors.primary[700], fontSize: '0.9rem', fontWeight: '600' }}
                  />
                </Bar>
              </BarChart>
            </div>
          </div>
        )}

        {/* 潮名別グラフ */}
        {tideTypeData.length > 0 && (
          <div>
            <h3 style={{
              ...textStyles.body.large,
              fontWeight: '700',
              marginBottom: '16px',
              color: colors.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '1.1rem',
            }}>
              <span style={{ fontSize: '1.3rem' }}>🌙</span>
              <span>潮名別</span>
            </h3>
            <div style={{
              width: '100%',
              background: `linear-gradient(135deg, ${colors.surface.secondary} 0%, ${colors.surface.primary} 100%)`,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${colors.border.light}`,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              overflowX: 'auto',
            }}>
              <BarChart
                width={Math.max(500, typeof window !== 'undefined' ? Math.min(600, window.innerWidth - 100) : 600)}
                height={Math.max(150, tideTypeData.length * 65)}
                layout="vertical"
                data={tideTypeData}
                margin={{ top: 10, right: 80, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="typeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={colors.secondary[400]} />
                    <stop offset="100%" stopColor={colors.secondary[600]} />
                  </linearGradient>
                </defs>
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.text.secondary, fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: colors.text.primary, fontSize: 13, fontWeight: 500 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(52, 168, 83, 0.05)' }} />
                <Bar dataKey="value" fill="url(#typeGradient)" radius={[0, 12, 12, 0]}>
                  <LabelList
                    dataKey="percentage"
                    position="right"
                    formatter={(value: number) => `${value}%`}
                    style={{ fill: colors.secondary[700], fontSize: '0.9rem', fontWeight: '600' }}
                  />
                </Bar>
              </BarChart>
            </div>
          </div>
        )}
      </ModernCard>
    </div>
  );
};
