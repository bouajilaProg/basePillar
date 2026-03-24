import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for merging Tailwind CSS classes
 *
 * Combines clsx for conditional classes with tailwind-merge
 * to properly handle conflicting Tailwind utilities.
 *
 * @example
 * cn('px-4 py-2', isLarge && 'px-8', className)
 * // If both have 'px-*', tailwind-merge will use the last one
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
