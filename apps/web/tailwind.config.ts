import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        surface: {
          container: 'hsl(var(--surface-container) / <alpha-value>)',
          'container-high': 'hsl(var(--surface-container-high) / <alpha-value>)',
          'container-highest': 'hsl(var(--surface-container-highest) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          container: 'hsl(var(--primary-container) / <alpha-value>)',
          'on-container': 'hsl(var(--on-primary-container) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        outline: 'hsl(var(--outline) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
        info: 'hsl(var(--info) / <alpha-value>)',
        violet: 'hsl(var(--violet) / <alpha-value>)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.75rem',
      },
      fontFamily: { sans: ['var(--font-roboto)', 'Roboto', 'system-ui', 'sans-serif'] },
      boxShadow: {
        // Material 3 elevation levels
        e1: '0 1px 2px 0 rgb(0 0 0 / 0.30), 0 1px 3px 1px rgb(0 0 0 / 0.15)',
        e2: '0 1px 2px 0 rgb(0 0 0 / 0.30), 0 2px 6px 2px rgb(0 0 0 / 0.15)',
        e3: '0 1px 3px 0 rgb(0 0 0 / 0.30), 0 4px 8px 3px rgb(0 0 0 / 0.15)',
        e4: '0 2px 3px 0 rgb(0 0 0 / 0.30), 0 6px 10px 4px rgb(0 0 0 / 0.15)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        // Login experience
        rise: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'logo-in': {
          '0%':   { opacity: '0', transform: 'scale(0.6) rotate(-8deg)' },
          '60%':  { opacity: '1', transform: 'scale(1.08) rotate(0deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        // Self-dismissing splash: holds, then fades to hidden (forwards fill).
        'splash-cover': {
          '0%, 55%': { opacity: '1', visibility: 'visible' },
          '100%':    { opacity: '0', visibility: 'hidden' },
        },
        'ring-pulse': {
          '0%':        { transform: 'scale(0.85)', opacity: '0.55' },
          '70%, 100%': { transform: 'scale(1.9)',  opacity: '0' },
        },
        'blob-float': {
          '0%, 100%': { transform: 'translate(-50%, 0) scale(1)' },
          '50%':      { transform: 'translate(-50%, 24px) scale(1.08)' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.3s cubic-bezier(0.2, 0, 0, 1)',
        rise:         'rise 0.6s cubic-bezier(0.2, 0, 0, 1) both',
        'logo-in':    'logo-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'splash-cover': 'splash-cover 1.7s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'ring-pulse': 'ring-pulse 1.8s ease-out infinite',
        'blob-float': 'blob-float 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
