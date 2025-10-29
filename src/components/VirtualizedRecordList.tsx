// 仮想スクロール対応記録リストコンポーネント

import React, { useState, useMemo, useCallback } from 'react';
import type { FishingRecord } from '../types';

export interface VirtualizedRecordListProps {
  records: FishingRecord[];
  itemHeight: number;
  containerHeight: number;
  onRecordClick?: (record: FishingRecord) => void;
  renderRecord?: (record: FishingRecord, index: number) => React.ReactNode;
  overscan?: number;
  showStickyHeader?: boolean;
  headerContent?: React.ReactNode;
}

export const VirtualizedRecordList: React.FC<VirtualizedRecordListProps> = ({
  records,
  itemHeight,
  containerHeight,
  onRecordClick,
  renderRecord,
  overscan = 5,
  showStickyHeader = false,
  headerContent
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  // 表示可能なアイテム数を計算
  const visibleCount = Math.ceil(containerHeight / itemHeight);

  // バッファを含む表示範囲を計算
  const totalHeight = records.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    records.length - 1,
    startIndex + visibleCount + overscan * 2
  );

  // 表示するアイテムのリスト
  const visibleItems = useMemo(() => {
    return records.slice(startIndex, endIndex + 1);
  }, [records, startIndex, endIndex]);

  // スクロールハンドラー（デバウンス付き）
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  // デフォルトレンダラー
  const defaultRenderRecord = useCallback((record: FishingRecord, index: number) => (
    <div
      key={record.id}
      data-testid="record-item"
      style={{
        height: itemHeight,
        display: 'flex',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        borderBottom: '1px solid #eee',
        cursor: onRecordClick ? 'pointer' : 'default',
        backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
      }}
      onClick={() => onRecordClick?.(record)}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold' }}>{record.fishSpecies}</div>
        <div style={{ fontSize: '0.8rem', color: '#666' }}>
          {record.location} - {record.date.toLocaleDateString()}
        </div>
      </div>
      <div style={{ fontSize: '0.9rem' }}>
        {record.size}cm
      </div>
    </div>
  ), [itemHeight, onRecordClick]);

  return (
    <div
      style={{
        height: containerHeight,
        position: 'relative',
        border: '1px solid #ddd',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      {/* スティッキーヘッダー */}
      {showStickyHeader && headerContent && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6',
            padding: '0.5rem 1rem'
          }}
        >
          {headerContent}
        </div>
      )}

      {/* スクロール可能なコンテンツ */}
      <div
        data-testid="scroll-container"
        style={{
          height: showStickyHeader ? containerHeight - 40 : containerHeight,
          overflow: 'auto',
          position: 'relative'
        }}
        onScroll={handleScroll}
      >
        {/* 全体の高さを確保するためのスペーサー */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* 表示範囲の開始位置に配置するコンテナ */}
          <div
            style={{
              position: 'absolute',
              top: startIndex * itemHeight,
              width: '100%',
              willChange: 'transform'
            }}
          >
            {visibleItems.map((record, relativeIndex) => {
              const absoluteIndex = startIndex + relativeIndex;
              return (renderRecord || defaultRenderRecord)(record, absoluteIndex);
            })}
          </div>
        </div>
      </div>
    </div>
  );
};