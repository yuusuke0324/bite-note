import React from 'react';
import { render } from '@testing-library/react';
import { GlassPanel } from '../ui/GlassPanel';

describe('GlassPanel', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      const { container } = render(<GlassPanel>Panel Content</GlassPanel>);
      // 2-layer structure means text appears in glass layer
      const glassLayer = container.querySelector('.glass-panel-glass');
      expect(glassLayer).toBeInTheDocument();
      expect(glassLayer?.textContent).toContain('Panel Content');
    });

    it('renders with 2-layer structure', () => {
      const { container } = render(<GlassPanel>Test</GlassPanel>);
      expect(container.querySelector('.glass-panel-shadow')).toBeInTheDocument();
      expect(container.querySelector('.glass-panel-glass')).toBeInTheDocument();
    });

    it('applies aria-hidden="true" to shadow layer', () => {
      const { container } = render(<GlassPanel>Test</GlassPanel>);
      const shadow = container.querySelector('.glass-panel-shadow');
      expect(shadow).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders with custom className', () => {
      const { container } = render(<GlassPanel className="custom-class">Test</GlassPanel>);
      expect(container.querySelector('.glass-panel-wrapper')).toHaveClass('custom-class');
    });

    it('renders with data-testid', () => {
      const { container } = render(<GlassPanel data-testid="test-panel">Test</GlassPanel>);
      expect(container.querySelector('[data-testid="test-panel"]')).toBeInTheDocument();
    });

    it('renders complex children correctly', () => {
      const { container } = render(
        <GlassPanel>
          <p>Location: Tokyo Bay</p>
          <p>Date: 2024-01-15</p>
        </GlassPanel>
      );
      // Check content in glass layer
      const glassLayer = container.querySelector('.glass-panel-glass');
      expect(glassLayer).toBeInTheDocument();
      expect(glassLayer?.textContent).toContain('Location: Tokyo Bay');
      expect(glassLayer?.textContent).toContain('Date: 2024-01-15');
    });
  });

  describe('Position Props', () => {
    it('applies bottom-left position by default', () => {
      const { container } = render(<GlassPanel>Test</GlassPanel>);
      const wrapper = container.querySelector('.glass-panel-wrapper');
      expect(wrapper).toHaveStyle({ bottom: '12px', left: '12px' });
    });

    it('applies top-left position', () => {
      const { container } = render(<GlassPanel position="top-left">Test</GlassPanel>);
      const wrapper = container.querySelector('.glass-panel-wrapper');
      expect(wrapper).toHaveStyle({ top: '12px', left: '12px' });
    });

    it('applies top-right position', () => {
      const { container } = render(<GlassPanel position="top-right">Test</GlassPanel>);
      const wrapper = container.querySelector('.glass-panel-wrapper');
      expect(wrapper).toHaveStyle({ top: '12px', right: '12px' });
    });

    it('applies bottom-right position', () => {
      const { container } = render(<GlassPanel position="bottom-right">Test</GlassPanel>);
      const wrapper = container.querySelector('.glass-panel-wrapper');
      expect(wrapper).toHaveStyle({ bottom: '12px', right: '12px' });
    });
  });

  describe('Custom Styles', () => {
    it('merges custom style with position style', () => {
      const { container } = render(
        <GlassPanel style={{ maxWidth: '200px' }}>Test</GlassPanel>
      );
      const wrapper = container.querySelector('.glass-panel-wrapper');
      expect(wrapper).toHaveStyle({
        bottom: '12px',
        left: '12px',
        maxWidth: '200px',
      });
    });

    it('custom style overrides position style when conflicting', () => {
      const { container } = render(
        <GlassPanel position="bottom-left" style={{ bottom: '20px' }}>
          Test
        </GlassPanel>
      );
      const wrapper = container.querySelector('.glass-panel-wrapper');
      expect(wrapper).toHaveStyle({ bottom: '20px', left: '12px' });
    });
  });

  describe('Theme Support', () => {
    it('renders correctly in light theme', () => {
      document.body.classList.add('light-theme');
      const { container } = render(<GlassPanel>Test</GlassPanel>);
      expect(container.querySelector('.glass-panel-glass')).toBeInTheDocument();
      document.body.classList.remove('light-theme');
    });

    it('renders correctly in dark theme', () => {
      document.body.classList.remove('light-theme');
      const { container } = render(<GlassPanel>Test</GlassPanel>);
      expect(container.querySelector('.glass-panel-glass')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper structure for screen readers', () => {
      const { container } = render(
        <GlassPanel>
          <h3>Location</h3>
          <p>Tokyo Bay</p>
        </GlassPanel>
      );

      // Shadow layer should be hidden from screen readers
      const shadow = container.querySelector('.glass-panel-shadow');
      expect(shadow).toHaveAttribute('aria-hidden', 'true');

      // Glass layer should be visible to screen readers
      const glass = container.querySelector('.glass-panel-glass');
      expect(glass).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('forwardRef', () => {
    it('forwards ref to wrapper element', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<GlassPanel ref={ref}>Test</GlassPanel>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveClass('glass-panel-wrapper');
    });
  });

  describe('Parent Container Integration', () => {
    it('renders correctly within a relative positioned parent', () => {
      const { container } = render(
        <div style={{ position: 'relative', width: '300px', height: '200px' }}>
          <GlassPanel>Test</GlassPanel>
        </div>
      );
      expect(container.querySelector('.glass-panel-wrapper')).toBeInTheDocument();
    });
  });
});
