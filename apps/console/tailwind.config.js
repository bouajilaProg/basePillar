/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/client/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        background: '#09090b',
        foreground: '#fafafa',
        primary: '#2563eb',
        muted: '#18181b',
        'muted-foreground': '#a1a1aa',
        border: 'rgba(255,255,255,0.08)',
        card: '#09090b',
        panel: '#0f0f11'
      },
      boxShadow: {
        'glow-err': '0 0 10px rgba(248, 113, 113, 0.2)',
        'glow-warn': '0 0 10px rgba(250, 204, 21, 0.2)',
        'glow-info': '0 0 10px rgba(96, 165, 250, 0.2)',
      }
    },
  },
  plugins: [],
};
