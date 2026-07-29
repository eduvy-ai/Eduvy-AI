// ─── Main Application Entry ───────────────────────────────────
// React app bootstrap with Redux Provider and Router

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import store from './redux/store'
import App from './App'

// Import global styles
import './index.css'

// Import axios interceptors (side effect - sets up interceptors)
import './services/interceptor'

// ── Native platform initialization ────────────────────────────
if (Capacitor.isNativePlatform()) {
  // Status bar: dark background + light text
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setBackgroundColor({ color: '#04040e' }).catch(() => {})
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  }).catch(() => {})

  // Back button: prevent accidental app exit
  import('@capacitor/app').then(({ App: CapApp }) => {
    let lastBack = 0
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        const now = Date.now()
        if (now - lastBack < 2000) {
          CapApp.exitApp()
        } else {
          lastBack = now
          // Simple toast-like feedback
          const t = document.createElement('div')
          t.textContent = 'Press back again to exit'
          Object.assign(t.style, {
            position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            background: '#1a1a2e', color: '#eee', padding: '8px 20px', borderRadius: '8px',
            fontSize: '13px', zIndex: '9999', fontFamily: 'Sora, sans-serif',
          })
          document.body.appendChild(t)
          setTimeout(() => t.remove(), 1800)
        }
      }
    })
  }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
