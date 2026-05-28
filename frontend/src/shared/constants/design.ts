// ─── Design System Tokens ─────────────────────────────────────
// Single source of truth for all visual design decisions.
// Use these everywhere — JSX inline styles, Tailwind class builders,
// and any component that needs hard-coded values.

import { COLORS } from './colors'

// ── Typography ────────────────────────────────────────────────
export const FONT_FAMILY = "'Sora', sans-serif"

export const FONT_SIZE = {
  /** 10px — labels, micro tags */
  xs:   '10px',
  /** 11px — form labels, table headers */
  sm:   '11px',
  /** 13px — body text, inputs, buttons */
  base: '13px',
  /** 15px — section headings, card titles */
  md:   '15px',
  /** 17px — modal titles */
  lg:   '17px',
  /** 20px — page headings */
  xl:   '20px',
  /** 26px — hero numbers */
  '2xl': '26px',
} as const

export const FONT_WEIGHT = {
  regular:   400,
  medium:    500,
  semibold:  600,
  bold:      700,
  extrabold: 800,
  black:     900,
} as const

export const LINE_HEIGHT = {
  tight:  1.3,
  normal: 1.6,
  relaxed: 1.75,
} as const

// ── Spacing ───────────────────────────────────────────────────
// All in px. Maps directly to common Tailwind scale (×4 = rem).
export const SPACING = {
  0:    0,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  3.5:  14,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  10:   40,
  12:   48,
  14:   56,
  16:   64,
} as const

// ── Border Radius ─────────────────────────────────────────────
export const RADIUS = {
  sm:   '8px',
  base: '12px',  // rounded-xl  — use for inputs, buttons, badges
  md:   '14px',  // rounded-[14px] — cards, small panels
  lg:   '18px',  // rounded-[18px] — modals, large cards
  xl:   '20px',
  full: '9999px',
} as const

// ── Shadows ───────────────────────────────────────────────────
export const SHADOW = {
  sm:  '0 2px 8px rgba(0,0,0,0.25)',
  md:  '0 4px 20px rgba(0,0,0,0.35)',
  lg:  '0 8px 40px rgba(0,0,0,0.5)',
  glow: (color: string) => `0 0 20px ${color}30`,
} as const

// ── Z-index ───────────────────────────────────────────────────
export const Z = {
  base:    0,
  raised:  10,
  nav:     100,   // bottom-nav / side-nav
  modal:   1000,
  confirm: 1100,
  toast:   9999,
} as const

// ── Transitions ───────────────────────────────────────────────
export const TRANSITION = {
  fast:   'all 0.1s ease',
  base:   'all 0.15s ease',
  medium: 'all 0.25s ease',
  slow:   'all 0.35s ease',
} as const

// ── Breakpoints ───────────────────────────────────────────────
export const BREAKPOINT = {
  xs:  320,   // very small phones
  sm:  480,   // small phones (landscape)
  md:  640,   // large phones
  lg:  768,   // tablets
  xl:  1024,  // desktop
  '2xl': 1280,
} as const

// ── Touch targets ─────────────────────────────────────────────
export const TOUCH = {
  minSize: 44,   // WCAG 2.5.5 minimum 44×44px tap target
  comfy:   48,   // comfortable tap target
} as const

// ── Layout ────────────────────────────────────────────────────
export const LAYOUT = {
  sideNavWidth: 220,       // px — desktop sidebar
  sideNavWidthLg: 260,     // px — wide desktop
  bottomNavHeight: 64,     // px — mobile bottom nav
  topNavHeight: 56,        // px — admin top bar (mobile)
  contentMaxWidth: 960,    // px — max width for content columns
  pagepadMobile: 14,       // px — mobile content padding
  pagepadTablet: 24,       // px — tablet content padding
  pagepadDesktop: 32,      // px — desktop content padding
} as const

// ── Reusable Tailwind class builders ─────────────────────────
// These align the admin JSX shared.jsx classes with the design system.
// Use `ds.input`, `ds.btn.primary`, etc. anywhere in JSX.

export const ds = {
  // Inputs
  input: 'w-full bg-app-card2 border border-white/10 rounded-xl py-2.5 px-3.5 text-app-text text-[13px] font-[Sora,sans-serif] outline-none focus:ring-1 focus:ring-app-green/40',

  // Button builders
  btn: {
    primary: 'border-none rounded-xl py-2 px-4 text-[13px] font-bold font-[Sora,sans-serif] cursor-pointer bg-app-green text-app-bg hover:opacity-90 active:scale-95 transition-all duration-150',
    danger:  'border-none rounded-xl py-2 px-4 text-[13px] font-bold font-[Sora,sans-serif] cursor-pointer bg-app-red text-white hover:opacity-90 active:scale-95 transition-all duration-150',
    blue:    'border-none rounded-xl py-2 px-4 text-[13px] font-bold font-[Sora,sans-serif] cursor-pointer bg-app-blue text-app-bg hover:opacity-90 active:scale-95 transition-all duration-150',
    yellow:  'border-none rounded-xl py-2 px-4 text-[13px] font-bold font-[Sora,sans-serif] cursor-pointer bg-app-yellow text-app-bg hover:opacity-90 active:scale-95 transition-all duration-150',
    ghost:   'bg-transparent border border-app-border rounded-xl py-2 px-4 text-app-text text-[13px] font-semibold font-[Sora,sans-serif] cursor-pointer hover:bg-white/5 active:scale-95 transition-all duration-150',
  },

  // Cards
  card:  'bg-app-card border border-app-border rounded-[18px]',
  card2: 'bg-app-card2 border border-app-border rounded-[14px]',

  // Labels
  label: 'block text-[11px] font-bold text-app-muted mb-1.5 tracking-wider uppercase',

  // Tags
  tag:   'inline-flex items-center py-1 px-2.5 rounded-full text-xs font-semibold',
  tagGreen: `bg-[${COLORS.green}20] text-[${COLORS.green}] border border-[${COLORS.green}40]`,
  tagBlue:  `bg-[${COLORS.blue}20] text-[${COLORS.blue}] border border-[${COLORS.blue}40]`,
  tagRed:   `bg-[${COLORS.red}20] text-[${COLORS.red}] border border-[${COLORS.red}40]`,
} as const
