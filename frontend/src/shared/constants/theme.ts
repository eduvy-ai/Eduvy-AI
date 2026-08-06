// ─── Design System Theme Tokens ───────────────────────────────
// CSS variable-based theme system supporting light + dark modes.
// New components should use these tokens via Tailwind `theme-*` classes.
// Legacy `app-*` classes remain for backward compatibility.

export const THEME = {
  light: {
    bg:               '#F8FAFC',
    bgSecondary:      '#F1F5F9',
    surface:          '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    surfaceHover:     '#F1F5F9',
    surfaceActive:    '#E2E8F0',
    border:           'rgba(15, 23, 42, 0.08)',
    borderStrong:     'rgba(15, 23, 42, 0.16)',
    text:             '#0F172A',
    textSecondary:    '#475569',
    textMuted:        '#94A3B8',
    textInverse:      '#FFFFFF',
    // Nav
    navBg:            'rgba(255, 255, 255, 0.92)',
    navBorder:        'rgba(15, 23, 42, 0.06)',
    sidebarBg:        '#FFFFFF',
    // Shadows
    shadowSm:         '0 1px 2px rgba(0,0,0,0.04)',
    shadowMd:         '0 4px 12px rgba(0,0,0,0.06)',
    shadowLg:         '0 12px 32px rgba(0,0,0,0.08)',
    shadowXl:         '0 20px 48px rgba(0,0,0,0.10)',
    // Overlay
    overlay:          'rgba(15, 23, 42, 0.5)',
  },
  dark: {
    bg:               '#0B0F1A',
    bgSecondary:      '#111827',
    surface:          '#1A2232',
    surfaceSecondary: '#1E293B',
    surfaceHover:     '#253044',
    surfaceActive:    '#334155',
    border:           'rgba(255, 255, 255, 0.07)',
    borderStrong:     'rgba(255, 255, 255, 0.14)',
    text:             '#F1F5F9',
    textSecondary:    '#94A3B8',
    textMuted:        '#64748B',
    textInverse:      '#0F172A',
    // Nav
    navBg:            'rgba(11, 15, 26, 0.92)',
    navBorder:        'rgba(255, 255, 255, 0.06)',
    sidebarBg:        '#111827',
    // Shadows
    shadowSm:         '0 1px 3px rgba(0,0,0,0.3)',
    shadowMd:         '0 4px 12px rgba(0,0,0,0.4)',
    shadowLg:         '0 12px 32px rgba(0,0,0,0.5)',
    shadowXl:         '0 20px 48px rgba(0,0,0,0.6)',
    // Overlay
    overlay:          'rgba(0, 0, 0, 0.6)',
  },
  // Brand colors (shared between modes)
  brand: {
    primary:      '#10B981',  // Emerald-500 — main CTA, active states
    primaryHover: '#059669',  // Emerald-600
    primaryLight: '#10B98120', // 12% opacity for backgrounds
    primarySoft:  '#10B98110', // 6% for subtle tints

    accent:       '#8B5CF6',  // Violet-500 — secondary actions, badges
    accentHover:  '#7C3AED',
    accentLight:  '#8B5CF620',

    blue:         '#3B82F6',
    blueLight:    '#3B82F620',

    amber:        '#F59E0B',
    amberLight:   '#F59E0B20',
  },
  // Status/semantic colors
  status: {
    success:      '#10B981',
    successLight: '#10B98118',
    warning:      '#F59E0B',
    warningLight: '#F59E0B18',
    danger:       '#EF4444',
    dangerLight:  '#EF444418',
    info:         '#3B82F6',
    infoLight:    '#3B82F618',
  },
} as const

// ── Typography Scale ──────────────────────────────────────────
// Mobile-first scale using rem for accessibility (respects user font-size)
export const TYPOGRAPHY = {
  display:  { size: '2rem',    weight: 800, lineHeight: 1.1,  tracking: '-0.025em' },  // 32px — hero numbers
  h1:       { size: '1.5rem',  weight: 700, lineHeight: 1.2,  tracking: '-0.02em' },   // 24px — page titles
  h2:       { size: '1.25rem', weight: 700, lineHeight: 1.25, tracking: '-0.015em' },  // 20px — section headings
  h3:       { size: '1.1rem',  weight: 600, lineHeight: 1.3,  tracking: '-0.01em' },   // ~17.6px — card titles
  body:     { size: '0.938rem',weight: 400, lineHeight: 1.6,  tracking: '0' },         // 15px — main content
  bodySm:   { size: '0.875rem',weight: 400, lineHeight: 1.5,  tracking: '0' },         // 14px — secondary content
  caption:  { size: '0.8125rem', weight: 500, lineHeight: 1.4, tracking: '0.01em' },   // 13px — captions, labels
  label:    { size: '0.75rem', weight: 600, lineHeight: 1.3,  tracking: '0.03em' },    // 12px — form labels, tags
  micro:    { size: '0.6875rem', weight: 500, lineHeight: 1.2, tracking: '0.02em' },   // 11px — badges, meta
} as const

// ── Spacing ───────────────────────────────────────────────────
export const SPACING = {
  0:   '0',
  px:  '1px',
  0.5: '0.125rem',  // 2px
  1:   '0.25rem',   // 4px
  1.5: '0.375rem',  // 6px
  2:   '0.5rem',    // 8px
  2.5: '0.625rem',  // 10px
  3:   '0.75rem',   // 12px
  3.5: '0.875rem',  // 14px
  4:   '1rem',      // 16px
  5:   '1.25rem',   // 20px
  6:   '1.5rem',    // 24px
  8:   '2rem',      // 32px
  10:  '2.5rem',    // 40px
  12:  '3rem',      // 48px
  16:  '4rem',      // 64px
  20:  '5rem',      // 80px
  24:  '6rem',      // 96px
} as const

// ── Border Radius ─────────────────────────────────────────────
export const RADIUS = {
  none: '0',
  sm:   '0.375rem',  // 6px — small chips
  md:   '0.5rem',    // 8px — inputs
  lg:   '0.75rem',   // 12px — cards, buttons
  xl:   '1rem',      // 16px — large cards, modals
  '2xl':'1.25rem',   // 20px — bottom sheets
  '3xl':'1.5rem',    // 24px — hero cards
  full: '9999px',    // pills
} as const

// ── Z-Index ───────────────────────────────────────────────────
export const Z_INDEX = {
  hide:      -1,
  base:       0,
  raised:     1,
  dropdown:  10,
  sticky:    20,
  nav:      100,
  modal:    200,
  popover:  300,
  toast:    400,
  tooltip:  500,
} as const

// ── Animation Durations ───────────────────────────────────────
export const DURATION = {
  instant:  '75ms',
  fast:     '150ms',
  normal:   '200ms',
  moderate: '300ms',
  slow:     '500ms',
} as const

export const EASING = {
  default:  'cubic-bezier(0.4, 0, 0.2, 1)',
  in:       'cubic-bezier(0.4, 0, 1, 1)',
  out:      'cubic-bezier(0, 0, 0.2, 1)',
  bounce:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  spring:   'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

// ── Touch Targets ─────────────────────────────────────────────
export const TOUCH = {
  minimum: '44px',  // WCAG 2.5.5 minimum
  comfortable: '48px',
} as const
