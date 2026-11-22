import type { Config } from 'tailwindcss';

// All values map to CSS custom properties in src/styles/tokens.css.
// No hard-coded hex values in components.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-soft': 'var(--surface-soft)',
        topbar: 'var(--topbar)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        primary: {
          DEFAULT: 'var(--primary)',
          ink: 'var(--primary-ink)',
          soft: 'var(--primary-soft)',
        },
        success: { DEFAULT: 'var(--success)', soft: 'var(--success-soft)' },
        warning: { DEFAULT: 'var(--warning)', soft: 'var(--warning-soft)' },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)' },
      },
      fontFamily: { sans: 'var(--font)' },
      fontSize: {
        small: ['var(--fs-small)', { lineHeight: '1.5' }],
        body: ['var(--fs-body)', { lineHeight: '1.6' }],
        input: ['24px', { lineHeight: '1.4' }],
        pitch: ['22px', { lineHeight: '1.6' }],
        title: ['var(--fs-title)', { lineHeight: '1.3' }],
        hero: ['var(--fs-hero)', { lineHeight: '1.2' }],
      },
      spacing: {
        tap: 'var(--tap)',
        'tap-min': 'var(--tap-min)',
        topbar: '56px',
        key: '72px',
        tile: '160px',
      },
      minHeight: { tap: 'var(--tap)', 'tap-min': 'var(--tap-min)' },
      minWidth: { tap: 'var(--tap)', 'tap-min': 'var(--tap-min)' },
      borderRadius: { DEFAULT: 'var(--radius)', lg: 'var(--radius-lg)' },
      boxShadow: { card: 'var(--shadow)' },
    },
  },
  plugins: [],
} satisfies Config;
