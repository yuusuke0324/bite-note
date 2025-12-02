// 釣果記録詳細コンポーネント

import React, { useState, useEffect, useMemo, useRef } from 'react';
// import { textStyles, typography } from '../theme/typography';
import type { FishingRecord } from '../types';
import type { TideChartData } from './chart/tide/types';
// TideIntegration は Issue #322 で完全削除されました
// 潮汐情報は PhotoHeroCard のオーバーレイグラフで表示
import { logger } from '../lib/errors/logger';
import { Icon } from './ui/Icon';
import { PhotoHeroCard } from './record/PhotoHeroCard';
import {
  MessageCircle,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Maximize2,
  Minimize2,
  Download,
} from 'lucide-react';
import { photoService } from '../lib/photo-service';
import html2canvas from 'html2canvas';

interface FishingRecordDetailProps {
  record: FishingRecord;
  onClose?: () => void;
  onEdit?: (record: FishingRecord) => void;
  onDelete?: (record: FishingRecord) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  photoUrl?: string;
  loading?: boolean;
  onNavigateToMap?: (record: FishingRecord) => void;
}

/**
 * Calculate direct tide level using harmonic analysis
 * (Copied from TideIntegration for overlay calculation)
 */
const calculateDirectTideLevel = (time: Date, coordinates: { latitude: number; longitude: number }): number => {
  const coordinateVariation = {
    latitudeFactor: 1 + (coordinates.latitude - 35) * 0.1,
    longitudeFactor: 1 + (coordinates.longitude - 135) * 0.05
  };

  const dayOfYear = Math.floor((time.getTime() - new Date(time.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const seasonalAngle = ((dayOfYear - 80) / 365) * 360;
  const latitudeEffect = Math.abs(coordinates.latitude) / 90;
  const baseSeasonalFactor = Math.cos(seasonalAngle * Math.PI / 180);

  const seasonalVariation = {
    m2Factor: 1.0 + (baseSeasonalFactor * 0.4 * latitudeEffect),
    s2Factor: 1.0 + (Math.cos((seasonalAngle + 45) * Math.PI / 180) * 0.5 * latitudeEffect),
    k1Factor: 1.0 + (Math.sin(seasonalAngle * Math.PI / 180) * 0.6 * latitudeEffect),
    o1Factor: 1.0 + (Math.sin((seasonalAngle + 90) * Math.PI / 180) * 0.45 * latitudeEffect)
  };

  const J2000_EPOCH_MS = new Date('2000-01-01T12:00:00Z').getTime();
  const hoursFromJ2000 = (time.getTime() - J2000_EPOCH_MS) / (1000 * 60 * 60);

  let tideLevel = 0;

  // M2 (12.42h period)
  const m2Frequency = 28.984104;
  const m2Amplitude = 1.0 * coordinateVariation.latitudeFactor * seasonalVariation.m2Factor;
  const m2Phase = 0 + coordinateVariation.longitudeFactor * 15;
  tideLevel += m2Amplitude * Math.cos((m2Frequency * hoursFromJ2000 + m2Phase) * Math.PI / 180);

  // S2 (12h period)
  const s2Frequency = 30.0;
  const s2Amplitude = 0.5 * coordinateVariation.longitudeFactor * seasonalVariation.s2Factor;
  const s2Phase = 0 + coordinateVariation.latitudeFactor * 20;
  tideLevel += s2Amplitude * Math.cos((s2Frequency * hoursFromJ2000 + s2Phase) * Math.PI / 180);

  // K1 (23.93h period)
  const k1Frequency = 15.041069;
  const k1Amplitude = 0.3 * coordinateVariation.latitudeFactor * seasonalVariation.k1Factor;
  const k1Phase = coordinateVariation.latitudeFactor * 80 + coordinateVariation.longitudeFactor * 25;
  tideLevel += k1Amplitude * Math.cos((k1Frequency * hoursFromJ2000 + k1Phase) * Math.PI / 180);

  // O1 (25.82h period)
  const o1Frequency = 13.943035;
  const o1Amplitude = 0.25 * coordinateVariation.longitudeFactor * seasonalVariation.o1Factor;
  const o1Phase = coordinateVariation.longitudeFactor * 120 + coordinateVariation.latitudeFactor * 35;
  tideLevel += o1Amplitude * Math.cos((o1Frequency * hoursFromJ2000 + o1Phase) * Math.PI / 180);

  return 100 + tideLevel * 30;
};

export const FishingRecordDetail: React.FC<FishingRecordDetailProps> = ({
  record,
  onClose,
  onEdit,
  onDelete,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  photoUrl,
  loading = false,
  onNavigateToMap
}) => {
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [tideChartData, setTideChartData] = useState<TideChartData[] | null>(null);
  const [tideLoading, setTideLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [photoFitMode, setPhotoFitMode] = useState<'cover' | 'contain'>('cover');
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const photoContainerRef = useRef<HTMLDivElement>(null);

  // タッチデバイス判定（macOSデスクトップでのWeb Share API誤発火防止）
  const isTouchDevice = () => {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  };

  // Web Share API使用の判定（タッチデバイスかつAPI対応の場合のみ）
  const shouldUseWebShare = () => {
    if (!isTouchDevice()) return false;
    return !!(navigator.share && navigator.canShare);
  };

  // Load photo URL for save functionality
  useEffect(() => {
    if (!record.photoId) {
      setLocalPhotoUrl(null);
      return;
    }

    const loadPhoto = async () => {
      const result = await photoService.getPhotoDataUrl(record.photoId!, false);
      if (result.success && result.data) {
        setLocalPhotoUrl(result.data);
      }
    };
    loadPhoto();
  }, [record.photoId]);

  // Save photo with overlay info (screen capture)
  const handleSavePhotoWithInfo = async () => {
    if (!photoContainerRef.current) return;

    setShowContextMenu(false);

    const filename = `BiteNote_${record.fishSpecies}_${record.date.toISOString().split('T')[0]}.jpg`;
    const container = photoContainerRef.current;

    // Elements to restore after capture
    const mapBar = container.querySelector('.photo-hero-card__map-bar') as HTMLElement | null;
    const glassElements = container.querySelectorAll('.glass-panel, .photo-hero-card__tide-chart-overlay, .photo-hero-card__tide-name');
    const originalStyles: { element: HTMLElement; backdrop: string; webkitBackdrop: string; bg: string }[] = [];

    // Save current fitMode and temporarily set to 'cover' to ensure overlay is visible
    const originalFitMode = photoFitMode;
    const needsFitModeChange = photoFitMode === 'contain';

    // Helper to restore all styles
    const restoreStyles = () => {
      if (mapBar) mapBar.style.display = '';
      originalStyles.forEach(({ element, backdrop, webkitBackdrop, bg }) => {
        element.style.backdropFilter = backdrop;
        element.style.webkitBackdropFilter = webkitBackdrop;
        element.style.background = bg;
      });
      // Restore original fitMode if changed
      if (needsFitModeChange) {
        setPhotoFitMode(originalFitMode);
      }
    };

    try {
      // Change fitMode to 'cover' if needed to show overlays
      if (needsFitModeChange) {
        setPhotoFitMode('cover');
        // Wait for React to re-render with new fitMode
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Hide map bar before capture
      if (mapBar) mapBar.style.display = 'none';

      // Disable backdrop-filter for capture (html-to-image doesn't support it)
      glassElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computed = window.getComputedStyle(htmlEl);
        originalStyles.push({
          element: htmlEl,
          backdrop: htmlEl.style.backdropFilter,
          webkitBackdrop: htmlEl.style.webkitBackdropFilter || '',
          bg: htmlEl.style.background,
        });
        // Replace backdrop-filter with solid semi-transparent background
        htmlEl.style.backdropFilter = 'none';
        htmlEl.style.webkitBackdropFilter = 'none';
        // If background is transparent or very light, add solid background
        if (!computed.background || computed.background.includes('rgba(0, 0, 0, 0)')) {
          htmlEl.style.background = 'rgba(0, 0, 0, 0.7)';
        }
      });

      // Wait for browser to complete render cycle (including SVG)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the photo's natural dimensions to capture at correct aspect ratio
      const imgElement = container.querySelector('.photo-hero-card__photo-foreground img') as HTMLImageElement;
      const photoAspect = imgElement?.naturalWidth && imgElement?.naturalHeight
        ? imgElement.naturalWidth / imgElement.naturalHeight
        : 3 / 4; // Default to portrait 3:4

      // Calculate capture dimensions based on photo aspect ratio
      const containerRect = container.getBoundingClientRect();
      let captureWidth = containerRect.width;
      let captureHeight = captureWidth / photoAspect;

      // If calculated height is larger than container, use container height instead
      if (captureHeight > containerRect.height) {
        captureHeight = containerRect.height;
        captureWidth = captureHeight * photoAspect;
      }

      // Capture using html2canvas at photo's aspect ratio
      const canvas = await html2canvas(container, {
        backgroundColor: '#0f172a',
        scale: 2, // Higher resolution
        width: captureWidth,
        height: captureHeight,
        useCORS: true, // Allow cross-origin images
        allowTaint: true, // Allow tainted canvas for local images
        logging: false, // Disable logging
        // Adjust the cloned element to show the full photo
        onclone: (_clonedDoc, clonedElement) => {
          // Set the cloned container to match capture dimensions
          clonedElement.style.width = `${captureWidth}px`;
          clonedElement.style.height = `${captureHeight}px`;
          clonedElement.style.overflow = 'hidden';

          // Find and adjust the photo to fill the new dimensions
          const clonedImg = clonedElement.querySelector('.photo-hero-card__photo-foreground img') as HTMLImageElement;
          if (clonedImg) {
            clonedImg.style.objectFit = 'cover';
            clonedImg.style.width = '100%';
            clonedImg.style.height = '100%';
          }

          // Adjust PhotoHeroCard container
          const photoContainer = clonedElement.querySelector('.photo-hero-card__photo-container') as HTMLElement;
          if (photoContainer) {
            photoContainer.style.width = `${captureWidth}px`;
            photoContainer.style.height = `${captureHeight}px`;
          }

          // Adjust the PhotoHeroCard itself
          const photoCard = clonedElement.querySelector('.photo-hero-card') as HTMLElement;
          if (photoCard) {
            photoCard.style.width = `${captureWidth}px`;
            photoCard.style.height = `${captureHeight}px`;
          }

          // Shrink the tide chart for capture (70% of original size)
          const tideChart = clonedElement.querySelector('.photo-hero-card__top-right') as HTMLElement;
          if (tideChart) {
            tideChart.style.transform = 'scale(0.7)';
            tideChart.style.transformOrigin = 'top right';
          }
        },
        // Ignore elements that cause issues
        ignoreElements: (element) => {
          const tagName = element.tagName;
          return tagName === 'SCRIPT' || tagName === 'NOSCRIPT';
        },
      });

      // Convert canvas to JPEG data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Restore styles immediately after capture
      restoreStyles();

      // タッチデバイス（モバイル/タブレット）: Web Share APIでネイティブ共有
      if (shouldUseWebShare()) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: 'image/jpeg' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${record.fishSpecies}の写真`,
          });
          return;
        }
      }

      // デスクトップ: 直接ダウンロード
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      restoreStyles();
      logger.error('Photo capture failed', { error });
    }
  };

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate tide data for overlay when coordinates exist
  useEffect(() => {
    if (!record.coordinates) {
      setTideChartData(null);
      return;
    }

    const calculateTideForOverlay = async () => {
      setTideLoading(true);
      try {
        const fishingDate = new Date(record.date);
        const startTime = new Date(
          fishingDate.getFullYear(),
          fishingDate.getMonth(),
          fishingDate.getDate(),
          0, 0, 0, 0
        );
        const endTime = new Date(
          fishingDate.getFullYear(),
          fishingDate.getMonth(),
          fishingDate.getDate() + 1,
          0, 0, 0, 0
        );

        // Generate 24-hour data points (15-minute intervals)
        const points: TideChartData[] = [];
        for (let time = startTime.getTime(); time < endTime.getTime(); time += 15 * 60 * 1000) {
          const currentTime = new Date(time);
          const level = calculateDirectTideLevel(currentTime, record.coordinates!);
          const hours = String(currentTime.getHours()).padStart(2, '0');
          const minutes = String(currentTime.getMinutes()).padStart(2, '0');
          points.push({
            time: `${hours}:${minutes}`,
            tide: Math.round(level)
          });
        }

        setTideChartData(points);
      } catch (error) {
        logger.error('Tide overlay calculation error', { error });
        setTideChartData(null);
      } finally {
        setTideLoading(false);
      }
    };

    calculateTideForOverlay();
  }, [record.date, record.coordinates]);

  // Format fishing time for chart marker
  const fishingTimeForChart = useMemo(() => {
    const hours = record.date.getHours();
    const minutes = record.date.getMinutes();
    // Snap to nearest 15-minute interval
    const snappedMinutes = Math.round(minutes / 15) * 15;
    const finalMinutes = snappedMinutes === 60 ? 0 : snappedMinutes;
    const finalHours = snappedMinutes === 60 ? (hours + 1) % 24 : hours;
    return `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
  }, [record.date]);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.(record);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (photoExpanded) {
        setPhotoExpanded(false);
      } else if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
      } else {
        onClose?.();
      }
    } else if (e.key === 'ArrowLeft' && hasPrevious) {
      onPrevious?.();
    } else if (e.key === 'ArrowRight' && hasNext) {
      onNext?.();
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderRadius: '8px',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          border: `1px solid ${'var(--color-border-light)'}`,
          color: 'var(--color-text-primary)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: `3px solid ${'var(--color-surface-secondary)'}`,
            borderTop: '3px solid #60a5fa',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span>読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* メインダイアログ */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isMobile ? 'var(--color-surface-primary)' : 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: isMobile ? 0 : '1rem'
        }}
        onClick={(e) => {
          if (!isMobile && e.target === e.currentTarget) {
            onClose?.();
          }
        }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div
          style={{
            position: isMobile ? 'absolute' : 'relative',
            top: isMobile ? 0 : undefined,
            left: isMobile ? 0 : undefined,
            right: isMobile ? 0 : undefined,
            bottom: isMobile ? 56 : undefined, // フッターの高さ分空ける
            backgroundColor: 'var(--color-surface-primary)',
            borderRadius: isMobile ? 0 : '12px',
            maxWidth: isMobile ? '100%' : '600px',
            width: isMobile ? undefined : '100%',
            maxHeight: isMobile ? undefined : '90vh',
            height: isMobile ? undefined : 'auto',
            overflow: 'auto',
            boxShadow: isMobile ? 'none' : '0 20px 40px rgba(0,0,0,0.3)',
            border: isMobile ? 'none' : `1px solid ${'var(--color-border-light)'}`,
            display: 'flex',
            flexDirection: 'column'
          }}
          role="dialog"
          aria-label={`${record.fishSpecies}の詳細`}
        >
          {/* モバイル用フローティングボタン（写真上に配置） */}
          {isMobile && (
            <>
              {/* 戻るボタン（左上） */}
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  width: '44px',
                  height: '44px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 30,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
                aria-label="戻る"
              >
                <Icon icon={ChevronLeft} size={28} decorative />
              </button>

              {/* 写真表示切替ボタン（右上） */}
              <button
                onClick={() => setPhotoFitMode(prev => prev === 'cover' ? 'contain' : 'cover')}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: (onEdit || onDelete) ? 64 : 12, // メニューボタンがある場合は左にずらす
                  width: '44px',
                  height: '44px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 30,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
                aria-label={photoFitMode === 'cover' ? '写真全体を表示' : '画面いっぱいに表示'}
                title={photoFitMode === 'cover' ? '写真全体を表示' : '画面いっぱいに表示'}
              >
                <Icon icon={photoFitMode === 'cover' ? Minimize2 : Maximize2} size={22} decorative />
              </button>

              {/* メニューボタン（右上） */}
              {(onEdit || onDelete) && (
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 30 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowContextMenu(!showContextMenu);
                    }}
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: 'none',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                    aria-label="アクションメニュー"
                  >
                    <Icon icon={MoreVertical} size={24} decorative />
                  </button>

                  {/* ドロップダウンメニュー */}
                  {showContextMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '52px',
                        right: '0',
                        background: 'rgba(30, 30, 30, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '12px',
                        padding: '8px',
                        minWidth: '140px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      {/* 保存 */}
                      {localPhotoUrl && (
                        <button
                          onClick={handleSavePhotoWithInfo}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s ease',
                            minHeight: '44px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Icon icon={Download} size={16} decorative />
                          <span>保存</span>
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => {
                            setShowContextMenu(false);
                            onEdit(record);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s ease',
                            minHeight: '44px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Icon icon={Edit} size={16} decorative />
                          <span>編集</span>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            setShowContextMenu(false);
                            setShowDeleteConfirm(true);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s ease',
                            minHeight: '44px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Icon icon={Trash2} size={16} decorative />
                          <span>削除</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 右上のアクションボタン群（デスクトップのみ） */}
          {!isMobile && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '8px',
            zIndex: 10
          }}>
            {/* コンテキストメニューボタン */}
            {(onEdit || onDelete) && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContextMenu(!showContextMenu);
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(8px)',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                  }}
                  aria-label="アクションメニュー"
                  title="メニュー"
                >
                  <Icon icon={MoreVertical} size={18} decorative />
                </button>

                {/* ドロップダウンメニュー */}
                {showContextMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '40px',
                      right: '0',
                      background: 'rgba(30, 30, 30, 0.95)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: '140px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {/* 保存（デスクトップ: 写真がある場合） */}
                    {localPhotoUrl && (
                      <button
                        onClick={handleSavePhotoWithInfo}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s ease',
                          minHeight: '44px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Icon icon={Download} size={16} decorative />
                        <span>保存</span>
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => {
                          setShowContextMenu(false);
                          onEdit(record);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s ease',
                          minHeight: '44px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Icon icon={Edit} size={16} decorative />
                        <span>編集</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          setShowContextMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s ease',
                          minHeight: '44px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Icon icon={Trash2} size={16} decorative />
                        <span>削除</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 閉じるボタン */}
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(8px)',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
              }}
              aria-label="詳細を閉じる"
              title="閉じる"
            >
              <Icon icon={X} size={18} decorative />
            </button>
          </div>
          )}

          {/* ナビゲーション（前後ボタン） - デスクトップのみ */}
          {!isMobile && (hasPrevious || hasNext) && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              transform: 'translateY(-50%)',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 8px',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                style={{
                  width: '36px',
                  height: '36px',
                  background: hasPrevious ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: hasPrevious ? 'pointer' : 'not-allowed',
                  color: hasPrevious ? 'white' : 'rgba(255,255,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto'
                }}
                aria-label="前の記録"
              >
                <Icon icon={ChevronLeft} size={20} decorative />
              </button>

              <button
                onClick={onNext}
                disabled={!hasNext}
                style={{
                  width: '36px',
                  height: '36px',
                  background: hasNext ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: hasNext ? 'pointer' : 'not-allowed',
                  color: hasNext ? 'white' : 'rgba(255,255,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto'
                }}
                aria-label="次の記録"
              >
                <Icon icon={ChevronRight} size={20} decorative />
              </button>
            </div>
          )}

          {/* モバイル: PhotoHeroCardを背景レイヤーとして固定配置 */}
          {isMobile && (
            <div
              ref={photoContainerRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 5,
              }}
            >
              <PhotoHeroCard
                record={record}
                tideChartData={tideChartData ?? undefined}
                fishingTime={fishingTimeForChart}
                tideLoading={tideLoading}
                showMapHint={!!record.coordinates}
                fullscreen={true}
                transparentInfo={true}
                fitMode={photoFitMode}
              />
            </div>
          )}

          {/* コンテンツ: デスクトップは通常表示 */}
          <div id="record-content" style={{
            flex: isMobile ? 1 : 'none',
            overflow: isMobile ? 'auto' : 'visible',
            position: 'relative',
            zIndex: isMobile ? 2 : 'auto', // PhotoHeroCardより低いz-index
            pointerEvents: isMobile ? 'none' : 'auto', // モバイルではクリックをPhotoHeroCardに通す
          }}>
            {/* デスクトップ: PhotoHeroCardを通常表示 */}
            {!isMobile && (
              <div ref={photoContainerRef}>
                <PhotoHeroCard
                  record={record}
                  onClick={() => {
                    if (record.coordinates && onNavigateToMap) {
                      onNavigateToMap(record);
                      onClose?.();
                    } else if (photoUrl) {
                      setPhotoExpanded(true);
                    }
                  }}
                  tideChartData={tideChartData ?? undefined}
                  fishingTime={fishingTimeForChart}
                  tideLoading={tideLoading}
                  showMapHint={!!record.coordinates}
                  fitMode={photoFitMode}
                />
              </div>
            )}

            {/* メモ */}
            {record.notes && (
              <div style={{
                margin: isMobile ? 'auto 1rem 1rem' : '1rem',
                marginTop: isMobile ? 'auto' : '1rem',
                padding: '1rem',
                backgroundColor: isMobile
                  ? 'rgba(0, 0, 0, 0.6)'
                  : 'rgba(251, 191, 36, 0.15)',
                backdropFilter: isMobile ? 'blur(12px)' : 'none',
                WebkitBackdropFilter: isMobile ? 'blur(12px)' : 'none',
                borderRadius: '8px',
                border: isMobile
                  ? '1px solid rgba(255, 255, 255, 0.15)'
                  : '1px solid rgba(251, 191, 36, 0.3)',
                position: isMobile ? 'absolute' : 'static',
                bottom: isMobile ? 16 : 'auto',
                left: isMobile ? 16 : 'auto',
                right: isMobile ? 16 : 'auto',
                pointerEvents: 'auto', // メモ欄はクリック可能に
              }}>
                <h4 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.875rem',
                  color: isMobile ? 'rgba(255, 255, 255, 0.9)' : '#fbbf24',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  textShadow: isMobile ? '0 1px 2px rgba(0, 0, 0, 0.8)' : 'none',
                }}>
                  <Icon icon={MessageCircle} size={14} decorative /> メモ
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: isMobile ? 'rgba(255, 255, 255, 0.95)' : 'var(--color-text-primary)',
                  textShadow: isMobile ? '0 1px 2px rgba(0, 0, 0, 0.8)' : 'none',
                }}>
                  {record.notes}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancelDelete();
            }
          }}
        >
          <div
            style={{
              background: 'rgba(30, 30, 30, 0.98)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '320px',
              width: '100%',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            role="alertdialog"
            aria-labelledby="delete-confirm-title"
            aria-describedby="delete-confirm-description"
          >
            <h3
              id="delete-confirm-title"
              style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: 'white',
                textAlign: 'center'
              }}
            >
              記録を削除
            </h3>
            <p
              id="delete-confirm-description"
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                lineHeight: 1.5
              }}
            >
              この釣果記録を削除しますか？<br />
              この操作は取り消せません。
            </p>
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'white',
                  minHeight: '48px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'white',
                  minHeight: '48px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 写真拡大表示 */}
      {photoExpanded && photoUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '2rem'
          }}
          onClick={() => setPhotoExpanded(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setPhotoExpanded(false);
            }
          }}
          tabIndex={-1}
        >
          <img
            src={photoUrl}
            alt={`${record.fishSpecies}の拡大写真`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPhotoExpanded(false)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="写真を閉じる"
          >
            <Icon icon={X} size={20} decorative />
          </button>
        </div>
      )}

      {/* CSS アニメーション */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ホバーエフェクト */
        button:not(:disabled):hover {
          filter: brightness(1.1);
        }

        button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        /* モバイル対応 */
        @media (max-width: 768px) {
          .record-detail-dialog {
            margin: 0.5rem;
            max-height: 95vh;
          }

          .record-detail-content {
            padding: 1rem;
          }

          .record-detail-actions {
            flex-direction: column;
          }

          .record-detail-actions button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};