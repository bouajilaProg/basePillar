import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Input Component
 *
 * A styled input component following Shadcn UI patterns.
 * Flat design with clear focus states for accessibility.
 *
 * Design decisions:
 * - No inner shadows (flat UI)
 * - Clear border and focus ring for accessibility
 * - Full width by default (controlled by parent)
 * - Proper file input styling
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
