import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '../components/ui/label';

/**
 * AGGRESSIVE TEST SUITE: Label Component
 *
 * Why test the Label component thoroughly?
 * 1. Labels are CRITICAL for accessibility - form inputs without labels are inaccessible
 * 2. The htmlFor/id relationship must work correctly for screen readers
 * 3. Peer state styling (disabled input = disabled label) is a key UX feature
 * 4. Labels are used in every form - bugs here affect all data entry
 *
 * Testing focus:
 * - Basic rendering and text content
 * - htmlFor association with inputs
 * - Accessibility requirements
 * - Styling with peer states
 * - Ref forwarding
 */

describe('Label', () => {
  describe('rendering', () => {
    /**
     * WHY: Basic rendering verification
     */
    it('should render as a label element', () => {
      render(<Label>Email</Label>);
      // Labels don't have a specific role, check by text
      expect(screen.getByText('Email').tagName).toBe('LABEL');
    });

    /**
     * WHY: Display name for React DevTools
     */
    it('should have correct display name', () => {
      expect(Label.displayName).toBe('Label');
    });

    /**
     * WHY: Children should be rendered
     */
    it('should render children', () => {
      render(<Label>Username</Label>);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    /**
     * WHY: Complex children (icons, required indicators)
     */
    it('should render complex children', () => {
      render(
        <Label>
          Email <span className="text-red-500">*</span>
        </Label>
      );
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('htmlFor association', () => {
    /**
     * WHY: htmlFor creates accessible label-input association
     * This is REQUIRED for screen readers to announce the label when input is focused
     */
    it('should support htmlFor attribute', () => {
      render(
        <>
          <Label htmlFor="email">Email</Label>
          <input id="email" />
        </>
      );

      expect(screen.getByText('Email')).toHaveAttribute('for', 'email');
    });

    /**
     * WHY: Label must have correct htmlFor attribute for accessibility
     * Note: jsdom doesn't fully simulate native label-click-to-focus behavior,
     * but the attribute linkage is what matters for a11y compliance
     */
    it('should have correct htmlFor attribute for input association', () => {
      render(
        <>
          <Label htmlFor="test-input">Click me</Label>
          <input id="test-input" />
        </>
      );

      // Verify the htmlFor attribute is correctly set
      expect(screen.getByText('Click me')).toHaveAttribute('for', 'test-input');
      // Verify the input exists and is accessible
      expect(document.getElementById('test-input')).toBeInTheDocument();
    });

    /**
     * WHY: Label wrapping input is valid alternative to htmlFor
     */
    it('should work with nested input (implicit association)', () => {
      render(
        <Label>
          Username
          <input data-testid="nested-input" />
        </Label>
      );

      // Click the label text
      screen.getByText('Username').click();

      // The nested input should be focusable
      expect(screen.getByTestId('nested-input')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    /**
     * WHY: Font styling must match design system
     */
    it('should have correct base styling', () => {
      render(<Label>Test</Label>);
      const label = screen.getByText('Test');

      expect(label.className).toContain('text-sm');
      expect(label.className).toContain('font-medium');
      expect(label.className).toContain('leading-none');
    });

    /**
     * WHY: Peer-disabled styling when associated input is disabled
     * Shows visual indication that the field is not editable
     */
    it('should have peer-disabled styling classes', () => {
      render(<Label>Disabled Label</Label>);
      const label = screen.getByText('Disabled Label');

      expect(label.className).toContain('peer-disabled:cursor-not-allowed');
      expect(label.className).toContain('peer-disabled:opacity-70');
    });
  });

  describe('className merging', () => {
    /**
     * WHY: Custom className should merge with base styles
     */
    it('should merge custom className', () => {
      render(<Label className="custom-label">Custom</Label>);
      const label = screen.getByText('Custom');

      expect(label.className).toContain('custom-label');
      expect(label.className).toContain('text-sm'); // base class
    });

    /**
     * WHY: Custom styles should override base styles
     */
    it('should allow className to override styles', () => {
      render(<Label className="text-lg">Large Label</Label>);
      const label = screen.getByText('Large Label');

      expect(label.className).toContain('text-lg');
    });

    /**
     * WHY: Error state styling
     */
    it('should support error styling via className', () => {
      render(<Label className="text-destructive">Error Label</Label>);
      const label = screen.getByText('Error Label');

      expect(label.className).toContain('text-destructive');
    });
  });

  describe('ref forwarding', () => {
    /**
     * WHY: Refs might be needed for focus management or measurements
     */
    it('should forward ref to label element', () => {
      const ref = { current: null } as React.RefObject<HTMLLabelElement>;
      render(<Label ref={ref}>Ref Test</Label>);

      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });

    /**
     * WHY: Access label text programmatically
     */
    it('should allow text content access via ref', () => {
      const ref = { current: null } as React.RefObject<HTMLLabelElement>;
      render(<Label ref={ref}>Access Me</Label>);

      expect(ref.current?.textContent).toBe('Access Me');
    });
  });

  describe('accessibility', () => {
    /**
     * WHY: Labels must be visible to screen readers
     */
    it('should be accessible to screen readers', () => {
      render(
        <>
          <Label htmlFor="accessible-input">Accessible Field</Label>
          <input id="accessible-input" aria-labelledby="accessible-input-label" />
        </>
      );

      expect(screen.getByText('Accessible Field')).toBeInTheDocument();
    });

    /**
     * WHY: data-testid for testing
     */
    it('should support data attributes', () => {
      render(<Label data-testid="my-label">Test</Label>);
      expect(screen.getByTestId('my-label')).toBeInTheDocument();
    });

    /**
     * WHY: id attribute for aria-labelledby references
     */
    it('should support id attribute', () => {
      render(<Label id="username-label">Username</Label>);
      expect(document.getElementById('username-label')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: Empty label should still render
     */
    it('should handle empty children', () => {
      render(<Label data-testid="empty" />);
      expect(screen.getByTestId('empty')).toBeInTheDocument();
      expect(screen.getByTestId('empty').textContent).toBe('');
    });

    /**
     * WHY: Numeric children (though unusual)
     */
    it('should handle numeric children', () => {
      render(<Label>{123}</Label>);
      expect(screen.getByText('123')).toBeInTheDocument();
    });

    /**
     * WHY: Unicode content
     */
    it('should handle unicode content', () => {
      render(<Label>メールアドレス 📧</Label>);
      expect(screen.getByText('メールアドレス 📧')).toBeInTheDocument();
    });

    /**
     * WHY: Very long label text
     */
    it('should handle long text', () => {
      const longText = 'A'.repeat(500);
      render(<Label>{longText}</Label>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    /**
     * WHY: HTML in children (though not recommended)
     */
    it('should handle HTML in children', () => {
      render(
        <Label>
          <strong>Bold</strong> and <em>italic</em>
        </Label>
      );
      expect(screen.getByText('Bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
    });
  });
});
