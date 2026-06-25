import { AuthProvider } from './contexts/AuthContext'
import AppRouter from './router/AppRouter'
import { Toaster } from 'react-hot-toast'

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
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
    </AuthProvider>
  )
}
