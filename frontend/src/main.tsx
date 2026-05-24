// ─── Main Application Entry ───────────────────────────────────
// React app bootstrap with Redux Provider and Router

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import store from './redux/store'
import App from './App'

// Import global styles
import './index.css'

// Import axios interceptors (side effect - sets up interceptors)
import './services/interceptor'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
