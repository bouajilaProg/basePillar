import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../components/ui/input';

/**
 * AGGRESSIVE TEST SUITE: Input Component
 *
 * Why test the Input component so thoroughly?
 * 1. Inputs are the primary data entry point - bugs here affect all forms
 * 2. Input types (text, email, password, etc.) have different behaviors
 * 3. Controlled vs uncontrolled patterns must work correctly
 * 4. Accessibility is critical for form usability
 * 5. Mobile keyboard types depend on input type
 *
 * Testing focus:
 * - Basic rendering and value handling
 * - All common input types
 * - Controlled component pattern
 * - Event handling (change, focus, blur)
 * - Accessibility attributes
 * - Ref forwarding
 */

describe('Input', () => {
  describe('rendering', () => {
    /**
     * WHY: Basic rendering verification
     */
    it('should render as an input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    /**
     * WHY: Display name for React DevTools debugging
     */
    it('should have correct display name', () => {
      expect(Input.displayName).toBe('Input');
    });

    /**
     * WHY: Default type should be text
     * Explicit is better than implicit
     */
    it('should default to type="text"', () => {
      render(<Input />);
      // role="textbox" confirms it's a text input
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('input types', () => {
    /**
     * WHY: Email type enables email keyboard on mobile
     * and browser validation
     */
    it('should support type="email"', () => {
      render(<Input type="email" data-testid="email" />);
      expect(screen.getByTestId('email')).toHaveAttribute('type', 'email');
    });

    /**
     * WHY: Password type hides input and may trigger password managers
     */
    it('should support type="password"', () => {
      render(<Input type="password" data-testid="password" />);
      expect(screen.getByTestId('password')).toHaveAttribute('type', 'password');
    });

    /**
     * WHY: Number type provides spinner controls and numeric keyboard
     */
    it('should support type="number"', () => {
      render(<Input type="number" data-testid="number" />);
      expect(screen.getByTestId('number')).toHaveAttribute('type', 'number');
    });

    /**
     * WHY: Tel type provides phone keyboard on mobile
     */
    it('should support type="tel"', () => {
      render(<Input type="tel" data-testid="tel" />);
      expect(screen.getByTestId('tel')).toHaveAttribute('type', 'tel');
    });

    /**
     * WHY: URL type enables URL keyboard and validation
     */
    it('should support type="url"', () => {
      render(<Input type="url" data-testid="url" />);
      expect(screen.getByTestId('url')).toHaveAttribute('type', 'url');
    });

    /**
     * WHY: Search type may show search icon and clear button
     */
    it('should support type="search"', () => {
      render(<Input type="search" data-testid="search" />);
      expect(screen.getByTestId('search')).toHaveAttribute('type', 'search');
    });

    /**
     * WHY: Date inputs need proper type for date picker
     */
    it('should support type="date"', () => {
      render(<Input type="date" data-testid="date" />);
      expect(screen.getByTestId('date')).toHaveAttribute('type', 'date');
    });

    /**
     * WHY: File inputs have special styling requirements
     */
    it('should support type="file"', () => {
      render(<Input type="file" data-testid="file" />);
      expect(screen.getByTestId('file')).toHaveAttribute('type', 'file');
    });
  });

  describe('value handling', () => {
    /**
     * WHY: Initial value should be displayed
     */
    it('should display defaultValue', () => {
      render(<Input defaultValue="initial" />);
      expect(screen.getByRole('textbox')).toHaveValue('initial');
    });

    /**
     * WHY: Controlled component pattern is standard in React
     */
    it('should support controlled value', () => {
      const { rerender } = render(<Input value="controlled" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveValue('controlled');

      rerender(<Input value="updated" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveValue('updated');
    });

    /**
     * WHY: Empty value should show empty input
     */
    it('should handle empty string value', () => {
      render(<Input value="" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveValue('');
    });
  });

  describe('event handling', () => {
    /**
     * WHY: onChange is critical for form state management
     */
    it('should call onChange when typing', async () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      await userEvent.type(screen.getByRole('textbox'), 'hello');

      // Called once per character
      expect(handleChange).toHaveBeenCalledTimes(5);
    });

    /**
     * WHY: onChange event should contain the new value
     */
    it('should pass event with target value to onChange', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: 'test' }),
        })
      );
    });

    /**
     * WHY: onFocus is needed for focus tracking and validation timing
     */
    it('should call onFocus when focused', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      fireEvent.focus(screen.getByRole('textbox'));

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    /**
     * WHY: onBlur is critical for validation on leave
     */
    it('should call onBlur when blurred', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    /**
     * WHY: onKeyDown is needed for keyboard shortcuts (Enter to submit, etc.)
     */
    it('should call onKeyDown for keyboard events', () => {
      const handleKeyDown = vi.fn();
      render(<Input onKeyDown={handleKeyDown} />);

      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

      expect(handleKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'Enter' })
      );
    });
  });

  describe('placeholder', () => {
    /**
     * WHY: Placeholder provides hint text for expected input
     */
    it('should display placeholder text', () => {
      render(<Input placeholder="Enter your email" />);
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    });

    /**
     * WHY: Placeholder should have muted styling
     */
    it('should have placeholder styling', () => {
      render(<Input placeholder="test" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('placeholder:text-muted-foreground');
    });
  });

  describe('disabled state', () => {
    /**
     * WHY: Disabled inputs should not accept input
     */
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    /**
     * WHY: Disabled styling for visual indication
     */
    it('should have disabled styling', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('disabled:cursor-not-allowed');
      expect(input.className).toContain('disabled:opacity-50');
    });

    /**
     * WHY: Disabled should prevent onChange calls
     */
    it('should not trigger onChange when disabled', async () => {
      const handleChange = vi.fn();
      render(<Input disabled onChange={handleChange} />);

      // userEvent respects disabled state
      await userEvent.type(screen.getByRole('textbox'), 'test');

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('required state', () => {
    /**
     * WHY: required attribute enables browser validation
     */
    it('should support required attribute', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });
  });

  describe('ref forwarding', () => {
    /**
     * WHY: Refs are needed for focus management
     */
    it('should forward ref to input element', () => {
      const ref = { current: null } as React.RefObject<HTMLInputElement>;
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    /**
     * WHY: Programmatic focus is common for form UX
     */
    it('should allow programmatic focus via ref', () => {
      const ref = { current: null } as React.RefObject<HTMLInputElement>;
      render(<Input ref={ref} />);

      ref.current?.focus();

      expect(document.activeElement).toBe(ref.current);
    });

    /**
     * WHY: Programmatic selection is needed for copy/paste UX
     */
    it('should allow programmatic value access via ref', () => {
      const ref = { current: null } as React.RefObject<HTMLInputElement>;
      render(<Input ref={ref} defaultValue="test value" />);

      expect(ref.current?.value).toBe('test value');
    });
  });

  describe('className merging', () => {
    /**
     * WHY: Custom className should merge with base styles
     */
    it('should merge custom className', () => {
      render(<Input className="custom-input" />);
      const input = screen.getByRole('textbox');

      expect(input.className).toContain('custom-input');
      expect(input.className).toContain('rounded-md'); // base class
    });

    /**
     * WHY: Custom border color for error states
     */
    it('should allow className to override styles', () => {
      render(<Input className="border-red-500" />);
      const input = screen.getByRole('textbox');

      expect(input.className).toContain('border-red-500');
    });
  });

  describe('accessibility', () => {
    /**
     * WHY: aria-label for inputs without visible labels
     */
    it('should support aria-label', () => {
      render(<Input aria-label="Search" />);
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
    });

    /**
     * WHY: aria-describedby for error messages and help text
     */
    it('should support aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="error-message" />
          <span id="error-message">Invalid email format</span>
        </>
      );
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'error-message');
    });

    /**
     * WHY: aria-invalid for error state indication
     */
    it('should support aria-invalid', () => {
      render(<Input aria-invalid="true" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    /**
     * WHY: autocomplete for browser autofill
     */
    it('should support autocomplete attribute', () => {
      render(<Input autoComplete="email" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('autocomplete', 'email');
    });
  });

  describe('HTML attributes', () => {
    /**
     * WHY: name is required for form data
     */
    it('should support name attribute', () => {
      render(<Input name="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'email');
    });

    /**
     * WHY: id is needed for label association
     */
    it('should support id attribute', () => {
      render(<Input id="email-input" />);
      expect(document.getElementById('email-input')).toBeInTheDocument();
    });

    /**
     * WHY: maxLength prevents over-input
     */
    it('should support maxLength attribute', () => {
      render(<Input maxLength={100} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '100');
    });

    /**
     * WHY: minLength enables browser validation
     */
    it('should support minLength attribute', () => {
      render(<Input minLength={3} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('minLength', '3');
    });

    /**
     * WHY: pattern enables regex validation
     */
    it('should support pattern attribute', () => {
      render(<Input pattern="[A-Za-z]+" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[A-Za-z]+');
    });

    /**
     * WHY: readOnly makes input viewable but not editable
     */
    it('should support readOnly attribute', () => {
      render(<Input readOnly defaultValue="readonly" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });
  });
});
