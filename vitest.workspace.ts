import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/types/vitest.config.ts',
  'packages/logger/vitest.config.ts',
  'packages/ui/vitest.config.ts',
  'apps/frontend/vitest.config.ts',
]);
