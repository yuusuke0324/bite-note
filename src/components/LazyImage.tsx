// 遅延読み込み対応画像コンポーネント

import React, { useState, useRef, useEffect } from 'react';

export interface LazyImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  enableWebP?: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: React.ReactNode;
  blurDataURL?: string;
  priority?: boolean;
  threshold?: number;
  rootMargin?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  enableWebP = false,
  className = '',
  onLoad,
  onError,
  placeholder,
  blurDataURL,
  priority = false,
  threshold = 0.1,
  rootMargin = '50px'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // WebP対応チェック
  const [supportsWebP, setSupportsWebP] = useState(false);

  useEffect(() => {
    if (enableWebP) {
      checkWebPSupport().then(setSupportsWebP);
    }
  }, [enableWebP]);

  // Intersection Observer設定
  useEffect(() => {
    // 優先読み込みの場合は即座に表示
    if (priority) {
      setIsInView(true);
      return;
    }

    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, threshold, rootMargin]);

  // 画像ソースの決定
  useEffect(() => {
    if (!isInView) return;

    let finalSrc = src;

    if (enableWebP && supportsWebP) {
      // WebP拡張子に変換
      finalSrc = src.replace(/\.(jpe?g|png)$/i, '.webp');
    }

    setImageSrc(finalSrc);
  }, [isInView, src, enableWebP, supportsWebP]);

  // 画像読み込み処理
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);

    // WebPでエラーの場合、元の形式にフォールバック
    if (enableWebP && imageSrc.endsWith('.webp')) {
      setImageSrc(src);
      return;
    }

    onError?.();
  };

  // WebPサポートチェック
  const checkWebPSupport = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;

      canvas.toBlob(
        (blob) => {
          resolve(blob?.type === 'image/webp');
        },
        'image/webp',
        0.1
      );
    });
  };

  // プレースホルダー
  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }

    // ブラーデータURLがある場合はそれを背景に使用
    const backgroundStyle = blurDataURL ? {
      backgroundImage: `url(${blurDataURL})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: 'blur(5px)',
      transform: 'scale(1.1)'
    } : {};

    return (
      <div
        style={{
          width,
          height,
          backgroundColor: 'var(--color-surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-secondary)',
          fontSize: '0.9rem',
          position: 'relative',
          overflow: 'hidden',
          ...backgroundStyle
        }}
      >
        {!blurDataURL && '読み込み中...'}
      </div>
    );
  };

  // エラー表示
  const renderError = () => (
    <div
      style={{
        width,
        height,
        backgroundColor: 'var(--color-surface-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-secondary)',
        fontSize: '0.9rem',
        border: `1px solid var(--color-border-light)`
      }}
    >
      画像を読み込めませんでした
    </div>
  );

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {hasError ? (
        renderError()
      ) : !isLoaded || !isInView ? (
        renderPlaceholder()
      ) : null}

      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        loading="lazy"
        data-webp-src={enableWebP ? src.replace(/\.(jpe?g|png)$/i, '.webp') : undefined}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded && isInView ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};