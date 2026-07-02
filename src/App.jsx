import { useCallback } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import AppRouter from './router/AppRouter'
import { Toaster } from 'react-hot-toast'
import { usePageVisibility } from './hooks/usePageVisibility'
import WhatsNewModal from './components/WhatsNewModal'

function AppContent() {
  // When user returns to app after 15+ minutes, reload the page so data is fresh
  const handleVisible = useCallback(() => {
    window.location.reload()
  }, [])

  usePageVisibility(handleVisible, 15 * 60 * 1000) // 15 minutes stale threshold

  return (
    <>
      <AppRouter />
      <WhatsNewModal />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, Sarabun, sans-serif',
            fontSize: '14px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: 'white' },
          },
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
