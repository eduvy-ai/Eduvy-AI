import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#04040e',
          color: '#FF6B6B', fontFamily: 'monospace',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 32, gap: 16,
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#FF6B6B' }}>App Error</div>
          <pre style={{
            background: '#0b0b1c', border: '1px solid #ff6b6b40',
            borderRadius: 12, padding: 20, maxWidth: 800, width: '100%',
            overflow: 'auto', fontSize: 13, color: '#eeeeff', whiteSpace: 'pre-wrap',
          }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              background: '#00E5A0', color: '#04040e', border: 'none',
              borderRadius: 8, padding: '10px 24px', fontFamily: 'Sora, sans-serif',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
