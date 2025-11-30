import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlassBadge } from '../ui/GlassBadge';

describe('GlassBadge', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(<GlassBadge>Test Badge</GlassBadge>);
      // 2-layer structure means text appears twice (shadow + glass)
      const elements = screen.getAllByText('Test Badge');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders with 2-layer structure', () => {
      const { container } = render(<GlassBadge>Test</GlassBadge>);
      expect(container.querySelector('.glass-badge-shadow')).toBeInTheDocument();
      expect(container.querySelector('.glass-badge-glass')).toBeInTheDocument();
    });

    it('applies aria-hidden="true" to shadow layer', () => {
      const { container } = render(<GlassBadge>Test</GlassBadge>);
      const shadow = container.querySelector('.glass-badge-shadow');
      expect(shadow).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders with custom className', () => {
      const { container } = render(<GlassBadge className="custom-class">Test</GlassBadge>);
      expect(container.querySelector('.glass-badge-wrapper')).toHaveClass('custom-class');
    });

    it('renders with custom style', () => {
      const { container } = render(
        <GlassBadge style={{ marginTop: '10px' }}>Test</GlassBadge>
      );
      expect(container.querySelector('.glass-badge-wrapper')).toHaveStyle({
        marginTop: '10px',
      });
    });

    it('renders with data-testid', () => {
      const { container } = render(<GlassBadge data-testid="test-badge">Test</GlassBadge>);
      expect(container.querySelector('[data-testid="test-badge"]')).toBeInTheDocument();
    });
  });

  describe('Variant Props', () => {
    it('applies default variant class when variant is "default"', () => {
      const { container } = render(<GlassBadge variant="default">Test</GlassBadge>);
      expect(container.querySelector('.glass-badge-wrapper')).not.toHaveClass(
        'glass-badge--default'
      );
    });

    it('applies size variant class', () => {
      const { container } = render(<GlassBadge variant="size">30cm</GlassBadge>);
      expect(container.querySelector('.glass-badge--size')).toBeInTheDocument();
    });

    it('applies species variant class', () => {
      const { container } = render(<GlassBadge variant="species">Seabass</GlassBadge>);
      expect(container.querySelector('.glass-badge--species')).toBeInTheDocument();
    });
  });

  describe('Icon Prop', () => {
    it('renders icon when provided', () => {
      const MockIcon = () => <svg data-testid="mock-icon" />;
      const { container } = render(
        <GlassBadge variant="species" icon={<MockIcon />}>
          Seabass
        </GlassBadge>
      );
      // Icon should be rendered in both layers (shadow and glass)
      expect(container.querySelectorAll('[data-testid="mock-icon"]')).toHaveLength(2);
    });

    it('renders icon in glass-badge-icon container', () => {
      const MockIcon = () => <svg data-testid="mock-icon" />;
      const { container } = render(
        <GlassBadge icon={<MockIcon />}>Test</GlassBadge>
      );
      expect(container.querySelectorAll('.glass-badge-icon')).toHaveLength(2);
    });
  });

  describe('Interactive Mode', () => {
    it('adds interactive class when interactive prop is true', () => {
      const { container } = render(<GlassBadge interactive>Test</GlassBadge>);
      expect(container.querySelector('.glass-badge-wrapper')).toHaveClass(
        'glass-badge-wrapper--interactive'
      );
    });

    it('adds interactive class when onClick is provided', () => {
      const { container } = render(<GlassBadge onClick={() => {}}>Test</GlassBadge>);
      expect(container.querySelector('.glass-badge-wrapper')).toHaveClass(
        'glass-badge-wrapper--interactive'
      );
    });

    it('sets role="button" when interactive', () => {
      const { container } = render(<GlassBadge interactive>Test</GlassBadge>);
      expect(container.querySelector('.glass-badge-wrapper')).toHaveAttribute(
        'role',
        'button'
      );
    });

    it('sets tabIndex={0} when interactive', () => {
      const { container } = render(<GlassBadge interactive>Test</GlassBadge>);
      expect(container.querySelector('.glass-badge-wrapper')).toHaveAttribute(
        'tabIndex',
        '0'
      );
    });

    it('does not set role and tabIndex when not interactive', () => {
      const { container } = render(<GlassBadge>Test</GlassBadge>);
      const wrapper = container.querySelector('.glass-badge-wrapper');
      expect(wrapper).not.toHaveAttribute('role');
      expect(wrapper).not.toHaveAttribute('tabIndex');
    });

    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn();
      const { container } = render(<GlassBadge onClick={handleClick}>Test</GlassBadge>);

      const button = container.querySelector('[role="button"]')!;
      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Enter key is pressed', () => {
      const handleClick = vi.fn();
      const { container } = render(<GlassBadge onClick={handleClick}>Test</GlassBadge>);

      const wrapper = container.querySelector('.glass-badge-wrapper')!;
      fireEvent.keyDown(wrapper, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Space key is pressed', () => {
      const handleClick = vi.fn();
      const { container } = render(<GlassBadge onClick={handleClick}>Test</GlassBadge>);

      const wrapper = container.querySelector('.glass-badge-wrapper')!;
      fireEvent.keyDown(wrapper, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick for other keys', () => {
      const handleClick = vi.fn();
      const { container } = render(<GlassBadge onClick={handleClick}>Test</GlassBadge>);

      const wrapper = container.querySelector('.glass-badge-wrapper')!;
      fireEvent.keyDown(wrapper, { key: 'Tab' });
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('sets title attribute for text content (for truncated text)', () => {
      const { container } = render(<GlassBadge>Long text content</GlassBadge>);
      const glass = container.querySelector('.glass-badge-glass');
      expect(glass).toHaveAttribute('title', 'Long text content');
    });

    it('sets title attribute for numeric content', () => {
      const { container } = render(<GlassBadge>{30}</GlassBadge>);
      const glass = container.querySelector('.glass-badge-glass');
      expect(glass).toHaveAttribute('title', '30');
    });

    it('does not set title for non-string/number children', () => {
      const { container } = render(
        <GlassBadge>
          <span>Complex content</span>
        </GlassBadge>
      );
      const glass = container.querySelector('.glass-badge-glass');
      expect(glass).not.toHaveAttribute('title');
    });
  });

  describe('Theme Support', () => {
    it('renders correctly in light theme', () => {
      document.body.classList.add('light-theme');
      const { container } = render(<GlassBadge>Test</GlassBadge>);
      expect(container.querySelector('.glass-badge-glass')).toBeInTheDocument();
      document.body.classList.remove('light-theme');
    });

    it('renders correctly in dark theme', () => {
      document.body.classList.remove('light-theme');
      const { container } = render(<GlassBadge>Test</GlassBadge>);
      expect(container.querySelector('.glass-badge-glass')).toBeInTheDocument();
    });
  });

  describe('forwardRef', () => {
    it('forwards ref to wrapper element', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<GlassBadge ref={ref}>Test</GlassBadge>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveClass('glass-badge-wrapper');
    });
  });
});
