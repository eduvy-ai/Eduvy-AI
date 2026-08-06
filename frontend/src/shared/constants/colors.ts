// ─── Color Tokens ─────────────────────────────────────────────
// Application color palette - matches Tailwind theme
// Vibrant dark theme for students (Class 7-12)

export const COLORS = {
  bg: '#0D0D1F',
  card: '#1A1A3A',
  card2: '#202048',
  border: '#ffffff0d',
  green: '#00F5A0',
  yellow: '#FBBF24',
  red: '#FF5C5C',
  blue: '#60A5FA',
  orange: '#F97316',
  text: '#FFFFFF',
  muted: '#7878A8',
} as const

export type ColorKey = keyof typeof COLORS
export type ColorValue = (typeof COLORS)[ColorKey]
