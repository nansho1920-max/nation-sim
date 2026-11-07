/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: '#080c17',
        panel: '#0f1524',
        raised: '#172033',
        line: '#202b40',
        'line-strong': '#2e3b55',
        ink: '#e7e3d8',
        'ink-dim': '#9aa3b6',
        'ink-faint': '#5f6a82',
        brass: '#d4a24c',
        'brass-light': '#ecc77e',
        sea: '#0b1a2e',
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
        serif: ['"Shippori Mincho B1"', '"Noto Serif JP"', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': { from: { opacity: 0, transform: 'scale(0.96) translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { opacity: 0, transform: 'translateY(-4px)' }, to: { opacity: 1, transform: 'none' } },
        ticker: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'pop-in': 'pop-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        ticker: 'ticker 90s linear infinite',
      },
    },
  },
  plugins: [],
};
