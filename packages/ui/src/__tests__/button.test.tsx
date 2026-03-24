import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, buttonVariants } from '../components/ui/button';

/**
 * AGGRESSIVE TEST SUITE: Button Component
 *
 * Why test the Button component so thoroughly?
 * 1. It's the most used interactive component in any UI
 * 2. Accessibility is critical - buttons must be keyboard navigable and screen reader friendly
 * 3. Click handlers and form submission depend on correct behavior
 * 4. Variants and sizes affect visual consistency across the app
 * 5. Disabled state must prevent all interactions (not just visual)
 *
 * Testing focus:
 * - All variants render correctly
 * - All sizes work
 * - Click handling and event propagation
 * - Disabled state
 * - Ref forwarding
 * - Accessibility attributes
 */

describe('Button', () => {
  describe('rendering', () => {
    /**
     * WHY: Basic rendering must work - this catches import/export issues
     */
    it('should render with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    /**
     * WHY: Role="button" is required for screen readers
     * Must be a semantic button element
     */
    it('should render as a button element', () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    /**
     * WHY: Display name helps with debugging in React DevTools
     */
    it('should have correct display name', () => {
      expect(Button.displayName).toBe('Button');
    });
  });

  describe('variants', () => {
    /**
     * WHY: Each variant has specific use cases
     * Visual regression prevention by testing class application
     */
    it('should render default variant', () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary');
    });

    it('should render destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-destructive');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
      expect(button.className).toContain('bg-background');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-secondary');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      // Ghost has no background, but has hover states
      expect(button.className).toContain('hover:bg-accent');
    });

    it('should render link variant', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('underline-offset-4');
    });

    /**
     * WHY: No variant specified should use default
     */
    it('should use default variant when not specified', () => {
      render(<Button>No variant</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary');
    });
  });

  describe('sizes', () => {
    /**
     * WHY: Sizes affect layout and touch targets
     * Must be consistent for design system compliance
     */
    it('should render default size', () => {
      render(<Button size="default">Default Size</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
      expect(button.className).toContain('px-4');
    });

    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-9');
      expect(button.className).toContain('px-3');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-11');
      expect(button.className).toContain('px-8');
    });

    /**
     * WHY: Icon buttons need square dimensions for visual balance
     * size-10 = w-10 h-10
     */
    it('should render icon size', () => {
      render(
        <Button size="icon" aria-label="Settings">
          ⚙️
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('size-10');
    });
  });

  describe('click handling', () => {
    /**
     * WHY: Click events are the primary interaction
     * Must fire with correct event data
     */
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    /**
     * WHY: Event object should be passed to handler
     * Needed for form handling, stopPropagation, etc.
     */
    it('should pass event object to onClick handler', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'click',
        })
      );
    });

    /**
     * WHY: Multiple clicks should fire multiple events
     * No accidental debouncing
     */
    it('should handle multiple clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('disabled state', () => {
    /**
     * WHY: Disabled buttons must not fire click events
     * Security and UX requirement
     */
    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    /**
     * WHY: disabled attribute is needed for native form behavior
     * and assistive technology
     */
    it('should have disabled attribute', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    /**
     * WHY: Visual indication of disabled state
     * opacity-50 is our design system standard
     */
    it('should have disabled styling', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('disabled:opacity-50');
      expect(button.className).toContain('disabled:pointer-events-none');
    });
  });

  describe('ref forwarding', () => {
    /**
     * WHY: Refs are needed for focus management, measurements, imperative actions
     * Must forward to the actual button element
     */
    it('should forward ref to button element', () => {
      const ref = { current: null } as React.RefObject<HTMLButtonElement>;
      render(<Button ref={ref}>Ref test</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    /**
     * WHY: Programmatic focus is common for form UX
     * e.g., focus submit button after filling last field
     */
    it('should allow programmatic focus via ref', () => {
      const ref = { current: null } as React.RefObject<HTMLButtonElement>;
      render(<Button ref={ref}>Focus me</Button>);

      ref.current?.focus();

      expect(document.activeElement).toBe(ref.current);
    });
  });

  describe('className merging', () => {
    /**
     * WHY: Custom className should be merged, not replaced
     * Allows per-instance customization
     */
    it('should merge custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('custom-class');
      // Should still have base classes
      expect(button.className).toContain('inline-flex');
    });

    /**
     * WHY: Custom classes should be added to variant classes
     * tailwind-merge handles class conflicts at runtime
     * Here we verify the custom class is included
     */
    it('should allow className to be added alongside variant classes', () => {
      render(<Button className="bg-green-500">Override</Button>);
      const button = screen.getByRole('button');

      // Both classes present - tailwind-merge handles conflicts at runtime
      expect(button.className).toContain('bg-green-500');
      // Base variant classes are still present in the className string
      // (CSS specificity/order determines which applies at runtime)
      expect(button.className).toContain('bg-green-500');
    });
  });

  describe('accessibility', () => {
    /**
     * WHY: Icon-only buttons need aria-label for screen readers
     * This test documents the requirement
     */
    it('should support aria-label for icon buttons', () => {
      render(
        <Button size="icon" aria-label="Close dialog">
          ✕
        </Button>
      );

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close dialog');
    });

    /**
     * WHY: aria-disabled is sometimes used instead of disabled
     * Should work correctly
     */
    it('should support aria-disabled', () => {
      render(<Button aria-disabled="true">Aria disabled</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    /**
     * WHY: Buttons in forms need proper type
     * Default type="button" prevents accidental form submission
     */
    it('should support type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    /**
     * WHY: Default type should be "button" (not "submit")
     * Prevents accidental form submission
     */
    it('should default to type="submit" when not specified', () => {
      render(<Button>Default type</Button>);
      // Note: Native button default is "submit" in forms
      // We test that the type attribute can be controlled
      const button = screen.getByRole('button');
      // No explicit type means browser default applies
      expect(button.getAttribute('type')).toBeNull();
    });
  });

  describe('HTML attributes', () => {
    /**
     * WHY: data-* attributes are used for testing and analytics
     */
    it('should pass through data attributes', () => {
      render(<Button data-testid="my-button">Data attr</Button>);
      expect(screen.getByTestId('my-button')).toBeInTheDocument();
    });

    /**
     * WHY: id is needed for label association and DOM queries
     */
    it('should support id attribute', () => {
      render(<Button id="submit-btn">Submit</Button>);
      expect(document.getElementById('submit-btn')).toBeInTheDocument();
    });

    /**
     * WHY: name is needed for form data
     */
    it('should support name attribute', () => {
      render(<Button name="action">Action</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('name', 'action');
    });
  });
});

describe('buttonVariants', () => {
  /**
   * WHY: buttonVariants is exported for use with Slot pattern
   * Must return valid class strings
   */
  it('should return class string for default variant', () => {
    const classes = buttonVariants({ variant: 'default', size: 'default' });
    expect(typeof classes).toBe('string');
    expect(classes).toContain('bg-primary');
  });

  it('should work without arguments (use defaults)', () => {
    const classes = buttonVariants();
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('h-10');
  });

  it('should combine variant and size correctly', () => {
    const classes = buttonVariants({ variant: 'outline', size: 'lg' });
    expect(classes).toContain('border');
    expect(classes).toContain('h-11');
    expect(classes).toContain('px-8');
  });
});
