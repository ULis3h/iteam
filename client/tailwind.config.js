/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1c1c1e',
          soft: '#5f6368',
          muted: '#8a8f98',
        },
        line: '#e7e8ec',
        accent: {
          DEFAULT: '#3b6cf6',
          soft: '#e9efff',
        },
        status: {
          running: '#3b6cf6',
          success: '#1f9d61',
          failed: '#d93a3a',
          pending: '#9aa0a6',
          cancelled: '#c9820a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Google Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xl2: '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 24, 40, 0.04), 0 8px 24px -12px rgba(20, 24, 40, 0.12)',
        pop: '0 12px 40px -12px rgba(20, 24, 40, 0.25)',
      },
    },
  },
  plugins: [],
}
