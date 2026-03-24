import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

/**
 * AGGRESSIVE TEST SUITE: cn utility (clsx + tailwind-merge)
 *
 * Why test this utility so thoroughly?
 * 1. It's used in EVERY component - bugs here affect the entire UI library
 * 2. tailwind-merge has specific conflict resolution rules that must work correctly
 * 3. Edge cases (undefined, null, empty) are common in conditional class logic
 * 4. Developer experience depends on predictable behavior
 *
 * Testing focus:
 * - Basic class merging
 * - Conflicting class resolution (Tailwind-aware)
 * - Conditional class handling (clsx features)
 * - Edge cases that could cause runtime errors
 */

describe('cn utility', () => {
  describe('basic functionality', () => {
    /**
     * WHY: Single string is the simplest case
     * Must return it unchanged
     */
    it('should return a single class unchanged', () => {
      expect(cn('text-red-500')).toBe('text-red-500');
    });

    /**
     * WHY: Multiple classes is the common case
     * Should join them with spaces
     */
    it('should merge multiple classes', () => {
      expect(cn('px-4', 'py-2', 'text-sm')).toBe('px-4 py-2 text-sm');
    });

    /**
     * WHY: Empty string input should not produce extra spaces
     */
    it('should handle empty strings', () => {
      expect(cn('px-4', '', 'py-2')).toBe('px-4 py-2');
    });
  });

  describe('tailwind-merge conflict resolution', () => {
    /**
     * WHY: padding conflicts are very common
     * e.g., base padding + size variant padding
     * Last value should win
     */
    it('should resolve padding conflicts (px)', () => {
      expect(cn('px-4', 'px-8')).toBe('px-8');
    });

    it('should resolve padding conflicts (py)', () => {
      expect(cn('py-2', 'py-4')).toBe('py-4');
    });

    it('should resolve padding conflicts (p)', () => {
      expect(cn('p-4', 'p-8')).toBe('p-8');
    });

    /**
     * WHY: Specific padding should override general padding
     * p-4 px-8 = p-4 on all sides, but px-8 overrides x-axis
     */
    it('should handle p with px/py correctly', () => {
      const result = cn('p-4', 'px-8');
      expect(result).toContain('px-8');
    });

    /**
     * WHY: Color conflicts are common with variants
     * e.g., default color + destructive color
     */
    it('should resolve text color conflicts', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should resolve background color conflicts', () => {
      expect(cn('bg-white', 'bg-gray-100')).toBe('bg-gray-100');
    });

    /**
     * WHY: margin conflicts in layout adjustments
     */
    it('should resolve margin conflicts', () => {
      expect(cn('mt-4', 'mt-8')).toBe('mt-8');
      expect(cn('mx-auto', 'mx-4')).toBe('mx-4');
    });

    /**
     * WHY: width/height overrides for responsive design
     */
    it('should resolve size conflicts', () => {
      expect(cn('w-full', 'w-64')).toBe('w-64');
      expect(cn('h-10', 'h-12')).toBe('h-12');
    });

    /**
     * WHY: size-* is shorthand for w-* h-*
     * Should properly resolve conflicts
     */
    it('should handle size utility conflicts', () => {
      expect(cn('size-10', 'size-12')).toBe('size-12');
    });

    /**
     * WHY: border radius conflicts in different button sizes
     */
    it('should resolve border radius conflicts', () => {
      expect(cn('rounded-md', 'rounded-lg')).toBe('rounded-lg');
      expect(cn('rounded', 'rounded-full')).toBe('rounded-full');
    });

    /**
     * WHY: font weight variants
     */
    it('should resolve font weight conflicts', () => {
      expect(cn('font-normal', 'font-bold')).toBe('font-bold');
    });
  });

  describe('conditional classes (clsx features)', () => {
    /**
     * WHY: Conditional classes are the main reason for using clsx
     * Boolean conditions must work correctly
     */
    it('should include truthy conditionals', () => {
      expect(cn('base', true && 'included')).toBe('base included');
    });

    it('should exclude falsy conditionals', () => {
      expect(cn('base', false && 'excluded')).toBe('base');
    });

    /**
     * WHY: undefined/null are common from optional props
     * Must not crash or produce invalid output
     */
    it('should handle undefined', () => {
      expect(cn('base', undefined)).toBe('base');
    });

    it('should handle null', () => {
      expect(cn('base', null)).toBe('base');
    });

    /**
     * WHY: Object syntax for multiple conditionals
     * e.g., { 'text-red': hasError, 'text-green': isValid }
     */
    it('should handle object syntax', () => {
      expect(cn({ 'text-red-500': true, 'text-green-500': false })).toBe('text-red-500');
    });

    /**
     * WHY: Empty object should produce no classes
     */
    it('should handle empty object', () => {
      expect(cn({})).toBe('');
    });

    /**
     * WHY: Array syntax for grouped conditionals
     */
    it('should handle array syntax', () => {
      expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2');
    });

    /**
     * WHY: Mixed syntax is common in real components
     */
    it('should handle mixed syntax', () => {
      const isLarge = true;
      const isDisabled = false;

      expect(
        cn(
          'base-class',
          isLarge && 'large-class',
          { 'disabled-class': isDisabled, 'enabled-class': !isDisabled },
          ['array-class']
        )
      ).toBe('base-class large-class enabled-class array-class');
    });
  });

  describe('edge cases', () => {
    /**
     * WHY: No arguments should return empty string
     */
    it('should handle no arguments', () => {
      expect(cn()).toBe('');
    });

    /**
     * WHY: Only falsy values should return empty string
     */
    it('should handle all falsy values', () => {
      expect(cn(false, null, undefined, '', 0)).toBe('');
    });

    /**
     * WHY: Extra whitespace in class strings
     * Should be normalized
     */
    it('should handle strings with extra whitespace', () => {
      expect(cn('  px-4  ', 'py-2  ')).toBe('px-4 py-2');
    });

    /**
     * WHY: Multiple spaces between classes
     */
    it('should handle multiple spaces in single string', () => {
      expect(cn('px-4   py-2')).toBe('px-4 py-2');
    });

    /**
     * WHY: Very long class lists (common with many variants)
     */
    it('should handle many classes', () => {
      const classes = Array.from({ length: 50 }, (_, i) => `class-${i}`);
      const result = cn(...classes);
      expect(result.split(' ')).toHaveLength(50);
    });

    /**
     * WHY: Tailwind arbitrary values like px-[32px]
     */
    it('should handle arbitrary values', () => {
      expect(cn('px-[32px]', 'py-[16px]')).toBe('px-[32px] py-[16px]');
    });

    /**
     * WHY: Arbitrary values should also be merged
     */
    it('should resolve arbitrary value conflicts', () => {
      expect(cn('px-[32px]', 'px-[64px]')).toBe('px-[64px]');
    });

    /**
     * WHY: Responsive prefixes like sm:, md:, lg:
     */
    it('should handle responsive prefixes', () => {
      expect(cn('px-4', 'sm:px-8', 'md:px-12')).toBe('px-4 sm:px-8 md:px-12');
    });

    /**
     * WHY: State prefixes like hover:, focus:
     */
    it('should handle state prefixes', () => {
      expect(cn('bg-blue-500', 'hover:bg-blue-600')).toBe('bg-blue-500 hover:bg-blue-600');
    });

    /**
     * WHY: Combined prefixes like sm:hover:
     */
    it('should handle combined prefixes', () => {
      expect(cn('text-sm', 'sm:text-base', 'md:hover:text-lg')).toBe(
        'text-sm sm:text-base md:hover:text-lg'
      );
    });

    /**
     * WHY: Dark mode variants
     */
    it('should handle dark mode classes', () => {
      expect(cn('bg-white', 'dark:bg-gray-900')).toBe('bg-white dark:bg-gray-900');
    });

    /**
     * WHY: Group and peer selectors
     */
    it('should handle group and peer selectors', () => {
      expect(cn('group-hover:text-blue-500', 'peer-focus:text-green-500')).toBe(
        'group-hover:text-blue-500 peer-focus:text-green-500'
      );
    });
  });

  describe('real-world scenarios', () => {
    /**
     * WHY: Button variant pattern - common in Shadcn UI
     * Base styles + variant styles + size styles + custom className
     */
    it('should handle button variant pattern', () => {
      const base = 'inline-flex items-center justify-center rounded-md font-medium';
      const variant = 'bg-primary text-primary-foreground';
      const size = 'h-10 px-4 py-2';
      const customClass = 'px-8'; // Override default padding

      const result = cn(base, variant, size, customClass);

      // Custom px-8 should override size's px-4
      expect(result).toContain('px-8');
      expect(result).not.toMatch(/px-4(?!\d)/); // px-4 should be removed (not px-4py)
    });

    /**
     * WHY: Input with error state
     * Border color should be overridden when there's an error
     */
    it('should handle input error state', () => {
      const baseInput = 'border border-input rounded-md';
      const hasError = true;
      const errorClass = hasError && 'border-destructive';

      const result = cn(baseInput, errorClass);

      expect(result).toContain('border-destructive');
    });

    /**
     * WHY: Disabled state should override hover/focus states
     * Not a merge conflict, but important pattern
     */
    it('should combine interactive and disabled states', () => {
      const interactive = 'hover:bg-accent focus:ring-2';
      const disabled = 'disabled:pointer-events-none disabled:opacity-50';

      const result = cn(interactive, disabled);

      expect(result).toContain('hover:bg-accent');
      expect(result).toContain('disabled:pointer-events-none');
    });
  });
});
