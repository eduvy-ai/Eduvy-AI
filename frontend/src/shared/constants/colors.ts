// ─── Color Tokens ─────────────────────────────────────────────
// CSS variable-based so they adapt to light/dark mode

export const COLORS = {
  bg: 'var(--t-bg)',
  card: 'var(--t-surface)',
  card2: 'var(--t-surface-secondary)',
  border: 'var(--t-border)',
  green: 'var(--t-primary)',
  yellow: 'var(--t-amber)',
  red: 'var(--t-danger)',
  blue: 'var(--t-blue)',
  orange: '#F97316',
  text: 'var(--t-text)',
  muted: 'var(--t-text-muted)',
} as const

export type ColorKey = keyof typeof COLORS
export type ColorValue = (typeof COLORS)[ColorKey]
