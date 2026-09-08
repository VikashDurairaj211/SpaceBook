import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B2430',
        paper: '#F7F5F1',
        slate: {
          ...colors.slate,
          DEFAULT: '#5C6470',
        },
        line: '#D8D4CB',
        signal: '#E8A33D',
        clay: '#C1554D',
        moss: '#5F7A61',
        // Portal theme colors
        'portal-nav': '#001433',
        'portal-bg': '#f4f7fb',
        // Slightly lighter accent for focus/selection
        'portal-accent': '#002a66',
        'portal-paper': '#ffffff',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Segoe UI Variable"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Segoe UI Variable"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', '"Segoe UI Variable"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        glow: '0 0 20px -3px rgba(37, 99, 235, 0.25)',
      },
      borderRadius: {
        sm: '4px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
