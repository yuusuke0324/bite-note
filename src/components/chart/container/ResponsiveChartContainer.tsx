/**
 * ResponsiveChartContainer.tsx - レスポンシブチャートコンテナ
 * TASK-201: ResponsiveChartContainer実装
 *
 * Green Phase: 完全実装
 */

import React, { useRef, useCallback, useMemo } from 'react';
import type {
  ResponsiveChartContainerProps,
  ContainerSize,
  ContainerState
} from './types';
import type { ViewportInfo } from '../../../utils/responsive/types';
import { ViewportDetector } from '../../../utils/responsive/ViewportDetector';
import { SVGSizeCalculator } from '../../../utils/responsive/SVGSizeCalculator';

/**
 * レスポンシブチャートコンテナ
 *
 * 機能:
 * - 自動サイズ調整
 * - アスペクト比維持
 * - デバイス検出統合
 * - デバウンス付きリサイズ処理
 */
export const ResponsiveChartContainer: React.FC<ResponsiveChartContainerProps> = ({
  children,
  minWidth = 600,
  minHeight = 300,
  aspectRatio = 2.0,
  responsive = true,
  debounceMs = 100,
  className,
  style,
  onSizeChange,
  onDeviceChange,
  enableViewportDetection = true,
  viewportDetector: externalViewportDetector,
  sizeCalculator: externalSizeCalculator
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const viewportDetectorRef = useRef<ViewportDetector | null>(null);
  const sizeCalculatorRef = useRef<SVGSizeCalculator | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // State
  const [state, setState] = React.useState<ContainerState>({
    containerSize: { width: minWidth, height: minHeight },
    currentDevice: 'desktop',
    svgSize: { width: minWidth, height: minHeight },
    isInitialized: false
  });

  // ViewportDetector とSVGSizeCalculator のインスタンス化
  React.useEffect(() => {
    // 外部から提供されていない場合のみインスタンス化
    if (!externalViewportDetector && !viewportDetectorRef.current) {
      viewportDetectorRef.current = new ViewportDetector();
    } else if (externalViewportDetector) {
      viewportDetectorRef.current = externalViewportDetector;
    }

    if (!externalSizeCalculator && !sizeCalculatorRef.current) {
      sizeCalculatorRef.current = new SVGSizeCalculator();
    } else if (externalSizeCalculator) {
      sizeCalculatorRef.current = externalSizeCalculator;
    }
  }, [externalViewportDetector, externalSizeCalculator]);

  // コンテナサイズ計算
  const calculateContainerSize = useCallback((containerElement: HTMLElement | null): ContainerSize => {
    if (!containerElement) {
      return { width: minWidth, height: minHeight };
    }

    const rect = containerElement.getBoundingClientRect();
    let width = Math.max(rect.width || minWidth, minWidth);
    let height = Math.max(rect.height || minHeight, minHeight);

    // アスペクト比維持
    const calculatedHeight = width / aspectRatio;
    if (calculatedHeight < height) {
      height = calculatedHeight;
    }

    return { width, height };
  }, [minWidth, minHeight, aspectRatio]);

  // デバウンス付きサイズ更新
  const updateSize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = window.setTimeout(() => {
      const containerElement = containerRef.current;
      if (!containerElement) return;

      const newSize = calculateContainerSize(containerElement);

      setState(prevState => ({
        ...prevState,
        containerSize: newSize,
        svgSize: newSize,
        isInitialized: true
      }));

      // onSizeChange コールバック
      if (onSizeChange) {
        onSizeChange(newSize);
      }

      resizeTimeoutRef.current = null;
    }, debounceMs);
  }, [calculateContainerSize, debounceMs, onSizeChange]);

  // ViewportDetector のコールバック
  const handleViewportChange = useCallback((viewport: ViewportInfo) => {
    setState(prevState => ({
      ...prevState,
      currentDevice: viewport.deviceType
    }));

    if (onDeviceChange) {
      onDeviceChange(viewport.deviceType);
    }

    // ビューポート変更時にサイズも更新
    updateSize();
  }, [onDeviceChange, updateSize]);

  // 初期化とリサイズ監視
  React.useEffect(() => {
    // 初期サイズ設定
    updateSize();

    if (enableViewportDetection && viewportDetectorRef.current) {
      // 現在のビューポート情報を取得
      const currentViewport = viewportDetectorRef.current.getCurrentViewport();
      setState(prevState => ({
        ...prevState,
        currentDevice: currentViewport.deviceType
      }));

      if (onDeviceChange) {
        onDeviceChange(currentViewport.deviceType);
      }

      // ビューポート変更監視開始
      unsubscribeRef.current = viewportDetectorRef.current.onViewportChange(handleViewportChange);
    } else {
      // ViewportDetection無効時はデフォルトデバイスでコールバック実行
      if (onDeviceChange) {
        onDeviceChange('desktop');
      }
    }

    // リサイズイベント監視
    if (responsive) {
      window.addEventListener('resize', updateSize);
      window.addEventListener('orientationchange', updateSize);
    }

    return () => {
      // クリーンアップ
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      if (responsive) {
        window.removeEventListener('resize', updateSize);
        window.removeEventListener('orientationchange', updateSize);
      }
    };
  }, [responsive, enableViewportDetection, updateSize, handleViewportChange, onDeviceChange]);

  // スタイル計算
  const containerStyle: React.CSSProperties = useMemo(() => ({
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    ...style
  }), [style]);

  const wrapperStyle: React.CSSProperties = useMemo(() => ({
    position: 'relative',
    overflow: 'auto',
    minWidth: `${minWidth}px`,
    minHeight: `${minHeight}px`,
    width: `${state.containerSize.width}px`,
    height: `${state.containerSize.height}px`
  }), [minWidth, minHeight, state.containerSize]);

  const contentStyle: React.CSSProperties = useMemo(() => ({
    width: `${state.svgSize.width}px`,
    height: `${state.svgSize.height}px`
  }), [state.svgSize]);

  return (
    <div
      ref={containerRef}
      className={`responsive-chart-container ${className || ''}`.trim()}
      style={containerStyle}
      data-device={state.currentDevice}
      data-responsive={responsive.toString()}
    >
      <div className="chart-wrapper" style={wrapperStyle}>
        <div className="chart-content" style={contentStyle}>
          {children}
        </div>
      </div>
    </div>
  );
};