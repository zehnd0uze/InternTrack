import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { ViewAsProvider } from './contexts/ViewAsContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Toaster } from 'react-hot-toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ViewAsProvider>
          <App />
          <Toaster position="top-right" />
        </ViewAsProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
