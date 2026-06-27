import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import { useAuth } from '../../contexts/AuthContext'

export default function AppLayout({ role }) {
  const { profile } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // In view-as mode, hide sidebar entirely for a clean preview
  const isViewAs = role === 'view-as'

  const bgStyle = profile?.background_url 
    ? { backgroundImage: `url(${profile.background_url})` }
    : {}

  return (
    <div className="relative flex h-screen w-full bg-background overflow-hidden bg-cover bg-center bg-fixed justify-center items-center md:p-4 lg:p-6" style={bgStyle}>
      {/* Background Overlay to ensure text readability */}
      {profile?.background_url && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-0" />
      )}
      
      <div className="relative z-10 flex w-full h-full max-w-[1600px] bg-background md:rounded-2xl md:border md:border-border md:shadow-2xl overflow-hidden">
        {/* Desktop Sidebar — hidden in view-as mode */}
        {!isViewAs && (
        <div className={`hidden md:flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
          <Sidebar
            role={role}
            collapsed={!sidebarOpen}
            onToggle={() => setSidebarOpen(prev => !prev)}
          />
        </div>
      )}

      {/* Mobile Sidebar Overlay — hidden in view-as mode */}
      {!isViewAs && mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      {!isViewAs && (
        <div className={`fixed top-0 left-0 h-full w-64 z-50 md:hidden transition-transform duration-300 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar
            role={role}
            collapsed={false}
            onToggle={() => setMobileSidebarOpen(false)}
            mobile
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          onMenuClick={() => setMobileSidebarOpen(true)}
          sidebarOpen={sidebarOpen}
        />

        <main className={`flex-1 overflow-y-auto ${isViewAs ? '' : 'p-4 md:p-6'} ${role === 'student' ? 'pb-20 md:pb-6' : ''}`}>
          {isViewAs ? (
            <Outlet />
          ) : (
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      {/* Student Bottom Navigation (mobile) */}
      {role === 'student' && <BottomNav />}
      </div>
    </div>
  )
}
