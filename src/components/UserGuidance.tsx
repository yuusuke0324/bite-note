// ユーザーガイダンスコンポーネント

import React, { useState, useEffect } from 'react';
import type { Guidance } from '../lib/user-guidance-service';
import { Icon } from './ui/Icon';
import { Hand, Lightbulb, Wrench, FileText, X } from 'lucide-react';

export interface UserGuidanceProps {
  guidance: Guidance | null;
  isVisible: boolean;
  onClose: () => void;
  onAction?: () => void;
  currentStep?: number;
}

export const UserGuidance: React.FC<UserGuidanceProps> = ({
  guidance,
  isVisible,
  onClose,
  onAction,
  currentStep = 0
}) => {
  const [activeStep, setActiveStep] = useState(currentStep);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      setActiveStep(currentStep);
    } else {
      setIsAnimating(false);
    }
  }, [isVisible, currentStep]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleNext = () => {
    if (guidance && activeStep < guidance.steps.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleAction = () => {
    onAction?.();
    handleClose();
  };

  const getOverlayStyle = () => ({
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isAnimating ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    padding: '1rem'
  });

  const getModalStyle = () => ({
    backgroundColor: '#fff',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    transform: isAnimating ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
    transition: 'all 0.3s ease-in-out'
  });

  const getTypeColor = () => {
    if (!guidance) return '#007bff';

    switch (guidance.type) {
      case 'first-time':
        return '#28a745';
      case 'feature':
        return '#007bff';
      case 'error-recovery':
        return '#dc3545';
      case 'empty-state':
        return '#6c757d';
      default:
        return '#007bff';
    }
  };

  const getTypeIcon = () => {
    if (!guidance) return <Icon icon={Lightbulb} size={32} color="primary" decorative />;

    switch (guidance.type) {
      case 'first-time':
        return <Icon icon={Hand} size={32} color="success" decorative />;
      case 'feature':
        return <Icon icon={Lightbulb} size={32} color="primary" decorative />;
      case 'error-recovery':
        return <Icon icon={Wrench} size={32} color="error" decorative />;
      case 'empty-state':
        return <Icon icon={FileText} size={32} color="secondary" decorative />;
      default:
        return <Icon icon={Lightbulb} size={32} color="primary" decorative />;
    }
  };

  if (!guidance || !isVisible) {
    return null;
  }

  const currentStepData = guidance.steps[activeStep];
  const isLastStep = activeStep === guidance.steps.length - 1;
  const hasMultipleSteps = guidance.steps.length > 1;

  return (
    <div style={getOverlayStyle()}>
      <div style={getModalStyle()}>
        {/* ヘッダー */}
        <div
          style={{
            padding: '1.5rem 1.5rem 1rem 1.5rem',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem'
          }}
        >
          <div>{getTypeIcon()}</div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '0.5rem'
              }}
            >
              {guidance.title}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.9rem',
                color: '#666'
              }}
            >
              {guidance.description}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon icon={X} size={20} decorative />
          </button>
        </div>

        {/* プログレスバー（複数ステップの場合） */}
        {hasMultipleSteps && (
          <div style={{ padding: '1rem 1.5rem 0 1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#666' }}>
                ステップ {activeStep + 1} / {guidance.steps.length}
              </span>
            </div>
            <div
              style={{
                height: '4px',
                backgroundColor: '#e9ecef',
                borderRadius: '2px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  backgroundColor: getTypeColor(),
                  width: `${((activeStep + 1) / guidance.steps.length) * 100}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        )}

        {/* コンテンツ */}
        <div style={{ padding: '1.5rem' }}>
          {currentStepData && (
            <>
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '1rem'
                }}
              >
                {currentStepData.title}
              </h3>
              <p
                style={{
                  fontSize: '1rem',
                  color: '#555',
                  lineHeight: 1.6,
                  marginBottom: '1.5rem'
                }}
              >
                {currentStepData.description}
              </p>
              {currentStepData.image && (
                <div
                  style={{
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}
                >
                  <img
                    src={currentStepData.image}
                    alt={currentStepData.title}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            {hasMultipleSteps && activeStep > 0 && (
              <button
                onClick={handlePrevious}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                前へ
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {hasMultipleSteps && !isLastStep ? (
              <button
                onClick={handleNext}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: getTypeColor(),
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                次へ
              </button>
            ) : (
              <button
                onClick={handleAction}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: getTypeColor(),
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                {guidance.actionLabel}
              </button>
            )}

            <button
              onClick={handleClose}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                color: '#6c757d',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              スキップ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};