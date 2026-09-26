/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F1F3F0',
        surface: '#FFFFFF',
        ink: '#161D1A',
        'ink-soft': '#5B665F',
        'ink-faint': '#8B958D',
        line: '#DCE1DC',
        'line-strong': '#C2C9C1',
        signal: {
          DEFAULT: '#1F6E4A',
          soft: '#E4EFE8',
          dim: '#3D8863',
        },
        down: {
          DEFAULT: '#C1432B',
          soft: '#F7E7E2',
        },
        warn: {
          DEFAULT: '#B8863A',
          soft: '#F4ECDD',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
      },
      boxShadow: {
        none: 'none',
      },
      keyframes: {
        rise: {
          '0%': { transform: 'scaleY(0)', opacity: '0' },
          '100%': { transform: 'scaleY(1)', opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        rise: 'rise 0.4s ease-out forwards',
        blink: 'blink 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
