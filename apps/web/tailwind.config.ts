import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F1623',
          card: '#131E2E',
          border: '#1E2D42',
          hover: '#1A2640',
        },
        gold: { DEFAULT: '#C9A84C', light: '#DFC070', dark: '#A8892E' },
        accent: '#4A9EFF',
        success: '#3ECF8E',
        warning: '#E2A24B',
        danger: '#F87171',
        muted: '#8B9AAD',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
export default config
