/**
 * TASK-001: レスポンシブ TideGraphコンポーネント
 *
 * 要件:
 * - SVGベースのインタラクティブグラフ
 * - 24時間の潮位変化可視化
 * - 釣果時刻マーカー表示
 * - リアルタイムアニメーション
 * - レスポンシブ対応 (横スクロール防止)
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { TideGraphData } from '../types/tide';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { calculateSVGDimensions, createResponsiveConfig, generateResponsiveCSS } from '../utils/responsive';
import type { ResponsiveGraphConfig } from '../utils/responsive';
import { TestIds } from '../constants/testIds';
import { DynamicScaleCalculator } from '../utils/scale/DynamicScaleCalculator';
import { ScaleRenderer } from '../utils/scale/ScaleRenderer';

interface TideGraphProps {
  data: TideGraphData;
  width: number;
  height: number;
  animated?: boolean;
  loading?: boolean;
  // 新規追加: レスポンシブ対応プロパティ
  responsiveConfig?: Partial<ResponsiveGraphConfig>;
}

export const TideGraph: React.FC<TideGraphProps> = ({
  data,
  width,
  height,
  animated = false,
  loading = false,
  responsiveConfig
}) => {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    time: string;
    level: string;
    state: string;
  } | null>(null);

  // レスポンシブ設定
  const config = useMemo(() => createResponsiveConfig(responsiveConfig), [responsiveConfig]);

  // コンテナサイズ監視
  const [containerRef, resizeEntry] = useResizeObserver<HTMLDivElement>();

  // 動的SVG寸法計算
  const svgDimensions = useMemo(() => {
    if (!config.responsive || !resizeEntry) {
      // レスポンシブ無効または初期状態では従来の固定サイズを使用
      return {
        containerWidth: width,
        containerHeight: height,
        viewBoxWidth: width,
        viewBoxHeight: height,
        scaleFactor: 1
      };
    }

    return calculateSVGDimensions({
      containerWidth: resizeEntry.width,
      aspectRatio: config.aspectRatio,
      deviceType: resizeEntry.deviceType,
      maxWidth: parseInt(config.maxWidth.replace('%', '')) || undefined
    });
  }, [config, resizeEntry, width, height]);

  // データ検証とエラーハンドリング
  const isValidData = useMemo(() => {
    if (!data || !data.points || data.points.length === 0) {
      return false;
    }

    const validPoints = data.points.filter(point =>
      point.time instanceof Date &&
      !isNaN(point.time.getTime()) &&
      typeof point.level === 'number' &&
      !isNaN(point.level)
    );

    const isValid = validPoints.length > 0;

    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 TideGraph: データ検証結果', {
        totalPoints: data.points.length,
        validPoints: validPoints.length,
        invalidPoints: data.points.length - validPoints.length,
        isValid,
        firstFewPoints: data.points.slice(0, 3).map(p => ({
          time: p.time instanceof Date ? p.time.toISOString() : p.time,
          level: p.level,
          timeValid: p.time instanceof Date && !isNaN(p.time.getTime()),
          levelValid: typeof p.level === 'number' && !isNaN(p.level)
        }))
      });
    }

    return isValid;
  }, [data]);

  // 動的マージン設定（確実にプラス値を保証）
  const margin = useMemo(() => {
    const availableWidth = svgDimensions.viewBoxWidth;
    const availableHeight = svgDimensions.viewBoxHeight;

    // 軸ラベル表示に必要な最小サイズ
    const minChartWidth = 300;
    const minChartHeight = 200;

    // 軸ラベル領域を確保するマージン
    const maxHorizontalMargin = Math.max(availableWidth - minChartWidth, 120);
    const maxVerticalMargin = Math.max(availableHeight - minChartHeight, 80);

    // 軸ラベル表示に最適化されたマージン
    const left = 60;   // Y軸ラベル用
    const right = 20;  // 余白
    const top = 20;    // 余白
    const bottom = 40; // X軸ラベル用

    return { top, right, bottom, left };
  }, [svgDimensions.viewBoxWidth, svgDimensions.viewBoxHeight]);

  const rawChartWidth = svgDimensions.viewBoxWidth - margin.left - margin.right;
  const rawChartHeight = svgDimensions.viewBoxHeight - margin.top - margin.bottom;

  // 軸ラベル表示に必要な最小サイズを保証
  const chartWidth = Math.max(rawChartWidth, 300);
  const chartHeight = Math.max(rawChartHeight, 200);


  // デバッグログ: 負の値が発生した場合のみ表示（通常は発生しない）
  if (rawChartWidth < 0 || rawChartHeight < 0) {
    console.warn('🚨 TideGraph: 予期しないSVGサイズ不足', {
      rawChart: { width: rawChartWidth, height: rawChartHeight },
      margin,
      svgSize: { width: svgDimensions.viewBoxWidth, height: svgDimensions.viewBoxHeight }
    });
  }

  // スケール計算（動的スケールシステム統合）
  const { xScale, yScale, dynamicScale } = useMemo(() => {
    if (!isValidData || !data.points || data.points.length === 0) {
      return {
        xScale: () => 0,
        yScale: () => 0,
        dynamicScale: null
      };
    }

    // 時間軸スケール（従来通り）
    const timeRange = data.dateRange.end.getTime() - data.dateRange.start.getTime();
    const xScale = (time: Date) => (time.getTime() - data.dateRange.start.getTime()) / timeRange * chartWidth;

    // TASK-101統合: 動的Y軸スケール計算
    const calculatedScale = DynamicScaleCalculator.calculateScale(data.points, {
      marginRatio: 0.15,
      preferredIntervals: [10, 25, 50, 100, 200],
      forceZero: false
    });

    // 動的スケールに基づくyScale関数
    const dynamicLevelRange = calculatedScale.max - calculatedScale.min;
    const yScale = (level: number) =>
      chartHeight - ((level - calculatedScale.min) / dynamicLevelRange * chartHeight);

    // デバッグログ（開発時のみ表示）
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 TASK-101統合: yScale関数更新', {
        oldRange: `${data.minLevel} - ${data.maxLevel}`,
        newRange: `${calculatedScale.min} - ${calculatedScale.max}`,
        dynamicInterval: calculatedScale.interval
      });
    }

    return {
      xScale,
      yScale,
      dynamicScale: calculatedScale
    };
  }, [data, chartWidth, chartHeight, isValidData]);

  // パスデータ生成
  const pathData = useMemo(() => {
    if (!isValidData) return '';

    return data.points
      .map((point, index) => {
        const x = xScale(point.time);
        const y = yScale(point.level);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [data.points, xScale, yScale, isValidData]);

  // 時間軸ラベル生成（24時間表示用）
  const timeLabels = useMemo(() => {
    if (!isValidData || !data.dateRange) {
      return [];
    }

    const labels = [];

    // 24時間表示の場合は4時間間隔で確実に表示
    const hours = [0, 4, 8, 12, 16, 20];

    hours.forEach(hour => {
      const time = new Date(data.dateRange.start);
      time.setHours(hour, 0, 0, 0);

      const x = xScale(time);
      const label = `${String(hour).padStart(2, '0')}:00`;

      labels.push({
        x,
        label
      });
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 TideGraph: 時間軸ラベル生成完了', {
        labelCount: labels.length,
        labels: labels.map(l => ({ x: l.x, label: l.label })),
        dateRange: {
          start: data.dateRange.start.toISOString(),
          end: data.dateRange.end.toISOString()
        }
      });
    }

    return labels;
  }, [data.dateRange, xScale, isValidData]);

  // Y軸ラベル生成（動的スケールシステム統合）
  const levelLabels = useMemo(() => {
    // 動的スケールが無効な場合のフォールバック
    if (!dynamicScale || !isValidData) {
      // 従来の固定ラベル（フォールバック）
      const fallbackLevels = data.maxLevel && data.minLevel ?
        [data.maxLevel, (data.minLevel + data.maxLevel) / 2, data.minLevel] :
        [200, 0, -200];

      return fallbackLevels.map(level => ({
        y: yScale(level),
        label: `${Math.round(level)}cm`
      }));
    }

    // ScaleRendererによる適切なラベル生成
    const scaleRenderer = new ScaleRenderer(dynamicScale, chartHeight, true);
    const svgElements = scaleRenderer.generateSVGElements(chartWidth);

    // デバッグログ（開発時のみ表示）
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 TASK-101統合: ラベル生成完了', {
        tickCount: svgElements.labels.length,
        labels: svgElements.labels.map(l => l.text),
        yPositions: svgElements.labels.map(l => l.y),
        chartHeight
      });
    }


    return svgElements.labels.map(label => ({
      y: label.y,
      label: label.text
    }));
  }, [dynamicScale, chartHeight, chartWidth, data.maxLevel, data.minLevel, yScale, isValidData]);

  // マウスイベントハンドラー
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGPathElement>) => {
    if (!isValidData) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - margin.left;

    // 最も近いデータポイントを見つける
    const timeRatio = x / chartWidth;
    const targetTime = new Date(
      data.dateRange.start.getTime() +
      (data.dateRange.end.getTime() - data.dateRange.start.getTime()) * timeRatio
    );

    let closestPoint = data.points[0];
    let minDistance = Math.abs(closestPoint.time.getTime() - targetTime.getTime());

    data.points.forEach(point => {
      const distance = Math.abs(point.time.getTime() - targetTime.getTime());
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });

    const stateText = {
      'rising': '上げ潮',
      'falling': '下げ潮',
      'high': '満潮',
      'low': '干潮'
    }[closestPoint.state] || closestPoint.state;

    setTooltip({
      visible: true,
      x: xScale(closestPoint.time),
      y: yScale(closestPoint.level),
      time: closestPoint.time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      level: `${Math.round(closestPoint.level)}cm`,
      state: stateText
    });
  }, [data, xScale, yScale, chartWidth, margin.left, isValidData]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent<SVGPathElement>) => {
    const touch = event.touches[0];
    const mockMouseEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      currentTarget: event.currentTarget
    } as React.MouseEvent<SVGPathElement>;
    handleMouseMove(mockMouseEvent);
  }, [handleMouseMove]);

  // キーボードナビゲーション
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      // キーボードナビゲーションの実装は簡略化
      // Keyboard navigation placeholder
    }
  }, []);

  // ローディング状態
  if (loading) {
    return (
      <div
        data-testid="tide-graph-skeleton"
        className="animate-pulse bg-gray-200 rounded"
        style={{ width, height }}
      >
        <div className="h-full bg-gradient-to-r from-gray-300 to-gray-200"></div>
      </div>
    );
  }

  // エラー状態
  if (!isValidData) {
    return (
      <div
        data-testid="tide-graph-error"
        className="flex items-center justify-center bg-red-50 border border-red-200 rounded"
        style={{ width, height }}
      >
        <div className="text-center text-red-600">
          <p className="font-semibold">潮汐データがありません</p>
          <p className="text-sm mt-1">有効な潮汐情報を読み込めませんでした</p>
        </div>
      </div>
    );
  }

  // レスポンシブCSS生成
  const responsiveCSS = useMemo(() => generateResponsiveCSS(config), [config]);

  return (
    <div
      ref={containerRef}
      data-testid={TestIds.TIDE_GRAPH_CONTAINER}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded ${resizeEntry?.deviceType === 'mobile' ? 'mobile-layout' : resizeEntry?.deviceType === 'tablet' ? 'tablet-layout' : 'desktop-layout'}`}
      style={{
        width: config.responsive ? config.maxWidth : `${width}px`,
        maxWidth: config.maxWidth,
        overflowX: config.preventHorizontalScroll ? 'hidden' : 'auto',
        boxSizing: 'border-box'
      }}
    >
      <svg
        data-testid={TestIds.TIDE_GRAPH_CANVAS}
        width={svgDimensions.containerWidth}
        height={svgDimensions.containerHeight}
        viewBox={`0 0 ${svgDimensions.viewBoxWidth} ${svgDimensions.viewBoxHeight}`}
        role="img"
        aria-label="潮汐グラフ: 24時間の潮位変化を表示"
        className="overflow-visible"
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: '100%'
        }}
      >
        {/* グラデーション定義 */}
        <defs>
          <linearGradient id="tideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`} data-testid={TestIds.TIDE_GRAPH_AREA}>
          {/* X軸 */}
          <g data-testid={TestIds.TIDE_GRAPH_TIME_LABELS}>
            <line
              data-testid={TestIds.X_AXIS_LINE}
              x1={0}
              y1={chartHeight}
              x2={chartWidth}
              y2={chartHeight}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
            {timeLabels.length > 0 ? timeLabels.map((label, index) => (
              <g key={index}>
                <line
                  x1={label.x}
                  y1={chartHeight}
                  x2={label.x}
                  y2={chartHeight + 5}
                  stroke="#9CA3AF"
                  strokeWidth="1"
                />
                <text
                  x={label.x}
                  y={chartHeight + 15}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  data-testid={TestIds.TIME_LABEL(index)}
                  style={{ fontSize: '11px', fill: '#4B5563' }}
                >
                  {label.label}
                </text>
              </g>
            )) : (
              // フォールバック：timeLabelsが空の場合の固定ラベル
              [0, 4, 8, 12, 16, 20].map((hour, index) => {
                const x = (index / 5) * chartWidth;
                return (
                  <g key={`fallback-${index}`}>
                    <line
                      x1={x}
                      y1={chartHeight}
                      x2={x}
                      y2={chartHeight + 5}
                      stroke="#9CA3AF"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={chartHeight + 15}
                      textAnchor="middle"
                      className="text-xs fill-gray-600"
                      style={{ fontSize: '11px', fill: '#4B5563' }}
                    >
                      {`${String(hour).padStart(2, '0')}:00`}
                    </text>
                  </g>
                );
              })
            )}
          </g>

          {/* Y軸 */}
          <g data-testid={TestIds.TIDE_GRAPH_Y_AXIS}>
            <line
              data-testid={TestIds.Y_AXIS_LINE}
              x1={0}
              y1={0}
              x2={0}
              y2={chartHeight}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
            {levelLabels.map((label, index) => (
              <g key={index}>
                <line
                  x1={-5}
                  y1={label.y}
                  x2={0}
                  y2={label.y}
                  stroke="#9CA3AF"
                  strokeWidth="1"
                />
                <text
                  x={-20}
                  y={label.y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                  data-testid={TestIds.LEVEL_LABEL(index)}
                >
                  {label.label}
                </text>
              </g>
            ))}
          </g>

          {/* グリッドライン（ラベルは描画せず、線のみ） */}
          <g data-testid={TestIds.TIDE_GRAPH_GRID}>
            {levelLabels.map((label, index) => (
              <line
                key={`grid-${index}`}
                data-testid={TestIds.GRID_LINE(index)}
                x1={0}
                y1={label.y}
                x2={chartWidth}
                y2={label.y}
                stroke="#F3F4F6"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            ))}
          </g>

          {/* エリアフィル */}
          <path
            data-testid={TestIds.TIDE_AREA}
            d={`${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`}
            fill="url(#tideGradient)"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            className="cursor-crosshair"
          />

          {/* 潮位曲線 */}
          <path
            data-testid={TestIds.TIDE_CURVE}
            d={pathData}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              opacity: animated ? 0 : 1,
              transition: animated ? 'all 2s ease-in-out' : 'none'
            }}
            strokeDasharray={animated ? '1000' : undefined}
            strokeDashoffset={animated ? '1000' : undefined}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            className="cursor-crosshair"
          />

          {/* 満潮・干潮マーカー - 完全非表示（実際の潮汐グラフとの整合性のため） */}
          {/*
          {data.events?.map((event, index) => {
            const x = xScale(event.time);
            const y = yScale(event.level);
            const isHigh = event.type === 'high';

            // マーカー配置の最適化
            const textYOffset = isHigh ? -35 : 35;  // 満潮は上、干潮は下
            const labelYOffset = isHigh ? -50 : 50;

            return (
              <g
                key={`event-${index}`}
                data-testid={`${event.type}-tide-marker-${index}`}
              >
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill={isHigh ? '#EF4444' : '#10B981'}
                  stroke="white"
                  strokeWidth="2"
                />

                <text
                  x={x}
                  y={y + textYOffset}
                  textAnchor="middle"
                  className="text-sm font-bold fill-gray-900"
                  style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}
                >
                  {event.time.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </text>

                <text
                  x={x}
                  y={y + labelYOffset}
                  textAnchor="middle"
                  className="text-xs font-medium"
                  fill={isHigh ? '#EF4444' : '#10B981'}
                >
                  {isHigh ? '満潮' : '干潮'}
                </text>
              </g>
            );
          })}
          */}

          {/* 釣果マーカー */}
          {data.fishingMarkers?.map((marker, index) => (
            <g
              key={`fishing-${index}`}
              data-testid={TestIds.FISHING_MARKER(index)}
            >
              <line
                x1={xScale(marker)}
                y1={0}
                x2={xScale(marker)}
                y2={chartHeight}
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <circle
                cx={xScale(marker)}
                cy={10}
                r="6"
                fill="#F59E0B"
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={xScale(marker)}
                y={-5}
                textAnchor="middle"
                className="text-xs font-medium fill-amber-600"
              >
                🎣
              </text>
            </g>
          ))}

          {/* ツールチップ */}
          {tooltip && (
            <g data-testid={TestIds.TIDE_TOOLTIP}>
              <rect
                x={tooltip.x - 50}
                y={tooltip.y - 60}
                width="100"
                height="50"
                rx="4"
                fill="rgba(0, 0, 0, 0.8)"
                stroke="none"
              />
              <text
                x={tooltip.x}
                y={tooltip.y - 40}
                textAnchor="middle"
                className="text-xs fill-white font-medium"
              >
                {tooltip.time}
              </text>
              <text
                x={tooltip.x}
                y={tooltip.y - 25}
                textAnchor="middle"
                className="text-xs fill-white"
              >
                {tooltip.level}
              </text>
              <text
                x={tooltip.x}
                y={tooltip.y - 10}
                textAnchor="middle"
                className="text-xs fill-white"
              >
                {tooltip.state}
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};