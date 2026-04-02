/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/client/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        background: '#0b1220',
        foreground: '#e5e7eb',
        primary: '#1d4ed8',
        'primary-hover': '#1e40af',
        muted: '#1f2937',
        'muted-foreground': '#9ca3af',
        accent: '#0f172a',
        border: '#1f2937',
      },
    },
  },
  plugins: [],
};
