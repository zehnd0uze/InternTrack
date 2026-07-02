import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  handleReload = () => {
    // Unregister service workers then reload to get fresh files
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister())
      }).finally(() => {
        window.location.reload(true)
      })
    } else {
      window.location.reload(true)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
          fontFamily: 'Inter, Sarabun, sans-serif',
          background: '#f8fafc',
          color: '#334155',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>เกิดข้อผิดพลาด</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            หน้าเว็บเกิดปัญหา กรุณากดปุ่มด้านล่างเพื่อโหลดใหม่
          </p>
          {this.state.error && (
            <pre style={{
              fontSize: '11px',
              color: '#94a3b8',
              background: '#f1f5f9',
              padding: '8px 12px',
              borderRadius: '6px',
              maxWidth: '500px',
              overflow: 'auto',
              textAlign: 'left',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 28px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🔄 โหลดหน้าใหม่
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
