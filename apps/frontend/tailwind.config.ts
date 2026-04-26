import type { Config } from 'tailwindcss';
import baseConfig from '@repo/ui/tailwind.config';

export default {
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme?.extend,
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
} satisfies Config;
