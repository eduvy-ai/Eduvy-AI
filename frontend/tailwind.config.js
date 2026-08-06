/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Legacy app colors (backward compatibility) ──
        app: {
          bg:     '#04040e',
          card:   '#0b0b1c',
          card2:  '#101022',
          border: '#ffffff08',
          green:  '#00E5A0',
          yellow: '#FFD166',
          red:    '#FF6B6B',
          blue:   '#7B9CFF',
          orange: '#FF6B35',
          text:   '#eeeeff',
          muted:  '#6868a0',
        },
        // ── New Design System (CSS variable-based) ──
        // Use `t-*` (theme) prefix to avoid collisions
        t: {
          bg:               'var(--t-bg)',
          'bg-secondary':   'var(--t-bg-secondary)',
          surface:          'var(--t-surface)',
          'surface-2':      'var(--t-surface-secondary)',
          'surface-hover':  'var(--t-surface-hover)',
          'surface-active': 'var(--t-surface-active)',
          border:           'var(--t-border)',
          'border-strong':  'var(--t-border-strong)',
          text:             'var(--t-text)',
          'text-secondary': 'var(--t-text-secondary)',
          'text-muted':     'var(--t-text-muted)',
          'text-inverse':   'var(--t-text-inverse)',
          // Navigation
          'nav-bg':         'var(--t-nav-bg)',
          'nav-border':     'var(--t-nav-border)',
          'sidebar-bg':     'var(--t-sidebar-bg)',
          // Brand
          primary:          'var(--t-primary)',
          'primary-hover':  'var(--t-primary-hover)',
          accent:           'var(--t-accent)',
          'accent-hover':   'var(--t-accent-hover)',
          blue:             'var(--t-blue)',
          amber:            'var(--t-amber)',
          // Status
          success:          'var(--t-success)',
          warning:          'var(--t-warning)',
          danger:           'var(--t-danger)',
          info:             'var(--t-info)',
        },
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Sora', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display': ['2rem',     { lineHeight: '1.1',  fontWeight: '800', letterSpacing: '-0.025em' }],
        'h1':      ['1.5rem',   { lineHeight: '1.2',  fontWeight: '700', letterSpacing: '-0.02em' }],
        'h2':      ['1.25rem',  { lineHeight: '1.25', fontWeight: '700', letterSpacing: '-0.015em' }],
        'h3':      ['1.1rem',   { lineHeight: '1.3',  fontWeight: '600', letterSpacing: '-0.01em' }],
        'body':    ['0.938rem', { lineHeight: '1.6',  fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5',  fontWeight: '400' }],
        'caption': ['0.8125rem',{ lineHeight: '1.4',  fontWeight: '500', letterSpacing: '0.01em' }],
        'label':   ['0.75rem',  { lineHeight: '1.3',  fontWeight: '600', letterSpacing: '0.03em' }],
        'micro':   ['0.6875rem',{ lineHeight: '1.2',  fontWeight: '500', letterSpacing: '0.02em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft-sm': 'var(--t-shadow-sm)',
        'soft':    'var(--t-shadow-md)',
        'soft-lg': 'var(--t-shadow-lg)',
        'soft-xl': 'var(--t-shadow-xl)',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-in-out',
        'slide-up':    'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down':  'slideDown 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-left':  'slideLeft 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-right': 'slideRight 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in':    'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'press':       'press 0.12s ease-out',
        'skeleton':    'skeleton 1.5s ease-in-out infinite',
        'toast-in':    'toastIn 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'toast-out':   'toastOut 0.25s ease-in forwards',
        'spin-slow':   'spin 1.2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%':   { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%':   { transform: 'translateX(-16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        press: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        skeleton: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        toastIn: {
          '0%':   { transform: 'translateY(100%) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        toastOut: {
          '0%':   { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(16px) scale(0.95)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
