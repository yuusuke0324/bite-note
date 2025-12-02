import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

interface HeartAnimationProps {
  visible: boolean;
  onAnimationEnd?: () => void;
}

export const HeartAnimation: React.FC<HeartAnimationProps> = ({
  visible,
  onAnimationEnd,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
    }
  }, [visible]);

  const handleAnimationEnd = () => {
    setIsAnimating(false);
    onAnimationEnd?.();
  };

  if (!visible && !isAnimating) return null;

  return (
    <>
      {/* スクリーンリーダー向けの明示的な通知 */}
      <div role="status" aria-live="polite" className="sr-only">
        保存が完了しました
      </div>
      <div
        className="heart-animation-container"
        onAnimationEnd={handleAnimationEnd}
        aria-hidden="true"
      >
        <Heart
          size={80}
          className="heart-animation"
        />
      </div>
    </>
  );
};
