// ─── Color Tokens ─────────────────────────────────────────────
// Application color palette - matches Tailwind theme

export const COLORS = {
  bg: '#04040e',
  card: '#0b0b1c',
  card2: '#101022',
  border: '#ffffff08',
  green: '#00E5A0',
  yellow: '#FFD166',
  red: '#FF6B6B',
  blue: '#7B9CFF',
  orange: '#FF6B35',
  text: '#eeeeff',
  muted: '#6868a0',
} as const

export type ColorKey = keyof typeof COLORS
export type ColorValue = (typeof COLORS)[ColorKey]
