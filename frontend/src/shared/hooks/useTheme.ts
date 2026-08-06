import { useState, useEffect, useCallback } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'eduvyai_theme'

function getSystemPreference(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(mode: 'light' | 'dark') {
  const root = document.documentElement
  if (mode === 'light') {
    root.classList.add('light')
    root.classList.remove('dark')
  } else {
    root.classList.add('dark')
    root.classList.remove('light')
  }
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'dark'
    } catch {
      return 'dark'
    }
  })

  const resolved = mode === 'system' ? getSystemPreference() : mode

  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  // Listen for system preference changes when mode is 'system'
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => applyTheme(getSystemPreference())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode)
    try {
      localStorage.setItem(STORAGE_KEY, newMode)
    } catch {}
  }, [])

  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setTheme])

  return { mode, resolved, setTheme, toggle, isDark: resolved === 'dark' }
}
