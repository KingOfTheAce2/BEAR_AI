import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useAppStore } from '@store/index'

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { sidebarCollapsed } = useAppStore()

  const handleMenuClick = () => {
    setSidebarOpen(true)
  }

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />
      
      {/* Main content */}
      <div className="lg:ml-64">
        <Header onMenuClick={handleMenuClick} />
        
        <main className="flex-1">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}